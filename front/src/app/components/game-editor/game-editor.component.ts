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
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { DateValidator } from 'src/app/core/services/date.validator';
import { FindGameService } from 'src/app/core/services/find-game.service';
import { GameSearchDetail } from 'src/app/core/model/game-search-detail.model';
import { Tag } from 'src/app/core/model/tag.model';
import { ColorTag } from 'src/app/core/model/color-tag.model';

@Component({
  selector: 'game-editor',
  templateUrl: './game-editor.component.html',
  styleUrls: ['./game-editor.component.css']
})
export class GameEditorComponent implements OnInit {

  public loading: boolean;
  public saving: boolean;
  public gameEditorForm: FormGroup;

  public bggId: number | null;
  private internalId: number | null;
  public imageResource: string | null = null;
  public thumbnailResource: string | null = null;
  public imageUrl: string | null = null;
  public tagsGame: Tag[] = [];
  public tagsPlayer: Tag[] = [];
  public tagsColor: ColorTag[] = [];
  
  private gameSaveUrl = environment.apiURL + '/api/games';

  constructor(private router: Router, private route: ActivatedRoute, private http: HttpClient, private findGameService: FindGameService, private snackBar: MatSnackBar) {
    this.loading = true;
    this.saving = false;

    this.bggId = null;
    this.internalId = null;

    

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
    /*let formName = this.gameEditorForm.get('name')?.value;
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
    });*/
  }

  public cancel() {
    this.router.navigate(['/find-game'], {queryParams: {'no-reset': 'true'}});
  }
}
