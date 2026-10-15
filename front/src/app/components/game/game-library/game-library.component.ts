import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core'
import { A11yModule } from '@angular/cdk/a11y'
import { FormsModule } from '@angular/forms'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Game } from 'src/app/core/model/game.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { LayoutComponent } from '../../layout/layout.component'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'

type LibraryFilter = 'all' | 'in' | 'out'

@Component({
  templateUrl: './game-library.component.html',
  styleUrls: ['./game-library.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, A11yModule,
    MatButtonModule, MatButtonToggleModule, MatIconModule,
    LoadingSpinnerModule,
    LayoutComponent
  ]
})
export class GameLibraryComponent {

  private store = inject(Store)
  private gameService = inject(GameService)
  private changeDetectorRef = inject(ChangeDetectorRef)

  public loading = true
  public games = signal<Game[]>([])
  public filter = signal<LibraryFilter>('all')
  public searching = signal(false)
  public searchText = signal('')

  public filteredGames = computed(() => {
    const text = this.searchText().trim().toLowerCase()
    const filter = this.filter()
    return this.games()
      .filter(game => filter === 'all' || (filter === 'in') === game.inLibrary)
      .filter(game => !text || game.title.toLowerCase().includes(text))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
  })

  public countInLibrary = computed(() => this.games().filter(game => game.inLibrary).length)

  constructor() {
    this.gameService.listAllGames().subscribe({
      next: games => {
        this.games.set(games)
        this.loading = false
        this.changeDetectorRef.markForCheck()
      },
      error: () => {
        this.loading = false
        this.changeDetectorRef.markForCheck()
      }
    })
  }

  public playersLabel(game: Game): string {
    return game.minPlayers === game.maxPlayers ? `${game.minPlayers} joueurs` : `${game.minPlayers} à ${game.maxPlayers} joueurs`
  }

  public edit(game: Game) {
    this.store.dispatch(new Navigate(['/game-editor', 'owned', game.bggId], { from: 'library' }))
  }

  public addGame() {
    this.store.dispatch(new Navigate(['/find-game']))
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }
}
