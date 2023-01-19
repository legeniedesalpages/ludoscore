/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 19/12/2022 - 11:27:36
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 19/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Component, OnInit } from '@angular/core';
import { Player } from 'src/app/core/model/player.model';
import { PlayerService } from 'src/app/core/services/player.service';

@Component({
  templateUrl: './player-manager.component.html',
  styleUrls: ['./player-manager.component.css']
})
export class PlayerManagerComponent implements OnInit {

  public players: Player[] = []

  constructor(public playerService: PlayerService) {
    console.debug("Player Manager starting!")
    this.players = [
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
      {
        id: 0,
        pseudo: "reno",
        lastName: "",
        firstName: "",
        initials: "",
        gravatar: ""
      },
    ]
  }

  ngOnInit(): void {
    //this.playerService.list().subscribe((players) => {
    //  console.debug("player manager", players)
    //  this.players = players
    //})
  }
}
