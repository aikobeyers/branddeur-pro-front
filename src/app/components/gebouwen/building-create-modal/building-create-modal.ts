import { ChangeDetectionStrategy, Component, DestroyRef, Injector, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { fromEvent } from 'rxjs';

import { BranddeurenService } from '../../../services/branddeuren.service';
import { Gebouw } from '../../../models/gebouw';

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
  private readonly injector = inject(Injector);

  public readonly buildingToEdit = input<Gebouw | null>(null);
  public readonly close = output<void>();
  public readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly floors = signal<string[]>([]);
  protected readonly locations = signal<string[]>([]);
  protected readonly isEditMode = computed(() => !!this.buildingToEdit()?._id);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(64)]],
    floorInput: ['', [Validators.maxLength(64)]],
    locationInput: ['', [Validators.maxLength(120)]]
  });

  public constructor() {
    effect(() => {
      const building = this.buildingToEdit();
      if (!building) {
        this.form.reset();
        this.floors.set([]);
        this.locations.set([]);
        this.submitError.set(null);
        return;
      }

      this.form.controls.name.setValue(building.name?.trim() ?? '');
      this.form.controls.floorInput.setValue('');
      this.form.controls.locationInput.setValue('');
      this.floors.set(this.cleanStringList(building.floor));
      this.locations.set(this.cleanStringList(building.location));
      this.submitError.set(null);
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
    if (!this.isSubmitting() && !this.isEditMode() && !this.form.dirty) {
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
    const buildingToEdit = this.buildingToEdit();
    const floorValues = this.floors();
    const locationValues = this.locations();

    const createPayload = {
      name: rawValue.name.trim(),
      floor: floorValues.length > 0 ? floorValues : undefined,
      location: locationValues.length > 0 ? locationValues : undefined
    };

    const updatePayload = {
      name: rawValue.name.trim(),
      floor: floorValues,
      location: locationValues
    };

    const request$: Observable<Gebouw> = this.isEditMode() && buildingToEdit?._id
      ? this.branddeurenService.updateGebouw(buildingToEdit._id, updatePayload)
      : this.branddeurenService.createGebouw(createPayload);

    request$
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

  private cleanStringList(values: string[] | undefined): string[] {
    if (!values || values.length === 0) {
      return [];
    }

    return values
      .map(value => value?.trim())
      .filter((value): value is string => !!value);
  }

  private resetScrolling(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = '';
    }
  }
}
