import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MedicineService, Medicine } from '../../../core/services/medicine.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-medicine-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './medicine-detail.html',
})
export class MedicineDetailComponent implements OnInit {
  private medicineService = inject(MedicineService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Multi-Language State
  currentLang = signal<'en' | 'hi' | 'hinglish'>((localStorage.getItem('medLang') as any) || 'en');

  readonly translations = {
    en: {
      back: 'Back to Directory',
      saveBookmark: 'Save to Bookmarks',
      savedBookmark: 'Saved to Bookmarks',
      description: 'Description',
      howItWorks: 'How It Works',
      uses: 'Common Uses / Indications',
      sideEffects: 'Common Side Effects',
      precautions: 'Usage Instructions & Precautions',
      safetyWarnings: 'Safety Warnings',
      specTitle: 'Product Specifications',
      specForms: 'Available Forms',
      specStrengths: 'Strengths',
      specExpiry: 'Expiry Period',
      specStorage: 'Storage Conditions',
      safetyInteractions: 'Safety & Interactions',
      pregnancy: 'Pregnancy',
      breastfeeding: 'Breastfeeding',
      driving: 'Driving',
      alcohol: 'Alcohol',
      food: 'Food Interactions',
      drug: 'Drug Interactions',
      similarTitle: 'Similar Medicines in',
      maker: 'Manufacturer',
      generic: 'Generic',
      disclaimerHeader: 'Medical Education Disclaimer',
      disclaimerBody: 'This information is provided strictly for educational and informational purposes and does not substitute for a consultation with a qualified medical professional. It does not contain all relevant details about active ingredients, and does not prescribe or endorse specific products, dosages, or treatments. Please consult a doctor immediately if you have any questions or concerns regarding your health or medical therapies.'
    },
    hi: {
      back: 'निर्देशिका पर वापस जाएं',
      saveBookmark: 'बुकमार्क में सहेजें',
      savedBookmark: 'बुकमार्क में सहेजा गया',
      description: 'विवरण',
      howItWorks: 'यह कैसे काम करता है',
      uses: 'सामान्य उपयोग / संकेत',
      sideEffects: 'आम दुष्प्रभाव',
      precautions: 'उपयोग निर्देश और सावधानियां',
      safetyWarnings: 'सुरक्षा चेतावनी',
      specTitle: 'उत्पाद विनिर्देश',
      specForms: 'उपलब्ध रूप',
      specStrengths: 'ताकत (Strengths)',
      specExpiry: 'समाप्ति अवधि',
      specStorage: 'भंडारण की स्थिति',
      safetyInteractions: 'सुरक्षा और बातचीत (Interactions)',
      pregnancy: 'गर्भावस्था',
      breastfeeding: 'स्तनपान',
      driving: 'गाड़ी चलाना',
      alcohol: 'शराब',
      food: 'भोजन का प्रभाव',
      drug: 'दवा का प्रभाव',
      similarTitle: 'समान दवाएं श्रेणी:',
      maker: 'निर्माता',
      generic: 'जेनेरिक नाम',
      disclaimerHeader: 'चिकित्सा शिक्षा अस्वीकरण',
      disclaimerBody: 'यह जानकारी केवल शैक्षिक और सूचनात्मक उद्देश्यों के लिए प्रदान की जाती है और यह किसी योग्य चिकित्सा पेशेवर के परामर्श का विकल्प नहीं है। इसमें सक्रिय अवयवों के बारे में सभी प्रासंगिक विवरण शामिल नहीं हैं, और यह विशिष्ट उत्पादों, खुराकों या उपचारों को निर्धारित या समर्थन नहीं करता है। यदि आपके स्वास्थ्य या चिकित्सा उपचार के संबंध में कोई प्रश्न या चिंता है, तो कृपया तुरंत डॉक्टर से परामर्श लें।'
    },
    hinglish: {
      back: 'Directory par wapas jayein',
      saveBookmark: 'Bookmarks me save karein',
      savedBookmark: 'Bookmarks me saved hai',
      description: 'Description / Vivran',
      howItWorks: 'Ye kaam kaise karta hai',
      uses: 'Common Uses / Fayde',
      sideEffects: 'Common Side Effects / Nuksan',
      precautions: 'Kaise use karein & Precautions',
      safetyWarnings: 'Safety Warnings / Chetawani',
      specTitle: 'Product Specifications',
      specForms: 'Available Forms',
      specStrengths: 'Strengths',
      specExpiry: 'Expiry Period',
      specStorage: 'Storage Conditions',
      safetyInteractions: 'Safety & Interactions',
      pregnancy: 'Pregnancy',
      breastfeeding: 'Breastfeeding',
      driving: 'Driving / Gadi chalana',
      alcohol: 'Alcohol / Sharab',
      food: 'Food Interactions',
      drug: 'Drug Interactions',
      similarTitle: 'Similar Medicines is category me:',
      maker: 'Manufacturer / Banane wala',
      generic: 'Generic Name',
      disclaimerHeader: 'Medical Education Disclaimer',
      disclaimerBody: 'Ye information sirf educational aur informational purpose ke liye hai aur isse doctor ki consultation ka substitute na samjhein. Isme sabhi active ingredients ki jankari nahi hai, aur ye kisi product ya dosage ko prescribe nahi karta. Apni health se judi kisi bhi dikkat ke liye turant doctor se contact karein.'
    }
  };

  t = computed(() => this.translations[this.currentLang()]);

  setLanguage(lang: 'en' | 'hi' | 'hinglish'): void {
    this.currentLang.set(lang);
    localStorage.setItem('medLang', lang);
  }

  medicine = signal<Medicine | null>(null);
  relatedMedicines = signal<Medicine[]>([]);
  isBookmarked = signal(false);
  isLoading = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadMedicineDetails(id);
      }
    });
  }

  loadMedicineDetails(id: string): void {
    this.isLoading.set(true);
    this.medicineService.getMedicineById(id).subscribe({
      next: (res) => {
        const med = res.data;
        this.medicine.set(med);
        this.checkBookmarkStatus(med._id);
        this.loadRelatedMedicines(med.category, med._id);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toastService.show('Failed to load medicine details.', 'error');
        this.isLoading.set(false);
        this.router.navigate(['/dashboard/medicines']);
      },
    });
  }

  checkBookmarkStatus(medicineId: string): void {
    this.medicineService.getBookmarkedMedicines().subscribe({
      next: (res) => {
        const bookmarked = res.data.some((m) => m._id === medicineId);
        this.isBookmarked.set(bookmarked);
      },
      error: (err) => console.error('[checkBookmarkStatus] error:', err),
    });
  }

  loadRelatedMedicines(category: string, currentId: string): void {
    this.medicineService.getMedicines({ category, limit: 5 }).subscribe({
      next: (res) => {
        const filtered = res.data.filter((m) => m._id !== currentId).slice(0, 4);
        this.relatedMedicines.set(filtered);
      },
      error: (err) => console.error('[loadRelatedMedicines] error:', err),
    });
  }

  toggleBookmark(): void {
    const med = this.medicine();
    if (!med) return;

    this.medicineService.toggleBookmark(med._id).subscribe({
      next: (res) => {
        this.isBookmarked.set(res.bookmarked);
        if (res.bookmarked) {
          this.toastService.show(`${med.brandName} added to bookmarks.`, 'success');
        } else {
          this.toastService.show(`${med.brandName} removed from bookmarks.`, 'success');
        }
      },
      error: (err) => {
        this.toastService.show('Failed to update bookmark.', 'error');
      },
    });
  }
}
