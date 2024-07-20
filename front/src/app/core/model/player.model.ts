import { ColorTag } from "./tag.model"

/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 28/01/2023 - 10:39:46
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 28/01/2023
    * - Author          : renau
    * - Modification    : 
**/
export interface Player {
    id: number
    pseudo: string
    lastName: string
    firstName: string
    preferedColor: ColorTag
    gravatarUrl: string
}