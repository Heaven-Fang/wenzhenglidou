const { generateUserId, validateRoomCode, validateUsername } = require('../utils/helpers');
const { createGameState, checkGameEnd } = require('../models/GameState');
const { getCharacterById, getCharacterList } = require('../data/characters');
const { useSkill } = require('../game/SkillExecutor');
const { advancePhase } = require('../game/PhaseManager');
const { processAttack, processDefense } = require('../game/BattleManager');
const { PHASE_DELAY, COUNTDOWN_DELAY } = require('../config/constants');

const rooms = new Map();
const games = new Map();

function handleMessage(ws, data, broadcastCallback) {
    switch (data.type) {
        case 'updateUserInfo':
            handleUpdateUserInfo(ws, data);
            break;
        case 'createRoom':
            handleCreateRoom(ws, data);
            break;
        case 'joinRoom':
            handleJoinRoom(ws, data, broadcastCallback);
            break;
        case 'getRoomInfo':
            handleGetRoomInfo(ws);
            break;
        case 'challenge':
            handleChallenge(ws, broadcastCallback);
            break;
        case 'acceptChallenge':
            handleAcceptChallenge(ws, broadcastCallback);
            break;
        case 'selectCharacter':
            handleSelectCharacter(ws, data, broadcastCallback);
            break;
        case 'useSkill':
            handleUseSkill(ws, data, broadcastCallback);
            break;
        case 'confirmAction':
            handleConfirmAction(ws, data, broadcastCallback);
            break;
        case 'leaveRoom':
            handleLeaveRoom(ws, broadcastCallback);
            break;
    }
}

function handleUpdateUserInfo(ws, data) {
    if (data.username && validateUsername(data.username)) {
        ws.username = data.username;
    }
    if (data.userId && data.userId.length === 12) {
        ws.userId = data.userId;
    }
    ws.send(JSON.stringify({
        type: 'userInfoUpdated',
        username: ws.username,
        userId: ws.userId
    }));
}

function handleCreateRoom(ws, data) {
    if (!validateRoomCode(data.roomCode)) {
        ws.send(JSON.stringify({ type: 'error', message: '房间码格式不正确' }));
        return;
    }
    if (rooms.has(data.roomCode)) {
        ws.send(JSON.stringify({ type: 'error', message: '房间已存在' }));
        return;
    }
    rooms.set(data.roomCode, {
        host: ws,
        guest: null,
        roomCode: data.roomCode,
        mode: data.mode || '1v1',
        gameLog: [],
        hostReady: false,
        guestReady: false,
        hostCharacter: null,
        guestCharacter: null
    });
    ws.currentRoom = data.roomCode;
    ws.send(JSON.stringify({
        type: 'roomCreated',
        roomCode: data.roomCode,
        isHost: true
    }));
}

function handleJoinRoom(ws, data, broadcastCallback) {
    if (!rooms.has(data.roomCode)) {
        ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
        return;
    }
    const room = rooms.get(data.roomCode);
    if (room.guest) {
        ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
        return;
    }
    room.guest = ws;
    ws.currentRoom = data.roomCode;
    ws.send(JSON.stringify({
        type: 'roomJoined',
        roomCode: data.roomCode,
        isHost: false
    }));
    broadcastCallback(room, {
        type: 'playerJoined',
        username: ws.username,
        userId: ws.userId
    }, room.host);
}

function handleGetRoomInfo(ws) {
    if (ws.currentRoom && rooms.has(ws.currentRoom)) {
        const room = rooms.get(ws.currentRoom);
        const players = [{
            username: room.host.username,
            userId: room.host.userId,
            isHost: true
        }];
        if (room.guest) {
            players.push({
                username: room.guest.username,
                userId: room.guest.userId,
                isHost: false
            });
        }
        ws.send(JSON.stringify({
            type: 'roomInfo',
            roomCode: room.roomCode,
            mode: room.mode,
            players: players,
            gameLog: room.gameLog
        }));
    }
}

function handleChallenge(ws, broadcastCallback) {
    if (ws.currentRoom && rooms.has(ws.currentRoom)) {
        const room = rooms.get(ws.currentRoom);
        const target = room.host === ws ? room.guest : room.host;
        if (target) {
            broadcastCallback(room, {
                type: 'challengeRequest',
                from: ws.username
            }, target);
        }
    }
}

function handleAcceptChallenge(ws, broadcastCallback) {
    if (ws.currentRoom && rooms.has(ws.currentRoom)) {
        const room = rooms.get(ws.currentRoom);
        room.hostReady = false;
        room.guestReady = false;
        room.hostCharacter = null;
        room.guestCharacter = null;
        
        broadcastCallback(room, { type: 'gameStart', playerNumber: 1 }, room.host);
        broadcastCallback(room, { type: 'gameStart', playerNumber: 2 }, room.guest);
    }
}

function handleSelectCharacter(ws, data, broadcastCallback) {
    if (ws.currentRoom && rooms.has(ws.currentRoom)) {
        const room = rooms.get(ws.currentRoom);
        const isHost = room.host === ws;
        
        if (isHost) {
            room.hostCharacter = data.characterId;
            room.hostReady = data.ready;
        } else {
            room.guestCharacter = data.characterId;
            room.guestReady = data.ready;
        }
        
        const other = isHost ? room.guest : room.host;
        if (other) {
            broadcastCallback(room, {
                type: 'opponentSelected',
                characterId: data.characterId,
                ready: data.ready
            }, other);
        }
        
        if (room.hostReady && room.guestReady && room.hostCharacter && room.guestCharacter) {
            startGame(room, broadcastCallback);
        }
    }
}

