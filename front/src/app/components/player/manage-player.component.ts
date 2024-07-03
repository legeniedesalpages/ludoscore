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
import { Navigate } from '@ngxs/router-plugin';
import { Store } from '@ngxs/store';

@Component({
  selector: 'manage-player',
  templateUrl: './manage-player.component.html',
  styleUrls: ['./manage-player.component.css', '../../core/css/list.css']
})
export class ManagePlayerComponent implements OnInit {
  

  constructor(private store: Store) {
  }
  ngOnInit(): void {
  }


  public returnToHome() { 
    this.store.dispatch(new Navigate(['/']))
  }
}
