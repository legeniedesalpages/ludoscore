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
    fallback: string[]
}

export const COLORS: ColorTag[] = [

    { name: "Blanc", code: "#EEE", invert: "black", fallback: ["Gris", "Jaune"] },
    { name: "Jaune", code: "yellow", invert: "black", fallback: ["Blanc"] },
    { name: "Vert clair", code: "lightgreen", invert: "Black", fallback: ["Vert", "Vert foncé"] },
    { name: "Rose", code: "pink", invert: "black", fallback: ["Rouge", "Pourpre"] },
    { name: "Bleu clair", code: "lightblue", invert: "black", fallback: ["Bleu", "Bleu foncé"] },
    
    { name: "Gris", code: "grey", invert: "white", fallback: ["Blanc", "Noir"] },
    { name: "Orange", code: "orange", invert: "black", fallback: ["Jaune", "Marron"] },
    { name: "Vert", code: "limegreen", invert: "white", fallback: ["Vert foncé", "Vert clair"] },
    { name: "Rouge", code: "red", invert: "white", fallback: ["Pourpre", "Rose"] },
    { name: "Bleu", code: "blue", invert: "white", fallback: ["Bleu clair", "Bleu foncé"] },

    { name: "Noir", code: "black", invert: "white", fallback: ["Gris", "Bleu foncé"] },
    { name: "Marron", code: "brown", invert: "white", fallback: ["Rouge", "Orange"] },
    { name: "Vert foncé", code: "darkgreen", invert: "white", fallback: ["Vert", "Vert clair"] },
    { name: "Pourpre", code: "purple", invert: "white", fallback: ["Rouge", "Rose"] },
    { name: "Bleu foncé", code: "darkblue", invert: "white", fallback: ["Bleu", "Bleu clair"] },
]

export const NO_COLOR: ColorTag = { name: "Aucune", code: "transparent", invert: "white", fallback: [] }
