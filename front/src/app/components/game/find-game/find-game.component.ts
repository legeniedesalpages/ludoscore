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
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FindGameService } from 'src/app/core/services/game/find-game.service';


function focusAndOpenKeyboard(el: ElementRef<HTMLInputElement>, timeout: any) {
  if(!timeout) {
    timeout = 100;
  }
  if(el) {
    // Align temp input element approximately where the input element is
    // so the cursor doesn't jump around
    var __tempEl__ = document.createElement('input');
    __tempEl__.style.position = 'absolute';
    __tempEl__.style.top = (el.nativeElement.offsetTop + 7) + 'px';
    __tempEl__.style.left = el.nativeElement.offsetLeft + 'px';
    __tempEl__.style.height = '0';
    __tempEl__.style.opacity = '0';
    // Put this temp element as a child of the page <body> and focus on it
    document.body.appendChild(__tempEl__);
    __tempEl__.focus();

    // The keyboard is open. Now do a delayed focus on the target element
    setTimeout(function() {
      el.nativeElement.focus();
      el.nativeElement.click();
      // Remove the temp element
      document.body.removeChild(__tempEl__);
    }, timeout);
  }
}

@Component({
  selector: 'find-game',
  templateUrl: './find-game.component.html',
  styleUrls: ['./find-game.component.css', '../../../core/css/list.css'],
})
export class FindGameComponent implements OnInit {

  @ViewChild('recherche', { static: false }) 
   set input(element: ElementRef<HTMLInputElement>) {
     if(element) {
      setTimeout(function() {
        focusAndOpenKeyboard(element, 100)
      }, 500)
     }
  }

  
  
  public searching: boolean;
  public searchString: string;

  constructor(public findGameService: FindGameService, private router: Router, private route: ActivatedRoute) {
    this.searching = false;
    this.searchString = '';
  }


  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {  
      let reset = params.get('no-reset');
      if (reset === 'true') {
        console.debug("No reset")
      } else {
        this.findGameService.resetPreviousSearch();
      }
    });
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

  public gameDetail(id: number, owned: boolean) {
    console.debug("Go to edition page for id :" + id);
    if (!owned) {
      this.router.navigate(['/game-editor', 'bgg', id]);
    } else {
      this.router.navigate(['/game-editor', 'owned', id]);
    }
  }

  public returnToHome() { 
    this.router.navigate(['/']);
  }
}
