const UI = {
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },
    
    updateUserInfo(username, userId) {
        document.getElementById('displayUsername').textContent = username;
        document.getElementById('displayUserId').textContent = userId;
        document.getElementById('oldUsername').value = username;
        document.getElementById('oldUserId').value = userId;
    },
    
    updateRoomInfo(data, userId) {
        document.getElementById('currentRoomCode').textContent = data.roomCode;
        document.getElementById('currentMode').textContent = data.mode === '1v1' ? '1v1模式' : '3v3模式';
        
        const playerList = document.getElementById('playerList');
        playerList.innerHTML = '';
        
        data.players.forEach((player) => {
            const div = document.createElement('div');
            div.className = `player-item ${player.isHost ? 'host' : ''}`;
            const isMe = player.userId === userId;
            div.innerHTML = `
                <div class="player-info">
                    <span class="player-name">${player.username}</span>
                    ${player.isHost ? '<span class="host-badge">房主</span>' : ''}
                    <span class="player-id">${player.userId}</span>
                </div>
                ${!isMe ? `<button class="btn btn-primary" onclick="Game.challengePlayer()">发起挑战</button>` : ''}
            `;
            playerList.appendChild(div);
        });
        
        const gameLog = document.getElementById('roomGameLog');
        gameLog.innerHTML = data.gameLog.map(log => 
            `<div class="game-log-item">${log.player1} vs ${log.player2} - 胜者: ${log.winner === 0 ? '平局' : (log.winner === 1 ? log.player1 : log.player2)}</div>`
        ).join('');
    },
    
    initCharacterSelect() {
        const list = document.getElementById('characterList');
        list.innerHTML = '';
        
        const characters = CharacterData.characters;
        Object.values(characters).forEach(char => {
            const div = document.createElement('div');
            div.className = 'character-item';
            div.onclick = () => Game.selectCharacter(char.id);
            div.innerHTML = `
                <div class="character-name">${char.name}</div>
                <div class="character-title">——${char.title}</div>
            `;
            list.appendChild(div);
        });
    },
    
    showCharacterDetail(charId) {
        const char = CharacterData.getCharacterById(charId);
        if (!char) return;
        
        const detail = document.getElementById('characterDetail');
        detail.innerHTML = `
            <div class="detail-section">
                <h3>${char.name}——${char.title}</h3>
                <p><strong>标签:</strong> ${char.tag}</p>
                <p>${char.description}</p>
            </div>
            <div class="detail-section">
                <h3>战斗属性</h3>
                <div class="stat-grid">
                    <div class="stat-item">
                        <div class="stat-value">${char.maxHP}</div>
                        <div class="stat-label">HP</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${char.atk}</div>
                        <div class="stat-label">ATK</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${char.def}</div>
                        <div class="stat-label">DEF</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${char.initSP}/${char.maxSP}</div>
                        <div class="stat-label">SP</div>
                    </div>
                </div>
            </div>
            <div class="detail-section">
                <h3>天赋: ${char.talent.name}</h3>
                <p>${char.talent.description}</p>
            </div>
            <div class="detail-section">
                <h3>技能</h3>
                ${char.skills.map(skill => `
                    <div class="skill-item">
                        <span class="skill-name">【${skill.name}】</span>
                        <span class="skill-cost">${skill.type === 'active' ? `SP: ${skill.spCost}` : '被动'}</span>
                        <p>${skill.description}</p>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    updateMySelection(charId) {
        const charDisplay = document.getElementById('mySelectedChar');
        if (charId) {
            const char = CharacterData.getCharacterById(charId);
            charDisplay.textContent = `${char.name}——${char.title}`;
        } else {
            charDisplay.textContent = '未选择';
        }
    },
    
    updateOpponentSelection(charId, ready) {
        const charDisplay = document.getElementById('opponentSelectedChar');
        if (charId) {
            const char = CharacterData.getCharacterById(charId);
            charDisplay.textContent = `${char.name}——${char.title}${ready ? ' (已准备)' : ''}`;
        } else {
            charDisplay.textContent = '未选择';
        }
    },
    
    updateReadyButton(isReady) {
        const btn = document.getElementById('readyBtn');
        btn.textContent = isReady ? '取消准备' : '准备好了';
        btn.className = isReady ? 'btn btn-secondary' : 'btn btn-success';
    },
    
    showCountdown(p1Name, p2Name, p1Char, p2Char) {
        document.getElementById('countdownPlayer1').textContent = p1Name;
        document.getElementById('countdownPlayer2').textContent = p2Name;
        document.getElementById('countdownChar1').textContent = p1Char;
        document.getElementById('countdownChar2').textContent = p2Char;
        
        const overlay = document.getElementById('countdownOverlay');
        const numberDiv = document.getElementById('countdownNumber');
        overlay.classList.add('active');
        
        let count = 5;
        numberDiv.textContent = count;
        
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                numberDiv.textContent = count;
            } else {
                clearInterval(interval);
            }
        }, 1000);
    },
    
    hideCountdown() {
        document.getElementById('countdownOverlay').classList.remove('active');
    },
    
    getPhaseText(phase) {
        const phaseTexts = {
            'roundStart': '宣告本轮次开始',
            'summonAction': '召唤物行动',
            'beforeSkill': '【前】技能释放阶段',
            'actionCompare': '双方行动值比拼',
            'attackerAction': '攻击方行动',
            'defenderAction': '防守方行动',
            'settlement': '攻防行动结算',
            'afterSkill': '【后】技能释放阶段',
            'roundEnd': '宣告本轮次结束'
        };
        return phaseTexts[phase] || phase;
    },
    
    highlightPhase() {
        const phaseInfo = document.getElementById('phaseInfo');
        const roundInfo = document.getElementById('roundInfo');
        
        phaseInfo.classList.add('highlight');
        roundInfo.classList.add('highlight');
        
        setTimeout(() => {
            phaseInfo.classList.remove('highlight');
            roundInfo.classList.remove('highlight');
        }, 500);
    },
    
    updateBattleUI(gameState, playerNumber) {
        if (!gameState) return;
        
        document.getElementById('roundNumber').textContent = gameState.round;
        document.getElementById('phaseInfo').textContent = this.getPhaseText(gameState.phase);
        
        this.updatePlayerPanel(1, gameState.player1, gameState.attacker === 1, playerNumber);
        this.updatePlayerPanel(2, gameState.player2, gameState.attacker === 2, playerNumber);
        
        const actionLog = document.getElementById('actionLog');
        actionLog.innerHTML = gameState.logs.slice(-10).map(log => 
            `<div class="log-entry">${log}</div>`
        ).join('');
        actionLog.scrollTop = actionLog.scrollHeight;
        
        this.updateConfirmButton(gameState, playerNumber);
    },
    
    updatePlayerPanel(player, state, isAttacker, myPlayerNumber) {
        const panel = document.getElementById(`player${player}Panel`);
        const char = CharacterData.getCharacterById(state.characterId);
        
        panel.classList.toggle('attacker', isAttacker);
        
        document.getElementById(`player${player}CharName`).textContent = `${char.name}——${char.title}`;
        document.getElementById(`player${player}Hp`).textContent = state.hp;
        document.getElementById(`player${player}MaxHp`).textContent = state.maxHP;
        document.getElementById(`player${player}HpFill`).style.width = `${(state.hp / state.maxHP) * 100}%`;
        
        let atkDisplay = state.baseAtk;
        if (state.atkBonus !== 0) {
            atkDisplay += `<span class="${state.atkBonus > 0 ? 'bonus' : 'penalty'}">${state.atkBonus > 0 ? '+' : ''}${state.atkBonus}</span>`;
        }
        document.getElementById(`player${player}Atk`).innerHTML = atkDisplay;
        
        let defDisplay = state.baseDef;
        if (state.defBonus !== 0) {
            defDisplay += `<span class="${state.defBonus > 0 ? 'bonus' : 'penalty'}">${state.defBonus > 0 ? '+' : ''}${state.defBonus}</span>`;
        }
        document.getElementById(`player${player}Def`).innerHTML = defDisplay;
        
        document.getElementById(`player${player}Sp`).textContent = state.sp;
        document.getElementById(`player${player}MaxSp`).textContent = state.maxSP;
        
        const summonsDiv = document.getElementById(`player${player}Summons`);
        const allSummons = [...(state.summonedDolls || []), ...(state.summons || [])].filter(s => s.hp > 0);
        summonsDiv.innerHTML = allSummons.map(s => 
            `<div class="summon-item">${s.type === 'penglai' ? '蓬莱人偶' : s.type === 'shanghai' ? '上海人偶' : '人偶'} HP:${s.hp}</div>`
        ).join('');
        
        const buffsDiv = document.getElementById(`player${player}Buffs`);
        if (buffsDiv && state.buffs) {
            buffsDiv.innerHTML = state.buffs.map(b => {
                const isPositive = !['defReduction', 'randomReduction', 'randomReductionTemp', 'revealDamage'].includes(b.id);
                return `<div class="buff-item ${isPositive ? 'positive' : 'negative'}">
                    <span class="buff-name">${b.name}</span>
                    ${b.stacks > 1 ? `<span class="buff-stacks">x${b.stacks}</span>` : ''}
                    ${b.remainingDuration > 0 ? `<span class="buff-duration">(${b.remainingDuration})</span>` : ''}
                </div>`;
            }).join('');
        }
        
        const talentDiv = document.getElementById(`player${player}Talent`);
        talentDiv.innerHTML = `
            <div class="talent-name">天赋：${char.talent.name}</div>
            <div class="talent-desc">${char.talent.description}</div>
        `;
        
        const skillsDiv = document.getElementById(`player${player}Skills`);
        skillsDiv.innerHTML = char.skills.map(skill => {
            const canUse = this.canUseSkill(player, skill, state, myPlayerNumber);
            const skillType = skill.type === 'passive' ? '被动' : `SP:${skill.spCost}`;
            return `
                <div class="skill-full">
                    <button class="skill-btn" ${!canUse ? 'disabled' : ''} onclick="Game.showSkillModal(${player}, ${skill.id})">
                        <span class="skill-name">【${skill.name}】</span>
                        <span class="skill-cost">${skillType}</span>
                    </button>
                    <div class="skill-desc">${skill.description}</div>
                </div>
            `;
        }).join('');
    },
    
    canUseSkill(player, skill, state, myPlayerNumber) {
        if (player !== myPlayerNumber) return false;
        if (skill.type !== 'active') return false;
        
        if (state.sp < skill.spCost) return false;
        
        const phase = Game.gameState ? Game.gameState.phase : '';
        const timing = skill.timing;
        
        if (timing === 'all') return true;
        
        if (phase === 'beforeSkill' && timing === 'before') return true;
        if (phase === 'attackerAction' && Game.gameState && Game.gameState.attacker === myPlayerNumber && timing === 'middle') return true;
        if (phase === 'defenderAction' && Game.gameState && Game.gameState.defender === myPlayerNumber && timing === 'middle') return true;
        if (phase === 'afterSkill' && timing === 'after') return true;
        
        return false;
    },
    
    updateConfirmButton(gameState, playerNumber) {
        const btn = document.getElementById('confirmActionBtn');
        const phase = gameState.phase;
        const myState = playerNumber === 1 ? gameState.player1 : gameState.player2;
        
        if (myState.confirmed) {
            btn.disabled = true;
            return;
        }
        
        const canConfirm = 
            phase === 'beforeSkill' || 
            phase === 'afterSkill' ||
            (phase === 'attackerAction' && gameState.attacker === playerNumber) ||
            (phase === 'defenderAction' && gameState.defender === playerNumber);
        
        btn.disabled = !canConfirm;
    },
    
    showSkillModal(player, skillId) {
        const state = Game.gameState[`player${player}`];
        const char = CharacterData.getCharacterById(state.characterId);
        const skill = char.skills.find(s => s.id === skillId);
        
        document.getElementById('skillModalName').textContent = `【${skill.name}】 SP: ${skill.spCost}`;
        document.getElementById('skillModalDesc').textContent = skill.description;
        document.getElementById('skillModal').classList.add('active');
    },
    
    closeSkillModal() {
        document.getElementById('skillModal').classList.remove('active');
    },
    
    showGameResult(winner, playerNumber) {
        const player1Panel = document.getElementById('player1Panel');
        const player2Panel = document.getElementById('player2Panel');
        
        player1Panel.classList.remove('attacker', 'highlight');
        player2Panel.classList.remove('attacker', 'highlight');
        
        const actionLog = document.getElementById('actionLog');
        
        setTimeout(() => {
            let resultText = '';
            if (winner === 0) {
                resultText = '平局！';
            } else if (winner === 1) {
                resultText = '玩家1 获胜！';
                player1Panel.classList.add('highlight');
                player2Panel.style.opacity = '0.5';
            } else {
                resultText = '玩家2 获胜！';
                player2Panel.classList.add('highlight');
                player1Panel.style.opacity = '0.5';
            }
            
            const resultEntry = document.createElement('div');
            resultEntry.className = 'log-entry';
            resultEntry.style.color = '#ffd700';
            resultEntry.style.fontSize = '20px';
            resultEntry.textContent = resultText;
            actionLog.appendChild(resultEntry);
            actionLog.scrollTop = actionLog.scrollHeight;
            
            setTimeout(() => {
                const overlay = document.getElementById('resultOverlay');
                const content = document.getElementById('resultContent');
                const text = document.getElementById('resultText');
                
                if (winner === playerNumber) {
                    text.textContent = '得胜';
                    content.className = 'result-content win';
                } else if (winner === 0) {
                    text.textContent = '平局';
                    content.className = 'result-content';
                } else {
                    text.textContent = '惜败';
                    content.className = 'result-content lose';
                }
                
                overlay.classList.add('active');
            }, 2000);
        }, 2000);
    },
    
    hideResult() {
        document.getElementById('resultOverlay').classList.remove('active');
        document.getElementById('player1Panel').style.opacity = '1';
        document.getElementById('player2Panel').style.opacity = '1';
    },
    
    disableAllInteractions() {
        const confirmBtn = document.getElementById('confirmActionBtn');
        confirmBtn.disabled = true;
        
        document.querySelectorAll('.skill-btn').forEach(btn => {
            btn.disabled = true;
        });
    }
};

window.UI = UI;
