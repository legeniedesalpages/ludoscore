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
      user: new FormControl('')
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

        if (!this.creating) {        
          
          this.playerService.findOne(id).subscribe(playerEntity => {
            let userId
            if (playerEntity.user) {
              userId = playerEntity.user.id;
            } else {
              userId = null;
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
          this.loading = false;
        }
      })
    })
  }

  public returnToList() { 
    this.store.dispatch(new Navigate(['/manage-player']))
  }
}
