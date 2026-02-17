// ─── PWA Service Worker Registration ─────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// ─── PWA Install Prompt ───────────────────────────────────────────────────
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button (we can add this later to UI)
    console.log('PWA install prompt available');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredPrompt = null;
});

// ──────────────────────────────────────────────────────────────────────────

const socket = io({ reconnectionAttempts: Infinity, reconnectionDelay: 1000 });

const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');

function hideLoadingScreen() {
    if (!loadingScreen) return;
    loadingScreen.classList.add('fade-out');
    document.getElementById('lobby-screen').classList.add('active');
    setTimeout(() => { loadingScreen.remove(); }, 600);
}

socket.on('connect', () => {
    myId = socket.id;
    if (loadingStatus) loadingStatus.textContent = 'Connected!';
    setTimeout(hideLoadingScreen, 400); // Short delay so user sees "Connected!"
});

socket.on('disconnect', () => {
    // If we get disconnected mid-game, the loading screen is already gone
    // Socket.IO will auto-reconnect
});

socket.io.on('reconnect_attempt', (attempt) => {
    if (loadingStatus && loadingScreen && !loadingScreen.classList.contains('fade-out')) {
        loadingStatus.textContent = `Reconnecting... (attempt ${attempt})`;
    }
});

const lobbyScreen = document.getElementById('lobby-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');

const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code-input');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const quickPlayBtn = document.getElementById('quick-play-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const gameModeSelect = document.getElementById('game-mode');

const displayRoomCode = document.getElementById('display-room-code');
const displayMode = document.getElementById('display-mode');
const displayPublic = document.getElementById('display-public');
const playerList = document.getElementById('player-list');
const startGameBtn = document.getElementById('start-game-btn');
const copyCodeBtn = document.getElementById('copy-code-btn');
const shareWhatsAppBtn = document.getElementById('share-whatsapp-btn');
const autoStartHint = document.getElementById('auto-start-hint');

const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');
const gamePlayerList = document.getElementById('game-player-list');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const roundText = document.getElementById('round-text');
const modeLabel = document.getElementById('mode-label');
const wordHint = document.getElementById('word-hint');
const timerText = document.getElementById('timer-text');
const timerPath = document.getElementById('timer-path');
const toolsBar = document.getElementById('tools-bar');
const turnOverlay = document.getElementById('turn-overlay');
const turnInfo = document.getElementById('turn-info');
const wordChoicesDiv = document.getElementById('word-choices');
const gameoverOverlay = document.getElementById('gameover-overlay');
const finalScores = document.getElementById('final-scores');
const toastContainer = document.getElementById('toast-container');
const confettiContainer = document.getElementById('confetti-container');

const playersPanel = document.getElementById('players-panel');
const chatPanel = document.getElementById('chat-panel');
const togglePlayersBtn = document.getElementById('toggle-players-btn');
const toggleChatBtn = document.getElementById('toggle-chat-btn');
const closePlayersBtn = document.getElementById('close-players-btn');
const closeChatBtn = document.getElementById('close-chat-btn');

let myId = null;
let roomCode = '';
let players = [];
let isDrawer = false;
let isDrawing = false;
let lastX = 0, lastY = 0;
let currentColor = '#1a1a2e';
let currentSize = 4;
let isEraser = false;
let isFillMode = false;
let drawHistory = [];
let selectedAvatarId = 0;
let currentMode = 'classic';
let currentTurnTime = 80;

const AVATARS = [
    { id: 0, name: 'Turban', color: '#ff6b2b', label: 'Tu' },
    { id: 1, name: 'Saree', color: '#e74c3c', label: 'Sa' },
    { id: 2, name: 'Kurta', color: '#3498db', label: 'Ku' },
    { id: 3, name: 'Sherwani', color: '#9b59b6', label: 'Sh' },
    { id: 4, name: 'Dhoti', color: '#f39c12', label: 'Dh' },
    { id: 5, name: 'Lehenga', color: '#e91e63', label: 'Le' },
    { id: 6, name: 'Pagdi', color: '#00c97b', label: 'Pa' },
    { id: 7, name: 'Dupatta', color: '#1abc9c', label: 'Du' },
    { id: 8, name: 'Cap', color: '#2ecc71', label: 'Ca' },
    { id: 9, name: 'Bindi', color: '#ff4f9a', label: 'Bi' },
    { id: 10, name: 'Lungi', color: '#f1c40f', label: 'Lu' },
    { id: 11, name: 'Topi', color: '#95a5a6', label: 'To' }
];

