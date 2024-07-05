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
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  templateUrl: './user-confirmation.component.html',
  styleUrls: ['./user-confirmation.component.css'],
})
export class UserConfirmationComponent implements OnInit {

  public loading: boolean = true
  public confirmed: boolean | undefined = undefined

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) {    
  }

  ngOnInit(): void {
    console.debug('Show registration confirmation page')

    this.route.queryParamMap.subscribe((params) => {  
      let confirmationKey = params.get('key');
      console.info('Confirmation key: ', confirmationKey)

      if (confirmationKey) {
        this.authService.confirmUser(confirmationKey).subscribe({
          next: (result) => {
            console.info('User confirmed: ', result)
            this.loading = false
            this.confirmed = true
          },
          error: (error) => {
            console.error('Error confirming user: ', error)
            this.loading = false
            this.confirmed = false
          }
        });
      } else {
        console.error('Pas de clef de confirmation')
        this.loading = false
        this.confirmed = false
      }
    });
  }
}
