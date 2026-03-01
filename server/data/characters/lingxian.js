module.exports = {
    id: 5,
    name: '铃仙',
    title: '狂气之兔',
    tag: '回复，打断',
    description: '控制波长，中止对手使用技能',
    maxHP: 7,
    atk: 20,
    def: 3,
    maxSP: 6,
    initSP: 1,
    talent: {
        name: '波长控制',
        description: '爱丽丝召唤的所有人偶(HP:4，DEF:0)为爱丽丝分摊50%的伤害(包含普通伤害与真实伤害)(若普通伤害为奇数，则人偶分摊较大部分的伤害)'
    },
    skills: [
        { id: 1, name: '人里药郎', type: 'active', timing: 'before', spCost: 0, description: '第一回合开始时召唤一个人偶。回合开始时，场上每存在一个人偶，爱丽丝ATK+8' },
        { id: 2, name: '生神停止', type: 'active', timing: 'before', spCost: 1, description: '立即召唤1个蓬莱人偶(存在2回合后(包含本回合)在第三个回合开始时自爆并消失，造成1*当前人偶数+2的普通伤害)' },
        { id: 3, name: '真实之月', type: 'active', timing: 'before', spCost: 2, description: '立即召唤1个上海人偶(若HP未归零则永久存在，每回合开始时对对方造成1*人偶数+1的普通伤害，该人偶判定在蓬莱人偶自爆之前)' }
    ]
};