const MODE_LABELS = {
    classic: 'Classic',
    bollywood: 'Bollywood',
    cricket: 'Cricket',
    food: 'Food',
    festivals: 'Festivals',
    travel: 'Travel',
    culture: 'Culture',
    history: 'History',
    nature: 'Nature',
    memes: 'Memes',
    hard: 'Hard Mode',
    speed: 'Speed'
};

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    // Resize canvas when showing game screen
    if (screenId === 'game-screen') {
        // Use multiple resize calls with delays to ensure proper sizing
        setTimeout(() => resizeCanvas(), 10);
        setTimeout(() => resizeCanvas(), 100);
        setTimeout(() => resizeCanvas(), 300);
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function addChatMessage(sender, message, type = 'normal') {
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    if (sender) {
        div.innerHTML = `<span class="sender">${escapeHtml(sender)}:</span> ${escapeHtml(message)}`;
    } else {
        div.textContent = message;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function spawnConfetti() {
    const colors = ['#ff6b2b', '#00c97b', '#ffc845', '#4f7cff', '#ff4f9a', '#9b59b6', '#ff914d', '#ff6347'];
    const emojis = ['🎉', '🎊', '✨', '🔥', '💥', '⭐', '🌟', '💫'];
    
    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.animationDelay = Math.random() * 0.5 + 's';
        piece.style.animationDuration = (Math.random() * 1.5 + 1.5) + 's';
        
        // Mix of colored squares and emojis
        if (Math.random() > 0.3) {
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.width = (Math.random() * 10 + 6) + 'px';
            piece.style.height = piece.style.width;
        } else {
            piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            piece.style.background = 'transparent';
            piece.style.fontSize = (Math.random() * 8 + 12) + 'px';
        }
        
        confettiContainer.appendChild(piece);
        setTimeout(() => piece.remove(), 3000);
    }
}

const avatarGrid = document.getElementById('avatar-grid');
avatarGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.avatar-option');
    if (!btn) return;
    avatarGrid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedAvatarId = parseInt(btn.dataset.avatar);
});

// ─── Language Selector ────────────────────────────────────────────────────
const languageBtn = document.getElementById('language-btn');
const languageDropdown = document.getElementById('language-dropdown');
const currentLangFlag = document.getElementById('current-lang-flag');
const currentLangName = document.getElementById('current-lang-name');

function initializeLanguageSelector() {
    // Populate language options
    const languages = getLanguages();
    languageDropdown.innerHTML = languages.map(lang => `
        <button class="language-option ${lang.code === currentLanguage ? 'selected' : ''}" data-lang="${lang.code}">
            <span class="language-option-flag">${lang.flag}</span>
            <span class="language-option-name">${lang.name}</span>
        </button>
    `).join('');
    
    // Update current language display
    const current = languages.find(l => l.code === currentLanguage);
    if (current) {
        currentLangFlag.textContent = current.flag;
        currentLangName.textContent = current.name;
    }
    
    // Toggle dropdown
    languageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        languageDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.language-selector')) {
            languageDropdown.classList.remove('show');
        }
    });
    
    // Language selection
    languageDropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.language-option');
        if (!option) return;
        
        const langCode = option.dataset.lang;
        setLanguage(langCode);
        
        // Update UI
        const selectedLang = languages.find(l => l.code === langCode);
        if (selectedLang) {
            currentLangFlag.textContent = selectedLang.flag;
            currentLangName.textContent = selectedLang.name;
        }
        
        // Update selected state
        languageDropdown.querySelectorAll('.language-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.lang === langCode);
        });
        
        languageDropdown.classList.remove('show');
    });
}

// Initialize language system on page load
initializeLanguageSelector();
updateUILanguage();

// ──────────────────────────────────────────────────────────────────────────

playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createRoomBtn.click();
});

roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoomBtn.click();
});

createRoomBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) { showToast('Enter your name first!', 'error'); return; }
    const mode = gameModeSelect.value;
    const lobbyRoundsSelect = document.getElementById('lobby-rounds-select');
    const rounds = lobbyRoundsSelect ? parseInt(lobbyRoundsSelect.value) : 5;
    socket.emit('createRoom', { playerName: name, avatarId: selectedAvatarId, mode: mode, isPublic: false, rounds: rounds });
});

joinRoomBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!name) { showToast('Enter your name first!', 'error'); return; }
    if (!code) { showToast('Enter a room code!', 'error'); return; }
    socket.emit('joinRoom', { roomCode: code, playerName: name, avatarId: selectedAvatarId });
});

quickPlayBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) { showToast('Enter your name first!', 'error'); return; }
    socket.emit('quickPlay', { playerName: name, avatarId: selectedAvatarId });
});

leaderboardBtn.addEventListener('click', () => {
    showLeaderboard();
});

copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomCode).then(() => {
        copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => copyCodeBtn.textContent = 'Copy', 1500);
    });
});

shareWhatsAppBtn.addEventListener('click', () => {
    const url = window.location.href.split('?')[0];
    const msg = `Join my Chitrakaar game!\nRoom Code: ${roomCode}\nMode: ${MODE_LABELS[currentMode] || 'Classic'}\n\nPlay here: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
});

startGameBtn.addEventListener('click', () => {
    socket.emit('startGame');
});

// Rounds selector - only host can change
const roundsSelect = document.getElementById('rounds-select');
roundsSelect.addEventListener('change', () => {
    const rounds = parseInt(roundsSelect.value);
    socket.emit('updateRounds', { rounds });
});

function updateWaitingRoom(playerArray) {
    playerList.innerHTML = playerArray.map((p, i) => {
        const avatar = AVATARS[p.avatarId || 0];
        return `
    <div class="player-tag ${i === 0 ? 'host' : ''}">
      <span class="avatar-dot" style="background:${avatar.color}">${avatar.label}</span>
      <span>${escapeHtml(p.name)}${i === 0 ? ' (Host)' : ''}</span>
    </div>`;
    }).join('');

    startGameBtn.classList.toggle('hidden', playerArray.length < 2 || playerArray[0]?.id !== myId);
}

function updateGamePlayerList(playerArray, drawerId) {
    const guessedIds = [];
    document.querySelectorAll('.game-player-item.guessed').forEach(el => {
        const dataId = el.getAttribute('data-id');
        if (dataId) guessedIds.push(dataId);
    });

    gamePlayerList.innerHTML = playerArray.map((p) => {
        const isCurrentDrawer = p.id === drawerId;
        const hasGuessed = guessedIds.includes(p.id);
        const avatar = AVATARS[p.avatarId || 0];

        let statusText = '';
        if (isCurrentDrawer) statusText = 'Drawing';
        else if (hasGuessed) statusText = 'Guessed';

        return `
      <div class="game-player-item ${isCurrentDrawer ? 'drawing' : ''} ${hasGuessed ? 'guessed' : ''}" data-id="${p.id}">
        <div class="player-avatar" style="background:${avatar.color}">${avatar.label}</div>
        <div class="player-info">
          <div class="player-name">${escapeHtml(p.name)}${p.id === myId ? ' (You)' : ''}</div>
          <div class="player-score">${p.score} pts</div>
        </div>
        ${statusText ? `<div class="player-status">${statusText}</div>` : ''}
      </div>`;
    }).join('');
}

let backdrop = null;

function createBackdrop() {
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'panel-backdrop';
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', closeAllPanels);
    }
}

function closeAllPanels() {
    playersPanel.classList.remove('open');
    chatPanel.classList.remove('open');
    togglePlayersBtn.classList.remove('active');
    toggleChatBtn.classList.remove('active');
    if (backdrop) backdrop.classList.remove('visible');
}

togglePlayersBtn.addEventListener('click', () => {
    createBackdrop();
    const isOpen = playersPanel.classList.toggle('open');
    chatPanel.classList.remove('open');
    togglePlayersBtn.classList.toggle('active', isOpen);
    toggleChatBtn.classList.remove('active');
    backdrop.classList.toggle('visible', isOpen);
});

toggleChatBtn.addEventListener('click', () => {
    createBackdrop();
    const isOpen = chatPanel.classList.toggle('open');
    playersPanel.classList.remove('open');
    toggleChatBtn.classList.toggle('active', isOpen);
    togglePlayersBtn.classList.remove('active');
    backdrop.classList.toggle('visible', isOpen);
});

closePlayersBtn.addEventListener('click', closeAllPanels);
closeChatBtn.addEventListener('click', closeAllPanels);

function resizeCanvas() {
    const area = canvas.parentElement;
    
    // Force reflow to get accurate measurements
    area.style.display = 'none';
    area.offsetHeight; // trigger reflow
    area.style.display = '';
    
    const rect = area.getBoundingClientRect();
    const topBar = area.querySelector('.game-top-bar');
    const tools = area.querySelector('.tools-bar');
    const topH = topBar ? topBar.offsetHeight : 50;
    const toolH = (tools && !tools.classList.contains('hidden')) ? tools.offsetHeight : 0;

    // Calculate available space explicitly
    const availableWidth = Math.floor(rect.width);
    const availableHeight = Math.floor(rect.height - topH - toolH);

    // Save current canvas content before resizing (only if canvas has content)
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    let canvasData = null;
    
    // Only save if canvas has been initialized (width > 0)
    if (oldWidth > 0 && oldHeight > 0) {
        canvasData = canvas.toDataURL();
    }

    // Set canvas dimensions to fill available space
    canvas.width = availableWidth;
    canvas.height = availableHeight;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Restore canvas content after resize if it existed
    if (canvasData) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, oldWidth, oldHeight, 0, 0, canvas.width, canvas.height);
        };
        img.src = canvasData;
    }
    
    console.log(`Canvas resized to ${canvas.width}x${canvas.height} (container: ${rect.width}x${rect.height})`);
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeCanvas();
        // Call again after a short delay to ensure proper sizing
        setTimeout(resizeCanvas, 50);
    }, 100);
});

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return [x / rect.width, y / rect.height]; // normalized 0-1
}

function drawLine(x1, y1, x2, y2, color, size) {
    ctx.beginPath();
    ctx.moveTo(x1 * canvas.width, y1 * canvas.height);
    ctx.lineTo(x2 * canvas.width, y2 * canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function floodFill(startX, startY, fillColor) {
    const w = canvas.width, h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const sx = Math.round(startX * w), sy = Math.round(startY * h);
    const idx = (sy * w + sx) * 4;
    const tR = data[idx], tG = data[idx + 1], tB = data[idx + 2];

    const fc = hexToRgb(fillColor);
    if (tR === fc.r && tG === fc.g && tB === fc.b) return;

    const stack = [[sx, sy]];
    const visited = new Set();

    while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        const key = cy * w + cx;
        if (visited.has(key)) continue;
        visited.add(key);

        const ci = key * 4;
        if (Math.abs(data[ci] - tR) > 30 || Math.abs(data[ci + 1] - tG) > 30 || Math.abs(data[ci + 2] - tB) > 30) continue;

        data[ci] = fc.r; data[ci + 1] = fc.g; data[ci + 2] = fc.b; data[ci + 3] = 255;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    ctx.putImageData(imgData, 0, 0);
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function handleDrawStart(e) {
    e.preventDefault();
    if (!isDrawer) return;
    isDrawing = true;
    [lastX, lastY] = getPos(e);

    if (isFillMode) {
        const color = isEraser ? '#ffffff' : currentColor;
        floodFill(lastX, lastY, color);
        socket.emit('draw', { type: 'fill', x: lastX, y: lastY, color });
        saveDrawState();
        isDrawing = false;
    }
}

function handleDrawMove(e) {
    e.preventDefault();
    if (!isDrawing || !isDrawer) return;
    const [x, y] = getPos(e);
    const color = isEraser ? '#ffffff' : currentColor;
    drawLine(lastX, lastY, x, y, color, currentSize);
    socket.emit('draw', { type: 'line', x1: lastX, y1: lastY, x2: x, y2: y, color, size: currentSize });
    [lastX, lastY] = [x, y];
}

function handleDrawEnd(e) {
    if (!isDrawing) return;
    isDrawing = false;
    if (isDrawer) saveDrawState();
}

function saveDrawState() {
    drawHistory.push(canvas.toDataURL());
    if (drawHistory.length > 30) drawHistory.shift();
}

canvas.addEventListener('mousedown', handleDrawStart);
canvas.addEventListener('mousemove', handleDrawMove);
canvas.addEventListener('mouseup', handleDrawEnd);
canvas.addEventListener('mouseleave', handleDrawEnd);
canvas.addEventListener('touchstart', handleDrawStart, { passive: false });
canvas.addEventListener('touchmove', handleDrawMove, { passive: false });
canvas.addEventListener('touchend', handleDrawEnd);

document.getElementById('color-palette').addEventListener('click', (e) => {
    const btn = e.target.closest('.color-btn');
    if (!btn) return;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    currentColor = btn.dataset.color;
    isEraser = false;
    document.getElementById('eraser-btn').classList.remove('active');
});

document.querySelectorAll('.brush-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentSize = parseInt(btn.dataset.size);
    });
});

document.getElementById('eraser-btn').addEventListener('click', () => {
    isEraser = !isEraser;
    isFillMode = false;
    document.getElementById('eraser-btn').classList.toggle('active', isEraser);
    document.getElementById('fill-btn').classList.remove('active');
});

document.getElementById('fill-btn').addEventListener('click', () => {
    isFillMode = !isFillMode;
    isEraser = false;
    document.getElementById('fill-btn').classList.toggle('active', isFillMode);
    document.getElementById('eraser-btn').classList.remove('active');
});

document.getElementById('undo-btn').addEventListener('click', () => {
    if (drawHistory.length > 1) {
        drawHistory.pop();
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = drawHistory[drawHistory.length - 1];
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawHistory = [];
    }
});

document.getElementById('clear-btn').addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawHistory = [];
    socket.emit('clearCanvas');
});

document.getElementById('save-btn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `chitrakaar-drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    showToast('Drawing saved! 📥', 'success');
});

