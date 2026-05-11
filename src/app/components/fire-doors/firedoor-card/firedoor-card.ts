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
    const status = this.branddeur().status;
    // Handle both old (string) and new (object) API formats
    if (typeof status === 'string') {
      return status || 'Onbekend';
    }
    return status?.statusValue || 'Onbekend';
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
    const status = this.branddeur().status;
    // Handle both old (string) and new (object) API formats
    if (typeof status === 'string') {
      // Map old string format to status classes
      if (status === 'Goedgekeurd') return 'status-approved';
      if (status === 'Herstel nodig') return 'status-warning';
      if (status === 'Afgekeurd') return 'status-error';
      return 'status-unknown';
    }
    // Handle new object format
    const statusCode = status?.statusCode;
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
