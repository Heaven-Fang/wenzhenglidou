module.exports = {
    PORT: process.env.PORT || 3000,
    HOST: '0.0.0.0',
    
    PHASE_DELAY: 2000,
    COUNTDOWN_DELAY: 5000,
    
    MAX_ROUNDS: 11,
    
    ROOM_CODE_LENGTH: { min: 6, max: 8 },
    USERNAME_MAX_LENGTH: 10,
    USER_ID_LENGTH: 12,
    
    DAMAGE_TABLE: {
        1: 0, 2: 0,
        3: 2, 4: 2,
        5: 3, 6: 3,
        7: 4, 8: 4,
        9: 6
    },
    
    DODGE_REDUCTION_TABLE: {
        1: 0, 2: 0, 3: 0, 4: 0,
        5: 2, 6: 2,
        7: 3, 8: 3,
        9: 4
    },
    
    PHASES: [
        'roundStart',
        'summonAction', 
        'beforeSkill',
        'actionCompare',
        'attackerAction',
        'defenderAction',
        'settlement',
        'afterSkill',
        'roundEnd'
    ]
};
