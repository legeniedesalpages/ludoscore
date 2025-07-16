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
import { Component, ViewEncapsulation } from '@angular/core'
import { MatDialogRef } from '@angular/material/dialog'
import { Select } from '@ngxs/store'
import { Observable, Subject } from 'rxjs'
import { MatchModel } from 'src/app/core/model/match.model'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  templateUrl: './game-detail.component.html',
  styleUrls: ['./game-detail.component.css'],
  standalone: false
})
export class GameDetailComponent {

  @Select(MatchState.match) match!: Observable<MatchModel>

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
