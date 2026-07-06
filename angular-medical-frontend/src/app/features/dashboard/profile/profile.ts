import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
})
export class ProfileComponent {
  private fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  editing = signal(false);
  saved = signal(false);

  form = this.fb.group({
    firstName:   [this.authService.currentUser()?.firstName ?? '', [Validators.required, Validators.minLength(2)]],
    lastName:    [this.authService.currentUser()?.lastName  ?? '', [Validators.required, Validators.minLength(2)]],
    email:       [{ value: this.authService.currentUser()?.email ?? '', disabled: true }],
    role:        [{ value: this.authService.currentUser()?.role  ?? '', disabled: true }],
    phone:       ['', []],
    dateOfBirth: ['', []],
    address:     ['', []],
    bio:         ['', []],
  });

  get userInitials(): string {
    const u = this.authService.currentUser();
    if (!u) return '?';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  startEdit(): void {
    this.editing.set(true);
    this.saved.set(false);
  }

  cancelEdit(): void {
    this.editing.set(false);
    // Reset to current user values
    const u = this.authService.currentUser();
    this.form.patchValue({ firstName: u?.firstName ?? '', lastName: u?.lastName ?? '' });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // In a real app, call a PATCH /api/users/:id endpoint here
    this.editing.set(false);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 3000);
  }
}
