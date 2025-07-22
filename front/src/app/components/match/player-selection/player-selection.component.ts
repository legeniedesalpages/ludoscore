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
import { A11yModule } from '@angular/cdk/a11y'
import { ScrollingModule } from '@angular/cdk/scrolling'
import { CommonModule } from '@angular/common'
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatDividerModule } from '@angular/material/divider'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelect, MatSelectModule } from '@angular/material/select'
import { MatSnackBar } from '@angular/material/snack-bar'
import { RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Observable, Subscription, first } from 'rxjs'
import { Game } from 'src/app/core/model/game.model'
import { ChoosenTag, MatchModel, Team, TeamPlayer } from 'src/app/core/model/match.model'
import { Player } from 'src/app/core/model/player.model'
import { ColorTag, NO_COLOR } from 'src/app/core/model/tag.model'
import { PlayerService } from 'src/app/core/services/player/player.service'
import { AddTeam, CancelMatchCreation, LaunchMatch, RemoveTeam, SwapTeamPosition } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { environment } from 'src/environments/environment'
import { ConfirmationDialogComponent } from '../../layout/dialogue/confirmation.component'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { SwipeableModule } from '../../layout/swipeable/swipeable.module'
import { GameDetailComponent } from '../game-detail/game-detail.component'
import { TeamDetailComponent } from '../team-detail/team-detail.component'
import { TeamDetailModule } from '../team-detail/team-detail.module'
import { LayoutComponent } from '../../layout/layout.component'

@Component({
  templateUrl: './player-selection.component.html',
  styleUrls: ['./player-selection.component.css'],
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatSelectModule, MatDividerModule,
    A11yModule,
    FormsModule,
    LoadingSpinnerModule, SwipeableModule, ScrollingModule, TeamDetailModule,
    LayoutComponent
  ]
})
export class PlayerSelectionComponent implements OnInit, OnDestroy {

  public env = environment

  private store: Store = inject(Store)
  private playerService: PlayerService = inject(PlayerService)
  private snackBar: MatSnackBar = inject(MatSnackBar)
  private dialog: MatDialog = inject(MatDialog)

  @ViewChild('playerSelector') public playerSelector!: MatSelect

  public match$: Observable<MatchModel> = inject(Store).select(MatchState.match)
  private matchChangeSubscription!: Subscription

  public loading: boolean = true
  public saving: boolean = false
  public canContinue: boolean = false
  public canAddTeam: boolean = false
  public lessThan2Teams: boolean = true
  public currentSwapOrderIsDownward: boolean = true

  public choosableColors: ColorTag[] = []
  public choosablePlayers!: Player[]
  public numberOfTeams: number = 0

  ngOnInit(): void {

    this.playerService.listAllPlayers().subscribe(allPlayers => {
      this.loading = false

      this.matchChangeSubscription = this.match$.subscribe(match => {

        if (!match) {
          console.debug("Match have been erased")
          return
        }
        this.canContinue = match.teams.length >= match.game?.minPlayers!
        this.canAddTeam = match.teams.length < match.game?.maxPlayers!
        this.numberOfTeams = match.teams.length
        this.lessThan2Teams = match.teams.length < 2
        const ids = match.teams.flatMap(team => team.teamPlayers.map((teampPlayer: TeamPlayer) => teampPlayer.player.id))
        this.choosablePlayers = allPlayers.filter((player: Player) => !ids.includes(player.id))
        if (match.game?.playerColors != null) {
          this.choosableColors = match.game.playerColors.filter(color => !match.teams.map(team => team.color.name).includes(color.name))
        }
      })
    })
  }

  ngOnDestroy(): void {
    if (this.matchChangeSubscription) {
      this.matchChangeSubscription.unsubscribe()
    }
  }

