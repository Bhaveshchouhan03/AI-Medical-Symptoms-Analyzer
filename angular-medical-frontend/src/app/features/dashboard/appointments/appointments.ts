import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppointmentService, Appointment } from '../../../core/services/appointment.service';
import { DoctorService, Doctor } from '../../../core/services/doctor.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './appointments.html',
})
export class AppointmentsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private doctorService = inject(DoctorService);
  private toastService = inject(ToastService);

  appointments = signal<Appointment[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeTab = signal<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  // Rescheduling state
  isRescheduleOpen = signal(false);
  selectedAppointmentForReschedule = signal<Appointment | null>(null);
  rescheduleDoctor = signal<Doctor | null>(null);
  rescheduleDate = signal('');
  rescheduleSlot = signal('');
  isRescheduling = signal(false);

  filteredAppointments = computed(() => {
    const list = this.appointments();
    const tab = this.activeTab();
    if (tab === 'upcoming') {
      return list.filter((a) => 
        a.status === 'Pending' || 
        a.status === 'Accepted' || 
        a.status === 'Rescheduled' || 
        a.status === 'Emergency' ||
        (a.status === 'Rejected' && a.suggestedTimeSlots && a.suggestedTimeSlots.length > 0)
      );
    } else if (tab === 'completed') {
      return list.filter((a) => a.status === 'Completed');
    } else {
      return list.filter((a) => 
        a.status === 'Cancelled' || 
        (a.status === 'Rejected' && (!a.suggestedTimeSlots || a.suggestedTimeSlots.length === 0))
      );
    }
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.appointmentService.getPatientAppointments().subscribe({
      next: (res) => {
        this.appointments.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load appointments.');
        this.isLoading.set(false);
      },
    });
  }

  cancelAppointment(id: string): void {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    this.appointmentService.cancelAppointmentNew(id).subscribe({
      next: () => {
        this.toastService.success('Appointment cancelled successfully.');
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Failed to cancel appointment.');
      },
    });
  }

  openReschedule(app: Appointment): void {
    this.selectedAppointmentForReschedule.set(app);
    this.rescheduleDate.set(app.appointmentDate);
    this.rescheduleSlot.set(app.appointmentTime);
    this.rescheduleDoctor.set(null);
    this.isRescheduleOpen.set(true);

    this.doctorService.getDoctorById(app.doctorId).subscribe({
      next: (res) => {
        this.rescheduleDoctor.set(res.data);
      },
      error: (err) => {
        console.error('[reschedule fetch doc] error:', err);
        this.toastService.error('Failed to load doctor slot availability info.');
      },
    });
  }

  isRescheduleDateValid(): boolean {
    const doc = this.rescheduleDoctor();
    const date = this.rescheduleDate();
    if (!doc || !date) return false;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(date);
    const dayName = days[d.getDay()];
    return doc.availableDays.includes(dayName);
  }

  submitReschedule(): void {
    const app = this.selectedAppointmentForReschedule();
    const date = this.rescheduleDate();
    const slot = this.rescheduleSlot();
    if (!app || !date || !slot) return;

    if (!this.isRescheduleDateValid()) {
      this.toastService.error('Doctor is not available on this day of the week.');
      return;
    }

    this.isRescheduling.set(true);
    this.appointmentService
      .rescheduleAppointmentNew(app._id, date, slot)
      .subscribe({
        next: () => {
          this.toastService.success('Appointment rescheduled successfully! Status set to Rescheduled.');
          this.isRescheduling.set(false);
          this.isRescheduleOpen.set(false);
          this.loadAppointments();
        },
        error: (err) => {
          this.toastService.error(err?.error?.message ?? 'Rescheduling failed.');
          this.isRescheduling.set(false);
        },
      });
  }

  // Patient Responds to Doctor's Rejection alternative suggested slots
  respondToAlternativeSlot(id: string, action: 'accept' | 'reject', selectedSlot?: string): void {
    this.appointmentService.respondToRejection(id, action, selectedSlot).subscribe({
      next: () => {
        this.toastService.success(action === 'accept' ? 'Proposed time slot confirmed!' : 'Alternative slots declined.');
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Action failed.');
      }
    });
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'Pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Accepted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Completed': return 'bg-green-50 text-green-700 border-green-200';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Cancelled': return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'Rescheduled': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Emergency': return 'bg-red-50 text-red-700 border-red-200 font-bold animate-pulse';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  getStatusIcon(status: string): string {
    switch(status) {
      case 'Pending': return '🟡';
      case 'Accepted': return '🔵';
      case 'Completed': return '🟢';
      case 'Rejected': return '🔴';
      case 'Cancelled': return '⚪';
      case 'Rescheduled': return '🟣';
      case 'Emergency': return '🚨';
      default: return '📝';
    }
  }

  formatDate(dateStr: string): string {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }
}