sendBtn.addEventListener('click', () => {
    const msg = chatInput.value.trim();
    if (!msg) return;
    socket.emit('chatMessage', { message: msg });
    chatInput.value = '';
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// Quick Chat functionality
document.getElementById('quick-chat').addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-chat-btn');
    if (!btn || isDrawer || chatInput.disabled) return;
    const msgKey = btn.dataset.msg;
    // Send translated message
    const msg = t(msgKey);
    socket.emit('chatMessage', { message: msg });
});

socket.on('connect', () => { myId = socket.id; });

socket.on('error', ({ message }) => { showToast(message, 'error'); });

// Room Created
socket.on('roomCreated', ({ code, mode, isPublic: pub, players: playerArray, totalRounds }) => {
    roomCode = code;
    currentMode = mode || 'classic';
    players = playerArray;
    displayRoomCode.textContent = code;
    displayMode.textContent = MODE_LABELS[currentMode] || 'Classic';
    displayPublic.classList.toggle('hidden', !pub);
    // Update rounds selector
    if (totalRounds) {
        roundsSelect.value = totalRounds;
    }
    updateWaitingRoom(playerArray);
    showScreen('waiting-screen');
});

// Room Joined
socket.on('roomJoined', ({ code, mode, isPublic: pub, players: playerArray, totalRounds }) => {
    roomCode = code;
    currentMode = mode || 'classic';
    players = playerArray;
    displayRoomCode.textContent = code;
    displayMode.textContent = MODE_LABELS[currentMode] || 'Classic';
    displayPublic.classList.toggle('hidden', !pub);
    // Update rounds selector
    if (totalRounds) {
        roundsSelect.value = totalRounds;
    }
    // Disable rounds selector for non-host players
    roundsSelect.disabled = true;
    updateWaitingRoom(playerArray);
    showScreen('waiting-screen');
});

