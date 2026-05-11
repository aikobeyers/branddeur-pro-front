import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { FiredoorCard } from '../firedoor-card/firedoor-card';
import { Branddeur } from '../../../models/branddeur';
import { BranddeurenService } from '../../../services/branddeuren.service';

@Component({
  selector: 'app-fire-doors-overview',
  imports: [AsyncPipe, FiredoorCard],
  templateUrl: './fire-doors-overview.html',
  styleUrl: './fire-doors-overview.scss',
})
export class FireDoorsOverview {
  protected readonly branddeuren$: Observable<Branddeur[]>;

  public constructor(private readonly branddeurenService: BranddeurenService) {
    this.branddeuren$ = this.branddeurenService.getAllBranddeuren();
  }
}
