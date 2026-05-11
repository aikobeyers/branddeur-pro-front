import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { BranddeurenService } from '../services/branddeuren.service';
import { InspectieChecklistItem } from '../models/inspectie-checklist-item';

export const inspectieChecklistItemsResolver: ResolveFn<InspectieChecklistItem[]> = () => {
  const branddeuren = inject(BranddeurenService);
  return branddeuren.getInspectieChecklistItems();
};
