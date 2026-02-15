const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const compression = require('compression');
const { getRandomWords } = require('./words');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6
});

// Middleware
app.use(compression());
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
}));

// ─── Avatar Definitions ─────────────────────────────────────────────────────

const AVATARS = [
    { id: 0, name: 'Turban', color: '#ff6b2b' },
    { id: 1, name: 'Saree', color: '#e74c3c' },
    { id: 2, name: 'Kurta', color: '#3498db' },
    { id: 3, name: 'Sherwani', color: '#9b59b6' },
    { id: 4, name: 'Dhoti', color: '#f39c12' },
    { id: 5, name: 'Lehenga', color: '#e91e63' },
    { id: 6, name: 'Pagdi', color: '#00c97b' },
    { id: 7, name: 'Dupatta', color: '#1abc9c' },
    { id: 8, name: 'Cap', color: '#2ecc71' },
    { id: 9, name: 'Bindi', color: '#ff4f9a' },
    { id: 10, name: 'Lungi', color: '#f1c40f' },
    { id: 11, name: 'Topi', color: '#95a5a6' }
];

// ─── Game Mode Definitions ───────────────────────────────────────────────────

const GAME_MODES = {
    classic: { label: 'Classic', turnTime: 80, rounds: 3 },
    bollywood: { label: 'Bollywood', turnTime: 80, rounds: 3 },
    cricket: { label: 'Cricket', turnTime: 80, rounds: 3 },
    food: { label: 'Food', turnTime: 80, rounds: 3 },
    speed: { label: 'Speed', turnTime: 30, rounds: 4 }
};

// ─── In-Memory State ────────────────────────────────────────────────────────

const rooms = new Map();
const publicRooms = new Set(); // room codes that are public

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? generateRoomCode() : code;
}

function createRoom(hostId, hostName, avatarId, mode = 'classic', isPublic = false) {
    const code = generateRoomCode();
    const modeConfig = GAME_MODES[mode] || GAME_MODES.classic;
    const room = {
        code,
        players: [{ id: hostId, name: hostName, score: 0, avatarId: avatarId || 0 }],
        state: 'waiting',
        mode: mode,
        isPublic: isPublic,
        currentRound: 0,
        totalRounds: modeConfig.rounds,
        turnTime: modeConfig.turnTime,
        currentDrawerIndex: 0,
        currentWord: null,
        wordChoices: [],
        usedWords: [],
        turnTimer: null,
        turnTimeLeft: modeConfig.turnTime,
        guessedPlayers: [],
        maxPlayers: 8,
        drawHistory: []
    };
    rooms.set(code, room);
    if (isPublic) publicRooms.add(code);
    return room;
}

function getDrawer(room) {
    return room.players[room.currentDrawerIndex] || null;
}

function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function calculateScore(timeLeft, totalTime) {
    const timeFraction = timeLeft / totalTime;
    return Math.round(100 + 200 * timeFraction);
}

function clearTurnTimer(room) {
    if (room.turnTimer) {
        clearInterval(room.turnTimer);
        room.turnTimer = null;
    }
}

function startTurnTimer(room) {
    clearTurnTimer(room);
    room.turnTimeLeft = room.turnTime;

    room.turnTimer = setInterval(() => {
        room.turnTimeLeft--;
        io.to(room.code).emit('timerUpdate', room.turnTimeLeft);

        if (room.turnTimeLeft <= 0) {
            clearTurnTimer(room);
            endTurn(room, false);
        }
    }, 1000);
}

function startWordChoice(room) {
    room.state = 'choosingWord';
    room.drawHistory = [];
    room.guessedPlayers = [];
    room.currentWord = null;

    const drawer = getDrawer(room);
    if (!drawer) return;

    room.wordChoices = getRandomWords(3, room.usedWords, room.mode);
    io.to(drawer.id).emit('chooseWord', room.wordChoices);

    io.to(room.code).emit('drawerChoosing', {
        drawerName: drawer.name,
        drawerId: drawer.id
    });

    room.wordChoiceTimer = setTimeout(() => {
        if (room.state === 'choosingWord') {
            const word = room.wordChoices[Math.floor(Math.random() * room.wordChoices.length)];
            selectWord(room, word);
        }
    }, 15000);
}

