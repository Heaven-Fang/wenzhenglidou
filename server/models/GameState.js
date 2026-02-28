const { createPlayerState } = require('./PlayerState');
const { PHASES } = require('../config/constants');

function createGameState(player1CharId, player2CharId) {
    return {
        round: 1,
        phase: PHASES[0],
        attacker: null,
        defender: null,
        actionValue1: 0,
        actionValue2: 0,
        randomNum1: 0,
        randomNum2: 0,
        baseDamage: 0,
        finalDamage: 0,
        dodgeReduction: 0,
        pendingDamage: 0,
        pendingDodgeReduction: 0,
        player1: createPlayerState(player1CharId),
        player2: createPlayerState(player2CharId),
        logs: [],
        usedSkills: [],
        turnUsedSkills: [],
        gameEnded: false,
        winner: null
    };
}

function checkGameEnd(game) {
    if (game.player1.hp <= 0) {
        return { ended: true, winner: 2 };
    }
    if (game.player2.hp <= 0) {
        return { ended: true, winner: 1 };
    }
    if (game.round > 11) {
        if (game.player1.hp > game.player2.hp) {
            return { ended: true, winner: 1 };
        } else if (game.player2.hp > game.player1.hp) {
            return { ended: true, winner: 2 };
        } else {
            return { ended: true, winner: 0 };
        }
    }
    return { ended: false };
}

module.exports = {
    createGameState,
    checkGameEnd
};
