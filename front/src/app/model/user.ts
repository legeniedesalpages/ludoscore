/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 20/12/2022 - 00:21:59
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 20/12/2022
    * - Author          : renau
    * - Modification    : 
**/
export class User {
    id: string;
    name: string;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }
}