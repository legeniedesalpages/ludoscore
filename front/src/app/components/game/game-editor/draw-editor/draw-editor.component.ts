/**
    * @description      :
    * @author           : renau
    * @group            :
    * @created          : 10/01/2023 - 00:06:52
    *
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 10/01/2023
    * - Author          : renau
    * - Modification    :
**/
import { Component, Input, Inject } from '@angular/core'
import { COMMA, ENTER } from '@angular/cdk/keycodes'
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { DrawBreaker } from 'src/app/core/model/game.model'


@Component({
  selector: 'draw-editor',
  templateUrl: './draw-editor.component.html',
  styleUrls: ['./draw-editor.component.css']
})
export class DrawEditorComponent {

  readonly separatorKeysCodes = [ENTER, COMMA] as const

  @Input()
  public drawBreakerList: DrawBreaker[] = []

  @Input()
  public title: string = ''

  constructor(private dialog: MatDialog) { }

  public removeTag(tag: DrawBreaker): void {
    const index = this.drawBreakerList.indexOf(tag)
    if (index >= 0) {
      this.drawBreakerList.splice(index, 1)
    }
  }

  public editTag(tag: DrawBreaker) {
    this.openDialog(tag, this.drawBreakerList.indexOf(tag))
  }

  public addTag(): void {
    var tag: DrawBreaker = {
      reason: "",
      withValue: true
    }
    this.openDialog(tag, -1)
  }

  private openDialog(tag: DrawBreaker, index: number) {
    this.dialog.open(DialogDrawEditorComponent, {
      disableClose: true,
      data: tag
    }).afterClosed().subscribe((result: DrawBreaker) => {
      if (!result) {
        return
      }
      if (index === -1) {
        this.drawBreakerList.push(result)
      } else {
        this.drawBreakerList[index] = result
      }
    })
  }
}

@Component({
  selector: 'dialog-draw-editor',
  templateUrl: '../draw-editor-dialog/draw-editor-dialog.component.html',
  styleUrls: ['../draw-editor-dialog/draw-editor-dialog.component.css']
})
export class DialogDrawEditorComponent {

  readonly separatorKeysCodes = [ENTER, COMMA] as const

  public drawEditorForm: FormGroup

  cancelTagDialog() {
    this.dialogRef.close(null)
  }

  closeTagDialog() {
    if (!this.drawEditorForm.valid) {
      return
    }

    this.dialogRef.close({
      reason: this.drawEditorForm.get('reason')?.value,
      withValue: this.drawEditorForm.get('withValue')?.value
    })
  }

  constructor(public dialogRef: MatDialogRef<DialogDrawEditorComponent>, @Inject(MAT_DIALOG_DATA) public data: DrawBreaker) {
    this.drawEditorForm = new FormGroup({
      reason: new FormControl(data.reason, Validators.required),
      withValue: new FormControl(data.withValue, Validators.required)
    })
  }
}
