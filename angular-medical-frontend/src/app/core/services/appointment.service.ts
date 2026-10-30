import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  appointmentDate: string;
  appointmentTime: string;
  reasonForVisit: string;
  symptoms: string[];
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'Emergency';
  notes: string;
  rejectionReason?: string;
  suggestedTimeSlots?: string[];
  isEmergency?: boolean;
  prescriptionNotes?: string;
  reportUrl?: string;
  videoLink?: string;
  clinicAddress?: string;
  hospitalName?: string;
  timeline?: Array<{
    status: string;
    notes?: string;
    timestamp: string;
  }>;
  createdAt: string;
}

export interface Analytics {
  totalDoctors: number;
  totalPatients: number;
  appointmentsToday: number;
  completedAppointments: number;
  cancelledAppointments: number;
  mostBookedSpecialist: string;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://ai-medical-symptoms-analyzer.onrender.com/api/appointments';

  bookAppointment(data: {
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    reasonForVisit: string;
    symptoms: string[];
    notes?: string;
  }): Observable<{ message: string; data: Appointment }> {
    return this.http.post<{ message: string; data: Appointment }>(this.apiUrl, data);
  }

  rescheduleAppointment(
    id: string,
    data: { appointmentDate: string; appointmentTime: string }
  ): Observable<{ message: string; data: Appointment }> {
    return this.http.patch<{ message: string; data: Appointment }>(`${this.apiUrl}/${id}/reschedule`, data);
  }

  getPatientAppointments(): Observable<{ count: number; data: Appointment[] }> {
    return this.http.get<{ count: number; data: Appointment[] }>(`${this.apiUrl}/my`);
  }

  cancelAppointment(id: string): Observable<{ message: string; data: Appointment }> {
    return this.http.patch<{ message: string; data: Appointment }>(`${this.apiUrl}/${id}/cancel`, {});
  }

  getDoctorAppointments(): Observable<{ count: number; data: Appointment[]; stats?: any }> {
    return this.http.get<{ count: number; data: Appointment[]; stats?: any }>(`${this.apiUrl}/doctor`);
  }

  updateAppointmentStatus(
    id: string,
    status: 'Accepted' | 'Rejected' | 'Cancelled' | 'Completed',
    notes?: string
  ): Observable<{ message: string; data: Appointment }> {
    return this.http.patch<{ message: string; data: Appointment }>(`${this.apiUrl}/${id}/status`, { status, notes });
  }

  getAllAppointments(): Observable<{ count: number; data: Appointment[] }> {
    return this.http.get<{ count: number; data: Appointment[] }>(`${this.apiUrl}/all`);
  }

  getAnalytics(): Observable<Analytics> {
    return this.http.get<Analytics>(`${this.apiUrl}/analytics`);
  }

  getAppointmentDetails(id: string): Observable<{ status: string; data: any }> {
    return this.http.get<{ status: string; data: any }>(`${this.apiUrl}/${id}/details`);
  }

  acceptAppointment(id: string): Observable<{ status: string; message: string; data: Appointment }> {
    return this.http.post<{ status: string; message: string; data: Appointment }>(`${this.apiUrl}/${id}/accept`, {});
  }

  rejectAppointment(id: string, reason: string, suggestedSlots: string[]): Observable<{ status: string; message: string; data: Appointment }> {
    return this.http.post<{ status: string; message: string; data: Appointment }>(`${this.apiUrl}/${id}/reject`, { reason, suggestedSlots });
  }

  rescheduleAppointmentNew(id: string, appointmentDate: string, appointmentTime: string, reason?: string): Observable<{ status: string; message: string; data: Appointment }> {
    return this.http.post<{ status: string; message: string; data: Appointment }>(`${this.apiUrl}/${id}/reschedule`, { appointmentDate, appointmentTime, reason });
  }

  completeAppointment(id: string, notes: string, prescriptionNotes: string, reportUrl?: string): Observable<{ status: string; message: string; data: Appointment }> {
    return this.http.post<{ status: string; message: string; data: Appointment }>(`${this.apiUrl}/${id}/complete`, { notes, prescriptionNotes, reportUrl });
  }

  cancelAppointmentNew(id: string): Observable<{ status: string; message: string; data: Appointment }> {
    return this.http.post<{ status: string; message: string; data: Appointment }>(`${this.apiUrl}/${id}/cancel`, {});
  }

  suggestSlots(id: string, suggestedSlots: string[]): Observable<{ status: string; data: Appointment }> {
    return this.http.post<{ status: string; data: Appointment }>(`${this.apiUrl}/${id}/suggest-slots`, { suggestedSlots });
  }

  respondToRejection(id: string, action: 'accept' | 'reject', selectedSlot?: string): Observable<{ status: string; message: string; data: Appointment }> {
    return this.http.post<{ status: string; message: string; data: Appointment }>(`${this.apiUrl}/${id}/respond-reject`, { action, selectedSlot });
  }

  markEmergency(id: string): Observable<{ status: string; message: string; data: Appointment }> {
    return this.http.post<{ status: string; message: string; data: Appointment }>(`${this.apiUrl}/${id}/emergency`, {});
  }

  getMyNotifications(): Observable<{ count: number; data: AppNotification[] }> {
    return this.http.get<{ count: number; data: AppNotification[] }>(`${this.apiUrl}/notifications/my`);
  }

  markNotificationRead(id: string): Observable<{ message: string; data: AppNotification }> {
    return this.http.patch<{ message: string; data: AppNotification }>(`${this.apiUrl}/notifications/${id}/read`, {});
  }
}

export interface AppNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}
