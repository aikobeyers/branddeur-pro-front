import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { fromEvent } from 'rxjs';

import { BranddeurenService } from '../../../services/branddeuren.service';

@Component({
  selector: 'app-building-create-modal',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './building-create-modal.html',
  styleUrl: './building-create-modal.scss'
})
export class BuildingCreateModal {
  private readonly formBuilder = inject(FormBuilder);
  private readonly branddeurenService = inject(BranddeurenService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly close = output<void>();
  public readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly floors = signal<string[]>([]);
  protected readonly locations = signal<string[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(64)]],
    floorInput: ['', [Validators.maxLength(64)]],
    locationInput: ['', [Validators.maxLength(120)]]
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
      this.onCancel();
    }
  }

  protected onCancel(): void {
    if (!this.isSubmitting()) {
      this.close.emit();
      this.resetScrolling();
    }
  }

  protected addFloor(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return;
    }

    this.floors.update(items => [...items, trimmed]);
    this.form.controls.floorInput.setValue('');
  }

  protected removeFloor(index: number): void {
    this.floors.update(items => items.filter((_, i) => i !== index));
  }

  protected addLocation(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return;
    }

    this.locations.update(items => [...items, trimmed]);
    this.form.controls.locationInput.setValue('');
  }

  protected removeLocation(index: number): void {
    this.locations.update(items => items.filter((_, i) => i !== index));
  }

  protected onSubmit(): void {
    this.submitError.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    this.isSubmitting.set(true);

    this.branddeurenService.createGebouw({
      name: rawValue.name.trim(),
      floor: this.floors().length > 0 ? this.floors() : undefined,
      location: this.locations().length > 0 ? this.locations() : undefined
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  private resetScrolling(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = '';
    }
  }
}
