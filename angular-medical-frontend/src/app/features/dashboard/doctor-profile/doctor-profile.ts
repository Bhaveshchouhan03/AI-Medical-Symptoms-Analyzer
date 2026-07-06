import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Doctor, DoctorService } from '../../../core/services/doctor.service';
import { ToastService } from '../../../core/services/toast.service';
import { BookingModalComponent } from '../booking-modal/booking-modal';

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, BookingModalComponent],
  templateUrl: './doctor-profile.html',
})
export class DoctorProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private doctorService = inject(DoctorService);
  private toastService = inject(ToastService);

  doctor = signal<Doctor | null>(null);
  reviews = signal<any[]>([]);
  isLoading = signal(true);
  isFavorite = signal(false);

  // Review fields
  reviewText = signal('');
  reviewRating = signal(5);

  // Booking Modal
  isBookingOpen = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDoctorDetails(id);
      this.loadReviews(id);
      this.checkFavoriteStatus(id);
    } else {
      this.toastService.error('Invalid Doctor Reference.');
      this.router.navigate(['/dashboard/find-doctors']);
    }
  }

  loadDoctorDetails(id: string): void {
    this.isLoading.set(true);
    this.doctorService.getDoctorById(id).subscribe({
      next: (res) => {
        this.doctor.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toastService.error('Failed to load doctor profile.');
        this.isLoading.set(false);
        this.router.navigate(['/dashboard/find-doctors']);
      }
    });
  }

  loadReviews(id: string): void {
    this.doctorService.getDoctorReviews(id).subscribe({
      next: (res) => {
        this.reviews.set(res.data);
      },
      error: (err) => console.error('[loadReviews] error:', err)
    });
  }

  checkFavoriteStatus(id: string): void {
    this.doctorService.getFavorites().subscribe({
      next: (res) => {
        const matches = res.data.some(d => d._id === id);
        this.isFavorite.set(matches);
      },
      error: (err) => console.error('[checkFavorite] error:', err)
    });
  }

  toggleFavorite(): void {
    const doc = this.doctor();
    if (!doc) return;
    this.doctorService.toggleFavorite(doc._id).subscribe({
      next: (res) => {
        this.isFavorite.set(res.isFavorite);
        this.toastService.success(res.message);
      },
      error: (err) => this.toastService.error('Failed to update favorite status.')
    });
  }

  submitReview(): void {
    const doc = this.doctor();
    if (!doc) return;
    if (!this.reviewText().trim()) {
      this.toastService.error('Review text is required.');
      return;
    }

    this.doctorService.addReview(doc._id, this.reviewText(), this.reviewRating()).subscribe({
      next: () => {
        this.toastService.success('Review submitted successfully!');
        this.reviewText.set('');
        this.reviewRating.set(5);
        this.loadDoctorDetails(doc._id);
        this.loadReviews(doc._id);
      },
      error: (err) => this.toastService.error(err?.error?.message ?? 'Failed to submit review.')
    });
  }

  setRating(stars: number): void {
    this.reviewRating.set(stars);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/find-doctors']);
  }
}
