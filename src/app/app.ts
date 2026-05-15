import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNavigationComponent } from './components/side-navigation/side-navigation';
import { AppTitleService } from './services/app-title.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SideNavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly appTitleService = inject(AppTitleService);

  public constructor() {
    // Trigger service initialization in root app lifecycle.
    void this.appTitleService;
  }
}
