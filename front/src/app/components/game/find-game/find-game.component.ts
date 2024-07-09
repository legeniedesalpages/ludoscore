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
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { timer } from 'rxjs'
import { FindGameService } from 'src/app/core/services/game/find-game.service'


function focusAndOpenKeyboard(element: ElementRef<HTMLInputElement>) {
  if (!element) {
    return
  }

  const tempElement = document.createElement('input')
  tempElement.style.position = 'absolute'
  tempElement.style.top = (element.nativeElement.offsetTop + 7) + 'px'
  tempElement.style.left = element.nativeElement.offsetLeft + 'px'
  tempElement.style.height = '0'
  tempElement.style.opacity = '0'
  document.body.appendChild(tempElement)
  tempElement.focus()

  element.nativeElement.focus()
  element.nativeElement.click()
  document.body.removeChild(tempElement)
}

@Component({
  selector: 'find-game',
  templateUrl: './find-game.component.html',
  styleUrls: ['./find-game.component.css', '../../../core/css/list.css'],
})
export class FindGameComponent implements OnInit {

  @ViewChild('recherche', { static: true })
  set input(element: ElementRef<HTMLInputElement>) {
    focusAndOpenKeyboard(element)
  }


  public searching: boolean
  public searchString: string

  constructor(public findGameService: FindGameService, private router: Router, private route: ActivatedRoute) {
    this.searching = false
    this.searchString = ''
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      let reset = params.get('no-reset')
      if (reset === 'true') {
        console.debug("No reset")
      } else {
        this.findGameService.resetPreviousSearch()
      }
    })
  }

  public search(event: any) {

    if (!event.target.value) {
      console.debug('No search string')
      return
    }

    if (event.target.value === this.searchString) {
      console.debug('No new search, old search : ' + this.searchString)
      return
    }

    this.searchString = event.target.value
    this.searching = true
    console.debug("Search: ", this.searchString)

    this.findGameService.search(this.searchString).subscribe({

      next: (res: any) => {
        console.info("Result count: " + res.length)
        this.searching = false
      },

      error: () => {
        this.searching = false
      }
    })
  }

  public gameDetail(id: number, owned: boolean) {
    console.debug("Go to edition page for id :" + id)
    if (!owned) {
      this.router.navigate(['/game-editor', 'bgg', id]);
    } else {
      this.router.navigate(['/game-editor', 'owned', id]);
    }
  }

  public returnToHome() {
    this.router.navigate(['/'])
  }
}
