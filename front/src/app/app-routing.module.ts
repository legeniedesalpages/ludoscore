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
  { path: 'player-selection', loadChildren: () => import('./components/match/player-selection/player-selection.module').then(m => m.PlayerSelectionModule), data: { animation: 'player-selection' } }
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