function startGame(room, broadcastCallback) {
    const hostChar = getCharacterById(room.hostCharacter);
    const guestChar = getCharacterById(room.guestCharacter);
    
    broadcastCallback(room, {
        type: 'bothReady',
        player1Name: room.host.username,
        player2Name: room.guest.username,
        player1Char: `${hostChar.name}——${hostChar.title}`,
        player2Char: `${guestChar.name}——${guestChar.title}`
    });
    
    setTimeout(() => {
        const game = createGameState(room.hostCharacter, room.guestCharacter);
        games.set(room.roomCode, game);
        
        broadcastCallback(room, {
            type: 'battleStart',
            gameState: game,
            playerNumber: 1
        }, room.host);
        
        broadcastCallback(room, {
            type: 'battleStart',
            gameState: game,
            playerNumber: 2
        }, room.guest);
        
        setTimeout(() => {
            advancePhase(room, game, (r, data) => broadcastToRoom(r, data));
        }, 1000);
    }, COUNTDOWN_DELAY);
}

function handleUseSkill(ws, data, broadcastCallback) {
    if (ws.currentRoom && games.has(ws.currentRoom)) {
        const game = games.get(ws.currentRoom);
        const room = rooms.get(ws.currentRoom);
        const playerNumber = room.host === ws ? 1 : 2;
        
        if (game.gameEnded) return;
        
        if (useSkill(game, playerNumber, data.skillId, data.targetPlayer)) {
            const result = checkGameEnd(game);
            if (result.ended) {
                game.gameEnded = true;
                game.winner = result.winner;
                broadcastCallback(room, {
                    type: 'gameEnd',
                    winner: result.winner,
                    gameState: game
                });
                return;
            }
            
            broadcastCallback(room, {
                type: 'gameUpdate',
                gameState: game
            });
        }
    }
}

function handleConfirmAction(ws, data, broadcastCallback) {
    if (ws.currentRoom && games.has(ws.currentRoom)) {
        const game = games.get(ws.currentRoom);
        const room = rooms.get(ws.currentRoom);
        const playerNumber = room.host === ws ? 1 : 2;
        
        if (game.gameEnded) return;
        
        const playerState = playerNumber === 1 ? game.player1 : game.player2;
        playerState.confirmed = true;
        
        if (game.phase === 'beforeSkill' || game.phase === 'afterSkill') {
            if (game.player1.confirmed && game.player2.confirmed) {
                advancePhase(room, game, (r, d) => broadcastToRoom(r, d));
            }
        } else if (game.phase === 'attackerAction' && game.attacker === playerNumber) {
            const damage = processAttack(game);
            game.pendingDamage = damage;
            advancePhase(room, game, (r, d) => broadcastToRoom(r, d));
        } else if (game.phase === 'defenderAction' && game.defender === playerNumber) {
            const defenseResult = processDefense(game, game.pendingDamage);
            game.pendingDamage = defenseResult.damage;
            game.pendingDodgeReduction = defenseResult.reduction;
            
            const attackerState = game.attacker === 1 ? game.player1 : game.player2;
            if (attackerState.extraAttack) {
                game.logs.push('额外攻击！准备进行！');
                attackerState.extraAttack = false;
                game.extraAttackPending = true;
            }
            
            broadcastCallback(room, {
                type: 'phaseChange',
                gameState: game
            });
            
            setTimeout(() => {
                advancePhase(room, game, (r, d) => broadcastToRoom(r, d));
            }, PHASE_DELAY);
        }
    }
}

function handleLeaveRoom(ws, broadcastCallback) {
    if (ws.currentRoom && rooms.has(ws.currentRoom)) {
        const room = rooms.get(ws.currentRoom);
        if (room.host === ws) {
            if (room.guest) {
                broadcastCallback(room, { type: 'roomClosed' }, room.guest);
            }
            rooms.delete(ws.currentRoom);
            games.delete(ws.currentRoom);
        } else {
            room.guest = null;
            room.guestReady = false;
            room.guestCharacter = null;
            broadcastCallback(room, {
                type: 'playerLeft',
                username: ws.username
            }, room.host);
        }
        ws.currentRoom = null;
        ws.send(JSON.stringify({ type: 'leftRoom' }));
    }
}

function broadcastToRoom(room, data, target = null) {
    const message = JSON.stringify(data);
    if (target) {
        if (target.readyState === 1) {
            target.send(message);
        }
    } else {
        if (room.host && room.host.readyState === 1) {
            room.host.send(message);
        }
        if (room.guest && room.guest.readyState === 1) {
            room.guest.send(message);
        }
    }
}

function handleDisconnect(ws, broadcastCallback) {
    if (ws.currentRoom && rooms.has(ws.currentRoom)) {
        const room = rooms.get(ws.currentRoom);
        if (room.host === ws) {
            if (room.guest) {
                broadcastCallback(room, { type: 'roomClosed' }, room.guest);
            }
            rooms.delete(ws.currentRoom);
            games.delete(ws.currentRoom);
        } else {
            room.guest = null;
            room.guestReady = false;
            room.guestCharacter = null;
            if (room.host) {
                broadcastCallback(room, {
                    type: 'playerLeft',
                    username: ws.username
                }, room.host);
            }
        }
    }
}

function getRooms() {
    return rooms;
}

function getGames() {
    return games;
}

module.exports = {
    handleMessage,
    handleDisconnect,
    broadcastToRoom,
    getRooms,
    getGames,
    generateUserId
};
