const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = new Map();
const games = new Map();

const characters = {
    1: {
        id: 1,
        name: '爱丽丝',
        title: '七色人偶使',
        tag: '召唤，消耗',
        description: '通过召唤物进行辅助作战',
        maxHP: 7,
        atk: 20,
        def: 3,
        maxSP: 6,
        initSP: 1,
        talent: {
            name: '人偶师',
            description: '爱丽丝召唤的所有人偶(HP:4，DEF:0)为爱丽丝分摊50%的伤害(包含普通伤害与真实伤害)(若普通伤害为奇数，则人偶分摊较大部分的伤害)'
        },
        skills: [
            { id: 1, name: '开幕', type: 'passive', timing: 'before', spCost: 0, description: '第一回合开始时召唤一个人偶。回合开始时，场上每存在一个人偶，爱丽丝ATK+8' },
            { id: 2, name: '蓬莱人偶', type: 'active', timing: 'before', spCost: 1, description: '立即召唤1个蓬莱人偶(存在2回合后(包含本回合)在第三个回合开始时自爆并消失，造成1*当前人偶数+2的普通伤害)' },
            { id: 3, name: '上海人偶', type: 'active', timing: 'before', spCost: 2, description: '立即召唤1个上海人偶(若HP未归零则永久存在，每回合开始时对对方造成1*人偶数+1的普通伤害，该人偶判定在蓬莱人偶自爆之前)' }
        ]
    },
    2: {
        id: 2,
        name: '四月',
        title: '灵巧的猎手',
        tag: '先手，削弱',
        description: '通过抢夺行动权获取优势',
        maxHP: 11,
        atk: 30,
        def: 4,
        maxSP: 6,
        initSP: 3,
        talent: {
            name: '本能',
            description: '每次成为进攻方时，立即使自身ATK+2(最多+10)，同时使对方下一回合行动判定随机数-10。'
        },
        skills: [
            { id: 1, name: '速射装填', type: 'active', timing: 'before', spCost: 2, description: '本回合行动判定随机数+20。若本回合成为进攻方，额外进行一次独立攻击(重复一次攻击方行动与防守方行动)。' },
            { id: 2, name: '精准瞄准', type: 'active', timing: 'middle', spCost: 3, description: '本回合造成伤害+2，本回合内若攻击命中，永久使敌方DEF-1。' },
            { id: 3, name: '连携突袭', type: 'active', timing: 'all', spCost: 5, description: '立即获得1次行动权。行动时ATK+5，且使对方下回合行动判定随机数-30。' }
        ]
    },
    3: {
        id: 3,
        name: '五更',
        title: '厄运黑猫',
        tag: '生存，回转',
        description: '利用快速的技能恢复扩大优势',
        maxHP: 10,
        atk: 30,
        def: 3,
        maxSP: 8,
        initSP: 2,
        talent: {
            name: '夜行',
            description: '奇数回合自身ATK+5，偶数回合自身造成的普通伤害+1。'
        },
        skills: [
            { id: 1, name: '预兆', type: 'active', timing: 'before', spCost: 2, description: '指定1名角色，使其本回合随机数-15，下回合随机数-5。若本回合或下回合对方成为防守方，立即使自身SP+1，本回合及下回合通过这种方式总共至多增加一次SP。' },
            { id: 2, name: '不语', type: 'active', timing: 'before', spCost: 3, description: '本回合行动判定随机数+15，若本回合我方成为进攻方，立刻获得4SP；若本回合我方成为防守方，自身DEF+1，该效果持续到本回合结束。' },
            { id: 3, name: '揭示', type: 'active', timing: 'all', spCost: 7, description: '指定一名角色，自本回合开始，每回合结束时受到1真实伤害，持续4回合。' }
        ]
    },
    4: {
        id: 4,
        name: '杏子',
        title: '无拘算命师',
        tag: '爆发',
        description: '听天由命，伺机行动',
        maxHP: 6,
        atk: 15,
        def: 5,
        maxSP: 6,
        initSP: 0,
        talent: {
            name: '走险',
            description: '若闪避判定成功，自身SP+1。'
        },
        skills: [
            { id: 1, name: '度算', type: 'passive', timing: 'before', spCost: 0, description: '自身按不同的行动值大小获得不同增益：行动判定点数1--70，ATK永久+3（最多+15）；行动判定点数71--150，立即使自身SP+1,SP上限+1（通过这种方式SP上限最多+5）；行动判定点数151以上，对人造成的普通伤害+1（无上限）。' },
            { id: 2, name: '厚积', type: 'active', timing: 'before', spCost: 1, description: '使本回合双方在本回合【前】技能释放步骤结束后跳过本回合的行动值比拼步骤，直接使对方成为进攻方，我方成为防守方。本回合我方受到的普通伤害-1。下一回合的行动值比拼步骤的我方的随机数取2次，取大的那一个作为本回合行动值比拼步骤中我方的随机数。本回合进行一技能判定时，行动判定点数的值改为本回合所取得两个随机数相加再加上我方当前的ATK。（若该技能在本回合释放后下回合禁用）' },
            { id: 3, name: '定命', type: 'active', timing: 'before', spCost: 7, description: '指定一名角色，立刻造成大量伤害：2+增伤+(自身SP上限-4)。增伤：角色通过自身技能或特殊道具获得的另一种数值，与普通伤害叠加，向对手造成更大打击。公式：最终伤害=普通伤害+增伤，增伤效果在闪避判定之前计算。' }
        ]
    }
};

