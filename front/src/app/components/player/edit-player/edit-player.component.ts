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
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Navigate } from '@ngxs/router-plugin';
import { Store } from '@ngxs/store';
import { UserEntity } from 'src/app/core/entity/user-entity.model';
import { COLORS } from 'src/app/core/model/color-tag.model';
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service';
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service';
import { AuthState } from 'src/app/core/state/auth/auth.state';

@Component({
  selector: 'edit-player',
  templateUrl: './edit-player.component.html',
  styleUrls: ['./edit-player.component.css', '../../../core/css/list.css']
})
export class EditPlayerComponent implements OnInit {

  public playerEditorForm: FormGroup;

  public users: UserEntity[] = []
  
  public loading: boolean = true
  public creating: boolean = false
  public saving: boolean = false
  public colors = COLORS

  constructor(private store: Store, private route: ActivatedRoute, private playerService: PlayerCrudService, private userCrudService: UserCrudService) {
    this.playerEditorForm = new FormGroup({
      pseudo: new FormControl('', Validators.required),
      prenom: new FormControl(''),
      nom: new FormControl(''),
      couleur: new FormControl(''),
      user: new FormControl({value: '', disabled: true})
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      let id = Number(params.get('id'));
      console.debug("Id: ", id);
      this.creating = (id === 0);
      console.debug("Creating: ", this.creating);

      this.userCrudService.findAll().subscribe(users => {
        this.users = users;
        let loggedUserId: number = this.store.selectSnapshot(AuthState).id
        let loggedUser: UserEntity = this.users.find(user => user.id === loggedUserId)!
        console.debug("Logged user: ", loggedUser);
        if (loggedUser.isAdmin) {
          this.playerEditorForm.get('user')?.enable();
        }
        

        if (!this.creating) {        
          
          this.playerService.findOne(id).subscribe(playerEntity => {
            let userId = null
            if (playerEntity.user) {
              console.debug("Le joueur à déjà un utilisateur associé, on le prend: ", playerEntity.user);
              userId = playerEntity.user.id;
            }

            this.playerEditorForm.setValue({
              pseudo: playerEntity.pseudo,
              prenom: playerEntity.firstName,
              nom: playerEntity.lastName,
              couleur: playerEntity.preferedColor,
              user: userId
            })
            this.loading = false;
          })
        } else {
          console.log(this.store.selectSnapshot(AuthState))
          
          console.debug("On est en train de créer un joueur, on vérifie si l'utilisateur connecté a déjà été connecté à un joueur: ", loggedUserId);
          
          if (!this.users.find(user => user.id === loggedUserId)?.playerId) {
            console.debug("L'utilisateur connecté n'a pas de joueur associé, on le prend: ", loggedUserId);
            this.playerEditorForm.setValue({    
              pseudo: '',
              prenom: '',
              nom: '',
              couleur: '',
              user: loggedUserId
            })
          }

          this.loading = false;
        }
      })
    })
  }

  public returnToList() { 
    this.store.dispatch(new Navigate(['/manage-player']))
  }

  public save() {
    this.saving = true
    this.store.dispatch(new Navigate(['/']))
  }
}
