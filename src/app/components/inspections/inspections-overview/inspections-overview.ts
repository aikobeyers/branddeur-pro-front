import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Branddeur } from '../../../models/branddeur';
import { BranddeurInspectie, CheckListItemResult } from '../../../models/branddeur-inspectie';
import { InspectieChecklistCategory, InspectieChecklistItem } from '../../../models/inspectie-checklist-item';
import { BranddeurenService } from '../../../services/branddeuren.service';
import type { Content, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

interface PdfMakeInstance {
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  addFonts?: (fonts: Record<string, unknown>) => void;
  setFonts?: (fonts: Record<string, unknown>) => void;
  vfs?: Record<string, string>;
  createPdf: (documentDefinition: TDocumentDefinitions) => {
    download: (defaultFileName?: string) => void;
  };
}

interface VfsFontsModule {
  default?: {
    pdfMake?: {
      vfs?: Record<string, string>;
    };
    vfs?: Record<string, string>;
  };
  pdfMake?: {
    vfs?: Record<string, string>;
  };
  vfs?: Record<string, string>;
  [key: string]: unknown;
}

type ReportVariant = 'detailed' | 'compact';

interface InspectionCardViewModel {
  id: string;
  doorName: string;
  statusLabel: string;
  statusCode: string;
  buildingLabel: string;
  floorLabel: string;
  locationLabel: string;
  inspectorLabel: string;
  inspectionDateLabel: string;
  inspectionTypeLabel: string;
  conditionLabel: string;
  problems: string[];
  suggestedActions: string[];
  nextInspectionLabel: string;
}

@Component({
  selector: 'app-inspections-overview',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspections-overview.html',
  styleUrl: './inspections-overview.scss'
})
export class InspectionsOverviewComponent {
  private readonly branddeurenService = inject(BranddeurenService);
  private branddeurenById = new Map<string, Branddeur>();

  protected readonly isGenerating = signal(false);
  protected readonly isLoadingBuildings = signal(false);
  protected readonly isBuildingModalOpen = signal(false);
  protected readonly buildingOptions = signal<string[]>([]);
  protected readonly selectedBuilding = signal('');
  protected readonly selectedReportVariant = signal<ReportVariant>('detailed');
  protected readonly generateError = signal<string | null>(null);
  protected readonly cards = signal<InspectionCardViewModel[]>([]);
  protected readonly isLoadingCards = signal(false);
  protected readonly cardsError = signal<string | null>(null);

  public constructor() {
    void this.loadInspectionCards();
  }

  protected async onDownload(): Promise<void> {
    await this.openBuildingSelection('detailed');
  }

  protected async onDownloadCompact(): Promise<void> {
    await this.openBuildingSelection('compact');
  }

  protected statusClass(statusCode: string): string {
    if (statusCode === 'A') {
      return 'status-approved';
    }

    if (statusCode === 'B') {
      return 'status-warning';
    }

    if (statusCode === 'C') {
      return 'status-error';
    }

    return 'status-unknown';
  }

  private async loadInspectionCards(): Promise<void> {
    this.isLoadingCards.set(true);
    this.cardsError.set(null);

    try {
      const [branddeuren, inspections] = await Promise.all([
        firstValueFrom(this.branddeurenService.getAllBranddeuren()),
        firstValueFrom(this.branddeurenService.getBranddeurInspecties())
      ]);

      this.branddeurenById = new Map((branddeuren ?? []).map(branddeur => [branddeur._id, branddeur]));

      const latestByDoor = new Map<string, BranddeurInspectie>();
      for (const inspection of inspections ?? []) {
        const branddeurId = this.getInspectionBranddeurId(inspection);
        if (!branddeurId) {
          continue;
        }

        const existing = latestByDoor.get(branddeurId);
        if (!existing || this.getInspectionSortTime(inspection) > this.getInspectionSortTime(existing)) {
          latestByDoor.set(branddeurId, inspection);
        }
      }

      const cards = Array.from(latestByDoor.values())
        .map(inspection => this.toInspectionCard(inspection))
        .sort((a, b) => b.sortTime - a.sortTime)
        .map(({ sortTime: _sortTime, ...card }) => card);

      this.cards.set(cards);
    } catch (error) {
      console.error('Inspections overview load failed', error);
      this.cardsError.set('Inspectiekaarten laden is mislukt. Probeer het opnieuw.');
    } finally {
      this.isLoadingCards.set(false);
    }
  }

  private toInspectionCard(inspection: BranddeurInspectie): InspectionCardViewModel & { sortTime: number } {
    const branddeurId = this.getInspectionBranddeurId(inspection);
    const branddeur = branddeurId ? this.branddeurenById.get(branddeurId) : undefined;

    return {
      id: inspection._id,
      doorName: this.getDoorLabel(inspection),
      statusLabel: inspection.inspectionResult?.statusValue || 'Onbekend',
      statusCode: inspection.inspectionResult?.statusCode || '',
      buildingLabel: this.normalizeBuildingValue(branddeur?.building) || 'Onbekend',
      floorLabel: this.getInspectionFloor(inspection),
      locationLabel: this.getInspectionLocation(inspection),
      inspectorLabel: (inspection.inspectorName || '').trim() || 'Onbekend',
      inspectionDateLabel: this.formatDate(inspection.inspectionDate),
      inspectionTypeLabel: (inspection.inspectionType || '').trim() || '-',
      conditionLabel: (inspection.generalCondition || '').trim() || '-',
      problems: inspection.foundProblems ?? [],
      suggestedActions: inspection.suggestedActions ?? [],
      nextInspectionLabel: this.formatDate(inspection.nextInspection),
      sortTime: this.getInspectionSortTime(inspection)
    };
  }

  private getInspectionSortTime(inspection: BranddeurInspectie): number {
    const primary = Date.parse(inspection.inspectionDate || '');
    if (!Number.isNaN(primary)) {
      return primary;
    }

    const fallback = Date.parse(inspection.createdAt || '');
    if (!Number.isNaN(fallback)) {
      return fallback;
    }

    return 0;
  }

  private async openBuildingSelection(reportVariant: ReportVariant): Promise<void> {
    if (this.isGenerating() || this.isLoadingBuildings()) {
      return;
    }

    this.selectedReportVariant.set(reportVariant);
    this.isLoadingBuildings.set(true);
    this.generateError.set(null);

    try {
      const branddeuren = await firstValueFrom(this.branddeurenService.getAllBranddeuren());
      this.branddeurenById = new Map((branddeuren ?? []).map(branddeur => [branddeur._id, branddeur]));

      const uniqueBuildings = Array.from(
        new Set(
          (branddeuren ?? [])
            .map(branddeur => this.normalizeBuildingValue(branddeur.building))
            .filter((building): building is string => building.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, 'nl-NL'));

      if (uniqueBuildings.length === 0) {
        this.generateError.set('Er zijn geen gebouwen beschikbaar om op te filteren.');
        return;
      }

      this.buildingOptions.set(uniqueBuildings);
      this.selectedBuilding.set(uniqueBuildings[0]);
      this.isBuildingModalOpen.set(true);
    } catch (error) {
      console.error('Building selection failed', error);
      this.generateError.set('Gebouwopties ophalen is mislukt. Probeer het opnieuw.');
    } finally {
      this.isLoadingBuildings.set(false);
    }
  }

  protected reportVariantLabel(): string {
    return this.selectedReportVariant() === 'compact' ? 'compact' : 'uitgebreid';
  }

  protected onBuildingSelected(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }

    this.selectedBuilding.set(target.value);
  }

  protected closeBuildingModal(): void {
    this.isBuildingModalOpen.set(false);
  }

  protected async confirmBuildingAndDownload(): Promise<void> {
    const building = this.normalizeBuildingValue(this.selectedBuilding());
    const reportVariant = this.selectedReportVariant();

    if (!building || this.isGenerating()) {
      return;
    }

    this.isGenerating.set(true);
    this.generateError.set(null);

    try {
      const [inspections, checklistItems] = await Promise.all([
        firstValueFrom(this.branddeurenService.getBranddeurInspecties()),
        firstValueFrom(this.branddeurenService.getInspectieChecklistItems())
      ]);
      const checklistLookup = this.buildChecklistLookup(checklistItems ?? []);
      const filteredInspections = (inspections ?? []).filter(
        inspection => this.getInspectionBuilding(inspection) === building
      );

      if (filteredInspections.length === 0) {
        this.generateError.set('Er zijn geen inspecties beschikbaar voor het geselecteerde gebouw.');
        return;
      }

      const [pdfMakeModule, pdfFontsModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts')
      ]);

      const pdfMake = pdfMakeModule.default as PdfMakeInstance;
      this.configurePdfFonts(pdfMake, pdfFontsModule as unknown as VfsFontsModule);

      const documentDefinition = this.buildDocumentDefinition(
        filteredInspections,
        checklistLookup,
        building,
        reportVariant
      );
      pdfMake.createPdf(documentDefinition).download(this.getReportFileName(building, reportVariant));
      this.isBuildingModalOpen.set(false);
    } catch (error) {
      console.error('PDF generation failed', error);
      this.generateError.set('PDF genereren is mislukt. Probeer het opnieuw.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  private buildDocumentDefinition(
    inspections: BranddeurInspectie[],
    checklistLookup: Map<string, InspectieChecklistItem>,
    building: string,
    reportVariant: ReportVariant
  ): TDocumentDefinitions {
    const content: Content[] = [];
    const groupedInspections = this.groupInspectionsByFloorAndLocation(inspections);

    content.push({
      text: reportVariant === 'compact' ? 'Compact controleverslag Branddeuren' : 'Controleverslag Branddeuren',
      style: 'reportTitle'
    });
    content.push({ text: `Gebouw: ${building}`, style: 'sectionTitle', margin: [0, 0, 0, 8] });

    let isFirstFloor = true;

    for (const [floor, locations] of groupedInspections.entries()) {
      content.push({
        text: `Verdieping: ${floor}`,
        style: 'sectionTitle',
        margin: [0, isFirstFloor ? 6 : 14, 0, 6]
      });

      for (const [location, locationInspections] of locations.entries()) {
        content.push({ text: `Locatie: ${location}`, style: 'subSectionTitle', margin: [0, 8, 0, 6] });

        locationInspections
          .slice()
          .sort((a, b) => this.getDoorLabel(a).localeCompare(this.getDoorLabel(b), 'nl-NL'))
          .forEach((inspection, index) => {
            const sectionContent = reportVariant === 'compact'
              ? this.buildCompactInspectionContent(inspection)
              : this.buildInspectionContent(inspection, checklistLookup);

            if (index > 0) {
              sectionContent.unshift({ text: '', margin: [0, 4, 0, 4] });
            }

            content.push(...sectionContent);
          });
      }

      isFirstFloor = false;
    }

    return {
      pageSize: 'A4',
      pageMargins: [26, 36, 26, 36],
      content,
      styles: {
        reportTitle: {
          fontSize: 19,
          bold: true,
          color: '#2f5f96',
          alignment: 'center',
          margin: [0, 0, 0, 22]
        },
        sectionTitle: {
          fontSize: 14,
          bold: true,
          color: '#4f7fbe',
          margin: [0, 16, 0, 8]
        },
        subSectionTitle: {
          fontSize: 11,
          bold: true,
          color: '#4f7fbe',
          margin: [0, 14, 0, 6]
        },
        labelCell: {
          fontSize: 10,
          bold: true
        },
        valueCell: {
          fontSize: 10
        },
        tableHeader: {
          fontSize: 10,
          bold: true
        },
        checklistCell: {
          fontSize: 10
        },
        checklistMark: {
          fontSize: 12,
          alignment: 'center'
        },
        listItem: {
          fontSize: 10,
          margin: [0, 0, 0, 2]
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10
      }
    };
  }

  private configurePdfFonts(pdfMake: PdfMakeInstance, pdfFontsModule: VfsFontsModule): void {
    const vfs = this.resolveVfs(pdfFontsModule);

    if (vfs) {
      if (typeof pdfMake.addVirtualFileSystem === 'function') {
        pdfMake.addVirtualFileSystem(vfs);
      } else {
        pdfMake.vfs = vfs;
      }
    }

    const fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };

    if (typeof pdfMake.setFonts === 'function') {
      pdfMake.setFonts(fonts);
      return;
    }

    if (typeof pdfMake.addFonts === 'function') {
      pdfMake.addFonts(fonts);
    }
  }

  private resolveVfs(pdfFontsModule: VfsFontsModule): Record<string, string> | undefined {
    const candidates: unknown[] = [
      pdfFontsModule.default?.pdfMake?.vfs,
      pdfFontsModule.default?.vfs,
      pdfFontsModule.pdfMake?.vfs,
      pdfFontsModule.vfs,
      pdfFontsModule.default,
      pdfFontsModule,
    ];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') {
        continue;
      }

      const record = candidate as Record<string, unknown>;
      if (typeof record['Roboto-Regular.ttf'] === 'string') {
        return record as Record<string, string>;
      }
    }

    return undefined;
  }

  private buildInspectionContent(
    inspection: BranddeurInspectie,
    checklistLookup: Map<string, InspectieChecklistItem>
  ): Content[] {
    const doorLabel = this.getDoorLabel(inspection);
    const content: Content[] = [
      { text: `Algemene gegevens inspectie ${doorLabel}`, style: 'subSectionTitle' },
      this.buildGeneralInfoTable(inspection),
      { text: 'Controlepunten', style: 'subSectionTitle' }
    ];

    const groupedChecklistItems = this.groupChecklistItemsByCategory(
      inspection.checkListItems || [],
      checklistLookup
    );
    for (const [categoryLabel, items] of groupedChecklistItems.entries()) {
      content.push({ text: categoryLabel, style: 'subSectionTitle' });
      content.push(this.buildChecklistTable(items, checklistLookup));
    }

    content.push({ text: 'Vastgestelde afwijkingen', style: 'subSectionTitle' });
    if (inspection.foundProblems.length > 0) {
      content.push({
        stack: inspection.foundProblems.map(problem => ({ text: `• ${problem}`, style: 'listItem' }))
      });
    } else {
      content.push({ text: '/', style: 'listItem' });
    }

    content.push({ text: 'Aanbevolen corrigerende acties', style: 'subSectionTitle' });
    if (inspection.suggestedActions.length > 0) {
      content.push({
        stack: inspection.suggestedActions.map(action => ({ text: `• ${action}`, style: 'listItem' }))
      });
    } else {
      content.push({ text: '/', style: 'listItem' });
    }

    return content;
  }

  private buildCompactInspectionContent(inspection: BranddeurInspectie): Content[] {
    const content: Content[] = [
      { text: `Branddeur ${this.getDoorLabel(inspection)}`, style: 'subSectionTitle' },
      {
        text: `Status: ${inspection.inspectionResult?.statusValue || '-'}`,
        style: 'valueCell',
        margin: [0, 0, 0, 6]
      },
      { text: 'Vastgestelde afwijkingen', style: 'subSectionTitle' }
    ];

    if (inspection.foundProblems.length > 0) {
      content.push({
        stack: inspection.foundProblems.map(problem => ({ text: `• ${problem}`, style: 'listItem' }))
      });
    } else {
      content.push({ text: '/', style: 'listItem' });
    }

    content.push({ text: 'Aanbevolen corrigerende acties', style: 'subSectionTitle' });
    if (inspection.suggestedActions.length > 0) {
      content.push({
        stack: inspection.suggestedActions.map(action => ({ text: `• ${action}`, style: 'listItem' }))
      });
    } else {
      content.push({ text: '/', style: 'listItem' });
    }

    return content;
  }

  private groupInspectionsByFloorAndLocation(
    inspections: BranddeurInspectie[]
  ): Map<string, Map<string, BranddeurInspectie[]>> {
    const grouped = new Map<string, Map<string, BranddeurInspectie[]>>();

    for (const inspection of inspections) {
      const floor = this.getInspectionFloor(inspection);
      const location = this.getInspectionLocation(inspection);

      if (!grouped.has(floor)) {
        grouped.set(floor, new Map());
      }

      const locationGroups = grouped.get(floor)!;
      if (!locationGroups.has(location)) {
        locationGroups.set(location, []);
      }

      locationGroups.get(location)!.push(inspection);
    }

    const sortedFloors = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'nl-NL'));

    return new Map(
      sortedFloors.map(([floor, locations]) => {
        const sortedLocations = Array.from(locations.entries())
          .sort(([a], [b]) => a.localeCompare(b, 'nl-NL'));

        return [floor, new Map(sortedLocations)];
      })
    );
  }

  private buildGeneralInfoTable(inspection: BranddeurInspectie): ContentTable {
    const body: TableCell[][] = [
      [
        { text: 'Onderdeel', style: 'tableHeader' },
        { text: 'Informatie', style: 'tableHeader' }
      ],
      [
        { text: 'Datum inspectie', style: 'labelCell' },
        { text: this.formatDate(inspection.inspectionDate), style: 'valueCell' }
      ],
      [
        { text: 'Uitgevoerd door', style: 'labelCell' },
        { text: inspection.inspectorName || '-', style: 'valueCell' }
      ],
      [
        { text: 'Aanwezige verantwoordelijke', style: 'labelCell' },
        { text: inspection.supervisor || '-', style: 'valueCell' }
      ],
      [
        { text: 'Volgende inspectiedatum', style: 'labelCell' },
        { text: this.formatDate(inspection.nextInspection), style: 'valueCell' }
      ],
      [
        { text: 'Type inspectie', style: 'labelCell' },
        { text: inspection.inspectionType || '-', style: 'valueCell' }
      ],
      [
        { text: 'Algemene staat', style: 'labelCell' },
        { text: inspection.generalCondition || '-', style: 'valueCell' }
      ],
      [
        { text: 'Inspectie resultaat', style: 'labelCell' },
        { text: inspection.inspectionResult?.statusValue || '-', style: 'valueCell' }
      ]
    ];

    return {
      table: {
        headerRows: 1,
        widths: ['48%', '52%'],
        body
      },
      layout: {
        hLineWidth: () => 0.7,
        vLineWidth: () => 0.7,
        hLineColor: () => '#5f5f5f',
        vLineColor: () => '#5f5f5f',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 5,
        paddingBottom: () => 5
      },
      margin: [0, 0, 0, 8]
    };
  }

  private buildChecklistTable(
    items: CheckListItemResult[],
    checklistLookup: Map<string, InspectieChecklistItem>
  ): ContentTable {
    const body: TableCell[][] = [
      [
        { text: 'Controlepunt', style: 'tableHeader' },
        { text: 'Ja', style: 'tableHeader' },
        { text: 'Nee', style: 'tableHeader' }
      ],
      ...items.map(item => {
        const isYes = this.normalizeChecklistValue(item.value);

        return [
          { text: this.getChecklistItemLabel(item, checklistLookup), style: 'checklistCell' },
          { text: isYes ? 'v' : '', style: 'checklistMark' },
          { text: isYes ? '' : 'v', style: 'checklistMark' }
        ];
      })
    ];

    return {
      table: {
        headerRows: 1,
        widths: ['58%', '21%', '21%'],
        body
      },
      layout: {
        hLineWidth: () => 0.7,
        vLineWidth: () => 0.7,
        hLineColor: () => '#5f5f5f',
        vLineColor: () => '#5f5f5f',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 5,
        paddingBottom: () => 5
      }
    };
  }

  private getDoorLabel(inspection: BranddeurInspectie): string {
    if (typeof inspection.branddeurId === 'string') {
      const branddeur = this.branddeurenById.get(inspection.branddeurId);
      return branddeur?.name || inspection.branddeurId;
    }

    const populatedBranddeur = inspection.branddeurId as unknown as { name?: string; _id?: string };
    return populatedBranddeur.name || populatedBranddeur._id || '-';
  }

  private getInspectionBranddeurId(inspection: BranddeurInspectie): string | undefined {
    if (typeof inspection.branddeurId === 'string') {
      return inspection.branddeurId;
    }

    const populatedBranddeur = inspection.branddeurId as unknown as { _id?: string };
    return populatedBranddeur._id;
  }

  private getInspectionBuilding(inspection: BranddeurInspectie): string {
    const branddeurId = this.getInspectionBranddeurId(inspection);
    if (!branddeurId) {
      return '';
    }

    const branddeur = this.branddeurenById.get(branddeurId);
    return this.normalizeBuildingValue(branddeur?.building);
  }

  private getInspectionFloor(inspection: BranddeurInspectie): string {
    const branddeurId = this.getInspectionBranddeurId(inspection);
    if (!branddeurId) {
      return 'Onbekende verdieping';
    }

    const branddeur = this.branddeurenById.get(branddeurId);
    const floor = (branddeur?.floor || '').trim();
    return floor || 'Onbekende verdieping';
  }

  private getInspectionLocation(inspection: BranddeurInspectie): string {
    const branddeurId = this.getInspectionBranddeurId(inspection);
    if (!branddeurId) {
      return 'Onbekende locatie';
    }

    const branddeur = this.branddeurenById.get(branddeurId);
    const location = (branddeur?.location || '').trim();
    return location || 'Onbekende locatie';
  }

  private normalizeBuildingValue(building: string | undefined): string {
    return (building || '').trim();
  }

  private getReportFileName(building: string, reportVariant: ReportVariant): string {
    const slug = building
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const reportType = reportVariant === 'compact' ? 'compact' : 'uitgebreid';
    return `controleverslag-branddeuren-${reportType}-${slug || 'gebouw'}.pdf`;
  }

  private buildChecklistLookup(items: InspectieChecklistItem[]): Map<string, InspectieChecklistItem> {
    return new Map(items.map(item => [item._id, item]));
  }

  private groupChecklistItemsByCategory(
    items: CheckListItemResult[],
    checklistLookup: Map<string, InspectieChecklistItem>
  ): Map<string, CheckListItemResult[]> {
    const grouped = new Map<string, CheckListItemResult[]>();

    for (const item of items) {
      const category = this.getChecklistCategoryLabel(item.itemId, checklistLookup);
      const existing = grouped.get(category);

      if (existing) {
        existing.push(item);
        continue;
      }

      grouped.set(category, [item]);
    }

    return grouped;
  }

  private getChecklistCategoryLabel(
    itemId: CheckListItemResult['itemId'],
    checklistLookup: Map<string, InspectieChecklistItem>
  ): string {
    const checklistItem = this.resolveChecklistItem(itemId, checklistLookup);
    const category = checklistItem?.category;

    if (!category) {
      return 'Checklist';
    }

    if (typeof category === 'string') {
      return category || 'Checklist';
    }

    return category.value || category.code || 'Checklist';
  }

  private getChecklistItemLabel(
    item: CheckListItemResult,
    checklistLookup: Map<string, InspectieChecklistItem>
  ): string {
    const checklistItem = this.resolveChecklistItem(item.itemId, checklistLookup);
    if (checklistItem) {
      return checklistItem.displayValue || checklistItem._id;
    }

    if (typeof item.itemId === 'string') {
      return item.itemId;
    }

    return item.itemId.displayValue || item.itemId._id;
  }

  private resolveChecklistItem(
    itemId: CheckListItemResult['itemId'],
    checklistLookup: Map<string, InspectieChecklistItem>
  ): InspectieChecklistItem | undefined {
    if (typeof itemId === 'string') {
      return checklistLookup.get(itemId);
    }

    if (itemId.category && typeof itemId.category !== 'string') {
      return itemId;
    }

    return checklistLookup.get(itemId._id) || itemId;
  }

  private normalizeChecklistValue(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'ja' || normalized === 'yes';
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return Boolean(value);
  }

  private formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return '-';
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}
