import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { describe, expect, it, vi } from 'vitest'
import { StatsQuestionComponent } from './stats-question.component'

describe('StatsQuestionComponent', () => {
  it('validates questions and opens a modal scoped to the current game', async () => {
    const open = vi.fn()
    TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: { open } }] })
    const fixture = TestBed.createComponent(StatsQuestionComponent)
    fixture.componentRef.setInput('gameId', 7)
    await fixture.whenStable()
    const component = fixture.componentInstance
    component.model.set({ question: '   ' })
    component.ask(new Event('submit'))
    expect(open).not.toHaveBeenCalled()
    component.model.set({ question: 'a'.repeat(501) })
    component.ask(new Event('submit'))
    expect(open).not.toHaveBeenCalled()
    component.model.set({ question: ' Qui gagne le plus ? ' })
    component.ask(new Event('submit'))
    expect(open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: { question: 'Qui gagne le plus ?', scope: 'game', id: 7 },
    }))
  })
})
