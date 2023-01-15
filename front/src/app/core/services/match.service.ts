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

@Injectable()
export class MatchService implements OnInit {

    private readonly matchUrl = environment.apiURL + '/api/match';

    private currentMatch: Match;

    constructor(private http: HttpClient, private gameService: GameService) {
        this.currentMatch = {
            game: null,
            matchStarted: false,
            tags: [],
            matchPlayers: []
        }
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
    }
}
