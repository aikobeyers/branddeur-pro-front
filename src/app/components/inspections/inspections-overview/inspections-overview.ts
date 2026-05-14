import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-inspections-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspections-overview.html',
  styleUrl: './inspections-overview.scss'
})
export class InspectionsOverviewComponent {}
