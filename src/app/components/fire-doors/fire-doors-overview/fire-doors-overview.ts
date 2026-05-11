import { ChangeDetectionStrategy, Component } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { FiredoorCard } from '../firedoor-card/firedoor-card';
import { Branddeur } from '../../../models/branddeur';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-fire-doors-overview',
  imports: [FiredoorCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fire-doors-overview.html',
  styleUrl: './fire-doors-overview.scss',
})
export class FireDoorsOverview {
  protected readonly branddeurenResource = httpResource<Branddeur[]>(() => ({
    url: environment.baseUrl,
    method: 'GET'
  }));
}
