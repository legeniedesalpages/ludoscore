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
import { environment } from 'src/environments/environment';

@Component({
  selector: 'find-game',
  templateUrl: './find-game.component.html',
  styleUrls: ['./find-game.component.css'],
})
export class FindGameComponent {
  
  private gameSearchUrl = environment.apiURL + '/api/game_search?q=';

  items: any = null;
  searching: boolean = false;

  constructor(private http: HttpClient) {
  }

  search(event: any) {
    this.searching = true;
    console.debug("Search: ", event.target.value);
    this.http.get(this.gameSearchUrl + encodeURIComponent(event.target.value)).subscribe((res: any) => {
      console.log("Result count: " + res.length);
      this.items = res;
      this.searching = false;
    })
  }
}
