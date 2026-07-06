import { Component, signal, computed, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientService } from '../../../core/services/patient.service';
import { AiService, AiAnalysis, VideoCategory, YoutubeVideo } from '../../../core/services/ai.service';
import { DoctorService, Doctor } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ToastService } from '../../../core/services/toast.service';
import { MedicineService, Medicine } from '../../../core/services/medicine.service';
import { PdfService } from '../../../core/services/pdf.service';

function atLeastOneSymptom(control: AbstractControl): ValidationErrors | null {
  const val: Record<string, boolean> = control.value ?? {};
  return Object.values(val).some((v) => v === true) ? null : { noSymptomSelected: true };
}

export interface SymptomGroup {
  category: string;
  items: string[];
}

import { BookingModalComponent } from '../booking-modal/booking-modal';

@Component({
  selector: 'app-symptom-checker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, BookingModalComponent],
  templateUrl: './symptom-checker.html',
})
export class SymptomCheckerComponent implements OnInit {
  private fb            = inject(FormBuilder);
  private patientService = inject(PatientService);
  private aiService      = inject(AiService);
  private doctorService  = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private toastService   = inject(ToastService);
  private sanitizer      = inject(DomSanitizer);
  private medicineService = inject(MedicineService);
  private pdfService      = inject(PdfService);

  isDownloadingPdf = signal(false);

  downloadPdf(): void {
    const analysis = this.aiAnalysis();
    if (!analysis) return;

    const recordPayload = {
      _id: this.savedFormId() || 'pending',
      age: this.form.get('age')?.value || 30,
      gender: this.form.get('gender')?.value || 'Male',
      symptoms: this.selectedSymptoms || [],
      duration: this.form.get('duration')?.value || '1 day',
      severity: this.form.get('severity')?.value || 5,
      notes: this.form.get('notes')?.value || '',
      createdAt: new Date().toISOString(),
      aiAnalysis: analysis
    };

    this.isDownloadingPdf.set(true);
    this.pdfService.generateReportPdf(recordPayload).then(() => {
      this.isDownloadingPdf.set(false);
    }).catch((err) => {
      this.isDownloadingPdf.set(false);
      console.error('[SymptomChecker] PDF generation failed:', err);
    });
  }

  activeVideoUrl = signal<SafeResourceUrl | null>(null);

  playVideo(videoId: string): void {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    this.activeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
  }

  closeVideo(): void {
    this.activeVideoUrl.set(null);
  }

