import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Branddeur } from '../../../models/branddeur';
import { BranddeurInspectie, CheckListItemResult } from '../../../models/branddeur-inspectie';
import { InspectieChecklistItem } from '../../../models/inspectie-checklist-item';
import { BranddeurenService } from '../../../services/branddeuren.service';

interface ChecklistResultViewModel {
  label: string;
  value: string;
}

@Component({
  selector: 'app-inspection-detail',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspection-detail.html',
  styleUrl: './inspection-detail.scss'
})
export class InspectionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly branddeurenService = inject(BranddeurenService);

  protected readonly inspection = signal<BranddeurInspectie | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly checklistResults = signal<ChecklistResultViewModel[]>([]);
  protected readonly repairsNeededFor = computed(() => {
    const inspection = this.inspection();
    if (!inspection) {
      return [] as string[];
    }

    if (inspection.repairsNeededFor?.length) {
      return inspection.repairsNeededFor;
    }

    return [
      ...(inspection.foundProblems ?? []),
      ...(inspection.suggestedActions ?? [])
    ];
  });

  protected readonly doorName = computed(() => {
    const inspection = this.inspection();
    if (!inspection) {
      return 'Onbekend';
    }

    const branddeur = this.resolveBranddeurFromInspection(inspection);
    if (branddeur?.name?.trim()) {
      return branddeur.name;
    }

    return typeof inspection.branddeurId === 'string' ? inspection.branddeurId : 'Onbekend';
  });

  protected readonly buildingLabel = computed(() => {
    const inspection = this.inspection();
    if (!inspection) {
      return 'Onbekend';
    }

    const branddeur = this.resolveBranddeurFromInspection(inspection);
    return branddeur?.building?.trim() || 'Onbekend';
  });

  protected readonly floorLabel = computed(() => {
    const inspection = this.inspection();
    if (!inspection) {
      return 'Onbekend';
    }

    const branddeur = this.resolveBranddeurFromInspection(inspection);
    return branddeur?.floor?.trim() || 'Onbekend';
  });

  protected readonly locationLabel = computed(() => {
    const inspection = this.inspection();
    if (!inspection) {
      return 'Onbekend';
    }

    const branddeur = this.resolveBranddeurFromInspection(inspection);
    return branddeur?.location?.trim() || 'Onbekend';
  });

  public constructor() {
    void this.loadInspection();
  }

  protected formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return '-';
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  protected statusClass(statusCode: string | undefined): string {
    if (statusCode === 'A') {
      return 'status-approved';
    }

    if (statusCode === 'B' || statusCode === 'C') {
      return 'status-error';
    }

    return 'status-unknown';
  }

  private async loadInspection(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    const inspectionId = this.route.snapshot.paramMap.get('id');
    if (!inspectionId) {
      this.error.set('Geen inspectie-id gevonden.');
      this.isLoading.set(false);
      return;
    }

    try {
      const [inspection, checklistItems] = await Promise.all([
        firstValueFrom(this.branddeurenService.getBranddeurInspectieById(inspectionId)),
        firstValueFrom(this.branddeurenService.getInspectieChecklistItems())
      ]);

      const checklistLookup = new Map((checklistItems ?? []).map(item => [item._id, item]));
      this.inspection.set(inspection);
      this.checklistResults.set(
        (inspection.checkListItems ?? []).map(item => ({
          label: this.getChecklistItemLabel(item, checklistLookup),
          value: this.normalizeChecklistValue(item.value) ? 'Ja' : 'Nee'
        }))
      );
    } catch (error) {
      console.error('Inspection detail load failed', error);
      this.error.set('Inspectiedetails laden is mislukt.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private resolveBranddeurFromInspection(inspection: BranddeurInspectie): Partial<Branddeur> | null {
    if (!inspection.branddeurId || typeof inspection.branddeurId === 'string') {
      return null;
    }

    return inspection.branddeurId as unknown as Partial<Branddeur>;
  }

  private getChecklistItemLabel(
    item: CheckListItemResult,
    checklistLookup: Map<string, InspectieChecklistItem>
  ): string {
    if (typeof item.itemId !== 'string') {
      return item.itemId.displayValue || item.itemId._id;
    }

    const checklistItem = checklistLookup.get(item.itemId);
    if (checklistItem) {
      return checklistItem.displayValue || checklistItem._id;
    }

    return item.itemId;
  }

  private normalizeChecklistValue(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'ja' || normalized === 'yes';
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return Boolean(value);
  }
}
