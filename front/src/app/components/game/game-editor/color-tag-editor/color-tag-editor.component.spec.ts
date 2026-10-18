import { CommonModule } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { MatButtonModule } from '@angular/material/button'
import { MatChipsModule } from '@angular/material/chips'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { describe, expect, it } from 'vitest'
import { firstValueFrom } from 'rxjs'
import { COLORS, ColorTag } from 'src/app/core/model/tag.model'
import { ColorTagEditorComponent, DialogColorTagEditorComponent } from './color-tag-editor.component'

describe('ColorTagEditorComponent', () => {
  async function setup(tags: ColorTag[] = []) {
    TestBed.configureTestingModule({
      declarations: [ColorTagEditorComponent, DialogColorTagEditorComponent],
      imports: [CommonModule, MatButtonModule, MatChipsModule, MatDialogModule, MatFormFieldModule, MatIconModule],
    })
    const fixture = TestBed.createComponent(ColorTagEditorComponent)
    fixture.componentRef.setInput('tags', tags)
    fixture.componentRef.setInput('title', 'Couleurs')
    await fixture.whenStable()
    return fixture
  }

  it.each(['ok', 'dismiss'])('refreshes selected colors after closing the dialog with %s', async close => {
    const tags: ColorTag[] = []
    const fixture = await setup(tags)
    const add: HTMLButtonElement = fixture.nativeElement.querySelector('.color-add')
    add.click()
    await fixture.whenStable()
    const dialog = TestBed.inject(MatDialog).openDialogs[0]
    const closed = firstValueFrom(dialog.afterClosed())
    const choices = dialog.componentRef!.location.nativeElement.querySelectorAll('.column > div')
    choices[0].click()
    await fixture.whenStable()
    expect(tags).toEqual([COLORS[0]])

    if (close === 'ok') {
      const ok: HTMLButtonElement = dialog.componentRef!.location.nativeElement.querySelector('[mat-dialog-close]')
      ok.click()
    } else {
      dialog.close()
    }
    await closed
    await fixture.whenStable()
    const chips: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-chip-row')
    expect(chips).toHaveLength(1)
    expect(chips[0].textContent).toContain(COLORS[0].name)

    add.click()
    await fixture.whenStable()
    const reopened = TestBed.inject(MatDialog).openDialogs[0]
    expect(reopened.componentInstance.filteredColors()).not.toContain(COLORS[0])
    const reopenedClosed = firstValueFrom(reopened.afterClosed())
    reopened.close()
    await reopenedClosed
    await fixture.whenStable()
    const remove: HTMLButtonElement = fixture.nativeElement.querySelector('[matChipRemove]')
    remove.click()
    await fixture.whenStable()
    expect(tags).toEqual([])
    expect(fixture.nativeElement.querySelectorAll('mat-chip-row')).toHaveLength(0)
  })

  it('preserves existing colors when the dialog closes without a selection', async () => {
    const tags = [COLORS[1]]
    const fixture = await setup(tags)
    const add: HTMLButtonElement = fixture.nativeElement.querySelector('.color-add')
    add.click()
    await fixture.whenStable()
    const dialog = TestBed.inject(MatDialog).openDialogs[0]
    const closed = firstValueFrom(dialog.afterClosed())
    dialog.close()
    await closed
    await fixture.whenStable()
    expect(tags).toEqual([COLORS[1]])
    expect(fixture.nativeElement.querySelector('mat-chip-row').textContent).toContain(COLORS[1].name)
  })
})
