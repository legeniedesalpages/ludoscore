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
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { SCORE_TAG_PROPERTY_LABELS, ScoreTag, ScoreTagChange, scoreTagDifferences, scoreTagWithChanges } from 'src/app/core/model/score.model'
import { COLORS, ColorTag, NO_COLOR } from 'src/app/core/model/tag.model'


@Component({
  selector: 'score-tag-editor',
  templateUrl: './score-tag-editor.component.html',
  styleUrls: ['./score-tag-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class ScoreTagEditorComponent implements OnInit {

  readonly separatorKeysCodes = [ENTER, COMMA] as const

  @Input()
  public tags: ScoreTag[] = []

  @Input()
  public title: string = ''

  @Input()
  public baseGameBggId?: number

  @Input()
  public scoreChanges: ScoreTagChange[] = []

  constructor(private dialog: MatDialog, private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    console.log("Score tags", this.tags)
  }

  public removeTag(tag: ScoreTag): void {
    if (this.baseGameBggId !== undefined) return
    const index = this.tags.indexOf(tag)
    if (index >= 0) {
      this.tags.splice(index, 1)
    }
  }

  public changeFor(tag: ScoreTag): ScoreTagChange | undefined {
    return this.scoreChanges.find(change => change.baseGameBggId === this.baseGameBggId && change.category === tag.category)
  }

  public editTag(tag: ScoreTag) {
    if (this.baseGameBggId !== undefined) {
      this.dialog.open(DialogScoreTagEditorComponent, {
        disableClose: true,
        data: { ...scoreTagWithChanges(tag, this.changeFor(tag)), original: tag },
      }).afterClosed().subscribe((result: ScoreTag | null | undefined) => {
        if (!result) return
        const previous = this.changeFor(tag)
        if (previous) this.scoreChanges.splice(this.scoreChanges.indexOf(previous), 1)
        const properties = scoreTagDifferences(tag, result)
        if (Object.keys(properties).length) {
          this.scoreChanges.push({ baseGameBggId: this.baseGameBggId!, category: tag.category, properties })
        }
        this.changeDetectorRef.markForCheck()
      })
      return
    }
    this.openDialog(tag, this.tags.indexOf(tag))
  }

  public addTag(): void {
    if (this.baseGameBggId !== undefined) return
    var tag: ScoreTag = {
      category: "",
      min: undefined,
      max: undefined,
      negatif: false,
      complex: false,
      color: NO_COLOR
    }
    this.openDialog(tag, -1)
  }

  private openDialog(tag: ScoreTag, index: number) {
    this.dialog.open(DialogScoreTagEditorComponent, {
      disableClose: true,
      data: tag
    }).afterClosed().subscribe((result: ScoreTag) => {
      console.log("Tag", result, index)
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
  selector: 'dialog-score-tag-editor',
  templateUrl: '../score-tag-editor-dialog/score-tag-editor-dialog.component.html',
  styleUrls: ['../score-tag-editor-dialog/score-tag-editor-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
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

  get inherited(): boolean {
    return !!this.data.original
  }

  public readonly compareColors = (a?: ColorTag, b?: ColorTag) =>
    (a?.code ?? '').toLowerCase() === (b?.code ?? '').toLowerCase()

  private formTag(): ScoreTag {
    const value = this.tagEditorForm.getRawValue()
    return { category: value.category, min: value.min, max: value.max, negatif: value.negatif, complex: value.complex, color: value.color }
  }

  get changedProperties(): string[] {
    if (!this.data.original) return []
    return Object.keys(scoreTagDifferences(this.data.original, this.formTag()))
      .map(property => SCORE_TAG_PROPERTY_LABELS[property as keyof typeof SCORE_TAG_PROPERTY_LABELS])
  }

  resetProperties(): void {
    const original = this.data.original!
    this.tagEditorForm.patchValue({
      min: original.min ?? null, max: original.max ?? null,
      negatif: !!original.negatif, complex: !!original.complex, color: original.color,
    })
    this.newColor = original.color
  }

  closeTagDialog() {
    if (!this.tagEditorForm.valid) {
      console.info("Form is invalid")
    }

    this.dialogRef.close(this.formTag())
  }

  constructor(public dialogRef: MatDialogRef<DialogScoreTagEditorComponent>, @Inject(MAT_DIALOG_DATA) public data: ScoreTag & { original?: ScoreTag }) {
    this.tagEditorForm = new FormGroup({
      category: new FormControl(data.category, Validators.required),
      min: new FormControl(data.min, [Validators.pattern("^[0-9\-]*$")]),
      max: new FormControl(data.max, [Validators.pattern("^[0-9\-]*$")]),
      negatif: new FormControl(data.negatif, Validators.required),
      complex: new FormControl(data.complex, Validators.required),
      color: new FormControl(data.color, Validators.required)
    })
    this. newColor = data.color
    if (data.original) this.tagEditorForm.get('category')!.disable()
  }
}