  watchVideo(video: YoutubeVideo): void {
    if (video.videoId) {
      this.playVideo(video.videoId);
    } else {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(video.title)}`;
      window.open(url, '_blank');
    }
  }

  getThumbnailUrl(video: YoutubeVideo): string {
    if (!video.thumbnail) return '';
    // Rewrite old/broken 0.jpg references to hqdefault.jpg
    if (video.thumbnail.endsWith('/0.jpg')) {
      return video.thumbnail.replace('/0.jpg', '/hqdefault.jpg');
    }
    return video.thumbnail;
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=400&q=80';
  }

  step          = signal<'form' | 'review' | 'submitted'>('form');
  isSubmitting  = signal(false);
  isAnalyzing   = signal(false);
  submitError   = signal('');
  aiAnalysis    = signal<AiAnalysis | null>(null);
  savedFormId   = signal<string | null>(null);

  suggestedMedicineCategories = computed<string[]>(() => {
    const ai = this.aiAnalysis();
    if (!ai) return [];

    const categories = new Set<string>();
    const symptoms = this.selectedSymptoms || [];
    const notes = (this.form.get('notes')?.value || '').toLowerCase();
    const causes = (ai.possibleCauses || []).map(c => c.name).join(' ').toLowerCase();

    const allText = (symptoms.join(' ') + ' ' + notes + ' ' + causes).toLowerCase();

    if (allText.includes('pain') || allText.includes('headache') || allText.includes('backache') || allText.includes('ache') || allText.includes('injury') || allText.includes('sore') || allText.includes('sprain') || allText.includes('stiff')) {
      categories.add('Pain Relief');
    }
    if (allText.includes('fever') || allText.includes('temperature') || allText.includes('chill') || allText.includes('cold') || allText.includes('cough') || allText.includes('flu') || allText.includes('nose') || allText.includes('congestion')) {
      categories.add('Cold & Flu');
    }
    if (allText.includes('allergy') || allText.includes('rash') || allText.includes('skin') || allText.includes('itch') || allText.includes('pimple') || allText.includes('acne') || allText.includes('eczema')) {
      categories.add('Skin Care');
    }
    if (allText.includes('infection') || allText.includes('bacteria') || allText.includes('strep') || allText.includes('bronchitis') || allText.includes('pneumonia') || allText.includes('tonsil')) {
      categories.add('Antibiotics');
    }
    if (allText.includes('stomach') || allText.includes('acid') || allText.includes('vomit') || allText.includes('nausea') || allText.includes('digestion') || allText.includes('diarrhea') || allText.includes('constipation') || allText.includes('ulcer') || allText.includes('gerd')) {
      categories.add('Digestive Health');
    }
    if (allText.includes('heart') || allText.includes('cardio') || allText.includes('palpitations') || allText.includes('angina') || allText.includes('cholesterol')) {
      categories.add('Heart Medicines');
    }
    if (allText.includes('blood pressure') || allText.includes('hypertension') || allText.includes('bp') || allText.includes('low pressure')) {
      categories.add('Blood Pressure');
    }
    if (allText.includes('diabetes') || allText.includes('sugar') || allText.includes('insulin') || allText.includes('glucose') || allText.includes('pcos')) {
      categories.add('Diabetes');
    }
    if (allText.includes('asthma') || allText.includes('breath') || allText.includes('respiratory') || allText.includes('lung') || allText.includes('wheez')) {
      categories.add('Respiratory');
    }
    if (allText.includes('eye') || allText.includes('vision') || allText.includes('cataract') || allText.includes('sight') || allText.includes('blind') || allText.includes('dry eye') || allText.includes('tears')) {
      categories.add('Eye Care');
    }
    if (allText.includes('fatigue') || allText.includes('weakness') || allText.includes('vitamin') || allText.includes('deficiency') || allText.includes('nutrition') || allText.includes('tired')) {
      categories.add('Vitamins');
    }

    if (categories.size === 0) {
      categories.add('Pain Relief');
      categories.add('Cold & Flu');
    }

    return Array.from(categories);
  });

  allMedicines = signal<Medicine[]>([]);

  ngOnInit(): void {
    this.medicineService.getMedicines({ limit: 100 }).subscribe({
      next: (res) => this.allMedicines.set(res.data),
      error: (err) => console.error('[SymptomChecker] failed to load medicines:', err),
    });
  }

  suggestedMedicines = computed<Medicine[]>(() => {
    const categories = this.suggestedMedicineCategories();
    const list = this.allMedicines();
    if (categories.length === 0 || list.length === 0) return [];
    return list.filter((m) => categories.includes(m.category)).slice(0, 4);
  });

  // Doctor recommendations and booking states
  matchingDoctors   = signal<Doctor[]>([]);
  isFetchingDoctors = signal(false);
  showBookingModal  = signal(false);
  selectedDoctor    = signal<Doctor | null>(null);

  // Doctor pagination
  doctorPage = signal(1);
  doctorPageSize = 3;

  paginatedDoctors = computed(() => {
    const list = this.matchingDoctors();
    const page = this.doctorPage();
    const size = this.doctorPageSize;
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  doctorTotalPages = computed(() => {
    return Math.ceil(this.matchingDoctors().length / this.doctorPageSize);
  });

  setDoctorPage(page: number): void {
    if (page >= 1 && page <= this.doctorTotalPages()) {
      this.doctorPage.set(page);
    }
  }

  // ── Programmatic Specialist Matching ──
  recommendedSpecialist = computed<string>(() => {
    const ai = this.aiAnalysis();
    const symptoms = this.selectedSymptoms;
    const notes = this.form.get('notes')?.value || '';
    const conditions = ai?.possibleConditions || [];

    const allText = (
      symptoms.join(' ') + ' ' +
      notes + ' ' +
      conditions.map((c) => c.name).join(' ')
    ).toLowerCase();

    if (
      allText.includes('rash') ||
      allText.includes('skin') ||
      allText.includes('itching') ||
      allText.includes('dermatology') ||
      allText.includes('dermatologist')
    ) {
      return 'Dermatologist';
    }
    if (
      allText.includes('chest pain') ||
      allText.includes('heart') ||
      allText.includes('cardiologist') ||
      allText.includes('cardiology') ||
      allText.includes('palpitations')
    ) {
      return 'Cardiologist';
    }
    if (
      allText.includes('eye') ||
      allText.includes('vision') ||
      allText.includes('ophthalmologist') ||
      allText.includes('ophthalmology') ||
      allText.includes('blurred vision')
    ) {
      return 'Ophthalmologist';
    }
    if (
      allText.includes('joint') ||
      allText.includes('bone') ||
      allText.includes('fracture') ||
      allText.includes('orthopedic') ||
      allText.includes('arthritis') ||
      allText.includes('stiffness')
    ) {
      return 'Orthopedic';
    }
    if (
      allText.includes('mental') ||
      allText.includes('psychiatrist') ||
      allText.includes('depression') ||
      allText.includes('anxiety') ||
      allText.includes('psychiatry')
    ) {
      return 'Psychiatrist';
    }
    if (
      allText.includes('dental') ||
      allText.includes('tooth') ||
      allText.includes('teeth') ||
      allText.includes('dentist') ||
      allText.includes('mouth')
    ) {
      return 'Dentist';
    }
    if (
      allText.includes('headache') ||
      allText.includes('brain') ||
      allText.includes('neurologist') ||
      allText.includes('neurology') ||
      allText.includes('migraine') ||
      allText.includes('seizure')
    ) {
      return 'Neurologist';
    }
    if (
      allText.includes('ear') ||
      allText.includes('hearing') ||
      allText.includes('throat') ||
      allText.includes('thorat') ||
      allText.includes('ent') ||
      allText.includes('ear problems') ||
      allText.includes('nose')
    ) {
      return 'ENT Specialist';
    }

    return 'General Physician';
  });

  // ── Static options ──
  readonly genderOptions = [
    { value: 'male',   label: 'Male',   emoji: '👨' },
    { value: 'female', label: 'Female', emoji: '👩' },
    { value: 'other',  label: 'Other',  emoji: '🧑' },
  ];

  readonly durationOptions = [
    { value: 'Less than 24 hours', label: 'Less than 24 hours'          },
    { value: '1–3 days',           label: '1–3 days'                    },
    { value: '4–7 days',           label: '4–7 days (1 week)'           },
    { value: '1–2 weeks',          label: '1–2 weeks'                   },
    { value: '2–4 weeks',          label: '2–4 weeks'                   },
    { value: '1–3 months',         label: '1–3 months'                  },
    { value: 'More than 3 months', label: 'More than 3 months (chronic)'},
  ];

  // ── Symptom catalogue ──
  readonly symptomGroups: SymptomGroup[] = [
    { category: 'General',         items: ['Fever','Fatigue','Chills','Night sweats','Weight loss'] },
    { category: 'Head & Neuro',    items: ['Headache','Dizziness','Confusion','Blurred vision','Fainting'] },
    { category: 'Respiratory',     items: ['Cough','Shortness of breath','Sore throat','Runny nose','Wheezing'] },
    { category: 'Digestive',       items: ['Nausea','Vomiting','Diarrhea','Abdominal pain','Loss of appetite'] },
    { category: 'Musculoskeletal', items: ['Joint pain','Muscle aches','Back pain','Swelling','Stiffness'] },
    { category: 'Skin',            items: ['Rash','Itching','Bruising','Pale skin','Jaundice'] },
  ];

  readonly allSymptoms = this.symptomGroups.flatMap((g) => g.items);

  private buildSymptomControls(): Record<string, boolean> {
    return Object.fromEntries(this.allSymptoms.map((s) => [s, false]));
  }

  readonly form: FormGroup = this.fb.group({
    age:      [null, [Validators.required, Validators.min(0), Validators.max(120), Validators.pattern(/^\d+$/)]],
    gender:   ['', Validators.required],
    symptoms: this.fb.group(this.buildSymptomControls(), { validators: atLeastOneSymptom }),
    duration: ['', Validators.required],
    severity: [5,  [Validators.required, Validators.min(1), Validators.max(10)]],
    notes:    ['', Validators.maxLength(500)],
  });

  // ── Severity helpers ──
  readonly severityLabels: Record<number, { text: string; color: string; bg: string }> = {
    1:  { text: 'Very mild',  color: 'text-green-600',  bg: 'bg-green-100'  },
    2:  { text: 'Very mild',  color: 'text-green-600',  bg: 'bg-green-100'  },
    3:  { text: 'Mild',       color: 'text-lime-600',   bg: 'bg-lime-100'   },
    4:  { text: 'Mild',       color: 'text-lime-600',   bg: 'bg-lime-100'   },
    5:  { text: 'Moderate',   color: 'text-yellow-600', bg: 'bg-yellow-100' },
    6:  { text: 'Moderate',   color: 'text-yellow-600', bg: 'bg-yellow-100' },
    7:  { text: 'Severe',     color: 'text-orange-600', bg: 'bg-orange-100' },
    8:  { text: 'Severe',     color: 'text-orange-600', bg: 'bg-orange-100' },
    9:  { text: 'Critical',   color: 'text-red-600',    bg: 'bg-red-100'    },
    10: { text: 'Emergency',  color: 'text-red-700',    bg: 'bg-red-100'    },
  };

  readonly urgencyConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    routine:   { label: 'Routine',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: '🟢' },
    soon:      { label: 'See Soon',  color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200',icon: '🟡' },
    indigo:    { label: 'Urgent',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',icon: '🟠' },
    urgent:    { label: 'Urgent',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',icon: '🟠' },
    emergency: { label: 'Emergency', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: '🔴' },
  };

  get severityLabel() {
    return this.severityLabels[Number(this.form.get('severity')?.value)] ?? null;
  }

  get selectedSymptoms(): string[] {
    const val: Record<string, boolean> = this.form.get('symptoms')?.value ?? {};
    return Object.entries(val).filter(([, v]) => v).map(([k]) => k);
  }

  get notesLength(): number {
    return (this.form.get('notes')?.value ?? '').length;
  }

  symptomControl(name: string) { return this.form.get('symptoms')?.get(name); }
  isSymptomSelected(name: string): boolean { return !!this.symptomControl(name)?.value; }
  toggleSymptom(name: string): void {
    const ctrl = this.symptomControl(name);
    if (ctrl) ctrl.setValue(!ctrl.value);
  }

  // ── Steps ──
  onReview(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.step.set('review');
  }

  onBack(): void { this.step.set('form'); }

  onSubmit(): void {
    this.isSubmitting.set(true);
    this.submitError.set('');

    const payload = {
      age:      Number(this.form.get('age')?.value),
      gender:   this.form.get('gender')?.value,
      symptoms: this.selectedSymptoms,
      duration: this.form.get('duration')?.value,
      severity: Number(this.form.get('severity')?.value),
      notes:    this.form.get('notes')?.value ?? '',
    };

    // Step 1 — Save form to MongoDB
    this.patientService.submitSymptomForm(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.savedFormId.set(res.data._id);
        this.step.set('submitted');

        // Step 2 — Call Gemini AI analysis (non-blocking)
        this.isAnalyzing.set(true);
        this.aiService.analyze({ ...payload, formId: res.data._id }).subscribe({
          next: (aiRes) => {
            this.aiAnalysis.set(aiRes);
            this.isAnalyzing.set(false);

            // Fetch recommended staff
            const spec = this.recommendedSpecialist();
            this.isFetchingDoctors.set(true);
            this.doctorService.getDoctors({ specialization: spec, status: 'Active' }).subscribe({
              next: (docRes) => {
                this.matchingDoctors.set(docRes.data);
                this.doctorPage.set(1);
                this.isFetchingDoctors.set(false);
              },
              error: (err) => {
                console.error('[Doctor fetch] error:', err);
                this.isFetchingDoctors.set(false);
              },
            });
          },
          error: (err) => {
            console.error('[AI] analysis failed:', err?.error);
            this.isAnalyzing.set(false);
            // Don't block the success screen — AI error is non-fatal
          },
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('[Submit] error:', err?.error);
        this.submitError.set(err?.error?.message ?? 'Failed to submit. Please try again.');
      },
    });
  }

  onReset(): void {
    this.form.reset({ symptoms: this.buildSymptomControls(), severity: 5 });
    this.aiAnalysis.set(null);
    this.savedFormId.set(null);
    this.submitError.set('');
    this.matchingDoctors.set([]);
    this.doctorPage.set(1);
    this.showBookingModal.set(false);
    this.selectedDoctor.set(null);
    this.step.set('form');
  }

  validateVideo(video: YoutubeVideo): boolean {
    if (!video || !video.videoId) return false;
    const videoId = video.videoId;
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return false;
    const lowerId = videoId.toLowerCase();
    if (
      lowerId.includes('placeholder') ||
      lowerId.includes('test') ||
      lowerId.includes('fake') ||
      lowerId.includes('video') ||
      lowerId === 'abc123xyz'
    ) {
      return false;
    }
    return true;
  }

  get aiVideos(): YoutubeVideo[] {
    const ai = this.aiAnalysis();
    if (!ai) return [];
    const list = ai.recommendedVideos || ai.videos || [];
    return list.filter((v) => this.validateVideo(v));
  }

  likelihoodColor(l: string): string {
    return l === 'high'   ? 'bg-red-100 text-red-700' :
           l === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700';
  }

  // ── Video category display config ──
  readonly videoCategoryConfig: Record<VideoCategory, { label: string; icon: string; bg: string; text: string }> = {
    'understanding':      { label: 'Learn',            icon: '🎓', bg: 'bg-blue-50',   text: 'text-blue-700'   },
    'home-remedy':        { label: 'Home Remedy',      icon: '🏠', bg: 'bg-green-50',  text: 'text-green-700'  },
    'exercise':           { label: 'Exercise',         icon: '🏃', bg: 'bg-orange-50', text: 'text-orange-700' },
    'diet':               { label: 'Diet & Nutrition', icon: '🥗', bg: 'bg-lime-50',   text: 'text-lime-700'   },
    'when-to-see-doctor': { label: 'When to See Dr.',  icon: '👨‍⚕️', bg: 'bg-red-50',    text: 'text-red-700'    },
    'prevention':         { label: 'Prevention',       icon: '🛡️', bg: 'bg-purple-50', text: 'text-purple-700' },
  };

  readonly durationConfig: Record<string, { label: string; color: string }> = {
    'short (< 5 min)':   { label: '< 5 min',  color: 'text-green-600'  },
    'medium (5-15 min)': { label: '5–15 min', color: 'text-yellow-600' },
    'long (> 15 min)':   { label: '> 15 min', color: 'text-orange-600' },
  };

  youtubeSearchUrl(query: string): string {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  }

  get videoRecommendations(): YoutubeVideo[] {
    return this.aiVideos;
  }

  // ── Booking Actions ──
  openBookingModal(doc: Doctor): void {
    this.selectedDoctor.set(doc);
    this.showBookingModal.set(true);
  }

  closeBookingModal(): void {
    this.showBookingModal.set(false);
    this.selectedDoctor.set(null);
  }

}