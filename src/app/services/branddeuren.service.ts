import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Branddeur } from '../models/branddeur';

const BASE_URL: string = environment.baseUrl;

@Injectable({
  providedIn: 'root'
})
export class BranddeurenService {
  private readonly http = inject(HttpClient);

  public getAllBranddeuren(): Observable<Branddeur[]> {
    return this.http.get<Branddeur[]>(BASE_URL);
  }
}
