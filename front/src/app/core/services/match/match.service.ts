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
import { Observable, first, forkJoin, map, mergeMap, of, tap } from 'rxjs';
import { MatchCrudService } from '../crud/match-crud.service';
import { MatchEntity, MatchPlayerEntity } from '../../entity/match-entity.model';
import { Player } from '../../model/player.model';
import { PlayerCrudService } from '../crud/player-crud.service';
import { PlayerEntity } from '../../entity/player-entity.model';
import { ChoosenTag } from '../../model/choosen-tag.model';

@Injectable({ providedIn: 'root' })
export class MatchService {

    constructor(private matchCrudService: MatchCrudService, private playerCrudService: PlayerCrudService) {
    }

    public createMatch(gameId: number, players: Player[], choosenMatchTags: ChoosenTag[]): Observable<MatchEntity> {
        const matchEntity: MatchEntity = {
            gameId: gameId,
            startedAt: undefined,
            finishedAt: undefined,
            players: players.map(p => {return {id: p.id, tags: JSON.stringify(p.choosenTags)}}),
            canceled: false,
            running: true,
            tags: JSON.stringify(choosenMatchTags)
        }
        return this.matchCrudService.save(matchEntity).pipe(tap(console.log))
    }

    public cancelMatch(matchId: number, endedAt: Date): Observable<MatchEntity> {
        return this.matchCrudService.findOne(matchId).pipe(
            mergeMap((match) => {
                match.canceled = true;
                match.running = false;
                match.finishedAt = endedAt;
                return this.matchCrudService.update(matchId, match)
            }))
    }

    public saveMatchResult(matchId: number, players: Player[], endedAt: Date): Observable<MatchEntity> {
        return this.matchCrudService.findOne(matchId).pipe(
            map((match) => {
                console.info('match', match)
                forkJoin(players.map(player => this.savePlayerScore(player, matchId)))
                return match
            }),
            mergeMap((match) => {
                match.canceled = false;
                match.running = false;
                match.finishedAt = endedAt;
                return this.matchCrudService.update(matchId, match)
            })
        )
    }

    public savePlayerScore(player: Player, matchId: number): Observable<PlayerEntity> {
        console.info('player, match', player, matchId)
        let ret = this.playerCrudService.findOne(player.id).pipe(
            mergeMap((playerEntity) => {
                console.info('playerEntity, match', playerEntity, matchId)
                playerEntity.score = player.score;
                playerEntity.matchId = matchId;
                return this.playerCrudService.update(player.id, playerEntity)
            }))
        ret.subscribe((error) => console.error(error))
        return ret
    }
}