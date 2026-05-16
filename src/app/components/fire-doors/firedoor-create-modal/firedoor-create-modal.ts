import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal, Injector, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin, fromEvent, Observable, of, switchMap, tap } from 'rxjs';

import { BranddeurenService } from '../../../services/branddeuren.service';
import { Branddeur } from '../../../models/branddeur';
import { Gebouw } from '../../../models/gebouw';

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
  protected readonly isEditMode = signal(false);
  protected readonly hasMostRecentInspection = computed(() => !!this.branddeurToEdit()?.mostRecentInspection?._id);
  protected readonly gebouwen = signal<Gebouw[]>([]);
  protected readonly isLoadingGebouwen = signal(false);
  protected readonly floorOptions = signal<string[]>([]);
  protected readonly locationOptions = signal<string[]>([]);
  protected readonly newFloorInput = signal('');
  protected readonly newLocationInput = signal('');
  protected readonly selectedFloorDropdown = signal('');
  protected readonly selectedLocationDropdown = signal('');

  protected addFloorOption(): void {
    const value = this.newFloorInput().trim();
    if (!value) {
      return;
    }

    if (!this.floorOptions().includes(value)) {
      this.floorOptions.update(list => [...list, value]);
    }

    this.form.controls.floor.setValue(value);
    this.selectedFloorDropdown.set(value);
    this.newFloorInput.set('');
  }

  protected addLocationOption(): void {
    const value = this.newLocationInput().trim();
    if (!value) {
      return;
    }

    if (!this.locationOptions().includes(value)) {
      this.locationOptions.update(list => [...list, value]);
    }

    this.form.controls.location.setValue(value);
    this.selectedLocationDropdown.set(value);
    this.newLocationInput.set('');
  }
  private readonly lastPopulatedBranddeurId = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(64)]],
    initialInspectionDate: [''],
    nextInspectionDate: [''],
    doorType: ['', [Validators.maxLength(64)]],
    resistanceMinutes: [null as number | null],
    building: ['', [Validators.maxLength(64)]],
    floor: ['', [Validators.maxLength(64)]],
    location: ['', [Validators.maxLength(120)]],
    manufacturer: ['', [Validators.maxLength(64)]]
  });

  public constructor() {
    // Populate form when editing, but only once per branddeur to avoid overwriting user edits
    effect(() => {
      const branddeur = this.branddeurToEdit();
      if (branddeur) {
        // Only populate if we're editing a different branddeur than last time
        if (this.lastPopulatedBranddeurId() !== branddeur._id) {
          this.isEditMode.set(true);
          this.lastPopulatedBranddeurId.set(branddeur._id);

          const mostRecentNextInspection = branddeur.mostRecentInspection?.nextInspection
            || (branddeur.mostRecentInspection as { nextInspectionDate?: string } | undefined)?.nextInspectionDate;

          this.form.patchValue({
            name: branddeur.name,
            initialInspectionDate: this.formatDateForInput(branddeur.initialInspectionDate),
            nextInspectionDate: this.formatDateForInput(mostRecentNextInspection),
            doorType: branddeur.doorType || '',
            resistanceMinutes: branddeur.resistanceMinutes || null,
            building: branddeur.building || '',
            floor: branddeur.floor || '',
            location: branddeur.location || '',
            manufacturer: branddeur.manufacturer || ''
          });

          // Avoid clearing floor/location during edit before gebouwen are loaded.
          if (this.gebouwen().length > 0) {
            this.syncBuildingDependentControls();
          }
        }
      } else {
        this.isEditMode.set(false);
        this.lastPopulatedBranddeurId.set(null);
        this.form.reset();
        this.syncBuildingDependentControls();
      }
    }, { injector: this.injector });

    this.loadGebouwen();

    this.form.controls.building.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncBuildingDependentControls();
        this.selectedFloorDropdown.set('');
        this.selectedLocationDropdown.set('');
        this.newFloorInput.set('');
        this.newLocationInput.set('');
      });

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

  private loadGebouwen(): void {
    this.isLoadingGebouwen.set(true);

    this.branddeurenService.getGebouwen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (gebouwen) => {
          this.gebouwen.set(gebouwen ?? []);
          this.ensureSelectedBuildingExists();
          this.syncBuildingDependentControls();
          this.isLoadingGebouwen.set(false);
        },
        error: () => {
          this.gebouwen.set([]);
          this.syncBuildingDependentControls();
          this.isLoadingGebouwen.set(false);
          this.submitError.set('Gebouwen laden is mislukt. Probeer het opnieuw.');
        }
      });
  }

  private ensureSelectedBuildingExists(): void {
    const buildingValue = this.form.controls.building.value;
    if (!buildingValue) {
      return;
    }

    const isKnownBuilding = this.gebouwen().some(gebouw => gebouw.name === buildingValue);
    if (!isKnownBuilding) {
      this.form.controls.building.setValue('');
    }
  }

  private syncBuildingDependentControls(): void {
    const buildingValue = this.form.controls.building.value;
    const selectedGebouw = this.gebouwen().find(gebouw => gebouw.name === buildingValue) ?? null;

    if (!selectedGebouw) {
      this.floorOptions.set([]);
      this.locationOptions.set([]);
      this.form.controls.floor.setValue('');
      this.form.controls.location.setValue('');
      this.form.controls.floor.disable({ emitEvent: false });
      this.form.controls.location.disable({ emitEvent: false });
      return;
    }

    const floors = this.cleanStringList(selectedGebouw.floor);
    const locations = this.cleanStringList(selectedGebouw.location);

    this.floorOptions.set(floors);
    this.locationOptions.set(locations);

    this.form.controls.floor.enable({ emitEvent: false });
    this.form.controls.location.enable({ emitEvent: false });

    if (this.form.controls.floor.value && !floors.includes(this.form.controls.floor.value)) {
      this.form.controls.floor.setValue('');
    }

    if (this.form.controls.location.value && !locations.includes(this.form.controls.location.value)) {
      this.form.controls.location.setValue('');
    }
  }

  private cleanStringList(values: string[] | undefined): string[] {
    if (!values || values.length === 0) {
      return [];
    }

    return values
      .map(value => value?.trim())
      .filter((value): value is string => !!value);
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

  protected onSubmit(): void {
    this.submitError.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();    
    this.isSubmitting.set(true);

    const payload = {
      name: rawValue.name.trim(),
      doorType: this.normalizeOptional(rawValue.doorType),
      resistanceMinutes: rawValue.resistanceMinutes ?? undefined,
      building: this.normalizeOptional(rawValue.building),
      floor: this.normalizeOptional(rawValue.floor),
      location: this.normalizeOptional(rawValue.location),
      manufacturer: this.normalizeOptional(rawValue.manufacturer)
    };

    const createPayload = {
      ...payload,
      initialInspectionDate: this.normalizeDateOptional(rawValue.initialInspectionDate)
    };
    const branddeurToEdit = this.branddeurToEdit();
    const nextInspectionDate = this.normalizeDateOptional(rawValue.nextInspectionDate);
    const initialInspectionDate = this.normalizeDateOptional(rawValue.initialInspectionDate);
    const inspectionId = branddeurToEdit?.mostRecentInspection?._id;
    const hasMostRecentInspection = !!inspectionId;
    const editPayload = hasMostRecentInspection
      ? payload
      : {
          ...payload,
          initialInspectionDate
        };

    let request$: Observable<unknown>;

    if (this.isEditMode() && branddeurToEdit?._id) {
      request$ = forkJoin([
        this.branddeurenService.updateBranddeur(branddeurToEdit._id, editPayload),
        hasMostRecentInspection && nextInspectionDate
          ? this.branddeurenService.updateInspection(inspectionId!, {
              nextInspection: nextInspectionDate
            })
          : of(null)
      ]);
    } else {
      request$ = this.branddeurenService.createBranddeur(createPayload);
    }

    const buildingSync$ = this.getBuildingSyncRequest(rawValue.building, payload.floor, payload.location);

    buildingSync$
      .pipe(
        switchMap(() => request$),
        takeUntilDestroyed(this.destroyRef)
      )
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

  private getBuildingSyncRequest(
    buildingNameRaw: string,
    floor: string | undefined,
    location: string | undefined
  ): Observable<Gebouw | null> {
    const buildingName = buildingNameRaw.trim();
    if (!buildingName) {
      return of(null);
    }

    const selectedGebouw = this.gebouwen().find(gebouw => gebouw.name === buildingName) ?? null;
    if (!selectedGebouw) {
      return of(null);
    }

    const currentFloors = this.cleanStringList(selectedGebouw.floor);
    const currentLocations = this.cleanStringList(selectedGebouw.location);

    const nextFloors = floor && !currentFloors.includes(floor)
      ? [...currentFloors, floor]
      : currentFloors;
    const nextLocations = location && !currentLocations.includes(location)
      ? [...currentLocations, location]
      : currentLocations;

    const hasFloorChange = nextFloors.length !== currentFloors.length;
    const hasLocationChange = nextLocations.length !== currentLocations.length;

    if (!hasFloorChange && !hasLocationChange) {
      return of(null);
    }

    return this.branddeurenService.updateGebouw(selectedGebouw._id, {
      floor: nextFloors,
      location: nextLocations
    }).pipe(
      tap((updatedGebouw) => {
        this.gebouwen.update(items => items.map(item => item._id === updatedGebouw._id ? updatedGebouw : item));

        if (this.form.controls.building.value === updatedGebouw.name) {
          this.floorOptions.set(this.cleanStringList(updatedGebouw.floor));
          this.locationOptions.set(this.cleanStringList(updatedGebouw.location));
        }
      })
    );
  }

  protected selectFloor(value: string): void {
    this.selectedFloorDropdown.set(value);
    if (value === 'NEW_OPTION') {
      this.form.controls.floor.setValue('NEW_OPTION');
      return;
    }

    this.form.controls.floor.setValue(value);
  }

  protected selectLocation(value: string): void {
    this.selectedLocationDropdown.set(value);
    if (value === 'NEW_OPTION') {
      this.form.controls.location.setValue('NEW_OPTION');
      return;
    }

    this.form.controls.location.setValue(value);
  }

  private normalizeOptional(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === 'NEW_OPTION' ? undefined : trimmed;
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

  private formatDateForInput(dateString: string | undefined): string {
    if (!dateString) {
      return '';
    }

    // Keep plain ISO dates untouched for date inputs (YYYY-MM-DD).
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      return dateString.slice(0, 10);
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().split('T')[0];
  }

  private resetScrolling(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = '';
    }
  }
}
