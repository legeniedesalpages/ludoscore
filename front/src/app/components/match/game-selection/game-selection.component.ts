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
import { Component, OnInit } from '@angular/core'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Observable, tap } from 'rxjs'
import { Game, SelectingGame } from 'src/app/core/model/game.model'
import { MatchModel } from 'src/app/core/model/match.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { CreateMatch } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { DateTime } from 'luxon';
import dayjs from 'dayjs'

@Component({
  templateUrl: './game-selection.component.html',
  styleUrls: ['./game-selection.component.css', '../../../core/css/list.css'],
})
export class GameSelectionComponent implements OnInit {

  public loading: boolean = true
  public searching: boolean = false
  public searchText: string = ""
  public isFilterMenuOpen: boolean = false
  public gameList!: Observable<SelectingGame[]>

  public onlyCooperativeFilter: boolean = true

  constructor(private gameService: GameService, private store: Store) {
  }

  ngOnInit(): void {
    this.loading = true
    this.searching = false

    const match = this.store.selectSnapshot<MatchModel>(MatchState.match)
    if (match) {
      console.debug("Game already selected", match.game)
      this.store.dispatch(new Navigate(['player-selection']))
    } else {
      console.debug("Game not selected, fetch game list")
      this.gameList = this.gameService.listAllGames().pipe(tap(_ => this.loading = false))
    }
  }

  public gameSelection(game: Game) {
    this.loading = true
    this.store.dispatch(new CreateMatch(game)).subscribe(_ => {
      // TODO : ajouter ici le joueur correspondant à l'utilisateur connecté
      this.store.dispatch(new Navigate(['player-selection']))
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
        line2 = `Dernier gagnant : <b>${game.lastWinner}</b>`
      } else {
        line2 = "Dernière partie"
      }

      if (game.lastPlayed) {
        line2 += " " + this.getTimeDifference(game.lastPlayed)
      }
    } else {
      line2 = "Pas encore joué"
    }

    return line2
  }

  private getTimeDifference(date: Date): string {
    const now = dayjs()
    const inputDate = dayjs(date)

    const diffInYears = now.diff(inputDate, 'year')
    if (diffInYears >= 1) {
      return "il y a plus d'un an"
    }

    const diffInMonths = now.diff(inputDate, 'month')
    if (diffInMonths >= 1) {
      return `il y a ${diffInMonths} mois`
    }

    const diffInWeeks = now.diff(inputDate, 'week')
    if (diffInWeeks >= 1) {
      return `il y a ${diffInWeeks} semaine${diffInWeeks > 1 ? 's' : ''}`
    }

    const diffInDays = now.diff(inputDate, 'day')
    if (diffInDays > 1) {
      return `il y a ${diffInDays} jours`
    } else if (diffInDays === 1) {
      return "hier"
    }

    return "aujourd'hui"
  }

  public cancelMatchCreation() {
    this.store.dispatch(new Navigate(['/']))
  }
}
