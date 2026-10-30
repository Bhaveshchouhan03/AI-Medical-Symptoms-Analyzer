import { Component, OnInit, inject, signal, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatService, ChatMessage, ChatSession } from '../../../core/services/chat.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-chat-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-assistant.html',
})
export class ChatAssistantComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly http = inject(HttpClient);

  // View child for auto-scrolling
  private scrollContainer = viewChild<ElementRef>('scrollFrame');

  // Chat window state
  chatOpen = this.chatService.chatOpen;
  showHistory = signal<boolean>(false);
  loading = signal<boolean>(false);
  isTyping = signal<boolean>(false);
  isListening = signal<boolean>(false);
  isSpeaking = signal<boolean>(false);
  unreadCount = signal<number>(1); // 1 notify alert to prompt user click

  // History & Session Lists
  sessions = signal<ChatSession[]>([]);
  messages = signal<ChatMessage[]>([]);
  currentSessionId = signal<string | null>(null);
  
  toggleHistory(): void {
    this.showHistory.update(v => !v);
  }

  // Inputs & suggestions
  inputValue: string = '';
  suggestions = signal<string[]>([
    'Analyze my symptoms',
    'Recommend doctor',
    'Suggest workout',
    'Suggest yoga',
    'Explain Paracetamol 650mg',
    'Show Health Twin'
  ]);

  // Video Popup Player State
  selectedVideoUrl = signal<SafeResourceUrl | null>(null);

  constructor() {
    // Hook up scroll listener on changes
    afterNextRender({
      write: () => {
        this.scrollToBottom();
      }
    });
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  // Load list of past sessions
  loadSessions(): void {
    this.chatService.getSessions().subscribe({
      next: (res) => {
        this.sessions.set(res.data);
      },
      error: (err) => {
        console.error('Error fetching chat sessions:', err);
      }
    });
  }

  // Load chat session logs
  loadSessionDetails(id: string): void {
    this.loading.set(true);
    this.showHistory.set(false);
    this.chatService.getSessionDetails(id).subscribe({
      next: (res) => {
        this.currentSessionId.set(res.data.session._id);
        this.messages.set(res.data.messages);
        this.loading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Error fetching session details:', err);
        this.loading.set(false);
      }
    });
  }

  // Toggle chat overlay popup
  toggleChat(): void {
    this.chatOpen.update(v => !v);
    if (this.chatOpen()) {
      this.unreadCount.set(0); // clear badge notification click
      if (this.messages().length === 0 && this.sessions().length > 0) {
        // Load latest session automatically
        this.loadSessionDetails(this.sessions()[0]._id);
      } else if (this.messages().length === 0) {
        // Greet user
        this.greetUser();
      }
      this.scrollToBottom();
    } else {
      this.chatService.stopSpeaking();
      this.isSpeaking.set(false);
      this.chatService.stopListening();
      this.isListening.set(false);
    }
  }

  greetUser(): void {
    const greetings: ChatMessage = {
      _id: 'greet_node',
      sessionId: 'greet_sess',
      userId: 'greet_user',
      sender: 'ai',
      text: `Hello! 👋 Main aapki Healthcare AI assistant hoon. Main Hindi, English, aur Hinglish samajh sakti hoon.\n\nAap mujhse **symptoms, exercise recommendations, medicines, aur doctor appointments** ke baare mein pooch sakte hain.\n\nAap kaisa feel kar rahe hain?`,
      language: 'hinglish',
      timestamp: new Date().toISOString()
    };
    this.messages.set([greetings]);
  }

  // Send query
  sendMessage(overrideText?: string): void {
    const text = overrideText || this.inputValue.trim();
    if (!text) return;

    // Add user message to UI immediately
    const userMsg: ChatMessage = {
      _id: Math.random().toString(),
      sessionId: this.currentSessionId() || 'temp',
      userId: 'user',
      sender: 'user',
      text,
      language: 'en',
      timestamp: new Date().toISOString()
    };

    this.messages.update(prev => [...prev, userMsg]);
    this.inputValue = '';
    this.isTyping.set(true);
    this.chatService.stopSpeaking();
    this.isSpeaking.set(false);
    this.scrollToBottom();

    // Call service endpoint
    this.chatService.sendMessage(text, this.currentSessionId() || undefined).subscribe({
      next: (res) => {
        this.messages.update(prev => [...prev, res.data]);
        this.currentSessionId.set(res.sessionId);
        this.isTyping.set(false);
        this.loadSessions(); // update session lists
        this.scrollToBottom();

        // Check if bot should speak back response (voice enabled)
        if (this.isSpeaking()) {
          this.chatService.speak(res.data.text, res.data.language);
        }

        // Check for smart redirect action command
        if (res.data.metadata?.action) {
          const action = res.data.metadata.action;
          setTimeout(() => {
            this.router.navigate([`/dashboard/${action}`]);
            this.toastService.show(`Navigating to ${action.toUpperCase()} Dashboard...`, 'info');
          }, 3000);
        }
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.toastService.show('Failed to connect to Gemini chatbot service.', 'error');
        this.isTyping.set(false);
      }
    });
  }

  // Sugges chip click
  clickSuggestion(sug: string): void {
    this.sendMessage(sug);
  }

  // NATIVE VOICE SYNTHESIS SPEAKING
  toggleVoicePlayback(): void {
    if (this.isSpeaking()) {
      this.chatService.stopSpeaking();
      this.isSpeaking.set(false);
    } else {
      this.isSpeaking.set(true);
      // Speak the last AI response text
      const aiMsgs = this.messages().filter(m => m.sender === 'ai');
      if (aiMsgs.length > 0) {
        const lastMsg = aiMsgs[aiMsgs.length - 1];
        this.chatService.speak(lastMsg.text, lastMsg.language);
      }
    }
  }

  // NATIVE VOICE RECOGNITION (MIC LISTENING)
  toggleSpeechCapture(): void {
    if (this.isListening()) {
      this.chatService.stopListening();
      this.isListening.set(false);
    } else {
      this.isListening.set(true);
      this.chatService.startListening(
        (text) => {
          this.inputValue = text;
          this.isListening.set(false);
          this.sendMessage(); // Send voice transcript
        },
        (err) => {
          console.error('Speech recognition error:', err);
          this.toastService.show(err || 'Voice recognition error.', 'error');
          this.isListening.set(false);
        }
      );
    }
  }

  // YouTube popup player controls
  openVideoPlayer(videoId: string): void {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    this.selectedVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
  }

  closeVideoPlayer(): void {
    this.selectedVideoUrl.set(null);
  }

  // Start fresh chat session
  startNewSession(): void {
    this.chatService.stopSpeaking();
    this.isSpeaking.set(false);
    this.currentSessionId.set(null);
    this.messages.set([]);
    this.greetUser();
  }

  // Delete current active session
  deleteActiveSession(): void {
    const id = this.currentSessionId();
    if (!id || id === 'greet_sess') {
      this.startNewSession();
      return;
    }

    if (!confirm('Are you sure you want to delete this conversation?')) return;

    this.chatService.deleteSession(id).subscribe({
      next: () => {
        this.toastService.show('Conversation deleted successfully.', 'success');
        this.currentSessionId.set(null);
        this.messages.set([]);
        this.loadSessions();
        this.greetUser();
      },
      error: (err) => {
        console.error('Error deleting session:', err);
        this.toastService.show('Failed to delete session.', 'error');
      }
    });
  }

  // Delete specific session from list
  deleteSessionDirectly(id: string): void {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    this.chatService.deleteSession(id).subscribe({
      next: () => {
        this.toastService.show('Conversation deleted.', 'success');
        if (this.currentSessionId() === id) {
          this.startNewSession();
        }
        this.loadSessions();
      },
      error: (err) => {
        console.error('Error deleting session:', err);
        this.toastService.show('Failed to delete session.', 'error');
      }
    });
  }

  // Export transcript from backend
  exportTranscript(): void {
    const id = this.currentSessionId();
    if (!id || id === 'greet_sess') {
      this.toastService.show('No active chat transcript to export.', 'info');
      return;
    }

    const exportUrl = `https://ai-medical-symptoms-analyzer.onrender.com/api/chat/export`;
    this.toastService.show('Exporting text transcript...', 'info');

    // Call using window submit form or helper to trigger attachment download
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = exportUrl;
    form.target = '_blank';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'sessionId';
    input.value = id;

    // Attach authorization token if interceptors are bypassed by form submits
    // Actually, our API verifyToken expects JWT header, so form submit will fail without auth.
    // Let's do it using HttpClient blob request! That is cleaner and attaches the JWT automatically via Angular HTTP interceptor!
    this.http.post('https://ai-medical-symptoms-analyzer.onrender.com/api/chat/export', { sessionId: id }, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Medical_AI_Chat_Log_${id.substring(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toastService.show('Transcript exported successfully.', 'success');
      },
      error: (err) => {
        console.error('Export error:', err);
        this.toastService.show('Failed to download transcript.', 'error');
      }
    });
  }

  // Auto-scroll logic
  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.scrollContainer();
      if (container) {
        container.nativeElement.scrollTop = container.nativeElement.scrollHeight;
      }
    }, 100);
  }

  // Helper date parsing
  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isDifferentDay(msg1: ChatMessage, msg2: ChatMessage): boolean {
    if (!msg1 || !msg2) return false;
    const d1 = new Date(msg1.timestamp).toDateString();
    const d2 = new Date(msg2.timestamp).toDateString();
    return d1 !== d2;
  }
}
