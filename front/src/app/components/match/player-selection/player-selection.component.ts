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
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core'
import { Select, Store } from '@ngxs/store'
import { PlayerEntity } from 'src/app/core/entity/player-entity.model'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { AddPlayer, CancelMatchCreation, LaunchMatch, RemovePlayer, SwapPlayerPosition } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { environment } from 'src/environments/environment'
import { MatSelect } from '@angular/material/select'
import { Observable, Subscription, first, map } from 'rxjs'
import { Player } from 'src/app/core/model/player.model'
import { Navigate } from '@ngxs/router-plugin'
import { MatSnackBar } from '@angular/material/snack-bar'
import { COLORS, ColorTag, NO_COLOR } from 'src/app/core/model/color-tag.model'
import { MatchService } from 'src/app/core/services/match/match.service'
import { MatDialog } from '@angular/material/dialog'
import { PlayerDetailComponent } from '../player-detail/player-detail.component'
import { MatchStateModel } from 'src/app/core/state/match/match.model'
import { Game } from 'src/app/core/model/game.model'

@Component({
  templateUrl: './player-selection.component.html',
  styleUrls: ['./player-selection.component.css']
})
export class PlayerSelectionComponent implements OnInit, OnDestroy {

  public env = environment

  @ViewChild('playerSelector') public playerSelector!: MatSelect

  @Select(MatchState) matchState!: Observable<MatchStateModel>
  private matchChangeSubscription!: Subscription

  public loading: boolean = true
  public saving: boolean = false
  public canContinue: boolean = false
  public canAddPlayer: boolean = false
  public lessThan2Players: boolean = true
  public currentSwapOrderIsDownward: boolean = true

  public choosableColors: ColorTag[] = []
  public choosablePlayers!: PlayerEntity[]
  public numberOfPlayers: number = 0

  constructor(private store: Store, private playerCrudService: PlayerCrudService, private snackBar: MatSnackBar, private matchService: MatchService, private dialog: MatDialog) {
  }

  ngOnInit(): void {

    this.playerCrudService.findAll().subscribe(allPlayers => {
      this.loading = false

     this.matchChangeSubscription = this.matchState.subscribe(matchState => {
        this.canContinue = matchState.players.length >= matchState.game?.minPlayers!
        this.canAddPlayer = matchState.players.length < matchState.game?.maxPlayers!
        this.numberOfPlayers = matchState.players.length
        this.lessThan2Players = matchState.players.length < 2
        const ids = matchState.players.map(player => player.id)
        this.choosablePlayers = allPlayers.filter(x => !ids.includes(x.id))
        if (matchState.game?.playerColors != null) {
          this.choosableColors = matchState.game?.playerColors.filter(color => !matchState.players.map(p => p.color.name).includes(color.name))       
        }
      })
    })
  }

  ngOnDestroy(): void {
    if (this.matchChangeSubscription) {
      this.matchChangeSubscription.unsubscribe()
    }
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

  public swapPlayerPosition(firstPlayerIndex: number, secondPlayerIndex: number, isDownward: boolean) {
    let players: Player[] = this.store.selectSnapshot<Player[]>(MatchState.players)
    this.currentSwapOrderIsDownward = isDownward
    this.store.dispatch(new SwapPlayerPosition(players[firstPlayerIndex], players[secondPlayerIndex]))
  }

  public isDownwardArrowHidden(index: number): boolean {
    if (index == 0) {
      return false
    } else if (index === this.numberOfPlayers - 1) {
      return true
    } else if (this.currentSwapOrderIsDownward) {
      return false
    }
    return true
  }

  private chooseColor(player: PlayerEntity): Observable<ColorTag> {
    const game: Game = this.store.selectSnapshot<MatchStateModel>(MatchState).game!
    console.log("Game", game)
    return this.matchService.getPreviousMatchOfPlayer(player.id, game.id).pipe(map(e => {

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
      let foundPreferedColor = game.playerColors.filter((color: ColorTag) => color.name === player.preferedColor)
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

  public cancelMatchCreation() {
    this.store.dispatch(new CancelMatchCreation()).pipe(first()).subscribe(() => this.store.dispatch(new Navigate(['/'])))
  }

  public cancelGameSelection() {
    this.store.dispatch(new CancelMatchCreation()).pipe(first()).subscribe(() => this.store.dispatch(new Navigate(['game-selection'])))
  }

  public launchMatch() {
    this.saving = true
    this.store.dispatch(new LaunchMatch()).subscribe(() => {
      this.store.dispatch(new Navigate(['/match-display']))
      this.snackBar.open("Partie créée", 'Fermer', {
        duration: 5000
      })
    })
  }

  public showRandomToolbox() {
    this.store.dispatch(new Navigate(['/random-toolbox']))
  }

  public showWheel() {
    this.store.dispatch(new Navigate(['/wheel']))
  }

  public goToPlayerDetail(player: Player) {
    this.dialog.open(PlayerDetailComponent, { 
      data: player,
      width: '100%',
      maxWidth: '90vw',
    })
  }
}
