import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { 
  HealthTwinService, 
  HealthTwinProfile, 
  HealthScoreHistory, 
  HealthPredictions, 
  HealthRisk, 
  HealthReport, 
  HealthTimelineItem, 
  HealthBadge, 
  HealthInsight, 
  SmartAlert 
} from '../../../core/services/health-twin.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-health-twin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './health-twin.html',
})
export class HealthTwinComponent implements OnInit {
  private readonly healthTwinService = inject(HealthTwinService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);

  // Profile and Settings Signals/State
  profile = signal<HealthTwinProfile | null>(null);
  weight = signal<number>(70);
  score = signal<any>(null);
  predictions = signal<HealthPredictions | null>(null);
  risks = signal<HealthRisk[]>([]);
  report = signal<HealthReport | null>(null);
  recommendations = signal<any>(null);
  alerts = signal<SmartAlert[]>([]);
  comparison = signal<any>(null);
  achievements = signal<HealthBadge[]>([]);
  insights = signal<HealthInsight[]>([]);
  timeline = signal<HealthTimelineItem[]>([]);

  // UI state
  activeTab = signal<'dashboard' | 'timeline' | 'achievements' | 'reports'>('dashboard');
  activeReportType = signal<'daily' | 'weekly' | 'monthly'>('weekly');
  customizingAvatar = signal<boolean>(false);
  generatingPredictions = signal<boolean>(false);
  loading = signal<boolean>(true);

  // Avatar Options
  themes = ['digital-pulse', 'bio-electric', 'cyber-neon'];
  colors = ['cyan', 'violet', 'emerald', 'amber'];
  moods = ['Energetic', 'Calm', 'Tired', 'Stressed', 'Focused', 'Restless'];
  activityLevels = ['Low', 'Moderate', 'High'];

