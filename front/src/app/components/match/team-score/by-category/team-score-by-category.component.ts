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
import { ChangeDetectionStrategy, Component, inject, OnInit, QueryList, signal, ViewChildren } from '@angular/core'
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatRippleModule } from '@angular/material/core'
import { MatDialog } from '@angular/material/dialog'
import { MatDividerModule } from '@angular/material/divider'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Actions, ofActionSuccessful, select, Store } from '@ngxs/store'
import { first } from 'rxjs/internal/operators/first'
import { ConfirmationDialogComponent } from 'src/app/components/layout/dialogue/confirmation.component'
import { MatchModel, Team } from 'src/app/core/model/match.model'
import { Score, ScoreTag } from 'src/app/core/model/score.model'
import { AddScoreToCategory } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { KeyboardComponent } from '../../../layout/keyboard/keyboard.component'
import { LayoutComponent } from '../../../layout/layout.component'
import { CategoryComponent } from '../category/category.component'


@Component({
  templateUrl: './team-score-by-category.component.html',
  styleUrls: ['./team-score-by-category.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatRippleModule, MatDividerModule,
    A11yModule,
    KeyboardComponent, LayoutComponent, CategoryComponent
  ]
})
export class TeamScoreByCategoryComponent implements OnInit {

  @ViewChildren('inputScore') protected listOfInputScore!: QueryList<any>

  private readonly store = inject(Store)
  private readonly route = inject(ActivatedRoute)
  private readonly dialog = inject(MatDialog)
  private readonly actions = inject(Actions)
  private readonly snackBar = inject(MatSnackBar)

  protected readonly scoreTag = signal<ScoreTag>({} as ScoreTag)
  protected readonly matchState = select(MatchState.match)

  public readonly categoryScoreFormGroup = new FormGroup({})
  protected readonly scoreDetailsByTeam: Map<Team, Score> = new Map()
  private hasChange = false

  ngOnInit(): void {

    this.actions.pipe(ofActionSuccessful(AddScoreToCategory)).subscribe(() =>
      this.store.dispatch(new Navigate(['/match-end'], { "mode": "category" }))
    )

    this.route.queryParams.pipe(first()).subscribe((params: { [key: string]: string }) => {
      const index = Number(params['index'])
      const matchState = this.store.selectSnapshot<MatchModel>(MatchState.match)
      const scoreTags = matchState.game.scoreTags
      this.scoreTag.set(scoreTags[index])
    })
  }

  protected onValueChange(score: Score, team: Team) {
    if (this.scoreDetailsByTeam.get(team)) {
      this.hasChange = true
    }
    this.scoreDetailsByTeam.set(team, score)
  }

  protected onSubmit() {
    if (this.categoryScoreFormGroup.valid) {

      this.store.dispatch(new AddScoreToCategory(this.scoreDetailsByTeam))

    } else {
      this.snackBar.open("Il y a des erreurs dans la saisie qui doivent être corrigées", 'Fermer', {
        duration: 5000
      })
    }
  }

  protected returnToMatchEnd() {
    if (this.hasChange) {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: { message: "Des scores ont commencé à être saisis.<br/> Cliquez sur continuer si vous souhaitez quitter la page: <u>toutes les données seront perdues</u>." }
      })

      dialogRef.afterClosed().subscribe((result: boolean) => {
        if (result) {
          this.store.dispatch(new Navigate(['/match-end'], { "mode": "category" }))
        }
      })
    } else {
      this.store.dispatch(new Navigate(['/match-end'], { "mode": "category" }))
    }
  }
}
