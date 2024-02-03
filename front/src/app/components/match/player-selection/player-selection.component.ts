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
import { Actions, Select, Store, ofActionCompleted } from '@ngxs/store';
import { PlayerEntity } from 'src/app/core/entity/player-entity.model';
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service';
import { AddPlayer, AddTagToPlayer, CancelMatchCreation, LaunchMatch, RemovePlayer } from 'src/app/core/state/match/match.action';
import { MatchState, MatchStateEnum } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';
import { MatSelect } from '@angular/material/select';
import { forkJoin, Observable, Subscription, first } from 'rxjs';
import { Player } from 'src/app/core/model/player.model';
import { Navigate } from '@ngxs/router-plugin';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  public gameImage: string = ""
  public choosablePlayers!: PlayerEntity[]
  public minPlayers: number = 0
  public maxPlayers: number = 0
  public canContinue: boolean = false;

  private playerChangeSubscription!: Subscription

  constructor(private store: Store, private router: Router, private playerCrudService: PlayerCrudService, private actions: Actions, private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.loading = true

    this.actions.pipe(ofActionCompleted(LaunchMatch)).subscribe(() => {
      this.store.dispatch(new Navigate(['/']))
      this.snackBar.open("Partie créée", 'Fermer', {
        duration: 5000
      })
    })

    forkJoin({
      match: this.store.selectOnce(MatchState),
      allPlayers: this.playerCrudService.findAll()
    }).pipe(first()).subscribe(actions => {
      this.gameTitle = actions.match.title
      this.gameImage = actions.match.image
      this.minPlayers = actions.match.minPlayers
      this.maxPlayers = actions.match.maxPlayers
      this.loading = false

      this.playerChangeSubscription = this.playerChange.subscribe(players => {
        this.canContinue = players.length >= this.minPlayers
        const ids = players.map(player => player.id)
        this.choosablePlayers = actions.allPlayers.filter(x => !ids.includes(x.id))
      })
    })
  }

  ngOnDestroy(): void {
    if (this.playerChangeSubscription) {
      this.playerChangeSubscription.unsubscribe()
    }
  }

  public cancelMatchCreation() {
    this.store.dispatch(new CancelMatchCreation()).pipe(first()).subscribe(() => this.store.dispatch(new Navigate(['/'])))
  }

  public cancelGameSelection() {
    this.store.dispatch(new CancelMatchCreation()).pipe(first()).subscribe(() => this.store.dispatch(new Navigate(['game-selection'])))
  }

  public selectPlayer(event: string | PlayerEntity) {
    if (event === 'search') {
      console.log("Recherche")
    } else if (event === 'team') {
      console.log("Equipe")
    } else {
      const player = event as PlayerEntity
      this.store.dispatch(new AddPlayer(player.id, player.pseudo, player.gravatar)).pipe(first()).subscribe(() => {
        this.playerSelector.value = ""
      })
    }
  }

  public deleteAction(player: Player) {
    this.store.dispatch(new RemovePlayer(player.id))
  }

  public actionPlayer(player: Player) {
    this.store.dispatch(new AddTagToPlayer(player.id, "un tag"))
  }

  public launchMatch() {
    this.store.dispatch(new LaunchMatch())
  }
}