  public selectPlayer(event: string | Player) {

    if (event === 'search') {
      console.debug("Search player")

    } else if (event === 'team') {
      console.debug("Team")

    } else {
      this.loading = true

      const player = event as Player
      const teamPlayer: TeamPlayer = {
        id: undefined,
        player: player
      }

      const team: Team = {
        id: undefined,
        name: player.pseudo,
        choosenTags: [],
        color: this.chooseColor(player),
        score: undefined,
        scoreDetails: [],
        teamPlayers: [teamPlayer]
      }

      this.store.dispatch(new AddTeam(team)).pipe(first()).subscribe(() => {
        if (this.playerSelector != null) {
          this.playerSelector.value = ""
          this.loading = false
        }
      })
    }
  }

  public swapTeamPosition(firstTeamIndex: number, secondTeamIndex: number, isDownward: boolean) {
    const teams = this.store.selectSnapshot<Team[]>(MatchState.teams)
    this.currentSwapOrderIsDownward = isDownward
    this.store.dispatch(new SwapTeamPosition(teams[firstTeamIndex], teams[secondTeamIndex]))
  }

  public isDownwardArrowHidden(index: number): boolean {
    if (index == 0) {
      return false
    } else if (index === this.numberOfTeams - 1) {
      return true
    } else if (this.currentSwapOrderIsDownward) {
      return false
    }
    return true
  }

  private chooseColor(player: Player): ColorTag {
    const game: Game = this.store.selectSnapshot<MatchModel>(MatchState.match).game!

    if (this.choosableColors.length === 0) {
      console.debug("Aucune couleur disponible")
      return NO_COLOR
    }

    console.debug("Colors not yet selected:", this.choosableColors)

    let preferedColor
    let foundPreferedColor = game.playerColors.filter(color => color.name === player.preferedColor.name)
    console.debug("Prefered color of first player of the team:", player.preferedColor)
    if (foundPreferedColor.length > 0) {
      preferedColor = foundPreferedColor[0]
    }

    if (preferedColor != null && this.choosableColors.includes(preferedColor)) {
      console.debug("Choose prefered color because it is available", preferedColor)
      return preferedColor
    }

    console.debug("Choose a random color among colors that have not been chosen yet")
    return this.choosableColors[Math.floor(Math.random() * this.choosableColors.length)]
  }

  public deleteAction(team: Team) {
    this.store.dispatch(new RemoveTeam(team))
  }

  public formatTagName(names: string[]): string {
    return names.filter(name => name != undefined).join(", ")
  }

  public categoryOrder(tag: ChoosenTag[]): ChoosenTag[] {
    return [...tag].sort((a: ChoosenTag, b: ChoosenTag) => a.category.localeCompare(b.category))
  }

  public launchMatch() {
    this.saving = true
    this.store.dispatch(new LaunchMatch()).subscribe({

      next: _ => {
        this.store.dispatch(new Navigate(['/match-display']))
        this.saving = false
        this.snackBar.open("Partie créée", 'Fermer', {
          duration: 5000
        })
      },

      error: (error) => {
        this.snackBar.open("Erreur lors de la création du match:" + error, 'Fermer', {
          duration: 15000
        })
        this.saving = false
      }
    })
  }


  public showRandomToolbox() {
    this.store.dispatch(new Navigate(['/random-toolbox']))
  }

  public showWheel() {
    this.store.dispatch(new Navigate(['/wheel']))
  }

  public goToTeamDetail(team: Team) {
    const game: Game = this.store.selectSnapshot<MatchModel>(MatchState.match).game!
    if (game.playerTags.length > 0 || game.playerColors.length > 0) {
      this.dialog.open(TeamDetailComponent, {
        data: team,
        width: '90%',
        maxWidth: '100%'
      })
    }
  }

  public goToGameDetail() {
    const game: Game = this.store.selectSnapshot<MatchModel>(MatchState.match).game!
    if (game.matchTags.length > 0) {
      this.dialog.open(GameDetailComponent, {
        width: '90%',
        maxWidth: '100%'
      })
    }
  }

  public cancelGameSelection() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message: "Ceci mettra fin à la création de la partie, toutes les données seront perdues."
      }
    })

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.store.dispatch(new CancelMatchCreation()).subscribe(() => this.store.dispatch(new Navigate(['game-selection'])))
      }
    })

  }
}