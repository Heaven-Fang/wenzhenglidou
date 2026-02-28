const alice = require('./alice');
const siyue = require('./siyue');
const wugeng = require('./wugeng');
const xingzi = require('./xingzi');

const characters = {
    [alice.id]: alice,
    [siyue.id]: siyue,
    [wugeng.id]: wugeng,
    [xingzi.id]: xingzi
};

function getCharacterById(id) {
    return characters[id];
}

function getAllCharacters() {
    return Object.values(characters);
}

function getCharacterList() {
    return getAllCharacters().map(char => ({
        id: char.id,
        name: char.name,
        title: char.title,
        tag: char.tag,
        description: char.description,
        maxHP: char.maxHP,
        atk: char.atk,
        def: char.def,
        maxSP: char.maxSP,
        initSP: char.initSP,
        talent: char.talent,
        skills: char.skills
    }));
}

module.exports = {
    characters,
    getCharacterById,
    getAllCharacters,
    getCharacterList
};
