const buffDefinitions = {
    atkBoost: {
        id: 'atkBoost',
        name: '攻击强化',
        description: '攻击力提升',
        type: 'stat',
        stat: 'atk',
        stackable: true,
        maxStacks: 10,
        duration: -1,
        onApply: (player, value) => {
            player.atkBonus += value;
        },
        onRemove: (player, value) => {
            player.atkBonus -= value;
        }
    },
    
    atkBoostTemp: {
        id: 'atkBoostTemp',
        name: '临时攻击强化',
        description: '本回合攻击力提升',
        type: 'stat',
        stat: 'atk',
        stackable: true,
        maxStacks: 10,
        duration: 1,
        onApply: (player, value) => {
            player.atkBonus += value;
        },
        onRemove: (player, value) => {
            player.atkBonus -= value;
        }
    },
    
    defBoost: {
        id: 'defBoost',
        name: '防御强化',
        description: '防御力提升',
        type: 'stat',
        stat: 'def',
        stackable: true,
        maxStacks: 10,
        duration: -1,
        onApply: (player, value) => {
            player.defBonus += value;
        },
        onRemove: (player, value) => {
            player.defBonus -= value;
        }
    },
    
    defBoostTemp: {
        id: 'defBoostTemp',
        name: '临时防御强化',
        description: '本回合防御力提升',
        type: 'stat',
        stat: 'def',
        stackable: true,
        maxStacks: 10,
        duration: 1,
        onApply: (player, value) => {
            player.defBonus += value;
        },
        onRemove: (player, value) => {
            player.defBonus -= value;
        }
    },
    
    defReduction: {
        id: 'defReduction',
        name: '防御削弱',
        description: '防御力降低',
        type: 'stat',
        stat: 'def',
        stackable: true,
        maxStacks: 10,
        duration: -1,
        onApply: (player, value) => {
            player.defBonus -= value;
        },
        onRemove: (player, value) => {
            player.defBonus += value;
        }
    },
    
    damageBoost: {
        id: 'damageBoost',
        name: '伤害强化',
        description: '造成的普通伤害提升',
        type: 'damage',
        stackable: true,
        maxStacks: 99,
        duration: 1,
        onApply: (player, value) => {
            player.damageBonus = (player.damageBonus || 0) + value;
        },
        onRemove: (player, value) => {
            player.damageBonus = (player.damageBonus || 0) - value;
        }
    },
    
    damageReduction: {
        id: 'damageReduction',
        name: '伤害减免',
        description: '受到的普通伤害减少',
        type: 'defense',
        stackable: true,
        maxStacks: 99,
        duration: 1,
        onApply: (player, value) => {
            player.damageReduction = (player.damageReduction || 0) + value;
        },
        onRemove: (player, value) => {
            player.damageReduction = (player.damageReduction || 0) - value;
        }
    },
    
    randomBoost: {
        id: 'randomBoost',
        name: '行动值加成',
        description: '行动判定随机数增加',
        type: 'action',
        stackable: true,
        maxStacks: 99,
        duration: 1,
        onApply: (player, value) => {
            player.randomBonus = (player.randomBonus || 0) + value;
        },
        onRemove: (player, value) => {
            player.randomBonus = (player.randomBonus || 0) - value;
        }
    },
    
    randomReduction: {
        id: 'randomReduction',
        name: '行动值削弱',
        description: '行动判定随机数减少',
        type: 'action',
        stackable: true,
        maxStacks: 99,
        duration: -1,
        onApply: (player, value) => {
            player.randomReduction = (player.randomReduction || 0) + value;
        },
        onRemove: (player, value) => {
            player.randomReduction = (player.randomReduction || 0) - value;
        }
    },
    
    randomReductionTemp: {
        id: 'randomReductionTemp',
        name: '临时行动值削弱',
        description: '本回合行动判定随机数减少',
        type: 'action',
        stackable: true,
        maxStacks: 99,
        duration: 1,
        onApply: (player, value) => {
            player.randomReduction = (player.randomReduction || 0) + value;
        },
        onRemove: (player, value) => {
            player.randomReduction = (player.randomReduction || 0) - value;
        }
    },
    
    revealDamage: {
        id: 'revealDamage',
        name: '揭示',
        description: '回合结束时受到真实伤害',
        type: 'dot',
        stackable: true,
        maxStacks: 99,
        duration: 4,
        onRoundEnd: (player, value, game) => {
            const { dealTrueDamage } = require('../../game/DamageCalculator');
            dealTrueDamage(game, player, value, '揭示效果');
        }
    },
    
    skipAction: {
        id: 'skipAction',
        name: '跳过行动',
        description: '跳过行动值比拼阶段',
        type: 'special',
        stackable: false,
        duration: 1,
        onApply: (player) => {
            player.skipAction = true;
        },
        onRemove: (player) => {
            player.skipAction = false;
        }
    },
    
    extraAttack: {
        id: 'extraAttack',
        name: '额外攻击',
        description: '进行额外一次攻击',
        type: 'special',
        stackable: false,
        duration: 1,
        onApply: (player) => {
            player.extraAttack = true;
        },
        onRemove: (player) => {
            player.extraAttack = false;
        }
    },
    
    spBoost: {
        id: 'spBoost',
        name: 'SP上限提升',
        description: 'SP上限增加',
        type: 'stat',
        stackable: true,
        maxStacks: 5,
        duration: -1,
        onApply: (player, value) => {
            player.maxSP += value;
        },
        onRemove: (player, value) => {
            player.maxSP -= value;
        }
    },
    
    spGain: {
        id: 'spGain',
        name: 'SP获取',
        description: '立即获得SP',
        type: 'instant',
        stackable: false,
        duration: 0,
        onApply: (player, value) => {
            player.sp = Math.min(player.sp + value, player.maxSP);
        }
    },
    
    dodgeSpGain: {
        id: 'dodgeSpGain',
        name: '闪避SP获取',
        description: '闪避成功时获得SP',
        type: 'trigger',
        trigger: 'onDodgeSuccess',
        stackable: false,
        duration: -1,
        onTrigger: (player, value) => {
            player.sp = Math.min(player.sp + value, player.maxSP);
        }
    }
};

function getBuffById(buffId) {
    return buffDefinitions[buffId];
}

function getAllBuffs() {
    return buffDefinitions;
}

module.exports = {
    buffDefinitions,
    getBuffById,
    getAllBuffs
};
