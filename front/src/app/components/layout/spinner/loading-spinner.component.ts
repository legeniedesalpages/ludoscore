/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 12/12/2022 - 23:45:39
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 12/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Component, Input } from '@angular/core'

@Component({
  selector: 'loading-spinner',
  template: `
    <div class="spinner" *ngIf="loading">
      <mat-spinner [diameter]=36 [strokeWidth]="7"></mat-spinner>
      <div class="caption">{{ caption }}...</div>
    </div>
  `,
  styles: [`
   .spinner {
      padding-top: 15px;
      padding-bottom: 15px;
      display: flex;
      justify-content: center;
    }

    .caption {
      align-self: center;
      opacity: 0.6;
      margin-left: 10px;
    }
  `]
})
export class LoadingSpinnerComponent {

  @Input() loading: boolean = false
  @Input() caption: string = ""

}
