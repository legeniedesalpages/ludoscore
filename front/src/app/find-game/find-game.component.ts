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
import { HttpClient } from '@angular/common/http';
import { Component, ViewChildren } from '@angular/core';

@Component({
  selector: 'find-game',
  templateUrl: './find-game.component.html',
  styleUrls: ['./find-game.component.css'],
})
export class FindGameComponent {

  constructor(private http: HttpClient) {
  }

  @ViewChildren('input') 
  vc: any;

  ngAfterViewInit() {
    console.log("pppppppppppppppppp")
    this.vc.first.nativeElement.focus();
  }

  onSubmit() {
  }
}
