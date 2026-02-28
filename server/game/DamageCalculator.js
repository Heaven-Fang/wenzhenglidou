const { DAMAGE_TABLE, DODGE_REDUCTION_TABLE } = require('../config/constants');
const { getRandomInt } = require('../utils/helpers');
const { clearDeadSummons } = require('../models/PlayerState');

function calculateDamage(randomNum) {
    return DAMAGE_TABLE[randomNum] || 0;
}

function calculateDodgeReduction(randomNum) {
    return DODGE_REDUCTION_TABLE[randomNum] || 0;
}

function processDollDamage(game, player, damage) {
    const playerState = player === 1 ? game.player1 : game.player2;
    
    const allSummons = [...playerState.summonedDolls, ...playerState.summons].filter(s => s.hp > 0);
    if (allSummons.length > 0) {
        let dollDamage, playerDamage;
        
        if (damage % 2 === 0) {
            dollDamage = Math.floor(damage / 2);
            playerDamage = Math.floor(damage / 2);
        } else {
            dollDamage = Math.ceil(damage / 2);
            playerDamage = Math.floor(damage / 2);
        }
        
        const firstDoll = allSummons[0];
        if (playerState.summonedDolls.includes(firstDoll)) {
            const idx = playerState.summonedDolls.indexOf(firstDoll);
            playerState.summonedDolls[idx].hp -= dollDamage;
        } else {
            const idx = playerState.summons.indexOf(firstDoll);
            playerState.summons[idx].hp -= dollDamage;
        }
        game.logs.push(`人偶分摊了${dollDamage}点伤害！`);
        
        clearDeadSummons(playerState);
        
        return playerDamage;
    }
    
    return damage;
}

function dealNormalDamage(game, targetPlayer, damage, source = '攻击') {
    const targetState = targetPlayer === 1 ? game.player1 : game.player2;
    
    if (damage === 0) {
        game.logs.push(`${source}未造成伤害！`);
        return 0;
    }
    
    let totalDamage = damage + targetState.addDamage;
    
    const totalDef = targetState.baseDef + targetState.defBonus;
    
    if (totalDamage > totalDef) {
        let finalDamage = totalDamage - totalDef;
        finalDamage = processDollDamage(game, targetPlayer, finalDamage);
        finalDamage = Math.max(0, finalDamage - targetState.damageReduction);
        targetState.hp = Math.max(0, targetState.hp - finalDamage);
        game.logs.push(`${source}造成${finalDamage}点普通伤害！`);
        return finalDamage;
    } else {
        const dodgeRandom = getRandomInt(1, 9);
        const reduction = calculateDodgeReduction(dodgeRandom);
        game.dodgeReduction = reduction;
        
        let finalDamage = Math.max(0, totalDamage - reduction);
        finalDamage = processDollDamage(game, targetPlayer, finalDamage);
        finalDamage = Math.max(0, finalDamage - targetState.damageReduction);
        
        targetState.hp = Math.max(0, targetState.hp - finalDamage);
        
        if (reduction > 0) {
            game.logs.push(`${source}：防守方闪避判定成功，减免${reduction}点伤害，最终受到${finalDamage}点伤害！`);
            
            if (targetState.characterId === 4) {
                targetState.sp = Math.min(targetState.sp + 1, targetState.maxSP);
                game.logs.push(`杏子的天赋【走险】触发，SP+1！`);
            }
        } else {
            game.logs.push(`${source}：防守方闪避判定失败，最终受到${finalDamage}点伤害！`);
        }
        
        return finalDamage;
    }
}

function dealTrueDamage(game, targetPlayer, damage, source = '真实伤害') {
    const targetState = targetPlayer === 1 ? game.player1 : game.player2;
    
    if (damage <= 0) return 0;
    
    let finalDamage = processDollDamage(game, targetPlayer, damage);
    targetState.hp = Math.max(0, targetState.hp - finalDamage);
    game.logs.push(`${source}造成${finalDamage}点真实伤害！`);
    return finalDamage;
}

module.exports = {
    calculateDamage,
    calculateDodgeReduction,
    processDollDamage,
    dealNormalDamage,
    dealTrueDamage
};
