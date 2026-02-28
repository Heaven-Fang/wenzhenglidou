module.exports = {
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
};
