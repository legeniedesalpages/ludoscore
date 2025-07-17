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
import { Component, OnInit } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Navigate } from '@ngxs/router-plugin'
import { Actions, ofActionCompleted, ofActionErrored, Select, Store } from '@ngxs/store'
import { Observable } from 'rxjs'
import { Team } from 'src/app/core/model/match.model'
import { MatchAborted, SaveMatchResult, SetWinningTeam } from 'src/app/core/state/match/match.action'
import { MatchStateModel } from 'src/app/core/state/match/match.model'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  templateUrl: './match-end.component.html',
  styleUrls: ['./match-end.component.css'],
  standalone: false
})
export class MatchEndComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>

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
      this.snackBar.open("Match enregistré ! à bientôt sur Ludoscore ;-)", 'Fermer', {
        duration: 5000
      })
      this.store.dispatch(new Navigate(['/']))
    })

    this.actions.pipe(ofActionCompleted(MatchAborted)).subscribe(() => {
      this.saving = false
      this.snackBar.open("Match abandonné !", 'Fermer', {
        duration: 5000
      })
      this.store.dispatch(new Navigate(['/']))
    })
  }

  public selectWiningTeam(team: Team) {
    console.log("choose wining team", team)
    this.saving = true
    this.store.dispatch(new SetWinningTeam(team)).subscribe(_ => this.saving = false)
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