// Player Joined
socket.on('playerJoined', ({ playerName, players: playerArray }) => {
    players = playerArray;
    updateWaitingRoom(playerArray);
    addChatMessage('', `${playerName} joined the room`, 'system');
});

// Player Left
socket.on('playerLeft', ({ playerName, players: playerArray }) => {
    players = playerArray;
    if (gameScreen.classList.contains('active')) {
        updateGamePlayerList(playerArray, null);
    }
    addChatMessage('', `${playerName} left the room`, 'system');
});

// Rounds Updated
socket.on('roundsUpdated', ({ totalRounds }) => {
    if (roundsSelect) {
        roundsSelect.value = totalRounds;
    }
});

// Auto Starting
socket.on('autoStarting', ({ countdown }) => {
    autoStartHint.classList.remove('hidden');
    autoStartHint.textContent = `Game auto-starting in ${countdown} seconds...`;
});

// Game Started
socket.on('gameStarted', ({ round, totalRounds, drawerName, drawerId, mode, turnTime }) => {
    currentMode = mode || currentMode;
    currentTurnTime = turnTime || 80;
    showScreen('game-screen');
    setTimeout(resizeCanvas, 50);

    roundText.textContent = `Round ${round}/${totalRounds}`;
    modeLabel.textContent = MODE_LABELS[currentMode] || 'Classic';
    gameoverOverlay.classList.add('hidden');
    turnOverlay.classList.remove('hidden');
    turnInfo.textContent = `${drawerName} is choosing a word...`;
    wordChoicesDiv.classList.add('hidden');

    updateGamePlayerList(players, drawerId);

    wordHint.textContent = 'Waiting...';
    addChatMessage('', `Game started! Round ${round}/${totalRounds}`, 'system');
    addChatMessage('', `${drawerName} is drawing!`, 'system');
});