function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function validateRoomCode(code) {
    return /^[A-Za-z0-9]{6,8}$/.test(code);
}

function validateUsername(name) {
    return /^[A-Za-z0-9]{1,10}$/.test(name);
}

function createPlayerState(characterId) {
    const char = characters[characterId];
    return {
        characterId: characterId,
        hp: char.maxHP,
        maxHP: char.maxHP,
        atk: char.atk,
        baseAtk: char.atk,
        def: char.def,
        baseDef: char.def,
        sp: char.initSP,
        maxSP: char.maxSP,
        atkBonus: 0,
        defBonus: 0,
        turnDamageBonus: 0,
        permanentDamageBonus: 0,
        addDamage: 0,
        randomBonus: 0,
        nextRandomBonus: 0,
        extraAttack: false,
        skipAction: false,
        damageReduction: 0,
        doubleRandom: false,
        thickAccumulationCooldown: 0,
        thickAccumulationUsedThisRound: false,
        talentAtkBonus: 0,
        revealed: false,
        revealDuration: 0,
        premonitionTarget: null,
        premonitionDuration: 0,
        premonitionValues: [],
        premonitionTriggered: false,
        buYuActive: false,
        buYuDefBonus: 0,
        summonedDolls: [],
        summons: [],
        confirmed: false,
        preciseAimActive: false,
        premonitionDisabled: false
    };
}

