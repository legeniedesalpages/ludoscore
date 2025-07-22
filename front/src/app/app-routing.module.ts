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
import { RouterModule, Routes } from '@angular/router';
import { PagenotfoundComponent } from './components/misc/page-not-found.component';
import { AuthGuardService } from './core/services/auth/auth-guard.service';

const routes: Routes = [
  { path: '', loadChildren: () => import('./components/home/home.module').then(m => m.HomeModule), data: { animation: 'home' } },

  { path: 'login', loadChildren: () => import('./components/login/login.module').then(m => m.LoginModule), data: { animation: 'login' } },
  { path: 'user-create', loadChildren: () => import('./components/user/create/user-create.module').then(m => m.UserCreateModule), data: { animation: 'user-create' } },
  { path: 'confirm-account', loadChildren: () => import('./components/user/confirmation/user-confirmation.module').then(m => m.UserConfirmationModule), data: { animation: 'user-confirmation' } },

  { path: 'game-selection', loadChildren: () => import('./components/match/game-selection/game-selection.module').then(m => m.GameSelectionModule), data: { animation: 'game-selection' } },
  { path: 'player-selection', loadComponent: () => import('./components/match/player-selection/player-selection.component').then(c => c.PlayerSelectionComponent), canActivate: [AuthGuardService], data: { animation: 'player-selection' } },
  { path: 'random-toolbox', loadChildren: () => import('./components/match/randomize/randomize.module').then(m => m.RandomizeModule), data: { animation: 'random-toolbox' } },

  { path: 'match-display', loadChildren: () => import('./components/match/display/match-display.module').then(m => m.MatchDisplayModule), data: { animation: 'match-display' } },
  { path: 'match-end', loadComponent: () => import('./components/match/end/match-end.component').then(c => c.MatchEndComponent), canActivate: [AuthGuardService], data: { animation: 'match-end' } },
  { path: 'team-score-by-player', loadComponent: () => import('./components/match/team-score/by-player/team-score-by-player.component').then(c => c.TeamScoreByPlayerComponent), canActivate: [AuthGuardService], data: { animation: 'team-score' } },
  { path: 'team-score-by-category', loadComponent: () => import('./components/match/team-score/by-category/team-score-by-category.component').then(c => c.TeamScoreByCategoryComponent), canActivate: [AuthGuardService], data: { animation: 'team-score' } },
  { path: 'wheel', loadChildren: () => import('./components/match/wheel/wheel.module').then(m => m.WheelModule), data: { animation: 'wheel' } },

  { path: 'find-game', loadChildren: () => import('./components/game/find-game/find-game.module').then(m => m.FindGameModule), data: { animation: 'find-game' } },
  { path: 'game-editor/:type/:id', loadChildren: () => import('./components/game/game-editor/game-editor.module').then(m => m.GameEditorModule), data: { animation: 'game-editor' } },

  { path: 'manage-player', loadChildren: () => import('./components/player/manage-player/manage-player.module').then(m => m.ManagePlayerModule), data: { animation: 'manage-player' } },
  { path: 'edit-player/:id', loadChildren: () => import('./components/player/edit-player/edit-player.module').then(m => m.EditPlayerModule), data: { animation: 'edit-player' } },

  { path: 'match-history', loadComponent: () => import('./components/stats/match-history/match-history.component').then(c => c.MatchHistoryComponent), canActivate: [AuthGuardService], data: { animation: 'match-history' } },
  { path: 'match-history-detail/:id', loadComponent: () => import('./components/stats/match-history-detail/match-history-detail.component').then(c => c.MatchHistoryDetailComponent), canActivate: [AuthGuardService], data: { animation: 'match-history-detail' } },

  { path: '**', component: PagenotfoundComponent }
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
