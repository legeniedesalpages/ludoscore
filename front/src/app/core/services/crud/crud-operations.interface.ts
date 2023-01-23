/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 22/01/2023 - 17:24:27
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Observable } from 'rxjs';

export interface CrudOperations<T, ID> {
    save(t: T): Observable<T>;
    update(id: ID, t: T): Observable<T>;
    findOne(id: ID): Observable<T>;
    findAll(): Observable<T[]>;
    delete(id: ID): Observable<any>;
}