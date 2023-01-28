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
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Select, State, Store } from '@ngxs/store';
import { PlayerEntity } from 'src/app/core/entity/player-entity.model';
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service';
import { AddPlayer, CancelMatchCreation, RemovePlayer } from 'src/app/core/state/match/match.action';
import { MatchState } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';
import { MatSelect } from '@angular/material/select';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { Player } from 'src/app/core/model/player.model';
import { map, tap } from 'rxjs/operators';

@Component({
  templateUrl: './player-selection.component.html',
  styleUrls: ['./player-selection.component.css']
})
export class PlayerSelectionComponent implements OnInit, OnDestroy {

  @ViewChild('playerSelector') public playerSelector!: MatSelect

  @Select(MatchState.players) playerChange!: Observable<Player[]>;

  public env = environment
  public loading: boolean = true
  public gameTitle: string = ""
  public choosablePlayers!: PlayerEntity[]

  constructor(private store: Store, private router: Router, private playerCrudService: PlayerCrudService) {
  }

  ngOnInit(): void {
    this.loading = true

    forkJoin({
      state: this.store.selectOnce(MatchState),
      allPlayers: this.playerCrudService.findAll()
    }).subscribe(actions => {
      this.gameTitle = actions.state.gameTitle
      this.loading = false

      this.playerChange.subscribe(x => {
        this.store.selectOnce(MatchState).subscribe(t => {
          const ids = t.players.map((y: PlayerEntity) => y.id)
          this.choosablePlayers = actions.allPlayers.filter(x => !ids.includes(x.id))
        })
      })
    })
  }

  ngOnDestroy(): void {
    // TODO : unsubscribe
  }

  public cancelMatchCreation() {
    this.store.dispatch(new CancelMatchCreation()).subscribe(() => this.router.navigate(['']))
  }

  public cancelGameSelection() {
    this.store.dispatch(new CancelMatchCreation()).subscribe(() => this.router.navigate(['game-selection']))
  }

  public actionPlayer(event: string | PlayerEntity) {
    if (event === 'search') {
      console.log("Recherche")
    } else if (event === 'team') {
      console.log("Equipe")
    } else {
      const player = event as PlayerEntity
      this.store.dispatch(new AddPlayer(player.id, player.pseudo, player.gravatar)).subscribe(() => {
        this.playerSelector.value = ""
      })
    }
  }

  public deleteAction(player: Player) {
    this.store.dispatch(new RemovePlayer(player.id))
  }
}
