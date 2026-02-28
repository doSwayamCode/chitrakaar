require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const compression = require('compression');
const { getRandomWords } = require('./words');
const { connect: connectDB, getDb, hashPin, checkBadges, updateStreak, sanitizeProfile, saveDrawing, getGallery, saveGuestScore, getMergedLeaderboard, BADGES } = require('./db');

// Connect to MongoDB on startup (gracefully disabled if MONGO_URI not set)
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6
});

app.use(compression());

// Security headers for SEO trust and security
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    etag: true,
    setHeaders: (res, path) => {
        // No cache for HTML, CSS, JS to ensure updates apply immediately
        if (path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
    }
}));

// Admin authentication middleware
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chitrakaar2026';

function adminAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Admin routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/analytics', adminAuth, (req, res) => {
    const currentConnections = io.sockets.sockets.size;
    analytics.peakConcurrent = Math.max(analytics.peakConcurrent, currentConnections);
    
    const today = new Date().toDateString();
    const todayStats = analytics.dailyStats[today] || { games: 0, players: new Set() };
    
    res.json({
        totalGames: analytics.totalGames,
        totalPlayers: analytics.totalPlayers.size,
        gamesPerMode: analytics.gamesPerMode,
        dailyStats: Object.keys(analytics.dailyStats).map(date => ({
            date,
            games: analytics.dailyStats[date].games,
            players: analytics.dailyStats[date].players.size
        })),
        hourlyStats: analytics.hourlyStats,
        currentConnections,
        peakConcurrent: analytics.peakConcurrent,
        activeRooms: rooms.size,
        todayGames: todayStats.games,
        todayPlayers: todayStats.players.size
    });
});

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


const GAME_MODES = {
    classic: { label: 'Classic', turnTime: 80, rounds: 3 },
    bollywood: { label: 'Bollywood', turnTime: 80, rounds: 3 },
    cricket: { label: 'Cricket', turnTime: 80, rounds: 3 },
    food: { label: 'Food', turnTime: 80, rounds: 3 },
    festivals: { label: 'Festivals', turnTime: 80, rounds: 3 },
    travel: { label: 'Travel', turnTime: 80, rounds: 3 },
    culture: { label: 'Culture', turnTime: 80, rounds: 3 },
    history: { label: 'History', turnTime: 80, rounds: 3 },
    nature: { label: 'Nature', turnTime: 80, rounds: 3 },
    memes: { label: 'Memes', turnTime: 70, rounds: 3 },
    hard: { label: 'Hard Mode', turnTime: 60, rounds: 4 },
    speed: { label: 'Speed', turnTime: 30, rounds: 4 }
};


const rooms = new Map();
const publicRooms = new Set();
const MAX_ROOMS = 1000;

// Analytics tracking
const analytics = {
    totalGames: 0,
    totalPlayers: new Set(),
    gamesPerMode: {},
    dailyStats: {},
    hourlyStats: Array(24).fill(0),
    connections: 0,
    peakConcurrent: 0
};

function trackGame(mode) {
    analytics.totalGames++;
    if (!analytics.gamesPerMode[mode]) {
        analytics.gamesPerMode[mode] = 0;
    }
    analytics.gamesPerMode[mode]++;
    
    const today = new Date().toDateString();
    if (!analytics.dailyStats[today]) {
        analytics.dailyStats[today] = { games: 0, players: new Set() };
    }
    analytics.dailyStats[today].games++;
    
    const hour = new Date().getHours();
    analytics.hourlyStats[hour]++;
}

function trackPlayer(playerId) {
    analytics.totalPlayers.add(playerId);
    const today = new Date().toDateString();
    if (!analytics.dailyStats[today]) {
        analytics.dailyStats[today] = { games: 0, players: new Set() };
    }
    analytics.dailyStats[today].players.add(playerId);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? generateRoomCode() : code;
}

