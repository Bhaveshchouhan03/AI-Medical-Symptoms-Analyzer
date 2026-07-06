import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Doctor {
  _id: string;
  fullName: string;
  specialization: string;
  qualification: string;
  experience: number;
  hospitalId?: string;
  hospitalName: string;
  city: string;
  languages: string[];
  consultationFee: number;
  rating: number;
  profileImage: string;
  about: string;
  availableDays: string[];
  availableTimeSlots: string[];
  email: string;
  phone: string;
  password?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  
  // Extended fields
  gender?: string;
  age?: number;
  medicalDegree?: string;
  registrationNumber?: string;
  clinicName?: string;
  onlineConsultation?: boolean;
  offlineConsultation?: boolean;
  clinicAddress?: string;
  state?: string;
  country?: string;
  googleMapsLocation?: string;
  achievements?: string[];
  certificates?: string[];
  maxPatientsPerDay?: number;
  emergencyAvailability?: boolean;
  verificationStatus?: 'Pending' | 'Verified' | 'Rejected';
  reviewsCount?: number;
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/doctors';

  getDoctors(params?: {
    name?: string;
    specialization?: string;
    hospitalName?: string;
    city?: string;
    experience?: number;
    consultationFee?: number;
    status?: string;
    online?: string;
    offline?: string;
    availableToday?: string;
    rating?: number;
    language?: string;
  }): Observable<{ count: number; data: Doctor[] }> {
    return this.http.get<{ count: number; data: Doctor[] }>(this.apiUrl, { params: params as any });
  }

  getDoctorById(id: string): Observable<{ data: Doctor }> {
    return this.http.get<{ data: Doctor }>(`${this.apiUrl}/${id}`);
  }

  addDoctor(doctor: Partial<Doctor>): Observable<{ message: string; data: Doctor }> {
    return this.http.post<{ message: string; data: Doctor }>(this.apiUrl, doctor);
  }

  registerDoctor(doctor: Partial<Doctor>): Observable<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: any;
    data: Doctor;
  }> {
    return this.http.post<{
      message: string;
      accessToken: string;
      refreshToken: string;
      user: any;
      data: Doctor;
    }>(`${this.apiUrl}/register`, doctor);
  }

  editDoctor(id: string, doctor: Partial<Doctor>): Observable<{ message: string; data: Doctor }> {
    return this.http.put<{ message: string; data: Doctor }>(`${this.apiUrl}/${id}`, doctor);
  }

  deleteDoctor(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  toggleStatus(id: string, status: 'Active' | 'Inactive'): Observable<{ message: string; data: Doctor }> {
    return this.http.patch<{ message: string; data: Doctor }>(`${this.apiUrl}/${id}/status`, { status });
  }

  addReview(id: string, reviewText: string, rating: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/reviews`, { reviewText, rating });
  }

  getDoctorReviews(id: string): Observable<{ count: number; data: any[] }> {
    return this.http.get<{ count: number; data: any[] }>(`${this.apiUrl}/${id}/reviews`);
  }

  toggleFavorite(id: string): Observable<{ isFavorite: boolean; message: string }> {
    return this.http.post<{ isFavorite: boolean; message: string }>(`${this.apiUrl}/${id}/favorite`, {});
  }

  getFavorites(): Observable<{ count: number; data: Doctor[] }> {
    return this.http.get<{ count: number; data: Doctor[] }>(`${this.apiUrl}/favorites/my`);
  }
}
