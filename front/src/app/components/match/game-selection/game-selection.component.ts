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
import { Component, OnInit } from '@angular/core';
import { Navigate } from '@ngxs/router-plugin';
import { Select, Store } from '@ngxs/store';
import { Observable, tap } from 'rxjs';
import { GameEntity } from 'src/app/core/entity/game-entity.model';
import { GameCrudService } from 'src/app/core/services/crud/game-crud.service';
import { CreateMatch } from 'src/app/core/state/match/match.action';
import { MatchStateModel } from 'src/app/core/state/match/match.model';
import { MatchState } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';

@Component({
  templateUrl: './game-selection.component.html',
  styleUrls: ['./game-selection.component.css', '../../../core/css/list.css'],
})
export class GameSelectionComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>;

  public env = environment
  public loading: boolean = true
  public searching: boolean = false;
  public searchText: string = "";
  public isFilterMenuOpen: boolean = false;
  public gameList!: Observable<GameEntity[]>

  constructor(private gameCrudService: GameCrudService, private store: Store) {
  }

  ngOnInit(): void {
    this.loading = true
    this.searching = false;

    const gameId = this.store.selectSnapshot<number>(state => state.match.gameId)

    if (gameId > 0) {
      console.debug("Game already selected")
      this.store.dispatch(new Navigate(['player-selection']))
    } else {
      console.debug("Game not selected, fetch game list")
      this.gameList = this.gameCrudService.findAll().pipe(tap(() => this.loading = false))
    }
  }

  public gameSelection(game: GameEntity) {
    this.loading = true
    this.store.dispatch(new CreateMatch(game.id, game.title, game.imageId, game.minPlayers, game.maxPlayers)).subscribe(() =>
      this.store.dispatch(new Navigate(['player-selection']))
    )
  }

  public cancelMatchCreation() {
    this.store.dispatch(new Navigate(['/']))
  }
}
