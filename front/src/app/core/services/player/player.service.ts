/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 03/07/2024 - 14:35:00
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 03/07/2024
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from "@angular/core";
import { PlayerCrudService } from "../crud/player-crud.service";

@Injectable({ providedIn: 'root' })
export class PlayerService {
    
    constructor(private playerCrudService: PlayerCrudService) {
    }

}