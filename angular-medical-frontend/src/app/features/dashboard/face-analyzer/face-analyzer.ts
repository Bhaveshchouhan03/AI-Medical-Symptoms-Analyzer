import { Component, OnInit, OnDestroy, inject, signal, viewChild, ElementRef, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaceAnalyzerService, FaceHealthScan } from '../../../core/services/face-analyzer.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-face-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './face-analyzer.html',
})
export class FaceAnalyzerComponent implements OnInit, OnDestroy {
  private readonly faceService = inject(FaceAnalyzerService);
  private readonly toastService = inject(ToastService);
  readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  // View Element Refs
  private videoEl = viewChild<ElementRef<HTMLVideoElement>>('webcamVideo');
  private canvasEl = viewChild<ElementRef<HTMLCanvasElement>>('overlayCanvas');

  // Media Stream
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  // Signal State
  scanning = signal<boolean>(false);
  loading = signal<boolean>(false);
  progress = signal<number>(0);
  cameraActive = signal<boolean>(false);
  savePhoto: boolean = false; // Privacy checkbox

  // Scan Data State
  history = signal<FaceHealthScan[]>([]);
  selectedScan = signal<FaceHealthScan | null>(null);
  capturedImageBase64 = signal<string | null>(null);

  // Scan metrics estimation state
  eyeRedness = signal<string>('Normal');
  darkCircles = signal<string>('None');
  skinType = signal<string>('Normal');
  hydration = signal<number>(10);
  stress = signal<number>(0);
  fatigue = signal<number>(0);
  wellnessScore = signal<number>(100);

  // Tab views
  activeTab = signal<'dashboard' | 'history' | 'insights'>('dashboard');

  constructor() {
    // Canvas loop should be safely initialized after rendering
    afterNextRender({
      write: () => {
        // Trigger draw loop if camera is active
        if (this.cameraActive()) {
          this.startBiometricDrawLoop();
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.stopWebcam();
  }

  // Clear previous metrics and analysis states
  resetScanState(): void {
    this.selectedScan.set(null);
    this.scanning.set(false);
    this.loading.set(false);
    this.progress.set(0);
    this.capturedImageBase64.set(null);

    // Reset indicator local states
    this.eyeRedness.set('Normal');
    this.darkCircles.set('None');
    this.skinType.set('Normal');
    this.hydration.set(10);
    this.stress.set(0);
    this.fatigue.set(0);
    this.wellnessScore.set(100);
    
    this.cdr.detectChanges();
  }

  // Clear variables and restart camera scanner
  scanAgain(): void {
    this.resetScanState();
    this.startWebcam();
    this.toastService.show('Dashboard reset successfully. Ready for a new scan.', 'success');
  }

  // Load history list
  loadHistory(): void {
    this.faceService.getHistory().subscribe({
      next: (res) => {
        this.history.set(res.data);
        if (res.data.length > 0 && !this.selectedScan()) {
          this.selectedScan.set(res.data[0]);
        }
      },
      error: (err) => {
        console.error('Error fetching face scans history:', err);
      }
    });
  }

  // ==========================================
  // WEBCAM CAMERA CONTROLS
  // ==========================================
  startWebcam(): void {
    this.capturedImageBase64.set(null);
    const video = this.videoEl()?.nativeElement;
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          this.mediaStream = stream;
          if (video) {
            video.srcObject = stream;
            video.play();
          }
          this.cameraActive.set(true);
          this.toastService.show('Webcam feed started successfully.', 'success');
          
          // Trigger biometric animation loops
          setTimeout(() => this.startBiometricDrawLoop(), 200);
        })
        .catch((err) => {
          console.error('Camera open failed:', err);
          this.toastService.show('Failed to access webcam. Please check permissions.', 'error');
        });
    }
  }

  stopWebcam(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    const video = this.videoEl()?.nativeElement;
    if (video) {
      video.srcObject = null;
    }

    this.cameraActive.set(false);
  }

  // ==========================================
  // BIOMETRIC CANVAS DRAW LOOP
  // ==========================================
  private startBiometricDrawLoop(): void {
    const canvas = this.canvasEl()?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanLineY = 0;
    let scanDirection = 1;

    const draw = () => {
      if (!this.cameraActive()) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear previous drawings
      ctx.clearRect(0, 0, width, height);

      // 2. Draw Biometric Frame Target
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.4)'; // Teal
      ctx.lineWidth = 2;
      
      // Top Left corner
      ctx.beginPath(); ctx.moveTo(40, 60); ctx.lineTo(40, 40); ctx.lineTo(60, 40); ctx.stroke();
      // Top Right corner
      ctx.beginPath(); ctx.moveTo(width - 40, 60); ctx.lineTo(width - 40, 40); ctx.lineTo(width - 60, 40); ctx.stroke();
      // Bottom Left corner
      ctx.beginPath(); ctx.moveTo(40, height - 60); ctx.lineTo(40, height - 40); ctx.lineTo(60, height - 40); ctx.stroke();
      // Bottom Right corner
      ctx.beginPath(); ctx.moveTo(width - 40, height - 60); ctx.lineTo(width - 40, height - 40); ctx.lineTo(width - 60, height - 40); ctx.stroke();

      // 3. Draw Biometric Landmark Simulation nodes
      const points = [
        { x: width * 0.5, y: height * 0.25, label: 'FOREHEAD' }, // Forehead
        { x: width * 0.42, y: height * 0.4, label: 'L-EYE' }, // Left eye
        { x: width * 0.58, y: height * 0.4, label: 'R-EYE' }, // Right eye
        { x: width * 0.5, y: height * 0.5, label: 'NOSE' },  // Nose
        { x: width * 0.5, y: height * 0.65, label: 'MOUTH' }, // Mouth
        { x: width * 0.35, y: height * 0.55, label: 'L-JAW' }, // Left jaw
        { x: width * 0.65, y: height * 0.55, label: 'R-JAW' }  // Right jaw
      ];

      ctx.fillStyle = 'rgba(20, 184, 166, 0.8)';
      ctx.font = '9px monospace';

      points.forEach((p) => {
        // Pulse animation node size
        const radius = 3 + Math.sin(Date.now() * 0.01) * 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Target rings
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.2)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
        ctx.stroke();

        // Text label
        ctx.fillText(`[${p.label}]`, p.x + 8, p.y + 3);
      });

      // Connect facial mesh lines
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.15)';
      ctx.lineWidth = 1;
      
