/**
    * @description      :
    * @author           : renau
    * @group            :
    * @created          : 13/12/2022 - 11:30:28
    *
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    :
**/
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: '', loadChildren: () => import('./components/home/home.module').then(m => m.HomeModule), data: { animation: 'home' } },
  { path: 'login', loadChildren: () => import('./components/login/login.module').then(m => m.LoginModule), data: { animation: 'login' } },
  { path: 'game-selection', loadChildren: () => import('./components/match/game-selection/game-selection.module').then(m => m.GameSelectionModule), data: { animation: 'game-selection' } },
  { path: 'player-selection', loadChildren: () => import('./components/match/player-selection/player-selection.module').then(m => m.PlayerSelectionModule), data: { animation: 'player-selection' } },
  { path: 'user-create', loadChildren: () => import('./components/user/create/user-create.module').then(m => m.UserCreateModule), data: { animation: 'user-create' } },
  { path: 'match-display', loadChildren: () => import('./components/match/display/match-display.module').then(m => m.MatchDisplayModule), data: { animation: 'match-display' } },
  { path: 'match-end', loadChildren: () => import('./components/match/end/match-end.module').then(m => m.MatchEndModule), data: { animation: 'match-end' } },
  { path: 'player-score', loadChildren: () => import('./components/match/player-score/player-score.module').then(m => m.PlayerScoreModule), data: { animation: 'player-score' } },
  { path: 'find-game', loadChildren: () => import('./components/game/find-game/find-game.module').then(m => m.FindGameModule), data: { animation: 'find-game' } },
  { path: 'game-editor/:type/:id', loadChildren: () => import('./components/game/game-editor/game-editor.module').then(m => m.GameEditorModule), data: { animation: 'game-editor' } }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: false,
      scrollPositionRestoration: 'top'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
