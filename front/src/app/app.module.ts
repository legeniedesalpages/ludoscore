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

import { NgModule, isDevMode, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi, withXsrfConfiguration } from "@angular/common/http";
import { ServiceWorkerModule } from '@angular/service-worker';
import { HttpXSRFInterceptor } from './core/interceptors/xsrf.interceptor';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AppComponent } from './app.component';
import { environment } from 'src/environments/environment';
import { AuthState } from './core/state/auth/auth.state';
import { PusherService } from './core/services/pusher/pusher.service';
import { MatchState } from './core/state/match/match.state';
import { NgxsModule } from '@ngxs/store';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import { NgxsRouterPluginModule } from '@ngxs/router-plugin';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';


@NgModule({
  declarations: [
    AppComponent
  ],

  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    AppRoutingModule,

    // PWA
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' }),

    // NgXs    
    NgxsModule.forRoot([AuthState, MatchState], { developmentMode: !environment.production }),
    NgxsStoragePluginModule.forRoot({ keys: [AuthState, MatchState] }),
    NgxsReduxDevtoolsPluginModule.forRoot({ disabled: environment.production }),
    NgxsRouterPluginModule.forRoot(),
  ],

  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpXSRFInterceptor, multi: true },
    PusherService,
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-CSRF-TOKEN' }),
      withInterceptorsFromDi()
    ),
    { provide: LOCALE_ID, useValue: 'fr' }
  ],

  bootstrap: [AppComponent]
})
export class AppModule {
}