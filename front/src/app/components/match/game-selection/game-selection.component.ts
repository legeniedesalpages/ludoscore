/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 19/12/2022 - 11:27:36
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 19/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Observable, tap } from 'rxjs'
import { Game, SelectingGame } from 'src/app/core/model/game.model'
import { MatchModel } from 'src/app/core/model/match.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { CreateMatch } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { formatTimeDifference } from 'src/app/core/services/misc/date.format'

import { displayPlayerName } from 'src/app/core/pipes/player-name.pipe'
import { MatSnackBar } from '@angular/material/snack-bar'

@Component({
  templateUrl: './game-selection.component.html',
  styleUrls: ['./game-selection.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class GameSelectionComponent implements OnInit {

  public loading: boolean = true
  public searching: boolean = false
  public searchText: string = ""
  public isFilterMenuOpen: boolean = false
  public gameList$!: Observable<SelectingGame[]>

  public onlyInLibraryFilter: boolean = true
  public onlyCooperativeFilter: boolean = false
  public twoPlayerOnlyFilter: boolean = false
  public moreThanFourPlayersFilter: boolean = false
  public lessThanThirtyMinutes: boolean = false
  public moreThanOneHourAndAHalfFilter: boolean = false

  constructor(private gameService: GameService, private store: Store, private changeDetectorRef: ChangeDetectorRef, private route: ActivatedRoute, private router: Router, private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.loading = true
    const params = this.route.snapshot.queryParamMap
    this.searchText = params.get('searchText') ?? ''
    this.searching = this.searchText.length > 0
    this.onlyInLibraryFilter = params.get('onlyInLibrary') !== 'false'
    this.onlyCooperativeFilter = params.get('onlyCooperative') === 'true'
    this.twoPlayerOnlyFilter = params.get('twoPlayerOnly') === 'true'
    this.moreThanFourPlayersFilter = params.get('moreThanFourPlayers') === 'true'
    this.lessThanThirtyMinutes = params.get('lessThanThirtyMinutes') === 'true'
    this.moreThanOneHourAndAHalfFilter = params.get('moreThanOneHourAndAHalf') === 'true'

    const match = this.store.selectSnapshot<MatchModel>(MatchState.match)
    if (match) {
      console.debug("Game already selected", match.game)
      this.store.dispatch(new Navigate(['player-selection']))
    } else {
      console.debug("Game not selected, fetch game list")
      this.gameList$ = this.gameService.listAllGames().pipe(tap(_ => {
        this.loading = false
        this.changeDetectorRef.markForCheck()
      }))
    }
  }

  public gameSelection(game: Game) {
    if (game.isExpansion) {
      this.snackBar.open('Choisissez un jeu de base pour démarrer une partie.', 'Fermer', { duration: 5000 })
      return
    }
    this.loading = true
    this.store.dispatch(new CreateMatch(game)).subscribe(_ => {
      // TODO : ajouter ici le joueur correspondant à l'utilisateur connecté
      this.store.dispatch(new Navigate(['player-selection']))
      this.changeDetectorRef.markForCheck()
    })
  }

  public line(game: SelectingGame): string {
    return this.line1(game) + "<br/>" + this.line2(game)
  }

  public line1(game: SelectingGame): string {
    let line1
    if (game.minPlayers === game.maxPlayers) {
      line1 = `${game.minPlayers} joueur${game.minPlayers > 1 ? 's' : ''}`
    } else {
      line1 = `${game.minPlayers} à ${game.maxPlayers} joueurs`
    }

    if (game.isOnlyCooperative) {
      line1 += " - Coopératif"
    }

    if (game.estimatedDurationInMinutes > 0) {
      if (game.estimatedDurationInMinutes > 59) {
        line1 += ` - ${Math.floor(game.estimatedDurationInMinutes / 60)}h${game.estimatedDurationInMinutes % 60}`
      } else {
        line1 += ` - ${game.estimatedDurationInMinutes} minutes`
      }
    }

    return line1
  }

  public line2(game: SelectingGame): string {
    let line2 = ""

    if (game.lastPlayed) {
      if (game.lastWinner) {
        line2 = `Dernier gagnant : <b>${displayPlayerName(game.lastWinner)}</b>`
      } else {
        line2 = "Dernière partie"
      }

      if (game.lastPlayed) {
        line2 += " " + formatTimeDifference(game.lastPlayed)
      }
    } else {
      line2 = "Pas encore joué"
    }

    return line2
  }

  public filterGames(games: SelectingGame[] | null): SelectingGame[] {
    const searchText = this.searchText.trim().toLocaleLowerCase()
    const now = Date.now()
    const newGameThreshold = 24 * 60 * 60 * 1000

    const filteredGames = (games ?? []).filter(game =>
      !game.isExpansion &&
      (!this.onlyInLibraryFilter || game.inLibrary) &&
      (!searchText || game.title.toLocaleLowerCase().includes(searchText)) &&
      (!this.onlyCooperativeFilter || game.isOnlyCooperative) &&
      (!this.twoPlayerOnlyFilter || (game.minPlayers === 2 && game.maxPlayers === 2)) &&
      (!this.moreThanFourPlayersFilter || game.maxPlayers > 4) &&
      (!this.lessThanThirtyMinutes || (game.estimatedDurationInMinutes > 0 && game.estimatedDurationInMinutes < 30)) &&
      (!this.moreThanOneHourAndAHalfFilter || game.estimatedDurationInMinutes > 90)
    )

    const newestRecentGame = filteredGames.reduce<SelectingGame | undefined>((newest, game) => {
      const createdAt = new Date(game.createdAt).getTime()
      const age = now - createdAt
      if (!Number.isFinite(createdAt) || age < 0 || age >= newGameThreshold) {
        return newest
      }

      return !newest || createdAt > new Date(newest.createdAt).getTime() ? game : newest
    }, undefined)

    return filteredGames.sort((a, b) => {
      if (a.id === newestRecentGame?.id) return -1
      if (b.id === newestRecentGame?.id) return 1

      return b.playedMatchCount - a.playedMatchCount ||
        a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }) ||
        a.id - b.id
    })
  }

  public cancelMatchCreation() {
    this.store.dispatch(new Navigate(['/']))
  }
}
