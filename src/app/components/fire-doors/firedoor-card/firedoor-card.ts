import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Branddeur } from '../../../models/branddeur';

@Component({
  selector: 'app-firedoor-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './firedoor-card.html',
  styleUrl: './firedoor-card.scss'
})
export class FiredoorCard {
  public readonly branddeur = input.required<Branddeur>();
  public readonly edit = output<Branddeur>();

  protected readonly statusLabel = computed(() => {
    const inspection = this.branddeur().mostRecentInspection;
    if (inspection && inspection.inspectionResult) {
      return inspection.inspectionResult.statusValue || 'Onbekend';
    }
    return 'Onbekend';
  });

  protected readonly doorTypeLabel = computed(() => this.branddeur().doorType?.trim() || 'Onbekend');

  protected readonly resistanceLabel = computed(() => {
    const resistance = this.branddeur().resistanceMinutes;
    return resistance == null ? '-' : `${resistance} min`;
  });

  protected readonly buildingLabel = computed(() => this.branddeur().building?.trim() || '-');

  protected readonly floorLabel = computed(() => this.branddeur().floor?.trim() || '-');

  protected readonly locationLabel = computed(() => this.branddeur().location?.trim() || '-');

  protected readonly manufacturerLabel = computed(() => this.branddeur().manufacturer?.trim() || '-');

  protected readonly hasMostRecentInspection = computed(() => !!this.branddeur().mostRecentInspection);

  protected readonly inspectionDateLabel = computed(() => {
    const nextInspectionDate = this.branddeur().mostRecentInspection?.nextInspection;
    const initialInspectionDate = this.branddeur().initialInspectionDate;
    const dateToDisplay = nextInspectionDate || initialInspectionDate;

    if (!dateToDisplay) {
      return '-';
    }

    const date = new Date(dateToDisplay);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  });

  protected readonly inspectionDateTitle = computed(() =>
    this.hasMostRecentInspection() ? 'Volgende inspectie:' : 'Eerste inspectie:'
  );

  protected readonly statusClass = computed(() => {
    const inspection = this.branddeur().mostRecentInspection;
    const statusCode = inspection?.inspectionResult?.statusCode;
    if (statusCode === 'A') return 'status-approved';
    if (statusCode === 'B' || statusCode === 'C') return 'status-error';
    return 'status-unknown';
  });

  protected readonly isApproved = computed(() => {
    const status = this.statusLabel().toLowerCase();
    return status.includes('goedgekeurd') || status.includes('approved');
  });

  protected onEditClick(): void {
    this.edit.emit(this.branddeur());
  }
}
