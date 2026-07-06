import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService, Appointment } from '../../../core/services/appointment.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor.html',
})
export class DoctorComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private toastService = inject(ToastService);

  appointments = signal<Appointment[]>([]);
  isLoading = signal(true);
  error = signal('');

  // Dashboard Stats Counters
  totalPatients = signal<number>(0);
  todayEarnings = signal<number>(0);
  pendingCount = signal<number>(0);
  acceptedCount = signal<number>(0);
  completedCount = signal<number>(0);
  rejectedCount = signal<number>(0);
  cancelledCount = signal<number>(0);
  emergencyCount = signal<number>(0);

  // Tab Filtering
  activeFilterTab = signal<'requests' | 'active' | 'history'>('requests');

  filteredAppointments = computed(() => {
    const list = this.appointments();
    const tab = this.activeFilterTab();
    if (tab === 'requests') {
      return list.filter(a => a.status === 'Pending');
    } else if (tab === 'active') {
      return list.filter(a => a.status === 'Accepted' || a.status === 'Rescheduled' || a.status === 'Emergency');
    } else {
      return list.filter(a => a.status === 'Completed' || a.status === 'Rejected' || a.status === 'Cancelled');
    }
  });

  // Modal / Detail views
  isDetailOpen = signal<boolean>(false);
  selectedAppointmentDetails = signal<any | null>(null);

  // Action Modals State
  isRejectModalOpen = signal<boolean>(false);
  rejectAppointmentId = signal<string | null>(null);
  rejectReason = signal<string>('Doctor unavailable');
  customRejectReason = signal<string>('');
  suggestedSlots = signal<string[]>([
    'Tomorrow 10:00 AM',
    'Tomorrow 11:30 AM',
    'Day After Tomorrow 04:00 PM'
  ]);

  isRescheduleModalOpen = signal<boolean>(false);
  rescheduleAppointmentId = signal<string | null>(null);
  newRescheduleDate = signal<string>('');
  newRescheduleTime = signal<string>('10:00 AM');
  rescheduleReason = signal<string>('Slot conflict/Urgent clinic rounds');

  isCompleteModalOpen = signal<boolean>(false);
  completeAppointmentId = signal<string | null>(null);
  clinicalNotes = signal<string>('');
  prescriptionNotes = signal<string>('');
  reportUrl = signal<string>('');

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.appointmentService.getDoctorAppointments().subscribe({
      next: (res) => {
        this.appointments.set(res.data);
        if (res.stats) {
          this.totalPatients.set(res.stats.totalPatients || 0);
          this.todayEarnings.set(res.stats.todayEarnings || 0);
          this.pendingCount.set(res.stats.pendingCount || 0);
          this.acceptedCount.set(res.stats.acceptedCount || 0);
          this.completedCount.set(res.stats.completedCount || 0);
          this.rejectedCount.set(res.stats.rejectedCount || 0);
          this.cancelledCount.set(res.stats.cancelledCount || 0);
          this.emergencyCount.set(res.stats.emergencyCount || 0);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load appointments.');
        this.isLoading.set(false);
      },
    });
  }

  // View Diagnostic metrics detailed popup
  viewAppointmentDetails(id: string): void {
    this.appointmentService.getAppointmentDetails(id).subscribe({
      next: (res) => {
        this.selectedAppointmentDetails.set(res.data);
        this.isDetailOpen.set(true);
      },
      error: (err) => {
        this.toastService.error('Failed to load patient diagnostics data.');
      }
    });
  }

  closeDetails(): void {
    this.isDetailOpen.set(false);
    this.selectedAppointmentDetails.set(null);
  }

  // Accept Appointment
  acceptAppointment(id: string): void {
    this.appointmentService.acceptAppointment(id).subscribe({
      next: () => {
        this.toastService.success('Appointment accepted. Automated patient confirmations sent!');
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Failed to accept appointment.');
      }
    });
  }

  // Reject Appointment Modal opening
  startRejectAppointment(id: string): void {
    this.rejectAppointmentId.set(id);
    this.rejectReason.set('Doctor unavailable');
    this.customRejectReason.set('');
    this.suggestedSlots.set([
      'Tomorrow 10:00 AM',
      'Tomorrow 11:30 AM',
      'Day After Tomorrow 04:00 PM'
    ]);
    this.isRejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    this.isRejectModalOpen.set(false);
    this.rejectAppointmentId.set(null);
  }

  updateSlotItem(index: number, val: string): void {
    const slots = [...this.suggestedSlots()];
    slots[index] = val;
    this.suggestedSlots.set(slots);
  }

  submitReject(): void {
    const id = this.rejectAppointmentId();
    if (!id) return;
    const finalReason = this.rejectReason() === 'Other' ? this.customRejectReason() : this.rejectReason();
    
    this.appointmentService.rejectAppointment(id, finalReason, this.suggestedSlots()).subscribe({
      next: () => {
        this.toastService.success('Appointment declined. Reschedule options proposed.');
        this.isRejectModalOpen.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Failed to reject appointment.');
      }
    });
  }

  // Reschedule actions
  startReschedule(id: string, date: string, time: string): void {
    this.rescheduleAppointmentId.set(id);
    this.newRescheduleDate.set(date);
    this.newRescheduleTime.set(time);
    this.rescheduleReason.set('Slot conflict/Urgent clinic rounds');
    this.isRescheduleModalOpen.set(true);
  }

  closeRescheduleModal(): void {
    this.isRescheduleModalOpen.set(false);
    this.rescheduleAppointmentId.set(null);
  }

  submitReschedule(): void {
    const id = this.rescheduleAppointmentId();
    if (!id || !this.newRescheduleDate()) return;
    
    this.appointmentService.rescheduleAppointmentNew(
      id, 
      this.newRescheduleDate(), 
      this.newRescheduleTime(), 
      this.rescheduleReason()
    ).subscribe({
      next: () => {
        this.toastService.success('Appointment date/time adjusted.');
        this.isRescheduleModalOpen.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Reschedule request failed.');
      }
    });
  }

  // Complete Actions
  startCompleteAppointment(id: string): void {
    this.completeAppointmentId.set(id);
    this.clinicalNotes.set('');
    this.prescriptionNotes.set('');
    this.reportUrl.set('');
    this.isCompleteModalOpen.set(true);
  }

  closeCompleteModal(): void {
    this.isCompleteModalOpen.set(false);
    this.completeAppointmentId.set(null);
  }

  submitCompleteAppointment(): void {
    const id = this.completeAppointmentId();
    if (!id) return;

    this.appointmentService.completeAppointment(
      id, 
      this.clinicalNotes(), 
      this.prescriptionNotes(), 
      this.reportUrl()
    ).subscribe({
      next: () => {
        this.toastService.success('Case records updated and completed.');
        this.isCompleteModalOpen.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Failed to complete visit.');
      }
    });
  }

  // Cancel Appointment
  cancelAppointment(id: string): void {
    if (!confirm('Are you sure you want to cancel this appointment request?')) return;
    this.appointmentService.cancelAppointmentNew(id).subscribe({
      next: () => {
        this.toastService.success('Appointment cancelled.');
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Failed to cancel appointment.');
      }
    });
  }

  // Mark as Emergency
  markEmergency(id: string): void {
    if (!confirm('Confirm marking this booking status as a CRITICAL MEDICAL EMERGENCY?')) return;
    this.appointmentService.markEmergency(id).subscribe({
      next: () => {
        this.toastService.success('Flagged as emergency status.');
        this.loadAppointments();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Failed to flag emergency.');
      }
    });
  }

  // Styles helpers
  getStatusClass(status: string): string {
    switch(status) {
      case 'Pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Accepted': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Rejected': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Cancelled': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Rescheduled': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Emergency': return 'bg-red-500/10 text-red-400 border-red-500/25 border animate-pulse';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
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
