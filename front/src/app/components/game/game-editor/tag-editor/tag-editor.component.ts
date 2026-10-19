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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, Input, Inject } from '@angular/core'
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips'
import { COMMA, ENTER } from '@angular/cdk/keycodes'
import { Tag, TagScope, TagValueChange, tagWithValueChanges } from 'src/app/core/model/tag.model'
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog'
import { FormControl, FormGroup, Validators } from '@angular/forms'


@Component({
  selector: 'tag-editor',
  templateUrl: './tag-editor.component.html',
  styleUrls: ['./tag-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class TagEditorComponent implements OnInit {

  readonly separatorKeysCodes = [ENTER, COMMA] as const

  @Input()
  public tags: Tag[] = []

  @Input()
  public title: string = ''

  @Input()
  public baseGameBggId?: number

  @Input()
  public tagScope: TagScope = 'player'

  @Input()
  public tagChanges: TagValueChange[] = []

  constructor(private dialog: MatDialog, private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    console.log("tags", this.tags)
  }

  public removeTag(tag: Tag): void {
    if (this.baseGameBggId !== undefined) return
    const index = this.tags.indexOf(tag)
    if (index >= 0) {
      this.tags.splice(index, 1)
    }
  }

  public editTag(tag: Tag) {
    if (this.baseGameBggId !== undefined) {
      this.dialog.open(DialogTagEditorComponent, {
        disableClose: true,
        data: { ...tagWithValueChanges(tag, this.changeFor(tag)), valuesOnly: true, originalNames: [...tag.names] },
      }).afterClosed().subscribe((result: Tag | undefined) => {
        if (!result) return
        const previous = this.changeFor(tag)
        if (previous) this.tagChanges.splice(this.tagChanges.indexOf(previous), 1)
        const addedValues = [...new Set(result.names.filter(value => !tag.names.includes(value)))]
        const removedValues = tag.names.filter(value => !result.names.includes(value))
        if (addedValues.length || removedValues.length) {
          this.tagChanges.push({
            baseGameBggId: this.baseGameBggId!,
            scope: this.tagScope,
            category: tag.category,
            addedValues,
            removedValues,
          })
        }
        this.changeDetectorRef.markForCheck()
      })
      return
    }
    this.openDialog(tag, this.tags.indexOf(tag))
  }

  public changeFor(tag: Tag): TagValueChange | undefined {
    return this.tagChanges.find(change => change.baseGameBggId === this.baseGameBggId &&
      change.scope === this.tagScope && change.category === tag.category)
  }

  public addTag(): void {
    if (this.baseGameBggId !== undefined) return
    var tag: Tag = {
      category: "",
      unique: true,
      names: [],
      minOcurrences: 1,
      maxOcurrences: 1,
      revealedLater: false
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
      this.changeDetectorRef.markForCheck()
    })
  }
}

@Component({
  selector: 'dialog-tag-editor',
  templateUrl: '../tag-editor-dialog/tag-editor-dialog.component.html',
  styleUrls: ['../tag-editor-dialog/tag-editor-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
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

  get addedValues(): string[] {
    const original = this.data.originalNames ?? []
    return [...new Set(this.values.filter(value => !original.includes(value)))]
  }

  get removedValues(): string[] {
    return (this.data.originalNames ?? []).filter(value => !this.values.includes(value))
  }

  resetValues(): void {
    this.values = [...(this.data.originalNames ?? [])]
  }

  cancelTagDialog() {
    this.dialogRef.close(null)
  }

  closeTagDialog() {
    if (!this.tagEditorForm.valid) {
      console.info("Form is invalid")
    }

    if (this.data.valuesOnly) {
      this.dialogRef.close({ ...this.data, names: [...new Set(this.values)] })
      return
    }
    this.dialogRef.close({
      category: this.tagEditorForm.get('category')?.value,
      unique: this.tagEditorForm.get('unique')?.value,
      names: this.values,
      minOcurrences: this.tagEditorForm.get('minOcurrences')?.value,
      maxOcurrences: this.tagEditorForm.get('maxOcurrences')?.value,
      revealedLater: !!this.tagEditorForm.get('revealedLater')?.value
    })
  }

  constructor(public dialogRef: MatDialogRef<DialogTagEditorComponent>, @Inject(MAT_DIALOG_DATA) public data: Tag & { valuesOnly?: boolean, originalNames?: string[] }) {
    this.tagEditorForm = new FormGroup({
      category: new FormControl(data.category, Validators.required),
      unique: new FormControl(data.unique, Validators.required),
      revealedLater: new FormControl(!!data.revealedLater),
      minOcurrences: new FormControl(data.minOcurrences, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      maxOcurrences: new FormControl(data.maxOcurrences, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)])
    })
    data.names.forEach(name => {
      this.values.push(name)
    })
    if (data.valuesOnly) this.tagEditorForm.disable()
  }
}
