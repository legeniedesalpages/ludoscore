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
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss', './home.component.css']
})
export class HomeComponent {

  options: any;
  getCurrentMatchUrl = environment.apiURL + '/api/matches/current';

  dataReceived: boolean;
  matchInProgress: boolean;

  constructor(private http: HttpClient, private router: Router) {
    this.matchInProgress = false;
    this.dataReceived = false;

    this.options = {
      headers: new HttpHeaders({
        Accept: 'application/json'
      }),
      withCredentials: true
    };
    
    this.http.get(this.getCurrentMatchUrl, this.options).subscribe(response => {
      this.dataReceived = true;
      console.debug(response);
      this.matchInProgress = JSON.parse(JSON.stringify(response)).hasCurrent;
    });
  }

  createMatch() {
    this.router.navigate(['match-start']);
  }

  findGame() {
    this.router.navigate(['find-game']);
  }
}
