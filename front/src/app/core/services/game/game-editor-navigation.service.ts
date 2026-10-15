import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Game } from '../../model/game.model'

@Injectable({ providedIn: 'root' })
export class GameEditorNavigationService {

  constructor(private store: Store, private router: Router) { }

  public open(game: Game, returnUrl = this.router.url): void {
    this.store.dispatch(new Navigate(
      ['/game-editor', 'owned', game.bggId],
      { returnUrl }
    ))
  }
}
