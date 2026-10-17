import { HttpErrorResponse, HttpRequest, HttpXsrfTokenExtractor } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { MatSnackBar } from '@angular/material/snack-bar'
import { throwError } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { AuthService } from '../services/auth/auth.service'
import { HttpXSRFInterceptor } from './xsrf.interceptor'

describe('HttpXSRFInterceptor', () => {
  it.each([404, 429, 503])('preserves HTTP status %i for statistics error messages', status => {
    TestBed.configureTestingModule({ providers: [
      HttpXSRFInterceptor,
      { provide: Router, useValue: {} },
      { provide: AuthService, useValue: {} },
      { provide: MatSnackBar, useValue: {} },
      { provide: HttpXsrfTokenExtractor, useValue: { getToken: () => null } },
    ] })
    const error = new HttpErrorResponse({ status, error: { message: 'Erreur de statistiques' } })
    let received: unknown
    TestBed.inject(HttpXSRFInterceptor).intercept(
      new HttpRequest('GET', '/api/statistics/games/1'),
      { handle: () => throwError(() => error) },
    ).subscribe({ error: result => { received = result } })
    expect(received).toBe(error)
  })
})
