import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FaceHealthScan {
  _id: string;
  userId: string;
  image?: string | null;
  score: number;
  category: string;
  wellnessIndicators: {
    eyeRedness: 'Normal' | 'Mild' | 'Moderate' | 'Severe';
    darkCircles: 'None' | 'Mild' | 'Moderate' | 'Severe';
    skinType: 'Normal' | 'Dry' | 'Oily' | 'Combination';
    skinBrightness: 'Bright' | 'Medium' | 'Dull';
    symmetry: 'Symmetric' | 'Slight Deviation' | 'High Deviation';
    smile: 'Detected' | 'Not Detected';
    stress: number;
    fatigue: number;
    hydration: number;
    skinBreakouts?: 'None' | 'Mild' | 'Moderate' | 'Severe';
    jaundiceIndicator?: 'None' | 'Mild' | 'Moderate';
    puffiness?: 'None' | 'Mild' | 'Moderate';
    skinRedness?: 'None' | 'Mild' | 'Moderate' | 'Severe';
  };
  recommendations: string[];
  mood: string;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class FaceAnalyzerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://ai-medical-symptoms-analyzer.onrender.com/api/face';

  analyzeFace(image: string, saveImage = false): Observable<{ status: string; data: FaceHealthScan }> {
    return this.http.post<{ status: string; data: FaceHealthScan }>(`${this.apiUrl}/analyze`, { image, saveImage });
  }

  getHistory(): Observable<{ status: string; data: FaceHealthScan[] }> {
    return this.http.get<{ status: string; data: FaceHealthScan[] }>(`${this.apiUrl}/history`);
  }

  getScanDetails(id: string): Observable<{ status: string; data: FaceHealthScan }> {
    return this.http.get<{ status: string; data: FaceHealthScan }>(`${this.apiUrl}/${id}`);
  }

  deleteScan(id: string): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(`${this.apiUrl}/${id}`);
  }

  exportReportText(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/report/${id}`, { responseType: 'blob' });
  }
}
