import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { Branddeur } from '../../../models/branddeur';
import { BranddeurenService } from '../../../services/branddeuren.service';

@Component({
  selector: 'app-fire-doors-overview',
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './fire-doors-overview.html',
  styleUrl: './fire-doors-overview.scss',
})
export class FireDoorsOverview {
  protected readonly branddeuren$: Observable<Branddeur[]>;

  public constructor(private readonly branddeurenService: BranddeurenService) {
    this.branddeuren$ = this.branddeurenService.getAllBranddeuren();
  }
}
