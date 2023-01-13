/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 13/12/2022 - 00:10:54
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    : 
**/

import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule, HttpClientXsrfModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { ServiceWorkerModule } from '@angular/service-worker';
import { HttpXSRFInterceptor } from './core/interceptors/xsrf.interceptor';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AppComponent } from './components/layout/app/app.component';
import { FooterModule } from './components/layout/footer/footer.module';
import { HeaderModule } from './components/layout/header/header.module';

@NgModule({
  declarations: [
    AppComponent
  ],

  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    AppRoutingModule,

    MatSnackBarModule,

    HeaderModule,
    FooterModule,
    
    HttpClientModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'XSRF-TOKEN',
      headerName: 'X-CSRF-TOKEN'
    }),

    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],

  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpXSRFInterceptor, multi: true }
  ],

  bootstrap: [AppComponent]
})
export class AppModule {
}