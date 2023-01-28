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
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { A11yModule } from '@angular/cdk/a11y'
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { SidenavComponent } from './sidenav.component';


@NgModule({
  declarations: [SidenavComponent],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    A11yModule,
    FormsModule,
    MatDividerModule
  ],
  exports: [SidenavComponent]
})
export class SidenavModule { }
