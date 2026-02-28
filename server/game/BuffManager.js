const { getBuffById } = require('../data/buffs');

function createBuffInstance(buffId, value, source = null) {
    const buffDef = getBuffById(buffId);
    if (!buffDef) {
        console.error(`Buff not found: ${buffId}`);
        return null;
    }
    
    return {
        id: buffId,
        name: buffDef.name,
        description: buffDef.description,
        type: buffDef.type,
        value: value,
        duration: buffDef.duration,
        remainingDuration: buffDef.duration,
        source: source,
        stacks: 1
    };
}

function addBuff(player, buffId, value, source = null, game = null) {
    const buffDef = getBuffById(buffId);
    if (!buffDef) {
        console.error(`Buff not found: ${buffId}`);
        return false;
    }
    
    if (!player.buffs) {
        player.buffs = [];
    }
    
    const existingBuff = player.buffs.find(b => b.id === buffId);
    
    if (existingBuff) {
        if (buffDef.stackable) {
            if (existingBuff.stacks < buffDef.maxStacks) {
                existingBuff.stacks++;
                existingBuff.value += value;
                if (buffDef.onApply) {
                    buffDef.onApply(player, value, game);
                }
                return true;
            } else {
                existingBuff.remainingDuration = buffDef.duration;
                return false;
            }
        } else {
            existingBuff.remainingDuration = buffDef.duration;
            return false;
        }
    }
    
    const buffInstance = createBuffInstance(buffId, value, source);
    if (!buffInstance) return false;
    
    player.buffs.push(buffInstance);
    
    if (buffDef.onApply) {
        buffDef.onApply(player, value, game);
    }
    
    return true;
}

function removeBuff(player, buffId, game = null) {
    if (!player.buffs) return false;
    
    const buffIndex = player.buffs.findIndex(b => b.id === buffId);
    if (buffIndex === -1) return false;
    
    const buff = player.buffs[buffIndex];
    const buffDef = getBuffById(buffId);
    
    if (buffDef && buffDef.onRemove) {
        buffDef.onRemove(player, buff.value, game);
    }
    
    player.buffs.splice(buffIndex, 1);
    return true;
}

function removeBuffBySource(player, source, game = null) {
    if (!player.buffs) return;
    
    const buffsToRemove = player.buffs.filter(b => b.source === source);
    for (const buff of buffsToRemove) {
        removeBuff(player, buff.id, game);
    }
}

function tickBuffDurations(player, game = null) {
    if (!player.buffs) return;
    
    const expiredBuffs = [];
    
    for (const buff of player.buffs) {
        if (buff.remainingDuration > 0) {
            buff.remainingDuration--;
            if (buff.remainingDuration === 0) {
                expiredBuffs.push(buff.id);
            }
        }
    }
    
    for (const buffId of expiredBuffs) {
        removeBuff(player, buffId, game);
    }
}

function processRoundEndBuffs(player, game) {
    if (!player.buffs) return;
    
    for (const buff of player.buffs) {
        const buffDef = getBuffById(buff.id);
        if (buffDef && buffDef.onRoundEnd) {
            buffDef.onRoundEnd(player, buff.value, game);
        }
    }
}

function triggerBuff(player, triggerType, game = null) {
    if (!player.buffs) return;
    
    for (const buff of player.buffs) {
        const buffDef = getBuffById(buff.id);
        if (buffDef && buffDef.trigger === triggerType && buffDef.onTrigger) {
            buffDef.onTrigger(player, buff.value, game);
        }
    }
}

function hasBuff(player, buffId) {
    if (!player.buffs) return false;
    return player.buffs.some(b => b.id === buffId);
}

function getBuffValue(player, buffId) {
    if (!player.buffs) return 0;
    const buff = player.buffs.find(b => b.id === buffId);
    return buff ? buff.value : 0;
}

function getBuffStacks(player, buffId) {
    if (!player.buffs) return 0;
    const buff = player.buffs.find(b => b.id === buffId);
    return buff ? buff.stacks : 0;
}

function clearAllBuffs(player, game = null) {
    if (!player.buffs) return;
    
    for (const buff of [...player.buffs]) {
        removeBuff(player, buff.id, game);
    }
}

function getActiveBuffs(player) {
    if (!player.buffs) return [];
    return player.buffs.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        value: b.value,
        stacks: b.stacks,
        remainingDuration: b.remainingDuration
    }));
}

module.exports = {
    createBuffInstance,
    addBuff,
    removeBuff,
    removeBuffBySource,
    tickBuffDurations,
    processRoundEndBuffs,
    triggerBuff,
    hasBuff,
    getBuffValue,
    getBuffStacks,
    clearAllBuffs,
    getActiveBuffs
};
