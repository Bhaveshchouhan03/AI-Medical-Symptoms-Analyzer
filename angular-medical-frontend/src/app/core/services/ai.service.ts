import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PossibleCause {
  name: string;
  likelihood: 'high' | 'medium' | 'low';
  explanation: string;
}

export type VideoCategory =
  | 'understanding'
  | 'home-remedy'
  | 'when-to-see-doctor'
  | 'exercise'
  | 'diet'
  | 'prevention';

export interface YoutubeVideo {
  title:        string;
  videoId:      string;
  thumbnail:    string;
  channel:      string;
  publishedAt:  string;

  // Backwards compatibility/extra fields
  channelName?:  string | null;
  description?:  string;
  watchUrl?:     string;
  category?:     VideoCategory;
  symptomFocus?: string;
  isFallback?:   boolean;
}

export interface AiAnalysis {
  summary:              string;
  possibleConditions:   PossibleCause[];
  homeCare:             string[];
  doctorRecommendation: string;
  emergencyWarning:     string | null;
  urgencyLevel:         'routine' | 'soon' | 'urgent' | 'emergency';
  disclaimer:           string;
  recommendedVideos:    YoutubeVideo[];
  healthRiskScore?:     number;
  healthRiskLevel?:     'low' | 'moderate' | 'high';

  // ── Backwards compatibility fields for old DB records ──
  possibleCauses?:    PossibleCause[];
  homeCareTips?:      string[];
  whenToSeeDoctor?:   string;
  emergencyWarnings?: string | null;
  videos?:            YoutubeVideo[];
}

export interface AiAnalysisPayload {
  formId?: string;
  age: number;
  gender: string;
  symptoms: string[];
  duration: string;
  severity: number;
  notes: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http    = inject(HttpClient);
  private readonly apiUrl  = 'http://localhost:3000/api/ai';

  analyze(payload: AiAnalysisPayload): Observable<AiAnalysis> {
    return this.http.post<AiAnalysis>(`${this.apiUrl}/analyze`, payload);
  }
}
