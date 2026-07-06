import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppointmentService, AppNotification } from '../../../core/services/appointment.service';
import { ChatAssistantComponent } from '../chat-assistant/chat-assistant';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string | number;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ChatAssistantComponent],
  templateUrl: './shell.html',
})
export class ShellComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly toastService = inject(ToastService);
  private appointmentService = inject(AppointmentService);
  private router = inject(Router);

  sidebarOpen = signal(true);
  profileMenuOpen = signal(false);
  notifOpen = signal(false);
  isDarkMode = signal(false);

  readonly toasts = this.toastService.toasts;

  notifications = signal<AppNotification[]>([]);

  readonly unreadCount = computed(() => {
    return this.notifications().filter(n => !n.read).length;
  });

  readonly navItems = computed<NavItem[]>(() => {
    const role = this.authService.currentUser()?.role || 'patient';
    if (role === 'doctor') {
      return [
        { label: 'Doctor Dashboard', route: '/dashboard/doctor', icon: 'home' },
        { label: 'Profile', route: '/dashboard/profile', icon: 'user' },
      ];
    }
    if (role === 'admin') {
      return [
        { label: 'Admin Panel', route: '/dashboard/admin', icon: 'home' },
        { label: 'Profile', route: '/dashboard/profile', icon: 'user' },
      ];
    }
    // Default patient
    return [
      { label: 'Dashboard', route: '/dashboard/home', icon: 'home' },
      { label: 'Find Doctors', route: '/dashboard/find-doctors', icon: 'user' },
      { label: 'Appointments', route: '/dashboard/appointments', icon: 'calendar' },
      { label: 'Symptom Checker', route: '/dashboard/symptom-checker', icon: 'checker' },
      { label: 'Medicine Info', route: '/dashboard/medicines', icon: 'medicine' },
      { label: 'My Reports', route: '/dashboard/history', icon: 'history' },
      { label: 'Fitness & Wellness', route: '/dashboard/wellness', icon: 'wellness' },
      { label: 'AI Health Twin', route: '/dashboard/health-twin', icon: 'twin' },
      { label: 'Face Analyzer', route: '/dashboard/face-analyzer', icon: 'face-scan' },
      { label: 'Profile', route: '/dashboard/profile', icon: 'user' },
    ];
  });

  ngOnInit(): void {
    this.loadNotifications();
    
    // Initialize dark mode
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    } else {
      this.isDarkMode.set(false);
      document.documentElement.classList.remove('dark');
    }

    // Refresh notifications every 20 seconds
    setInterval(() => {
      if (this.authService.isAuthenticated()) {
        this.loadNotifications();
      }
    }, 20000);
  }

  loadNotifications(): void {
    if (!this.authService.isAuthenticated()) return;
    this.appointmentService.getMyNotifications().subscribe({
      next: (res) => {
        this.notifications.set(res.data);
      },
      error: (err) => console.error('[loadNotifications] error:', err)
    });
  }

  markAsRead(notif: AppNotification): void {
    this.appointmentService.markNotificationRead(notif._id).subscribe({
      next: () => {
        this.loadNotifications();
        if (notif.type === 'appointment') {
          this.router.navigate(['/dashboard/appointments']);
        }
      },
      error: (err) => console.error('[markAsRead] error:', err)
    });
  }

  markAllAsRead(): void {
    const unread = this.notifications().filter(n => !n.read);
    if (unread.length === 0) return;

    // Mark each as read
    unread.forEach(n => {
      this.appointmentService.markNotificationRead(n._id).subscribe({
        next: () => this.loadNotifications(),
        error: (err) => console.error('[markAllAsRead] error:', err)
      });
    });
  }

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  toggleProfile(): void { this.profileMenuOpen.update(v => !v); this.notifOpen.set(false); }
  toggleNotif(): void { this.notifOpen.update(v => !v); this.profileMenuOpen.set(false); }
  closeMenus(): void { this.profileMenuOpen.set(false); this.notifOpen.set(false); }

  toggleDarkMode(): void {
    this.isDarkMode.update(v => {
      const next = !v;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  }

  logout(): void {
    this.authService.logout();
  }

  get userInitials(): string {
    const u = this.authService.currentUser();
    if (!u) return '?';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }
}