function createRoom(hostId, hostName, avatarId, mode = 'classic', isPublic = false, customRounds = null) {
    const code = generateRoomCode();
    const modeConfig = GAME_MODES[mode] || GAME_MODES.classic;
    const room = {
        code,
        players: [{ id: hostId, name: hostName, score: 0, avatarId: avatarId || 0 }],
        state: 'waiting',
        mode: mode,
        isPublic: isPublic,
        currentRound: 0,
        totalRounds: customRounds || modeConfig.rounds,
        turnTime: modeConfig.turnTime,
        currentDrawerIndex: 0,
        currentWord: null,
        wordChoices: [],
        usedWords: [],
        turnTimer: null,
        turnTimeLeft: modeConfig.turnTime,
        guessedPlayers: [],
        maxPlayers: 8,
        drawHistory: [],
        revealedHints: [],
        createdAt: Date.now()
    };
    rooms.set(code, room);
    if (isPublic) publicRooms.add(code);
    return room;
}

function getDrawer(room) {
    return room.players[room.currentDrawerIndex] || null;
}

function levenshtein(a, b) {
    if (a.length > 50 || b.length > 50) return 999;
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
    
    const hintTimings = calculateHintTimings(room.currentWord, room.turnTime);

    room.turnTimer = setInterval(() => {
        room.turnTimeLeft--;
        io.to(room.code).emit('timerUpdate', room.turnTimeLeft);
        
        revealHintIfNeeded(room, hintTimings);

        if (room.turnTimeLeft <= 0) {
            clearTurnTimer(room);
            endTurn(room, false);
        }
    }, 1000);
}

function calculateHintTimings(word, totalTime) {
    const lettersOnly = word.replace(/\s/g, '');
    const wordLength = lettersOnly.length;
    
    if (wordLength <= 4) {
        return [Math.floor(totalTime * 0.5)];
    } else if (wordLength <= 8) {
        return [Math.floor(totalTime * 0.65), Math.floor(totalTime * 0.35)];
    } else {
        return [Math.floor(totalTime * 0.7), Math.floor(totalTime * 0.45), Math.floor(totalTime * 0.2)];
    }
}

function revealHintIfNeeded(room, hintTimings) {
    if (!room.currentWord || room.state !== 'playing') return;
    
    const targetHintCount = hintTimings.filter(t => room.turnTimeLeft <= t).length;
    
    if (targetHintCount > room.revealedHints.length) {
        const lettersOnly = room.currentWord.replace(/\s/g, '');
        const availableIndices = [];
        
        for (let i = 0; i < room.currentWord.length; i++) {
            if (room.currentWord[i] !== ' ' && !room.revealedHints.includes(i)) {
                availableIndices.push(i);
            }
        }
        
        if (availableIndices.length > 0) {
            const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            room.revealedHints.push(randomIndex);
            
            const drawer = getDrawer(room);
            const hint = generateHint(room.currentWord, room.revealedHints);
            
            room.players.forEach(p => {
                if (p.id !== drawer.id && !room.guessedPlayers.includes(p.id)) {
                    io.to(p.id).emit('hintRevealed', { hint });
                }
            });
        }
    }
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
    room.revealedHints = [];

    const drawer = getDrawer(room);

    io.to(drawer.id).emit('wordSelected', { word, isDrawer: true });

    const hint = generateHint(word, []);
    room.players.forEach(p => {
        if (p.id !== drawer.id) {
            io.to(p.id).emit('wordSelected', { word: hint, isDrawer: false, wordLength: word.length });
        }
    });

    io.to(room.code).emit('clearCanvas');
    startTurnTimer(room);
}

function generateHint(word, revealedIndices) {
    return word.split('').map((ch, i) => {
        if (ch === ' ') return '  ';
        if (revealedIndices.includes(i)) return ch + ' ';
        return '_ ';
    }).join('').trim();
}

