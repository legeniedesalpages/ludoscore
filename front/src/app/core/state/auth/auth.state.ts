/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 23/01/2023 - 12:53:22
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 23/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Action, Selector, State, StateContext } from "@ngxs/store"
import { tap } from 'rxjs/operators'
import { AuthStateModel } from "./auth.model"
import { AuthService } from "../../services/auth/auth.service"
import { Injectable } from '@angular/core'
import { DoLogin, DoLogout } from "./auth.actions"

@State<AuthStateModel>({
    name: 'auth',
    defaults: {
        id: 0,
        email: ""
    }
})
@Injectable()
export class AuthState {

    @Selector() static isAuthenticated(state: AuthStateModel): boolean {
        return state.id > 0 && state.id != undefined
    }

    @Selector() static userName(state: AuthStateModel): string {
        return state.email
    }

    @Selector() static userId(state: AuthStateModel): number {
        return state.id
    }

    constructor(private authService: AuthService) { }

    @Action(DoLogin)
    login({ patchState }: StateContext<AuthStateModel>, { email, password }: DoLogin) {
        return this.authService.login(email, password).pipe(
            tap(returnData => {
                console.log("returnData", returnData)
                patchState({
                    id: returnData.id,
                    email: returnData.email,
                })
            })
        )
    }

    @Action(DoLogout)
    logout({ patchState }: StateContext<AuthStateModel>) {
        return this.authService.logout().pipe(
            tap(() => {
                patchState({
                    id: 0,
                    email: ""
                })
            })
        )
    }
}
