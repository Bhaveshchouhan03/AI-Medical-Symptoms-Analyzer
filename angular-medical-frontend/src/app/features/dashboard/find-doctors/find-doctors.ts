import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Doctor, DoctorService } from '../../../core/services/doctor.service';
import { Hospital, HospitalService } from '../../../core/services/hospital.service';
import { ToastService } from '../../../core/services/toast.service';
import { BookingModalComponent } from '../booking-modal/booking-modal';

@Component({
  selector: 'app-find-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BookingModalComponent],
  templateUrl: './find-doctors.html',
})
export class FindDoctorsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private hospitalService = inject(HospitalService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  doctors = signal<Doctor[]>([]);
  hospitals = signal<Hospital[]>([]);
  cities = signal<string[]>([]);
  favorites = signal<string[]>([]);
  isLoading = signal(false);
  error = signal('');

  // Search Filters
  searchName = signal('');
  searchSpecialization = signal('');
  searchHospital = signal('');
  searchCity = signal('');
  searchExperience = signal(0);
  searchFee = signal(1000);
  searchLanguage = signal('');
  searchRating = signal(0);
  searchAvailableToday = signal(false);
  searchOnline = signal(false);
  searchOffline = signal(false);

  // Booking Modal
  selectedDoctorForBooking = signal<Doctor | null>(null);
  isBookingOpen = signal(false);

  specializations = [
    'General Physician',
    'Dermatologist',
    'Neurologist',
    'Ophthalmologist',
    'Orthopedic',
    'Cardiologist',
    'Psychiatrist',
    'Dentist',
    'ENT Specialist',
  ];

  ngOnInit(): void {
    this.loadHospitals();
    this.loadFavorites();
    this.search();
  }

  loadHospitals(): void {
    this.hospitalService.getHospitals().subscribe({
      next: (res) => {
        this.hospitals.set(res.data);
        const uniqueCities = Array.from(new Set(res.data.map((h) => h.city)));
        this.cities.set(uniqueCities);
      },
      error: (err) => console.error('[loadHospitals] error:', err),
    });
  }

  loadFavorites(): void {
    this.doctorService.getFavorites().subscribe({
      next: (res) => {
        this.favorites.set(res.data.map(d => d._id));
      },
      error: (err) => console.error('[loadFavorites] error:', err)
    });
  }

  search(): void {
    this.isLoading.set(true);
    this.error.set('');

    const params: any = {
      status: 'Active',
    };

    if (this.searchName().trim()) params.name = this.searchName().trim();
    if (this.searchSpecialization()) params.specialization = this.searchSpecialization();
    if (this.searchHospital().trim()) params.hospitalName = this.searchHospital().trim();
    if (this.searchCity()) params.city = this.searchCity();
    if (this.searchExperience() > 0) params.experience = this.searchExperience();
    if (this.searchFee() < 1000) params.consultationFee = this.searchFee();
    if (this.searchLanguage().trim()) params.language = this.searchLanguage().trim();
    if (this.searchRating() > 0) params.rating = this.searchRating();
    if (this.searchAvailableToday()) params.availableToday = 'true';
    if (this.searchOnline()) params.online = 'true';
    if (this.searchOffline()) params.offline = 'true';

    this.doctorService.getDoctors(params).subscribe({
      next: (res) => {
        this.doctors.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to search doctors.');
        this.isLoading.set(false);
      },
    });
  }

  isDocFavorite(id: string): boolean {
    return this.favorites().includes(id);
  }

  toggleFavoriteDoc(id: string): void {
    this.doctorService.toggleFavorite(id).subscribe({
      next: (res) => {
        this.toastService.success(res.message);
        this.loadFavorites();
      },
      error: () => this.toastService.error('Failed to update favorite status.')
    });
  }

  clearFilters(): void {
    this.searchName.set('');
    this.searchSpecialization.set('');
    this.searchHospital.set('');
    this.searchCity.set('');
    this.searchExperience.set(0);
    this.searchFee.set(1000);
    this.searchLanguage.set('');
    this.searchRating.set(0);
    this.searchAvailableToday.set(false);
    this.searchOnline.set(false);
    this.searchOffline.set(false);
    this.search();
  }

  openBooking(doc: Doctor): void {
    this.selectedDoctorForBooking.set(doc);
    this.isBookingOpen.set(true);
  }

  viewProfile(docId: string): void {
    this.router.navigate(['/dashboard/doctor-profile', docId]);
  }
}
