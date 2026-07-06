import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorService } from '../../../core/services/doctor.service';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private doctorService = inject(DoctorService);
  private router = inject(Router);

  readonly isLoading = this.authService.isLoading;
  showPassword = signal(false);
  showConfirm = signal(false);
  errorMessage = signal('');

  readonly features = [
    { label: 'Secure access to your medical records' },
    { label: 'Book and manage appointments online' },
    { label: 'Connect with licensed doctors anytime' },
    { label: 'Your data is encrypted and private' },
  ];

  form = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['patient', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      // Doctor fields
      specialization: ['General Physician'],
      qualification: [''],
      experience: [5],
      hospitalName: [''],
      city: [''],
      consultationFee: [100],
      phone: ['']
    },
    { validators: passwordMatchValidator }
  );

  get firstName() { return this.form.get('firstName')!; }
  get lastName()  { return this.form.get('lastName')!; }
  get email()     { return this.form.get('email')!; }
  get role()      { return this.form.get('role')!; }
  get password()  { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  togglePassword(): void  { this.showPassword.update((v) => !v); }
  toggleConfirm(): void   { this.showConfirm.update((v) => !v); }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      role,
      specialization,
      qualification,
      experience,
      hospitalName,
      city,
      consultationFee,
      phone
    } = this.form.value;

    if (role === 'doctor') {
      this.doctorService.registerDoctor({
        fullName: `${firstName} ${lastName}`,
        email: email!,
        password: password!,
        specialization: specialization || 'General Physician',
        qualification: qualification || 'M.B.B.S.',
        experience: Number(experience) || 5,
        hospitalName: hospitalName || 'Metro General Hospital',
        city: city || 'New York',
        consultationFee: Number(consultationFee) || 100,
        phone: phone || '+1 555-0100',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availableTimeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'],
        languages: ['English'],
        status: 'Active',
        gender: 'male',
        age: 38,
        medicalDegree: 'M.B.B.S.',
        registrationNumber: 'REG-' + Math.floor(100000 + Math.random() * 900000),
        clinicName: hospitalName || 'Metro Clinic',
        onlineConsultation: true,
        offlineConsultation: true,
        clinicAddress: '120 Broadway, Manhattan, NY',
        state: 'NY',
        country: 'US',
        googleMapsLocation: 'Latitude: 40.7081° N, Longitude: -74.0094° W',
        achievements: ['Outstanding Care Award'],
        certificates: ['Board Certified'],
        maxPatientsPerDay: 30,
        emergencyAvailability: false,
        verificationStatus: 'Verified',
        reviewsCount: 0,
        rating: 5.0
      }).subscribe({
        next: (res) => {
          this.authService.setSession({
            message: res.message || 'Success',
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            user: res.user
          });
          this.router.navigate(['/dashboard/doctor']);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'Doctor registration failed.');
        }
      });
      return;
    }

    this.authService
      .signup({
        firstName: firstName!,
        lastName: lastName!,
        email: email!,
        password: password!,
        role: role as 'patient' | 'doctor',
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message ?? 'Registration failed. Please try again.'
          );
        },
      });
  }
}
