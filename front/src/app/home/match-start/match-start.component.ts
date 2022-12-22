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
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'game-start',
  templateUrl: './match-start.component.html',
  styleUrls: ['./match-start.component.css'],
})
export class MatchStartComponent {

  creatingMatch: boolean;
  createMatchForm: FormGroup;

  constructor(private http: HttpClient) {
    this.creatingMatch = false;

    this.createMatchForm = new FormGroup({
      email: new FormControl('', [Validators.email, Validators.required]),
      password: new FormControl('', Validators.required),
    });
  }

  createMatch() {
    console.debug('Start ceating match');
    this.creatingMatch = true;
  }

  cancelCreation() {
    console.debug('Cancel match creation');
    this.creatingMatch = false;
  }

  onSubmit() {

  }
}
