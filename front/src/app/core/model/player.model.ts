/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 14/01/2023 - 10:46:31
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 14/01/2023
    * - Author          : renau
    * - Modification    : 
**/
export interface Player {
    id: number,
    lastName: string, // nom
    firstName: string, // prénom
    pseudo: string,
    initials: string,
    gravatar: string
}