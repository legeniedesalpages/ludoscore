/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 13/12/2022 - 11:10:47
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router'
import { Store } from '@ngxs/store'
import { AuthState } from '../../state/auth/auth.state'
import { Navigate } from '@ngxs/router-plugin'

@Injectable({ providedIn: 'root' })
export class AuthGuardService {

  constructor(private store: Store, private router: Router) {
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {

    const isAuthenticated = this.store.selectSnapshot<boolean>(AuthState.isAuthenticated)

    if (isAuthenticated) {
      console.debug(`Authenticated, can show this page: ${state.url}`)
    } else {
      console.warn(`Not authenticated for page /${next.url}, redirect to login page`)
      this.store.dispatch(new Navigate(['/login']))
    }

    return isAuthenticated
  }
}