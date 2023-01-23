/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 23/01/2023 - 11:16:18
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 23/01/2023
    * - Author          : renau
    * - Modification    : 
**/
export class DoLogin {
  static readonly type = '[Auth] DoLogin';
  constructor(public email: string, public password: string) { }
}

export class LoggedIn {
  static readonly type = '[Auth] LoggedIn';
  constructor(public username: string) { }
}

export class DoLogout {
  static readonly type = '[Auth] DoLogout';
}

export class LoggedOut {
  static readonly type = '[Auth] LoggedOut';
}