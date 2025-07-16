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
import { Actions, Store, ofActionSuccessful } from '@ngxs/store'
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
  standalone: false
})
export class TeamScoreComponent implements OnInit {

  @ViewChildren('inputScore') listOfInputScore!: QueryList<any>;

  public team!: Team
  public localMutableScoreDetails: Score[] = []

  public readonly teamScoreFormGroup: FormGroup
  public readonly scoreTemplate: ScoreTag[]
  public readonly complexScoreTemplate: boolean

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
    })
  }

  private key(caracter: any, inputElement: HTMLInputElement | HTMLTextAreaElement) {

    const cursor = inputElement.selectionStart!
    if (caracter == "Backspace") {
      if (cursor > 0) {
        inputElement.value = inputElement.value.substring(0, cursor - 1) + inputElement.value.substring(cursor)
        inputElement.selectionStart = cursor - 1
        inputElement.selectionEnd = cursor - 1
        // Déclencher la mise à jour après suppression
        this.triggerValueChangeFromActiveElement()
      }

    } else if (caracter == "Enter") {

      for (let i = 0; i < this.listOfInputScore.length; i++) {
        if (this.listOfInputScore.toArray()[i].nativeElement == inputElement) {
          if (i + 2 < this.listOfInputScore.length) {
            this.listOfInputScore.toArray()[i + 1].nativeElement.focus()
          } else {
            this.onSubmit()
          }
        }
      }

    } else {
      inputElement.value = inputElement.value.substring(0, cursor) + caracter + inputElement.value.substring(cursor)
      inputElement.selectionStart = cursor + 1
      inputElement.selectionEnd = cursor + 1
      // Déclencher la mise à jour après ajout de caractère
      this.triggerValueChangeFromActiveElement()
    }
  }

  private triggerValueChangeFromActiveElement() {
    const activeElement = document.activeElement;
    
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      // Récupérer le nom de la catégorie depuis l'attribut data-category
      const categoryName = activeElement.getAttribute('data-category');
      
      if (categoryName) {
        console.debug("Triggering value change from active element", categoryName, activeElement.value);
        this.categoryValuechange(categoryName, activeElement.value);
      } else {
        console.debug("No data-category attribute found on active element", activeElement);
      }
    }
  }

  public handleKey(event: any, key: any) {
    if (document.activeElement instanceof HTMLInputElement) {
      this.key(key, document.activeElement as HTMLInputElement)
    } else if (document.activeElement instanceof HTMLTextAreaElement) {
        this.key(key, document.activeElement as HTMLTextAreaElement)
    }
    event.preventDefault()
  }

  public categoryValuechange(categoryName: string, newValue: any) {
    console.debug("Value change", categoryName, newValue)
    
    // Chercher la catégorie dans scoreDetails
    let scoreDetail = this.localMutableScoreDetails.find(score => score.categoryName == categoryName)
    
    // Si la catégorie n'existe pas, la créer
    if (!scoreDetail) {
      scoreDetail = {
        categoryName: categoryName,
        value: 0,
        inputString: ''
      }
      this.localMutableScoreDetails.push(scoreDetail)
    }
    
    // Assigner la nouvelle valeur
    scoreDetail.inputString = newValue
    
    // Calculer la valeur numérique
    const scoreTag = this.scoreTemplate.find(tag => tag.category == categoryName)
    if (scoreTag) {
      if (scoreTag.complex) {
        try {
          scoreDetail.value = new ArithmeticExpressionEvaluator().evaluateAll(newValue, true)
        } catch (e) {
          scoreDetail.value = 0
        }
      } else {
        scoreDetail.value = Number(newValue)
        if (Number.isNaN(scoreDetail.value)) {
          scoreDetail.value = 0
        }
      }
      
      // Appliquer la négation si nécessaire
      if (scoreTag.negatif) {
        scoreDetail.value = scoreDetail.value * -1
      }
    }
  }

  public getScoreDetail(category: string): number {
    const scoreDetail = this.localMutableScoreDetails.find(score => score.categoryName === category);
    return scoreDetail ? scoreDetail.value : 0;
  }

  ngOnInit(): void {
    this.actions.pipe(ofActionSuccessful(AddScoreToTeam)).subscribe(() => this.store.dispatch(new Navigate(['/match-end'])))
  }

  public onSubmit() {
    console.info("Submitting team score form")
    console.log(this.team.scoreDetails)
    this.store.dispatch(new AddScoreToTeam(this.team, this.teamScoreFormGroup.value.score, this.localMutableScoreDetails))
  }

  public returnToMatchEnd() {
    this.store.dispatch(new Navigate(['/match-end']))
  }
}
