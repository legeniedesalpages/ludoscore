/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 22/01/2023 - 17:27:07
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Observable, tap } from 'rxjs'
import { HttpClient } from '@angular/common/http'
import { CrudOperations } from './crud-operations.interface'
import { environment } from 'src/environments/environment'

export abstract class CrudService<T, ID> implements CrudOperations<T, ID> {

    protected readonly apiUrl = `${environment.apiURL}/api`

    constructor(protected http: HttpClient, protected base: string) { 
        console.debug("Init crud: " + base)
    }

    save(t: T): Observable<T> {
        return this.http.post<T>(`${this.apiUrl}${this.base}`, t).pipe(tap(res => console.debug("save " + this.base + " => ", res)))
    }

    update(id: ID, t: T): Observable<T> {
        return this.http.put<T>(`${this.apiUrl}${this.base}/${id}`, t).pipe(tap(res => console.debug("update " + this.base + " => ", res)))
    }

    findOne(id: ID): Observable<T> {
        return this.http.get<T>(`${this.apiUrl}${this.base}/${id}`).pipe(tap(res => console.debug("find one " + this.base + " => ", res)))
    }

    findAll(): Observable<T[]> {
        return this.http.get<T[]>(`${this.apiUrl}${this.base}`).pipe(tap(res => console.debug("find all " + this.base + " => ", res)))
    }

    findAllPaginated(page: number, size: number): Observable<T[]> {
        return this.http.get<T[]>(`${this.apiUrl}${this.base}?page=${page}&size=${size}`).pipe(tap(res => console.debug("find all " + this.base + " => ", res)))
    }

    delete(id: ID): Observable<T> {
        return this.http.delete<T>(`${this.apiUrl}${this.base}/${id}`).pipe(tap(res => console.debug("delete " + this.base + " => ", res)))
    }

}