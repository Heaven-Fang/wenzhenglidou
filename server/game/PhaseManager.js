const { PHASES, PHASE_DELAY } = require('../config/constants');
const { resetTurnBuffs, clearDeadSummons } = require('../models/PlayerState');
const { checkGameEnd } = require('../models/GameState');
const { 
    processPassiveSkills, 
    processTalent, 
    processShanghaiDolls, 
    processPenglaiDolls, 
    processRevealDamage,
    processActionValueComparison,
    processSkipActionEffects,
    processAttack,
    processDefense,
    applyDamage
} = require('./BattleManager');
const { dealTrueDamage } = require('./DamageCalculator');
const { tickBuffDurations, processRoundEndBuffs } = require('./BuffManager');

function advancePhase(room, game, broadcastCallback) {
    if (game.gameEnded) {
        return;
    }
    
    const currentIndex = PHASES.indexOf(game.phase);
    
    game.player1.confirmed = false;
    game.player2.confirmed = false;
    
    if (currentIndex < PHASES.length - 1) {
        game.phase = PHASES[currentIndex + 1];
        
        let shouldContinue = true;
        
        switch (game.phase) {
            case 'summonAction':
                handleSummonAction(game);
                break;
                
            case 'beforeSkill':
                handleBeforeSkill(game);
                break;
                
            case 'actionCompare':
                handleActionCompare(game);
                break;
                
            case 'attackerAction':
                break;
                
            case 'defenderAction':
                break;
                
            case 'settlement':
                shouldContinue = handleSettlement(game, room, broadcastCallback);
                break;
                
            case 'afterSkill':
                break;
                
            case 'roundEnd':
                shouldContinue = handleRoundEnd(game, room, broadcastCallback);
                break;
        }
        
        if (game.gameEnded) {
            return;
        }
        
        broadcastCallback(room, {
            type: 'phaseChange',
            gameState: game
        });
        
        const autoPhases = ['roundStart', 'summonAction', 'actionCompare', 'settlement', 'roundEnd'];
        if (autoPhases.includes(game.phase) && shouldContinue) {
            setTimeout(() => {
                advancePhase(room, game, broadcastCallback);
            }, PHASE_DELAY);
        }
    } else {
        startNewRound(game);
        broadcastCallback(room, {
            type: 'phaseChange',
            gameState: game
        });
        
        setTimeout(() => {
            advancePhase(room, game, broadcastCallback);
        }, PHASE_DELAY);
    }
}

function handleSummonAction(game) {
    processShanghaiDolls(game, 1);
    processShanghaiDolls(game, 2);
    processPenglaiDolls(game, 1);
    processPenglaiDolls(game, 2);
    clearDeadSummons(game.player1);
    clearDeadSummons(game.player2);
}

function handleBeforeSkill(game) {
    resetTurnBuffs(game.player1);
    resetTurnBuffs(game.player2);
    
    tickBuffDurations(game.player1, game);
    tickBuffDurations(game.player2, game);
    
    processPassiveSkills(game, 1);
    processPassiveSkills(game, 2);
    processTalent(game, 1, 'roundStart');
    processTalent(game, 2, 'roundStart');
}

function handleActionCompare(game) {
    if (game.player1.thickAccumulationUsedThisRound && game.player2.thickAccumulationUsedThisRound) {
        game.logs.push(`双方技能抵消！本回合正常进行！`);
        game.player1.skipAction = false;
        game.player2.skipAction = false;
        game.player1.thickAccumulationUsedThisRound = false;
        game.player2.thickAccumulationUsedThisRound = false;
    }
    
    if (game.player1.skipAction) {
        game.attacker = 2;
        game.defender = 1;
        game.logs.push(`杏子的【厚积】效果，跳过行动值比拼，对方成为进攻方！`);
        processSkipActionEffects(game, 1);
        game.phase = 'attackerAction';
    } else if (game.player2.skipAction) {
        game.attacker = 1;
        game.defender = 2;
        game.logs.push(`杏子的【厚积】效果，跳过行动值比拼，对方成为进攻方！`);
        processSkipActionEffects(game, 2);
        game.phase = 'attackerAction';
    } else if (!game.attacker) {
        let success = processActionValueComparison(game);
        while (!success) {
            game.logs.push('行动值相同，重新投掷！');
            success = processActionValueComparison(game);
        }
    }
}

function handleSettlement(game, room, broadcastCallback) {
    if (game.pendingDamage > 0 || game.baseDamage > 0) {
        const damage = game.pendingDamage || game.baseDamage;
        applyDamage(game, damage, game.pendingDodgeReduction);
        game.pendingDamage = 0;
        game.pendingDodgeReduction = 0;
    }
    
    const result = checkGameEnd(game);
    if (result.ended) {
        game.gameEnded = true;
        game.winner = result.winner;
        broadcastCallback(room, {
            type: 'gameEnd',
            winner: result.winner,
            gameState: game
        });
        return false;
    }
    return true;
}

function handleRoundEnd(game, room, broadcastCallback) {
    game.player1.sp = Math.min(game.player1.sp + 1, game.player1.maxSP);
    game.player2.sp = Math.min(game.player2.sp + 1, game.player2.maxSP);
    game.logs.push(`回合结束，双方SP+1。`);
    
    processRevealDamage(game, 1);
    processRevealDamage(game, 2);
    
    processRoundEndBuffs(game.player1, game);
    processRoundEndBuffs(game.player2, game);
    
    if (game.player1.thickAccumulationCooldown > 0) {
        game.player1.thickAccumulationCooldown--;
    }
    if (game.player2.thickAccumulationCooldown > 0) {
        game.player2.thickAccumulationCooldown--;
    }
    game.player1.thickAccumulationUsedThisRound = false;
    game.player2.thickAccumulationUsedThisRound = false;
    
    game.player1.skipAction = false;
    game.player2.skipAction = false;
    
    game.player1.premonitionDisabled = false;
    game.player2.premonitionDisabled = false;
    
    const result = checkGameEnd(game);
    if (result.ended) {
        game.gameEnded = true;
        game.winner = result.winner;
        broadcastCallback(room, {
            type: 'gameEnd',
            winner: result.winner,
            gameState: game
        });
        return false;
    }
    return true;
}

function startNewRound(game) {
    game.round++;
    game.turnUsedSkills = [];
    game.attacker = null;
    game.defender = null;
    game.phase = PHASES[0];
    
    game.logs.push(`第${game.round}回合开始！`);
}

module.exports = {
    advancePhase,
    handleSummonAction,
    handleBeforeSkill,
    handleActionCompare,
    handleSettlement,
    handleRoundEnd,
    startNewRound
};
