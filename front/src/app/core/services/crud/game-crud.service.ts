/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 22/01/2023 - 17:41:39
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CrudService } from './abstract-crud.service'
import { GameEntity } from '../../entity/game-entity.model'

@Injectable({ providedIn: 'root' })
export class GameCrudService extends CrudService<GameEntity, number> {

    constructor(protected override http: HttpClient) {
        super(http, '/game')
    }

}