import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Doctor } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-modal.html',
})
export class BookingModalComponent {
  private appointmentService = inject(AppointmentService);
  private toastService = inject(ToastService);

  @Input() doctor: Doctor | null = null;
  @Input() isOpen = false;
  @Input() symptoms: string[] = []; // Used if passed from AI Checker

  @Output() close = new EventEmitter<void>();
  @Output() booked = new EventEmitter<void>();

  bookingDate = signal('');
  bookingSlot = signal('');
  reasonForVisit = signal('');
  notes = signal('');
  isBooking = signal(false);

  closeModal(): void {
    this.bookingDate.set('');
    this.bookingSlot.set('');
    this.reasonForVisit.set('');
    this.notes.set('');
    this.close.emit();
  }

  isDateValidForDoctor(dateStr: string): boolean {
    if (!dateStr || !this.doctor) return false;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateStr);
    const dayName = days[d.getDay()];
    return this.doctor.availableDays.includes(dayName);
  }

  submitBooking(): void {
    if (!this.doctor) return;

    const date = this.bookingDate();
    const slot = this.bookingSlot();
    const reason = this.reasonForVisit().trim();

    if (!date || !slot || !reason) {
      this.toastService.error('Date, Time slot, and Reason for visit are required.');
      return;
    }

    if (!this.isDateValidForDoctor(date)) {
      this.toastService.error('Doctor is not available on this day of the week.');
      return;
    }

    this.isBooking.set(true);
    this.appointmentService
      .bookAppointment({
        doctorId: this.doctor._id,
        appointmentDate: date,
        appointmentTime: slot,
        reasonForVisit: reason,
        symptoms: this.symptoms || [],
        notes: this.notes() || '',
      })
      .subscribe({
        next: () => {
          this.toastService.success('Appointment booked successfully! Status is Pending.');
          this.isBooking.set(false);
          this.booked.emit();
          this.closeModal();
        },
        error: (err) => {
          this.toastService.error(err?.error?.message ?? 'Booking failed. Try another slot.');
          this.isBooking.set(false);
        },
      });
  }
}
