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
import { environment } from 'src/environments/environment';

@Component({
  selector: 'find-game',
  templateUrl: './find-game.component.html',
  styleUrls: ['./find-game.component.css'],
  encapsulation : ViewEncapsulation.None,
})
export class FindGameComponent {

  private gameSearchUrl = environment.apiURL + '/api/game_search?q=';

  items: any = null;
  searching: boolean = false;
  errors: string = '';

  constructor(private http: HttpClient) {
  }

  search(event: any) {
    let searchString = event.target.value;
    if (!searchString) {
      return;
    }
    
    this.searching = true;
    this.errors = '';
    console.debug("Search: ", searchString);
    this.http.get(this.gameSearchUrl + encodeURIComponent(searchString)).subscribe({
      complete: () => {
        this.searching = false;
      },
      next: (res: any) => {
        console.log("Result count: " + res.length);
        this.items = res;
      },
      error: (err) => {
        this.items = null;
        this.errors = err;
        this.searching = false;
      }
    });
  }
}
