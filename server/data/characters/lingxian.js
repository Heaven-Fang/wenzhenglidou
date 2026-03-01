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
        description: 'SP不自然回复，仅有铃仙命中对手时SP+1。相邻回合连续命中，SP额外+1。'
    },
    skills: [
        { id: 1, name: '人里药郎', type: 'active', timing: 'before', spCost: 0, description: '降低SP获得HP。' },
        { id: 2, name: '生神停止', type: 'active', timing: 'before', spCost: 1, description: '在对方使用瞬间技能后，自己可立刻取消对方技能。使用技能瞬间清空自身负面buff。（整局游戏仅可触发2次）' },
        { id: 3, name: '真实之月', type: 'active', timing: 'before', spCost: 2, description: '消耗自身HP，对对方造成大量真实伤害。' }
    ]
};
