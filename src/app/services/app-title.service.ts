import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppTitleService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly appName = 'BrandDeur Pro';

  public constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateTitle();
      });

    this.updateTitle();
  }

  private updateTitle(): void {
    let route = this.activatedRoute;

    while (route.firstChild) {
      route = route.firstChild;
    }

    const pageTitle = route.snapshot.data['title'] as string | undefined;
    const fullTitle = pageTitle ? `${pageTitle} | ${this.appName}` : this.appName;

    this.title.setTitle(fullTitle);
  }
}
