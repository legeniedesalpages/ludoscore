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
import { Component, Inject, OnInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { DoLogout } from 'src/app/core/state/auth/auth.actions';
import { AuthState } from 'src/app/core/state/auth/auth.state';
import { first, forkJoin, Observable } from 'rxjs';
import { Dispatch } from '@ngxs-labs/dispatch-decorator';
import { MatchState, MatchStateEnum } from 'src/app/core/state/match/match.state';
import { MatchService } from 'src/app/core/services/match/match.service';
import { Navigate } from '@ngxs/router-plugin';
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {

  @Select(AuthState.userName) loggedUser!: Observable<any>;
  @Select(AuthState.userId) loggedUserId!: Observable<number>;

  @Select(MatchState.state) matchState!: Observable<MatchStateEnum>;

  public matchStateEnum: typeof MatchStateEnum = MatchStateEnum;
  public loggingOut: boolean = false
  public loading: boolean
  public notAssociated: boolean

  constructor(private matchService: MatchService, private userService: UserCrudService, private store: Store, private dialog: MatDialog) {
    this.loading = true
    this.notAssociated = false
  }

  @Dispatch()
  public logout = () => {
    this.loggingOut = true
    return new DoLogout()
  }

  ngOnInit(): void {

    this.loggedUserId.subscribe(id => {
      forkJoin({
        user: this.userService.findOne(id),
        runningMatch: this.matchService.findRunningMatch()
      }).pipe(first()).subscribe(actions => {
        this.notAssociated = actions.user.playerId === null
        console.log("player id of the user:", actions.user.playerId, this.notAssociated)

        if (actions.user.firstConnection) {
          this.dialog.open(WelcomeDialogComponent)
          this.userService.updateFirstConnection(id).subscribe(() => console.log('first connection updated'))
        }

        console.log('running match', actions.runningMatch)
        this.loading = false
      })
    })
  }

  associatePlayer() {
    this.store.dispatch(new Navigate(['/edit-player/0']))
  }

  navigateToFindGame() {
    this.store.dispatch(new Navigate(['/find-game']))
  }

  navigateToManagePlayer() {
    this.store.dispatch(new Navigate(['/manage-player']))
  }
}

@Component({
  selector: 'welcome-dialog',
  templateUrl: './welcome-dialog/welcome-dialog.component.html',
  styleUrls: ['./welcome-dialog/welcome-dialog.component.css']
})
export class WelcomeDialogComponent {

  constructor(public dialogRef: MatDialogRef<WelcomeDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  close() {
    this.dialogRef.close()
  }
}
