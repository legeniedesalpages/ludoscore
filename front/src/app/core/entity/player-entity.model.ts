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
    creatorPseudo?: string | null
    personalPseudo?: string | null
    lastName?: string | null
    firstName?: string | null
    preferedColor: string
    gravatar: string
    createdAt: Date | undefined
    playedMatchCount?: number
    status?: 'active' | 'replaced'
    replacedByPlayerId?: number | null
    replacedAt?: string | null
    permissions?: {
        isCreator: boolean
        canViewPersonalInfo: boolean
        canViewOtherMatches: boolean
        canAccessMatches?: boolean
        can_access_matches?: boolean
        canAddToMatch: boolean
        canEdit: boolean
        canMerge?: boolean
        canManageAssociations?: boolean
        canPersonalize?: boolean
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

export interface PlayerMergePreview {
    replaced: { id: number, pseudo: string }
    survivor: { id: number, pseudo: string }
    matchCount: number
    participationCount: number
    conflictMatchIds: number[]
}

export interface PlayerAssociation {
    userId: number
    email: string
    isCreator: boolean
    isSelf: boolean
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