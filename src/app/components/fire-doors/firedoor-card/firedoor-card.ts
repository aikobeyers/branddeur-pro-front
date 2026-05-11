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

  protected readonly statusLabel = computed(() => this.branddeur().status?.statusValue || 'Onbekend');

  protected readonly doorTypeLabel = computed(() => this.branddeur().doorType?.trim() || 'Onbekend');

  protected readonly resistanceLabel = computed(() => {
    const resistance = this.branddeur().resistanceMinutes;
    return resistance == null ? '-' : `${resistance} min`;
  });

  protected readonly buildingLabel = computed(() => this.branddeur().building?.trim() || '-');

  protected readonly floorLabel = computed(() => this.branddeur().floor?.trim() || '-');

  protected readonly locationLabel = computed(() => this.branddeur().location?.trim() || '-');

  protected readonly manufacturerLabel = computed(() => this.branddeur().manufacturer?.trim() || '-');

  protected readonly inspectionDateLabel = computed(() => {
    const nextInspectionDate = this.branddeur().nextInspectionDate;

    if (!nextInspectionDate) {
      return '-';
    }

    const date = new Date(nextInspectionDate);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  });

  protected readonly statusClass = computed(() => {
    const statusCode = this.branddeur().status?.statusCode;
    switch (statusCode) {
      case 'A':
        return 'status-approved';
      case 'B':
        return 'status-warning';
      case 'C':
        return 'status-error';
      default:
        return 'status-unknown';
    }
  });

  protected readonly isApproved = computed(() => {
    const status = this.statusLabel().toLowerCase();
    return status.includes('goedgekeurd') || status.includes('approved');
  });

  protected onEditClick(): void {
    this.edit.emit(this.branddeur());
  }
}
