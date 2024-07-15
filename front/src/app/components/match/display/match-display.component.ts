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
import { Component, OnDestroy, OnInit } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { Navigate } from '@ngxs/router-plugin'
import { Actions, Select, Store, ofActionSuccessful } from '@ngxs/store'
import { first, Observable } from 'rxjs'
import { MatchEnded } from 'src/app/core/state/match/match.action'
import { MatchStateModel } from 'src/app/core/state/match/match.model'
import { MatchState } from 'src/app/core/state/match/match.state'
import { TeamDetailComponent } from '../team-detail/team-detail.component'
import { MatchModel, Team } from 'src/app/core/model/match.model'

@Component({
  templateUrl: './match-display.component.html',
  styleUrls: ['./match-display.component.css'],
})
export class MatchDisplayComponent implements OnInit, OnDestroy {

  @Select(MatchState) matchState!: Observable<MatchStateModel>

  public elapsedTime: String
  public timer!: NodeJS.Timer

  constructor(private store: Store, private actions: Actions, private dialog: MatDialog) {
    this.elapsedTime = "00 heures, 00 minutes, 00 secondes"
    this.dialog.closeAll()
  }
  ngOnDestroy(): void {
    clearInterval(this.timer)
  }

  ngOnInit(): void {

    this.actions.pipe(ofActionSuccessful(MatchEnded)).pipe(first()).subscribe(() => this.store.dispatch(new Navigate(['/match-end'])))

    this.timer = setInterval(() => {
      const startDate = this.store.selectSnapshot<MatchModel>(MatchState.match).startedAt
      if (startDate) {
        let t = new Date().getTime() - new Date(startDate).getTime()
        let seconds = "" + Math.floor((t / 1000) % 60)
        let minutes = "" + Math.floor((t / (1000 * 60)) % 60)
        let hours = "" + Math.floor((t / (1000 * 60 * 60)) % 24)
        this.elapsedTime = hours.padStart(2, "0")  + " heures, " + minutes.padStart(2, "0") + " minutes, " + seconds.padStart(2, "0") + " secondes"
      }
    }, 1000)
  }

  public endGame() {
    this.store.dispatch(new MatchEnded(new Date()))
  }

  public goToTeamDetail(team: Team) {
    this.dialog.open(TeamDetailComponent, { 
      data: team,
      width: '90%',
      maxWidth: '100%'
    })
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }
}
