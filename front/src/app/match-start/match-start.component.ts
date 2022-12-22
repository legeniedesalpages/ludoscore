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
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'match-start',
  templateUrl: './match-start.component.html',
  styleUrls: ['./match-start.component.css'],
})
export class MatchStartComponent {

  createMatchForm: FormGroup;

  constructor(private http: HttpClient) {

    this.createMatchForm = new FormGroup({
    });
  }


  cancelCreation() {
    console.debug('Cancel match creation');
    
  }

  onSubmit() {

  }
}
