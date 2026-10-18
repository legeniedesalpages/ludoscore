import { HttpErrorResponse } from '@angular/common/http'
import { ApplicationRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { firstValueFrom, of, Subject } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { MatchService } from 'src/app/core/services/match/match.service'
import { StoryDialogComponent } from './story-dialog.component'

describe('StoryDialogComponent', () => {
  function setup() {
    const response = new Subject<string>()
    const generateMatchStory = vi.fn(() => response.asObservable())
    TestBed.configureTestingModule({ providers: [
      { provide: MatchService, useValue: { generateMatchStory } },
    ] })
    const dialog = TestBed.inject(MatDialog)
    const ref = dialog.open(StoryDialogComponent, {
      data: { matchId: 42 }, disableClose: true, autoFocus: 'dialog', restoreFocus: false
    })
    return { response, generateMatchStory, dialog, ref }
  }

  async function stabilize() {
    await TestBed.inject(ApplicationRef).whenStable()
  }

  it('generates the saved match story and prevents duplicate requests while loading', async () => {
    const { generateMatchStory, response, ref } = setup()
    await stabilize()
    expect(generateMatchStory).toHaveBeenCalledExactlyOnceWith(42)
    expect(document.querySelector('[role=status]')?.textContent).toContain('Le récit de votre partie prend forme')
    const ok = document.querySelector<HTMLButtonElement>('mat-dialog-actions button')!
    expect(ok.disabled).toBe(true)
    ref.componentInstance.generate()
    expect(generateMatchStory).toHaveBeenCalledTimes(1)
    response.next('Un triomphe legendaire.')
    response.complete()
    await stabilize()
    expect(document.querySelector('.story-text')?.textContent).toBe('Un triomphe legendaire.')
    expect(ok.disabled).toBe(false)
    ref.componentInstance.generate()
    expect(generateMatchStory).toHaveBeenCalledTimes(1)
    ref.close()
    await stabilize()
  })

  it('renders the story as plain text and closes the popup with OK', async () => {
    const { response, dialog, ref } = setup()
    await stabilize()
    response.next('<b>Une victoire</b>\nUn final epique.')
    response.complete()
    await stabilize()
    expect(document.querySelector('.story-text')?.textContent).toContain('<b>Une victoire</b>')
    expect(document.querySelector('.story-text b')).toBeNull()
    expect(document.querySelector('mat-dialog-content')?.textContent).toContain("conservé dans l'historique")
    expect(document.querySelector('mat-dialog-container')?.textContent).not.toMatch(/\bIA\b|intelligence artificielle|Gemini/)
    const closed = firstValueFrom(ref.afterClosed())
    document.querySelector<HTMLButtonElement>('mat-dialog-actions button')!.click()
    await closed
    await stabilize()
    expect(dialog.openDialogs).toHaveLength(0)
    expect(document.querySelector('mat-dialog-container')).toBeNull()
  })

  it('allows retry after a generation failure without losing the saved match identifier', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { response, generateMatchStory, ref } = setup()
    await stabilize()
    response.error(new HttpErrorResponse({
      status: 503, error: { message: 'Récit indisponible. Les scores restent enregistrés.' }
    }))
    await stabilize()
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Les scores restent enregistrés')
    expect(document.querySelector<HTMLButtonElement>('mat-dialog-actions button')!.disabled).toBe(false)
    generateMatchStory.mockReturnValueOnce(of('Le retour du barde.'))
    document.querySelector<HTMLButtonElement>('mat-dialog-content button')!.click()
    await stabilize()
    expect(generateMatchStory.mock.calls).toEqual([[42], [42]])
    expect(document.querySelector('.story-text')?.textContent).toBe('Le retour du barde.')
    expect(document.querySelector('[role=alert]')).toBeNull()
    ref.close()
    await stabilize()
    consoleError.mockRestore()
  })

  it('can close with OK after an error and leaves generation available in history', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { response, dialog, ref } = setup()
    await stabilize()
    response.error(new Error('Unavailable'))
    await stabilize()
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Les scores sont enregistrés')
    expect(document.querySelector('mat-dialog-content')?.textContent).toContain("depuis l'historique")
    const closed = firstValueFrom(ref.afterClosed())
    document.querySelector<HTMLButtonElement>('mat-dialog-actions button')!.click()
    await closed
    await stabilize()
    expect(dialog.openDialogs).toHaveLength(0)
    consoleError.mockRestore()
  })
})
