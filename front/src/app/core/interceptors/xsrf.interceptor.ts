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
import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest, HttpXsrfTokenExtractor } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class HttpXSRFInterceptor implements HttpInterceptor {

    constructor(private tokenExtractor: HttpXsrfTokenExtractor, private router: Router, private authService: AuthService, private snackBar: MatSnackBar) {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        const headerName = 'X-CSRFTOKEN';
        const respHeaderName = 'X-XSRF-TOKEN';

        let token = this.tokenExtractor.getToken() as string;
        if (token !== null && !req.headers.has(headerName)) {
            req = req.clone({
                withCredentials: true,
                headers: new HttpHeaders({
                    Accept: 'application/json'
                }).append(respHeaderName, token)
            });
        } else {
            req = req.clone({
                withCredentials: true,
                headers: new HttpHeaders({
                    Accept: 'application/json'
                })
            });
        }

        return next.handle(req).pipe(catchError(err => {

            // redirect to login page if not authenticated (401) and if is not a authentication page
            if (err.status == 401 && !req.url.includes('api/auth')) {
                console.warn("No more authenticated, redirect to login page")
                this.authService.logout().finally(() => {
                    this.router.navigate(['/login']);
                })
            }

            this.snackBar.open("Erreur: " + err.error.message, 'Fermer', {
                duration: 5000
            })

            return throwError(() => new Error(err.error.message));
        }));

    }

}