import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core'
import { A11yModule } from '@angular/cdk/a11y'
import { FormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Game, SelectingGame } from 'src/app/core/model/game.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { LayoutComponent } from '../../layout/layout.component'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'

type LibraryFilter = 'in' | 'played' | 'unplayed'
interface LibraryRow {
  game: SelectingGame
  context: boolean
  key: string
}

@Component({
  templateUrl: './game-library.component.html',
  styleUrls: ['./game-library.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, A11yModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    LoadingSpinnerModule,
    LayoutComponent
  ]
})
export class GameLibraryComponent {

  private store = inject(Store)
  private gameService = inject(GameService)
  private changeDetectorRef = inject(ChangeDetectorRef)

  public loading = true
  public games = signal<SelectingGame[]>([])
  public filter = signal<LibraryFilter>('in')
  public searching = signal(false)
  public searchText = signal('')

  public filteredGames = computed(() => {
    const text = this.searchText().trim().toLowerCase()
    const filter = this.filter()
    const parents = new Map(this.games().filter(game => !game.isExpansion).map(game => [game.bggId, game]))
    return this.games()
      .filter(game => filter === 'in'
        ? game.inLibrary
        : !game.inLibrary && (filter === 'played' ? game.personalPlayedMatchCount > 0 : game.personalPlayedMatchCount === 0))
      .filter(game => !text || game.title.toLowerCase().includes(text) ||
        (game.isExpansion && game.baseGameBggIds?.some(id => parents.get(id)?.title.toLowerCase().includes(text))))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
  })

  public rows = computed<LibraryRow[]>(() => {
    const filtered = this.filteredGames()
    const selectedIds = new Set(filtered.map(game => game.id))
    const parents = new Map(this.games().filter(game => !game.isExpansion).map(game => [game.bggId, game]))
    const groups = new Map<number, { game: SelectingGame, extensions: SelectingGame[] }>()
    for (const game of filtered) {
      if (!game.isExpansion) {
        const group = groups.get(game.bggId)
        groups.set(game.bggId, group ?? { game, extensions: [] })
        continue
      }
      const baseGames = [...new Set(game.baseGameBggIds ?? [])]
        .map(id => parents.get(id)).filter((parent): parent is SelectingGame => parent !== undefined)
      if (baseGames.length === 0) {
        groups.set(game.bggId, { game, extensions: [] })
      }
      for (const parent of baseGames) {
        const group = groups.get(parent.bggId) ?? { game: parent, extensions: [] }
        group.extensions.push(game)
        groups.set(parent.bggId, group)
      }
    }
    return [...groups.values()]
      .sort((a, b) => a.game.title.localeCompare(b.game.title, 'fr', { sensitivity: 'base' }))
      .flatMap(({ game, extensions }) => [
        { game, context: !selectedIds.has(game.id), key: `game-${game.id}` },
        ...extensions.map(extension => ({ game: extension, context: false, key: `${game.id}-${extension.id}` }))
      ])
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
    if (game.isExpansion) {
      const count = game.additionalPlayers ?? 0
      return count === 0 ? 'Aucun joueur supplémentaire' : `+${count} joueur${count > 1 ? 's' : ''} supplémentaire${count > 1 ? 's' : ''}`
    }
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
