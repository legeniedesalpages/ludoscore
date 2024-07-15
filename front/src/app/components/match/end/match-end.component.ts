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
import { MatSnackBar } from '@angular/material/snack-bar'
import { Navigate } from '@ngxs/router-plugin'
import { Actions, ofActionCompleted, ofActionErrored, Select, Store } from '@ngxs/store'
import { Observable, Subscription, } from 'rxjs'
import { Team } from 'src/app/core/model/match.model'
import { MatchAborted, SaveMatchResult } from 'src/app/core/state/match/match.action'
import { MatchStateModel } from 'src/app/core/state/match/match.model'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  templateUrl: './match-end.component.html',
  styleUrls: ['./match-end.component.css'],
})
export class MatchEndComponent implements OnInit, OnDestroy {

  @Select(MatchState) matchState!: Observable<MatchStateModel>

  private subscription!: Subscription
  public saving: boolean = false

  constructor(private store: Store, private actions: Actions, private snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.actions.pipe(ofActionErrored(SaveMatchResult)).subscribe(_ => {
      this.snackBar.open("Erreur lors de l'enregistrement du match", 'Fermer', {
        duration: 10000
      })
    })

    this.actions.pipe(ofActionCompleted(SaveMatchResult)).subscribe(() => {
      this.saving = false
    })


    this.subscription = this.matchState.subscribe(matchState => {
      if (!matchState.match) {
        this.store.dispatch(new Navigate(['']))

      }
    })
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }

  public selectWiningTeam(team: Team) {
    console.log("choose wining team", team)
  }

  public setTeamScore(team: Team) {
    this.store.dispatch(new Navigate(['/team-score'], { "id": team.id }))
  }

  public endMatch() {
    this.saving = true
    this.store.dispatch(new SaveMatchResult()).subscribe(_ => this.saving = false)
  }

  public abortMatch() {
    this.saving = true
    this.store.dispatch(new MatchAborted())
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }
}
