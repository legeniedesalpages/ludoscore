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
import { MatDialog } from '@angular/material/dialog';
import { Navigate } from '@ngxs/router-plugin';
import { Actions, Select, Store, ofActionSuccessful } from '@ngxs/store';
import { Observable, first } from 'rxjs';
import { ChoosenTag } from 'src/app/core/model/choosen-tag.model';
import { Player } from 'src/app/core/model/player.model';
import { MatchEnded } from 'src/app/core/state/match/match.action';
import { MatchStateModel } from 'src/app/core/state/match/match.model';
import { MatchState } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';
import { PlayerDetailComponent } from '../player-detail/player-detail.component';

@Component({
  templateUrl: './match-display.component.html',
  styleUrls: ['./match-display.component.css'],
})
export class MatchDisplayComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>;
  @Select(MatchState.matchTags) matchTags!: Observable<ChoosenTag[]>;
  @Select(MatchState.players) players!: Observable<Player[]>;

  public startDate?: Date
  public elapsedTime: String
  public env = environment
  public gameName?: String
  public imageUrl?: String

  constructor(private store: Store, private actions: Actions, private dialog: MatDialog) {
    this.elapsedTime = "00 heures, 00 minutes, 00 secondes"
    this.dialog.closeAll()
  }

  ngOnInit(): void {

    this.matchState.pipe(first()).subscribe((state) => {
      if (state.startedAt) {
        this.startDate = new Date(state.startedAt)
      }
      this.imageUrl = this.env.imagesURL + '/' + state.image
      this.gameName = state.title
    })

    this.actions.pipe(ofActionSuccessful(MatchEnded)).subscribe(() => this.store.dispatch(new Navigate(['/match-end'])))

    setInterval(() => {
      if (this.startDate) {
        let t = new Date().getTime() - new Date(this.startDate).getTime()
        let seconds = "" + Math.floor((t / 1000) % 60)
        let minutes = "" + Math.floor((t / (1000 * 60)) % 60)
        let hours = "" + Math.floor((t / (1000 * 60 * 60)) % 24)
        this.elapsedTime = hours.padStart(2, "0")  + " heures, " + minutes.padStart(2, "0") + " minutes, " + seconds.padStart(2, "0") + " secondes"
      }
    }, 1000)
  }

  public endGame() {
    this.store.dispatch(new MatchEnded(new Date()))
  }

  public goToPlayerDetail(player: Player) {
    this.dialog.open(PlayerDetailComponent, { 
      data: player,
      width: '100%',
      maxWidth: '90vw',
    })
  }


  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }
}