function selectWord(room, word) {
    if (room.wordChoiceTimer) {
        clearTimeout(room.wordChoiceTimer);
        room.wordChoiceTimer = null;
    }

    room.currentWord = word;
    room.usedWords.push(word);
    room.state = 'playing';

    const drawer = getDrawer(room);

    io.to(drawer.id).emit('wordSelected', { word, isDrawer: true });

    const hint = word.split('').map(ch => (ch === ' ' ? '  ' : '_ ')).join('').trim();
    room.players.forEach(p => {
        if (p.id !== drawer.id) {
            io.to(p.id).emit('wordSelected', { word: hint, isDrawer: false, wordLength: word.length });
        }
    });

    io.to(room.code).emit('clearCanvas');
    startTurnTimer(room);
}

function endTurn(room, allGuessed) {
    clearTurnTimer(room);
    room.state = 'roundEnd';

    const drawer = getDrawer(room);

    if (room.guessedPlayers.length > 0 && drawer) {
        drawer.score += Math.round(room.guessedPlayers.length * 50);
    }

    io.to(room.code).emit('turnEnd', {
        word: room.currentWord,
        scores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
    });

    setTimeout(() => {
        nextTurn(room);
    }, 5000);
}

function nextTurn(room) {
    room.currentDrawerIndex++;

    if (room.currentDrawerIndex >= room.players.length) {
        room.currentDrawerIndex = 0;
        room.currentRound++;

        if (room.currentRound >= room.totalRounds) {
            endGame(room);
            return;
        }
    }

    io.to(room.code).emit('newTurn', {
        round: room.currentRound + 1,
        totalRounds: room.totalRounds,
        drawerName: getDrawer(room).name,
        drawerId: getDrawer(room).id
    });

    startWordChoice(room);
}

function endGame(room) {
    room.state = 'gameOver';
    clearTurnTimer(room);

    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

    io.to(room.code).emit('gameOver', {
        players: sortedPlayers.map(p => ({ id: p.id, name: p.name, score: p.score })),
        winner: sortedPlayers[0]
    });

    // Reset room for replay
    setTimeout(() => {
        room.state = 'waiting';
        room.currentRound = 0;
        room.currentDrawerIndex = 0;
        room.usedWords = [];
        room.currentWord = null;
        room.guessedPlayers = [];
        room.drawHistory = [];
        room.players.forEach(p => p.score = 0);
        if (room.isPublic) publicRooms.add(room.code);

        io.to(room.code).emit('roomUpdate', {
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId })),
            state: room.state
        });
    }, 10000);
}

function startGame(room) {
    if (room.players.length < 2) return false;

    room.state = 'playing';
    room.currentRound = 0;
    room.currentDrawerIndex = 0;
    room.usedWords = [];
    room.players.forEach(p => p.score = 0);
    publicRooms.delete(room.code); // remove from public pool when game starts

    io.to(room.code).emit('gameStarted', {
        round: 1,
        totalRounds: room.totalRounds,
        drawerName: getDrawer(room).name,
        drawerId: getDrawer(room).id,
        mode: room.mode,
        turnTime: room.turnTime
    });

    startWordChoice(room);
    return true;
}

// Find a joinable public room
function findPublicRoom() {
    for (const code of publicRooms) {
        const room = rooms.get(code);
        if (room && room.state === 'waiting' && room.players.length < room.maxPlayers) {
            return room;
        }
    }
    return null;
}

// ─── Input Sanitization ─────────────────────────────────────────────────────

