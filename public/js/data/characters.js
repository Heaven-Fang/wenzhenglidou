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

function getCharacterById(id) {
    return characters[id];
}

function getAllCharacters() {
    return Object.values(characters);
}

window.CharacterData = {
    characters,
    getCharacterById,
    getAllCharacters
};
