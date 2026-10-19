/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 09/01/2023 - 00:45:18
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 09/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { BaseGameColors } from './game.model'
import { BaseGameTags } from './tag.model'

export type GameSearchType = 'game' | 'expansion' | 'all'

export type BggItemType = 'game' | 'expansion'

export interface GameSearchResult {
    id: number
    type: BggItemType
    thumbnailUrlFromBgg: string | null
    name: string
    year: number | null
    popularity: number | null
    owned: boolean
    registered: boolean
    /** false quand l'élément n'a pas été trouvé par la recherche mais est affiché pour le contexte (jeu de base, extension d'un jeu trouvé) */
    matched: boolean
    expansions?: GameSearchResult[]
    /** extensions du jeu non renvoyées car moins populaires */
    hiddenExpansionCount?: number
    baseGames?: BaseGameReference[]
}

export interface BaseGameReference {
    id: number
    name: string
    owned: boolean
    registered: boolean
}

export type GameSearchRow =
    | { kind: 'item', result: GameSearchResult, level: 0 | 1 }
    | { kind: 'hidden-expansions', count: number }

export interface GameSearchDetail {
    id: number
    isExpansion: boolean
    baseGames: BaseGameReference[]
    canAddExpansion: boolean
    baseGameColors?: BaseGameColors[]
    baseGameTags?: BaseGameTags[]
    name: string
    imageUrlFromBgg: string
    thumbnailUrlFromBgg: string
    minplayers: number
    maxplayers: number
}