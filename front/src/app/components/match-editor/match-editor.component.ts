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
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchService } from 'src/app/core/services/match.service';
import { GameService } from 'src/app/core/services/game.service';
import { MatchPlayer } from 'src/app/core/model/matchPlayer.model';
import { MatDialog } from '@angular/material/dialog';
import { MatchPlayerEditorComponent } from './player-editor/match-player-editor.component';

@Component({
  selector: 'match-editor',
  templateUrl: './match-editor.component.html',
  styleUrls: ['./match-editor.component.css']
})
export class MatchEditorComponent implements OnInit {

  public loading: boolean;

  constructor(private router: Router, private route: ActivatedRoute, private snackBar: MatSnackBar, private dialog: MatDialog,
    public matchService: MatchService, private gameService: GameService) {

    this.loading = false;
  }

  ngOnInit(): void {
  }

  public saveGame(): void {
  }

  public gameSelected(gameId: number) {
    this.loading = true;
    console.log("Action:" + gameId)
    this.gameService.get(gameId).subscribe((game) => {
      this.matchService.setGame(game)
      this.loading = false;
      console.log(this.imageUrl())
    })
  }

  public imageUrl(): string | undefined {
    return this.matchService.getGame()?.image_id
  }

  public getPlayers(): MatchPlayer[] {
    return this.matchService.getMatchPlayers()
  }

  public addPlayer() {
    this.matchService.addPlayer()
    this.dialog.open(MatchPlayerEditorComponent, {
      data: {
      }
    })
  }

  public canAddPlayer(): boolean {
    return this.matchService.canAddPlayer()
  }

  public editPlayer() {
    this.dialog.open(MatchPlayerEditorComponent, {
      data: {
      }
    })
  }

  public deletePlayer(matchPlayer: MatchPlayer) {
    return this.matchService.deletePlayer(matchPlayer)
  }

  public haveToSearchGame(): boolean {
    return this.matchService.getGame() == null ? true : false
  }

  public cancel() {
    this.matchService.cancel()
  }
}
