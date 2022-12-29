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
import { Component, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips';
import { DateValidator } from '../services/date.validator';
import moment from 'moment';

export interface Tag {
  name: string;
}

@Component({
  selector: 'game-editor',
  templateUrl: './game-editor.component.html',
  styleUrls: ['./game-editor.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class GameEditorComponent {

  readonly separatorKeysCodes = [ENTER, COMMA] as const;

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

  private gameSearchDetailhUrl = environment.apiURL + '/api/game_search_detail?id=';
  private gameSaveUrl = environment.apiURL + '/api/games';

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {
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
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {

      let type = params.get('type');
      if (type === 'bgg') {
        console.log('From bgg id: ' + params.get('id'))
        this.bggId = Number(params.get('id'));

        this.http.get(this.gameSearchDetailhUrl + encodeURIComponent(this.bggId)).subscribe({
          complete: () => {
            this.loading = false;
          },
          next: (res: any) => {
            console.log("Detail: [" + res.name + "]");
            this.imageUrl = `'${res.image}'`;
            this.imageResource = res.image;
            this.thumbnailResource = res.thumbnail;

            this.gameEditorForm.setValue({
              name: res.name,
              minPlayer: res.minplayers,
              maxPlayer: res.maxplayers,
              cooperative: "false",
              ownership: null
            });
          },
          error: (err) => {
            console.error(err);
            this.loading = false;
          }
        });
      }
    });
  }

  saveGame() : void {    
    let formName = this.gameEditorForm.get('name')?.value;
    let formOwnershipDate = moment(this.gameEditorForm.get('ownership')?.value).format('YYYY-MM-DD');
    console.log("saving " + formName + ", owning " + formOwnershipDate);
    this.saving = true;
    
    this.http.post(this.gameSaveUrl, { 
      name: formName,
      image: this.imageResource,
      thumbnail: this.thumbnailResource,
      isOnlyCooperative: this.gameEditorForm.get('cooperative')?.value == "false" ? false : true,
      minPlayers: this.gameEditorForm.get('minPlayer')?.value,
      maxPlayers: this.gameEditorForm.get('maxPlayer')?.value,
      ownershipDate: formOwnershipDate,
      bggId: this.bggId
    }).subscribe({
      complete: () => {
        console.log("saved");
        this.saving = false;
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
      }
    });
  }

  addTagPlayer(event: MatChipInputEvent): void {
    this.addTag(event, this.tagsPlayer);
  }
  addTagGame(event: MatChipInputEvent): void {
    this.addTag(event, this.tagsGame);
  }
  addTag(event: MatChipInputEvent, tags: Tag[]): void {
    const value = (event.value || '').trim();
    if (value) {
      tags.push({ name: value });
    }

    // Clear the input value
    event.chipInput!.clear();
  }


  removeTagPlayer(tag: Tag): void {
    this.removeTag(tag, this.tagsPlayer);
  }
  removeTagGame(tag: Tag): void {
    this.removeTag(tag, this.tagsGame);
  }
  removeTag(tag: Tag, tags: Tag[]): void {
    const index = tags.indexOf(tag);
    if (index >= 0) {
      tags.splice(index, 1);
    }
  }


  editTagPlayer(tag: Tag, event: MatChipEditedEvent): void {
    this.editTag(tag, this.tagsPlayer, event);
  }
  editTagGame(tag: Tag, event: MatChipEditedEvent): void {
    this.editTag(tag, this.tagsGame, event);
  }
  editTag(tag: Tag, tags: Tag[], event: MatChipEditedEvent) {
    const value = event.value.trim();
    if (!value) {
      this.removeTag(tag, tags);
      return;
    }
    const index = tags.indexOf(tag);
    if (index > 0) {
      tags[index].name = value;
    }
  }

}
