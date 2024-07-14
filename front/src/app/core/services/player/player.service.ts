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
import { Injectable } from "@angular/core"
import { PlayerCrudService } from "../crud/player-crud.service"
import { Player } from "../../model/player.model"
import { map, Observable } from "rxjs"
import { PlayerEntity } from "../../entity/player-entity.model"
import { COLORS, NO_COLOR } from "../../model/tag.model"

@Injectable({ providedIn: 'root' })
export class PlayerService {

    private cachePlayers?: Player[]

    constructor(private playerCrudService: PlayerCrudService) { }

    public listAllPlayers(): Observable<Player[]> {
        if (this.cachePlayers != undefined) {
            return new Observable(subscriber => {
                subscriber.next(this.cachePlayers)
                subscriber.complete()
            })
        }
        
        return this.playerCrudService.findAll().pipe(map((playerEntities: PlayerEntity[]) =>
            this.cachePlayers = playerEntities.map(playerEntity =>
                this.playerEntityToPlayer(playerEntity)
            )
        ))
    }

    private playerEntityToPlayer(playerEntity: PlayerEntity): Player {
        const preferedColor = COLORS.find(color => color.name == playerEntity.preferedColor)
        return {
            id: playerEntity.id,
            pseudo: playerEntity.pseudo,
            lastName: playerEntity.lastName,
            firstName: playerEntity.firstName,
            preferedColor: preferedColor ? preferedColor : NO_COLOR,
            gravatarUrl: "https://www.gravatar.com/avatar/" + playerEntity.gravatar + "?d=identicon&r=pg"
        }
    }

}