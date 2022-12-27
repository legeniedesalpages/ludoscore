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

export interface Fruit {
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
  fruits: Fruit[] = [];

  private gameSearcDetailhUrl = environment.apiURL + '/api/game_search_detail?id=';

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {
    this.loading = true;

    this.gameEditorForm = new FormGroup({
      name: new FormControl('', Validators.required),
      minPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      maxPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      cooperative: new FormControl(false)
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
          console.log("Detail: [" + res.image + "]");
          this.imageUrl = `'${res.image}'`;
          this.gameEditorForm.setValue({
            name: res.name,
            minPlayer: res.minplayers,
            maxPlayer: res.maxplayers,
            cooperative: false
          });
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });

    });
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.fruits.push({ name: value });
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(fruit: Fruit): void {
    const index = this.fruits.indexOf(fruit);

    if (index >= 0) {
      this.fruits.splice(index, 1);
    }
  }

  edit(fruit: Fruit, event: MatChipEditedEvent) {
    const value = event.value.trim();

    // Remove fruit if it no longer has a name
    if (!value) {
      this.remove(fruit);
      return;
    }

    // Edit existing fruit
    const index = this.fruits.indexOf(fruit);
    if (index > 0) {
      this.fruits[index].name = value;
    }
  }

}
