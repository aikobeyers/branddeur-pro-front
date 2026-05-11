export interface BranddeurStatus {
  statusCode: 'A' | 'B' | 'C';
  statusValue: 'Goedgekeurd' | 'Herstel nodig' | 'Afgekeurd';
}

export interface Branddeur {
  _id: string;
  name: string;
  status?: BranddeurStatus;
  doorType?: string;
  resistanceMinutes?: number;
  building?: string;
  floor?: string;
  location?: string;
  nextInspectionDate?: string;
  manufacturer?: string;
}

export interface CreateBranddeurRequest {
  name: string;
  status?: BranddeurStatus;
  doorType?: string;
  resistanceMinutes?: number;
  building?: string;
  floor?: string;
  location?: string;
  nextInspectionDate?: string;
  manufacturer?: string;
}
