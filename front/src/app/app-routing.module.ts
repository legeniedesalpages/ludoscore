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
import { HomeModule } from './components/home/home.module';
import { HomeComponent } from './components/home/home.component';
import { FindGameComponent } from './components/find-game/find-game.component';
import { FindGameModule } from './components/find-game/find-game.module';
import { LoginComponent } from './components/login/login.component';
import { LoginModule } from './components/login/login.module';
import { GameListModule } from './components/game-list/game-list.module';
import { GameListComponent } from './components/game-list/game-list.component';
import { RegisterComponent } from './components/register/register.component';
import { RegisterModule } from './components/register/register.module';
import { MatchEditorComponent } from './components/match-editor/match-editor.component';
import { MatchEditorModule } from './components/match-editor/match-editor.module';
import { PlayerManagerComponent } from './components/player/player-manager/player-manager.component';
import { PlayerManagerModule } from './components/player/player-manager/player-manager.module';
import { MatchFinisherComponent } from './components/match-finisher/match-finisher.component';
import { MatchFinisherModule } from './components/match-finisher/match-finisher.module';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'find-game', component: FindGameComponent },
  { path: 'game-list', component: GameListComponent },  
  { path: 'match-editor', component: MatchEditorComponent },
  { path: 'player-manager', component: PlayerManagerComponent },
  { path: 'match-finisher/:id', component: MatchFinisherComponent },
  { path: 'player-editor', loadChildren: () => import('./components/player/player-editor/player-editor.module').then(m => m.PlayerEditorModule) },
  { path: 'player-editor/:id', loadChildren: () => import('./components/player/player-editor/player-editor.module').then(m => m.PlayerEditorModule) },
  { path: 'game-editor/:type/:id', loadChildren: () => import('./components/game-editor/game-editor.module').then(m => m.GameEditorModule) }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { useHash: true }),
    HomeModule,
    FindGameModule,
    LoginModule,
    RegisterModule,
    GameListModule,
    MatchEditorModule,
    PlayerManagerModule,
    MatchFinisherModule
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}