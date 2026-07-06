import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PatientService, PatientFormRecord } from '../../../core/services/patient.service';

type FilterStatus = 'all' | 'pending' | 'reviewed' | 'resolved';
type SortOrder   = 'newest' | 'oldest' | 'severity-high' | 'severity-low';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './history.html',
})
export class HistoryComponent implements OnInit {
  private patientService = inject(PatientService);

  isLoading  = signal(true);
  error      = signal('');
  allForms   = signal<PatientFormRecord[]>([]);

  filterStatus = signal<FilterStatus>('all');
  sortOrder    = signal<SortOrder>('newest');
  searchQuery  = signal('');

  // Derived filtered + sorted list
  filteredForms = computed(() => {
    let list = this.allForms();

    // Status filter
    if (this.filterStatus() !== 'all') {
      list = list.filter(f => f.status === this.filterStatus());
    }

    // Search filter (symptoms, notes)
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(f =>
        f.symptoms.some(s => s.toLowerCase().includes(q)) ||
        f.notes?.toLowerCase().includes(q) ||
        f.duration.toLowerCase().includes(q)
      );
    }

    // Sort
    const order = this.sortOrder();
    list = [...list].sort((a, b) => {
      if (order === 'newest')        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (order === 'oldest')        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (order === 'severity-high') return b.severity - a.severity;
      if (order === 'severity-low')  return a.severity - b.severity;
      return 0;
    });

    return list;
  });

  // Stats
  stats = computed(() => {
    const forms = this.allForms();
    return {
      total:    forms.length,
      pending:  forms.filter(f => f.status === 'pending').length,
      reviewed: forms.filter(f => f.status === 'reviewed').length,
      resolved: forms.filter(f => f.status === 'resolved').length,
      withAi:   forms.filter(f => f.aiAnalysis !== null).length,
    };
  });

  ngOnInit(): void {
    this.loadForms();
  }

  loadForms(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.patientService.getMyForms().subscribe({
      next: (res) => {
        this.allForms.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load reports.');
        this.isLoading.set(false);
      },
    });
  }

  setFilter(f: FilterStatus): void { this.filterStatus.set(f); }
  setSort(s: SortOrder): void      { this.sortOrder.set(s); }
  onSearch(e: Event): void         { this.searchQuery.set((e.target as HTMLInputElement).value); }

  // ── Helpers ──
  readonly filterOptions: { label: string; value: FilterStatus }[] = [
    { label: 'All',      value: 'all'      },
    { label: 'Pending',  value: 'pending'  },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Resolved', value: 'resolved' },
  ];

  readonly sortOptions: { label: string; value: SortOrder }[] = [
    { label: 'Newest first',     value: 'newest'        },
    { label: 'Oldest first',     value: 'oldest'        },
    { label: 'Severity (high)',  value: 'severity-high' },
    { label: 'Severity (low)',   value: 'severity-low'  },
  ];

  readonly severityConfig: Record<number, { label: string; bar: string; text: string }> = {
    1:  { label: 'Very mild',  bar: 'bg-green-400',  text: 'text-green-700'  },
    2:  { label: 'Very mild',  bar: 'bg-green-400',  text: 'text-green-700'  },
    3:  { label: 'Mild',       bar: 'bg-lime-400',   text: 'text-lime-700'   },
    4:  { label: 'Mild',       bar: 'bg-lime-400',   text: 'text-lime-700'   },
    5:  { label: 'Moderate',   bar: 'bg-yellow-400', text: 'text-yellow-700' },
    6:  { label: 'Moderate',   bar: 'bg-yellow-400', text: 'text-yellow-700' },
    7:  { label: 'Severe',     bar: 'bg-orange-500', text: 'text-orange-700' },
    8:  { label: 'Severe',     bar: 'bg-orange-500', text: 'text-orange-700' },
    9:  { label: 'Critical',   bar: 'bg-red-500',    text: 'text-red-700'    },
    10: { label: 'Emergency',  bar: 'bg-red-600',    text: 'text-red-700'    },
  };

  readonly statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending:  { label: 'Pending',  bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
    reviewed: { label: 'Reviewed', bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
    resolved: { label: 'Resolved', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  };

  readonly urgencyConfig: Record<string, { label: string; color: string }> = {
    routine:   { label: '🟢 Routine',   color: 'text-green-700'  },
    soon:      { label: '🟡 See Soon',  color: 'text-yellow-700' },
    urgent:    { label: '🟠 Urgent',    color: 'text-orange-700' },
    emergency: { label: '🔴 Emergency', color: 'text-red-700'    },
  };

  severityWidth(s: number): string {
    return `${(s / 10) * 100}%`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  }
}