// New Turn
socket.on('newTurn', ({ round, totalRounds, drawerName, drawerId }) => {
    roundText.textContent = `Round ${round}/${totalRounds}`;
    wordHint.textContent = 'Waiting...';
    turnOverlay.classList.remove('hidden');
    turnInfo.textContent = `${drawerName} is choosing a word...`;
    wordChoicesDiv.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');

    updateGamePlayerList(players, drawerId);
    addChatMessage('', `${drawerName}'s turn to draw!`, 'system');
});

// Drawer Choosing
socket.on('drawerChoosing', ({ drawerName, drawerId }) => {
    const isMe = drawerId === myId;
    isDrawer = isMe;
    turnInfo.textContent = isMe ? 'Choose a word to draw!' : `${drawerName} is choosing a word...`;
    toolsBar.classList.toggle('hidden', !isMe);
    canvas.style.cursor = isMe ? 'crosshair' : 'default';
    chatInput.disabled = isMe;
    chatInput.placeholder = isMe ? "You're drawing! No chatting" : "Type your guess...";
});

socket.on('chooseWord', (words) => {
    wordChoicesDiv.innerHTML = '';
    words.forEach(w => {
        const btn = document.createElement('button');
        btn.className = 'word-choice-btn';
        btn.textContent = w;
        btn.onclick = () => {
            socket.emit('wordChosen', { word: w });
            wordChoicesDiv.classList.add('hidden');
        };
        wordChoicesDiv.appendChild(btn);
    });
    wordChoicesDiv.classList.remove('hidden');
});

// Word Selected
socket.on('wordSelected', ({ word, isDrawer: isMe }) => {
    turnOverlay.classList.add('hidden');
    wordHint.textContent = word;
    isDrawer = isMe;
    toolsBar.classList.toggle('hidden', !isMe);
    canvas.style.cursor = isMe ? 'crosshair' : 'default';
    chatInput.disabled = isMe;
    chatInput.placeholder = isMe ? "You're drawing! No chatting" : "Type your guess...";

    if (isMe) {
        drawHistory = [];
        saveDrawState();
        setTimeout(resizeCanvas, 50);
    }
});

socket.on('hintRevealed', ({ hint }) => {
    wordHint.textContent = hint;
    wordHint.classList.add('hint-revealed');
    setTimeout(() => wordHint.classList.remove('hint-revealed'), 600);
    
    // Show notification overlay
    const notification = document.createElement('div');
    notification.className = 'hint-notification';
    notification.textContent = '💡 Letter revealed!';
    document.querySelector('.canvas-area').appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
    
    showToast('💡 Hint revealed!', 'info');
});

