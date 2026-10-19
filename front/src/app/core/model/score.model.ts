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

export interface ScoreTagProperties {
    min?: number | null
    max?: number | null
    negatif?: boolean
    complex?: boolean
    color?: ColorTag
}

export type ScoreTagProperty = keyof ScoreTagProperties

export const SCORE_TAG_PROPERTY_LABELS: Record<ScoreTagProperty, string> = {
    min: 'Valeur minimum',
    max: 'Valeur maximum',
    negatif: 'Retranche sa valeur',
    complex: 'Calculatrice',
    color: 'Couleur',
}

export interface ScoreTagChange {
    baseGameBggId: number
    category: string
    properties: ScoreTagProperties
}

export function scoreTagWithChanges(tag: ScoreTag, change?: ScoreTagChange): ScoreTag {
    const result: ScoreTag = { ...tag, ...change?.properties } as ScoreTag
    for (const bound of ['min', 'max'] as const) {
        if (result[bound] === null) result[bound] = undefined
    }
    return result
}

function normalizedScoreProperty(property: ScoreTagProperty, value: unknown): unknown {
    if (property === 'min' || property === 'max') {
        return value === null || value === undefined || value === '' ? null : Number(value)
    }
    if (property === 'color') return String((value as ColorTag | undefined)?.code ?? '').toLowerCase()
    return !!value
}

export function scoreTagDifferences(original: ScoreTag, edited: ScoreTag): ScoreTagProperties {
    const properties: ScoreTagProperties = {}
    for (const property of Object.keys(SCORE_TAG_PROPERTY_LABELS) as ScoreTagProperty[]) {
        if (normalizedScoreProperty(property, original[property]) !== normalizedScoreProperty(property, edited[property])) {
            const value = property === 'color' ? edited.color : normalizedScoreProperty(property, edited[property])
            Object.assign(properties, { [property]: value })
        }
    }
    return properties
}