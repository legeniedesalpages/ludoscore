// Vainqueur uniquement si toutes les équipes ont un score numérique ; le critère dépend du jeu (plus haut ou plus bas score)
export function determineWinner<T extends { score?: number | null }>(teams: T[], highestScoreWin: boolean | undefined): T | undefined {
    if (teams.length === 0 || teams.some(team => team.score == undefined || Number.isNaN(Number(team.score)))) {
        return undefined
    }
    const highestWins = highestScoreWin ?? true
    return teams.reduce((best, current) => {
        const bestScore = Number(best.score)
        const currentScore = Number(current.score)
        return (highestWins ? currentScore > bestScore : currentScore < bestScore) ? current : best
    })
}
