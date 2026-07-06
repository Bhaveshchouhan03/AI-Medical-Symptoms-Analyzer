import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MedicineService, Medicine, MedicineStats } from '../../../core/services/medicine.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './medicines.html',
})
export class MedicinesComponent implements OnInit {
  private medicineService = inject(MedicineService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Multi-Language State
  currentLang = signal<'en' | 'hi' | 'hinglish'>((localStorage.getItem('medLang') as any) || 'en');

  readonly translations = {
    en: {
      title: 'Medicine Information Directory',
      subtitle: 'Access trusted educational information about common medicines, including uses, side effects, and precautions.',
      disclaimerHeader: 'Educational Disclaimer',
      disclaimerBody: 'This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Never start, stop, or change any medicine without consulting a qualified healthcare professional.',
      totalMedicines: 'Total Medicines',
      categories: 'Categories',
      popularSearched: 'Popular Searches',
      categoriesTitle: 'Drug Categories',
      allCategories: 'All Categories',
      savedMedicines: 'Saved Medicines',
      savedSub: 'Toggle bookmarked list',
      recentlyViewed: 'Recently Viewed',
      searchLabel: 'Search Medicine',
      searchPlaceholder: 'Search by brand name, generic name, symptoms, or disease...',
      noMedicines: 'No Medicines Found',
      noMedicinesSub: 'No educational information was found matching your current filter criteria.',
      viewDetails: 'View Details',
      specForms: 'Forms',
      clearFilters: 'Clear Filters'
    },
    hi: {
      title: 'दवा सूचना निर्देशिका',
      subtitle: 'आम दवाओं के बारे में विश्वसनीय शैक्षिक जानकारी प्राप्त करें, जिसमें उपयोग, दुष्प्रभाव और सावधानियां शामिल हैं।',
      disclaimerHeader: 'शैक्षिक अस्वीकरण',
      disclaimerBody: 'यह जानकारी केवल शैक्षिक उद्देश्यों के लिए है और पेशेवर चिकित्सा सलाह, निदान या उपचार का विकल्प नहीं है। किसी योग्य स्वास्थ्य देखभाल पेशेवर से परामर्श किए बिना कभी भी कोई दवा शुरू, बंद या न बदलें।',
      totalMedicines: 'कुल दवाएं',
      categories: 'श्रेणियाँ',
      popularSearched: 'लोकप्रिय खोजें',
      categoriesTitle: 'दवा श्रेणियाँ',
      allCategories: 'सभी श्रेणियाँ',
      savedMedicines: 'सहेजी गई दवाएं',
      savedSub: 'बुकमार्क सूची टॉगल करें',
      recentlyViewed: 'हाल ही में देखी गई',
      searchLabel: 'दवा खोजें',
      searchPlaceholder: 'ब्रांड नाम, जेनेरिक नाम, लक्षण या बीमारी से खोजें...',
      noMedicines: 'कोई दवा नहीं मिली',
      noMedicinesSub: 'आपके फ़िल्टर के अनुसार कोई शैक्षणिक जानकारी नहीं मिली।',
      viewDetails: 'विवरण देखें',
      specForms: 'रूपों',
      clearFilters: 'फ़िल्टर साफ करें'
    },
    hinglish: {
      title: 'Medicine Information Directory',
      subtitle: 'Common medicines ke baare me trusted educational information payein, jaise uses, side effects aur precautions.',
      disclaimerHeader: 'Educational Disclaimer',
      disclaimerBody: 'Ye information sirf educational purposes ke liye hai aur professional medical advice, diagnosis, ya treatment ka substitute nahi hai. Bina doctor se salah liye koi bhi medicine start, stop ya change na karein.',
      totalMedicines: 'Total Medicines',
      categories: 'Categories',
      popularSearched: 'Popular Searches',
      categoriesTitle: 'Drug Categories',
      allCategories: 'All Categories',
      savedMedicines: 'Saved Medicines',
      savedSub: 'Bookmarked list toggle karein',
      recentlyViewed: 'Recently Viewed',
      searchLabel: 'Medicine Search Karein',
      searchPlaceholder: 'Brand name, generic name, symptoms, ya bimari se search karein...',
      noMedicines: 'Koi Medicine Nahi Mili',
      noMedicinesSub: 'Aapke filter ke hisab se koi educational information nahi mili.',
      viewDetails: 'Details Dekhein',
      specForms: 'Forms',
      clearFilters: 'Filters Clear Karein'
    }
  };

  t = computed(() => this.translations[this.currentLang()]);

  setLanguage(lang: 'en' | 'hi' | 'hinglish'): void {
    this.currentLang.set(lang);
    localStorage.setItem('medLang', lang);
  }

  // Lists and Data
  medicines = signal<Medicine[]>([]);
  stats = signal<MedicineStats | null>(null);
  bookmarkedIds = signal<Set<string>>(new Set());

  // Search & Filter State
  searchQuery = signal('');
  selectedCategory = signal('');
  showOnlyBookmarks = signal(false);

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  totalCount = signal(0);
  limit = 6;

  // UI State
  isLoading = signal(false);
  isStatsLoading = signal(false);

  readonly categories = [
    'Pain Relief',
    'Antibiotics',
    'Vitamins',
    'Diabetes',
    'Blood Pressure',
    'Cold & Flu',
    'Skin Care',
    'Digestive Health',
    'Heart Medicines',
    'Respiratory',
    'Eye Care'
  ];

  readonly searchSuggestions = ['Paracetamol', 'Dolo 650', 'Ibuprofen', 'Amoxicillin', 'Vitamin C'];

  ngOnInit(): void {
    this.loadStats();
    this.loadBookmarks();

    // Listen to query params for incoming category selections from AI symptom checker
    this.route.queryParams.subscribe((params) => {
      const cat = params['category'];
      if (cat && this.categories.includes(cat)) {
        this.selectedCategory.set(cat);
      } else {
        this.selectedCategory.set('');
      }
      this.currentPage.set(1);
      this.loadMedicines();
    });
  }

  loadStats(): void {
    this.isStatsLoading.set(true);
    this.medicineService.getStats().subscribe({
      next: (res) => {
        this.stats.set(res.data);
        this.isStatsLoading.set(false);
      },
      error: (err) => {
        console.error('[loadStats] error:', err);
        this.isStatsLoading.set(false);
      },
    });
  }

  loadBookmarks(): void {
    this.medicineService.getBookmarkedMedicines().subscribe({
      next: (res) => {
        const ids = new Set(res.data.map((m) => m._id));
        this.bookmarkedIds.set(ids);
      },
      error: (err) => console.error('[loadBookmarks] error:', err),
    });
  }

  loadMedicines(): void {
    this.isLoading.set(true);

    if (this.showOnlyBookmarks()) {
      this.medicineService.getBookmarkedMedicines().subscribe({
        next: (res) => {
          let filtered = res.data;
          if (this.selectedCategory()) {
            filtered = filtered.filter((m) => m.category === this.selectedCategory());
          }
          if (this.searchQuery().trim()) {
            const query = this.searchQuery().toLowerCase().trim();
            filtered = filtered.filter(
              (m) =>
                m.medicineName.toLowerCase().includes(query) ||
                m.brandName.toLowerCase().includes(query) ||
                m.genericName.toLowerCase().includes(query)
            );
          }

          this.totalCount.set(filtered.length);
          this.totalPages.set(Math.ceil(filtered.length / this.limit));
          
          const start = (this.currentPage() - 1) * this.limit;
          this.medicines.set(filtered.slice(start, start + this.limit));
          this.isLoading.set(false);
        },
        error: (err) => {
          this.toastService.show('Failed to fetch bookmarks.', 'error');
          this.isLoading.set(false);
        },
      });
      return;
    }

    const params = {
      search: this.searchQuery().trim() || undefined,
      category: this.selectedCategory() || undefined,
      page: this.currentPage(),
      limit: this.limit,
    };

    this.medicineService.getMedicines(params).subscribe({
      next: (res) => {
        this.medicines.set(res.data);
        this.totalCount.set(res.count);
        this.totalPages.set(res.totalPages);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toastService.show('Failed to load medicines list.', 'error');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.loadMedicines();
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
    
    // Update route query parameters cleanly
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category || null },
      queryParamsHandling: 'merge',
    });
  }

  toggleBookmark(event: Event, medicine: Medicine): void {
    event.stopPropagation();
    event.preventDefault();

    this.medicineService.toggleBookmark(medicine._id).subscribe({
      next: (res) => {
        const current = new Set(this.bookmarkedIds());
        if (res.bookmarked) {
          current.add(medicine._id);
          this.toastService.show(`${medicine.brandName} added to bookmarks.`, 'success');
        } else {
          current.delete(medicine._id);
          this.toastService.show(`${medicine.brandName} removed from bookmarks.`, 'success');
        }
        this.bookmarkedIds.set(current);
        
        // If we are currently viewing bookmarks list, reload list
        if (this.showOnlyBookmarks()) {
          this.loadMedicines();
        }
        this.loadStats(); // Update dashboard stats
      },
      error: (err) => {
        this.toastService.show('Failed to update bookmark.', 'error');
      },
    });
  }

  toggleBookmarksFilter(): void {
    this.showOnlyBookmarks.set(!this.showOnlyBookmarks());
    this.currentPage.set(1);
    this.loadMedicines();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadMedicines();
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.loadMedicines();
  }
}
