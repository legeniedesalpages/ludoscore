import { Game, SelectingGame } from '../model/game.model'
import { ScoreTag, scoreTagWithChanges } from '../model/score.model'
import { ColorTag, Tag, TagScope, TagValueChange, tagWithValueChanges } from '../model/tag.model'

function applyTagChanges(base: Game, tags: Tag[], scope: TagScope, expansions: Game[]): Tag[] {
    return tags.map(tag => expansions.reduce((current, expansion) => tagWithValueChanges(current,
        (expansion.expansionTagChanges ?? []).find((change: TagValueChange) =>
            change.baseGameBggId === base.bggId && change.scope === scope && change.category === tag.category)), tag))
}

function mergeTags(base: Game, scope: TagScope, expansions: Game[]): Tag[] {
    const merged = applyTagChanges(base, (scope === 'match' ? base.matchTags : base.playerTags) ?? [], scope, expansions)
    for (const expansion of expansions) {
        for (const tag of (scope === 'match' ? expansion.matchTags : expansion.playerTags) ?? []) {
            const index = merged.findIndex(existing => existing.category === tag.category)
            if (index < 0) {
                merged.push({ ...tag, names: [...tag.names] })
            } else {
                merged[index] = { ...merged[index], names: [...new Set([...merged[index].names, ...tag.names])] }
            }
        }
    }
    return merged
}

function mergeScoreTags(base: Game, expansions: Game[]): ScoreTag[] {
    const merged = (base.scoreTags ?? []).map(tag => expansions.reduce((current, expansion) => scoreTagWithChanges(current,
        (expansion.expansionScoreChanges ?? []).find(change =>
            change.baseGameBggId === base.bggId && change.category === tag.category)), tag))
    for (const expansion of expansions) {
        for (const tag of expansion.scoreTags ?? []) {
            if (!merged.some(existing => existing.category === tag.category)) merged.push({ ...tag })
        }
    }
    return merged
}

function mergeColors(base: Game, expansions: Game[]): ColorTag[] {
    const colors = [...(base.playerColors ?? [])]
    for (const color of expansions.flatMap(expansion => expansion.playerColors ?? [])) {
        if (!colors.some(existing => existing.name === color.name)) colors.push(color)
    }
    return colors
}

/** Game rules of a match: the base game with the inherited changes and additions of its selected expansions. */
export function mergeGameWithExpansions(base: Game, expansions: Game[] = []): Game {
    if (expansions.length === 0) return base
    return {
        ...base,
        maxPlayers: base.maxPlayers + expansions.reduce((total, expansion) => total + (expansion.additionalPlayers ?? 0), 0),
        matchTags: mergeTags(base, 'match', expansions),
        playerTags: mergeTags(base, 'player', expansions),
        playerColors: mergeColors(base, expansions),
        scoreTags: mergeScoreTags(base, expansions),
    }
}

export function expansionTitles(expansions?: Pick<Game, 'title'>[]): string {
    return (expansions ?? []).map(expansion => expansion.title).join(', ')
}

/** Catalogue expansions of a base game, owned ones first. */
export function expansionCandidates(games: SelectingGame[], baseGame: Game): SelectingGame[] {
  return games
    .filter(game => game.isExpansion && (game.baseGameBggIds ?? []).includes(baseGame.bggId))
    .sort((a, b) => Number(b.inLibrary) - Number(a.inLibrary) || a.title.localeCompare(b.title))
}
