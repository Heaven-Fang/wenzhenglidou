const { getCharacterById } = require('../data/characters');
const { dealNormalDamage } = require('./DamageCalculator');

function useSkill(game, player, skillId, targetPlayer) {
    const playerState = player === 1 ? game.player1 : game.player2;
    const opponentState = player === 1 ? game.player2 : game.player1;
    const char = getCharacterById(playerState.characterId);
    const skill = char.skills.find(s => s.id === skillId);
    
    if (!skill || skill.type !== 'active') return false;
    if (playerState.sp < skill.spCost) return false;
    if (game.turnUsedSkills.includes(`${player}-${skillId}`)) return false;
    
    if (char.id === 3 && skillId === 1 && playerState.premonitionDisabled) {
        game.logs.push(`五更的【预兆】本回合禁用！`);
        return false;
    }
    
    if (char.id === 4 && skillId === 2) {
        if (playerState.thickAccumulationCooldown > 0) {
            game.logs.push(`杏子的【厚积】冷却中！`);
            return false;
        }
    }
    
    playerState.sp -= skill.spCost;
    game.turnUsedSkills.push(`${player}-${skillId}`);
    game.usedSkills.push({ player, skillId, round: game.round });
    
    switch (char.id) {
        case 1:
            executeAliceSkills(game, player, skillId, playerState);
            break;
        case 2:
            executeSiyueSkills(game, player, skillId, playerState, opponentState);
            break;
        case 3:
            executeWugengSkills(game, player, skillId, targetPlayer, playerState);
            break;
        case 4:
            executeXingziSkills(game, player, skillId, playerState);
            break;
    }
    
    return true;
}

function executeAliceSkills(game, player, skillId, playerState) {
    if (skillId === 2) {
        playerState.summons.push({
            type: 'penglai',
            hp: 4,
            def: 0,
            createdRound: game.round,
            explodeRound: game.round + 2
        });
        game.logs.push(`爱丽丝使用了【蓬莱人偶】，召唤了一个人偶！`);
    } else if (skillId === 3) {
        playerState.summons.push({
            type: 'shanghai',
            hp: 4,
            def: 0
        });
        game.logs.push(`爱丽丝使用了【上海人偶】，召唤了一个人偶！`);
    }
}

function executeSiyueSkills(game, player, skillId, playerState, opponentState) {
    if (skillId === 1) {
        playerState.randomBonus += 20;
        playerState.extraAttack = true;
        game.logs.push(`四月使用了【速射装填】，随机数+20！`);
    } else if (skillId === 2) {
        playerState.turnDamageBonus += 2;
        playerState.preciseAimActive = true;
        game.logs.push(`四月使用了【精准瞄准】，本回合伤害+2！`);
    } else if (skillId === 3) {
        playerState.atkBonus += 5;
        opponentState.nextRandomBonus -= 30;
        game.logs.push(`四月使用了【连携突袭】，ATK+5，对方下回合随机数-30！`);
    }
}

function executeWugengSkills(game, player, skillId, targetPlayer, playerState) {
    if (skillId === 1) {
        const target = targetPlayer || (player === 1 ? 2 : 1);
        const targetState = target === 1 ? game.player1 : game.player2;
        targetState.premonitionDuration = 2;
        targetState.premonitionValues = [-15, -5];
        targetState.premonitionTriggered = false;
        playerState.premonitionSource = true;
        playerState.premonitionDisabled = true;
        game.logs.push(`五更使用了【预兆】，对方随机数降低！`);
    } else if (skillId === 2) {
        playerState.randomBonus += 15;
        playerState.buYuActive = true;
        game.logs.push(`五更使用了【不语】，随机数+15！`);
    } else if (skillId === 3) {
        const target = targetPlayer || (player === 1 ? 2 : 1);
        const targetState = target === 1 ? game.player1 : game.player2;
        targetState.revealed = true;
        targetState.revealDuration = 4;
        game.logs.push(`五更使用了【揭示】，对方将持续受到真实伤害！`);
    }
}

function executeXingziSkills(game, player, skillId, playerState) {
    if (skillId === 2) {
        playerState.skipAction = true;
        playerState.damageReduction = 1;
        playerState.doubleRandom = true;
        playerState.thickAccumulationUsedThisRound = true;
        playerState.thickAccumulationCooldown = 2;
        game.logs.push(`杏子使用了【厚积】，本回合跳过行动判定，受到伤害-1！`);
    } else if (skillId === 3) {
        const damage = 2 + playerState.addDamage + (playerState.maxSP - 4);
        dealNormalDamage(game, player === 1 ? 2 : 1, damage, '【定命】');
    }
}

module.exports = {
    useSkill
};
