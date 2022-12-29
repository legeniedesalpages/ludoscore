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
import { Router } from '@angular/router';
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
  searchString: string = '';

  constructor(private http: HttpClient, private router: Router) {
  }

  search(event: any) {
    if (!event.target.value) {
      console.debug('No search string');
      return;
    }

    if  (event.target.value === this.searchString) {
      console.debug('No new search, old search : ' + this.searchString);
      return;
    }

    this.searchString = event.target.value;
    this.searching = true;
    this.errors = '';
    console.debug("Search: ", this.searchString);

    this.http.get(this.gameSearchUrl + encodeURIComponent(this.searchString)).subscribe({
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

  gameDetail(id: number) {
    console.debug("Go to creation page for id :" + id);
    this.router.navigate(['/game-editor', 'bgg', id]);
  }
}
