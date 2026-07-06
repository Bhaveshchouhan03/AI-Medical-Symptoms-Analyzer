import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService, Appointment } from '../../../core/services/appointment.service';
import { FitnessService } from '../../../core/services/fitness.service';
import { HealthTwinService, HealthTwinProfile, SmartAlert } from '../../../core/services/health-twin.service';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit {
  readonly authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private fitnessService = inject(FitnessService);
  private healthTwinService = inject(HealthTwinService);
  private chatService = inject(ChatService);

  appointments = signal<Appointment[]>([]);
  isLoading = signal(true);
  
  twinProfile = signal<HealthTwinProfile | null>(null);
  alerts = signal<SmartAlert[]>([]);

  // Daily Health Journey Missions
  dailyMissions = signal([
    { id: 'water', label: 'Drink 3L Water', current: 0, target: 3000, unit: 'ml', completed: false },
    { id: 'steps', label: 'Walk 8000 Steps', current: 0, target: 8000, unit: 'steps', completed: false },
    { id: 'sleep', label: 'Sleep 8 Hours', current: 0, target: 8, unit: 'hrs', completed: false },
    { id: 'yoga', label: 'Yoga 20 Minutes', current: 0, target: 20, unit: 'mins', completed: false }
  ]);

  completionPercentage = computed(() => {
    const list = this.dailyMissions();
    const completedCount = list.filter(m => m.completed).length;
    return Math.round((completedCount / list.length) * 100);
  });

  upcomingAppointments = computed(() => {
    return this.appointments().filter((a) => a.status === 'Pending' || a.status === 'Accepted');
  });

  readonly stats = computed(() => {
    const upcomingCount = this.upcomingAppointments().length;
    return [
      { label: 'Appointments',  value: String(upcomingCount), sub: 'Upcoming',      color: 'blue',   icon: 'calendar' },
      { label: 'Prescriptions', value: '7',                   sub: 'Active',        color: 'teal',   icon: 'document' },
      { label: 'Messages',      value: '2',                   sub: 'Unread',        color: 'purple', icon: 'chat'     },
      { label: 'Lab Results',   value: '1',                   sub: 'Ready to view', color: 'orange', icon: 'flask'    },
    ];
  });

  ngOnInit(): void {
    this.loadAppointments();
    this.loadDailyMissions();
    this.loadHealthTwinData();
  }

  loadHealthTwinData(): void {
    if (this.authService.userRole() !== 'patient') return;

    this.healthTwinService.getProfile().subscribe({
      next: (res) => {
        this.twinProfile.set(res.data);
      },
      error: (err) => {
        console.error('[Dashboard Home] error fetching twin profile:', err);
      }
    });

    this.healthTwinService.getAlerts().subscribe({
      next: (res) => {
        // filter or load alerts directly
        this.alerts.set(res.data);
      },
      error: (err) => {
        console.error('[Dashboard Home] error fetching twin alerts:', err);
      }
    });
  }

  loadAppointments(): void {
    const role = this.authService.userRole();
    this.isLoading.set(true);

    const api$ = role === 'doctor'
      ? this.appointmentService.getDoctorAppointments()
      : this.appointmentService.getPatientAppointments();

    api$.subscribe({
      next: (res) => {
        this.appointments.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[Dashboard Home] error fetching appointments:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadDailyMissions(): void {
    if (this.authService.userRole() !== 'patient') return;

    this.fitnessService.getStats().subscribe({
      next: (res) => {
        const stats = res.data;
        if (!stats) return;

        // Auto-calculate live values from MongoDB tracker
        const waterLogged = stats.dailyActivity?.water || 0;
        const sleepLogged = stats.dailyActivity?.sleep || 0;
        const stepsLogged = Math.round((stats.runningDistance || 0) * 1250 + (stats.workoutMinutes || 0) * 100);
        const yogaMinutesLogged = (stats.yogaSessions || 0) * 20;

        // Fetch manual overrides from local storage
        const storageKey = `missions_${this.authService.currentUser()?.id}`;
        const storedToggles = localStorage.getItem(storageKey);
        const overrides = storedToggles ? JSON.parse(storedToggles) : {};

        this.dailyMissions.update(list => {
          return list.map(m => {
            let current = 0;
            let autoCompleted = false;

            if (m.id === 'water') {
              current = waterLogged;
              autoCompleted = waterLogged >= m.target;
            } else if (m.id === 'steps') {
              current = stepsLogged;
              autoCompleted = stepsLogged >= m.target;
            } else if (m.id === 'sleep') {
              current = sleepLogged;
              autoCompleted = sleepLogged >= m.target;
            } else if (m.id === 'yoga') {
              current = yogaMinutesLogged;
              autoCompleted = yogaMinutesLogged >= m.target;
            }

            // Check override vs auto completion state
            const completed = overrides[m.id] !== undefined ? overrides[m.id] : autoCompleted;

            return { ...m, current, completed };
          });
        });
      },
      error: (err) => {
        console.error('[Dashboard Home] error loading fitness stats:', err);
      }
    });
  }

  toggleMission(id: string): void {
    this.dailyMissions.update(list => {
      return list.map(m => {
        if (m.id === id) {
          const completed = !m.completed;
          
          // Save check override state
          const storageKey = `missions_${this.authService.currentUser()?.id}`;
          const stored = localStorage.getItem(storageKey);
          const overrides = stored ? JSON.parse(stored) : {};
          overrides[id] = completed;
          localStorage.setItem(storageKey, JSON.stringify(overrides));

          return { ...m, completed };
        }
        return m;
      });
    });
  }

  openChat(): void {
    this.chatService.chatOpen.set(true);
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
