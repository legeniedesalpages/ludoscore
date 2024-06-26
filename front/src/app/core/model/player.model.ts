import { ChoosenTag } from "./choosen-tag.model";
import { ColorTag } from "./color-tag.model";
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
    id: number,
    name: string,
    avatar: string,
    choosenTags: ChoosenTag[],
    color: ColorTag,
    score: number
}