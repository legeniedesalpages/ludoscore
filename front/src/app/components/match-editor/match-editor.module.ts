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
import { AuthGuardService } from 'src/app/core/services/auth-guard.service';
import { MatchEditorComponent } from './match-editor.component';
import { MatchService } from 'src/app/core/services/match.service';
import { GameListModule } from '../game-list/game-list.module';
import { LoadingSpinnerModule } from '../layout/spinner/loading-spinner.module';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameService } from 'src/app/core/services/game.service';

const routes: Routes = [
  {
    path: '',
    component: MatchEditorComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [MatchEditorComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),    
    GameListModule,
    LoadingSpinnerModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [
    MatchService,
    GameService
  ]
})
export class MatchEditorModule { }
