export interface Gebouw {
  _id: string;
  name: string;
  floor: string[];
  location: string[];
}

export interface CreateGebouwRequest {
  name: string;
  floor?: string[];
  location?: string[];
}
