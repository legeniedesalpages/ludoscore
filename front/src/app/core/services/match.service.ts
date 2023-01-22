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
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Match } from '../model/match.model';
import { Game } from '../model/game.model';
import { MatchPlayer } from '../model/matchPlayer.model';
import { Player } from '../model/player.model';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface MatchForApi {
    id_game: number,
    teams: MatchPlayer[]
}

@Injectable()
export class MatchService {

    private readonly matchUrl = environment.apiURL + '/api/match';

    private currentMatch!: Match;

    constructor(private http: HttpClient) {
        this.init()
    }

    public hasGameSelected(): boolean {
        if (!this.currentMatch || !this.currentMatch.game) {
            return false;
        }
        return true;
    }

    public isGameStarted(): boolean {
        if (!this.currentMatch || !this.currentMatch.matchStarted) {
            return false;
        }
        return true;
    }

    public getGame(): Game | null {
        return this.currentMatch?.game
    }

    public setGame(game: Game) {
        if (this.currentMatch.matchStarted) {
            throw Error("Match already started, can't assign new game")
        }
        this.currentMatch.game = game;
        for (let i = 0; i < game.min_players; i++) {
            console.debug("Add minimum players: " + game.min_players)
            this.addPlayer()
        }
    }

    public setPlayer(matchPlayer: MatchPlayer, player: Player) {
        const matchPlayerFound = this.currentMatch.matchPlayers.find(element => element.uuid == matchPlayer.uuid);
        if (matchPlayerFound) {
            matchPlayerFound.players = [player]
        }
    }

    public canLaunchGame() {
        console.log("houla", this.currentMatch.matchPlayers)
        return this.currentMatch.matchPlayers.every(matchPlayer => matchPlayer.players.length > 0)
    }

    public minPlayer(): number {
        return this.currentMatch.game!.min_players
    }

    public maxPlayer(): number {
        return this.currentMatch.game!.max_players
    }

    public getMatchPlayers(): MatchPlayer[] {
        return this.currentMatch.matchPlayers;
    }

    public canAddPlayer(): boolean {
        if (this.currentMatch.game!.max_players < this.currentMatch.matchPlayers.length + 1) {
            return false
        }
        return true
    }

    public addPlayer() {
        if (this.canAddPlayer()) {
            this.currentMatch.matchPlayers.push({
                players: [],
                color: null,
                tags: [],
                uuid: "" + Math.random()
            })
        } else {
            throw Error("Max Players excedeed for this game")
        }
    }

    public deletePlayer(matchPlayer: MatchPlayer) {
        const index = this.currentMatch.matchPlayers.indexOf(matchPlayer);
        console.log("Delete player: ", matchPlayer)
        this.currentMatch.matchPlayers.splice(index, 1);
        if (this.currentMatch.matchPlayers.length < this.currentMatch.game!.min_players) {
            console.log("Minimum number of player reached, creating an empty one: ", matchPlayer)
            this.addPlayer()
        }
    }

    public cancel() {
        this.init()
    }

    private init() {
        this.currentMatch = {
            game: null,
            matchStarted: false,
            tags: [],
            matchPlayers: []
        }
    }

    public createMatch() {
        if (this.currentMatch == null) {
            throw Error("No current match")
        }
        const macth: MatchForApi = {
            id_game: this.currentMatch.game!.id!,
            teams: this.currentMatch.matchPlayers
        }
        return this.http.post<number>(this.matchUrl, macth).pipe(
            tap(_ => this.currentMatch.matchStarted = true)
        )
    }

    public finishMatch() {

    }
}