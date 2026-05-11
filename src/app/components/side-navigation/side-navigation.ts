import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-side-navigation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './side-navigation.html',
  styleUrl: './side-navigation.scss',
  imports: [RouterLink, RouterLinkActive]
})
export class SideNavigationComponent {}
