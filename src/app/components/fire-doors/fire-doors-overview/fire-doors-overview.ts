import { ChangeDetectionStrategy, Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { signal } from '@angular/core';

import { FiredoorCard } from '../firedoor-card/firedoor-card';
import { FiredoorCreateModal } from '../firedoor-create-modal/firedoor-create-modal';
import { Branddeur } from '../../../models/branddeur';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-fire-doors-overview',
  imports: [FiredoorCard, FiredoorCreateModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fire-doors-overview.html',
  styleUrl: './fire-doors-overview.scss',
})
export class FireDoorsOverview {
  protected readonly isCreateModalOpen = signal(false);

  protected readonly branddeurenResource = httpResource<Branddeur[]>(() => ({
    url: environment.baseUrl,
    method: 'GET'
  }));

  protected openCreateModal(): void {
    this.isCreateModalOpen.set(true);
  }

  protected closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  protected handleCreated(): void {
    this.isCreateModalOpen.set(false);
    this.branddeurenResource.reload();
  }
}
