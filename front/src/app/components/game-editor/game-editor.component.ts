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
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { DateValidator } from 'src/app/core/services/date.validator';
import { FindGameService } from 'src/app/core/services/find-game.service';
import { GameSearchDetail } from 'src/app/core/model/game-search-detail.model';

export interface Tag {
  name: string;
}

@Component({
  selector: 'game-editor',
  templateUrl: './game-editor.component.html',
  styleUrls: ['./game-editor.component.css']
})
export class GameEditorComponent implements OnInit {

  bggId: number | null;
  internalId: number | null;

  loading: boolean;
  saving: boolean;
  gameEditorForm: FormGroup;

  imageResource: string | null = null;
  thumbnailResource: string | null = null;
  imageUrl: string | null = null;
  tagsGame: Tag[] = [];
  tagsPlayer: Tag[] = [];

  
  private gameSaveUrl = environment.apiURL + '/api/games';

  constructor(private router: Router, private route: ActivatedRoute, private http: HttpClient, private findGameService: FindGameService, private snackBar: MatSnackBar) {
    this.loading = true;
    this.saving = false;

    this.bggId = null;
    this.internalId = null;

    this.gameEditorForm = new FormGroup({
      name: new FormControl('', Validators.required),
      minPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      maxPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      cooperative: new FormControl('', Validators.required),
      ownership: new FormControl('', DateValidator.dateValidator),
      colorCtr: new FormControl(null)
    });
  }

  ngOnInit(): void {

    this.route.paramMap.subscribe((params) => {

      console.log(params)
      let type = params.get('type');
      if (type === 'bgg') {
        this.initFromSearch(params)
      }
    });
  }

  private initFromSearch(params: ParamMap) {
    console.info('Fill form from bgg id: ' + params.get('id'))
    this.bggId = Number(params.get('id'));

    this.findGameService.detail(this.bggId).subscribe({

      next: (gameDetail: GameSearchDetail) => {
        this.loading = false;

        console.info("Game details: [" + gameDetail.name + "]");
        this.imageUrl = `'${gameDetail.image}'`;

        this.imageResource = gameDetail.image;
        this.thumbnailResource = gameDetail.thumbnail;

        this.gameEditorForm.setValue({
          name: gameDetail.name,
          minPlayer: gameDetail.minplayers,
          maxPlayer: gameDetail.maxplayers,
          cooperative: "false",
          ownership: null
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  saveGame(): void {
    let formName = this.gameEditorForm.get('name')?.value;
    console.log("saving " + formName + ", owning [" + this.gameEditorForm.get('ownership')?.value + "]");

    let formOwnershipDate = this.gameEditorForm.get('ownership')?.value ? moment(this.gameEditorForm.get('ownership')?.value).format('YYYY-MM-DD') : null;

    this.http.post(this.gameSaveUrl, {
      name: formName,
      image: this.imageResource,
      thumbnail: this.thumbnailResource,
      isOnlyCooperative: this.gameEditorForm.get('cooperative')?.value == "false" ? false : true,
      minPlayers: this.gameEditorForm.get('minPlayer')?.value,
      maxPlayers: this.gameEditorForm.get('maxPlayer')?.value,
      ownershipDate: formOwnershipDate,
      bggId: this.bggId,
      tagsGame: JSON.stringify(this.tagsGame),
      tagsPlayer: JSON.stringify(this.tagsPlayer)
    }).subscribe({
      complete: () => {

      // TODO : redirect vers mes jeux : ce jeu ajouté en premier dans la liste

        this.snackBar.open("Jeu enregistré", 'Fermer', {
          duration: 5000
        });
        this.saving = false;
      },
      error: (err: any) => {
        this.snackBar.open(err);
        this.saving = false;
      }
    });
  }

  public cancel() {
    this.router.navigate(['/find-game'], {queryParams: {'no-reset': 'true'}});
  }
}
