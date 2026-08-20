import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { LayoutComponent } from 'src/app/components/layout/layout.component'

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    LayoutComponent,
  ]
})
export class StatisticsComponent {
  private store = inject(Store)

  public cards = [
    {
      title: 'Vue d’ensemble',
      subtitle: 'Synthèse rapide des performances',
      icon: 'dashboard',
      route: '/statistics/overview',
      color: 'blue',
    },
    {
      title: 'Par jeu',
      subtitle: 'Durée, scores, vainqueurs et tendances',
      icon: 'casino',
      route: '/statistics/games',
      color: 'green',
    },
    {
      title: 'Par joueur',
      subtitle: 'Classements, victoires et habitudes',
      icon: 'group',
      route: '/statistics/players',
      color: 'orange',
    },
  ]

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }
}
