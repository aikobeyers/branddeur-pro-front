export interface BranddeurInspectie {
  _id: string;
  branddeurId: string;
  checkListItems: Array<{
    itemId: string;
    value: string;
    foundProblems: string[];
    createdAt: string;
  }>;
  generalCondition: string;
  inspectionDate: string;
  inspectionResult: {
    statusCode: 'A' | 'B' | 'C';
    statusValue: string;
  };
  inspectionType: string;
  inspectorName: string;
  nextInspection: string;
  updatedAt: string;
}
