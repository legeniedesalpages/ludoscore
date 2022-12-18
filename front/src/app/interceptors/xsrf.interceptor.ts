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
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpXsrfTokenExtractor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class HttpXSRFInterceptor implements HttpInterceptor {

    constructor(private tokenExtractor: HttpXsrfTokenExtractor) {

    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const headerName = 'X-CSRFTOKEN';
        const respHeaderName = 'X-XSRF-TOKEN';
        let token = this.tokenExtractor.getToken() as string;
        if (token !== null && !req.headers.has(headerName)) {
            req = req.clone({ headers: req.headers.set(respHeaderName, token) });

        }
        return next.handle(req);

    }

}