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
import { Injectable, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Match } from '../model/match.model';
import { GameService } from './game.service';
import { Game } from '../model/game.model';
import { MatchPlayer } from '../model/matchPlayer.model';

@Injectable()
export class MatchService implements OnInit {

    private readonly matchUrl = environment.apiURL + '/api/match';

    private currentMatch!: Match;

    constructor(private http: HttpClient, private gameService: GameService) {
        this.reset()
    }

    ngOnInit(): void {
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
            this.currentMatch.matchPlayers.push({
                player: null,
                color: null,
                tags: []
            })
        }
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
                player: null,
                color: null,
                tags: []
            })
        } else {
            throw Error("Max Players excedeed for this game")
        }
    }

    public deletePlayer(matchPlayer: MatchPlayer) {
        console.warn(this.currentMatch.matchPlayers.length)
        const index = this.currentMatch.matchPlayers.indexOf(matchPlayer);
        console.log("Delete player: ", matchPlayer)
        this.currentMatch.matchPlayers.splice(index, 1);
        console.warn(this.currentMatch.matchPlayers.length)
        console.warn(this.currentMatch.game!.min_players)
        if (this.currentMatch.matchPlayers.length < this.currentMatch.game!.min_players) {
            this.addPlayer()
        }
    }

    public cancel() {
        this.reset()
    }

    private reset() {
        this.currentMatch = {
            game: null,
            matchStarted: false,
            tags: [],
            matchPlayers: []
        }
    }
}