function sanitizeName(name) {
    if (typeof name !== 'string') return '';
    return name.trim().replace(/[<>"'&]/g, '').substring(0, 20);
}

function sanitizeMessage(msg) {
    if (typeof msg !== 'string') return '';
    return msg.trim().substring(0, 200);
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

const rateLimits = new Map();

function rateLimit(socketId, type, maxPerSecond) {
    if (!rateLimits.has(socketId)) {
        rateLimits.set(socketId, { draw: [], chat: [] });
    }
    const limits = rateLimits.get(socketId);
    const now = Date.now();
    limits[type] = limits[type].filter(t => now - t < 1000);
    if (limits[type].length >= maxPerSecond) return false;
    limits[type].push(now);
    return true;
}

// ─── Socket.IO Events ──────────────────────────────────────────────────────

io.on('connection', (socket) => {
    let currentRoom = null;

    // Create room
    socket.on('createRoom', ({ playerName, avatarId, mode, isPublic }) => {
        const name = sanitizeName(playerName);
        if (!name) {
            socket.emit('error', { message: 'Please enter a valid name.' });
            return;
        }
        const validMode = GAME_MODES[mode] ? mode : 'classic';
        const validAvatar = (typeof avatarId === 'number' && avatarId >= 0 && avatarId < AVATARS.length) ? avatarId : 0;

        const room = createRoom(socket.id, name, validAvatar, validMode, !!isPublic);
        currentRoom = room.code;
        socket.join(room.code);

        socket.emit('roomCreated', {
            code: room.code,
            mode: room.mode,
            isPublic: room.isPublic,
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
        });
    });

    // Join room
    socket.on('joinRoom', ({ roomCode, playerName, avatarId }) => {
        const name = sanitizeName(playerName);
        if (!name) {
            socket.emit('error', { message: 'Please enter a valid name.' });
            return;
        }
        const code = (roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
            socket.emit('error', { message: 'Room not found! Check the code and try again.' });
            return;
        }
        if (room.players.length >= room.maxPlayers) {
            socket.emit('error', { message: 'Room is full! Maximum 8 players.' });
            return;
        }
        if (room.state !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress! Wait for the next round.' });
            return;
        }

        const validAvatar = (typeof avatarId === 'number' && avatarId >= 0 && avatarId < AVATARS.length) ? avatarId : 0;
        room.players.push({ id: socket.id, name: name, score: 0, avatarId: validAvatar });
        currentRoom = code;
        socket.join(code);

        socket.emit('roomJoined', {
            code: room.code,
            mode: room.mode,
            isPublic: room.isPublic,
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
        });

        socket.to(code).emit('playerJoined', {
            playerName: name,
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
        });

        // Auto-start public rooms when 4+ players join
        if (room.isPublic && room.players.length >= 4) {
            setTimeout(() => {
                if (room.state === 'waiting' && room.players.length >= 2) {
                    startGame(room);
                }
            }, 5000);
            io.to(room.code).emit('autoStarting', { countdown: 5 });
        }
    });

    // Quick Play (Public Rooms)
    socket.on('quickPlay', ({ playerName, avatarId }) => {
        const name = sanitizeName(playerName);
        if (!name) {
            socket.emit('error', { message: 'Please enter a valid name.' });
            return;
        }

        const validAvatar = (typeof avatarId === 'number' && avatarId >= 0 && avatarId < AVATARS.length) ? avatarId : 0;

        // Find existing public room or create one
        let room = findPublicRoom();
        if (room) {
            room.players.push({ id: socket.id, name: name, score: 0, avatarId: validAvatar });
            currentRoom = room.code;
            socket.join(room.code);

            socket.emit('roomJoined', {
                code: room.code,
                mode: room.mode,
                isPublic: true,
                players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
            });

            socket.to(room.code).emit('playerJoined', {
                playerName: name,
                players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
            });

            // Auto-start when 4+ players
            if (room.players.length >= 4) {
                setTimeout(() => {
                    if (room.state === 'waiting' && room.players.length >= 2) {
                        startGame(room);
                    }
                }, 5000);
                io.to(room.code).emit('autoStarting', { countdown: 5 });
            }
        } else {
            // Create a new public room
            room = createRoom(socket.id, name, validAvatar, 'classic', true);
            currentRoom = room.code;
            socket.join(room.code);

            socket.emit('roomCreated', {
                code: room.code,
                mode: room.mode,
                isPublic: true,
                players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
            });
        }
    });

    // Start game
    socket.on('startGame', () => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;

        if (room.players[0].id !== socket.id) {
            socket.emit('error', { message: 'Only the host can start the game!' });
            return;
        }

        if (!startGame(room)) {
            socket.emit('error', { message: 'Need at least 2 players to start!' });
        }
    });

    // Word chosen by drawer
    socket.on('wordChosen', ({ word }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room || room.state !== 'choosingWord') return;

        const drawer = getDrawer(room);
        if (drawer.id !== socket.id) return;

        selectWord(room, word);
    });

    // Drawing events
    socket.on('draw', (data) => {
        if (!currentRoom) return;
        if (!rateLimit(socket.id, 'draw', 60)) return;
        const room = rooms.get(currentRoom);
        if (!room || room.state !== 'playing') return;

        const drawer = getDrawer(room);
        if (drawer.id !== socket.id) return;

        room.drawHistory.push(data);
        socket.to(currentRoom).emit('draw', data);
    });

    socket.on('clearCanvas', () => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;

        const drawer = getDrawer(room);
        if (drawer && drawer.id !== socket.id) return;

        room.drawHistory = [];
        socket.to(currentRoom).emit('clearCanvas');
    });

    // Chat / Guess
    socket.on('chatMessage', ({ message }) => {
        if (!currentRoom) return;
        if (!rateLimit(socket.id, 'chat', 5)) return;
        const room = rooms.get(currentRoom);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const cleanMessage = sanitizeMessage(message);
        if (!cleanMessage) return;

        const drawer = getDrawer(room);

        if (room.state === 'playing' && drawer && socket.id !== drawer.id) {
            if (room.guessedPlayers.includes(socket.id)) {
                socket.emit('chatMessage', {
                    playerName: player.name,
                    message: cleanMessage,
                    type: 'guessed-chat'
                });
                return;
            }

            const guess = cleanMessage.toLowerCase();
            const answer = room.currentWord.toLowerCase();

            if (guess === answer) {
                const score = calculateScore(room.turnTimeLeft, room.turnTime);
                player.score += score;
                room.guessedPlayers.push(socket.id);

                io.to(room.code).emit('correctGuess', {
                    playerName: player.name,
                    playerId: socket.id,
                    score,
                    scores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
                });

                const nonDrawerCount = room.players.length - 1;
                if (room.guessedPlayers.length >= nonDrawerCount) {
                    endTurn(room, true);
                }
                return;
            }

            if (answer.length >= 4 && levenshtein(guess, answer) <= 2) {
                socket.emit('chatMessage', {
                    playerName: 'Hint',
                    message: `"${cleanMessage}" is very close!`,
                    type: 'close-guess'
                });
                return;
            }
        }

        if (room.state === 'playing' && drawer && socket.id === drawer.id) {
            return;
        }

        io.to(room.code).emit('chatMessage', {
            playerName: player.name,
            message: cleanMessage,
            type: 'normal'
        });
    });

    // Disconnect
    socket.on('disconnect', () => {
        rateLimits.delete(socket.id);

        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex === -1) return;

        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
            clearTurnTimer(room);
            publicRooms.delete(currentRoom);
            rooms.delete(currentRoom);
            return;
        }

        if (room.state === 'playing' || room.state === 'choosingWord') {
            const drawer = getDrawer(room);
            if (!drawer || player.id === drawer?.id || playerIndex <= room.currentDrawerIndex) {
                clearTurnTimer(room);
                if (room.currentDrawerIndex >= room.players.length) {
                    room.currentDrawerIndex = 0;
                    room.currentRound++;
                    if (room.currentRound >= room.totalRounds) {
                        endGame(room);
                        return;
                    }
                }
                io.to(room.code).emit('playerLeft', {
                    playerName: player.name,
                    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
                });
                startWordChoice(room);
                return;
            }
        }

        io.to(room.code).emit('playerLeft', {
            playerName: player.name,
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
        });

        if (room.players.length < 2 && room.state !== 'waiting') {
            clearTurnTimer(room);
            room.state = 'waiting';
            room.currentRound = 0;
            room.currentDrawerIndex = 0;
            room.players.forEach(p => p.score = 0);
            if (room.isPublic) publicRooms.add(room.code);
            io.to(room.code).emit('gameEnded', {
                message: 'Not enough players. Game ended.'
            });
        }
    });
});

// ─── API: Get available avatars ─────────────────────────────────────────────

app.get('/api/avatars', (req, res) => {
    res.json(AVATARS);
});

app.get('/api/modes', (req, res) => {
    res.json(GAME_MODES);
});

// ─── Start Server ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Chitrakaar server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

function shutdown() {
    console.log('\nShutting down gracefully...');

    for (const [code, room] of rooms) {
        clearTurnTimer(room);
        if (room.wordChoiceTimer) clearTimeout(room.wordChoiceTimer);
    }

    io.emit('gameEnded', { message: 'Server is restarting. Please rejoin.' });

    io.close(() => {
        server.close(() => {
            console.log('Server closed.');
            process.exit(0);
        });
    });

    setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});
