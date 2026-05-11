import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { fromEvent } from 'rxjs';

import { BranddeurenService } from '../../../services/branddeuren.service';
import { BranddeurStatus } from '../../../models/branddeur';

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

  public readonly close = output<void>();
  public readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly statusOptions = STATUS_OPTIONS;

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
    }
  }

  protected onCancel(): void {
    if (!this.isSubmitting()) {
      this.close.emit();
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

    this.branddeurenService
      .createBranddeur({
        name: rawValue.name.trim(),
        status: STATUS_MAPPING[statusCode],
        doorType: this.normalizeOptional(rawValue.doorType),
        resistanceMinutes: rawValue.resistanceMinutes ?? undefined,
        building: this.normalizeOptional(rawValue.building),
        floor: this.normalizeOptional(rawValue.floor),
        location: this.normalizeOptional(rawValue.location),
        nextInspectionDate: this.normalizeOptional(rawValue.nextInspectionDate),
        manufacturer: this.normalizeOptional(rawValue.manufacturer)
      })
      .subscribe({
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
}
