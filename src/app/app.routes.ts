import { Routes } from '@angular/router';
import { FireDoorsOverview } from './components/fire-doors/fire-doors-overview/fire-doors-overview';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'branddeuren-overzicht'
	},
	{
		path: 'branddeuren-overzicht',
		component: FireDoorsOverview
	}
];
