import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { describe, expect, it, vi } from 'vitest'
import { StatsQuestionComponent } from './stats-question.component'

describe('StatsQuestionComponent', () => {
  it.each([
    { input: 'gameId', scope: 'game' },
    { input: 'playerId', scope: 'player' },
  ])('validates questions and opens a modal scoped to $scope', async ({ input, scope }) => {
    const open = vi.fn()
    TestBed.configureTestingModule({ providers: [{ provide: MatDialog, useValue: { open } }] })
    const fixture = TestBed.createComponent(StatsQuestionComponent)
    fixture.componentRef.setInput(input, 7)
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
      data: { question: 'Qui gagne le plus ?', scope, id: 7 },
    }))
  })
})
