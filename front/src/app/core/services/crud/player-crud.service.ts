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
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CrudService } from './abstract-crud.service';
import { PlayerEntity } from '../../entity/player-entity.model';

@Injectable({ providedIn: 'root' })
export class PlayerCrudService extends CrudService<PlayerEntity, number> {

    constructor(protected override http: HttpClient) {
        super(http, '/player');
    }

}