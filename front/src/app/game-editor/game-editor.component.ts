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

  id: any;
  loading: boolean;
  gameEditorForm: FormGroup;
  imageUrl: string | null = null;

  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  tagsGame: Tag[] = [];
  tagsPlayer: Tag[] = [];

  private gameSearcDetailhUrl = environment.apiURL + '/api/game_search_detail?id=';

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {
    this.loading = true;

    this.gameEditorForm = new FormGroup({
      name: new FormControl('', Validators.required),
      minPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      maxPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      cooperative: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      console.log('Show detail for id: ' + params.get('id'));
      this.id = params.get('id');

      this.http.get(this.gameSearcDetailhUrl + encodeURIComponent(this.id)).subscribe({
        complete: () => {
          this.loading = false;
        },
        next: (res: any) => {
          console.log("Detail: [" + res.name + "]");
          this.imageUrl = `'${res.image}'`;
          this.gameEditorForm.setValue({
            name: res.name,
            minPlayer: res.minplayers,
            maxPlayer: res.maxplayers,
            cooperative: "false"
          });
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });

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
