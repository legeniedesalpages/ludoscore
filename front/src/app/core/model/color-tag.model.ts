/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 30/06/2024 - 08:51:05
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 30/06/2024
    * - Author          : renau
    * - Modification    : 
**/
export interface ColorTag {
    name: string
    code: string
    invert: string
}

export const COLORS: ColorTag[] = [

    { name: "Blanc", code: "#EEE", invert: "black" },
    { name: "Jaune", code: "yellow", invert: "black" },
    { name: "Vert clair", code: "lightgreen", invert: "Black" },
    { name: "Rose", code: "pink", invert: "black" },
    { name: "Bleu clair", code: "lightblue", invert: "black" },
    
    { name: "Gris", code: "grey", invert: "white" },
    { name: "Orange", code: "orange", invert: "black" },
    { name: "Vert", code: "limegreen", invert: "white" },
    { name: "Rouge", code: "red", invert: "white" },
    { name: "Bleu", code: "blue", invert: "white" },

    { name: "Noir", code: "black", invert: "white" },
    { name: "Marron", code: "brown", invert: "white" },
    { name: "Vert foncé", code: "darkgreen", invert: "white" },
    { name: "Pourpre", code: "purple", invert: "white" },
    { name: "Bleu foncé", code: "darkblue", invert: "white" },
]
