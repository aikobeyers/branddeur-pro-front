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
		component: FireDoorsOverview,
		title: 'Branddeuren'
	},
	{
		path: 'gebouwen',
		component: BuildingsOverview,
		title: 'Gebouwen'
	},
	{
		path: 'inspecties-overzicht',
		component: InspectionsOverviewComponent,
		title: 'Inspecties'
	},
	{
		path: 'inspecties-overzicht/:id',
		component: InspectionDetailComponent,
		title: 'Inspectie details'
	},
	{
		path: 'nieuwe-inspectie',
		component: NewInspectionComponent,
		title: 'Nieuwe inspectie',
		resolve: {
			checklistItems: inspectieChecklistItemsResolver
		}
	}
];
