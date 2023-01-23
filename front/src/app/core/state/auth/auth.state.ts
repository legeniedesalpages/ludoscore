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
import { tap, mergeMap } from 'rxjs/operators';
import { AuthStateModel } from "./auth.model";
import { AuthService } from "../../services/auth/auth.service";
import { Injectable } from '@angular/core';
import { DoLogin, DoLogout, LoggedIn, LoggedOut } from "./auth.actions";
import { User } from "../../model/user.model";

@State<AuthStateModel>({
    name: 'auth'
})
@Injectable()
export class AuthState {

    @Selector() static authenticatedUser(state: AuthStateModel) {
        return state
    }

    @Selector() static isAuthenticated(state: AuthStateModel) {
        console.debug("Loggin state:" + state.id)
        return state.id > 0 && state.id != undefined
    }

    constructor(private authService: AuthService) { }

    @Action(DoLogin)
    login({ setState, getState, dispatch }: StateContext<AuthStateModel>, { email, password }: DoLogin) {
        return this.authService.login(email, password).pipe(
            tap(returnData => {
                setState({
                    ...getState(),
                    id: returnData.id,
                    name: returnData.name
                })
            }),
            mergeMap((returnData: User) => {
                return dispatch(new LoggedIn(returnData.name))
            })
        )
    }

    @Action(DoLogout)
    logout({ setState, getState, dispatch }: StateContext<AuthStateModel>) {
        return this.authService.logout().pipe(
            tap(_ => {
                setState({
                    ...getState(),
                    id: 0,
                    name: ""
                })
            }),
            mergeMap(() => {
                return dispatch(new LoggedOut())
            })
        )
    }

}
