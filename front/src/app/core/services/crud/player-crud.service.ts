/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 22/01/2023 - 17:41:39
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CrudService } from './abstract-crud.service'
import { PlayerAssociation, PlayerAssociationRights, PlayerEntity, PlayerMergePreview } from '../../entity/player-entity.model'

@Injectable({ providedIn: 'root' })
export class PlayerCrudService extends CrudService<PlayerEntity, number> {

    constructor(protected override http: HttpClient) {
        super(http, '/player')
    }

    findForMatch() {
        return this.http.get<PlayerEntity[]>(`${this.apiUrl}/player`, { params: { purpose: 'match' } })
    }

    ludotag(id: number) {
        return this.http.get<{ ludotag: string }>(`${this.apiUrl}/player/${id}/ludotag`)
    }

    associateLudotag(ludotag: string, personalPseudo?: string) {
        return this.http.post<{ id: number, pseudo: string }>(`${this.apiUrl}/player/associate-ludotag`, { ludotag, ...(personalPseudo ? { personalPseudo } : {}) })
    }

    savePersonalPseudo(id: number, personalPseudo: string | null) {
        return this.http.put<PlayerEntity>(`${this.apiUrl}/player/${id}/personal-pseudo`, { personalPseudo })
    }

    previewMerge(id: number, ludotag: string) {
        return this.http.post<PlayerMergePreview>(`${this.apiUrl}/player/${id}/merge/preview`, { ludotag })
    }

    merge(id: number, ludotag: string) {
        return this.http.post<PlayerMergePreview & { mergeId: number }>(`${this.apiUrl}/player/${id}/merge`, { ludotag, confirmed: true })
    }

    associations(id: number) {
        return this.http.get<PlayerAssociation[]>(`${this.apiUrl}/player/${id}/associations`)
    }

    saveAssociation(id: number, userId: number, rights: PlayerAssociationRights) {
        return this.http.put<PlayerAssociation[]>(`${this.apiUrl}/player/${id}/associations/${userId}`, rights)
    }

    deleteAssociation(id: number, userId: number) {
        return this.http.delete<void>(`${this.apiUrl}/player/${id}/associations/${userId}`)
    }

}