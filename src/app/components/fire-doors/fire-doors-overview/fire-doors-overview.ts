import { ChangeDetectionStrategy, Component, effect, inject, Injector } from '@angular/core';
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
  private readonly injector = inject(Injector);
  protected readonly isModalOpen = signal(false);
  protected readonly branddeurToEdit = signal<Branddeur | null>(null);

  protected readonly branddeurenResource = httpResource<Branddeur[]>(() => ({
    url: environment.baseUrl,
    method: 'GET'
  }));

  public constructor() {
    // Prevent body scroll when modal is open
    effect(() => {
      const modalOpen = this.isModalOpen();
      if (typeof document !== 'undefined') {
        if (modalOpen) {
          document.documentElement.style.overflow = 'hidden';
        } else {
          document.documentElement.style.overflow = '';
        }
      }
    }, { injector: this.injector });
  }

  protected openCreateModal(): void {
    this.branddeurToEdit.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditModal(branddeur: Branddeur): void {
    this.branddeurToEdit.set(branddeur);
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
    this.branddeurToEdit.set(null);
  }

  protected handleCreated(): void {
    this.isModalOpen.set(false);
    this.branddeurToEdit.set(null);
    this.branddeurenResource.reload();
  }
}
