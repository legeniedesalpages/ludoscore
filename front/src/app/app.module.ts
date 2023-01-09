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
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule, HttpClientXsrfModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { ServiceWorkerModule } from '@angular/service-worker';
import { HttpXSRFInterceptor } from './core/interceptors/xsrf.interceptor';
import { HeaderModule } from './components/layout/header.module';
import { FindGameModule } from './components/find-game/find-game.module';

@NgModule({
  declarations: [
    AppComponent
  ],

  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    AppRoutingModule,

    HeaderModule,
    FindGameModule,
    
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
    { provide: HTTP_INTERCEPTORS, useClass: HttpXSRFInterceptor, multi: true },
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' }
  ],

  bootstrap: [AppComponent]
})
export class AppModule {
}