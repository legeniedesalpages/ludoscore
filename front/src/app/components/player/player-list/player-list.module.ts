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
import { PlayerListComponent } from './player-list.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { DraggableComponent } from './draggable.component';
import { MatDividerModule } from '@angular/material/divider';
import { PlayerService } from 'src/app/core/services/player.service';
import { DraggableComponent2 } from './draggable2.component';

const routes: Routes = [
  {
    path: '',
    component: PlayerListComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [PlayerListComponent, DraggableComponent, DraggableComponent2],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    DragDropModule,
    MatIconModule,
    MatRippleModule,
    MatDividerModule
  ],
  exports: [PlayerListComponent],
  providers: [PlayerService]
})

export class PlayerListModule { }