function endTurn(room, allGuessed) {
    clearTurnTimer(room);
    room.state = 'roundEnd';

    const drawer = getDrawer(room);

    if (room.guessedPlayers.length > 0 && drawer) {
        drawer.score += Math.round(room.guessedPlayers.length * 50);
    }

    // Save the drawing to the gallery (fire-and-forget, never blocks the game)
    if (room.currentWord && room.drawHistory.length >= 10 && drawer) {
        saveDrawing({
            word:       room.currentWord,
            drawerName: drawer.name,
            strokes:    room.drawHistory.slice(),
        });
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

    // Track analytics
    trackGame(room.mode);
    room.players.forEach(p => trackPlayer(p.id));

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

function findPublicRoom() {
    for (const code of publicRooms) {
        const room = rooms.get(code);
        if (room && room.state === 'waiting' && room.players.length < room.maxPlayers) {
            return room;
        }
    }
    return null;
}

function cleanupOldRooms() {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    for (const [code, room] of rooms) {
        if (now - room.createdAt > TWO_HOURS && room.state === 'waiting' && room.players.length === 0) {
            rooms.delete(code);
            publicRooms.delete(code);
        }
    }
}

setInterval(cleanupOldRooms, 10 * 60 * 1000);

function sanitizeName(name) {
    if (typeof name !== 'string') return '';
    return name.trim().replace(/[<>"'&]/g, '').substring(0, 20);
}

function sanitizeMessage(msg) {
    if (typeof msg !== 'string') return '';
    return msg.trim().substring(0, 200);
}

function validateDrawData(data) {
    if (!data || typeof data !== 'object') return false;
    
    if (data.type === 'line') {
        return typeof data.x1 === 'number' && data.x1 >= 0 && data.x1 <= 1 &&
               typeof data.y1 === 'number' && data.y1 >= 0 && data.y1 <= 1 &&
               typeof data.x2 === 'number' && data.x2 >= 0 && data.x2 <= 1 &&
               typeof data.y2 === 'number' && data.y2 >= 0 && data.y2 <= 1 &&
               typeof data.size === 'number' && data.size > 0 && data.size <= 50 &&
               typeof data.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.color);
    }
    
    if (data.type === 'fill') {
        return typeof data.x === 'number' && data.x >= 0 && data.x <= 1 &&
               typeof data.y === 'number' && data.y >= 0 && data.y <= 1 &&
               typeof data.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.color);
    }
    
    return false;
}

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

io.on('connection', (socket) => {
    let currentRoom = null;

    // Track connections
    analytics.connections++;
    const currentConnections = io.sockets.sockets.size;
    analytics.peakConcurrent = Math.max(analytics.peakConcurrent, currentConnections);

    socket.on('createRoom', ({ playerName, avatarId, mode, isPublic, rounds }) => {
        if (rooms.size >= MAX_ROOMS) {
            socket.emit('error', { message: 'Server is at capacity. Please try again later.' });
            return;
        }
        const name = sanitizeName(playerName);
        if (!name) {
            socket.emit('error', { message: 'Please enter a valid name.' });
            return;
        }
        const validMode = GAME_MODES[mode] ? mode : 'classic';
        const validAvatar = (typeof avatarId === 'number' && avatarId >= 0 && avatarId < AVATARS.length) ? avatarId : 0;
        const validRounds = (typeof rounds === 'number' && rounds >= 3 && rounds <= 10) ? rounds : null;

        const room = createRoom(socket.id, name, validAvatar, validMode, !!isPublic, validRounds);
        currentRoom = room.code;
        socket.join(room.code);

        socket.emit('roomCreated', {
            code: room.code,
            mode: room.mode,
            isPublic: room.isPublic,
            totalRounds: room.totalRounds,
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, avatarId: p.avatarId }))
        });
    });

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
            totalRounds: room.totalRounds,
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

    socket.on('updateRounds', ({ rounds }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room || room.state !== 'waiting') return;

        // Only host can update rounds
        if (room.players[0].id !== socket.id) {
            socket.emit('error', { message: 'Only the host can change settings!' });
            return;
        }

        // Validate rounds (3-10)
        if (typeof rounds === 'number' && rounds >= 3 && rounds <= 10) {
            room.totalRounds = rounds;
            // Broadcast updated rounds to all players in room
            io.to(room.code).emit('roundsUpdated', { totalRounds: rounds });
        }
    });

    socket.on('wordChosen', ({ word }) => {
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room || room.state !== 'choosingWord') return;

        const drawer = getDrawer(room);
        if (drawer.id !== socket.id) return;

        selectWord(room, word);
    });

    socket.on('draw', (data) => {
        if (!currentRoom) return;
        if (!rateLimit(socket.id, 'draw', 60)) return;
        if (!validateDrawData(data)) return;
        
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

app.get('/api/avatars', (req, res) => {
    res.json(AVATARS);
});

app.get('/api/modes', (req, res) => {
    res.json(GAME_MODES);
});

// ─── Profile Rate Limiter (in-memory, per IP) ─────────────────────────────
const profileRateLimits = new Map();

function profileRateLimit(ip, max = 10, windowMs = 60000) {
    const now = Date.now();
    if (!profileRateLimits.has(ip)) profileRateLimits.set(ip, []);
    const times = profileRateLimits.get(ip).filter(t => now - t < windowMs);
    if (times.length >= max) return false;
    times.push(now);
    profileRateLimits.set(ip, times);
    return true;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
    const cutoff = Date.now() - 60000;
    for (const [ip, times] of profileRateLimits) {
        const fresh = times.filter(t => t > cutoff);
        if (fresh.length === 0) profileRateLimits.delete(ip);
        else profileRateLimits.set(ip, fresh);
    }
}, 5 * 60 * 1000);

// ─── GET /api/badges ─────────────────────────────────────────────────────
// Returns all badge definitions so the frontend can render them.
app.get('/api/badges', (req, res) => {
    res.json(Object.values(BADGES));
});

// ─── POST /api/profile/register ──────────────────────────────────────────
app.post('/api/profile/register', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    if (!profileRateLimit(ip, 5)) {
        return res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
    }

    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Profile service is unavailable. Try again later.' });

    const { username, displayName, pin } = req.body || {};
    if (!username || !displayName || !pin) {
        return res.status(400).json({ error: 'Username, display name, and PIN are required.' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username: 3–20 characters, letters/numbers/underscores only.' });
    }
    if (!/^\d{4}$/.test(String(pin))) {
        return res.status(400).json({ error: 'PIN must be exactly 4 digits.' });
    }
    const cleanName = String(displayName).trim().substring(0, 20);
    if (cleanName.length < 1) {
        return res.status(400).json({ error: 'Display name cannot be empty.' });
    }

    const profile = {
        username: username.toLowerCase(),
        displayName: cleanName,
        pinHash: hashPin(String(pin)),
        createdAt: new Date(),
        stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            bestScore: 0,
        },
        streak: {
            current: 0,
            longest: 0,
            lastPlayedDate: null,
        },
        badges: [],
        favouriteMode: 'classic',
        lastPlayedAt: null,
    };

    try {
        await db.collection('players').insertOne(profile);
        return res.json({ success: true, profile: sanitizeProfile(profile) });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'That username is already taken. Try another.' });
        }
        console.error('[Profile] Register error:', err.message);
        return res.status(500).json({ error: 'Could not create profile. Try again.' });
    }
});