      // Face profile mesh connectors
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[5].x, points[5].y);
      ctx.lineTo(points[4].x, points[4].y);
      ctx.lineTo(points[6].x, points[6].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(points[1].x, points[1].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(points[3].x, points[3].y);
      ctx.lineTo(points[4].x, points[4].y);
      ctx.stroke();

      // 4. Moving Laser Scanning Line
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)'; // Indigo scan line
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(35, scanLineY);
      ctx.lineTo(width - 35, scanLineY);
      ctx.stroke();

      // Laser glow shadow
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fillRect(35, scanLineY - 10, width - 70, 20);

      // Increment position
      scanLineY += 2 * scanDirection;
      if (scanLineY >= height - 40 || scanLineY <= 40) {
        scanDirection *= -1; // bounce
      }

      this.animationFrameId = requestAnimationFrame(draw);
    };

    draw();
  }

  // ==========================================
  // IMAGE SCAN OPERATIONS
  // ==========================================
  
  // Capture picture frame from Webcam video
  captureWebcamScan(): void {
    const video = this.videoEl()?.nativeElement;
    if (!video) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 640;
    tempCanvas.height = 480;

    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, 640, 480);
      
      // Inject slight pixel variation at (0, 0) to ensure unique content/hash
      ctx.fillStyle = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
      ctx.fillRect(0, 0, 1, 1);

      // Vary JPEG compression quality slightly to force unique length/hash
      const randomQuality = 0.90 + Math.random() * 0.09;
      const base64 = tempCanvas.toDataURL('image/jpeg', randomQuality);
      this.capturedImageBase64.set(base64);
      
      this.stopWebcam();
      this.triggerAnalysisProgress(base64);
    }
  }

  // Upload Photo trigger
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.toastService.show('Please upload a valid image file.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        
        // Load image onto canvas to modify and vary JPEG quality
        const img = new Image();
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.width || 640;
          tempCanvas.height = img.height || 480;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(img, 0, 0);
            
            // Inject slight pixel variation at (0, 0)
            tempCtx.fillStyle = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
            tempCtx.fillRect(0, 0, 1, 1);
            
            // Vary JPEG compression quality slightly to force unique length/hash
            const randomQuality = 0.90 + Math.random() * 0.09;
            const modifiedBase64 = tempCanvas.toDataURL('image/jpeg', randomQuality);
            this.capturedImageBase64.set(modifiedBase64);
            this.triggerAnalysisProgress(modifiedBase64);
          }
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    }
  }

  // Progress bar animation trigger before calling Gemini API
  private triggerAnalysisProgress(base64Image: string): void {
    // Clear previous scan metrics and reports immediately
    this.selectedScan.set(null);
    this.scanning.set(true);
    this.progress.set(0);

    // Clear local tracking metrics
    this.eyeRedness.set('Normal');
    this.darkCircles.set('None');
    this.skinType.set('Normal');
    this.hydration.set(10);
    this.stress.set(0);
    this.fatigue.set(0);
    this.wellnessScore.set(100);

    this.cdr.detectChanges();

    const interval = setInterval(() => {
      this.progress.update((val) => {
        if (val >= 100) {
          clearInterval(interval);
          this.executeFaceAnalyzeApi(base64Image);
          return 100;
        }
        return val + 5;
      });
    }, 100);
  }

  // API Call to Backend
  private executeFaceAnalyzeApi(base64Image: string): void {
    this.loading.set(true);
    this.scanning.set(false);
    this.toastService.show('AI is analyzing facial metrics...', 'info');

    this.faceService.analyzeFace(base64Image, this.savePhoto).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.selectedScan.set(res.data);
        this.loadHistory(); // Reload stats list
        this.toastService.show('AI Face Wellness analysis complete!', 'success');
      },
      error: (err) => {
        console.error('Face analysis API failed:', err);
        this.toastService.show(err.error?.message || 'AI analysis check failed.', 'error');
        this.loading.set(false);
      }
    });
  }

  // ==========================================
  // OTHER WELLNESS HELPERS
  // ==========================================
  
  // Format Date helper
  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  // Delete Scan History Item
  deleteHistoryItem(id: string): void {
    if (!confirm('Are you sure you want to delete this scan report?')) return;

    this.faceService.deleteScan(id).subscribe({
      next: () => {
        this.toastService.show('Scan report deleted successfully.', 'success');
        
        // Remove from current details if selected
        if (this.selectedScan()?._id === id) {
          this.selectedScan.set(null);
        }
        this.loadHistory();
      },
      error: (err) => {
        console.error('Delete scan error:', err);
        this.toastService.show('Could not delete report.', 'error');
      }
    });
  }

  // Export PDF Report text
  downloadScanTextReport(id: string): void {
    this.toastService.show('Compiling report parameters...', 'info');
    
    this.faceService.exportReportText(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Face_Health_Report_${id.substring(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toastService.show('Report downloaded successfully.', 'success');
      },
      error: (err) => {
        console.error('Export report error:', err);
        this.toastService.show('Failed to download report.', 'error');
      }
    });
  }

  // Category classes helper
  getScoreCategoryClasses(cat?: string): string {
    if (!cat) return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    switch (cat) {
      case 'Excellent': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'Good': return 'bg-teal-500/10 border-teal-500/30 text-teal-400';
      case 'Average': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-red-500/10 border-red-500/30 text-red-400';
    }
  }

  // SVG sparkline chart path generator
  getSvgSparkline(values: number[], width = 200, height = 50): string {
    if (!values || values.length < 2) return '';
    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const valRange = max - min || 1;
    
    const stepX = width / (values.length - 1);
    const points = values.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / valRange) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }

  // Get metrics history trend arrays
  getTrendHistoryArray(metric: 'score' | 'stress' | 'hydration' | 'fatigue'): number[] {
    const list = [...this.history()].reverse(); // oldest first
    if (list.length === 0) return [];
    
    return list.map(item => {
      if (metric === 'score') return item.score;
      return item.wellnessIndicators[metric] || 0;
    });
  }
}
