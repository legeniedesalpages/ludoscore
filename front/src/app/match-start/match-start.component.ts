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
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export class Game {
  constructor(public id: number, public title: string) {}
}

@Component({
  selector: 'match-start',
  templateUrl: './match-start.component.html',
  styleUrls: ['./match-start.component.css'],
})
export class MatchStartComponent {

  saving: boolean = false;
  createMatchForm: FormGroup;
  games: Game[] = [];
  filteredOptions: Observable<Game[]>;

  constructor(private http: HttpClient) {

    this.createMatchForm = new FormGroup({
      game: new FormControl('', Validators.required)
    });

    this.filteredOptions = this.createMatchForm.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '')),
    );
  }


  cancelCreation() {
    console.debug('Cancel match creation');

  }

  onSubmit() {

  }

  private _filter(value: string): Game[] {
    const filterValue = value.toLowerCase();
    return this.games.filter(jeu => jeu.title.toLowerCase().includes(filterValue));
  }
}
