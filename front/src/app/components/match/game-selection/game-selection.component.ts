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
import { Router } from '@angular/router';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { GameEntity } from 'src/app/core/entity/game-entity.model';
import { GameCrudService } from 'src/app/core/services/crud/game-crud.service';
import { CreateMatch } from 'src/app/core/state/match/match.action';
import { MatchStateModel } from 'src/app/core/state/match/match.model';
import { MatchState } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';
import { take } from 'rxjs/operators';

@Component({
  templateUrl: './game-selection.component.html',
  styleUrls: ['./game-selection.component.css'],
})
export class GameSelectionComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>;

  public env = environment
  public loading: boolean = true
  public gameList: GameEntity[] = []
  public searching: boolean = false;
  public searchText: string = "";
  public isFilterMenuOpen: boolean = false;

  constructor(private gameCrudService: GameCrudService, private store: Store, private router: Router) {
  }

  ngOnInit(): void {
    this.loading = true
    this.searching = false;

    this.matchState.pipe(take(1)).subscribe(state => {
      if (state.gameId > 0) {
        console.debug("Game already selected")
        this.router.navigate(['player-selection'])
      } else {
        this.gameCrudService.findAll().subscribe(res => {
          const myClonedArray = Object.assign([], res);
          this.gameList = res.concat(res, myClonedArray)
          this.loading = false
        })
      }
    })
  }

  public gameSelection(game: GameEntity) {
    this.store.dispatch(new CreateMatch(game.id, game.title, game.imageId)).subscribe(() => this.router.navigate(['player-selection']))
  }

  public cancelMatchCreation() {
    this.router.navigate(['/'])
  }
}
