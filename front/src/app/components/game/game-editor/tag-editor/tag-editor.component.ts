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
import { Component, OnInit, Input, Inject } from '@angular/core'
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips'
import { COMMA, ENTER } from '@angular/cdk/keycodes'
import { Tag } from 'src/app/core/model/tag.model'
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog'
import { FormControl, FormGroup, Validators } from '@angular/forms'


@Component({
  selector: 'tag-editor',
  templateUrl: './tag-editor.component.html',
  styleUrls: ['./tag-editor.component.css']
})
export class TagEditorComponent implements OnInit {

  readonly separatorKeysCodes = [ENTER, COMMA] as const

  @Input()
  public tags: Tag[] = []

  @Input()
  public title: string = ''

  constructor(private dialog: MatDialog) { }

  ngOnInit(): void {
    console.log("tags", this.tags)
  }

  public removeTag(tag: Tag): void {
    const index = this.tags.indexOf(tag)
    if (index >= 0) {
      this.tags.splice(index, 1)
    }
  }

  public editTag(tag: Tag) {
    this.openDialog(tag, this.tags.indexOf(tag))
  }

  public addTag(): void {
    var tag: Tag = {
      category: "",
      unique: true,
      names: [],
      minOcurrences: 1,
      maxOcurrences: 1
    }
    this.openDialog(tag, -1)
  }

  private openDialog(tag: Tag, index: number) {
    this.dialog.open(DialogTagEditorComponent, {
      disableClose: true,
      data: tag
    }).afterClosed().subscribe((result: Tag) => {
      console.log("tag", result, index)
      if (!result) {
        return
      }
      if (index === -1) {
        this.tags.push(result)
      } else {
        this.tags[index] = result
      }
    })
  }
}

@Component({
  selector: 'dialog-tag-editor',
  templateUrl: '../tag-editor-dialog/tag-editor-dialog.component.html',
  styleUrls: ['../tag-editor-dialog/tag-editor-dialog.component.css']
})
export class DialogTagEditorComponent {

  readonly separatorKeysCodes = [ENTER, COMMA] as const

  public tagEditorForm: FormGroup

  public values: string[] = []

  remove(value: string): void {
    const index = this.values.indexOf(value)
    if (index >= 0) {
      this.values.splice(index, 1)
    }
  }

  edit(valueChip: string, event: MatChipEditedEvent) {
    const value = event.value.trim()

    if (!value) {
      this.remove(valueChip)
      return
    }

    const index = this.values.indexOf(valueChip)
    if (index >= 0) {
      this.values[index] = value
    }
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim()

    if (value) {
      this.values.push(value)
    }

    event.chipInput!.clear()
  }

  cancelTagDialog() {
    this.dialogRef.close(null)
  }

  closeTagDialog() {
    if (!this.tagEditorForm.valid) {
      console.info("Form is invalid")
    }

    this.dialogRef.close({
      category: this.tagEditorForm.get('category')?.value,
      unique: this.tagEditorForm.get('unique')?.value,
      names: this.values,
      minOcurrences: this.tagEditorForm.get('minOcurrences')?.value,
      maxOcurrences: this.tagEditorForm.get('maxOcurrences')?.value
    })
  }

  constructor(public dialogRef: MatDialogRef<DialogTagEditorComponent>, @Inject(MAT_DIALOG_DATA) public data: Tag) {
    this.tagEditorForm = new FormGroup({
      category: new FormControl(data.category, Validators.required),
      unique: new FormControl(data.unique, Validators.required),
      minOcurrences: new FormControl(data.minOcurrences, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      maxOcurrences: new FormControl(data.maxOcurrences, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)])
    })
    data.names.forEach(name => {
      this.values.push(name)
    })
  }
}
