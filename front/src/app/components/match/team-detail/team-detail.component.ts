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
import { Component, Inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { Select, Store } from '@ngxs/store'
import { Observable, Subject } from 'rxjs'
import { MatchModel, Team } from 'src/app/core/model/match.model'
import { ColorTag } from 'src/app/core/model/tag.model'
import { ChangeTeamColor } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  selector: 'team-detail',
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.css']
})
export class TeamDetailComponent {

  @Select(MatchState.match) match!: Observable<MatchModel>

  public availableColors: ColorTag[] = []
  public newColor: ColorTag
  public saving: Subject<boolean> = new Subject();


  constructor(public dialogRef: MatDialogRef<TeamDetailComponent>, @Inject(MAT_DIALOG_DATA) public team: Team, private store: Store) {
    this.availableColors = this.store.selectSnapshot<MatchModel>(MatchState.match).game.playerColors

    this.newColor = this.team.color
    this.saving.subscribe(_ => {
      this.dialogRef.close()
    })
  }

  public save() {
    this.store.dispatch([
      new ChangeTeamColor(this.team, this.newColor)
    ]).subscribe(_ => {
      this.saving.next(true)
    })
  }
}
