import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { describe, expect, it, vi } from 'vitest'
import { StatsAnswerComponent } from './stats-answer.component'

describe('StatsAnswerComponent', () => {
  it('posts the question, reports failures and allows retrying', async () => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: MAT_DIALOG_DATA, useValue: { question: 'Quels jeux sont les plus joués ?' } },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
    ] })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fixture = TestBed.createComponent(StatsAnswerComponent)
    const http = TestBed.inject(HttpTestingController)
    const request = http.expectOne(req => req.url.endsWith('/statistics/ask'))
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ question: 'Quels jeux sont les plus joués ?' })
    request.flush({}, { status: 503, statusText: 'Unavailable' })
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('indisponible')
    fixture.componentInstance.load()
    http.expectOne(req => req.url.endsWith('/statistics/ask')).flush({
      title: 'Jeux favoris', type: 'bar', columns: ['Jeu', 'Parties'], rows: [['Test', 5]], comment: 'Une tendance.',
    })
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('Une tendance.')
    expect(fixture.nativeElement.textContent).toContain('Jeux favoris')
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull()
    http.verify()
    consoleError.mockRestore()
  })
})
