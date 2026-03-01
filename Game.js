const Game = {
    ws: null,
    userId: '000000000000',
    username: 'player1',
    currentRoom: null,
    isHost: false,
    playerNumber: 1,
    selectedCharacter: null,
    isReady: false,
    gameState: null,
    currentSkillId: null,
    selectedMode: '1v1',
    opponentCharacter: null,
    opponentReady: false,
    
    init() {
        this.connect();
    },
    
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);
        
        this.ws.onopen = () => {
            console.log('WebSocket连接成功');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket连接断开');
            setTimeout(() => {
                if (this.currentRoom) {
                    this.connect();
                }
            }, 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };
    },
    
    handleMessage(data) {
        switch (data.type) {
            case 'connected':
                this.userId = data.userId;
                this.username = data.username;
                UI.updateUserInfo(this.username, this.userId);
                break;
                
            case 'userInfoUpdated':
                this.username = data.username;
                this.userId = data.userId;
                UI.updateUserInfo(this.username, this.userId);
                UI.showToast('用户信息更新成功！');
                UI.showScreen('startScreen');
                break;
                
            case 'roomCreated':
                this.currentRoom = data.roomCode;
                this.isHost = true;
                document.getElementById('currentRoomCode').textContent = data.roomCode;
                UI.showScreen('roomScreen');
                this.requestRoomInfo();
                break;
                
            case 'roomJoined':
                this.currentRoom = data.roomCode;
                this.isHost = false;
                document.getElementById('currentRoomCode').textContent = data.roomCode;
                UI.showScreen('roomScreen');
                this.requestRoomInfo();
                break;
                
            case 'roomInfo':
                UI.updateRoomInfo(data, this.userId);
                break;
                
            case 'playerJoined':
                UI.showToast(`${data.username} 加入了房间！`);
                this.requestRoomInfo();
                break;
                
            case 'playerLeft':
                UI.showToast(`${data.username} 离开了房间`);
                this.requestRoomInfo();
                break;
                
            case 'challengeRequest':
                if (confirm(`${data.from} 向你发起挑战，是否接受？`)) {
                    this.ws.send(JSON.stringify({ type: 'acceptChallenge' }));
                }
                break;
                
            case 'gameStart':
                this.playerNumber = data.playerNumber;
                UI.showScreen('selectScreen');
                UI.initCharacterSelect();
                break;
                
            case 'opponentSelected':
                this.opponentCharacter = data.characterId;
                this.opponentReady = data.ready;
                UI.updateOpponentSelection(data.characterId, data.ready);
                break;
                
            case 'bothReady':
                UI.showCountdown(data.player1Name, data.player2Name, data.player1Char, data.player2Char);
                break;
                
            case 'battleStart':
                this.gameState = data.gameState;
                UI.hideCountdown();
                UI.showScreen('battleScreen');
                UI.updateBattleUI(this.gameState, this.playerNumber);
                break;
                
            case 'gameUpdate':
                this.gameState = data.gameState;
                UI.updateBattleUI(this.gameState, this.playerNumber);
                break;
                
            case 'phaseChange':
                this.gameState = data.gameState;
                UI.updateBattleUI(this.gameState, this.playerNumber);
                UI.highlightPhase();
                break;
                
            case 'gameEnd':
                this.gameState = data.gameState;
                UI.disableAllInteractions();
                UI.updateBattleUI(this.gameState, this.playerNumber);
                UI.showGameResult(data.winner, this.playerNumber);
                break;
                
            case 'roomClosed':
                UI.showToast('房间已关闭');
                this.currentRoom = null;
                UI.showScreen('startScreen');
                break;
                
            case 'leftRoom':
                this.currentRoom = null;
                UI.showScreen('startScreen');
                break;
                
            case 'error':
                UI.showToast(data.message);
                break;
        }
    },
    
    send(data) {
        if (this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(data));
        }
    },
    
    updateUserInfo() {
        const newUsername = document.getElementById('newUsername').value;
        const newUserId = document.getElementById('newUserId').value;
        
        this.send({
            type: 'updateUserInfo',
            username: newUsername || this.username,
            userId: newUserId || this.userId
        });
    },
    
    selectMode(element, mode) {
        if (element.classList.contains('disabled')) return;
        document.querySelectorAll('.mode-option').forEach(e => e.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedMode = mode;
    },
    
    createRoom() {
        const roomCode = document.getElementById('roomCodeInput').value;
        if (!roomCode) {
            UI.showToast('请输入房间码');
            return;
        }
        if (!/^[A-Za-z0-9]{6,8}$/.test(roomCode)) {
            UI.showToast('房间码格式不正确');
            return;
        }
        this.send({
            type: 'createRoom',
            roomCode: roomCode,
            mode: this.selectedMode
        });
    },
    
    joinRoom() {
        const roomCode = document.getElementById('joinRoomCodeInput').value;
        if (!roomCode) {
            UI.showToast('请输入房间码');
            return;
        }
        this.send({
            type: 'joinRoom',
            roomCode: roomCode
        });
    },
    
    requestRoomInfo() {
        this.send({ type: 'getRoomInfo' });
    },
    
    challengePlayer() {
        this.send({ type: 'challenge' });
    },
    
    leaveRoom() {
        this.send({ type: 'leaveRoom' });
    },
    
    selectCharacter(charId) {
        if (this.isReady) return;
        
        this.selectedCharacter = charId;
        
        document.querySelectorAll('.character-item').forEach(item => {
            item.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        UI.showCharacterDetail(charId);
        UI.updateMySelection(charId);
    },
    
    toggleReady() {
        if (!this.selectedCharacter) {
            UI.showToast('请先选择角色');
            return;
        }
        
        this.isReady = !this.isReady;
        UI.updateReadyButton(this.isReady);
        UI.updateMySelection(this.selectedCharacter);
        
        this.send({
            type: 'selectCharacter',
            characterId: this.selectedCharacter,
            ready: this.isReady
        });
    },
    
    showSkillModal(player, skillId) {
        if (player !== this.playerNumber) return;
        
        this.currentSkillId = skillId;
        UI.showSkillModal(player, skillId);
    },
    
    closeSkillModal() {
        UI.closeSkillModal();
        this.currentSkillId = null;
    },
    
    confirmUseSkill() {
        if (this.currentSkillId) {
            this.send({
                type: 'useSkill',
                skillId: this.currentSkillId,
                targetPlayer: this.playerNumber === 1 ? 2 : 1
            });
        }
        this.closeSkillModal();
    },
    
    confirmAction() {
        const btn = document.getElementById('confirmActionBtn');
        btn.disabled = true;
        
        const myPanel = document.getElementById(`player${this.playerNumber}Panel`);
        myPanel.querySelectorAll('.skill-btn').forEach(skillBtn => {
            skillBtn.disabled = true;
        });
        
        this.send({ type: 'confirmAction' });
    },
    
    exitGame() {
        this.send({ type: 'leaveRoom' });
    },
    
    backToRoom() {
        UI.hideResult();
        UI.showScreen('roomScreen');
        this.requestRoomInfo();
    },
    
    showEncyclopedia() {
        UI.showScreen('encyclopediaScreen');
        UI.initEncyclopedia();
    },
    
    showGameManual() {
        UI.showScreen('gameManualScreen');
    }
};

window.Game = Game;

document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
