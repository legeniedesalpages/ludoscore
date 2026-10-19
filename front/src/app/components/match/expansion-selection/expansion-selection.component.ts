import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatIconModule } from '@angular/material/icon'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { forkJoin } from 'rxjs'
import { Game, SelectingGame } from 'src/app/core/model/game.model'
import { MatchModel } from 'src/app/core/model/match.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { MatchService } from 'src/app/core/services/match/match.service'
import { CancelMatchCreation, SetMatchExpansions } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { LayoutComponent } from '../../layout/layout.component'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { expansionCandidates } from 'src/app/core/utils/game-expansions'


@Component({
  templateUrl: './expansion-selection.component.html',
  styleUrls: ['./expansion-selection.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule, LayoutComponent, LoadingSpinnerModule]
})
export class ExpansionSelectionComponent implements OnInit {

  private store = inject(Store)
  private gameService = inject(GameService)
  private matchService = inject(MatchService)

  protected readonly loading = signal(true)
  protected readonly baseGame = signal<Game | undefined>(undefined)
  protected readonly candidates = signal<SelectingGame[]>([])
  protected readonly selectedIds = signal<ReadonlySet<number>>(new Set())
  protected readonly fromPreviousMatch = signal(false)
  private alreadyChosen = false

  ngOnInit(): void {
    const match = this.store.selectSnapshot<MatchModel>(MatchState.match)
    if (!match) {
      this.store.dispatch(new Navigate(['game-selection'], {}, { replaceUrl: true }))
      return
    }
    const baseGame = match.baseGame ?? match.game
    this.baseGame.set(baseGame)
    this.alreadyChosen = match.expansions !== undefined

    forkJoin([this.gameService.listAllGames(), this.matchService.findLastExpansions(baseGame.id)]).subscribe(([games, last]) => {
      const candidates = expansionCandidates(games, baseGame)
      if (candidates.length === 0) {
        this.store.dispatch(new SetMatchExpansions([], false)).subscribe(() =>
          this.store.dispatch(new Navigate(['player-selection'], {}, { replaceUrl: true })))
        return
      }
      const candidateIds = new Set(candidates.map(candidate => candidate.id))
      const defaultIds = this.alreadyChosen ? match.expansions!.map(expansion => expansion.id) : last.expansionIds
      this.fromPreviousMatch.set(!this.alreadyChosen && last.hasPreviousMatch)
      this.candidates.set(candidates)
      this.selectedIds.set(new Set(defaultIds.filter(id => candidateIds.has(id))))
      this.loading.set(false)
    })
  }

  protected toggle(expansion: Game): void {
    const selected = new Set(this.selectedIds())
    if (!selected.delete(expansion.id)) selected.add(expansion.id)
    this.selectedIds.set(selected)
  }

  protected details(expansion: SelectingGame): string {
    const details = []
    if (expansion.additionalPlayers) details.push(`+${expansion.additionalPlayers} joueur${expansion.additionalPlayers > 1 ? 's' : ''}`)
    details.push(this.playedMatches(expansion))
    if (!expansion.inLibrary) details.push('Pas dans votre ludothèque')
    return details.join(' - ')
  }

  private playedMatches(expansion: SelectingGame): string {
    const personal = expansion.personalPlayedMatchCount ?? 0
    const total = expansion.playedMatchCount ?? 0
    if (total === 0) return 'Jamais jouée'
    const label = `${personal === 0 ? 'Aucune' : personal} partie${personal > 1 ? 's' : ''} jouée${personal > 1 ? 's' : ''} par vous`
    return total > personal ? `${label} (${total} au total)` : label
  }

  protected validate(): void {
    const expansions = this.candidates().filter(candidate => this.selectedIds().has(candidate.id))
    this.store.dispatch(new SetMatchExpansions(expansions, true)).subscribe(() =>
      this.store.dispatch(new Navigate(['player-selection'], {}, { replaceUrl: this.alreadyChosen })))
  }

  protected back(): void {
    if (this.alreadyChosen) {
      this.store.dispatch(new Navigate(['player-selection'], {}, { replaceUrl: true }))
      return
    }
    this.store.dispatch(new CancelMatchCreation()).subscribe(() => this.store.dispatch(new Navigate(['game-selection'])))
  }
}
