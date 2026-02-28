const { ROOM_CODE_LENGTH, USERNAME_MAX_LENGTH, USER_ID_LENGTH } = require('../config/constants');

function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < USER_ID_LENGTH; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function validateRoomCode(code) {
    const pattern = `^[A-Za-z0-9]{${ROOM_CODE_LENGTH.min},${ROOM_CODE_LENGTH.max}}$`;
    return new RegExp(pattern).test(code);
}

function validateUsername(name) {
    const pattern = `^[A-Za-z0-9]{1,${USERNAME_MAX_LENGTH}}$`;
    return new RegExp(pattern).test(name);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    generateUserId,
    validateRoomCode,
    validateUsername,
    getRandomInt
};