// Drawing events from others
socket.on('draw', (data) => {
    if (data.type === 'line') {
        drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.size);
    } else if (data.type === 'fill') {
        floodFill(data.x, data.y, data.color);
    }
});

socket.on('clearCanvas', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// Chat Message
socket.on('chatMessage', ({ playerName, message, type }) => {
    addChatMessage(playerName, message, type);
});

// Correct Guess
socket.on('correctGuess', ({ playerName, playerId, score, scores }) => {
    addChatMessage('', `${playerName} guessed it! (+${score} pts)`, 'correct');
    scores.forEach(s => {
        const p = players.find(pp => pp.id === s.id);
        if (p) p.score = s.score;
    });

    updateGamePlayerList(players, null);

    if (playerId === myId) {
        spawnConfetti();
        playSuccessSound();
        chatInput.disabled = true;
        chatInput.placeholder = "You guessed it! 🎉";
        showToast('🎉 Shabash! You got it!', 'success');
    } else {
        showToast(`${playerName} guessed the word!`, 'info');
    }
});

// Timer
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playTickSound(timeLeft) {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const basePitch = timeLeft <= 5 ? 900 : timeLeft <= 10 ? 700 : 500;
        oscillator.frequency.setValueAtTime(basePitch, ctx.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.12);
    } catch (e) {
        // Audio not supported
    }
}

function playSuccessSound() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        // Play a cheerful ascending tone
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
            oscillator.type = 'sine';

            const startTime = ctx.currentTime + (i * 0.1);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.25);
        });
    } catch (e) {
        // Audio not supported
    }
}

socket.on('timerUpdate', (timeLeft) => {
    timerText.textContent = timeLeft;
    const pct = (timeLeft / currentTurnTime) * 100;
    timerPath.style.strokeDashoffset = 100 - pct;

    timerPath.classList.remove('warning', 'danger');
    if (timeLeft <= 10) timerPath.classList.add('danger');
    else if (timeLeft <= 25) timerPath.classList.add('warning');

    if (timeLeft <= 15 && timeLeft > 0) {
        playTickSound(timeLeft);
    }
});

// Turn End
socket.on('turnEnd', ({ word, scores }) => {
    wordHint.textContent = `The word was: ${word}`;
    chatInput.disabled = false;
    chatInput.placeholder = 'Type your guess...';

    addChatMessage('', `Turn over! The word was "${word}"`, 'system');

    scores.forEach(s => {
        const p = players.find(pp => pp.id === s.id);
        if (p) p.score = s.score;
    });
    updateGamePlayerList(players, null);
});

// Game Over
socket.on('gameOver', ({ players: sortedPlayers, winner }) => {
    turnOverlay.classList.add('hidden');
    toolsBar.classList.add('hidden');

    const medals = ['1st', '2nd', '3rd'];
    finalScores.innerHTML = sortedPlayers.map((p, i) => `
    <div class="final-score-item">
      <span class="medal">${medals[i] || `${i + 1}th`}</span>
      <span>${escapeHtml(p.name)}${p.id === myId ? ' (You)' : ''}</span>
      <span class="score-val">${p.score} pts</span>
    </div>
    `).join('');

    gameoverOverlay.classList.remove('hidden');

    // Save player stats to leaderboard
    const myPlayer = sortedPlayers.find(p => p.id === myId);
    if (myPlayer && typeof savePlayerStats === 'function') {
        savePlayerStats(myPlayer.name, myPlayer.score, currentMode);
    }

    if (winner.id === myId) {
        spawnConfetti();
        setTimeout(spawnConfetti, 1000);
    }

    addChatMessage('', `Game Over! ${winner.name} wins with ${winner.score} pts!`, 'system');
});

// Game Ended (not enough players)
socket.on('gameEnded', ({ message }) => {
    showToast(message, 'error');
    showScreen('waiting-screen');
    if (players.length > 0) {
        updateWaitingRoom(players);
    }
});

// Room Update (after game reset)
socket.on('roomUpdate', ({ players: playerArray, state }) => {
    players = playerArray;
    if (state === 'waiting') {
        showScreen('waiting-screen');
        updateWaitingRoom(playerArray);
    }
});
