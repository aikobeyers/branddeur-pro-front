import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Gebouw } from '../../../models/gebouw';

interface GebouwCardViewModel {
  id: string;
  name: string;
  floors: string[];
  locations: string[];
  floorCount: number;
  locationCount: number;
}

@Component({
  selector: 'app-buildings-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './buildings-overview.html',
  styleUrl: './buildings-overview.scss',
})
export class BuildingsOverview {
  protected readonly gebouwenResource = httpResource<Gebouw[]>(() => ({
    url: `${environment.baseUrl}/gebouwen`,
    method: 'GET'
  }));

  protected readonly cards = computed<GebouwCardViewModel[]>(() =>
    (this.gebouwenResource.value() ?? []).map(gebouw => {
      const floors = this.cleanStringList(gebouw.floor);
      const locations = this.cleanStringList(gebouw.location);

      return {
        id: gebouw._id,
        name: gebouw.name?.trim() || 'Onbekend gebouw',
        floors,
        locations,
        floorCount: floors.length,
        locationCount: locations.length
      };
    })
  );

  private cleanStringList(values: string[] | undefined): string[] {
    if (!values || values.length === 0) {
      return [];
    }

    return values
      .map(value => value?.trim())
      .filter((value): value is string => !!value);
  }
}
