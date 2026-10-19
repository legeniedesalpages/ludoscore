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
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { first, forkJoin } from 'rxjs'
import { PlayerEntity } from 'src/app/core/entity/player-entity.model'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service'
import { AuthState } from 'src/app/core/state/auth/auth.state'

@Component({
  selector: 'manage-player',
  templateUrl: './manage-player.component.html',
  styleUrls: ['./manage-player.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class ManagePlayerComponent implements OnInit {

  public playerEntities: PlayerEntity[]
  public loading: boolean = true
  public isAdmin: boolean = false
  public hideReplaced = true
  public loadError = ''
  public currentUserId = 0
  public currentPlayerId: number | null = null
  public personalPlayer?: PlayerEntity

  constructor(private store: Store, private playerService: PlayerCrudService, private userService: UserCrudService, private changeDetectorRef: ChangeDetectorRef) {
    this.playerEntities = []
  }

  ngOnInit(): void {
    this.currentUserId = this.store.selectSnapshot<number>(AuthState.userId)
    forkJoin({
      user: this.userService.findOne(this.currentUserId),
      playerEntities: this.playerService.findAll()
    }).pipe(first()).subscribe({ next: actions => {
      this.currentPlayerId = actions.user.playerId ?? null
      this.setPlayers(actions.playerEntities)
      this.loading = false
      this.isAdmin = actions.user.isAdmin
      this.changeDetectorRef.markForCheck()
    }, error: () => this.reportLoadError() })
  }

  public setHideReplaced(hide: boolean): void {
    if (!this.isAdmin || this.loading) return
    this.hideReplaced = hide
    this.reloadPlayers()
  }

  public reloadPlayers(): void {
    this.loading = true
    this.loadError = ''
    this.playerEntities = []
    this.personalPlayer = undefined
    this.changeDetectorRef.markForCheck()
    this.playerService.findAll(this.isAdmin && !this.hideReplaced).pipe(first()).subscribe({
      next: players => {
        this.setPlayers(players)
        this.loading = false
        this.changeDetectorRef.markForCheck()
      },
      error: () => this.reportLoadError(),
    })
  }

  private reportLoadError(): void {
    this.playerEntities = []
    this.personalPlayer = undefined
    this.loadError = 'Impossible de charger la liste des joueurs. Réessayez.'
    this.loading = false
    this.changeDetectorRef.markForCheck()
  }

  private setPlayers(players: readonly PlayerEntity[]): void {
    this.personalPlayer = players.find(player => player.id === this.currentPlayerId)
    this.playerEntities = players.filter(player => player.id !== this.currentPlayerId)
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }

  public editPlayer(id: number) {
    this.store.dispatch(new Navigate(['/edit-player', id]))
  }

  public createPlayer() {
    this.store.dispatch(new Navigate(['/edit-player/0']))
  }
}
