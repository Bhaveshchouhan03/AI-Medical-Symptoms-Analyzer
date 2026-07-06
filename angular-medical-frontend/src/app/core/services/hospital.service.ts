import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Hospital {
  _id: string;
  name: string;
  city: string;
  address: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class HospitalService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/hospitals';

  getHospitals(): Observable<{ count: number; data: Hospital[] }> {
    return this.http.get<{ count: number; data: Hospital[] }>(this.apiUrl);
  }

  addHospital(hospital: Partial<Hospital>): Observable<{ message: string; data: Hospital }> {
    return this.http.post<{ message: string; data: Hospital }>(this.apiUrl, hospital);
  }

  editHospital(id: string, hospital: Partial<Hospital>): Observable<{ message: string; data: Hospital }> {
    return this.http.put<{ message: string; data: Hospital }>(`${this.apiUrl}/${id}`, hospital);
  }

  deleteHospital(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
