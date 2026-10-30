import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface YogaSession {
  _id: string;
  yogaName: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number;
  calories: number;
  benefits: string[];
  equipment: string[];
  videoUrl: string;
  image: string;
}

export interface MeditationSession {
  _id: string;
  title: string;
  category: string;
  duration: number;
  benefits: string[];
  difficulty: string;
  audioUrl?: string;
  videoUrl?: string;
}

export interface FitnessStats {
  dailyActivity: {
    water: number;
    sleep: number;
    weight: number | null;
    bmi: number | null;
    bpSystolic: number | null;
    bpDiastolic: number | null;
    sugar: number | null;
    heartRate: number | null;
  };
  caloriesBurned: number;
  workoutMinutes: number;
  yogaSessions: number;
  meditationTime: number;
  runningDistance: number;
  cyclingDistance: number;
  workoutStreak: number;
  yogaStreak: number;
  meditationStreak: number;
}

export interface AIWellnessPlan {
  dailyExercise: Array<{ activity: string; duration: string; intensity: string; benefits: string }>;
  yoga: Array<{ poseName: string; duration: string; benefits: string }>;
  meditation: Array<{ type: string; duration: string; focus: string }>;
  targets: {
    waterIntake: number;
    sleepDuration: number;
    runningDistance: number;
    cyclingDistance: number;
  };
  diet: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snacks: string;
  };
  lifestyleTips: string[];
}

export interface WorkoutHistoryRecord {
  _id: string;
  workoutType: string;
  exerciseName: string;
  duration: number;
  caloriesBurned: number;
  targetMuscles: string[];
  date: string;
}

export interface RunningHistoryRecord {
  _id: string;
  distance: number;
  duration: number;
  caloriesBurned: number;
  speed: number;
  planName: string;
  date: string;
}

export interface CyclingHistoryRecord {
  _id: string;
  distance: number;
  duration: number;
  caloriesBurned: number;
  speed: number;
  cyclingType: 'Indoor' | 'Outdoor';
  date: string;
}

@Injectable({ providedIn: 'root' })
export class FitnessService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://ai-medical-symptoms-analyzer.onrender.com/api/fitness';

  getYogaSessions(category?: string): Observable<{ count: number; data: YogaSession[] }> {
    const params: Record<string, string> = {};
    if (category) {
      params['category'] = category;
    }
    return this.http.get(`${this.apiUrl}/yoga`, { params }) as unknown as Observable<{ count: number; data: YogaSession[] }>;
  }

  getMeditationSessions(category?: string): Observable<{ count: number; data: MeditationSession[] }> {
    const params: Record<string, string> = {};
    if (category) {
      params['category'] = category;
    }
    return this.http.get(`${this.apiUrl}/meditation`, { params }) as unknown as Observable<{ count: number; data: MeditationSession[] }>;
  }

  getStats(): Observable<{ data: FitnessStats }> {
    return this.http.get(`${this.apiUrl}/stats`) as unknown as Observable<{ data: FitnessStats }>;
  }

  getAiWellnessPlan(): Observable<{ data: AIWellnessPlan }> {
    return this.http.get(`${this.apiUrl}/ai-wellness`) as unknown as Observable<{ data: AIWellnessPlan }>;
  }

  logWorkout(payload: {
    workoutType: string;
    exerciseName: string;
    duration: number;
    caloriesBurned: number;
    targetMuscles?: string[];
  }): Observable<{ message: string; data: any; newBadgeUnlocked: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/workout`, payload) as Observable<{ message: string; data: any; newBadgeUnlocked: boolean }>;
  }

  logRunning(payload: {
    distance: number;
    duration: number;
    caloriesBurned: number;
    speed: number;
    planName?: string;
  }): Observable<{ message: string; data: any; newBadgeUnlocked: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/running`, payload) as Observable<{ message: string; data: any; newBadgeUnlocked: boolean }>;
  }

  logCycling(payload: {
    distance: number;
    duration: number;
    caloriesBurned: number;
    speed: number;
    cyclingType: 'Indoor' | 'Outdoor';
  }): Observable<{ message: string; data: any; newBadgeUnlocked: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/cycling`, payload) as Observable<{ message: string; data: any; newBadgeUnlocked: boolean }>;
  }

  getHistory(): Observable<{
    data: {
      workouts: WorkoutHistoryRecord[];
      runs: RunningHistoryRecord[];
      cycles: CyclingHistoryRecord[];
    };
  }> {
    return this.http.get(`${this.apiUrl}/history`) as unknown as Observable<{
      data: {
        workouts: WorkoutHistoryRecord[];
        runs: RunningHistoryRecord[];
        cycles: CyclingHistoryRecord[];
      };
    }>;
  }

  logHealthParam(payload: {
    weight?: number;
    waterIntake?: number;
    sleepHours?: number;
    caloriesBurned?: number;
    heartRate?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    sugar?: number;
  }): Observable<{ message: string; data: any }> {
    return this.http.post<any>(`${this.apiUrl}/health-tracker`, payload) as Observable<{ message: string; data: any }>;
  }

  getHealthLogs(): Observable<{ data: any[] }> {
    return this.http.get(`${this.apiUrl}/health-tracker`) as unknown as Observable<{ data: any[] }>;
  }

  getReminders(): Observable<{ data: any }> {
    return this.http.get(`${this.apiUrl}/reminders`) as unknown as Observable<{ data: any }>;
  }

  saveReminders(payload: {
    workoutTime?: string;
    yogaTime?: string;
    meditationTime?: string;
    waterInterval?: number;
    sleepTime?: string;
    medicineTime?: string;
  }): Observable<{ message: string; data: any }> {
    return this.http.post<any>(`${this.apiUrl}/reminders`, payload) as Observable<{ message: string; data: any }>;
  }

  getBookmarks(): Observable<{ count: number; data: any[] }> {
    return this.http.get(`${this.apiUrl}/bookmarks`) as unknown as Observable<{ count: number; data: any[] }>;
  }

  toggleBookmark(payload: {
    itemId: string;
    itemType: 'yoga' | 'meditation' | 'workout';
    title: string;
    category?: string;
    duration?: number;
  }): Observable<{ bookmarked: boolean; message: string; data?: any }> {
    return this.http.post<any>(`${this.apiUrl}/bookmarks`, payload) as Observable<{ bookmarked: boolean; message: string; data?: any }>;
  }

  getChallenges(): Observable<{ data: string[] }> {
    return this.http.get(`${this.apiUrl}/challenges`) as unknown as Observable<{ data: string[] }>;
  }

  toggleChallenge(challengeKey: string): Observable<{ message: string; data: string[] }> {
    return this.http.post<any>(`${this.apiUrl}/challenges`, { challengeKey }) as Observable<{ message: string; data: string[] }>;
  }

  getAchievements(): Observable<{ count: number; data: string[] }> {
    return this.http.get(`${this.apiUrl}/achievements`) as unknown as Observable<{ count: number; data: string[] }>;
  }

  searchVideos(query: string): Observable<{ data: any[] }> {
    return this.http.get(`https://ai-medical-symptoms-analyzer.onrender.com/api/ai/videos`, { params: { query } }) as unknown as Observable<{ data: any[] }>;
  }
}
