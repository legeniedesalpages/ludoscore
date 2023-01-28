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
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { CancelMatchCreation } from 'src/app/core/state/match/match.action';
import { MatchState } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';


@Component({
  templateUrl: './player-selection.component.html'
})
export class PlayerSelectionComponent implements OnInit {

  public env = environment
  public loading: boolean = true
  public gameTitle: string = ""

  constructor(private store: Store, private router: Router) {
  }

  ngOnInit(): void {
    this.loading = false
    this.store.selectOnce(MatchState).subscribe(matchState => this.gameTitle = matchState.gameTitle)
  }

  public cancelMatchCreation() {
    this.store.dispatch(new CancelMatchCreation()).subscribe(() => this.router.navigate(['']))
  }

  public cancelGameSelection() {
    this.store.dispatch(new CancelMatchCreation()).subscribe(() => this.router.navigate(['game-selection']))
  }
}
