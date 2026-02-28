const { getCharacterById } = require('../data/characters');
const { getRandomInt } = require('../utils/helpers');
const { clearDeadSummons, resetTurnBuffs } = require('../models/PlayerState');
const { checkGameEnd } = require('../models/GameState');
const { calculateDamage, calculateDodgeReduction, dealNormalDamage, dealTrueDamage, processDollDamage } = require('./DamageCalculator');
const { PHASES, PHASE_DELAY } = require('../config/constants');

function processPassiveSkills(game, player) {
    const playerState = player === 1 ? game.player1 : game.player2;
    const char = getCharacterById(playerState.characterId);
    
    char.skills.forEach(skill => {
        if (skill.type === 'passive' && skill.timing === 'before') {
            if (playerState.characterId === 1 && skill.id === 1) {
                if (game.round === 1) {
                    playerState.summonedDolls.push({
                        type: 'normal',
                        hp: 4,
                        def: 0,
                        createdRound: game.round
                    });
                    game.logs.push(`爱丽丝的天赋【开幕】触发，召唤了一个人偶！`);
                }
                const dollCount = playerState.summonedDolls.filter(s => s.hp > 0).length + 
                                  playerState.summons.filter(s => s.hp > 0).length;
                playerState.atkBonus = dollCount * 8 + playerState.talentAtkBonus;
            }
        }
    });
}

function processTalent(game, player, event) {
    const playerState = player === 1 ? game.player1 : game.player2;
    const opponentState = player === 1 ? game.player2 : game.player1;
    const char = getCharacterById(playerState.characterId);
    
    if (char.id === 2 && event === 'becomeAttacker') {
        if (playerState.talentAtkBonus < 10) {
            playerState.talentAtkBonus += 2;
            playerState.atkBonus += 2;
        }
        opponentState.nextRandomBonus -= 10;
        game.logs.push(`四月的天赋【本能】触发，ATK+2，对方下回合随机数-10！`);
    }
    
    if (char.id === 3 && event === 'roundStart') {
        if (game.round % 2 === 1) {
            playerState.atkBonus += 5;
            game.logs.push(`五更的天赋【夜行】触发，奇数回合ATK+5！`);
        } else {
            playerState.turnDamageBonus += 1;
            game.logs.push(`五更的天赋【夜行】触发，偶数回合伤害+1！`);
        }
    }
}

function processShanghaiDolls(game, player) {
    const playerState = player === 1 ? game.player1 : game.player2;
    const opponentPlayer = player === 1 ? 2 : 1;
    
    const shanghaiDolls = playerState.summons.filter(s => s.type === 'shanghai' && s.hp > 0);
    if (shanghaiDolls.length > 0) {
        const totalDolls = playerState.summonedDolls.filter(s => s.hp > 0).length + 
                          playerState.summons.filter(s => s.hp > 0).length;
        const damage = totalDolls + 1;
        dealNormalDamage(game, opponentPlayer, damage, '上海人偶');
    }
}

function processPenglaiDolls(game, player) {
    const playerState = player === 1 ? game.player1 : game.player2;
    const opponentPlayer = player === 1 ? 2 : 1;
    
    playerState.summons.forEach(doll => {
        if (doll.type === 'penglai' && doll.hp > 0 && game.round >= doll.explodeRound) {
            const totalDolls = playerState.summonedDolls.filter(s => s.hp > 0).length + 
                              playerState.summons.filter(s => s.hp > 0).length;
            const damage = totalDolls + 2;
            dealNormalDamage(game, opponentPlayer, damage, '蓬莱人偶自爆');
            doll.hp = 0;
        }
    });
    
    clearDeadSummons(playerState);
}

function processRevealDamage(game, player) {
    const playerState = player === 1 ? game.player1 : game.player2;
    
    if (playerState.revealed && playerState.revealDuration > 0) {
        dealTrueDamage(game, player, 1, '【揭示】效果');
        playerState.revealDuration--;
        
        if (playerState.revealDuration === 0) {
            playerState.revealed = false;
        }
    }
}

