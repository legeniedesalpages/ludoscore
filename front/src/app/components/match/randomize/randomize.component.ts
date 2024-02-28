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
import { Component, OnInit, ViewChild } from '@angular/core';
import { Navigate } from '@ngxs/router-plugin';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Player } from 'src/app/core/model/player.model';
import { Tag } from 'src/app/core/model/tag.model';
import { MatchStateModel } from 'src/app/core/state/match/match.model';
import { MatchState } from 'src/app/core/state/match/match.state';

@Component({
  templateUrl: './randomize.component.html',
  styleUrls: ['./randomize.component.css'],
})
export class RandomizeComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>;

  public matchTags: Tag[] = []
  public playerTags: Tag[] = []
  public players: Player[] = []

  constructor(private store: Store) {
  }

  ngOnInit(): void {
    this.matchState.subscribe((state) => {
      this.matchTags = state.matchTags
      this.playerTags = state.playerTags
      this.players = state.players
    })
  }

  public returnToPlayerSelection() {
    this.store.dispatch(new Navigate(['/player-selection']))
  }
}
