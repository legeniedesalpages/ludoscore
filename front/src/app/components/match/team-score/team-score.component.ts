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
import { MatchModel, Team } from 'src/app/core/model/match.model'
import { Score, ScoreTag } from 'src/app/core/model/score.model'
import { ArithmeticExpressionEvaluator } from 'src/app/core/services/misc/arithmetic'
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
  public scoreDetails: Score[] = []

  public readonly teamScore: FormGroup
  public readonly scoreTemplate: ScoreTag[]
  public readonly complexScoreTemplate: boolean

  constructor(private store: Store, activatedRoute: ActivatedRoute, private actions: Actions) {

    this.scoreTemplate = this.store.selectSnapshot<MatchModel>(MatchState.match).game.scoreTags

    this.teamScore = new FormGroup({
      score: new FormControl('', [Validators.required, Validators.pattern("^[0-9\-]*$"), Validators.minLength(1)])
    })
    this.scoreTemplate.forEach(scoreTag => {
      const validators = []
      if (scoreTag.min != undefined) {
        validators.push(Validators.min(scoreTag.min))
      }
      if (scoreTag.max != undefined) {
        validators.push(Validators.max(scoreTag.max))
      }

      if (scoreTag.complex) {
        validators.push(Validators.pattern("^[0-9\-\*\/()+]*$"))
      } else {
        validators.push(Validators.pattern("^[0-9\-]*$"))
      }
      this.teamScore.addControl(scoreTag.category, new FormControl('', validators))
    })

    console.debug("Score template", this.scoreTemplate)
    if (this.scoreTemplate != undefined && this.scoreTemplate.length > 0) {
      this.complexScoreTemplate = true
    } else {
      this.complexScoreTemplate = false
    }

    activatedRoute.queryParams.pipe(first()).subscribe(params => {
      const teamId = params['id']
      const teams = this.store.selectSnapshot<Team[]>(MatchState.teams)

      this.team = teams.find(team => team.id == teamId)!
      console.debug("Team found, fill form with previous score data", this.team)

      this.teamScore.get("score")!.setValue(this.team.score)
      this.scoreTemplate.forEach(scoreTag => {
        this.teamScore.get(scoreTag.category)!.setValue(this.team.scoreDetails.find(score => score.categoryName == scoreTag.category)?.inputString)
      })
      this.valuechange(null)
    })
  }

  public valuechange(_: any) {
    this.teamScore.get("score")!
      .setValue(
        Object.keys(this.teamScore.controls).map(key => {

          let result
          const scoreTag = this.scoreTemplate.find(scoreTag => scoreTag.category == key)!
          if (key == "score") {
            result = 0
          } else {
            const value = this.teamScore.get(key)!.value
            if (scoreTag.complex) {
              try {
                result = new ArithmeticExpressionEvaluator().evaluateAll(value, true)
              } catch (e) {
                result = 0
              }
            } else {
              result = Number(value)
            }

            if (scoreTag.negatif) {
              result = result * -1
            }
          }

          let scoreDetails = this.scoreDetails.find(score => score.categoryName == key)
          if (!scoreDetails) {
            scoreDetails = {
              categoryName: key,
              value: result,
              inputString: this.teamScore.get(key)!.value
            }
            this.scoreDetails.push(scoreDetails)
          } else {
            scoreDetails.value = result
            scoreDetails.inputString = this.teamScore.get(key)!.value
          }
          return result

        }).reduce((acc: number, val: number) => acc + val, 0)
      )
  }

  public calc(category: string): string {
    const val = this.teamScore.get(category)!.value
    if (val) {
      try {
        const result = new ArithmeticExpressionEvaluator().evaluateAll(val, true)
        return result.toString()
      } catch (e) {
        return "..."
      }
    }
    return ""
  }

  ngOnInit(): void {
    this.actions.pipe(ofActionSuccessful(AddScoreToTeam)).subscribe(() => this.store.dispatch(new Navigate(['/match-end'])))
  }

  public onSubmit() {
    console.info("Submitting team score form")
    console.log(this.scoreDetails)
    this.store.dispatch(new AddScoreToTeam(this.team, this.teamScore.value.score, this.scoreDetails))
  }

  public returnToMatchEnd() {
    this.store.dispatch(new Navigate(['/match-end']))
  }
}
