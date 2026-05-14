import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Branddeur, CreateBranddeurRequest } from '../models/branddeur';
import { BranddeurInspectie, CreateBranddeurInspectieRequest } from '../models/branddeur-inspectie';
import { InspectieChecklistItem } from '../models/inspectie-checklist-item';

const BASE_URL: string = environment.baseUrl;
const BRANDDEUREN_SUFFIX: string = '/branddeuren';
const INSPECTIE_CHECKLIST_ITEMS_SUFFIX: string = '/inspectie-checklist-items';
const BRANDDEUR_INSPECTIES_SUFFIX: string = '/branddeur-inspecties';

@Injectable({
  providedIn: 'root'
})
export class BranddeurenService {
  private readonly http = inject(HttpClient);

  public getAllBranddeuren(): Observable<Branddeur[]> {
    return this.http.get<Branddeur[]>(`${BASE_URL}${BRANDDEUREN_SUFFIX}`);
  }

  public createBranddeur(request: CreateBranddeurRequest): Observable<Branddeur> {
    return this.http.post<Branddeur>(`${BASE_URL}${BRANDDEUREN_SUFFIX}`, request);
  }

  public updateBranddeur(id: string, request: CreateBranddeurRequest): Observable<Branddeur> {
    return this.http.put<Branddeur>(`${BASE_URL}${BRANDDEUREN_SUFFIX}/${id}`, request);
  }

  public getInspectieChecklistItems(): Observable<InspectieChecklistItem[]> {
    return this.http.get<InspectieChecklistItem[]>(`${BASE_URL}${INSPECTIE_CHECKLIST_ITEMS_SUFFIX}`);
  }

  public createInspection(request: CreateBranddeurInspectieRequest): Observable<BranddeurInspectie> {
    return this.http.post<BranddeurInspectie>(`${BASE_URL}${BRANDDEUR_INSPECTIES_SUFFIX}`, request);
  }

  public updateInspection(id: string, request: Partial<CreateBranddeurInspectieRequest>): Observable<BranddeurInspectie> {
    return this.http.put<BranddeurInspectie>(`${BASE_URL}${BRANDDEUR_INSPECTIES_SUFFIX}/${id}`, request);
  }
}
