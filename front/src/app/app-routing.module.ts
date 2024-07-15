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
import { PagenotfoundComponent } from './components/misc/page-not-found.component';

const routes: Routes = [
  { path: '', loadChildren: () => import('./components/home/home.module').then(m => m.HomeModule), data: { animation: 'home' } },

  { path: 'login', loadChildren: () => import('./components/login/login.module').then(m => m.LoginModule), data: { animation: 'login' } },
  { path: 'user-create', loadChildren: () => import('./components/user/create/user-create.module').then(m => m.UserCreateModule), data: { animation: 'user-create' } },
  { path: 'confirm-account', loadChildren: () => import('./components/user/confirmation/user-confirmation.module').then(m => m.UserConfirmationModule), data: { animation: 'user-confirmation' } },

  { path: 'game-selection', loadChildren: () => import('./components/match/game-selection/game-selection.module').then(m => m.GameSelectionModule), data: { animation: 'game-selection' } },
  { path: 'player-selection', loadChildren: () => import('./components/match/player-selection/player-selection.module').then(m => m.PlayerSelectionModule), data: { animation: 'player-selection' } },
  { path: 'random-toolbox', loadChildren: () => import('./components/match/randomize/randomize.module').then(m => m.RandomizeModule), data: { animation: 'random-toolbox' } },

  { path: 'match-display', loadChildren: () => import('./components/match/display/match-display.module').then(m => m.MatchDisplayModule), data: { animation: 'match-display' } },
  { path: 'match-end', loadChildren: () => import('./components/match/end/match-end.module').then(m => m.MatchEndModule), data: { animation: 'match-end' } },
  { path: 'team-score', loadChildren: () => import('./components/match/team-score/team-score.module').then(m => m.TeamScoreModule), data: { animation: 'team-score' } },
  { path: 'wheel', loadChildren: () => import('./components/match/wheel/wheel.module').then(m => m.WheelModule), data: { animation: 'wheel' } },

  { path: 'find-game', loadChildren: () => import('./components/game/find-game/find-game.module').then(m => m.FindGameModule), data: { animation: 'find-game' } },
  { path: 'game-editor/:type/:id', loadChildren: () => import('./components/game/game-editor/game-editor.module').then(m => m.GameEditorModule), data: { animation: 'game-editor' } },

  { path: 'manage-player', loadChildren: () => import('./components/player/manage-player/manage-player.module').then(m => m.ManagePlayerModule), data: { animation: 'manage-player' } },
  { path: 'edit-player/:id', loadChildren: () => import('./components/player/edit-player/edit-player.module').then(m => m.EditPlayerModule), data: { animation: 'edit-player' } },
  
  {path: '**', component: PagenotfoundComponent}
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
