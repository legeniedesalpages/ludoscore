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
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchService } from 'src/app/core/services/match.service';
import { GameService } from 'src/app/core/services/game.service';

@Component({
  selector: 'match-editor',
  templateUrl: './match-editor.component.html',
  styleUrls: ['./match-editor.component.css']
})
export class MatchEditorComponent implements OnInit {

  public loading: boolean;
  public saving: boolean;
  public matchEditorForm: FormGroup;
  public searchGame: boolean;

  constructor(private router: Router, private route: ActivatedRoute, private snackBar: MatSnackBar,
    public matchService: MatchService, private gameService: GameService) {

    this.loading = false;
    this.saving = false;
    this.searchGame = true;

    this.matchEditorForm = new FormGroup({
    });
  }

  ngOnInit(): void {
  }

  public saveGame(): void {
  }

  public cancel() {
  }

  public gameSelected(gameId: number) {
    this.loading = true;
    console.log("Action:" + gameId)
    this.gameService.get(gameId).subscribe((game) => {
      this.matchService.setGame(game)
      this.searchGame = false
      this.loading = false;
      console.log(this.imageUrl())
    })
  }

  public imageUrl(): string | undefined {
    return this.matchService.getGame()?.image_id
  }
}
