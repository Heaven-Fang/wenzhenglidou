const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { PORT, HOST } = require('./config/constants');
const { handleMessage, handleDisconnect, broadcastToRoom, generateUserId } = require('./handlers/MessageHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

wss.on('connection', (ws) => {
    console.log('新客户端连接');
    
    ws.userId = generateUserId();
    ws.username = 'player1';
    ws.currentRoom = null;
    ws.selectedCharacter = null;
    ws.ready = false;
    
    ws.send(JSON.stringify({
        type: 'connected',
        userId: ws.userId,
        username: ws.username
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data, broadcastToRoom);
        } catch (e) {
            console.error('消息解析错误:', e);
        }
    });
    
    ws.on('close', () => {
        console.log('客户端断开连接');
        handleDisconnect(ws, broadcastToRoom);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`服务器运行在 http://${HOST}:${PORT}`);
});
