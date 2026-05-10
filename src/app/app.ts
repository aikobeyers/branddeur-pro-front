import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNavigationComponent } from './components/side-navigation/side-navigation';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,SideNavigationComponent ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('BrandDeur PRO');
}
