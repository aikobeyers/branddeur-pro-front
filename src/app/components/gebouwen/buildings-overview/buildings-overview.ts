import { ChangeDetectionStrategy, Component, computed, effect, inject, Injector, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { BuildingCreateModal } from '../building-create-modal/building-create-modal';
import { Gebouw } from '../../../models/gebouw';
import { Branddeur } from '../../../models/branddeur';

const STATUS_LABELS: Record<string, string> = {
  A: 'Goedgekeurd',
  B: 'Afgekeurd',
};

interface DoorStatusCounts {
  total: number;
  approved: number;
  approvedLabel: string;
  rejected: number;
  rejectedLabel: string;
}

interface GebouwCardViewModel {
  id: string;
  name: string;
  floors: string[];
  locations: string[];
  floorCount: number;
  locationCount: number;
  doorStats: DoorStatusCounts;
}

@Component({
  selector: 'app-buildings-overview',
  imports: [BuildingCreateModal, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buildings-overview.html',
  styleUrl: './buildings-overview.scss',
})
export class BuildingsOverview {
  private readonly injector = inject(Injector);
  protected readonly isModalOpen = signal(false);

  protected readonly gebouwenResource = httpResource<Gebouw[]>(() => ({
    url: `${environment.baseUrl}/gebouwen`,
    method: 'GET'
  }));

  protected readonly branddeurenResource = httpResource<Branddeur[]>(() => ({
    url: `${environment.baseUrl}/branddeuren`,
    method: 'GET'
  }));

  protected readonly cards = computed<GebouwCardViewModel[]>(() => {
    const branddeuren = this.branddeurenResource.value() ?? [];

    return (this.gebouwenResource.value() ?? []).map(gebouw => {
      const floors = this.cleanStringList(gebouw.floor);
      const locations = this.cleanStringList(gebouw.location);
      const doorsInBuilding = branddeuren.filter(d => d.building === gebouw.name);

      const doorStats: DoorStatusCounts = {
        total: doorsInBuilding.length,
        approved: doorsInBuilding.filter(d => d.mostRecentInspection?.inspectionResult?.statusCode === 'A').length,
        approvedLabel: doorsInBuilding.find(d => d.mostRecentInspection?.inspectionResult?.statusCode === 'A')?.mostRecentInspection?.inspectionResult?.statusValue || STATUS_LABELS['A'],
        rejected: doorsInBuilding.filter(d => {
          const statusCode = d.mostRecentInspection?.inspectionResult?.statusCode as string | undefined;
          return statusCode === 'B' || statusCode === 'C';
        }).length,
        rejectedLabel: doorsInBuilding.find(d => {
          const statusCode = d.mostRecentInspection?.inspectionResult?.statusCode as string | undefined;
          return statusCode === 'B' || statusCode === 'C';
        })?.mostRecentInspection?.inspectionResult?.statusValue || STATUS_LABELS['B'],
      };

      return {
        id: gebouw._id,
        name: gebouw.name?.trim() || 'Onbekend gebouw',
        floors,
        locations,
        floorCount: floors.length,
        locationCount: locations.length,
        doorStats
      };
    });
  });

  public constructor() {
    effect(() => {
      const modalOpen = this.isModalOpen();
      if (typeof document !== 'undefined') {
        document.documentElement.style.overflow = modalOpen ? 'hidden' : '';
      }
    }, { injector: this.injector });
  }

  protected openCreateModal(): void {
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected handleCreated(): void {
    this.isModalOpen.set(false);
    this.gebouwenResource.reload();
  }

  private cleanStringList(values: string[] | undefined): string[] {
    if (!values || values.length === 0) {
      return [];
    }

    return values
      .map(value => value?.trim())
      .filter((value): value is string => !!value);
  }
}
