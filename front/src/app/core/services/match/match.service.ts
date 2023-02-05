/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 05/02/2023 - 01:10:54
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 05/02/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MatchCrudService } from '../crud/match-crud.service';
import { MatchEntity } from '../../entity/match-entity.model';

@Injectable({ providedIn: 'root' })
export class MatchService {

    constructor(private matchCrudService: MatchCrudService) {
    }

    public createMatch(gameId: number): Observable<MatchEntity> {
        const matchEntity: MatchEntity = {
            gameId: gameId,
            players: []
        }
        return this.matchCrudService.save(matchEntity)
    }
}