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
import { Select, Store } from '@ngxs/store'
import { Observable, tap } from 'rxjs'
import { Game } from 'src/app/core/model/game.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { CreateMatch } from 'src/app/core/state/match/match.action'
import { MatchStateModel } from 'src/app/core/state/match/match.model'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  templateUrl: './game-selection.component.html',
  styleUrls: ['./game-selection.component.css', '../../../core/css/list.css'],
})
export class GameSelectionComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>

  public loading: boolean = true
  public searching: boolean = false
  public searchText: string = ""
  public isFilterMenuOpen: boolean = false
  public gameList!: Observable<Game[]>

  constructor(private gameService: GameService, private store: Store) {
  }

  ngOnInit(): void {
    this.loading = true
    this.searching = false

    const matchState = this.store.selectSnapshot<MatchStateModel>(MatchState)
    if (matchState.match) {
      console.debug("Game already selected", matchState.match.game)
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

  public cancelMatchCreation() {
    this.store.dispatch(new Navigate(['/']))
  }
}
