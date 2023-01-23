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
  { path: '', loadChildren: () => import('./components/home/home.module').then(m => m.HomeModule), data: {animation: 'isRight'} },
  { path: 'login', loadChildren: () => import('./components/login/login.module').then(m => m.LoginModule), data: {animation: 'isLeft'} },
  { path: 'match-editor', loadChildren: () => import('./components/match/match-editor/match-editor.module').then(m => m.MatchEditorModule), data: {animation: 'isLeft'} },
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