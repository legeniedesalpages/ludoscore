/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 19/12/2022 - 11:27:36
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 19/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Component } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { DoLogout } from 'src/app/core/state/auth/auth.actions';
import { AuthState } from 'src/app/core/state/auth/auth.state';
import { Observable } from 'rxjs';
import { User } from 'src/app/core/model/user.model';
import { PusherService } from 'src/app/core/services/pusher/pusher.service';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {

  @Select(AuthState) loggedUser!: Observable<User>;

  public loggingOut: boolean = false

  constructor(private store: Store, private pusherService: PusherService) {
    pusherService.init()
  }

  public logout() {
    this.loggingOut = true
    this.store.dispatch(new DoLogout())
  }
}
