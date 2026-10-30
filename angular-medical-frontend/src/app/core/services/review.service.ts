import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Review {
  _id: string;
  doctorId: string;
  patientName: string;
  rating: number;
  reviewText: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://ai-medical-symptoms-analyzer.onrender.com/api/reviews';

  getDoctorReviews(doctorId: string): Observable<{ count: number; data: Review[] }> {
    return this.http.get<{ count: number; data: Review[] }>(`${this.apiUrl}/doctor/${doctorId}`);
  }

  addReview(review: { doctorId: string; rating: number; reviewText: string }): Observable<{ message: string; data: Review }> {
    return this.http.post<{ message: string; data: Review }>(this.apiUrl, review);
  }
}
