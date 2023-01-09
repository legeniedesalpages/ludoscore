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
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FindGameService } from 'src/app/core/services/find-game.service';

@Component({
  selector: 'find-game',
  templateUrl: './find-game.component.html',
  styleUrls: ['./find-game.component.scss', './find-game.component.css']
})
export class FindGameComponent implements OnInit {
  
  public searching: boolean;
  public searchString: string;

  constructor(public findGameService: FindGameService, private router: Router) {
    this.searching = false;
    this.searchString = '';
  }
  ngOnInit(): void {
    this.findGameService.resetPreviousSearch();
  }

  public search(event: any) {

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
    console.debug("Search: ", this.searchString);

    this.findGameService.search(this.searchString).subscribe({

      next: (res: any) => {
        console.info("Result count: " + res.length);
        this.searching = false;
      },

      error: () => {
        this.searching = false;
      }
    });
  }

  public gameDetail(id: number) {
    console.debug("Go to creation page for id :" + id);
    this.router.navigate(['/game-editor', 'bgg', id]);
  }
}
