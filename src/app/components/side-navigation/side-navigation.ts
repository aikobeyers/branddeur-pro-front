import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-side-navigation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './side-navigation.html',
  styleUrl: './side-navigation.scss',
  imports: [RouterLink, RouterLinkActive, NgIf]
})
export class SideNavigationComponent {
  protected readonly isMobileMenuOpen = signal(false);

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
