/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 13/12/2022 - 10:58:08
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';@Injectable({
  providedIn: 'root'
})
export class AuthService {  // Variables
  authUrl = 'http://localhost:8000/api/auth/login';
  apiUrl = 'http://localhost:8000/api';
  options: any;  /**
   * Constructor
   * @param http The http client object
   */
  constructor(
    private http: HttpClient
  ) {
    this.options = {
      headers: new HttpHeaders({
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data'
      })
    };
  }  /**
   * Get an access token
   * @param e The email address
   * @param p The password string
   */
  login(email: string, password: string) {
    return this.http.post(this.authUrl, {
      username: email,
      password: password
    }, this.options);
  }
}