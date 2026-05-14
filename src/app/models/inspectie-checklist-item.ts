export interface InspectieChecklistCategory {
  _id: string;
  code: string;
  value: string;
}

export interface InspectieChecklistItem {
  _id: string;
  displayValue: string;
  category: string | InspectieChecklistCategory;
}
