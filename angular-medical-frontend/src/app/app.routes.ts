import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./features/auth/signup/signup').then((m) => m.SignupComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/shell/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/dashboard/home/home').then((m) => m.HomeComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/dashboard/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/dashboard/history/history').then((m) => m.HistoryComponent),
      },
      {
        path: 'history/:id',
        loadComponent: () =>
          import('./features/dashboard/history/history-detail').then((m) => m.HistoryDetailComponent),
      },
      {
        path: 'symptom-checker',
        loadComponent: () =>
          import('./features/dashboard/symptom-checker/symptom-checker').then(
            (m) => m.SymptomCheckerComponent
          ),
      },
      // Placeholder routes — add real components later
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/dashboard/appointments/appointments').then(
            (m) => m.AppointmentsComponent
          ),
      },
      {
        path: 'doctor',
        loadComponent: () =>
          import('./features/dashboard/doctor/doctor').then(
            (m) => m.DoctorComponent
          ),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./features/dashboard/admin/admin').then(
            (m) => m.AdminComponent
          ),
      },
      {
        path: 'find-doctors',
        loadComponent: () =>
          import('./features/dashboard/find-doctors/find-doctors').then(
            (m) => m.FindDoctorsComponent
          ),
      },
      {
        path: 'doctor-profile/:id',
        loadComponent: () =>
          import('./features/dashboard/doctor-profile/doctor-profile').then(
            (m) => m.DoctorProfileComponent
          ),
      },
      {
        path: 'medicines',
        loadComponent: () =>
          import('./features/dashboard/medicines/medicines').then(
            (m) => m.MedicinesComponent
          ),
      },
      {
        path: 'medicines/:id',
        loadComponent: () =>
          import('./features/dashboard/medicines/medicine-detail').then(
            (m) => m.MedicineDetailComponent
          ),
      },
      {
        path: 'wellness',
        loadComponent: () =>
          import('./features/dashboard/wellness/wellness').then(
            (m) => m.WellnessComponent
          ),
      },
      {
        path: 'health-twin',
        loadComponent: () =>
          import('./features/dashboard/health-twin/health-twin').then(
            (m) => m.HealthTwinComponent
          ),
      },
      {
        path: 'face-analyzer',
        loadComponent: () =>
          import('./features/dashboard/face-analyzer/face-analyzer').then(
            (m) => m.FaceAnalyzerComponent
          ),
      },
      {
        path: 'doctor/:id',
        loadComponent: () =>
          import('./features/dashboard/doctor-profile/doctor-profile').then(
            (m) => m.DoctorProfileComponent
          ),
      },
      {
        path: 'prescriptions',
        loadComponent: () =>
          import('./features/dashboard/home/home').then((m) => m.HomeComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/dashboard/home/home').then((m) => m.HomeComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
