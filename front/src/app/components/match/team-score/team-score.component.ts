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
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Actions, Select, Store, ofActionSuccessful } from '@ngxs/store'
import { Observable, first } from 'rxjs'
import { Team } from 'src/app/core/model/match.model'
import { AddScoreToTeam } from 'src/app/core/state/match/match.action'
import { MatchStateModel } from 'src/app/core/state/match/match.model'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  templateUrl: './team-score.component.html',
  styleUrls: ['./team-score.component.css'],
})
export class TeamScoreComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>

  public team!: Team

  public readonly teamScore: FormGroup

  constructor(private store: Store, activatedRoute: ActivatedRoute, private actions: Actions) {
    this.teamScore = new FormGroup({
      score: new FormControl('', [Validators.required, Validators.pattern("^[0-9\-]*$"), Validators.minLength(1)])
    })

    activatedRoute.queryParams.pipe(first()).subscribe(params => {
      const teamId = params['id']
      const teams = this.store.selectSnapshot<Team[]>(MatchState.teams)

      let team = teams.find(team => team.id == teamId)!
      console.debug("Team found", team)
      if (team.score != undefined) {
        this.teamScore.setValue({
          score: team.score,
        })
      }
    })
  }

  ngOnInit(): void {
    this.actions.pipe(ofActionSuccessful(AddScoreToTeam)).subscribe(() => this.store.dispatch(new Navigate(['/match-end'])))
  }

  public onSubmit() {
    console.info("Submitting team score form")
    this.store.dispatch(new AddScoreToTeam(this.team, this.teamScore.value.score))
  }

  public returnToMatchEnd() {
    this.store.dispatch(new Navigate(['/match-end']))
  }
}
