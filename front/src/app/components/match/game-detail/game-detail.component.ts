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
import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { Store } from '@ngxs/store'
import { Observable, Subject } from 'rxjs'
import { MatchModel } from 'src/app/core/model/match.model'
import { MatchState } from 'src/app/core/state/match/match.state'
import { TagsSelectionModule } from '../tags-selection/tags-selection.module'

@Component({
  template: `
    <h2 mat-dialog-title>{{ (match$ | async)!.game.title! }}</h2>

    <mat-dialog-content class="dialog row">
        <fieldset>
            <game-tags-selection [saving]="saving"/>
        </fieldset>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Annuler</button>
        <button mat-button mat-dialog-close (click)="save()">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .mat-dialog-title {
      text-align: left;
    }
  `],
  imports: [
    CommonModule,
    MatButtonModule, MatDialogModule,
    FormsModule,
    TagsSelectionModule
  ],
})
export class GameDetailComponent {

  public match$: Observable<MatchModel> = inject(Store).select(MatchState.match);
  public saving: Subject<boolean> = new Subject();

  constructor(public dialogRef: MatDialogRef<GameDetailComponent>) {
    this.saving.subscribe(_ => {
      this.dialogRef.close()
    })
  }

  public save() {
    this.saving.next(true)
  }
}
