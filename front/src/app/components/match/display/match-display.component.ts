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
import { Navigate } from '@ngxs/router-plugin';
import { Actions, Select, Store, ofActionSuccessful } from '@ngxs/store';
import { Observable, first } from 'rxjs';
import { MatchEnded } from 'src/app/core/state/match/match.action';
import { MatchStateModel } from 'src/app/core/state/match/match.model';
import { MatchState } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';

@Component({
  templateUrl: './match-display.component.html',
  styleUrls: ['./match-display.component.css'],
})
export class MatchDisplayComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>;

  public startDate?: Date
  public elapsedTime: String
  public env = environment
  public gameName?: String
  public imageUrl?: String

  constructor(private store: Store, private actions: Actions) {
    this.elapsedTime = "00 heures, 00 minutes, 00 secondes"
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


  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }
}
