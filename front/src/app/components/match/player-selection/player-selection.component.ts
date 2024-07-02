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
import { AddPlayer, CancelMatchCreation, LaunchMatch, RemovePlayer } from 'src/app/core/state/match/match.action';
import { MatchState } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';
import { MatSelect } from '@angular/material/select';
import { forkJoin, Observable, Subscription, first, map } from 'rxjs';
import { Player } from 'src/app/core/model/player.model';
import { Navigate } from '@ngxs/router-plugin';
import { MatSnackBar } from '@angular/material/snack-bar';
import { COLORS, ColorTag, NO_COLOR } from 'src/app/core/model/color-tag.model';
import { MatchService } from 'src/app/core/services/match/match.service';

@Component({
  templateUrl: './player-selection.component.html',
  styleUrls: ['./player-selection.component.css']
})
export class PlayerSelectionComponent implements OnInit, OnDestroy {

  @ViewChild('playerSelector') public playerSelector!: MatSelect

  @Select(MatchState.players) playerChange!: Observable<Player[]>;

  public env = environment
  public loading: boolean = true
  public gameId: number = 0
  public gameTitle: string = ""
  public gameImage: string = ""
  public choosablePlayers!: PlayerEntity[]
  public minPlayers: number = 0
  public maxPlayers: number = 0
  public numberOfPlayers: number = 0
  public canContinue: boolean = false;
  public canAddPlayer: boolean = false;
  public lessThan2Players: boolean = true;
  public playerColors: ColorTag[] = []
  public choosableColors: ColorTag[] = []

  private playerChangeSubscription!: Subscription

  constructor(private store: Store, private router: Router, private playerCrudService: PlayerCrudService, private actions: Actions, private snackBar: MatSnackBar, private matchService: MatchService) {
  }

  ngOnInit(): void {
    this.loading = true

    this.actions.pipe(ofActionCompleted(LaunchMatch)).subscribe(() => {
      this.store.dispatch(new Navigate(['/match-display']))
      this.snackBar.open("Partie créée", 'Fermer', {
        duration: 5000
      })
    })

    forkJoin({
      match: this.store.selectOnce(MatchState),
      allPlayers: this.playerCrudService.findAll()
    }).pipe(first()).subscribe(actions => {
      this.gameId = actions.match.gameId
      this.gameTitle = actions.match.title
      this.gameImage = actions.match.image
      this.minPlayers = actions.match.minPlayers
      this.maxPlayers = actions.match.maxPlayers
      this.playerColors = actions.match.playerColors
      console.log("Couleurs pouvant être choisie par les joueurs", this.playerColors)
      this.loading = false

      this.playerChangeSubscription = this.playerChange.subscribe(players => {
        this.canContinue = players.length >= this.minPlayers
        this.canAddPlayer = players.length < this.maxPlayers
        this.numberOfPlayers = players.length
        this.lessThan2Players = players.length < 2
        const ids = players.map(player => player.id)
        this.choosablePlayers = actions.allPlayers.filter(x => !ids.includes(x.id))
        this.choosableColors = this.playerColors.filter(color => !players.map(p => p.color.name).includes(color.name))
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
      this.loading = true
      this.chooseColor(player).subscribe(color => {
        console.log("Couleur choisie", color)
        this.store.dispatch(new AddPlayer(player.id, player.pseudo, player.gravatar, color)).pipe(first()).subscribe(() => {
          if (this.playerSelector != null) {
            this.playerSelector.value = ""
          }
        })
        this.loading = false
      })
    }
  }

  public chooseColor(player: PlayerEntity): Observable<ColorTag> {
    return this.matchService.getPreviousMatchOfPlayer(player.id, this.gameId).pipe(map(e => {

      if (this.choosableColors.length === 0) {
        console.log("Aucune couleur disponible")
        return NO_COLOR
      }

      console.log("couleur encore disponible:",this.choosableColors)

      let colorFromPreviousMatch
      if (e.color != null) {
        colorFromPreviousMatch = COLORS.filter(color => color.name === e.color)[0]
      }

      let preferedColor
      let foundPreferedColor = this.playerColors.filter(color => color.name === player.preferedColor)
      console.log("couleur préféré du joueur:", player.preferedColor)
      if (foundPreferedColor.length > 0) {
        preferedColor = foundPreferedColor[0]
      }

      if (colorFromPreviousMatch != null && !this.choosableColors.includes(colorFromPreviousMatch)) {
        console.log("Prend la couleur de l'ancienne partie car disponible", colorFromPreviousMatch)
        return colorFromPreviousMatch
      } else if (preferedColor != null && this.choosableColors.includes(preferedColor)) {
        console.log("Prend la couleur préférée car disponible", preferedColor)
        return preferedColor
      }

      console.log("Prend une couleur aléatoire parmis celle restante")
      return this.choosableColors[Math.floor(Math.random() * this.choosableColors.length)]
    }))
  }


  public deleteAction(player: Player) {
    this.store.dispatch(new RemovePlayer(player.id))
  }

  public launchMatch() {
    this.store.dispatch(new LaunchMatch())
  }

  public showRandomToolbox() {
    this.store.dispatch(new Navigate(['/random-toolbox']))
  }

  public showWheel() {
    this.store.dispatch(new Navigate(['/wheel']))
  }
}
