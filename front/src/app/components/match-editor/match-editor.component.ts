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
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchService } from 'src/app/core/services/match.service';
import { GameService } from 'src/app/core/services/game.service';
import { MatchPlayer } from 'src/app/core/model/matchPlayer.model';
import { MatDialog } from '@angular/material/dialog';
import { PlayerService } from 'src/app/core/services/player.service';
import { map } from 'rxjs';
import { Player } from 'src/app/core/model/player.model';

@Component({
  selector: 'match-editor',
  templateUrl: './match-editor.component.html',
  styleUrls: ['./match-editor.component.css']
})
export class MatchEditorComponent implements OnInit {

  private choosingPlayers: Player[] = []

  public loading: boolean;
  public canLaunchGame: boolean = false

  constructor(private router: Router, private route: ActivatedRoute,
    private snackBar: MatSnackBar, private dialog: MatDialog,
    public matchService: MatchService, private gameService: GameService, private playerService: PlayerService) {

    this.loading = false;
  }

  ngOnInit(): void {
    console.log("init")
    this.loading = true
    this.loadingPlayers()
  }

  public saveGame(): void {
  }

  public gameSelected(gameId: number) {
    this.loading = true;
    console.log("Action:" + gameId)
    this.gameService.get(gameId).subscribe((game) => {
      this.matchService.setGame(game)
      this.loadingPlayers()
    })
  }

  private loadingPlayers() {
    this.playerService.list().subscribe({
      next: (players) => {
        this.choosingPlayers = players
        this.loading = false;
      },
      error: _ => {
        this.loading = false;
      }
    })
  }

  public playerSelected(event: Player | string, matchPlayer: MatchPlayer) {
    if (event === 'search') {
      console.log("Lancement de la recherche")
    } else if (event === 'team') {
      console.log("Création d'une équipe")
    } else {
      this.matchService.setPlayer(matchPlayer, event as Player)
    }
    this.canLaunchGame = this.matchService.canLaunchGame()
  }

  public filteredPlayerList(): Player[] {
    return this.choosingPlayers
  }

  public imageUrl(): string | undefined {
    return this.matchService.getGame()?.image_id
  }

  public getPlayers(): MatchPlayer[] {
    return this.matchService.getMatchPlayers()
  }

  public addPlayer() {
    this.matchService.addPlayer()
  }

  public canAddPlayer(): boolean {
    return this.matchService.canAddPlayer()
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

  public play() {
  }
}