  // Avatar form inputs
  selectedTheme = 'digital-pulse';
  selectedColor = 'cyan';
  selectedGlow = true;
  selectedMood = 'Energetic';
  selectedActivityLevel = 'Moderate';

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);
    // Fetch critical details in parallel
    forkJoin({
      profileRes: this.healthTwinService.getProfile(),
      scoreRes: this.healthTwinService.getHealthScore(),
      predictionsRes: this.healthTwinService.getPredictions(),
      risksRes: this.healthTwinService.getRiskAnalysis(),
      reportRes: this.healthTwinService.getReports(this.activeReportType()),
      recsRes: this.healthTwinService.getRecommendations(),
      alertsRes: this.healthTwinService.getAlerts(),
      compRes: this.healthTwinService.getComparison(),
      achievementsRes: this.healthTwinService.getAchievements(),
      insightsRes: this.healthTwinService.getInsights(),
      timelineRes: this.healthTwinService.getTimeline()
    }).subscribe({
      next: (results) => {
        this.profile.set(results.profileRes.data);
        this.weight.set(results.profileRes.weight);
        this.score.set(results.scoreRes.data);
        this.predictions.set(results.predictionsRes.data);
        this.risks.set(results.risksRes.data);
        this.report.set(results.reportRes.data);
        this.recommendations.set(results.recsRes.data);
        this.alerts.set(results.alertsRes.data);
        this.comparison.set(results.compRes.data);
        this.achievements.set(results.achievementsRes.data);
        this.insights.set(results.insightsRes.data);
        this.timeline.set(results.timelineRes.data);

        // Prepopulate avatar edit inputs
        if (results.profileRes.data) {
          const p = results.profileRes.data;
          this.selectedTheme = p.avatarCustomization.theme;
          this.selectedColor = p.avatarCustomization.color;
          this.selectedGlow = p.avatarCustomization.glow;
          this.selectedMood = p.mood;
          this.selectedActivityLevel = p.activityLevel;
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading digital twin details:', err);
        this.toastService.show('Failed to sync digital health twin values.', 'error');
        this.loading.set(false);
      }
    });
  }

  // Toggle Reports Selection
  setReportType(type: 'daily' | 'weekly' | 'monthly'): void {
    this.activeReportType.set(type);
    this.healthTwinService.getReports(type).subscribe({
      next: (res) => {
        this.report.set(res.data);
      },
      error: (err) => {
        console.error('Error loading report type:', err);
        this.toastService.show('Failed to refresh report data.', 'error');
      }
    });
  }

  // Save Avatar configuration
  saveAvatarSettings(): void {
    const payload = {
      theme: this.selectedTheme,
      color: this.selectedColor,
      glow: this.selectedGlow,
      mood: this.selectedMood,
      activityLevel: this.selectedActivityLevel
    };

    this.healthTwinService.updateAvatar(payload).subscribe({
      next: (res) => {
        this.profile.set(res.data);
        this.customizingAvatar.set(false);
        this.toastService.show('Avatar synced and personalized!', 'success');
      },
      error: (err) => {
        console.error('Error updating avatar:', err);
        this.toastService.show('Could not save avatar changes.', 'error');
      }
    });
  }

  // Trigger manual predictions refresh from Gemini AI
  refreshAiPredictions(): void {
    this.generatingPredictions.set(true);
    this.toastService.show('AI health twin is analyzing records and forecasting trends...', 'info');

    this.healthTwinService.getPredictions().subscribe({
      next: (res) => {
        this.predictions.set(res.data);
        this.generatingPredictions.set(false);
        this.toastService.show('AI wellness forecast updated successfully.', 'success');
        this.loadAllData(); // Reload stats to capture new predictions metrics
      },
      error: (err) => {
        console.error('Error fetching AI predictions:', err);
        this.toastService.show('AI prediction check failed.', 'error');
        this.generatingPredictions.set(false);
      }
    });
  }

  // PDF report downloader
  downloadPdfReport(): void {
    if (!this.profile() || !this.score() || !this.predictions() || !this.recommendations()) {
      this.toastService.show('Data not fully synced. Please wait.', 'info');
      return;
    }

    const payload = {
      profile: this.profile(),
      score: this.score(),
      predictions: this.predictions(),
      recommendations: this.recommendations(),
      timeline: this.timeline(),
      achievements: this.achievements()
    };

    this.toastService.show('Compiling medical record parameters and rendering PDF report...', 'info');
    
    this.pdfService.generateHealthTwinPdf(payload).then(() => {
      this.toastService.show('Report downloaded successfully!', 'success');
    }).catch(err => {
      console.error('PDF error:', err);
      this.toastService.show('Could not generate PDF download.', 'error');
    });
  }

  // SVG Chart Generators for Interactive Visualization
  getSvgPath(values: number[] | undefined, width: number, height: number): string {
    if (!values || values.length === 0) return '';
    
    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const valRange = max - min || 1;
    const pointsCount = values.length;
    
    const stepX = width / (pointsCount - 1);
    
    const points = values.map((val, i) => {
      const x = i * stepX;
      // Invert Y coordinate since SVG Y-0 is at top
      const y = height - ((val - min) / valRange) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }

  getSvgAreaPath(values: number[] | undefined, width: number, height: number): string {
    const linePath = this.getSvgPath(values, width, height);
    if (!linePath) return '';
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  }

  getCircleCoordinates(values: number[] | undefined, width: number, height: number): Array<{x: number, y: number, val: number}> {
    if (!values || values.length === 0) return [];
    
    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const valRange = max - min || 1;
    const pointsCount = values.length;
    const stepX = width / (pointsCount - 1);

    return values.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / valRange) * height;
      return { x, y, val };
    });
  }

  // Format date helper
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Alert Badge classes
  getAlertClasses(type: string): string {
    switch(type) {
      case 'danger': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  }

  // Achievement key icon helpers
  getBadgeIcon(key: string): string {
    switch (key) {
      case 'workout_7': return '🏆';
      case 'workout_30': return '🔥';
      case 'run_100': return '⚡';
      case 'yoga_100': return '🧘';
      case 'meditation_100': return '🧠';
      case 'sleep_excellent': return '😴';
      case 'hydration_perfect': return '💧';
      default: return '🏅';
    }
  }

  // Comparison direction indicator
  getComparisonArrow(pct: number): string {
    if (pct > 0) return '↑';
    if (pct < 0) return '↓';
    return '•';
  }
}
