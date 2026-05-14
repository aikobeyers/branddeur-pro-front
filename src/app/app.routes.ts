import { Routes } from '@angular/router';
import { FireDoorsOverview } from './components/fire-doors/fire-doors-overview/fire-doors-overview';
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
		path: 'inspecties-overzicht',
		component: InspectionsOverviewComponent
	},
	{
		path: 'nieuwe-inspectie',
		component: NewInspectionComponent,
		resolve: {
			checklistItems: inspectieChecklistItemsResolver
		}
	}
];
