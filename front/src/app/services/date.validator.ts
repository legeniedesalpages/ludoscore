/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 29/12/2022 - 01:10:12
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 29/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { AbstractControl } from '@angular/forms';
import moment from 'moment';

export class DateValidator {
  static dateValidator(AC: AbstractControl) {
    if (AC && AC.value && !moment(AC.value, 'YYYY-MM-DD', true).isValid()) {
      return { 'dateVaidator': true };
    }
    return null;
  }
}
