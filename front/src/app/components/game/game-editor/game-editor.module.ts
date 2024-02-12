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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { GameEditorComponent } from './game-editor.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { TagEditorComponent } from './tag-editor/tag-editor.component';
import { ColorTagEditorComponent, DialogColorTagEditorComponent } from './color-tag-editor/color-tag-editor.component';
import { AuthGuardService } from 'src/app/core/services/auth/auth-guard.service';
import { FindGameService } from 'src/app/core/services/game/find-game.service';
import { GameService } from 'src/app/core/services/game/game.service';
import { LayoutModule } from '../../layout/layout.module';

const routes: Routes = [
  {
    path: '',
    component: GameEditorComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [GameEditorComponent, TagEditorComponent, ColorTagEditorComponent, DialogColorTagEditorComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatButtonModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatDividerModule,
    MatRippleModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDatepickerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatNativeDateModule,
    MatDialogModule,
    LayoutModule
  ],
  exports: [TagEditorComponent],
  providers: [
    FindGameService,
    GameService,
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' }
  ]
})
export class GameEditorModule { }
