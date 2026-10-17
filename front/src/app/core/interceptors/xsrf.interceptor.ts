/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 18/12/2022 - 03:23:31
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 18/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core'
import { HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest, HttpXsrfTokenExtractor } from '@angular/common/http'
import { catchError, Observable, switchMap, throwError } from 'rxjs'
import { AuthService } from '../services/auth/auth.service'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Router } from '@angular/router'

@Injectable()
export class HttpXSRFInterceptor implements HttpInterceptor {

    constructor(private tokenExtractor: HttpXsrfTokenExtractor, private router: Router, private authService: AuthService, private snackBar: MatSnackBar) {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return this.send(req, next).pipe(catchError(err => {
            // 419 = CSRF token mismatch (ex: session expirée pendant une longue partie) : on renouvelle le cookie et on rejoue une fois
            if (err?.status === 419 && !req.url.includes('sanctum/csrf-cookie')) {
                console.warn("CSRF token mismatch, refreshing the CSRF cookie and retrying", req.method, req.url)
                return this.authService.refreshCsrfCookie().pipe(
                    switchMap(() => this.send(req, next)),
                    catchError(retryErr => this.handleError(retryErr, req))
                )
            }
            return this.handleError(err, req)
        }))
    }

    private send(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        let token = this.tokenExtractor.getToken() as string
        if (token !== null && !req.headers.has('X-CSRFTOKEN')) {
            req = req.clone({
                withCredentials: true,
                headers: new HttpHeaders({
                    Accept: 'application/json'
                }).append('X-XSRF-TOKEN', token)
            })
        } else {
            req = req.clone({
                withCredentials: true,
                headers: new HttpHeaders({
                    Accept: 'application/json'
                })
            })
        }

        return next.handle(req)
    }

    private handleError(err: any, req: HttpRequest<any>): Observable<never> {

        // redirect to login page if not authenticated (401) and if is not a authentication page
        if (err.status == 401 && !req.url.includes('api/auth')) {
            console.warn("No more authenticated, redirect to login page")
            this.authService.logout().subscribe(() => {
                this.router.navigate(['/login'])
            })
        }

        // show error if internal server error
        if (err.status == 500) {
            this.snackBar.open("Erreur: " + err.error.message, 'Fermer', {
                duration: 5000
            })
        }

        return throwError(() => err)
    }

}