function createGameState(player1CharId, player2CharId) {
    return {
        round: 1,
        phase: 'roundStart',
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

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateDamage(randomNum) {
    if (randomNum <= 2) return 0;
    if (randomNum <= 4) return 2;
    if (randomNum <= 6) return 3;
    if (randomNum <= 8) return 4;
    return 6;
}

function calculateDodgeReduction(randomNum) {
    if (randomNum <= 4) return 0;
    if (randomNum <= 6) return 2;
    if (randomNum <= 8) return 3;
    return 4;
}

function clearDeadSummons(playerState) {
    playerState.summonedDolls = playerState.summonedDolls.filter(s => s.hp > 0);
    playerState.summons = playerState.summons.filter(s => s.hp > 0);
}

function resetTurnBuffs(playerState) {
    playerState.turnDamageBonus = 0;
    playerState.preciseAimActive = false;
    playerState.damageReduction = 0;
    playerState.buYuActive = false;
    
    if (playerState.buYuDefBonus > 0) {
        playerState.defBonus -= playerState.buYuDefBonus;
        playerState.buYuDefBonus = 0;
    }
    
    if (playerState.characterId === 3) {
        playerState.atkBonus = playerState.talentAtkBonus;
    }
}

function processPassiveSkills(game, player) {
    const playerState = player === 1 ? game.player1 : game.player2;
    const char = characters[playerState.characterId];
    
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
    const char = characters[playerState.characterId];
    
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

function useSkill(game, player, skillId, targetPlayer) {
    const playerState = player === 1 ? game.player1 : game.player2;
    const opponentState = player === 1 ? game.player2 : game.player1;
    const char = characters[playerState.characterId];
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
            break;
            
        case 2:
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
            break;
            
        case 3:
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
            break;
            
        case 4:
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
            break;
    }
    
    return true;
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
    
    game.logs.push(`行动值比拼：玩家1(${game.actionValue1}) vs 玩家2(${game.actionValue2})`);
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
    const defenderState = game.defender === 1 ? game.player1 : game.player2;
    
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

function broadcastToRoom(room, data) {
    if (room.host && room.host.readyState === WebSocket.OPEN) {
        room.host.send(JSON.stringify(data));
    }
    if (room.guest && room.guest.readyState === WebSocket.OPEN) {
        room.guest.send(JSON.stringify(data));
    }
}

function advancePhase(room, game) {
    if (game.gameEnded) return;
    
    const phases = ['roundStart', 'summonAction', 'beforeSkill', 'actionCompare', 'attackerAction', 'defenderAction', 'settlement', 'afterSkill', 'roundEnd'];
    const currentIndex = phases.indexOf(game.phase);
    
    game.player1.confirmed = false;
    game.player2.confirmed = false;
    
    if (currentIndex < phases.length - 1) {
        game.phase = phases[currentIndex + 1];
        
        switch (game.phase) {
            case 'summonAction':
                processShanghaiDolls(game, 1);
                processShanghaiDolls(game, 2);
                processPenglaiDolls(game, 1);
                processPenglaiDolls(game, 2);
                clearDeadSummons(game.player1);
                clearDeadSummons(game.player2);
                
                const result1 = checkGameEnd(game);
                if (result1.ended) {
                    game.gameEnded = true;
                    game.winner = result1.winner;
                    broadcastToRoom(room, {
                        type: 'gameEnd',
                        winner: result1.winner,
                        gameState: game
                    });
                    return;
                }
                break;
                
            case 'beforeSkill':
                resetTurnBuffs(game.player1);
                resetTurnBuffs(game.player2);
                
                processPassiveSkills(game, 1);
                processPassiveSkills(game, 2);
                processTalent(game, 1, 'roundStart');
                processTalent(game, 2, 'roundStart');
                break;
                
            case 'actionCompare':
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
                break;
                
            case 'attackerAction':
                break;
                
            case 'defenderAction':
                break;
                
            case 'settlement':
                if (game.pendingDamage > 0 || game.baseDamage > 0) {
                    const damage = game.pendingDamage || game.baseDamage;
                    applyDamage(game, damage, game.pendingDodgeReduction);
                    game.pendingDamage = 0;
                    game.pendingDodgeReduction = 0;
                }
                
                const result2 = checkGameEnd(game);
                if (result2.ended) {
                    game.gameEnded = true;
                    game.winner = result2.winner;
                    broadcastToRoom(room, {
                        type: 'gameEnd',
                        winner: result2.winner,
                        gameState: game
                    });
                    return;
                }
                break;
                
            case 'afterSkill':
                break;
                
            case 'roundEnd':
                game.player1.sp = Math.min(game.player1.sp + 1, game.player1.maxSP);
                game.player2.sp = Math.min(game.player2.sp + 1, game.player2.maxSP);
                game.logs.push(`回合结束，双方SP+1。`);
                
                processRevealDamage(game, 1);
                processRevealDamage(game, 2);
                
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
                
                const result3 = checkGameEnd(game);
                if (result3.ended) {
                    game.gameEnded = true;
                    game.winner = result3.winner;
                    broadcastToRoom(room, {
                        type: 'gameEnd',
                        winner: result3.winner,
                        gameState: game
                    });
                    return;
                }
                break;
        }
        
        broadcastToRoom(room, {
            type: 'phaseChange',
            gameState: game
        });
        
        if (game.phase === 'roundStart' || game.phase === 'summonAction' ||
            game.phase === 'actionCompare' || game.phase === 'settlement' || 
            game.phase === 'roundEnd') {
            setTimeout(() => {
                advancePhase(room, game);
            }, 2000);
        }
    } else {
        game.round++;
        game.turnUsedSkills = [];
        game.attacker = null;
        game.defender = null;
        game.phase = 'roundStart';
        
        game.logs.push(`第${game.round}回合开始！`);
        
        broadcastToRoom(room, {
            type: 'phaseChange',
            gameState: game
        });
        
        setTimeout(() => {
            advancePhase(room, game);
        }, 2000);
    }
}

wss.on('connection', (ws) => {
    console.log('新客户端连接');
    
    ws.userId = generateUserId();
    ws.username = 'player1';
    ws.currentRoom = null;
    ws.selectedCharacter = null;
    ws.ready = false;
    
    ws.send(JSON.stringify({
        type: 'connected',
        userId: ws.userId,
        username: ws.username
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (e) {
            console.error('消息解析错误:', e);
        }
    });
    
    ws.on('close', () => {
        console.log('客户端断开连接');
        if (ws.currentRoom && rooms.has(ws.currentRoom)) {
            const room = rooms.get(ws.currentRoom);
            if (room.host === ws) {
                if (room.guest) {
                    room.guest.send(JSON.stringify({ type: 'roomClosed' }));
                }
                rooms.delete(ws.currentRoom);
                games.delete(ws.currentRoom);
            } else {
                room.guest = null;
                room.guestReady = false;
                room.guestCharacter = null;
                if (room.host) {
                    room.host.send(JSON.stringify({
                        type: 'playerLeft',
                        username: ws.username
                    }));
                }
            }
        }
    });
});

function handleMessage(ws, data) {
    switch (data.type) {
        case 'updateUserInfo':
            if (data.username && validateUsername(data.username)) {
                ws.username = data.username;
            }
            if (data.userId && data.userId.length === 12) {
                ws.userId = data.userId;
            }
            ws.send(JSON.stringify({
                type: 'userInfoUpdated',
                username: ws.username,
                userId: ws.userId
            }));
            break;
            
        case 'createRoom':
            if (!validateRoomCode(data.roomCode)) {
                ws.send(JSON.stringify({ type: 'error', message: '房间码格式不正确' }));
                return;
            }
            if (rooms.has(data.roomCode)) {
                ws.send(JSON.stringify({ type: 'error', message: '房间已存在' }));
                return;
            }
            rooms.set(data.roomCode, {
                host: ws,
                guest: null,
                roomCode: data.roomCode,
                mode: data.mode || '1v1',
                gameLog: [],
                hostReady: false,
                guestReady: false,
                hostCharacter: null,
                guestCharacter: null
            });
            ws.currentRoom = data.roomCode;
            ws.send(JSON.stringify({
                type: 'roomCreated',
                roomCode: data.roomCode,
                isHost: true
            }));
            break;
            
        case 'joinRoom':
            if (!rooms.has(data.roomCode)) {
                ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
                return;
            }
            const room = rooms.get(data.roomCode);
            if (room.guest) {
                ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
                return;
            }
            room.guest = ws;
            ws.currentRoom = data.roomCode;
            ws.send(JSON.stringify({
                type: 'roomJoined',
                roomCode: data.roomCode,
                isHost: false
            }));
            room.host.send(JSON.stringify({
                type: 'playerJoined',
                username: ws.username,
                userId: ws.userId
            }));
            break;
            
        case 'getRoomInfo':
            if (ws.currentRoom && rooms.has(ws.currentRoom)) {
                const room = rooms.get(ws.currentRoom);
                const players = [{
                    username: room.host.username,
                    userId: room.host.userId,
                    isHost: true
                }];
                if (room.guest) {
                    players.push({
                        username: room.guest.username,
                        userId: room.guest.userId,
                        isHost: false
                    });
                }
                ws.send(JSON.stringify({
                    type: 'roomInfo',
                    roomCode: room.roomCode,
                    mode: room.mode,
                    players: players,
                    gameLog: room.gameLog
                }));
            }
            break;
            
        case 'challenge':
            if (ws.currentRoom && rooms.has(ws.currentRoom)) {
                const room = rooms.get(ws.currentRoom);
                const target = room.host === ws ? room.guest : room.host;
                if (target) {
                    target.send(JSON.stringify({
                        type: 'challengeRequest',
                        from: ws.username
                    }));
                }
            }
            break;
            
        case 'acceptChallenge':
            if (ws.currentRoom && rooms.has(ws.currentRoom)) {
                const room = rooms.get(ws.currentRoom);
                room.hostReady = false;
                room.guestReady = false;
                room.hostCharacter = null;
                room.guestCharacter = null;
                room.host.send(JSON.stringify({ type: 'gameStart', playerNumber: 1 }));
                room.guest.send(JSON.stringify({ type: 'gameStart', playerNumber: 2 }));
            }
            break;
            
        case 'selectCharacter':
            if (ws.currentRoom && rooms.has(ws.currentRoom)) {
                const room = rooms.get(ws.currentRoom);
                const isHost = room.host === ws;
                
                if (isHost) {
                    room.hostCharacter = data.characterId;
                    room.hostReady = data.ready;
                } else {
                    room.guestCharacter = data.characterId;
                    room.guestReady = data.ready;
                }
                
                const other = isHost ? room.guest : room.host;
                if (other) {
                    other.send(JSON.stringify({
                        type: 'opponentSelected',
                        characterId: data.characterId,
                        ready: data.ready
                    }));
                }
                
                if (room.hostReady && room.guestReady && room.hostCharacter && room.guestCharacter) {
                    const hostChar = characters[room.hostCharacter];
                    const guestChar = characters[room.guestCharacter];
                    
                    room.host.send(JSON.stringify({
                        type: 'bothReady',
                        player1Name: room.host.username,
                        player2Name: room.guest.username,
                        player1Char: `${hostChar.name}——${hostChar.title}`,
                        player2Char: `${guestChar.name}——${guestChar.title}`
                    }));
                    room.guest.send(JSON.stringify({
                        type: 'bothReady',
                        player1Name: room.host.username,
                        player2Name: room.guest.username,
                        player1Char: `${hostChar.name}——${hostChar.title}`,
                        player2Char: `${guestChar.name}——${guestChar.title}`
                    }));
                    
                    setTimeout(() => {
                        const game = createGameState(room.hostCharacter, room.guestCharacter);
                        games.set(room.roomCode, game);
                        
                        room.host.send(JSON.stringify({
                            type: 'battleStart',
                            gameState: game,
                            playerNumber: 1
                        }));
                        room.guest.send(JSON.stringify({
                            type: 'battleStart',
                            gameState: game,
                            playerNumber: 2
                        }));
                        
                        setTimeout(() => {
                            advancePhase(room, game);
                        }, 1000);
                    }, 5000);
                }
            }
            break;
            
        case 'useSkill':
            if (ws.currentRoom && games.has(ws.currentRoom)) {
                const game = games.get(ws.currentRoom);
                const room = rooms.get(ws.currentRoom);
                const playerNumber = room.host === ws ? 1 : 2;
                
                if (game.gameEnded) return;
                
                if (useSkill(game, playerNumber, data.skillId, data.targetPlayer)) {
                    const result = checkGameEnd(game);
                    if (result.ended) {
                        game.gameEnded = true;
                        game.winner = result.winner;
                        broadcastToRoom(room, {
                            type: 'gameEnd',
                            winner: result.winner,
                            gameState: game
                        });
                        return;
                    }
                    
                    broadcastToRoom(room, {
                        type: 'gameUpdate',
                        gameState: game
                    });
                }
            }
            break;
            
        case 'confirmAction':
            if (ws.currentRoom && games.has(ws.currentRoom)) {
                const game = games.get(ws.currentRoom);
                const room = rooms.get(ws.currentRoom);
                const playerNumber = room.host === ws ? 1 : 2;
                
                if (game.gameEnded) return;
                
                const playerState = playerNumber === 1 ? game.player1 : game.player2;
                playerState.confirmed = true;
                
                if (game.phase === 'beforeSkill' || game.phase === 'afterSkill') {
                    if (game.player1.confirmed && game.player2.confirmed) {
                        advancePhase(room, game);
                    }
                } else if (game.phase === 'attackerAction' && game.attacker === playerNumber) {
                    const damage = processAttack(game);
                    game.pendingDamage = damage;
                    
                    advancePhase(room, game);
                } else if (game.phase === 'defenderAction' && game.defender === playerNumber) {
                    const defenseResult = processDefense(game, game.pendingDamage);
                    game.pendingDamage = defenseResult.damage;
                    game.pendingDodgeReduction = defenseResult.reduction;
                    
                    const attackerState = game.attacker === 1 ? game.player1 : game.player2;
                    if (attackerState.extraAttack) {
                        game.logs.push('额外攻击！准备进行！');
                        attackerState.extraAttack = false;
                        game.extraAttackPending = true;
                    }
                    
                    broadcastToRoom(room, {
                        type: 'phaseChange',
                        gameState: game
                    });
                    
                    setTimeout(() => {
                        advancePhase(room, game);
                    }, 2000);
                }
            }
            break;
            
        case 'leaveRoom':
            if (ws.currentRoom && rooms.has(ws.currentRoom)) {
                const room = rooms.get(ws.currentRoom);
                if (room.host === ws) {
                    if (room.guest) {
                        room.guest.send(JSON.stringify({ type: 'roomClosed' }));
                    }
                    rooms.delete(ws.currentRoom);
                    games.delete(ws.currentRoom);
                } else {
                    room.guest = null;
                    room.guestReady = false;
                    room.guestCharacter = null;
                    room.host.send(JSON.stringify({
                        type: 'playerLeft',
                        username: ws.username
                    }));
                }
                ws.currentRoom = null;
                ws.send(JSON.stringify({ type: 'leftRoom' }));
            }
            break;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});
