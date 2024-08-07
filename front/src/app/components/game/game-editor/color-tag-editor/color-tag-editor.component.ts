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
import { Component, Inject, Input, OnInit } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog'
import { COLORS, ColorTag } from 'src/app/core/model/tag.model'

@Component({
    selector: 'color-tag-editor',
    templateUrl: './color-tag-editor.component.html',
    styleUrls: ['./color-tag-editor.component.css']
})
export class ColorTagEditorComponent implements OnInit {

    @Input()
    public tags: ColorTag[] = []

    @Input()
    public title: string = ''

    constructor(private dialog: MatDialog) { }

    ngOnInit(): void {
    }

    public removeTag(tag: ColorTag): void {
        const index = this.tags.indexOf(tag)
        if (index >= 0) {
            this.tags.splice(index, 1)
        }
    }

    public addColorTag() {
        this.dialog.open(DialogColorTagEditorComponent, {
            data: {
                colorTags: this.tags
            }
        })
    }
}

@Component({
    selector: 'dialog-color-tag-editor',
    templateUrl: '../color-tag-editor-dialog/color-tag-editor-dialog.component.html',
    styleUrls: ['../color-tag-editor-dialog/color-tag-editor-dialog.component.css']
})
export class DialogColorTagEditorComponent {

    public tags: ColorTag[]

    constructor(public dialogRef: MatDialogRef<DialogColorTagEditorComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
        this.tags = this.data.colorTags
        console.log(this.tags)
    }

    public chooseColor(colorTag: ColorTag) {
        this.tags.push(colorTag)
    }

    public filteredColors(): ColorTag[] {
        return COLORS.filter(x => {
            return !this.tags.map(c => c.code).includes(x.code)
        })
    }
}