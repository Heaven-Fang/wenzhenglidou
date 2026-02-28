const { getCharacterById } = require('../data/characters');

function createPlayerState(characterId) {
    const char = getCharacterById(characterId);
    if (!char) {
        throw new Error(`Character with id ${characterId} not found`);
    }
    
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
        randomReduction: 0,
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
        premonitionDisabled: false,
        buffs: []
    };
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

function clearDeadSummons(playerState) {
    playerState.summonedDolls = playerState.summonedDolls.filter(s => s.hp > 0);
    playerState.summons = playerState.summons.filter(s => s.hp > 0);
}

module.exports = {
    createPlayerState,
    resetTurnBuffs,
    clearDeadSummons
};
