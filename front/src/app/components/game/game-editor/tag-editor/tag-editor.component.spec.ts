import { TestBed } from '@angular/core/testing'
import { MatDialog, MatDialogRef } from '@angular/material/dialog'
import { firstValueFrom } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { Tag, TagValueChange, tagWithValueChanges } from 'src/app/core/model/tag.model'
import { GameEditorModule } from '../game-editor.module'
import { DialogTagEditorComponent, TagEditorComponent } from './tag-editor.component'

describe('Inherited tag values', () => {
  const baseTag: Tag = {
    category: 'Faction', unique: true, minOcurrences: 1, maxOcurrences: 1,
    revealedLater: true, names: ['A', 'B'],
  }
  async function setup(changes: TagValueChange[] = [], inherited = true) {
    TestBed.configureTestingModule({ imports: [GameEditorModule] })
    const fixture = TestBed.createComponent(TagEditorComponent)
    const tags = [{ ...baseTag, names: [...baseTag.names] }]
    fixture.componentRef.setInput('tags', tags)
    fixture.componentRef.setInput('title', 'Tags')
    fixture.componentRef.setInput('tagChanges', changes)
    if (inherited) fixture.componentRef.setInput('baseGameBggId', 42)
    await fixture.whenStable()
    return { fixture, tags, changes }
  }

  async function edit(fixture: Awaited<ReturnType<typeof setup>>['fixture']) {
    fixture.nativeElement.querySelector('mat-chip-row').click()
    await fixture.whenStable()
    return TestBed.inject(MatDialog).openDialogs[0] as MatDialogRef<DialogTagEditorComponent>
  }

  it('edits only values and records additions/removals without touching the base tag', async () => {
    const { fixture, tags, changes } = await setup()
    const dialog = await edit(fixture)
    const editor = dialog.componentInstance
    expect(editor.tagEditorForm.disabled).toBe(true)
    expect(dialog.componentRef!.location.nativeElement.querySelector('[formControlName="unique"]')).toBeNull()
    editor.values = ['B', 'C', 'C']
    dialog.componentRef!.changeDetectorRef.detectChanges()
    const dialogText = dialog.componentRef!.location.nativeElement.textContent
    expect(dialogText).not.toContain('Valeurs du jeu de base')
    expect(dialogText).toContain('Ajoutées : C')
    expect(dialogText).toContain('Retirées : A')
    const closed = firstValueFrom(dialog.afterClosed())
    dialog.componentRef!.location.nativeElement.querySelector('mat-dialog-actions button:last-child').click()
    await closed
    await fixture.whenStable()
    expect(changes).toEqual([{
      baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['C'], removedValues: ['A'],
    }])
    expect(tags).toEqual([baseTag])
    expect(fixture.nativeElement.textContent).toContain('Faction (modifié)')
    expect(fixture.nativeElement.textContent).not.toContain('Ajoutées')
    expect(fixture.nativeElement.querySelector('.tag-add')).toBeNull()
  })

  it('loads effective values, supports cancellation and resets the delta', async () => {
    const change: TagValueChange = {
      baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['C'], removedValues: ['A'],
    }
    const { fixture, tags, changes } = await setup([change])
    const dialog = await edit(fixture)
    expect(dialog.componentInstance.values).toEqual(['B', 'C'])
    dialog.componentInstance.values = []
    const closed = firstValueFrom(dialog.afterClosed())
    dialog.componentInstance.cancelTagDialog()
    await closed
    await fixture.whenStable()
    expect(changes).toEqual([change])
    const second = await edit(fixture)
    const element: HTMLElement = second.componentRef!.location.nativeElement
    element.querySelector<HTMLButtonElement>('.reset-values')!.click()
    second.componentRef!.changeDetectorRef.detectChanges()
    expect(second.componentInstance.values).toEqual(['A', 'B'])
    expect(element.querySelector('.inherited-changes')).toBeNull()
    const reopenedClosed = firstValueFrom(second.afterClosed())
    second.componentInstance.closeTagDialog()
    await reopenedClosed
    await fixture.whenStable()
    expect(changes).toEqual([])
    expect(tags).toEqual([baseTag])
    expect(fixture.nativeElement.textContent).not.toContain('(modifié)')
  })

  it('keeps changes scoped to each parent and tag type, including identical category names', async () => {
    const otherChanges: TagValueChange[] = [
      { baseGameBggId: 60, scope: 'player', category: 'Faction', addedValues: ['Other'], removedValues: [] },
      { baseGameBggId: 42, scope: 'match', category: 'Faction', addedValues: ['Match'], removedValues: [] },
    ]
    const { fixture, changes } = await setup([...otherChanges])
    const dialog = await edit(fixture)
    expect(dialog.componentInstance.values).toEqual(['A', 'B'])
    dialog.componentInstance.values = []
    const closed = firstValueFrom(dialog.afterClosed())
    dialog.componentInstance.closeTagDialog()
    await closed
    await fixture.whenStable()
    expect(changes).toEqual([...otherChanges, {
      baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: [], removedValues: ['A', 'B'],
    }])
    expect(fixture.nativeElement.textContent).toContain('Faction (modifié)')
  })

  it('removes a delta when the original values are restored', async () => {
    const { fixture, changes } = await setup([{
      baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['C'], removedValues: ['A'],
    }])
    const dialog = await edit(fixture)
    dialog.componentInstance.values = ['A', 'B']
    const closed = firstValueFrom(dialog.afterClosed())
    dialog.componentInstance.closeTagDialog()
    await closed
    expect(changes).toEqual([])
  })

  it('still creates and edits full tags for normal games and extension-owned tags', async () => {
    const { fixture, tags } = await setup([], false)
    fixture.nativeElement.querySelector('.tag-add').click()
    await fixture.whenStable()
    const dialog = TestBed.inject(MatDialog).openDialogs[0]
    const editor: DialogTagEditorComponent = dialog.componentInstance
    expect(editor.tagEditorForm.enabled).toBe(true)
    editor.tagEditorForm.patchValue({ category: 'New', unique: false, minOcurrences: 1, maxOcurrences: 2 })
    editor.values = ['One']
    const closed = firstValueFrom(dialog.afterClosed())
    editor.closeTagDialog()
    await closed
    await fixture.whenStable()
    expect(tags).toHaveLength(2)
    expect(tags[1]).toEqual(expect.objectContaining({ category: 'New', unique: false, names: ['One'], maxOcurrences: 2 }))
  })

  it('applies value deltas without mutating rules or input arrays', () => {
    expect(tagWithValueChanges(baseTag, {
      baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['C'], removedValues: ['A'],
    })).toEqual({ ...baseTag, names: ['B', 'C'] })
    expect(baseTag.names).toEqual(['A', 'B'])
  })
})
