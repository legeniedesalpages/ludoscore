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
    lastName: string
    firstName: string
    preferedColor: string
    gravatar: string
    createdAt: Date | undefined
    user: {
        email: string
        id: number
    }
}