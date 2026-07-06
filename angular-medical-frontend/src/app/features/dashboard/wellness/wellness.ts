import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FitnessService, FitnessStats, AIWellnessPlan, YogaSession, MeditationSession } from '../../../core/services/fitness.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-wellness',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './wellness.html',
})
export class WellnessComponent implements OnInit, OnDestroy {
  Math = Math;
  private fitnessService = inject(FitnessService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  // Tabs navigation
  activeTab = signal<'overview' | 'yoga' | 'meditation' | 'workout' | 'history' | 'reminders' | 'challenges' | 'ai-plan'>('overview');

  // Stats, Streaks & Badges
  stats = signal<FitnessStats | null>(null);
  achievements = signal<string[]>([]);
  isStatsLoading = signal(false);

  // Libraries arrays
  yogaSessions = signal<YogaSession[]>([]);
  meditationSessions = signal<MeditationSession[]>([]);
  isLibraryLoading = signal(false);

  // Yoga Section parameters
  selectedYogaCat = signal('Beginner Yoga');
  readonly yogaCategories = [
    'Beginner Yoga', 'Morning Yoga', 'Evening Yoga', 'Back Pain Yoga', 
    'Weight Loss Yoga', 'Flexibility Yoga', 'Stress Relief Yoga', 
    'Neck Pain Yoga', 'Office Yoga', 'Chair Yoga', 'Pregnancy Yoga (Educational)', 
    'Senior Citizen Yoga'
  ];

  // Meditation Section parameters
  selectedMeditationCat = signal('5 Minute Meditation');
  readonly meditationCategories = [
    '5 Minute Meditation', '10 Minute Meditation', 'Sleep Meditation', 
    'Stress Relief', 'Mindfulness', 'Anxiety Relief', 'Focus Meditation', 
    'Deep Relaxation', 'Breathing Exercises'
  ];

  // Running & Cycling Forms
  runDistance = 0;
  runDuration = 0; // mins
  runPlanName = 'Free Run';
  isLoggingRun = signal(false);

  cycleDistance = 0;
  cycleDuration = 0;
  cycleType: 'Indoor' | 'Outdoor' = 'Outdoor';
  isLoggingCycle = signal(false);

  // Home Workout / Stretching Exercise library (Pre-defined static references)
  readonly exercisesList = [
    {
      name: 'Jumping Jacks',
      category: 'HIIT Workout',
      difficulty: 'Beginner',
      duration: '1 minute',
      calories: 12,
      targetMuscles: ['Full Body', 'Calves', 'Shoulders'],
      instructions: ['Stand with feet hip-width apart and arms at sides.', 'Jump feet out while raising arms overhead.', 'Jump back to start position and repeat.'],
      gif: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80'
    },
    {
      name: 'Push-Ups',
      category: 'Chest Workout',
      difficulty: 'Intermediate',
      duration: '1 minute',
      calories: 15,
      targetMuscles: ['Chest', 'Triceps', 'Shoulders', 'Core'],
      instructions: ['Start in a plank position with hands slightly wider than shoulder-width.', 'Lower chest toward the floor, keeping body in a straight line.', 'Push back up to start position.'],
      gif: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=400&q=80'
    },
    {
      name: 'Bodyweight Squats',
      category: 'Leg Workout',
      difficulty: 'Beginner',
      duration: '1 minute',
      calories: 10,
      targetMuscles: ['Quads', 'Hamstrings', 'Glutes'],
      instructions: ['Stand with feet shoulder-width apart.', 'Lower hips down as if sitting in a chair, keeping weight in heels.', 'Stand back up to start.'],
      gif: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=400&q=80'
    },
    {
      name: 'Plank Hold',
      category: 'Core Workout',
      difficulty: 'Beginner',
      duration: '1 minute',
      calories: 8,
      targetMuscles: ['Abs', 'Lower Back', 'Shoulders'],
      instructions: ['Place forearms on ground parallel to each other.', 'Extend legs straight back, toes tucked.', 'Keep body straight and hold position.'],
      gif: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80'
    },
    {
      name: 'Mountain Climbers',
      category: 'HIIT Workout',
      difficulty: 'Intermediate',
      duration: '1 minute',
      calories: 14,
      targetMuscles: ['Abs', 'Shoulders', 'Legs', 'Cardio'],
      instructions: ['Start in high plank position.', 'Drive one knee forward toward chest, then alternate quickly.', 'Maintain low hip position throughout.'],
      gif: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80'
    }
  ];

  readonly stretchingList = [
    { name: 'Morning Spine Twist', category: 'Morning Stretch', duration: '3 minutes', instructions: 'Lie on back, bend knees, drop them to one side while looking opposite.' },
    { name: 'Office Neck Roll', category: 'Office Stretch', duration: '2 minutes', instructions: 'Gently roll head clockwise for 5 reps, then counter-clockwise.' },
    { name: 'Lower Back Cobra Stretch', category: 'Back Stretch', duration: '4 minutes', instructions: 'Lie on stomach, place hands under shoulders, push upper chest up gently.' },
    { name: 'Hamstring Reach', category: 'Leg Stretch', duration: '3 minutes', instructions: 'Sit legs extended straight, bend at hips and reach for toes.' }
  ];

  // Active Workout session parameters
  activeSessionType = signal<'yoga' | 'workout' | 'meditation' | null>(null);
  activeSessionName = signal('');
  sessionDuration = signal(0); // in seconds
  sessionTimerHandle: any = null;
  approxCaloriesBurned = computed(() => {
    const mins = this.sessionDuration() / 60;
    const type = this.activeSessionType();
    const metRate = type === 'yoga' ? 5 : type === 'meditation' ? 2 : 10;
    return Math.round(mins * metRate);
  });

  // Breathing exercises parameters
  selectedBreathingPattern = signal<'box' | '478' | 'deep'>('box');
  breathingActive = signal(false);
  breathingPhase = signal<'Inhale' | 'Hold' | 'Exhale' | 'Hold (Empty)' | 'Ready'>('Ready');
  breathingTimerValue = signal(0);
  breathingTimerHandle: any = null;

  // Challenges list logs
  dailyChallengesList = signal<string[]>([]);

  // Reminders Form states
  reminders = signal<any>({
    workoutTime: '',
    yogaTime: '',
    meditationTime: '',
    waterInterval: 120,
    sleepTime: '',
    medicineTime: ''
  });
  isSavingReminders = signal(false);

  // Bookmarks & Achievements
  bookmarks = signal<any[]>([]);
  badgeDetails: Record<string, { title: string; desc: string; icon: string }> = {
    first_workout: { title: 'First Workout', desc: 'Logged your very first workout activity', icon: '🏋️' },
    streak_7: { title: '7 Day Streak', desc: 'Exercised 7 days in a row', icon: '🔥' },
    streak_30: { title: '30 Day Streak', desc: 'Maintained 30 days workout momentum', icon: '👑' },
    run_100: { title: 'Road Runner', desc: 'Accumulated over 100 KM running distance', icon: '🏃' },
    cycle_50: { title: 'Spin Master', desc: 'Accumulated over 50 KM cycling distance', icon: '🚴' },
    yoga_100: { title: 'Zen Yogi', desc: 'Completed 100 Yoga sessions', icon: '🧘' },
    meditation_100: { title: 'Mindful Sage', desc: 'Completed 100 Meditation runs', icon: '🌌' }
  };

  // AI Wellness Recipe
  aiPlan = signal<AIWellnessPlan | null>(null);
  isAiLoading = signal(false);

  // Video Library lookup
  videoSearchQuery = signal('Yoga for Beginners');
  foundVideos = signal<any[]>([]);
  isVideosLoading = signal(false);
  activeVideoEmbedUrl = signal<SafeResourceUrl | null>(null);

  // Health Tracker logger variables
  bpSystolic = 120;
  bpDiastolic = 80;
  bloodSugar = 90;
  heartRate = 72;
  bodyWeight = 70;
  sleepDurationLog = 8;
  isLoggingHealth = signal(false);

  // History listings
  history = signal<any>({ workouts: [], runs: [], cycles: [] });
  isHistoryLoading = signal(false);

  ngOnInit(): void {
    this.loadStats();
    this.loadYogaLibrary();
    this.loadMeditationLibrary();
    this.loadBookmarks();
    this.loadDailyChallenges();
    this.loadReminders();
    this.loadAchievements();
    this.loadVideos();
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.stopSessionTimer();
    this.stopBreathingTimer();
  }

  // API Callers
  loadStats(): void {
    this.isStatsLoading.set(true);
    this.fitnessService.getStats().subscribe({
      next: (res) => { this.stats.set(res.data); this.isStatsLoading.set(false); },
      error: () => this.isStatsLoading.set(false)
    });
  }

  loadAchievements(): void {
    this.fitnessService.getAchievements().subscribe({
      next: (res) => this.achievements.set(res.data),
      error: (err) => console.error(err)
    });
  }

  loadYogaLibrary(): void {
    this.isLibraryLoading.set(true);
    this.fitnessService.getYogaSessions(this.selectedYogaCat()).subscribe({
      next: (res) => { this.yogaSessions.set(res.data); this.isLibraryLoading.set(false); },
      error: () => this.isLibraryLoading.set(false)
    });
  }

  loadMeditationLibrary(): void {
    this.isLibraryLoading.set(true);
    this.fitnessService.getMeditationSessions(this.selectedMeditationCat()).subscribe({
      next: (res) => { this.meditationSessions.set(res.data); this.isLibraryLoading.set(false); },
      error: () => this.isLibraryLoading.set(false)
    });
  }

  loadDailyChallenges(): void {
    this.fitnessService.getChallenges().subscribe({
      next: (res) => this.dailyChallengesList.set(res.data),
      error: (err) => console.error(err)
    });
  }

  loadReminders(): void {
    this.fitnessService.getReminders().subscribe({
      next: (res) => { if (res.data) this.reminders.set(res.data); },
      error: (err) => console.error(err)
    });
  }

  loadBookmarks(): void {
    this.fitnessService.getBookmarks().subscribe({
      next: (res) => this.bookmarks.set(res.data),
      error: (err) => console.error(err)
    });
  }

  loadHistory(): void {
    this.isHistoryLoading.set(true);
    this.fitnessService.getHistory().subscribe({
      next: (res) => { this.history.set(res.data); this.isHistoryLoading.set(false); },
      error: () => this.isHistoryLoading.set(false)
    });
  }

  // Navigation tabs switch
  switchTab(tab: any): void {
    this.activeTab.set(tab);
    if (tab === 'yoga') this.loadYogaLibrary();
    if (tab === 'meditation') this.loadMeditationLibrary();
    if (tab === 'history') this.loadHistory();
  }

  // Local Yoga Category Select
  selectYogaCategory(cat: string): void {
    this.selectedYogaCat.set(cat);
    this.loadYogaLibrary();
  }

  // Local Meditation Category Select
  selectMeditationCategory(cat: string): void {
    this.selectedMeditationCat.set(cat);
    this.loadMeditationLibrary();
  }

  // Log Running Plan
  submitRunningLog(): void {
    if (this.runDistance <= 0 || this.runDuration <= 0) {
      this.toastService.show('Please enter valid distance and duration.', 'error');
      return;
    }
    this.isLoggingRun.set(true);
    const speedCalc = Number((this.runDistance / (this.runDuration / 60)).toFixed(1));
    const caloriesCalc = Math.round(this.runDuration * 8.5); // 8.5 cals per min

    this.fitnessService.logRunning({
      distance: this.runDistance,
      duration: this.runDuration,
      caloriesBurned: caloriesCalc,
      speed: speedCalc,
      planName: this.runPlanName
    }).subscribe({
      next: (res) => {
        this.toastService.show(res.message, 'success');
        this.isLoggingRun.set(false);
        this.runDistance = 0;
        this.runDuration = 0;
        this.loadStats();
        if (res.newBadgeUnlocked) {
          this.toastService.show('🎉 NEW BADGE UNLOCKED!', 'success');
          this.loadAchievements();
        }
      },
      error: () => this.isLoggingRun.set(false)
    });
  }

  // Log Cycling Plan
  submitCyclingLog(): void {
    if (this.cycleDistance <= 0 || this.cycleDuration <= 0) {
      this.toastService.show('Please enter valid distance and duration.', 'error');
      return;
    }
    this.isLoggingCycle.set(true);
    const speedCalc = Number((this.cycleDistance / (this.cycleDuration / 60)).toFixed(1));
    const caloriesCalc = Math.round(this.cycleDuration * 6.5); // 6.5 cals per min

    this.fitnessService.logCycling({
      distance: this.cycleDistance,
      duration: this.cycleDuration,
      caloriesBurned: caloriesCalc,
      speed: speedCalc,
      cyclingType: this.cycleType
    }).subscribe({
      next: (res) => {
        this.toastService.show(res.message, 'success');
        this.isLoggingCycle.set(false);
        this.cycleDistance = 0;
        this.cycleDuration = 0;
        this.loadStats();
        if (res.newBadgeUnlocked) {
          this.toastService.show('🎉 NEW BADGE UNLOCKED!', 'success');
          this.loadAchievements();
        }
      },
      error: () => this.isLoggingCycle.set(false)
    });
  }

  // Workout / Yoga session stopwatches
  startSession(type: 'yoga' | 'workout' | 'meditation', name: string): void {
    this.stopSessionTimer();
    this.activeSessionType.set(type);
    this.activeSessionName.set(name);
    this.sessionDuration.set(0);

    this.sessionTimerHandle = setInterval(() => {
      this.sessionDuration.update(s => s + 1);
    }, 1000);

    this.toastService.show(`Session "${name}" started! Go!`, 'success');
  }

  stopSessionTimer(): void {
    if (this.sessionTimerHandle) {
      clearInterval(this.sessionTimerHandle);
      this.sessionTimerHandle = null;
    }
  }

  finishSession(): void {
    const type = this.activeSessionType();
    const name = this.activeSessionName();
    const durationMins = Math.ceil(this.sessionDuration() / 60);
    const calories = this.approxCaloriesBurned();

    if (durationMins <= 0) {
      this.stopSessionTimer();
      this.activeSessionType.set(null);
      return;
    }

    this.stopSessionTimer();
    const logType = type === 'yoga' ? 'Yoga' : type === 'meditation' ? 'Meditation' : 'Home Workout';

    this.fitnessService.logWorkout({
      workoutType: logType,
      exerciseName: name,
      duration: durationMins,
      caloriesBurned: calories
    }).subscribe({
      next: (res) => {
        this.toastService.show(`Saved ${durationMins} mins session. Burned ${calories} kcal!`, 'success');
        this.activeSessionType.set(null);
        this.loadStats();
        if (res.newBadgeUnlocked) {
          this.toastService.show('🎉 NEW BADGE UNLOCKED!', 'success');
          this.loadAchievements();
        }
      },
      error: (err) => {
        this.toastService.show('Failed to save session.', 'error');
        this.activeSessionType.set(null);
      }
    });
  }

  // Ticking / toggling bookmark entries
  toggleBookmark(item: any, type: 'yoga' | 'meditation' | 'workout'): void {
    const itemId = item._id || item.name;
    const title = item.yogaName || item.title || item.name;
    const cat = item.category || '';
    const dur = item.duration ? (typeof item.duration === 'number' ? item.duration : 1) : undefined;

    this.fitnessService.toggleBookmark({
      itemId,
      itemType: type,
      title,
      category: cat,
      duration: dur
    }).subscribe({
      next: (res) => {
        this.toastService.show(res.message, 'success');
        this.loadBookmarks();
      }
    });
  }

  isBookmarked(itemId: string): boolean {
    return this.bookmarks().some(b => b.itemId === itemId);
  }

  // Water log helper
  incrementWaterLog(ml: number): void {
    this.fitnessService.logHealthParam({ waterIntake: ml }).subscribe({
      next: () => {
        this.toastService.show(`Logged +${ml}ml water intake! 💧`, 'success');
        this.loadStats();
      }
    });
  }

  // Daily Challenge Checklist ticks
  toggleChallenge(key: string): void {
    this.fitnessService.toggleChallenge(key).subscribe({
      next: (res) => {
        this.dailyChallengesList.set(res.data);
        this.toastService.show('Challenge updated!', 'success');
        this.loadStats();
      }
    });
  }

  isChallengeCompleted(key: string): boolean {
    return this.dailyChallengesList().includes(key);
  }

  // Save customized reminder configurations
  submitReminders(): void {
    this.isSavingReminders.set(true);
    this.fitnessService.saveReminders(this.reminders()).subscribe({
      next: (res) => {
        this.toastService.show(res.message, 'success');
        this.isSavingReminders.set(false);
      },
      error: () => this.isSavingReminders.set(false)
    });
  }

  // Health Param Entry Logs
  submitHealthLogs(): void {
    this.isLoggingHealth.set(true);
    this.fitnessService.logHealthParam({
      weight: this.bodyWeight,
      sleepHours: this.sleepDurationLog,
      heartRate: this.heartRate,
      bpSystolic: this.bpSystolic,
      bpDiastolic: this.bpDiastolic,
      sugar: this.bloodSugar
    }).subscribe({
      next: (res) => {
        this.toastService.show(res.message, 'success');
        this.isLoggingHealth.set(false);
        this.loadStats();
      },
      error: () => this.isLoggingHealth.set(false)
    });
  }

  // Gemini AI wellness guidelines
  fetchAiWellnessPlan(): void {
    this.isAiLoading.set(true);
    this.fitnessService.getAiWellnessPlan().subscribe({
      next: (res) => {
        this.aiPlan.set(res.data);
        this.isAiLoading.set(false);
        this.toastService.show('AI Wellness plan refreshed!', 'success');
      },
      error: (err) => {
        this.toastService.show('Failed to load AI Wellness plan.', 'error');
        this.isAiLoading.set(false);
      }
    });
  }

  // Breathing routines visual animations
  startBreathing(pattern: 'box' | '478' | 'deep'): void {
    this.stopBreathingTimer();
    this.selectedBreathingPattern.set(pattern);
    this.breathingActive.set(true);
    this.runBreathingLoop();
  }

  stopBreathingTimer(): void {
    if (this.breathingTimerHandle) {
      clearTimeout(this.breathingTimerHandle);
      this.breathingTimerHandle = null;
    }
    this.breathingActive.set(false);
    this.breathingPhase.set('Ready');
  }

  private runBreathingLoop(): void {
    const pattern = this.selectedBreathingPattern();
    
    const boxCycle = [
      { phase: 'Inhale', secs: 4 },
      { phase: 'Hold', secs: 4 },
      { phase: 'Exhale', secs: 4 },
      { phase: 'Hold (Empty)', secs: 4 }
    ];
    const cycle478 = [
      { phase: 'Inhale', secs: 4 },
      { phase: 'Hold', secs: 7 },
      { phase: 'Exhale', secs: 8 }
    ];
    const deepCycle = [
      { phase: 'Inhale', secs: 5 },
      { phase: 'Exhale', secs: 5 }
    ];

    const currentSequence = pattern === 'box' ? boxCycle : pattern === '478' ? cycle478 : deepCycle;
    let seqIdx = 0;

    const runStep = () => {
      if (!this.breathingActive()) return;

      const step = currentSequence[seqIdx];
      this.breathingPhase.set(step.phase as any);
      this.breathingTimerValue.set(step.secs);

      const countdown = () => {
        if (!this.breathingActive()) return;
        
        const val = this.breathingTimerValue();
        if (val > 1) {
          this.breathingTimerValue.set(val - 1);
          this.breathingTimerHandle = setTimeout(countdown, 1000);
        } else {
          // Go to next step in phase
          seqIdx = (seqIdx + 1) % currentSequence.length;
          runStep();
        }
      };

      this.breathingTimerHandle = setTimeout(countdown, 1000);
    };

    runStep();
  }

  // Videos Library
  loadVideos(): void {
    this.isVideosLoading.set(true);
    this.fitnessService.searchVideos(this.videoSearchQuery()).subscribe({
      next: (res) => {
        this.foundVideos.set(res.data || []);
        this.isVideosLoading.set(false);
      },
      error: () => this.isVideosLoading.set(false)
    });
  }

  triggerVideoSearch(query: string): void {
    this.videoSearchQuery.set(query);
    this.loadVideos();
  }

  playVideo(videoId: string): void {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    this.activeVideoEmbedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
  }

  closeVideo(): void {
    this.activeVideoEmbedUrl.set(null);
  }

  formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
