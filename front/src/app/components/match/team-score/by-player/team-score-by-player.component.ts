/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 17/07/2025 - 19:37:00
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 17/07/2025
    * - Author          : renau
    * - Modification    : 
**/
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
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, OnInit, QueryList, ViewChildren, computed, inject, signal } from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatRippleModule } from '@angular/material/core'
import { MatDividerModule } from '@angular/material/divider'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Actions, Store, ofActionSuccessful } from '@ngxs/store'
import { first } from 'rxjs'
import { MatchModel, Team } from 'src/app/core/model/match.model'
import { Score, ScoreTag } from 'src/app/core/model/score.model'
import { ArithmeticExpressionEvaluator } from 'src/app/core/services/misc/arithmetic'
import { AddFinalScoreToTeam, AddScoreToTeam } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { KeyboardComponent } from '../../../layout/keyboard/keyboard.component'
import { LayoutComponent } from '../../../layout/layout.component'
import { SidenavModule } from '../../../layout/sidenav/sidenav.module'


@Component({
  templateUrl: './team-score-by-player.component.html',
  styleUrls: ['./team-score-by-player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatRippleModule, MatCheckboxModule, MatDividerModule,
    A11yModule,
    SidenavModule, KeyboardComponent, LayoutComponent
  ]
})
export class TeamScoreByPlayerComponent implements OnInit {

  @ViewChildren('inputScore') public listOfInputScore!: QueryList<any>

  private store = inject(Store)
  private activatedRoute = inject(ActivatedRoute)
  private actions = inject(Actions)

  public team!: Team
  public localMutableScoreDetails = signal<Score[]>([])

  public readonly teamScoreFormGroup: FormGroup
  public readonly scoreTemplate: ScoreTag[]
  public readonly complexScoreTemplate: boolean

  public scoreDetails = computed(() => {
    const scores = this.localMutableScoreDetails()
    return (categoryName: string): number => {
      const scoreDetail = scores.find(score => score.categoryName === categoryName)
      return scoreDetail ? scoreDetail.value : 0
    }
  })

  public totalScore = computed(() => {
    const scores = this.localMutableScoreDetails()
    const total = scores.reduce((total, score) => total + score.value, 0)
    console.debug("Total score recomputed:", total, scores)
    return total
  })

  constructor() {

    this.scoreTemplate = this.store.selectSnapshot<MatchModel>(MatchState.match).game.scoreTags
    console.debug("Score template", this.scoreTemplate)
    if (this.scoreTemplate != undefined && this.scoreTemplate.length > 0) {
      this.complexScoreTemplate = true
    } else {
      this.complexScoreTemplate = false
    }

    if (this.complexScoreTemplate) {
      this.teamScoreFormGroup = new FormGroup({})
    } else {
      this.teamScoreFormGroup = new FormGroup({
        score: new FormControl('', [Validators.required, Validators.pattern("^[0-9]*$"), Validators.minLength(1)])
      })
    }

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
        validators.push(Validators.pattern("^[0-9]*$"))
      }
      this.teamScoreFormGroup.addControl(scoreTag.category, new FormControl('', validators))
    })


    this.activatedRoute.queryParams.pipe(first()).subscribe((params: { [key: string]: string }) => {
      const teamId = params['id']
      const teams = this.store.selectSnapshot<Team[]>(MatchState.teams)

      this.team = teams.find((team: Team) => team.id?.toString() === teamId)!
      console.debug("Team found, fill form with previous score data", this.team)

      this.teamScoreFormGroup.get("score")?.setValue(this.team.score)
      this.scoreTemplate.forEach(scoreTag => {
        const value = this.team.scoreDetails.find(score => score.categoryName == scoreTag.category)?.inputString
        this.teamScoreFormGroup.get(scoreTag.category)!.setValue(value)
        this.categoryValuechange(scoreTag.category, value || '')
      })
    })
  }



  public triggerValueChangeFromActiveElement() {
    const activeElement = document.activeElement

    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      // Récupérer le nom de la catégorie depuis l'attribut data-category
      const categoryName = activeElement.getAttribute('data-category')

      if (categoryName) {
        console.debug("Triggering value change from active element", categoryName, activeElement.value)

        // Mettre à jour le FormControl pour déclencher les validators Angular
        this.teamScoreFormGroup.get(categoryName)?.setValue(activeElement.value);

        // Appliquer la mise à jour et forcer la détection des changements
        this.categoryValuechange(categoryName, activeElement.value)
      } else {
        console.debug("No data-category attribute found on active element", activeElement)
      }
    }
  }



  public onScoreInput(event: Event, categoryName: string) {
    const value = (event.target as HTMLInputElement).value;

    // Mettre à jour le FormControl pour déclencher les validators Angular
    this.teamScoreFormGroup.get(categoryName)?.setValue(value);

    // Appliquer la logique de calcul de score
    this.categoryValuechange(categoryName, value);
  }

  public categoryValuechange(categoryName: string, newValue: any) {
    console.debug("Value change", categoryName, newValue)

    // Créer une copie du tableau actuel
    const currentScores = [...this.localMutableScoreDetails()]

    // Chercher la catégorie dans la copie
    let scoreIndex = currentScores.findIndex(score => score.categoryName == categoryName)
    let scoreDetail: Score

    // Si la catégorie n'existe pas, la créer
    if (scoreIndex === -1) {
      scoreDetail = {
        categoryName: categoryName,
        value: 0,
        inputString: ''
      }
      currentScores.push(scoreDetail)
      scoreIndex = currentScores.length - 1
    } else {
      scoreDetail = { ...currentScores[scoreIndex] } // Créer une copie de l'objet Score
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

    // Mettre à jour le tableau avec la nouvelle copie
    currentScores[scoreIndex] = scoreDetail
    this.localMutableScoreDetails.set(currentScores)

    // Debug
    console.debug("Updated scores:", this.localMutableScoreDetails(), "Total:", this.totalScore())
  }

  ngOnInit(): void {
    if (this.complexScoreTemplate) {
      this.actions.pipe(ofActionSuccessful(AddScoreToTeam)).subscribe(() =>
        this.store.dispatch(new Navigate(['/match-end'], { "mode": "player" })))
    } else {
      this.actions.pipe(ofActionSuccessful(AddFinalScoreToTeam)).subscribe(() =>
        this.store.dispatch(new Navigate(['/match-end'], { "mode": "player" })))
    }
  }

  public onSubmit() {
    console.info("Submitting team score form")
    console.log(this.team.scoreDetails, this.totalScore())

    // Si on est en mode complexe, on utilise le score total calculé
    if (this.complexScoreTemplate) {
      this.store.dispatch(new AddScoreToTeam(this.team, this.localMutableScoreDetails()))
    } else {
      console.info("Submitting team score form", this.teamScoreFormGroup.value.score)
      this.store.dispatch(new AddFinalScoreToTeam(this.team, this.teamScoreFormGroup.value.score))
    }
  }

  public returnToMatchEnd() {
    this.store.dispatch(new Navigate(['/match-end'], { "mode": "player" }))
  }
}
