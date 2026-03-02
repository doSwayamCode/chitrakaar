// Leaderboard system for Chitrakaar

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
    const rows = players.map((p, i) => {
        const score  = p.stats?.totalScore  ?? 0;
        const games  = p.stats?.gamesPlayed ?? 0;
        const avg    = games ? Math.round(score / games) : 0;
        return `
        <tr class="rank-${i + 1}">
            <td class="rank-cell">${medals[i] || i + 1}</td>
            <td class="player-cell">${escapeHtml(p.displayName || p.username || 'Guest')}</td>
            <td class="score-cell">${score}</td>
            <td class="games-cell">${games}</td>
            <td class="avg-cell">${avg}</td>
        </tr>`;
    }).join('');
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

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showLeaderboard };
}