function processDuSuan(game, player, actionValue) {
    const playerState = player === 1 ? game.player1 : game.player2;
    
    if (playerState.characterId === 4) {
        if (actionValue <= 70) {
            if (playerState.talentAtkBonus < 15) {
                playerState.talentAtkBonus += 3;
                playerState.atkBonus += 3;
                game.logs.push(`杏子的【度算】触发，ATK+3！`);
            }
        } else if (actionValue <= 150) {
            if (playerState.maxSP < 6 + 5) {
                playerState.sp = Math.min(playerState.sp + 1, playerState.maxSP);
                playerState.maxSP += 1;
                game.logs.push(`杏子的【度算】触发，SP+1，SP上限+1！`);
            }
        } else {
            playerState.permanentDamageBonus += 1;
            game.logs.push(`杏子的【度算】触发，普通伤害+1！`);
        }
    }
}

function processActionValueComparison(game) {
    let random1, random2;
    
    game.logs.push(`=== 行动值比拼开始 ===`);
    
    if (game.player1.doubleRandom) {
        const r1a = getRandomInt(1, 100);
        const r1b = getRandomInt(1, 100);
        random1 = Math.max(r1a, r1b);
        game.player1.doubleRandomForDuSuan = r1a + r1b;
        game.player1.doubleRandom = false;
        game.logs.push(`玩家1双随机数：${r1a}和${r1b}，取最大值${random1}`);
    } else if (!game.player1.skipAction) {
        random1 = getRandomInt(1, 100);
        game.logs.push(`玩家1行动值随机数：${random1}`);
    } else {
        random1 = 0;
        game.player1.skipAction = false;
        game.logs.push(`玩家1跳过行动值判定`);
    }
    
    if (game.player2.doubleRandom) {
        const r2a = getRandomInt(1, 100);
        const r2b = getRandomInt(1, 100);
        random2 = Math.max(r2a, r2b);
        game.player2.doubleRandomForDuSuan = r2a + r2b;
        game.player2.doubleRandom = false;
        game.logs.push(`玩家2双随机数：${r2a}和${r2b}，取最大值${random2}`);
    } else if (!game.player2.skipAction) {
        random2 = getRandomInt(1, 100);
        game.logs.push(`玩家2行动值随机数：${random2}`);
    } else {
        random2 = 0;
        game.player2.skipAction = false;
        game.logs.push(`玩家2跳过行动值判定`);
    }
    
    game.randomNum1 = random1;
    game.randomNum2 = random2;
    
    let bonus1 = game.player1.randomBonus + game.player1.nextRandomBonus;
    let bonus2 = game.player2.randomBonus + game.player2.nextRandomBonus;
    
    if (game.player1.premonitionDuration > 0 && game.player1.premonitionValues.length > 0) {
        bonus1 += game.player1.premonitionValues.shift();
        game.player1.premonitionDuration--;
    }
    if (game.player2.premonitionDuration > 0 && game.player2.premonitionValues.length > 0) {
        bonus2 += game.player2.premonitionValues.shift();
        game.player2.premonitionDuration--;
    }
    
    const atk1 = game.player1.baseAtk + game.player1.atkBonus;
    const atk2 = game.player2.baseAtk + game.player2.atkBonus;
    
    game.actionValue1 = random1 + atk1 + bonus1;
    game.actionValue2 = random2 + atk2 + bonus2;
    
    let actionValueDetail1 = `${random1}+${atk1}`;
    let actionValueDetail2 = `${random2}+${atk2}`;
    if (bonus1 !== 0) {
        actionValueDetail1 += bonus1 > 0 ? `+${bonus1}` : `${bonus1}`;
    }
    if (bonus2 !== 0) {
        actionValueDetail2 += bonus2 > 0 ? `+${bonus2}` : `${bonus2}`;
    }
    
    game.logs.push(`玩家1行动值：${actionValueDetail1}=${game.actionValue1}`);
    game.logs.push(`玩家2行动值：${actionValueDetail2}=${game.actionValue2}`);
    
    game.player1.nextRandomBonus = 0;
    game.player2.nextRandomBonus = 0;
    game.player1.randomBonus = 0;
    game.player2.randomBonus = 0;
    
    if (game.actionValue1 > game.actionValue2) {
        game.attacker = 1;
        game.defender = 2;
    } else if (game.actionValue2 > game.actionValue1) {
        game.attacker = 2;
        game.defender = 1;
    } else {
        return false;
    }
    
    processTalent(game, game.attacker, 'becomeAttacker');
    
    if (game.player1.characterId === 4) {
        let duSuanValue = game.actionValue1;
        if (game.player1.doubleRandomForDuSuan) {
            duSuanValue = game.player1.doubleRandomForDuSuan + atk1;
            game.player1.doubleRandomForDuSuan = 0;
        }
        processDuSuan(game, 1, duSuanValue);
    }
    if (game.player2.characterId === 4) {
        let duSuanValue = game.actionValue2;
        if (game.player2.doubleRandomForDuSuan) {
            duSuanValue = game.player2.doubleRandomForDuSuan + atk2;
            game.player2.doubleRandomForDuSuan = 0;
        }
        processDuSuan(game, 2, duSuanValue);
    }
    
    if (game.player1.premonitionSource && game.defender === 2) {
        if (!game.player1.premonitionTriggered) {
            game.player1.sp = Math.min(game.player1.sp + 1, game.player1.maxSP);
            game.player1.premonitionTriggered = true;
            game.logs.push(`五更的【预兆】触发，SP+1！`);
        }
    }
    if (game.player2.premonitionSource && game.defender === 1) {
        if (!game.player2.premonitionTriggered) {
            game.player2.sp = Math.min(game.player2.sp + 1, game.player2.maxSP);
            game.player2.premonitionTriggered = true;
            game.logs.push(`五更的【预兆】触发，SP+1！`);
        }
    }
    
    if (game.player1.buYuActive) {
        if (game.attacker === 1) {
            game.player1.sp = Math.min(game.player1.sp + 4, game.player1.maxSP);
            game.logs.push(`五更的【不语】判定成功，SP+4！`);
        } else {
            game.player1.defBonus += 1;
            game.player1.buYuDefBonus = 1;
            game.logs.push(`五更的【不语】判定失败，DEF+1！`);
        }
        game.player1.buYuActive = false;
    }
    if (game.player2.buYuActive) {
        if (game.attacker === 2) {
            game.player2.sp = Math.min(game.player2.sp + 4, game.player2.maxSP);
            game.logs.push(`五更的【不语】判定成功，SP+4！`);
        } else {
            game.player2.defBonus += 1;
            game.player2.buYuDefBonus = 1;
            game.logs.push(`五更的【不语】判定失败，DEF+1！`);
        }
        game.player2.buYuActive = false;
    }
    
    game.logs.push(`${game.attacker === 1 ? '玩家1' : '玩家2'}成为进攻方！`);
    
    return true;
}

