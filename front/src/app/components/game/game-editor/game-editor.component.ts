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
import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ColorTag, Tag } from 'src/app/core/model/tag.model'
import { Game, GameToSave } from 'src/app/core/model/game.model'
import { FindGameService } from 'src/app/core/services/game/find-game.service'
import { DateValidator } from 'src/app/core/services/misc/date.validator'
import { GameService } from 'src/app/core/services/game/game.service'
import { environment } from 'src/environments/environment'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { GameSearchDetail } from 'src/app/core/model/game-search.model'

@Component({
  selector: 'game-editor',
  templateUrl: './game-editor.component.html',
  styleUrls: ['./game-editor.component.css']
})
export class GameEditorComponent implements OnInit {

  public env = environment

  public loading: boolean
  public saving: boolean
  public backgroundImageUrl?: string

  public gameEditorForm: FormGroup
  public gameId?: number
  public bggId?: number
  public imageUrlFromBgg?: string
  public thumbnailUrlFromBgg?: string
  public tagsGame: Tag[] = []
  public tagsPlayer: Tag[] = []
  public tagsColor: ColorTag[] = []

  constructor(private store: Store, private route: ActivatedRoute, private findGameService: FindGameService, private snackBar: MatSnackBar, private gameService: GameService) {

    this.loading = true
    this.saving = false

    this.gameEditorForm = new FormGroup({
      name: new FormControl('', Validators.required),
      cooperative: new FormControl('', Validators.required),
      minPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      maxPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      ownership: new FormControl('', DateValidator.dateValidator),
    })
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {

      this.bggId = Number(params.get('id'))
      if (!this.bggId) {
        console.warn('No bgg id provided, redirecting to find game')
        this.store.dispatch(new Navigate(['/find-game']))
      }

      if (params.get('type') === 'bgg') {
        this.initFromSearch()
      } else {
        this.initFromLibrary()
      }
    })
  }

  private initFromLibrary() {
    
    console.info('Fill from game library, bgg id: ', this.bggId)
    this.gameService.getFromBgg(this.bggId!).subscribe({

      next: (game: Game) => {
        console.info("Game details: [" + game.title + "]")
        this.gameId = game.id

        this.backgroundImageUrl = `'${game.imageUrl}'`

        this.gameEditorForm.setValue({
          name: game.title,
          minPlayer: game.minPlayers,
          maxPlayer: game.maxPlayers,
          cooperative: game.isOnlyCooperative ? "true" : "false",
          ownership: game.ownershipDate
        })

        this.tagsGame = game.matchTags
        this.tagsPlayer = game.playerTags
        this.tagsColor = game.playerColors
      },
      complete: () => {
        this.loading = false
      }
    })
  }

  private initFromSearch() {

    console.info('Fill form from bgg id: ', this.bggId)
    this.findGameService.detail(this.bggId!).subscribe({

      next: (gameSearchDetail: GameSearchDetail) => {
        console.info("Game details: [" + gameSearchDetail.name + "]")
        this.gameId = undefined

        this.backgroundImageUrl = `'${gameSearchDetail.imageUrlFromBgg}'`

        this.gameEditorForm.setValue({
          name: gameSearchDetail.name,
          minPlayer: gameSearchDetail.minplayers,
          maxPlayer: gameSearchDetail.maxplayers,
          cooperative: "false",
          ownership: null
        })

        this.imageUrlFromBgg = gameSearchDetail.imageUrlFromBgg
        this.thumbnailUrlFromBgg = gameSearchDetail.thumbnailUrlFromBgg

      },
      complete: () => {
        this.loading = false
      }
    })
  }

  public saveGame(): void {
    this.saving = true

    const gameToSave: GameToSave = {
      id: this.gameId,
      title: this.gameEditorForm.get('name')?.value,
      isOnlyCooperative: this.gameEditorForm.get('cooperative')?.value == "false" ? false : true,
      minPlayers: this.gameEditorForm.get('minPlayer')?.value,
      maxPlayers: this.gameEditorForm.get('maxPlayer')?.value,
      ownershipDate: this.gameEditorForm.get('ownership')?.value!,
      matchTags: this.tagsGame,
      playerTags: this.tagsPlayer,
      playerColors: this.tagsColor,
      bggId: this.bggId!,
      drawAllowed: true,
      drawBreaker: [],
      quantifiableScore: true,
      highestScoreWin: true,
      imageUrlFromBgg: this.imageUrlFromBgg,
      thumbnailUrlFromBgg: this.thumbnailUrlFromBgg
    }

    this.gameService.save(gameToSave).subscribe({

      next: (game) => {
        console.debug("Game id :" + game.id)
        this.snackBar.open("Jeu enregistré", 'Fermer', {
          duration: 5000
        })        
        this.store.dispatch(new Navigate(['/']))
      },

      error: (err) => {
        this.snackBar.open("Impossible d'enregistrer le jeu: " + err, 'Fermer', {
          duration: 10000
        })
        console.error('Error saving game', err)
      },

      complete: () => {
        this.saving = false
      }

    })
  }

  public returnToGameList() {
    this.store.dispatch(new Navigate(['/find-game']))
  }
}
