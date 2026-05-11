import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { fromEvent } from 'rxjs';

import { BranddeurenService } from '../../../services/branddeuren.service';
import { Branddeur, BranddeurStatus } from '../../../models/branddeur';

const STATUS_MAPPING: Record<string, BranddeurStatus> = {
  'A': { statusCode: 'A', statusValue: 'Goedgekeurd' },
  'B': { statusCode: 'B', statusValue: 'Herstel nodig' },
  'C': { statusCode: 'C', statusValue: 'Afgekeurd' }
};

const STATUS_OPTIONS = [
  { code: 'A', label: 'Goedgekeurd' },
  { code: 'B', label: 'Herstel nodig' },
  { code: 'C', label: 'Afgekeurd' }
];

@Component({
  selector: 'app-firedoor-create-modal',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './firedoor-create-modal.html',
  styleUrl: './firedoor-create-modal.scss'
})
export class FiredoorCreateModal {
  private readonly formBuilder = inject(FormBuilder);
  private readonly branddeurenService = inject(BranddeurenService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  public readonly branddeurToEdit = input<Branddeur | null>(null);
  public readonly close = output<void>();
  public readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly isEditMode = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(64)]],
    statusCode: ['', [Validators.required]],
    doorType: ['', [Validators.maxLength(64)]],
    resistanceMinutes: [null as number | null],
    building: ['', [Validators.maxLength(64)]],
    floor: ['', [Validators.maxLength(64)]],
    location: ['', [Validators.maxLength(120)]],
    nextInspectionDate: [''],
    manufacturer: ['', [Validators.maxLength(64)]]
  });

  public constructor() {
    // Populate form when editing
    effect(() => {
      const branddeur = this.branddeurToEdit();
      if (branddeur) {
        this.isEditMode.set(true);
        this.form.patchValue({
          name: branddeur.name,
          statusCode: branddeur.status?.statusCode || '',
          doorType: branddeur.doorType || '',
          resistanceMinutes: branddeur.resistanceMinutes || null,
          building: branddeur.building || '',
          floor: branddeur.floor || '',
          location: branddeur.location || '',
          nextInspectionDate: this.formatDateForInput(branddeur.nextInspectionDate),
          manufacturer: branddeur.manufacturer || ''
        });
      } else {
        this.isEditMode.set(false);
        this.form.reset();
      }
    }, { injector: this.injector });

    if (typeof window !== 'undefined') {
      fromEvent<KeyboardEvent>(window, 'keydown')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          if (event.key === 'Escape') {
            this.onCancel();
          }
        });
    }
  }

  protected onBackdropClick(): void {
    if (!this.isSubmitting()) {
      this.close.emit();
      this.resetScrolling();
    }
  }

  protected onCancel(): void {
    if (!this.isSubmitting()) {
      this.close.emit();
      this.resetScrolling();
    }
  }

  protected onSubmit(): void {
    this.submitError.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const statusCode = rawValue.statusCode as 'A' | 'B' | 'C';
    this.isSubmitting.set(true);

    const payload = {
      name: rawValue.name.trim(),
      status: STATUS_MAPPING[statusCode],
      doorType: this.normalizeOptional(rawValue.doorType),
      resistanceMinutes: rawValue.resistanceMinutes ?? undefined,
      building: this.normalizeOptional(rawValue.building),
      floor: this.normalizeOptional(rawValue.floor),
      location: this.normalizeOptional(rawValue.location),
      nextInspectionDate: this.normalizeOptional(rawValue.nextInspectionDate),
      manufacturer: this.normalizeOptional(rawValue.manufacturer)
    };

    const request$ = this.isEditMode() && this.branddeurToEdit()?._id
      ? this.branddeurenService.updateBranddeur(this.branddeurToEdit()!._id, payload)
      : this.branddeurenService.createBranddeur(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.created.emit();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.submitError.set('Opslaan mislukt. Controleer uw rechten of probeer opnieuw.');
      }
    });
  }

  private normalizeOptional(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private formatDateForInput(dateString: string | undefined | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  private resetScrolling(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = '';
    }
  }
}
