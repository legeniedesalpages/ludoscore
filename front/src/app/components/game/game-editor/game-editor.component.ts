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
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GameSearchDetail } from 'src/app/core/model/game-search-detail.model';
import { Tag } from 'src/app/core/model/tag.model';
import { ColorTag } from 'src/app/core/model/color-tag.model';
import { Game } from 'src/app/core/model/game.model';
import { FindGameService } from 'src/app/core/services/game/find-game.service';
import { DateValidator } from 'src/app/core/services/misc/date.validator';
import { GameService } from 'src/app/core/services/game/game.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'game-editor',
  templateUrl: './game-editor.component.html',
  styleUrls: ['./game-editor.component.css']
})
export class GameEditorComponent implements OnInit {

  public env = environment

  public loading: boolean;
  public saving: boolean;
  public gameEditorForm: FormGroup;

  public bggId: number | null;
  public imageResource: string | null = null;
  public thumbnailResource: string | null = null;
  public imageUrl: string | null = null;
  public tagsGame: Tag[] = [];
  public tagsPlayer: Tag[] = [];
  public tagsColor: ColorTag[] = [];

  constructor(private router: Router, private route: ActivatedRoute, private http: HttpClient,
    private findGameService: FindGameService, private snackBar: MatSnackBar, private gameService: GameService
  ) {

    this.loading = true;
    this.saving = false;

    this.bggId = null;

    this.gameEditorForm = new FormGroup({
      name: new FormControl('', Validators.required),
      cooperative: new FormControl('', Validators.required),
      minPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      maxPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      ownership: new FormControl('', DateValidator.dateValidator),
    });
  }

  ngOnInit(): void {

    this.route.paramMap.subscribe((params) => {

      console.log(params)
      let type = params.get('type')
      if (type === 'bgg') {
        this.initFromSearch(params)
      } else {
        this.initFromLibrary(params)
      }
    });
  }

  private initFromLibrary(params: ParamMap) {
    this.loading = true;
    console.info('Fill form library, bgg id: ' + params.get('id'))
    this.bggId = Number(params.get('id'));

    this.gameService.getFromBgg(this.bggId).subscribe({

      next: (game: Game) => {
        console.info("Game details: [" + game.title + "]");

        this.imageUrl = `'${game.imageId}'`;

        this.gameEditorForm.setValue({
          name: game.title,
          minPlayer: game.minPlayers,
          maxPlayer: game.maxPlayers,
          cooperative: game.isOnlyCooperative ? "true" : "false",
          ownership: game.ownershipDate
        });

        this.tagsGame = game.matchTags;
        this.tagsPlayer = game.playerTags;
        this.tagsColor = game.playerColors;

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private initFromSearch(params: ParamMap) {
    this.loading = true;
    console.info('Fill form from bgg id: ' + params.get('id'))
    this.bggId = Number(params.get('id'));

    this.findGameService.detail(this.bggId).subscribe({

      next: (gameSearchDetail: GameSearchDetail) => {
        console.info("Game details: [" + gameSearchDetail.name + "]");
        this.imageUrl = `'${gameSearchDetail.image}'`;

        this.imageResource = gameSearchDetail.image;
        this.thumbnailResource = gameSearchDetail.thumbnail;

        this.gameEditorForm.setValue({
          name: gameSearchDetail.name,
          minPlayer: gameSearchDetail.minplayers,
          maxPlayer: gameSearchDetail.maxplayers,
          cooperative: "false",
          ownership: null
        });

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  public saveGame(): void {
    this.saving = true;

    let formName = this.gameEditorForm.get('name')?.value;
    console.log("saving " + formName + ", owning date [" + this.gameEditorForm.get('ownership')?.value + "]");

    let game: Game = {
      id: null,
      title: formName,
      imageId: this.imageResource!,
      thumbnailId: this.thumbnailResource!,
      isOnlyCooperative: this.gameEditorForm.get('cooperative')?.value == "false" ? false : true,
      minPlayers: this.gameEditorForm.get('minPlayer')?.value,
      maxPlayers: this.gameEditorForm.get('maxPlayer')?.value,
      ownershipDate: this.gameEditorForm.get('ownership')?.value!,
      matchTags: this.tagsGame,
      playerTags: this.tagsPlayer,
      playerColors: this.tagsColor,
      bggId: this.bggId!,
      createdAt: null
    };


    this.gameService.save(game).subscribe({
      next: (game) => {

        console.log("Game id :" + game.id)

        this.snackBar.open("Jeu enregistré", 'Fermer', {
          duration: 5000
        });
        this.saving = false;

        //this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error saving game', err);
        this.saving = false;
      }
    });
  }

  public cancel() {
    this.router.navigate(['/find-game'], { queryParams: { 'no-reset': 'true' } });
  }

  public returnToGameList() {
    this.router.navigate(['/find-game'], { queryParams: { 'no-reset': 'true' } });
  }
}
