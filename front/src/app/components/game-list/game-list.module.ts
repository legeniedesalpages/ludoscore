/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 13/12/2022 - 11:21:12
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { AuthGuardService } from 'src/app/core/services/auth-guard.service';
import { GameListComponent } from './game-list.component';
import { LoadingSpinnerModule } from '../layout/spinner/loading-spinner.module';
import { GameService } from 'src/app/core/services/game.service';

const routes: Routes = [
  {
    path: '',
    component: GameListComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [GameListComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    LoadingSpinnerModule,
    MatRippleModule
  ],
  exports: [GameListComponent],
  providers: [GameService]
})

export class GameListModule { }