function processSkipActionEffects(game, skipPlayer) {
    const skipPlayerState = skipPlayer === 1 ? game.player1 : game.player2;
    const otherPlayer = skipPlayer === 1 ? 2 : 1;
    const otherPlayerState = otherPlayer === 1 ? game.player1 : game.player2;
    
    if (otherPlayerState.premonitionSource && game.defender === skipPlayer) {
        if (!otherPlayerState.premonitionTriggered) {
            otherPlayerState.sp = Math.min(otherPlayerState.sp + 1, otherPlayerState.maxSP);
            otherPlayerState.premonitionTriggered = true;
            game.logs.push(`五更的【预兆】触发，SP+1！`);
        }
    }
    
    if (skipPlayerState.premonitionSource && game.defender === otherPlayer) {
        if (!skipPlayerState.premonitionTriggered) {
            skipPlayerState.sp = Math.min(skipPlayerState.sp + 1, skipPlayerState.maxSP);
            skipPlayerState.premonitionTriggered = true;
            game.logs.push(`五更的【预兆】触发，SP+1！`);
        }
    }
    
    if (otherPlayerState.buYuActive) {
        if (game.attacker === otherPlayer) {
            otherPlayerState.sp = Math.min(otherPlayerState.sp + 4, otherPlayerState.maxSP);
            game.logs.push(`五更的【不语】判定成功，SP+4！`);
        } else {
            otherPlayerState.defBonus += 1;
            otherPlayerState.buYuDefBonus = 1;
            game.logs.push(`五更的【不语】判定失败，DEF+1！`);
        }
        otherPlayerState.buYuActive = false;
    }
    
    if (skipPlayerState.buYuActive) {
        if (game.attacker === skipPlayer) {
            skipPlayerState.sp = Math.min(skipPlayerState.sp + 4, skipPlayerState.maxSP);
            game.logs.push(`五更的【不语】判定成功，SP+4！`);
        } else {
            skipPlayerState.defBonus += 1;
            skipPlayerState.buYuDefBonus = 1;
            game.logs.push(`五更的【不语】判定失败，DEF+1！`);
        }
        skipPlayerState.buYuActive = false;
    }
}

