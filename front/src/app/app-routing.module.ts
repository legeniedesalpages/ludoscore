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
  {
    path: '',
    loadChildren: () => import('./components/home/home.module').then(m => m.HomeModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./components/auth/login.module').then(m => m.LoginModule)
  },
  {
    path: 'find-game',
    loadChildren: () => import('./components/find-game/find-game.module').then(m => m.FindGameModule)
  },
  {
    path: 'game-editor/:type/:id',
    loadChildren: () => import('./components/game-editor/game-editor.module').then(m => m.GameEditorModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})

export class AppRoutingModule { }