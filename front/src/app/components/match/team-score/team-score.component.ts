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
import { Component, OnInit, QueryList, ViewChildren } from '@angular/core'
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
  styleUrls: ['./team-score.component.css']
})
export class TeamScoreComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>

  @ViewChildren('aa') aa!: QueryList<any>;

  public team!: Team
  public scoreDetails: Score[] = []

  public readonly teamScoreFormGroup: FormGroup
  public readonly scoreTemplate: ScoreTag[]
  public readonly complexScoreTemplate: boolean
  public inputElement!: HTMLInputElement
  public timeout!: any

  constructor(private store: Store, activatedRoute: ActivatedRoute, private actions: Actions) {

    this.scoreTemplate = this.store.selectSnapshot<MatchModel>(MatchState.match).game.scoreTags

    this.teamScoreFormGroup = new FormGroup({
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
      this.teamScoreFormGroup.addControl(scoreTag.category, new FormControl('', validators))
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

      this.teamScoreFormGroup.get("score")!.setValue(this.team.score)
      this.scoreTemplate.forEach(scoreTag => {
        this.teamScoreFormGroup.get(scoreTag.category)!.setValue(this.team.scoreDetails.find(score => score.categoryName == scoreTag.category)?.inputString)
      })
      this.valuechange(null)
    })
  }

  public key(car: any) {
    if (this.inputElement) {
      const cursor = this.inputElement.selectionStart!
      if (car == "Backspace") {
        if (cursor > 0) {
          this.inputElement.value = this.inputElement.value.substring(0, cursor - 1) + this.inputElement.value.substring(cursor)
          this.inputElement.selectionStart = cursor - 1
          this.inputElement.selectionEnd = cursor - 1
          this.inputElement.focus()
          this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }

      } else if (car == "Enter") {



        for (let i = 0; i < this.aa.length; i++) {
          if (this.aa.toArray()[i].nativeElement == this.inputElement) {
            if (i+2 < this.aa.length) {
              this.aa.toArray()[i + 1].nativeElement.focus()
            } else {
              this.onSubmit()              
              console.error("validation !")
              if (this.timeout) {
                clearTimeout(this.timeout)
              }
            }
          }
        }

      } else {
        this.inputElement.value = this.inputElement.value.substring(0, cursor) + car + this.inputElement.value.substring(cursor)
        this.inputElement.selectionStart = cursor + 1
        this.inputElement.selectionEnd = cursor + 1
        this.inputElement.focus()
        this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      }

    }
  }

  public blur(event: any) {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    this.inputElement = event

    this.timeout = setTimeout(() => {
      this.inputElement = undefined!
    }, 300)
  }

  public valuechange(_: any) {
    this.teamScoreFormGroup.get("score")!
      .setValue(
        Object.keys(this.teamScoreFormGroup.controls).map(key => {

          let result
          const scoreTag = this.scoreTemplate.find(scoreTag => scoreTag.category == key)!
          if (key == "score") {
            result = 0
          } else {
            const value = this.teamScoreFormGroup.get(key)!.value
            if (scoreTag.complex) {
              try {
                result = new ArithmeticExpressionEvaluator().evaluateAll(value, true)
              } catch (e) {
                result = 0
              }
            } else {
              result = Number(value)
              if (Number.isNaN(result)) {
                result = 0
              }
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
              inputString: this.teamScoreFormGroup.get(key)!.value
            }
            this.scoreDetails.push(scoreDetails)
          } else {
            scoreDetails.value = result
            scoreDetails.inputString = this.teamScoreFormGroup.get(key)!.value
          }
          return result

        }).reduce((acc: number, val: number) => acc + val, 0)
      )
  }

  public calc(category: string): string {
    const val = this.teamScoreFormGroup.get(category)!.value
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

  public onKeydown(event: any) {
    event.preventDefault();
  }

  ngOnInit(): void {
    this.actions.pipe(ofActionSuccessful(AddScoreToTeam)).subscribe(() => this.store.dispatch(new Navigate(['/match-end'])))
  }

  public onSubmit() {
    console.info("Submitting team score form")
    console.log(this.scoreDetails)
    this.store.dispatch(new AddScoreToTeam(this.team, this.teamScoreFormGroup.value.score, this.scoreDetails))
  }

  public returnToMatchEnd() {
    this.store.dispatch(new Navigate(['/match-end']))
  }
}
