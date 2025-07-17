/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 14/07/2024 - 23:17:57
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 14/07/2024
    * - Author          : renau
    * - Modification    : 
**/
import { CommonModule } from '@angular/common'
import { Component, Inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule } from '@angular/material/dialog'

@Component({
    selector: 'app-confirmation-dialog',
    template: `
        <h2 mat-dialog-title>Continuer ?</h2>
        <mat-dialog-content class="dialog row">
            {{ data.message }}
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button mat-button (click)="dialogRef.close(false)">Annuler</button>
            <button mat-button (click)="dialogRef.close(true)">Continuer</button>
        </mat-dialog-actions>
  `,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule
    ]
})
export class ConfirmationDialogComponent {
    constructor(public dialogRef: MatDialogRef<ConfirmationDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }
}