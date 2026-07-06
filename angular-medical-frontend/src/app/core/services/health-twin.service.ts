import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HealthTwinProfile {
  _id: string;
  userId: string;
  name: string;
  age: number;
  gender: string;
  bmi: number;
  healthScore: number;
  mood: string;
  status: string;
  activityLevel: string;
  profilePhoto: string;
  avatarCustomization: {
    theme: string;
    color: string;
    glow: boolean;
  };
}

export interface HealthScoreHistory {
  _id: string;
  score: number;
  category: string;
  breakdown: {
    symptoms: number;
    bmi: number;
    sleep: number;
    water: number;
    activity: number;
    appointments: number;
  };
  date: string;
}

export interface HealthPredictions {
  _id: string;
  weightTrend: string;
  sleepQuality: string;
  stressLevel: string;
  bmiTrend: number[];
  fitnessScoreTrend: number[];
  hydrationPrediction: string;
  weeklyForecast: string;
  monthlyForecast: string;
  graphData?: {
    labels: string[];
    bmi: number[];
    fitness: number[];
  };
}

export interface HealthRisk {
  name: string;
  level: 'Low' | 'Moderate' | 'High';
  description: string;
}

export interface HealthReport {
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  healthScore: number;
  summary: string;
  metrics: {
    caloriesBurned: number;
    workoutMinutes: number;
    yogaSessions: number;
    meditationMinutes: number;
    runningDistance: number;
    cyclingDistance: number;
    averageSleepHours: number;
    averageWaterIntake: number;
    waterTotal?: number;
    sleepTotal?: number;
  };
  suggestions: string[];
  date: string;
}

export interface HealthTimelineItem {
  eventType: 'appointment' | 'symptom' | 'medicine' | 'workout' | 'running' | 'cycling' | 'yoga' | 'meditation' | 'weight' | 'sleep' | 'water';
  title: string;
  description: string;
  value: string;
  date: string;
}

export interface HealthBadge {
  badgeKey: string;
  title: string;
  description: string;
  earnedAt: string;
}

export interface HealthInsight {
  category: string;
  insightText: string;
  improvementPercentage: number;
}

export interface SmartAlert {
  type: 'info' | 'warning' | 'danger';
  text: string;
  action: string;
}

@Injectable({ providedIn: 'root' })
export class HealthTwinService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/healthtwin';

  getProfile(): Observable<{ status: string; data: HealthTwinProfile; weight: number }> {
    return this.http.get<{ status: string; data: HealthTwinProfile; weight: number }>(`${this.apiUrl}/profile`);
  }

  updateAvatar(payload: Partial<HealthTwinProfile> & { theme?: string; color?: string; glow?: boolean }): Observable<{ status: string; message: string; data: HealthTwinProfile }> {
    return this.http.post<{ status: string; message: string; data: HealthTwinProfile }>(`${this.apiUrl}/profile/avatar`, payload);
  }

  getHealthScore(): Observable<{ status: string; data: { current: { score: number; category: string; breakdown: any }; history: HealthScoreHistory[] } }> {
    return this.http.get<{ status: string; data: { current: { score: number; category: string; breakdown: any }; history: HealthScoreHistory[] } }>(`${this.apiUrl}/score`);
  }

  getPredictions(): Observable<{ status: string; data: HealthPredictions; source: string }> {
    return this.http.get<{ status: string; data: HealthPredictions; source: string }>(`${this.apiUrl}/predictions`);
  }

  getRiskAnalysis(): Observable<{ status: string; data: HealthRisk[] }> {
    return this.http.get<{ status: string; data: HealthRisk[] }>(`${this.apiUrl}/risk-analysis`);
  }

  getReports(type: 'daily' | 'weekly' | 'monthly'): Observable<{ status: string; data: HealthReport }> {
    return this.http.get<{ status: string; data: HealthReport }>(`${this.apiUrl}/reports`, { params: { type } });
  }

  getRecommendations(): Observable<{ status: string; data: any }> {
    return this.http.get<{ status: string; data: any }>(`${this.apiUrl}/recommendations`);
  }

  getAlerts(): Observable<{ status: string; data: SmartAlert[] }> {
    return this.http.get<{ status: string; data: SmartAlert[] }>(`${this.apiUrl}/alerts`);
  }

  getComparison(): Observable<{ status: string; data: any }> {
    return this.http.get<{ status: string; data: any }>(`${this.apiUrl}/comparison`);
  }

  getAchievements(): Observable<{ status: string; count: number; data: HealthBadge[] }> {
    return this.http.get<{ status: string; count: number; data: HealthBadge[] }>(`${this.apiUrl}/achievements`);
  }

  getInsights(): Observable<{ status: string; data: HealthInsight[] }> {
    return this.http.get<{ status: string; data: HealthInsight[] }>(`${this.apiUrl}/insights`);
  }

  getTimeline(): Observable<{ status: string; data: HealthTimelineItem[] }> {
    return this.http.get<{ status: string; data: HealthTimelineItem[] }>(`${this.apiUrl}/timeline`);
  }
}
