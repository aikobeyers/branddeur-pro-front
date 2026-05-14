import { ChangeDetectionStrategy, Component, effect, inject, Injector, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-side-navigation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './side-navigation.html',
  styleUrl: './side-navigation.scss',
  imports: [RouterLink, RouterLinkActive]
})
export class SideNavigationComponent {
  private readonly injector = inject(Injector);
  protected readonly isMobileMenuOpen = signal(false);
  private readonly isMobileViewport = signal(false);

  public constructor() {
    effect((onCleanup) => {
      if (typeof window === 'undefined') {
        return;
      }

      const mediaQuery = window.matchMedia('(max-width: 1023px)');
      const syncViewport = () => this.isMobileViewport.set(mediaQuery.matches);

      syncViewport();
      mediaQuery.addEventListener('change', syncViewport);
      onCleanup(() => mediaQuery.removeEventListener('change', syncViewport));
    }, { injector: this.injector });

    effect(() => {
      if (!this.isMobileViewport() && this.isMobileMenuOpen()) {
        this.isMobileMenuOpen.set(false);
      }
    }, { injector: this.injector });

    effect(() => {
      if (typeof document === 'undefined') {
        return;
      }

      const shouldLockScroll = this.isMobileMenuOpen() && this.isMobileViewport();
      document.documentElement.style.overflow = shouldLockScroll ? 'hidden' : '';
      document.body.style.overflow = shouldLockScroll ? 'hidden' : '';
    }, { injector: this.injector });
  }

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
