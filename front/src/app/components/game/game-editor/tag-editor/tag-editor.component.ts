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
import { Tag } from 'src/app/core/model/tag.model';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';


@Component({
    selector: 'tag-editor',
    templateUrl: './tag-editor.component.html',
    styleUrls: ['./tag-editor.component.css']
})
export class TagEditorComponent implements OnInit {

    readonly separatorKeysCodes = [ENTER, COMMA] as const;

    @Input()
    public tags: Tag[] = [];

    @Input()
    public title: string = '';

    constructor(private dialog: MatDialog) { }

    ngOnInit(): void {
    }

    public removeTag(tag: Tag): void {
        const index = this.tags.indexOf(tag);
        if (index >= 0) {
            this.tags.splice(index, 1);
        }
    }

    public editTag(tag: Tag, event: MatChipEditedEvent) {

    }

    public addTag(): void {
        this.dialog.open(DialogTagEditorComponent, {
            data: {
                colorTags: this.tags
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

    public tagEditorForm: FormGroup;

    public values: string[] = [];

    public addValue(): void {
      console.debug(this.tagEditorForm.get('value')?.value)
      this.values.push(this.tagEditorForm.get('value')?.value)
      this.tagEditorForm.get('value')?.setValue("")

      var tag: Tag = {
        category: this.tagEditorForm.get('category')?.value,
        unique: this.tagEditorForm.get('unique')?.value,
        names: this.values,
        minOcurrences: this.tagEditorForm.get('minOcurrences')?.value,
        maxOcurrences: this.tagEditorForm.get('maxOcurrences')?.value
      }

      console.debug(tag)
    }

    constructor(public dialogRef: MatDialogRef<DialogTagEditorComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
        this.tagEditorForm = new FormGroup({
            category: new FormControl('', Validators.required),
            unique: new FormControl('', Validators.required),
            value: new FormControl(''),
            minOcurrences: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
            maxOcurrences: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)])
          });
    }
}
