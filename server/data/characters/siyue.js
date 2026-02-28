module.exports = {
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
};
