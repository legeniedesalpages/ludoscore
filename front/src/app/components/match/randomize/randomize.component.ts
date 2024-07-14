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
import { Component } from '@angular/core'
import { Navigate } from '@ngxs/router-plugin'
import { Select, Store } from '@ngxs/store'
import { Observable, Subject } from 'rxjs'
import { MatchStateModel } from 'src/app/core/state/match/match.model'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  templateUrl: './randomize.component.html',
  styleUrls: ['./randomize.component.css'],
})
export class RandomizeComponent {

  @Select(MatchState) matchState!: Observable<MatchStateModel>

  public saving: Subject<boolean> = new Subject();

  constructor(private store: Store) {
  }

  public returnToPlayerSelection() {
    this.store.dispatch(new Navigate(['/player-selection']))
  }

  public randomizeAllMatchTag() {

  }

  public randomizeAllTeamTag() {

  }
}
