import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { PatientService, PatientFormRecord } from '../../../core/services/patient.service';
import { VideoCategory, YoutubeVideo } from '../../../core/services/ai.service';
import { MedicineService, Medicine } from '../../../core/services/medicine.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DoctorService, Doctor } from '../../../core/services/doctor.service';
import { BookingModalComponent } from '../booking-modal/booking-modal';

@Component({
  selector: 'app-history-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, BookingModalComponent],
  templateUrl: './history-detail.html',
})
export class HistoryDetailComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private patientService = inject(PatientService);
  private sanitizer      = inject(DomSanitizer);
  private medicineService = inject(MedicineService);
  private pdfService      = inject(PdfService);
  private doctorService  = inject(DoctorService);

  isLoading = signal(true);
  error     = signal('');
  form      = signal<PatientFormRecord | null>(null);
  allMedicines = signal<Medicine[]>([]);
  isDownloadingPdf = signal(false);

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
    const f = this.form();
    if (!f) return 'General Physician';

    const ai = f.aiAnalysis;
    const symptoms = f.symptoms || [];
    const notes = f.notes || '';
    const conditions = ai && ai.possibleConditions ? ai.possibleConditions : [];

    const allText = (
      symptoms.join(' ') + ' ' +
      notes + ' ' +
      conditions.map((c: any) => c.name).join(' ')
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

  loadMatchingDoctors(record: PatientFormRecord): void {
    const spec = this.recommendedSpecialist();
    this.isFetchingDoctors.set(true);
    this.doctorService.getDoctors({ specialization: spec, status: 'Active' }).subscribe({
      next: (docRes) => {
        this.matchingDoctors.set(docRes.data);
        this.doctorPage.set(1);
        this.isFetchingDoctors.set(false);
      },
      error: (err) => {
        console.error('[Doctor fetch in history-detail] error:', err);
        this.isFetchingDoctors.set(false);
      }
    });
  }

  downloadPdf(): void {
    const f = this.form();
    if (!f) return;

    this.isDownloadingPdf.set(true);
    this.pdfService.generateReportPdf(f).then(() => {
      this.isDownloadingPdf.set(false);
    }).catch((err) => {
      this.isDownloadingPdf.set(false);
      console.error('[HistoryDetail] PDF generation failed:', err);
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

  getVideos(aiAnalysis: any): YoutubeVideo[] {
    if (!aiAnalysis) return [];
    const list = aiAnalysis.recommendedVideos || aiAnalysis.videos || [];
    return list.filter((v: YoutubeVideo) => this.validateVideo(v));
  }

  getThumbnailUrl(video: YoutubeVideo): string {
    if (!video.thumbnail) return '';
    if (video.thumbnail.endsWith('/0.jpg')) {
      return video.thumbnail.replace('/0.jpg', '/hqdefault.jpg');
    }
    return video.thumbnail;
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=400&q=80';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.patientService.getFormById(id).subscribe({
      next: (res) => {
        this.form.set(res.data);
        this.isLoading.set(false);
        this.loadMatchingDoctors(res.data);
      },
      error: (err) => { this.error.set(err?.error?.message ?? 'Report not found.'); this.isLoading.set(false); },
    });

    this.medicineService.getMedicines({ limit: 100 }).subscribe({
      next: (res) => this.allMedicines.set(res.data),
      error: (err) => console.error('[HistoryDetail] failed to load medicines:', err),
    });
  }

  suggestedMedicineCategories = computed<string[]>(() => {
    const f = this.form();
    if (!f) return [];

    const ai = f.aiAnalysis;
    const categories = new Set<string>();
    const symptoms = f.symptoms || [];
    const notes = (f.notes || '').toLowerCase();
    const causes = ai && ai.possibleCauses ? ai.possibleCauses.map(c => c.name).join(' ').toLowerCase() : '';

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

  suggestedMedicines = computed<Medicine[]>(() => {
    const categories = this.suggestedMedicineCategories();
    const list = this.allMedicines();
    if (categories.length === 0 || list.length === 0) return [];
    return list.filter((m) => categories.includes(m.category)).slice(0, 4);
  });

  readonly severityLabels: Record<number, { text: string; color: string; bar: string }> = {
    1:  { text: 'Very mild',  color: 'text-green-600',  bar: 'bg-green-400'  },
    2:  { text: 'Very mild',  color: 'text-green-600',  bar: 'bg-green-400'  },
    3:  { text: 'Mild',       color: 'text-lime-600',   bar: 'bg-lime-400'   },
    4:  { text: 'Mild',       color: 'text-lime-600',   bar: 'bg-lime-400'   },
    5:  { text: 'Moderate',   color: 'text-yellow-600', bar: 'bg-yellow-400' },
    6:  { text: 'Moderate',   color: 'text-yellow-600', bar: 'bg-yellow-400' },
    7:  { text: 'Severe',     color: 'text-orange-600', bar: 'bg-orange-500' },
    8:  { text: 'Severe',     color: 'text-orange-600', bar: 'bg-orange-500' },
    9:  { text: 'Critical',   color: 'text-red-600',    bar: 'bg-red-500'    },
    10: { text: 'Emergency',  color: 'text-red-700',    bar: 'bg-red-600'    },
  };

  readonly statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending:  { label: 'Pending Review', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
    reviewed: { label: 'Reviewed',       bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
    resolved: { label: 'Resolved',       bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  };

  readonly urgencyConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    routine:   { label: 'Routine',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  icon: '🟢' },
    soon:      { label: 'See Soon',  color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '🟡' },
    urgent:    { label: 'Urgent',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🟠' },
    emergency: { label: 'Emergency', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: '🔴' },
  };

  likelihoodColor(l: string): string {
    return l === 'high'   ? 'bg-red-100 text-red-700' :
           l === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700';
  }

  readonly videoCategoryConfig: Record<VideoCategory, { label: string; icon: string; bg: string; text: string }> = {
    'understanding':      { label: 'Learn',            icon: '🎓', bg: 'bg-blue-50',   text: 'text-blue-700'   },
    'home-remedy':        { label: 'Home Remedy',      icon: '🏠', bg: 'bg-green-50',  text: 'text-green-700'  },
    'exercise':           { label: 'Exercise',         icon: '🏃', bg: 'bg-orange-50', text: 'text-orange-700' },
    'diet':               { label: 'Diet & Nutrition', icon: '🥗', bg: 'bg-lime-50',   text: 'text-lime-700'   },
    'when-to-see-doctor': { label: 'When to See Dr.',  icon: '👨‍⚕️', bg: 'bg-red-50',    text: 'text-red-700'    },
    'prevention':         { label: 'Prevention',       icon: '🛡️', bg: 'bg-purple-50', text: 'text-purple-700' },
  };

  readonly durationConfig: Record<string, { label: string }> = {
    'short (< 5 min)':   { label: '< 5 min'  },
    'medium (5-15 min)': { label: '5–15 min' },
    'long (> 15 min)':   { label: '> 15 min' },
  };

  youtubeSearchUrl(query: string): string {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  }
}