// ─── POST /api/profile/login ──────────────────────────────────────────────
app.post('/api/profile/login', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    if (!profileRateLimit(ip, 10)) {
        return res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
    }

    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Profile service is unavailable. Try again later.' });

    const { username, pin } = req.body || {};
    if (!username || !pin) {
        return res.status(400).json({ error: 'Username and PIN are required.' });
    }

    const player = await db.collection('players').findOne({ username: username.toLowerCase() });
    if (!player) return res.status(404).json({ error: 'Profile not found.' });
    if (player.pinHash !== hashPin(String(pin))) {
        return res.status(401).json({ error: 'Wrong PIN. Try again.' });
    }

    return res.json({ success: true, profile: sanitizeProfile(player) });
});

// ─── POST /api/profile/save-game ─────────────────────────────────────────
// Called from the client after every game. Updates stats, streak, badges.
app.post('/api/profile/save-game', async (req, res) => {
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Profile service is unavailable.' });

    const { username, pin, score, won, mode } = req.body || {};
    if (!username || !pin || typeof score !== 'number' || typeof won !== 'boolean') {
        return res.status(400).json({ error: 'Invalid data.' });
    }
    if (score < 0 || score > 5000) {
        return res.status(400).json({ error: 'Invalid score.' });
    }

    const player = await db.collection('players').findOne({ username: username.toLowerCase() });
    if (!player) return res.status(404).json({ error: 'Profile not found.' });
    if (player.pinHash !== hashPin(String(pin))) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Calculate new streak
    const newStreak = updateStreak(player);

    // Calculate new stats
    const newStats = {
        gamesPlayed: player.stats.gamesPlayed + 1,
        gamesWon:    player.stats.gamesWon + (won ? 1 : 0),
        totalScore:  player.stats.totalScore + score,
        bestScore:   Math.max(player.stats.bestScore, score),
    };

    // Check badges with updated stats + streak
    const tempProfile = { ...player, stats: newStats, streak: newStreak };
    const { updatedBadges, newBadges } = checkBadges(tempProfile, { score, won, mode });

    await db.collection('players').updateOne(
        { username: username.toLowerCase() },
        {
            $set: {
                stats: newStats,
                streak: newStreak,
                badges: updatedBadges,
                favouriteMode: mode || player.favouriteMode,
                lastPlayedAt: new Date(),
            },
        }
    );

    return res.json({ success: true, newBadges, streak: newStreak, stats: newStats });
});