function processAttack(game) {
    const attackerState = game.attacker === 1 ? game.player1 : game.player2;
    
    const attackRandom = getRandomInt(1, 9);
    let damage = calculateDamage(attackRandom);
    
    damage += attackerState.turnDamageBonus + attackerState.permanentDamageBonus;
    
    game.baseDamage = damage;
    game.logs.push(`进攻方攻击，随机数${attackRandom}，基础伤害${damage}！`);
    
    return damage;
}

function processDefense(game, damage) {
    const defenderState = game.defender === 1 ? game.player1 : game.player2;
    
    game.logs.push(`=== 防守方行动 ===`);
    
    if (damage === 0) {
        game.logs.push(`伤害为0，跳过防守判定！`);
        return { damage: 0, reduction: 0 };
    }
    
    let totalDamage = damage + defenderState.addDamage;
    game.logs.push(`进攻方伤害：${damage}${defenderState.addDamage > 0 ? '+' + defenderState.addDamage : ''}=${totalDamage}`);
    
    const totalDef = defenderState.baseDef + defenderState.defBonus;
    game.logs.push(`防守方DEF：${defenderState.baseDef}${defenderState.defBonus !== 0 ? (defenderState.defBonus > 0 ? '+' + defenderState.defBonus : defenderState.defBonus) : ''}=${totalDef}`);
    
    if (totalDamage > totalDef) {
        game.logs.push(`伤害(${totalDamage}) > DEF(${totalDef})，无法减免伤害！`);
        return { damage: totalDamage, reduction: 0, needDodge: false };
    } else {
        game.logs.push(`伤害(${totalDamage}) <= DEF(${totalDef})，进行闪避判定！`);
        const dodgeRandom = getRandomInt(1, 9);
        const reduction = calculateDodgeReduction(dodgeRandom);
        game.pendingDodgeReduction = reduction;
        
        game.logs.push(`闪避判定随机数：${dodgeRandom}`);
        
        if (reduction > 0) {
            game.logs.push(`闪避判定成功！减免${reduction}点伤害！`);
            return { damage: totalDamage, reduction: reduction, needDodge: true, dodgeRandom: dodgeRandom };
        } else {
            game.logs.push(`闪避判定失败！无法减免伤害！`);
            return { damage: totalDamage, reduction: 0, needDodge: true, dodgeRandom: dodgeRandom };
        }
    }
}

function applyDamage(game, damage, reduction) {
    const defenderState = game.defender === 1 ? game.player1 : game.player2;
    const attackerState = game.attacker === 1 ? game.player1 : game.player2;
    
    if (damage === 0) {
        return 0;
    }
    
    let finalDamage = Math.max(0, damage - reduction);
    finalDamage = processDollDamage(game, game.defender, finalDamage);
    finalDamage = Math.max(0, finalDamage - defenderState.damageReduction);
    
    defenderState.hp = Math.max(0, defenderState.hp - finalDamage);
    game.finalDamage = finalDamage;
    game.logs.push(`最终造成${finalDamage}点伤害！`);
    
    if (attackerState.preciseAimActive && finalDamage > 0) {
        defenderState.defBonus -= 1;
        game.logs.push(`【精准瞄准】效果触发，对方DEF永久-1！`);
        attackerState.preciseAimActive = false;
    }
    
    if (reduction > 0 && defenderState.characterId === 4) {
        defenderState.sp = Math.min(defenderState.sp + 1, defenderState.maxSP);
        game.logs.push(`杏子的天赋【走险】触发，SP+1！`);
    }
    
    return finalDamage;
}

module.exports = {
    processPassiveSkills,
    processTalent,
    processShanghaiDolls,
    processPenglaiDolls,
    processRevealDamage,
    processDuSuan,
    processActionValueComparison,
    processSkipActionEffects,
    processAttack,
    processDefense,
    applyDamage,
    checkGameEnd
};
