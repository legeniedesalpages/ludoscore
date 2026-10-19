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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { BaseGameReference, GameSearchResult, GameSearchType } from 'src/app/core/model/game-search.model'
import { FindGameService } from 'src/app/core/services/game/find-game.service'

@Component({
  selector: 'find-game',
  templateUrl: './find-game.component.html',
  styleUrls: ['./find-game.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class FindGameComponent {

  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  public searching: boolean

  constructor(public findGameService: FindGameService, private store: Store, private snackBar: MatSnackBar) {
    this.searching = false
  }

  public readonly searchTypes: { value: GameSearchType, label: string }[] = [
    { value: 'game', label: 'Jeux' },
    { value: 'expansion', label: 'Extensions' },
    { value: 'all', label: 'Jeux + extensions' },
  ]

  public search(event: any) {

    if (!event.value) {
      console.debug('No search string')
      return
    }

    if (event.value.toLowerCase() === this.findGameService.searchString) {
      console.debug('No new search, old search : ' + this.findGameService.searchString)
      return
    }

    this.findGameService.searchString = event.value.toLowerCase()
    this.runSearch()
  }

  public changeSearchType(searchType: GameSearchType) {
    this.findGameService.searchType = searchType
    if (this.findGameService.searchString) {
      this.runSearch()
    }
  }

  private runSearch() {
    console.debug("Search value: ", this.findGameService.searchString, this.findGameService.searchType)
    this.searching = true

    this.findGameService.search().subscribe({
      next: (_) => {
        console.info("Number of found game: " + this.findGameService.searchResult.length)
        this.changeDetectorRef.markForCheck()
        if (this.findGameService.searchResult.length === 0) {
          this.snackBar.open("Aucun résultat trouvé", 'Fermer', {
            duration: 5000
          })
        }
      },
      error: (error: any) => {
        const searchType = this.findGameService.searchType
        this.findGameService.resetSearch()
        this.findGameService.searchType = searchType
        this.searching = false
        this.changeDetectorRef.markForCheck()
        this.snackBar.open("Erreur:" + error, 'Fermer', {
          duration: 10000
        })
      },
      complete: () => {
        this.searching = false
        this.changeDetectorRef.markForCheck()
      }
    })
  }

  public baseGamesLabel(baseGames: BaseGameReference[]): string {
    return baseGames.map(baseGame => baseGame.owned ? baseGame.name + ' ★' : baseGame.name).join(', ')
  }

  public goToGameDetail(gameFound: GameSearchResult) {
    console.info("Go to edition page for id :" + gameFound.id)
    if (!gameFound.registered) {
      this.store.dispatch(new Navigate(['/game-editor', 'bgg', gameFound.id]))
    } else {
      this.store.dispatch(new Navigate(['/game-editor', 'owned', gameFound.id]))
    }
  }

  public returnToHome() {
    this.findGameService.resetSearch()
    this.store.dispatch(new Navigate(['/']))
  }
}