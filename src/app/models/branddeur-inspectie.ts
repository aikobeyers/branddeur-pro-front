import { InspectieChecklistItem } from './inspectie-checklist-item';

export type InspectionStatusCode = 'A' | 'B';
export type InspectionStatusValue = 'Goedgekeurd' | 'Afgekeurd';

export interface InspectionResult {
  statusCode: InspectionStatusCode;
  statusValue: InspectionStatusValue;
}

export interface CheckListItemResult {
  itemId: string | InspectieChecklistItem;
  value: boolean;
}

export interface BranddeurInspectie {
  _id: string;
  branddeurId: string;
  checkListItems: CheckListItemResult[];
  foundProblems: string[];
  suggestedActions: string[];
  generalCondition?: string;
  inspectionDate?: string;
  inspectionResult?: InspectionResult;
  inspectionType?: string;
  inspectorName?: string;
  supervisor?: string;
  nextInspection?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranddeurInspectieRequest {
  branddeurId: string;
  checklistItems?: Record<string, boolean>;
  foundProblems?: string[];
  suggestedActions?: string[];
  generalCondition?: string;
  inspectionDate?: string;
  inspectionResult?: InspectionResult | InspectionStatusCode;
  inspectionType?: string;
  inspectorName?: string;
  supervisor?: string;
  nextInspection?: string;
}