// ─── GET /api/profile/:username ───────────────────────────────────────────
app.get('/api/profile/:username', async (req, res) => {
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Profile service is unavailable.' });

    const player = await db.collection('players').findOne(
        { username: req.params.username.toLowerCase() },
        { projection: { pinHash: 0, _id: 0 } }
    );
    if (!player) return res.status(404).json({ error: 'Profile not found.' });
    return res.json(player);
});

// ─── GET /api/gallery ────────────────────────────────────────────────────────
app.get('/api/gallery', async (req, res) => {
    try {
        const drawings = await getGallery(24);
        return res.json(drawings);
    } catch (err) {
        console.error('[Gallery] Fetch error:', err.message);
        return res.status(500).json({ error: 'Could not load gallery.' });
    }
});

// ─── POST /api/leaderboard/guest-score ──────────────────────────────────────────────
// Called after game over when player is not logged in.
app.post('/api/leaderboard/guest-score', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    if (!profileRateLimit(ip, 10)) {
        return res.status(429).json({ error: 'Too many requests.' });
    }
    const { score, mode } = req.body || {};
    if (typeof score !== 'number' || score < 0 || score > 9999) {
        return res.status(400).json({ error: 'Invalid score.' });
    }
    const guestNum = await saveGuestScore(score, mode);
    if (!guestNum) return res.status(503).json({ error: 'Could not save score.' });
    return res.json({ success: true, guestName: `Guest-${guestNum}`, guestNum });
});

// ─── GET /api/leaderboard/alltime ────────────────────────────────────────
app.get('/api/leaderboard/alltime', async (req, res) => {
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Profile service is unavailable.' });
    try {
        const top = await getMergedLeaderboard(20);
        return res.json(top);
    } catch (err) {
        return res.status(500).json({ error: 'Could not load leaderboard.' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Chitrakaar server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});


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
