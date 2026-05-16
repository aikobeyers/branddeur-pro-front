import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, Injector, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BranddeurenService } from '../../../services/branddeuren.service';
import { Branddeur } from '../../../models/branddeur';
import { CreateBranddeurInspectieRequest, InspectionStatusCode, InspectionStatusValue } from '../../../models/branddeur-inspectie';
import { InspectieChecklistCategory, InspectieChecklistItem } from '../../../models/inspectie-checklist-item';
import { environment } from '../../../../environments/environment';

interface ChecklistItemsGroup {
  categoryKey: string;
  categoryLabel: string;
  items: InspectieChecklistItem[];
}

const INSPECTION_STATUS_VALUES: Record<InspectionStatusCode, InspectionStatusValue> = {
  A: 'Goedgekeurd',
  B: 'Afgekeurd',
};

@Component({
  selector: 'app-new-inspection',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-inspection.html',
  styleUrl: './new-inspection.scss'
})
export class NewInspectionComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly branddeurenService = inject(BranddeurenService);

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal(false);
  protected readonly selectedInspectionResult = signal<InspectionStatusCode>('A');

  protected readonly branddeurenResource = httpResource<Branddeur[]>(() => ({
    url: `${environment.baseUrl}/branddeuren`,
    method: 'GET'
  }));

  protected readonly checklistItems = signal<InspectieChecklistItem[]>([]);
  protected readonly repairsNeededFor = signal<string[]>([]);
  protected readonly groupedChecklistItems = computed<ChecklistItemsGroup[]>(() => {
    const groups = new Map<string, ChecklistItemsGroup>();

    for (const item of this.checklistItems()) {
      const categoryKey = this.getCategoryKey(item.category);
      const categoryLabel = this.getCategoryLabel(item.category);
      const existingGroup = groups.get(categoryKey);

      if (existingGroup) {
        existingGroup.items.push(item);
        continue;
      }

      groups.set(categoryKey, {
        categoryKey,
        categoryLabel,
        items: [item],
      });
    }

    return Array.from(groups.values());
  });
  protected readonly showsCorrectiveActionSections = computed(
    () => this.selectedInspectionResult() === 'B'
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    branddeurId: ['', [Validators.required]],
    inspectorName: ['', [Validators.required]],
    supervisor: [''],
    inspectionDate: [new Date().toISOString().split('T')[0], [Validators.required]],
    inspectionType: ['Routine Inspectie'],
    nextInspection: ['', [Validators.required]],
    checklistItems: this.formBuilder.group({}, { nonNullable: true }),
    generalCondition: ['Goed'],
    inspectionResult: ['A' as InspectionStatusCode],
    repairsNeededFor: [[] as string[]]
  });

  public constructor() {
    this.selectedInspectionResult.set(this.form.controls.inspectionResult.getRawValue());

    // Set resolved checklist items from route
    this.checklistItems.set(this.activatedRoute.snapshot.data['checklistItems'] || []);

    // Dynamically add checklist item controls when data loads
    effect(() => {
      const items = this.checklistItems();
      if (items && items.length > 0) {
        const checklistGroup = this.form.get('checklistItems');
        if (checklistGroup && checklistGroup instanceof FormGroup) {
          items.forEach(item => {
            if (!checklistGroup.get(item._id)) {
              checklistGroup.addControl(item._id, this.formBuilder.control(false));
            }
          });
        }
      }
    }, { injector: this.injector });

    this.form.controls.branddeurId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((branddeurId) => {
        const defaultInspectionDate = this.getDefaultInspectionDate(branddeurId);
        if (defaultInspectionDate) {
          this.form.controls.inspectionDate.setValue(defaultInspectionDate);
        }
      });

    this.form.controls.inspectionResult.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((inspectionResult) => {
        this.selectedInspectionResult.set(inspectionResult);

        if (inspectionResult !== 'B') {
          this.repairsNeededFor.set([]);
        }
      });
  }

  protected getChecklistControl(itemId: string) {
    const control = this.form.get('checklistItems')?.get(itemId);
    return control as any;
  }

  protected addRepairItem(problemText: string): void {
    const trimmedText = problemText.trim();
    if (trimmedText.length > 0) {
      this.repairsNeededFor.update(items => [...items, trimmedText]);
    }
  }

  protected removeRepairItem(index: number): void {
    this.repairsNeededFor.update(items => items.filter((_, i) => i !== index));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const inspectionDate = this.normalizeDateOptional(rawValue.inspectionDate);
    const nextInspection = this.normalizeDateOptional(rawValue.nextInspection);
    const supervisor = this.normalizeOptional(rawValue.supervisor);
    const payload: CreateBranddeurInspectieRequest = {
      branddeurId: rawValue.branddeurId,
      checklistItems: rawValue.checklistItems,
      repairsNeededFor: this.repairsNeededFor(),
      generalCondition: this.normalizeOptional(rawValue.generalCondition),
      inspectionResult: {
        statusCode: rawValue.inspectionResult,
        statusValue: INSPECTION_STATUS_VALUES[rawValue.inspectionResult],
      },
      inspectionType: this.normalizeOptional(rawValue.inspectionType),
      inspectorName: this.normalizeOptional(rawValue.inspectorName),
      supervisor,
      inspectionDate,
      nextInspection,
    };

    this.submitSuccess.set(false);
    this.isSubmitting.set(true);
    this.submitError.set(null);

    this.branddeurenService.createInspection(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitSuccess.set(true);
          this.form.reset();
          this.repairsNeededFor.set([]);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set('Er is iets misgegaan. Probeer het opnieuw.');
          console.error(err);
        }
      });
  }

  protected closeSuccessModal(): void {
    this.submitSuccess.set(false);
  }

  private getDefaultInspectionDate(branddeurId: string): string | null {
    if (!branddeurId || !this.branddeurenResource.hasValue()) {
      return null;
    }

    const selectedBranddeur = this.branddeurenResource.value().find(
      (branddeur) => branddeur._id === branddeurId
    );

    if (!selectedBranddeur) {
      return null;
    }

    const sourceDate = selectedBranddeur.mostRecentInspection?.nextInspection
      || selectedBranddeur.initialInspectionDate;

    if (!sourceDate) {
      return null;
    }

    const date = new Date(sourceDate);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString().split('T')[0];
  }

  private normalizeOptional(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private normalizeDateOptional(value: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return `${trimmed}T00:00:00.000Z`;
    }

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toISOString();
  }

  private getCategoryLabel(category: string | InspectieChecklistCategory): string {
    if (typeof category === 'string') {
      return 'Overig';
    }

    return category.value?.trim() || category.code?.trim() || 'Overig';
  }

  private getCategoryKey(category: string | InspectieChecklistCategory): string {
    if (typeof category === 'string') {
      return category;
    }

    return category._id;
  }
}


