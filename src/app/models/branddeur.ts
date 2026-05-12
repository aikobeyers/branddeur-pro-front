import { BranddeurInspectie } from "./branddeur-inspectie";

export interface BranddeurStatus {
  statusCode: 'A' | 'B' | 'C';
  statusValue: string;
}

export interface Branddeur {
  _id: string;
  name: string;
  status?: BranddeurStatus;
  mostRecentInspection?: BranddeurInspectie;
  initialInspectionDate?: string;
  doorType?: string;
  resistanceMinutes?: number;
  building?: string;
  floor?: string;
  location?: string;
  manufacturer?: string;
}

export interface CreateBranddeurRequest {
  name: string;
  initialInspectionDate?: string;
  doorType?: string;
  resistanceMinutes?: number;
  building?: string;
  floor?: string;
  location?: string;
  manufacturer?: string;
}
