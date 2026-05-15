import { Routes } from '@angular/router';
import { FireDoorsOverview } from './components/fire-doors/fire-doors-overview/fire-doors-overview';
import { BuildingsOverview } from './components/gebouwen/buildings-overview/buildings-overview';
import { InspectionDetailComponent } from './components/inspections/inspection-detail/inspection-detail';
import { InspectionsOverviewComponent } from './components/inspections/inspections-overview/inspections-overview';
import { NewInspectionComponent } from './components/inspections/new-inspection/new-inspection';
import { inspectieChecklistItemsResolver } from './resolvers/inspectie-checklist-items.resolver';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'branddeuren-overzicht'
	},
	{
		path: 'branddeuren-overzicht',
		component: FireDoorsOverview
	},
	{
		path: 'gebouwen',
		component: BuildingsOverview
	},
	{
		path: 'inspecties-overzicht',
		component: InspectionsOverviewComponent
	},
	{
		path: 'inspecties-overzicht/:id',
		component: InspectionDetailComponent
	},
	{
		path: 'nieuwe-inspectie',
		component: NewInspectionComponent,
		resolve: {
			checklistItems: inspectieChecklistItemsResolver
		}
	}
];
