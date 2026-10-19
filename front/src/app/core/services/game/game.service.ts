/**
    * @description      :
    * @author           : renau
    * @group            :
    * @created          : 09/01/2023 - 00:34:56
    *
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 09/01/2023
    * - Author          : renau
    * - Modification    :
**/
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, map, switchMap } from 'rxjs'
import { environment } from 'src/environments/environment'
import moment from 'moment'
import { DrawBreaker, Game, GameToSave, SelectingGame } from '../../model/game.model'
import { ColorTag, Tag } from '../../model/tag.model'
import { GameCrudService } from '../crud/game-crud.service'
import { GameEntity } from '../../entity/game-entity.model'
import { ScoreTag } from '../../model/score.model'

@Injectable({ providedIn: 'root' })
export class GameService {

    public searchedGames: Game[]

    private readonly gameUrl = environment.apiURL + '/api/game'

    constructor(private http: HttpClient, private gameCrudService: GameCrudService) {
        this.searchedGames = []
    }

    public save(gameToSave: GameToSave): Observable<Game> {

        return this.http.post<{ id: number }>(this.gameUrl, {
            id: gameToSave.id,
            name: gameToSave.title,
            isExpansion: gameToSave.isExpansion ?? false,
            ...(gameToSave.isExpansion ? {
                additionalPlayers: gameToSave.additionalPlayers ?? 0,
                expansionTagChanges: gameToSave.expansionTagChanges ?? [],
                expansionScoreChanges: gameToSave.expansionScoreChanges ?? [],
            } : {
                isOnlyCooperative: gameToSave.isOnlyCooperative,
                minPlayers: gameToSave.minPlayers,
                maxPlayers: gameToSave.maxPlayers,
                quantifiableScore: gameToSave.quantifiableScore,
                highestScoreWin: gameToSave.highestScoreWin,
                estimatedDurationInMinutes: gameToSave.estimatedDurationInMinutes,
            }),
            inLibrary: gameToSave.inLibrary,
            ownershipDate: gameToSave.inLibrary && gameToSave.ownershipDate ? moment(gameToSave.ownershipDate).format('YYYY-MM-DD') : null,
            matchTags: JSON.stringify(gameToSave.matchTags),
            playerTags: JSON.stringify(gameToSave.playerTags),
            playerColors: JSON.stringify(gameToSave.playerColors),
            scoreTemplate: JSON.stringify(gameToSave.scoreTags),
            bggId: gameToSave.bggId,
            drawAllowed: gameToSave.drawAllowed,
            drawBreaker: JSON.stringify(gameToSave.drawBreaker),
            imageUrlFromBgg: gameToSave.imageUrlFromBgg,
            thumbnailUrlFromBgg: gameToSave.thumbnailUrlFromBgg
        }).pipe(switchMap(() => this.getFromBgg(gameToSave.bggId)))
    }

    public listAllGames(): Observable<SelectingGame[]> {
        return this.gameCrudService.findAll().pipe(map(gameEntities =>
            gameEntities.map((gameEntity: any) => {
                const game: SelectingGame = {
                    ...this.gameEntityToGame(gameEntity),
                    baseGameBggIds: gameEntity.baseGameBggIds ?? [],
                    lastPlayed: gameEntity.lastPlayed,
                    lastWinner: gameEntity.lastWinner,
                    createdAt: gameEntity.createdAt,
                    playedMatchCount: gameEntity.playedMatchCount,
                    personalPlayedMatchCount: gameEntity.personalPlayedMatchCount,
                    libraryUserCount: gameEntity.libraryUserCount
                }
                return game
            })
        ))
    }

    public get(gameId: number): Observable<Game> {
        return this.gameCrudService.findOne(gameId).pipe(map(gameEntity =>
            this.gameEntityToGame(gameEntity)
        ))
    }

    public getFromBgg(bggId: number): Observable<Game> {
        return this.http.get<GameEntity>(this.gameUrl + "/bgg/" + bggId).pipe(map(gameEntity =>
            this.gameEntityToGame(gameEntity)
        ))
    }

    private gameEntityToGame(gameEntity: GameEntity): Game {
        return {
            id: gameEntity.id,
            title: gameEntity.title,
            isExpansion: !!Number(gameEntity.isExpansion),
            additionalPlayers: gameEntity.additionalPlayers ?? 0,
            baseGameColors: gameEntity.baseGameColors ?? [],
            baseGameTags: gameEntity.baseGameTags ?? [],
            expansionTagChanges: typeof gameEntity.expansionTagChanges === 'string'
                ? JSON.parse(gameEntity.expansionTagChanges) : gameEntity.expansionTagChanges ?? [],
            expansionScoreChanges: typeof gameEntity.expansionScoreChanges === 'string'
                ? JSON.parse(gameEntity.expansionScoreChanges) : gameEntity.expansionScoreChanges ?? [],
            imageUrl: environment.imagesURL + '/' + gameEntity.imageId,
            thumbnailUrl: environment.imagesURL + '/' + gameEntity.thumbnailId,
            isOnlyCooperative: gameEntity.isOnlyCooperative,
            minPlayers: gameEntity.minPlayers,
            maxPlayers: gameEntity.maxPlayers,
            ownershipDate: gameEntity.ownershipDate,
            inLibrary: !!Number(gameEntity.inLibrary),
            matchTags: gameEntity.matchTags ? JSON.parse(gameEntity.matchTags) : [] as Tag[],
            playerTags: gameEntity.playerTags ? JSON.parse(gameEntity.playerTags) : [] as Tag[],
            playerColors: gameEntity.playerColors ? JSON.parse(gameEntity.playerColors) : [] as ColorTag[],
            scoreTags: gameEntity.scoreTemplate ? JSON.parse(gameEntity.scoreTemplate) : [] as ScoreTag[],
            bggId: gameEntity.bggId,
            drawAllowed: gameEntity.drawAllowed,
            drawBreaker: gameEntity.drawBreaker ? JSON.parse(gameEntity.drawBreaker) : [] as DrawBreaker[],
            quantifiableScore: gameEntity.quantifiableScore,
            highestScoreWin: gameEntity.highestScoreWin,
            estimatedDurationInMinutes: gameEntity.estimatedDurationInMinutes
        }
    }
}