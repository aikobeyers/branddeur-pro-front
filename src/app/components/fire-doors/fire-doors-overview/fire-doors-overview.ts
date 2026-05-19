import { ChangeDetectionStrategy, Component, effect, inject, Injector } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { signal } from '@angular/core';

import { FiredoorCard } from '../firedoor-card/firedoor-card';
import { FiredoorCreateModal } from '../firedoor-create-modal/firedoor-create-modal';
import { Branddeur } from '../../../models/branddeur';
import { environment } from '../../../../environments/environment';
import { BranddeurenService } from '../../../services/branddeuren.service';

@Component({
  selector: 'app-fire-doors-overview',
  imports: [FiredoorCard, FiredoorCreateModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fire-doors-overview.html',
  styleUrl: './fire-doors-overview.scss',
})
export class FireDoorsOverview {
  private readonly injector = inject(Injector);
  private readonly branddeurenService = inject(BranddeurenService);
  protected readonly isModalOpen = signal(false);
  protected readonly isDeleteModalOpen = signal(false);
  protected readonly isDeleteSubmitting = signal(false);
  protected readonly branddeurToEdit = signal<Branddeur | null>(null);
  protected readonly branddeurToDelete = signal<Branddeur | null>(null);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly branddeurenResource = httpResource<Branddeur[]>(() => ({
    url: `${environment.baseUrl}/branddeuren`,
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
    this.deleteError.set(null);
    this.branddeurToEdit.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditModal(branddeur: Branddeur): void {
    this.deleteError.set(null);
    this.branddeurToEdit.set(branddeur);
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
    this.branddeurToEdit.set(null);
  }

  protected openDeleteModal(branddeur: Branddeur): void {
    this.deleteError.set(null);
    this.branddeurToDelete.set(branddeur);
    this.isDeleteModalOpen.set(true);
  }

  protected closeDeleteModal(): void {
    if (this.isDeleteSubmitting()) {
      return;
    }

    this.isDeleteModalOpen.set(false);
    this.branddeurToDelete.set(null);
  }

  protected handleCreated(): void {
    this.isModalOpen.set(false);
    this.branddeurToEdit.set(null);
    this.deleteError.set(null);
    this.branddeurenResource.reload();
  }

  protected confirmDeleteBranddeur(): void {
    const branddeur = this.branddeurToDelete();
    if (!branddeur || this.isDeleteSubmitting()) {
      return;
    }

    this.deleteError.set(null);
    this.isDeleteSubmitting.set(true);

    this.branddeurenService.deleteBranddeur(branddeur._id)
      .subscribe({
      next: () => {
        this.isDeleteSubmitting.set(false);
        this.isDeleteModalOpen.set(false);
        this.branddeurToDelete.set(null);
        this.branddeurenResource.reload();
      },
      error: () => {
        this.isDeleteSubmitting.set(false);
        this.deleteError.set('Verwijderen is mislukt. Mogelijk ontbreekt autorisatie of is de branddeur al verwijderd.');
      }
    });
  }
}
