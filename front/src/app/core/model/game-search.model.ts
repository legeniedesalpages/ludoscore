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
export interface GameSearchResult {
    id: number
    thumbnailUrlFromBgg: string
    name: string
    year: number
    popularity: number
    owned: boolean
}

export interface GameSearchDetail {
    id: number
    name: string
    imageUrlFromBgg: string
    thumbnailUrlFromBgg: string
    minplayers: number
    maxplayers: number
}