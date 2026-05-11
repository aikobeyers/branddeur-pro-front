import { Routes } from '@angular/router';
import { FireDoorsOverview } from './components/fire-doors/fire-doors-overview/fire-doors-overview';
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
		path: 'new-inspection',
		component: NewInspectionComponent,
		resolve: {
			checklistItems: inspectieChecklistItemsResolver
		}
	}
];
