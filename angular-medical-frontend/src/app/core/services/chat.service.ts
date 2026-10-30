import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  _id: string;
  sessionId: string;
  userId: string;
  sender: 'user' | 'ai';
  text: string;
  language: string;
  metadata?: {
    recommendedDoctors?: Array<{
      id: string;
      fullName: string;
      specialization: string;
      experience: number;
      consultationFee: number;
      rating: number;
      availableDays: string[];
      availableTimeSlots: string[];
    }> | null;
    recommendedMedicines?: {
      medicineName: string;
      genericName: string;
      brandName: string;
      category: string;
      description: string;
      uses: string[];
      sideEffects: string[];
      warnings: string[];
      precautions: string[];
      howItWorks: string;
      foodInteractions: string;
      prescriptionRequired: boolean;
      availableStrengths: string[];
      availableForms: string[];
      image: string;
    } | null;
    recommendedVideos?: Array<{
      videoId: string;
      title: string;
      channel: string;
      thumbnail: string;
      publishedAt: string;
    }> | null;
    isEmergency?: boolean;
    action?: 'appointments' | 'wellness' | 'medicines' | 'history' | 'health-twin' | null;
  };
  timestamp: string;
}

export interface ChatSession {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://ai-medical-symptoms-analyzer.onrender.com/api/chat';
  readonly chatOpen = signal<boolean>(false);

  // Web Speech API references
  private recognition: any = null;
  private synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  sendMessage(message: string, sessionId?: string): Observable<{ status: string; sessionId: string; sessionTitle: string; data: ChatMessage }> {
    return this.http.post<{ status: string; sessionId: string; sessionTitle: string; data: ChatMessage }>(`${this.apiUrl}`, { message, sessionId });
  }

  getSessions(): Observable<{ status: string; data: ChatSession[] }> {
    return this.http.get<{ status: string; data: ChatSession[] }>(`${this.apiUrl}/history`);
  }

  getSessionDetails(id: string): Observable<{ status: string; data: { session: ChatSession; messages: ChatMessage[] } }> {
    return this.http.get<{ status: string; data: { session: ChatSession; messages: ChatMessage[] } }>(`${this.apiUrl}/${id}`);
  }

  deleteSession(id: string): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(`${this.apiUrl}/${id}`);
  }

  clearHistory(): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(`${this.apiUrl}/history`);
  }

  sendVoiceData(audioData: string): Observable<{ status: string; sessionId: string; sessionTitle: string; data: ChatMessage }> {
    return this.http.post<{ status: string; sessionId: string; sessionTitle: string; data: ChatMessage }>(`${this.apiUrl}/voice`, { audioData });
  }

  // ==========================================
  // NATIVE WEB SPEECH API SUPPORT (CLIENT-SIDE)
  // ==========================================
  
  // 1. Text-to-Speech Speak back
  speak(text: string, language = 'en'): void {
    if (!this.synth) return;
    this.stopSpeaking();

    // Strip markdown formatting and emojis for smooth speaking
    const cleanText = text
      .replace(/[*#`🚨⚠️]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Choose voice based on language
    if (language === 'hi' || language === 'hinglish') {
      utterance.lang = 'hi-IN'; // Hindi voice
    } else {
      utterance.lang = 'en-US'; // English voice
    }

    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
  }

  // 2. Speech-to-Text Speech Recognition
  startListening(onResult: (text: string) => void, onError: (err: any) => void): void {
    const globalWindow = window as any;
    const SpeechRecognition = globalWindow.SpeechRecognition || globalWindow.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      onError('Speech recognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    
    // Support English & Hindi input detection
    this.recognition.lang = 'en-US'; // Default is English, but can match Hindi accent too

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      onError(event.error);
    };

    this.recognition.start();
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}
