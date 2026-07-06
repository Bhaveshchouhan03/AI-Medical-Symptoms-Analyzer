import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiAnalysis } from './ai.service';

export interface SymptomFormPayload {
  age: number;
  gender: string;
  symptoms: string[];
  duration: string;
  severity: number;
  notes: string;
}

export interface PatientFormRecord {
  _id: string;
  age: number;
  gender: string;
  symptoms: string[];
  duration: string;
  severity: number;
  notes: string;
  status: 'pending' | 'reviewed' | 'resolved';
  aiAnalysis: AiAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

export interface SymptomFormResponse {
  message: string;
  data: PatientFormRecord;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/patient';

  submitSymptomForm(payload: SymptomFormPayload): Observable<SymptomFormResponse> {
    return this.http.post<SymptomFormResponse>(`${this.apiUrl}/submit`, payload);
  }

  getMyForms(): Observable<{ data: PatientFormRecord[] }> {
    return this.http.get<{ data: PatientFormRecord[] }>(`${this.apiUrl}/my-forms`);
  }

  getFormById(id: string): Observable<{ data: PatientFormRecord }> {
    return this.http.get<{ data: PatientFormRecord }>(`${this.apiUrl}/my-forms/${id}`);
  }
}
