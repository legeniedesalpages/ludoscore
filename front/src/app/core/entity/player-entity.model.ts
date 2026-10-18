/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 08/01/2023 - 15:44:39
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 08/01/2023
    * - Author          : renau
    * - Modification    : 
**/
export interface PlayerEntity {
    id: number
    pseudo: string
    lastName?: string | null
    firstName?: string | null
    preferedColor: string
    gravatar: string
    createdAt: Date | undefined
    playedMatchCount?: number
    permissions?: {
        isCreator: boolean
        canViewPersonalInfo: boolean
        canViewOtherMatches: boolean
        canAddToMatch: boolean
        canEdit: boolean
    }
    user?: {
        email: string
        id: number
    } | null
    creator?: {
        id: number
        email: string
        player: {
            id: number
            pseudo: string
        } | null
    }

}

export interface PlayerAssociation {
    userId: number
    email: string
    isCreator: boolean
    canViewPersonalInfo: boolean
    canViewOtherMatches: boolean
    canAddToMatch: boolean
    associatedAt: string
}

export interface PlayerAssociationRights {
    canViewPersonalInfo: boolean
    canViewOtherMatches: boolean
    canAddToMatch: boolean
}