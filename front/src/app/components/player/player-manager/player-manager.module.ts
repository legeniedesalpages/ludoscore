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
import { PlayerService } from 'src/app/core/services/player.service';
import { PlayerManagerComponent } from './player-manager.component';
import { PlayerListModule } from '../player-list/player-list.module';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

const routes: Routes = [
  {
    path: '',
    component: PlayerManagerComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [PlayerManagerComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    PlayerListModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSlideToggleModule
  ],
  providers: [PlayerService]
})
export class PlayerManagerModule { }