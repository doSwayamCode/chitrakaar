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

// Show leaderboard modal
function showLeaderboard() {
    const modal = document.createElement('div');
    modal.className = 'leaderboard-modal';
    modal.innerHTML = `
        <div class="leaderboard-overlay"></div>
        <div class="leaderboard-content">
            <div class="leaderboard-header">
                <h2 data-i18n="leaderboard">Leaderboard</h2>
                <button class="close-leaderboard" aria-label="Close">×</button>
            </div>
            
            <div class="leaderboard-tabs">
                <button class="leaderboard-tab active" data-tab="today" data-i18n="topPlayers">Top Players Today</button>
                <button class="leaderboard-tab" data-tab="alltime">All Time</button>
            </div>
            
            <div class="leaderboard-body">
                <div class="leaderboard-tab-content active" id="today-leaderboard">
                    ${renderLeaderboardTable(getTodayTopPlayers())}
                </div>
                <div class="leaderboard-tab-content" id="alltime-leaderboard">
                    ${renderLeaderboardTable(getAllTimeTopPlayers())}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close button
    modal.querySelector('.close-leaderboard').addEventListener('click', () => {
        modal.remove();
    });
    
    // Close on overlay click
    modal.querySelector('.leaderboard-overlay').addEventListener('click', () => {
        modal.remove();
    });
    
    // Tab switching
    modal.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            modal.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.leaderboard-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            modal.querySelector(`#${tabName}-leaderboard`).classList.add('active');
        });
    });
    
    // Apply translations
    if (typeof updateUILanguage === 'function') {
        updateUILanguage();
    }
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
