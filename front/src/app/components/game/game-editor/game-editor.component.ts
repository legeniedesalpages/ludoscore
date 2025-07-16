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
import { DrawBreaker, Game, GameToSave } from 'src/app/core/model/game.model'
import { FindGameService } from 'src/app/core/services/game/find-game.service'
import { DateValidator } from 'src/app/core/services/misc/date.validator'
import { GameService } from 'src/app/core/services/game/game.service'
import { environment } from 'src/environments/environment'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { GameSearchDetail } from 'src/app/core/model/game-search.model'
import { ScoreTag } from 'src/app/core/model/score.model'

@Component({
  selector: 'game-editor',
  templateUrl: './game-editor.component.html',
  styleUrls: ['./game-editor.component.css'],
  standalone: false
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
  public tagsScore: ScoreTag[] = []
  public tagsDraw: DrawBreaker[] = []

  constructor(private store: Store, private route: ActivatedRoute, private findGameService: FindGameService, private snackBar: MatSnackBar, private gameService: GameService) {

    this.loading = true
    this.saving = false

    this.gameEditorForm = new FormGroup({
      name: new FormControl('', Validators.required),
      quantifiableScore: new FormControl(true, Validators.required),
      highestScoreWin: new FormControl(true, Validators.required),
      drawAllowed: new FormControl(true, Validators.required),
      estimatedDurationInMinutes: new FormControl(0, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      cooperative: new FormControl(false, Validators.required),
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
          quantifiableScore: game.quantifiableScore,
          highestScoreWin: game.highestScoreWin,
          drawAllowed: game.drawAllowed,
          minPlayer: game.minPlayers,
          maxPlayer: game.maxPlayers,
          cooperative: game.isOnlyCooperative,
          ownership: game.ownershipDate,
          estimatedDurationInMinutes: game.estimatedDurationInMinutes
        })

        this.tagsGame = game.matchTags
        this.tagsPlayer = game.playerTags
        this.tagsColor = game.playerColors
        this.tagsScore = game.scoreTags
        this.tagsDraw = game.drawBreaker
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
          quantifiableScore: true,
          drawAllowed: true,
          highestScoreWin: true,
          minPlayer: gameSearchDetail.minplayers,
          maxPlayer: gameSearchDetail.maxplayers,
          cooperative: false,
          ownership: null,
          estimatedDurationInMinutes: 0
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
      isOnlyCooperative: this.gameEditorForm.get('cooperative')?.value,
      minPlayers: this.gameEditorForm.get('minPlayer')?.value,
      maxPlayers: this.gameEditorForm.get('maxPlayer')?.value,
      ownershipDate: this.gameEditorForm.get('ownership')?.value!,
      matchTags: this.tagsGame,
      playerTags: this.tagsPlayer,
      playerColors: this.tagsColor,
      scoreTags: this.tagsScore,
      bggId: this.bggId!,
      drawAllowed: this.gameEditorForm.get('drawAllowed')?.value,
      drawBreaker: this.tagsDraw,
      quantifiableScore: this.gameEditorForm.get('quantifiableScore')?.value,
      highestScoreWin: this.gameEditorForm.get('highestScoreWin')?.value,
      imageUrlFromBgg: this.imageUrlFromBgg,
      thumbnailUrlFromBgg: this.thumbnailUrlFromBgg,
      estimatedDurationInMinutes: this.gameEditorForm.get('estimatedDurationInMinutes')?.value
    }

    this.gameService.save(gameToSave).subscribe({

      next: (game) => {
        console.debug("Game id :" + game.id)
        this.snackBar.open("Jeu enregistré", 'Fermer', {
          duration: 5000
        })
        this.saving = false
        this.store.dispatch(new Navigate(['/']))
      },

      error: (err) => {
        this.snackBar.open("Impossible d'enregistrer le jeu: " + err, 'Fermer', {
          duration: 10000
        })
        console.error('Error saving game', err)
        this.saving = false
      }
    })
  }

  public returnToGameList() {
    this.store.dispatch(new Navigate(['/find-game']))
  }

}
