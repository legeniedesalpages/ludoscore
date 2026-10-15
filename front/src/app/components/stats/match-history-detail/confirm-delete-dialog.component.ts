import { Component } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule } from '@angular/material/dialog'

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Supprimer cette partie ?</h2>
    <mat-dialog-content>Cette action est définitive : la partie, ses scores et sa photo seront supprimés.</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Annuler</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Supprimer</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDeleteDialogComponent { }
