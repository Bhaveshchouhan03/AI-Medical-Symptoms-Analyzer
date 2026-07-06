import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DoctorService, Doctor } from '../../../core/services/doctor.service';
import { AppointmentService, Appointment, Analytics } from '../../../core/services/appointment.service';
import { HospitalService, Hospital } from '../../../core/services/hospital.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin.html',
})
export class AdminComponent implements OnInit {
  private fb = inject(FormBuilder);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private hospitalService = inject(HospitalService);
  private toastService = inject(ToastService);

  doctors = signal<Doctor[]>([]);
  appointments = signal<Appointment[]>([]);
  hospitals = signal<Hospital[]>([]);
  analytics = signal<Analytics | null>(null);

  activeTab = signal<'analytics' | 'doctors' | 'appointments' | 'hospitals'>('analytics');
  isLoading = signal(true);
  error = signal('');

  // Doctor Modal state
  showDoctorModal = signal(false);
  isEditing = signal(false);
  editingDoctorId = signal<string | null>(null);

  // Hospital Modal state
  showHospitalModal = signal(false);
  isEditingHospital = signal(false);
  editingHospitalId = signal<string | null>(null);

  doctorForm: FormGroup = this.fb.group({
    fullName: ['', Validators.required],
    specialization: ['General Physician', Validators.required],
    qualification: ['', Validators.required],
    experience: [null, [Validators.required, Validators.min(0)]],
    hospitalId: ['', Validators.required], // Links to Hospital collection
    hospitalName: [''], // Populated on select
    city: [''], // Populated on select
    languages: [['English'], Validators.required],
    consultationFee: [null, [Validators.required, Validators.min(0)]],
    profileImage: [''],
    about: [''],
    availableDays: [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], Validators.required],
    availableTimeSlots: [['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'], Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: [''],
  });

  hospitalForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    city: ['', Validators.required],
    address: [''],
  });

  specializationOptions = [
    'General Physician',
    'Dermatologist',
    'Neurologist',
    'Ophthalmologist',
    'Orthopedic',
    'Cardiologist',
    'Psychiatrist',
    'Dentist',
    'ENT Specialist',
  ];

  dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  slotOptions = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
  ];

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading.set(true);
    this.error.set('');

    this.appointmentService.getAnalytics().subscribe({
      next: (stats) => {
        this.analytics.set(stats);

        this.doctorService.getDoctors({ status: '' }).subscribe({
          next: (docRes) => {
            this.doctors.set(docRes.data);

            this.appointmentService.getAllAppointments().subscribe({
              next: (appRes) => {
                this.appointments.set(appRes.data);
                
                this.hospitalService.getHospitals().subscribe({
                  next: (hospRes) => {
                    this.hospitals.set(hospRes.data);
                    this.isLoading.set(false);
                  },
                  error: (err) => {
                    this.error.set(err?.error?.message ?? 'Failed to load clinics.');
                    this.isLoading.set(false);
                  }
                });
              },
              error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to load appointments.');
                this.isLoading.set(false);
              },
            });
          },
          error: (err) => {
            this.error.set(err?.error?.message ?? 'Failed to load doctors.');
            this.isLoading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load admin analytics.');
        this.isLoading.set(false);
      },
    });
  }

  // Doctor Form Handlers
  openAddModal(): void {
    this.isEditing.set(false);
    this.editingDoctorId.set(null);
    this.doctorForm.reset({
      specialization: 'General Physician',
      languages: ['English'],
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableTimeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'],
    });
    this.doctorForm.get('password')?.setValidators(Validators.required);
    this.doctorForm.get('password')?.updateValueAndValidity();
    this.showDoctorModal.set(true);
  }

  openEditModal(doc: Doctor): void {
    this.isEditing.set(true);
    this.editingDoctorId.set(doc._id);

    this.doctorForm.patchValue({
      fullName: doc.fullName,
      specialization: doc.specialization,
      qualification: doc.qualification,
      experience: doc.experience,
      hospitalId: doc.hospitalId || '',
      hospitalName: doc.hospitalName,
      city: doc.city,
      languages: doc.languages || ['English'],
      consultationFee: doc.consultationFee,
      profileImage: doc.profileImage,
      about: doc.about,
      availableDays: doc.availableDays,
      availableTimeSlots: doc.availableTimeSlots,
      email: doc.email,
      phone: doc.phone,
      password: '',
    });

    this.doctorForm.get('password')?.clearValidators();
    this.doctorForm.get('password')?.updateValueAndValidity();
    this.showDoctorModal.set(true);
  }

  onHospitalSelect(): void {
    const hospId = this.doctorForm.get('hospitalId')?.value;
    const selected = this.hospitals().find((h) => h._id === hospId);
    if (selected) {
      this.doctorForm.patchValue({
        hospitalName: selected.name,
        city: selected.city,
      });
    }
  }

  closeModal(): void {
    this.showDoctorModal.set(false);
  }

  toggleDay(day: string): void {
    const control = this.doctorForm.get('availableDays')!;
    const current: string[] = control.value || [];
    if (current.includes(day)) {
      control.setValue(current.filter((d) => d !== day));
    } else {
      control.setValue([...current, day]);
    }
  }

  isDaySelected(day: string): boolean {
    return (this.doctorForm.get('availableDays')?.value || []).includes(day);
  }

  toggleSlot(slot: string): void {
    const control = this.doctorForm.get('availableTimeSlots')!;
    const current: string[] = control.value || [];
    if (current.includes(slot)) {
      control.setValue(current.filter((s) => s !== slot));
    } else {
      control.setValue([...current, slot]);
    }
  }

  isSlotSelected(slot: string): boolean {
    return (this.doctorForm.get('availableTimeSlots')?.value || []).includes(slot);
  }

  saveDoctor(): void {
    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.doctorForm.value };
    if (this.isEditing()) {
      const id = this.editingDoctorId();
      if (!id) return;

      if (!payload.password) {
        delete payload.password;
      }

      this.doctorService.editDoctor(id, payload).subscribe({
        next: () => {
          this.toastService.success('Doctor details updated.');
          this.showDoctorModal.set(false);
          this.loadAllData();
        },
        error: (err) => {
          this.toastService.error(err?.error?.message ?? 'Failed to edit doctor.');
        },
      });
    } else {
      this.doctorService.addDoctor(payload).subscribe({
        next: () => {
          this.toastService.success('Doctor added to staff directory.');
          this.showDoctorModal.set(false);
          this.loadAllData();
        },
        error: (err) => {
          this.toastService.error(err?.error?.message ?? 'Failed to register doctor.');
        },
      });
    }
  }

  deleteDoctor(id: string): void {
    if (!confirm('Are you sure you want to delete this doctor? This cannot be undone.')) return;
    this.doctorService.deleteDoctor(id).subscribe({
      next: () => {
        this.toastService.success('Doctor profile deleted.');
        this.loadAllData();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Failed to delete profile.');
      },
    });
  }

  toggleDoctorStatus(doc: Doctor): void {
    const nextStatus = doc.status === 'Active' ? 'Inactive' : 'Active';
    this.doctorService.toggleStatus(doc._id, nextStatus).subscribe({
      next: () => {
        this.toastService.success(`Doctor set to ${nextStatus}.`);
        this.loadAllData();
      },
      error: (err) => {
        this.toastService.error(err?.error?.message ?? 'Failed to update status.');
      },
    });
  }

  // Hospital CRUD Handlers
  openAddHospital(): void {
    this.isEditingHospital.set(false);
    this.editingHospitalId.set(null);
    this.hospitalForm.reset();
    this.showHospitalModal.set(true);
  }

  openEditHospital(hosp: Hospital): void {
    this.isEditingHospital.set(true);
    this.editingHospitalId.set(hosp._id);
    this.hospitalForm.patchValue({
      name: hosp.name,
      city: hosp.city,
      address: hosp.address,
    });
    this.showHospitalModal.set(true);
  }

  saveHospital(): void {
    if (this.hospitalForm.invalid) {
      this.hospitalForm.markAllAsTouched();
      return;
    }

    const payload = this.hospitalForm.value;
    if (this.isEditingHospital()) {
      const id = this.editingHospitalId();
      if (!id) return;
      this.hospitalService.editHospital(id, payload).subscribe({
        next: () => {
          this.toastService.success('Hospital clinic updated successfully.');
          this.showHospitalModal.set(false);
          this.loadAllData();
        },
        error: (err) => this.toastService.error(err?.error?.message ?? 'Failed to update clinic.'),
      });
    } else {
      this.hospitalService.addHospital(payload).subscribe({
        next: () => {
          this.toastService.success('New hospital clinic branch added.');
          this.showHospitalModal.set(false);
          this.loadAllData();
        },
        error: (err) => this.toastService.error(err?.error?.message ?? 'Failed to add clinic.'),
      });
    }
  }

  deleteHospitalBtn(id: string): void {
    if (!confirm('Are you sure you want to delete this clinic branch?')) return;
    this.hospitalService.deleteHospital(id).subscribe({
      next: () => {
        this.toastService.success('Hospital clinic deleted successfully.');
        this.loadAllData();
      },
      error: (err) => this.toastService.error(err?.error?.message ?? 'Failed to delete clinic.'),
    });
  }

  getStatusClass(status: string): string {
    return status === 'Pending'   ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
           status === 'Accepted'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
           status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-red-50 text-red-700 border-red-200';
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
