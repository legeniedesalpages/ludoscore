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
import { Component, OnInit } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, Router } from '@angular/router'
import { GameSearchResult } from 'src/app/core/model/game-search.model'
import { FindGameService } from 'src/app/core/services/game/find-game.service'

@Component({
  selector: 'find-game',
  templateUrl: './find-game.component.html',
  styleUrls: ['./find-game.component.css', '../../../core/css/list.css'],
})
export class FindGameComponent implements OnInit {

  public searching: boolean
  public searchString: string
  public searchedGameResult: GameSearchResult[]

  constructor(public findGameService: FindGameService, private router: Router, private route: ActivatedRoute, private snackBar: MatSnackBar) {
    this.searching = false
    this.searchString = ''
    this.searchedGameResult = []
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      let doNotResetSearchField = params.get('no-reset')
      if (doNotResetSearchField === 'true') {
        console.debug("Do not reset search field")
      } else {
        this.searchString = ''
      }
    })
  }

  public search(event: any) {

    if (!event.value) {
      console.debug('No search string')
      return
    }

    if (event.value === this.searchString) {
      console.debug('No new search, old search : ' + this.searchString)
      return
    }

    this.searchString = event.value
    console.debug("Search value: ", this.searchString)
    this.searching = true

    this.findGameService.search(this.searchString).subscribe({
      next: (result: GameSearchResult[]) => {
        console.info("Number of found game: " + result.length)
        if (result.length === 0) {
          this.snackBar.open("Aucun jeu trouvé", 'Fermer', {
            duration: 5000
          })
        }
        this.searchedGameResult = result
      },
      error: (error: any) => {
        this.searchedGameResult = []
        this.snackBar.open("Erreur:" + error, 'Fermer', {
          duration: 10000
        })
      },
      complete: () => {
        this.searching = false
      }
    })
  }

  public goToGameDetail(gameFound: GameSearchResult) {
    console.debug("Go to edition page for id :" + gameFound.id)
    if (!gameFound.owned) {
      this.router.navigate(['/game-editor', 'bgg', gameFound.id]);
    } else {
      this.router.navigate(['/game-editor', 'owned', gameFound.id]);
    }
  }

  public returnToHome() {
    this.router.navigate(['/'])
  }
}