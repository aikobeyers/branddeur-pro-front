import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { Branddeur } from '../../../models/branddeur';
import { BranddeurInspectie } from '../../../models/branddeur-inspectie';
import { Gebouw } from '../../../models/gebouw';

interface DoorDetailViewModel {
  id: string;
  name: string;
  floorLabel: string;
  locationLabel: string;
  statusCode: string;
  statusLabel: string;
  repairsNeededFor: string[];
}

@Component({
  selector: 'app-building-detail',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './building-detail.html',
  styleUrl: './building-detail.scss'
})
export class BuildingDetailComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly buildingId = this.activatedRoute.snapshot.paramMap.get('id') ?? '';

  protected readonly gebouwenResource = httpResource<Gebouw[]>(() => ({
    url: `${environment.baseUrl}/gebouwen`,
    method: 'GET'
  }));

  protected readonly branddeurenResource = httpResource<Branddeur[]>(() => ({
    url: `${environment.baseUrl}/branddeuren`,
    method: 'GET'
  }));

  protected readonly building = computed(() => {
    const gebouwen = this.gebouwenResource.value() ?? [];
    return gebouwen.find(gebouw => gebouw._id === this.buildingId) ?? null;
  });

  protected readonly doorRows = computed<DoorDetailViewModel[]>(() => {
    const building = this.building();
    if (!building) {
      return [];
    }

    const buildingName = this.normalizeText(building.name);

    return (this.branddeurenResource.value() ?? [])
      .filter(door => this.normalizeText(door.building) === buildingName)
      .map(door => {
        const inspection = door.mostRecentInspection;
        const statusCode = inspection?.inspectionResult?.statusCode ?? '';

        return {
          id: door._id,
          name: this.normalizeText(door.name) || 'Onbekende branddeur',
          floorLabel: this.normalizeText(door.floor) || '-',
          locationLabel: this.normalizeText(door.location) || '-',
          statusCode,
          statusLabel: this.getStatusLabel(statusCode, inspection),
          repairsNeededFor: this.getRepairsNeededFor(statusCode, inspection),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'nl-NL'));
  });

  protected statusClass(statusCode: string): string {
    if (statusCode === 'A') {
      return 'status-approved';
    }

    if (statusCode === 'B' || statusCode === 'C') {
      return 'status-error';
    }

    return 'status-unknown';
  }

  private getStatusLabel(statusCode: string, inspection: BranddeurInspectie | undefined): string {
    const explicitLabel = this.normalizeText(inspection?.inspectionResult?.statusValue);
    if (explicitLabel) {
      return explicitLabel;
    }

    if (statusCode === 'A') {
      return 'Goedgekeurd';
    }

    if (statusCode === 'B' || statusCode === 'C') {
      return 'Afgekeurd';
    }

    return 'Onbekend';
  }

  private getRepairsNeededFor(statusCode: string, inspection: BranddeurInspectie | undefined): string[] {
    if (statusCode !== 'B' && statusCode !== 'C') {
      return [];
    }

    if (!inspection) {
      return [];
    }

    if (inspection.repairsNeededFor?.length) {
      return inspection.repairsNeededFor;
    }

    return [
      ...(inspection.foundProblems ?? []),
      ...(inspection.suggestedActions ?? [])
    ];
  }

  private normalizeText(value: string | undefined): string {
    return (value ?? '').trim();
  }
}
