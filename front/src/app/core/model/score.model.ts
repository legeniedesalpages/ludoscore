import { ColorTag } from "./tag.model"

/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 16/07/2024 - 08:44:25
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 16/07/2024
    * - Author          : renau
    * - Modification    : 
**/
export interface ScoreTag {
    category: string
    min?: number
    max?: number
    negatif: boolean
    complex: boolean
    color: ColorTag
}

export interface Score {
    categoryName: string
    value: number
    inputString: string
}