import { TestBed } from '@angular/core/testing'
import { MatDialog, MatDialogRef } from '@angular/material/dialog'
import { firstValueFrom } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { ScoreTag, ScoreTagChange, scoreTagDifferences, scoreTagWithChanges } from 'src/app/core/model/score.model'
import { COLORS, NO_COLOR } from 'src/app/core/model/tag.model'
import { GameEditorModule } from '../game-editor.module'
import { DialogScoreTagEditorComponent, ScoreTagEditorComponent } from './score-tag-editor.component'

describe('Inherited score categories', () => {
  const baseTag: ScoreTag = { category: 'Animaux', min: 0, max: 10, negatif: false, complex: false, color: NO_COLOR }

  async function setup(changes: ScoreTagChange[] = [], inherited = true) {
    TestBed.configureTestingModule({ imports: [GameEditorModule] })
    const fixture = TestBed.createComponent(ScoreTagEditorComponent)
    const tags = [{ ...baseTag }]
    fixture.componentRef.setInput('tags', tags)
    fixture.componentRef.setInput('title', 'Scores')
    fixture.componentRef.setInput('scoreChanges', changes)
    if (inherited) fixture.componentRef.setInput('baseGameBggId', 42)
    await fixture.whenStable()
    return { fixture, tags, changes }
  }

  async function edit(fixture: Awaited<ReturnType<typeof setup>>['fixture']) {
    fixture.nativeElement.querySelector('mat-chip-row').click()
    await fixture.whenStable()
    return TestBed.inject(MatDialog).openDialogs[0] as MatDialogRef<DialogScoreTagEditorComponent>
  }

  async function close(dialog: MatDialogRef<DialogScoreTagEditorComponent>, cancel = false) {
    const closed = firstValueFrom(dialog.afterClosed())
    if (cancel) dialog.componentInstance.cancelTagDialog()
    else dialog.componentInstance.closeTagDialog()
    await closed
  }

  it('records only modified properties without touching the base category', async () => {
    const { fixture, tags, changes } = await setup()
    expect(fixture.nativeElement.querySelector('.tag-add')).toBeNull()
    expect(fixture.nativeElement.querySelector('[matChipRemove]')).toBeNull()
    const dialog = await edit(fixture)
    const editor = dialog.componentInstance
    expect(editor.tagEditorForm.get('category')!.disabled).toBe(true)
    editor.tagEditorForm.patchValue({ max: 20, negatif: true, color: COLORS[0] })
    dialog.componentRef!.changeDetectorRef.detectChanges()
    expect(dialog.componentRef!.location.nativeElement.textContent)
      .toContain("Modifié par l'extension : Valeur maximum, Retranche sa valeur, Couleur")
    await close(dialog)
    await fixture.whenStable()
    expect(changes).toEqual([{ baseGameBggId: 42, category: 'Animaux', properties: { max: 20, negatif: true, color: COLORS[0] } }])
    expect(tags).toEqual([baseTag])
    expect(fixture.nativeElement.textContent).toContain('Animaux (modifié)')
  })

  it('loads effective properties, supports cancellation and reset', async () => {
    const change: ScoreTagChange = { baseGameBggId: 42, category: 'Animaux', properties: { min: null, complex: true } }
    const other: ScoreTagChange = { baseGameBggId: 60, category: 'Animaux', properties: { negatif: true } }
    const { fixture, changes } = await setup([other, change])
    const dialog = await edit(fixture)
    expect(dialog.componentInstance.tagEditorForm.get('min')!.value).toBeNull()
    expect(dialog.componentInstance.tagEditorForm.get('complex')!.value).toBe(true)
    dialog.componentInstance.tagEditorForm.patchValue({ max: 99 })
    await close(dialog, true)
    expect(changes).toEqual([other, change])

    const second = await edit(fixture)
    const element: HTMLElement = second.componentRef!.location.nativeElement
    second.componentRef!.changeDetectorRef.detectChanges()
    element.querySelector<HTMLButtonElement>('.reset-values')!.click()
    second.componentRef!.changeDetectorRef.detectChanges()
    expect(element.querySelector('.inherited-changes')).toBeNull()
    await close(second)
    await fixture.whenStable()
    expect(changes).toEqual([other])
    expect(fixture.nativeElement.textContent).not.toContain('(modifié)')
  })

  it('still creates categories for normal games and extension-owned categories', async () => {
    const { fixture, tags } = await setup([], false)
    fixture.nativeElement.querySelector('.tag-add').click()
    await fixture.whenStable()
    const dialog = TestBed.inject(MatDialog).openDialogs[0] as MatDialogRef<DialogScoreTagEditorComponent>
    expect(dialog.componentInstance.tagEditorForm.get('category')!.enabled).toBe(true)
    dialog.componentInstance.tagEditorForm.patchValue({ category: 'Bonus' })
    await close(dialog)
    expect(tags).toHaveLength(2)
    expect(tags[1]).toEqual(expect.objectContaining({ category: 'Bonus' }))
  })

  it('compares properties after normalisation', () => {
    expect(scoreTagDifferences(baseTag, { ...baseTag, min: '0' as unknown as number, color: { ...NO_COLOR, code: 'WHITE' } })).toEqual({})
    expect(scoreTagWithChanges(baseTag, { baseGameBggId: 42, category: 'Animaux', properties: { max: null } }).max).toBeUndefined()
  })
})
