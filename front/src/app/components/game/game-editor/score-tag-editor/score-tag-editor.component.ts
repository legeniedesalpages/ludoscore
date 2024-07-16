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
import { Component, OnInit, Input, Inject } from '@angular/core';
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ScoreTag } from 'src/app/core/model/score.model';
import { COLORS, ColorTag, NO_COLOR } from 'src/app/core/model/tag.model';


@Component({
  selector: 'score-tag-editor',
  templateUrl: './score-tag-editor.component.html',
  styleUrls: ['./score-tag-editor.component.css']
})
export class ScoreTagEditorComponent implements OnInit {

  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  @Input()
  public tags: ScoreTag[] = [];

  @Input()
  public title: string = '';

  constructor(private dialog: MatDialog) { }

  ngOnInit(): void {
    console.log("Score tags", this.tags);
  }

  public removeTag(tag: ScoreTag): void {
    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  public editTag(tag: ScoreTag) {
    this.openDialog(tag, this.tags.indexOf(tag));
  }

  public addTag(): void {
    var tag: ScoreTag = {
      category: "",
      min: undefined,
      max: undefined,
      negatif: false,
      complex: false,
      color: NO_COLOR
    }
    this.openDialog(tag, -1);
  }

  private openDialog(tag: ScoreTag, index: number) {
    this.dialog.open(DialogScoreTagEditorComponent, {
      disableClose: true,
      data: tag
    }).afterClosed().subscribe((result: ScoreTag) => {
      console.log("Tag", result, index);
      if (!result) {
        return;
      }
      if (index === -1) {
        this.tags.push(result);
      } else {
        this.tags[index] = result;
      }
    });
  }
}

@Component({
  selector: 'dialog-score-tag-editor',
  templateUrl: '../score-tag-editor-dialog/score-tag-editor-dialog.component.html',
  styleUrls: ['../score-tag-editor-dialog/score-tag-editor-dialog.component.css']
})
export class DialogScoreTagEditorComponent {

  readonly separatorKeysCodes = [ENTER, COMMA] as const

  public tagEditorForm: FormGroup

  public values: string[] = []
  public newColor: ColorTag = NO_COLOR
  public colors: ColorTag[] = COLORS


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
      min: this.tagEditorForm.get('min')?.value,
      max: this.tagEditorForm.get('max')?.value,
      negatif: this.tagEditorForm.get('negatif')?.value,
      complex: this.tagEditorForm.get('complex')?.value,
      color: this.tagEditorForm.get('color')?.value
    })
  }

  constructor(public dialogRef: MatDialogRef<DialogScoreTagEditorComponent>, @Inject(MAT_DIALOG_DATA) public data: ScoreTag) {
    this.tagEditorForm = new FormGroup({
      category: new FormControl(data.category, Validators.required),
      min: new FormControl(data.min, [Validators.pattern("^[0-9\-]*$")]),
      max: new FormControl(data.max, [Validators.pattern("^[0-9\-]*$")]),
      negatif: new FormControl(data.negatif, Validators.required),
      complex: new FormControl(data.complex, Validators.required),
      color: new FormControl(data.color, Validators.required)
    });
    this. newColor = data.color
  }
}
