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
import { Action, Selector, State, StateContext } from "@ngxs/store";
import { tap } from 'rxjs/operators';
import { AuthStateModel } from "./auth.model";
import { AuthService } from "../../services/auth/auth.service";
import { Injectable } from '@angular/core';
import { DoLogin, DoLogout } from "./auth.actions";

@State<AuthStateModel>({
    name: 'auth',
    defaults: {
        id: 0,
        name: "",
        email: ""
    }
})
@Injectable()
export class AuthState {

    @Selector() static isAuthenticated(state: AuthStateModel): boolean {
        return state.id > 0 && state.id != undefined
    }

    @Selector() static userName(state: AuthStateModel): string {
        return (state.name == undefined || state.name === "")  ? state.email : state.name
    }

    constructor(private authService: AuthService) { }

    @Action(DoLogin)
    login({ patchState }: StateContext<AuthStateModel>, { email, password }: DoLogin) {
        return this.authService.login(email, password).pipe(
            tap(returnData => {
                patchState({
                    id: returnData.id,
                    name: returnData.name,
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
                    name: "",
                    email: ""
                })
            })
        )
    }
}
