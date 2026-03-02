// Leaderboard system for Chitrakaar

// Store player stats in localStorage
function savePlayerStats(playerName, score, gameMode) {
    const stats = getLeaderboardData();
    const timestamp = Date.now();
    const today = new Date().toDateString();
    
    const entry = {
        name: playerName,
        score: score,
        mode: gameMode,
        timestamp: timestamp,
        date: today
    };
    
    stats.push(entry);
    
    // Keep only last 1000 entries
    if (stats.length > 1000) {
        stats.shift();
    }
    
    localStorage.setItem('chitrakaar-stats', JSON.stringify(stats));
}

// Get leaderboard data
function getLeaderboardData() {
    const data = localStorage.getItem('chitrakaar-stats');
    return data ? JSON.parse(data) : [];
}

// Calculate top players for today
function getTodayTopPlayers(limit = 10) {
    const stats = getLeaderboardData();
    const today = new Date().toDateString();
    
    // Filter today's games
    const todayGames = stats.filter(entry => entry.date === today);
    
    // Group by player name and calculate total score
    const playerScores = {};
    const playerGames = {};
    
    todayGames.forEach(entry => {
        if (!playerScores[entry.name]) {
            playerScores[entry.name] = 0;
            playerGames[entry.name] = 0;
        }
        playerScores[entry.name] += entry.score;
        playerGames[entry.name] += 1;
    });
    
    // Convert to array and sort
    const leaderboard = Object.keys(playerScores).map(name => ({
        name: name,
        score: playerScores[name],
        gamesPlayed: playerGames[name],
        avgScore: Math.round(playerScores[name] / playerGames[name])
    }));
    
    leaderboard.sort((a, b) => b.score - a.score);
    
    return leaderboard.slice(0, limit);
}

// Calculate all-time top players
function getAllTimeTopPlayers(limit = 10) {
    const stats = getLeaderboardData();
    
    // Group by player name
    const playerScores = {};
    const playerGames = {};
    
    stats.forEach(entry => {
        if (!playerScores[entry.name]) {
            playerScores[entry.name] = 0;
            playerGames[entry.name] = 0;
        }
        playerScores[entry.name] += entry.score;
        playerGames[entry.name] += 1;
    });
    
    // Convert to array and sort
    const leaderboard = Object.keys(playerScores).map(name => ({
        name: name,
        score: playerScores[name],
        gamesPlayed: playerGames[name],
        avgScore: Math.round(playerScores[name] / playerGames[name])
    }));
    
    leaderboard.sort((a, b) => b.score - a.score);
    
    return leaderboard.slice(0, limit);
}

// Show leaderboard modal — fetches all-time rankings from server
async function showLeaderboard() {
    // Remove any existing instance
    const existing = document.getElementById('lb-standalone-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'lb-standalone-modal';
    modal.className = 'leaderboard-modal';
    modal.innerHTML = `
        <div class="leaderboard-overlay"></div>
        <div class="leaderboard-content">
            <div class="leaderboard-header">
                <h2>🏆 Hall of Fame</h2>
                <button class="close-leaderboard" aria-label="Close">×</button>
            </div>
            <div class="leaderboard-body" id="lb-standalone-body">
                <p style="text-align:center;padding:24px;opacity:.6;">Loading…</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));

    const close = () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 200);
    };
    modal.querySelector('.close-leaderboard').addEventListener('click', close);
    modal.querySelector('.leaderboard-overlay').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    // Fetch from server
    try {
        const res = await fetch('/api/leaderboard/alltime');
        const players = await res.json();
        document.getElementById('lb-standalone-body').innerHTML =
            Array.isArray(players) && players.length
                ? renderServerLeaderboard(players)
                : '<p style="text-align:center;padding:24px;opacity:.6;">No scores yet — play a game!</p>';
    } catch (_) {
        document.getElementById('lb-standalone-body').innerHTML =
            '<p style="text-align:center;padding:24px;opacity:.6;">Could not load scores. Try again later.</p>';
    }
}

function renderServerLeaderboard(players) {
    const medals = ['🥇', '🥈', '🥉'];
    const rows = players.map((p, i) => `
        <tr class="rank-${i + 1}">
            <td class="rank-cell">${medals[i] || i + 1}</td>
            <td class="player-cell">${escapeHtml(p.displayName || p.username)}</td>
            <td class="score-cell">${p.totalScore || 0}</td>
            <td class="games-cell">${p.gamesPlayed || 0}</td>
            <td class="avg-cell">${p.gamesPlayed ? Math.round((p.totalScore || 0) / p.gamesPlayed) : 0}</td>
        </tr>`).join('');
    return `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Rank</th><th>Player</th><th>Score</th><th>Games</th><th>Avg</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// Render leaderboard table
function renderLeaderboardTable(players) {
    if (players.length === 0) {
        return '<p class="no-data">No games played yet! Be the first!</p>';
    }
    
    return `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th data-i18n="rank">Rank</th>
                    <th data-i18n="player">Player</th>
                    <th data-i18n="score">Score</th>
                    <th data-i18n="gamesPlayed">Games</th>
                    <th>Avg</th>
                </tr>
            </thead>
            <tbody>
                ${players.map((player, index) => `
                    <tr class="rank-${index + 1}">
                        <td class="rank-cell">
                            ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </td>
                        <td class="player-cell">${escapeHtml(player.name)}</td>
                        <td class="score-cell">${player.score}</td>
                        <td class="games-cell">${player.gamesPlayed}</td>
                        <td class="avg-cell">${player.avgScore}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        savePlayerStats,
        getLeaderboardData,
        getTodayTopPlayers,
        getAllTimeTopPlayers,
        showLeaderboard
    };
}
