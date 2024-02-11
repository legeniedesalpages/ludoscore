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
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Navigate } from '@ngxs/router-plugin';
import { Select, Store } from '@ngxs/store';
import { Observable, first, of } from 'rxjs';
import { Player } from 'src/app/core/model/player.model';
import { AddScoreToPlayer } from 'src/app/core/state/match/match.action';
import { MatchStateModel } from 'src/app/core/state/match/match.model';
import { MatchState } from 'src/app/core/state/match/match.state';

@Component({
  templateUrl: './player-score.component.html',
  styleUrls: ['./player-score.component.css'],
})
export class PlayerScoreComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>;

  public player!: Observable<Player>;
  public playerId!: number;

  public readonly playerScore: FormGroup

  constructor(private store: Store, activatedRoute: ActivatedRoute) {
    activatedRoute.queryParams.pipe(first()).subscribe(params => {
      this.playerId = params['id']
      this.matchState.pipe(first()).subscribe(matchState => {
        let player = matchState.players.find(player => player.id == this.playerId)
        console.log("joueur trouvé", player)
        if (player) {
          this.player = of(player);
        }
      })
    });

    this.playerScore = new FormGroup({
      score: new FormControl('', [Validators.required])
    });
  }

  ngOnInit(): void {
  }

  public onSubmit() {
    console.info("submitting player score form")
    this.store.dispatch(new AddScoreToPlayer(this.playerId, this.playerScore.value.score))
  }

  public returnToScore() {
    this.store.dispatch(new Navigate(['/match-end']))
  }
}
