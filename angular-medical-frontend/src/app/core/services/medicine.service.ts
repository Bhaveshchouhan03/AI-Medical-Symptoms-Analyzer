import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Medicine {
  _id: string;
  medicineName: string;
  genericName: string;
  brandName: string;
  category: string;
  description: string;
  uses: string[];
  sideEffects: string[];
  warnings: string[];
  precautions: string[];
  howItWorks: string;
  pregnancySafety: string;
  breastfeedingSafety: string;
  drivingWarning: string;
  alcoholWarning: string;
  foodInteractions: string;
  drugInteractions: string;
  storageInstructions: string;
  expiryInfo: string;
  prescriptionRequired: boolean;
  manufacturer: string;
  availableStrengths: string[];
  availableForms: string[];
  image: string;
  createdAt?: string;
}

export interface MedicineStats {
  totalMedicines: number;
  totalCategories: number;
  mostSearched: Medicine[];
  recentlyViewed: Medicine[];
}

@Injectable({ providedIn: 'root' })
export class MedicineService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://ai-medical-symptoms-analyzer.onrender.com/api/medicines';

  getMedicines(params?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Observable<{
    count: number;
    page: number;
    totalPages: number;
    data: Medicine[];
  }> {
    const cleanParams: any = {};
    if (params) {
      if (params.search) cleanParams.search = params.search;
      if (params.category) cleanParams.category = params.category;
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
    }
    return this.http.get<{
      count: number;
      page: number;
      totalPages: number;
      data: Medicine[];
    }>(this.apiUrl, { params: cleanParams });
  }

  getMedicineById(id: string): Observable<{ data: Medicine }> {
    return this.http.get<{ data: Medicine }>(`${this.apiUrl}/${id}`);
  }

  getStats(): Observable<{ data: MedicineStats }> {
    return this.http.get<{ data: MedicineStats }>(`${this.apiUrl}/stats`);
  }

  toggleBookmark(id: string): Observable<{ bookmarked: boolean; message: string }> {
    return this.http.post<{ bookmarked: boolean; message: string }>(`${this.apiUrl}/${id}/bookmark`, {});
  }

  getBookmarkedMedicines(): Observable<{ count: number; data: Medicine[] }> {
    return this.http.get<{ count: number; data: Medicine[] }>(`${this.apiUrl}/user/bookmarks`);
  }

  getRecentlyViewed(): Observable<{ count: number; data: Medicine[] }> {
    return this.http.get<{ count: number; data: Medicine[] }>(`${this.apiUrl}/user/recently-viewed`);
  }
}
