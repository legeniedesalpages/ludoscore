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
import { Component, OnInit } from '@angular/core';
import { Select } from '@ngxs/store';
import { DoLogout } from 'src/app/core/state/auth/auth.actions';
import { AuthState } from 'src/app/core/state/auth/auth.state';
import { Observable } from 'rxjs';
import { Dispatch } from '@ngxs-labs/dispatch-decorator';
import { MatchState, MatchStateEnum } from 'src/app/core/state/match/match.state';
import { MatchService } from 'src/app/core/services/match/match.service';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {

  @Select(AuthState.userName) loggedUser!: Observable<any>;

  @Select(MatchState.state) matchState!: Observable<MatchStateEnum>;

  public matchStateEnum: typeof MatchStateEnum = MatchStateEnum;
  public loggingOut: boolean = false
  public loading: boolean

  constructor(private matchService: MatchService) {
    this.loading = true
  }

  @Dispatch()
  public logout = () => {
    this.loggingOut = true
    return new DoLogout()
  }

  ngOnInit(): void {
    this.matchService.findRunningMatch().subscribe(res => {
      console.log('running match', res)
      this.loading = false
    })
  }
}
