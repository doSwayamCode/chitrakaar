// ─── Chitrakaar Player Profile System ────────────────────────────────────────
// Manages: login, registration, stats display, badge notifications, auto-fill.
// All API calls go to /api/profile/* routes defined in server.js.
// localStorage keys:
//   chitrakaar-profile-username  → stored username (lowercase)
//   chitrakaar-profile-pin       → stored raw PIN (4 digits as string)
//   chitrakaar-profile-data      → cached profile JSON
// ──────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // ─── Session ─────────────────────────────────────────────────────────────

    const LS_USER = 'chitrakaar-profile-username';
    const LS_PIN  = 'chitrakaar-profile-pin';
    const LS_DATA = 'chitrakaar-profile-data';

    function getSession() {
        return {
            username: localStorage.getItem(LS_USER),
            pin:      localStorage.getItem(LS_PIN),
            data:     JSON.parse(localStorage.getItem(LS_DATA) || 'null'),
        };
    }

    function saveSession(username, pin, profileData) {
        localStorage.setItem(LS_USER, username);
        localStorage.setItem(LS_PIN,  pin);
        localStorage.setItem(LS_DATA, JSON.stringify(profileData));
    }

    function clearSession() {
        localStorage.removeItem(LS_USER);
        localStorage.removeItem(LS_PIN);
        localStorage.removeItem(LS_DATA);
    }

    function isLoggedIn() {
        const s = getSession();
        return !!(s.username && s.pin);
    }

    // ─── API Layer ────────────────────────────────────────────────────────────

    async function apiPost(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return res.json();
    }

    async function apiGet(url) {
        const res = await fetch(url);
        return res.json();
    }

    // ─── Modal Helpers ────────────────────────────────────────────────────────

    function getModal()   { return document.getElementById('profile-modal'); }
    function showModal()  { getModal().classList.add('active'); }
    function closeModal() { getModal().classList.remove('active'); }

    function setModalError(msg) {
        const el = document.getElementById('profile-error');
        if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
    }

    function setModalLoading(btn, loading) {
        btn.disabled = loading;
        btn.textContent = loading ? 'Please wait...' : btn.dataset.label;
    }

    // ─── Profile UI ───────────────────────────────────────────────────────────

    function renderBadgesRow(badgeIds, allBadges) {
        if (!badgeIds || badgeIds.length === 0) {
            return '<span class="profile-no-badges">No badges yet — keep playing!</span>';
        }
        return badgeIds.map(id => {
            const badge = allBadges.find(b => b.id === id);
            if (!badge) return '';
            return `<span class="badge-chip" title="${badge.name}: ${badge.desc}">${badge.icon} ${badge.name}</span>`;
        }).join('');
    }

    function renderProfileCard(profile, allBadges) {
        const { displayName, username, stats, streak, badges, favouriteMode } = profile;
        const winRate = stats.gamesPlayed > 0
            ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
            : 0;

        return `
        <div class="profile-card">
            <div class="profile-header">
                <div class="profile-avatar-large">${displayName.charAt(0).toUpperCase()}</div>
                <div class="profile-identity">
                    <div class="profile-display-name">${escapeHtmlProfile(displayName)}</div>
                    <div class="profile-username">@${escapeHtmlProfile(username)}</div>
                </div>
            </div>

            <div class="profile-streak ${streak.current >= 3 ? 'streak-hot' : ''}">
                <div class="streak-bar"></div>
                <div class="streak-info">
                    <div class="streak-count">${streak.current} <span class="streak-unit">day${streak.current !== 1 ? 's' : ''}</span></div>
                    <div class="streak-label">Current streak · Longest: ${streak.longest}</div>
                </div>
            </div>

            <div class="profile-stats-grid">
                <div class="profile-stat">
                    <div class="stat-val">${stats.gamesPlayed}</div>
                    <div class="stat-lbl">Games</div>
                </div>
                <div class="profile-stat">
                    <div class="stat-val">${stats.gamesWon}</div>
                    <div class="stat-lbl">Wins</div>
                </div>
                <div class="profile-stat">
                    <div class="stat-val">${winRate}%</div>
                    <div class="stat-lbl">Win Rate</div>
                </div>
                <div class="profile-stat">
                    <div class="stat-val">${stats.bestScore}</div>
                    <div class="stat-lbl">Best Score</div>
                </div>
                <div class="profile-stat">
                    <div class="stat-val">${stats.totalScore.toLocaleString()}</div>
                    <div class="stat-lbl">Total Score</div>
                </div>
                <div class="profile-stat">
                    <div class="stat-val">${favouriteMode || '—'}</div>
                    <div class="stat-lbl">Fav Mode</div>
                </div>
            </div>

            <div class="profile-badges-section">
                <div class="profile-section-title">Badges (${badges.length}/${allBadges.length})</div>
                <div class="profile-badges-row">
                    ${renderBadgesRow(badges, allBadges)}
                </div>
            </div>

            <div class="profile-actions">
                <button id="profile-refresh-btn" class="btn btn-secondary btn-small">↺ Refresh</button>
                <button id="profile-logout-btn" class="btn btn-small" style="background:#333;color:#aaa;border:1px solid #444">Logout</button>
            </div>
        </div>`;
    }

    function renderAllTimeLB(players, allBadges) {
        if (!players || players.length === 0) {
            return '<div class="lb-empty">No players yet. Be the first!</div>';
        }
        const rankClass = ['rank-gold', 'rank-silver', 'rank-bronze'];
        return players.map((p, i) => {
            const isGuest = !!p.isGuest;
            const score   = isGuest ? p.score : (p.stats ? p.stats.totalScore : 0);
            const name    = isGuest ? escapeHtmlProfile(p.displayName) : escapeHtmlProfile(p.displayName);
            const metaHtml = isGuest
                ? '<span class="lb-guest-tag">Guest</span>'
                : `${p.stats ? p.stats.gamesPlayed : 0}G · ${p.streak ? p.streak.current : 0}d streak`;
            const badgeHtml = (!isGuest && p.badges && p.badges.length > 0)
                ? '<span class="lb-badge-icon">' + getBestBadgeIcon(p.badges, allBadges) + '</span>'
                : '';
            return `
            <div class="lb-row ${i < 3 ? 'lb-top' : ''} ${isGuest ? 'lb-guest-row' : ''}">
                <span class="lb-rank ${rankClass[i] || ''}">${String(i + 1).padStart(2, '0')}</span>
                <span class="lb-name">${name}${badgeHtml}</span>
                <span class="lb-score">${score.toLocaleString()} pts</span>
                <span class="lb-meta">${metaHtml}</span>
            </div>`;
        }).join('');
    }

    function getBestBadgeIcon(badgeIds, allBadges) {
        // Priority order for display badge
        const priority = ['centurion', 'unbeatable', 'champion', 'veteran', 'streak_30', 'streak_7', 'high_scorer', 'hat_trick', 'streak_3', 'winner', 'first_game'];
        for (const id of priority) {
            if (badgeIds.includes(id)) {
                const b = allBadges.find(x => x.id === id);
                if (b) return b.icon;
            }
        }
        return '';
    }

    // ─── Modal Render ─────────────────────────────────────────────────────────

    async function renderModal(activeTab) {
        const modal = getModal();
        const logged = isLoggedIn();

        if (logged && activeTab !== 'leaderboard') {
            // Logged in — show profile card
            const session = getSession();
            let allBadges = [];
            try { allBadges = await apiGet('/api/badges'); } catch (_) {}

            // Refresh profile from server
            let profile = session.data;
            try {
                const fresh = await apiGet(`/api/profile/${session.username}`);
                if (!fresh.error) {
                    profile = fresh;
                    saveSession(session.username, session.pin, profile);
                }
            } catch (_) {}

            modal.querySelector('.profile-modal-body').innerHTML = `
                <div class="profile-tabs">
                    <button class="ptab ${activeTab !== 'leaderboard' ? 'active' : ''}" data-tab="profile">My Profile</button>
                    <button class="ptab ${activeTab === 'leaderboard' ? 'active' : ''}" data-tab="leaderboard">Hall of Fame</button>
                </div>
                ${renderProfileCard(profile, allBadges)}`;

            // Bind events
            bindTabEvents();
            document.getElementById('profile-logout-btn').addEventListener('click', () => {
                clearSession();
                updateLobbyProfileBtn();
                renderModal('login');
            });
            document.getElementById('profile-refresh-btn').addEventListener('click', () => renderModal('profile'));
        } else if (activeTab === 'leaderboard') {
            let allBadges = [], players = [];
            try { allBadges = await apiGet('/api/badges'); } catch (_) {}
            try {
                const res = await apiGet('/api/leaderboard/alltime');
                if (Array.isArray(res)) players = res;
            } catch (_) {}

            modal.querySelector('.profile-modal-body').innerHTML = `
                <div class="profile-tabs">
                    ${logged ? `<button class="ptab" data-tab="profile">My Profile</button>` : `<button class="ptab" data-tab="login">Login</button>`}
                    <button class="ptab active" data-tab="leaderboard">Hall of Fame</button>
                </div>
                <div class="lb-container">
                    <div class="lb-title">All-Time Top Players</div>
                    ${renderAllTimeLB(players, allBadges)}
                </div>`;
            bindTabEvents();
        } else {
            // Not logged in — show login/register tabs
            const isRegister = activeTab === 'register';
            modal.querySelector('.profile-modal-body').innerHTML = `
                <div class="profile-tabs">
                    <button class="ptab ${!isRegister ? 'active' : ''}" data-tab="login">Login</button>
                    <button class="ptab ${isRegister ? 'active' : ''}" data-tab="register">Create Profile</button>
                    <button class="ptab" data-tab="leaderboard">Hall of Fame</button>
                </div>
                <div id="profile-error" class="profile-error" style="display:none"></div>
                ${isRegister ? renderRegisterForm() : renderLoginForm()}`;

            bindTabEvents();
            if (isRegister) bindRegisterForm();
            else bindLoginForm();
        }
    }

    function renderLoginForm() {
        return `
            <div class="profile-auth-form">
                <p class="auth-subtitle">Log in to track your stats, streaks &amp; badges.</p>
                <input class="profile-input" id="login-username" type="text" placeholder="Username" autocomplete="off" maxlength="20" />
                <input class="profile-input" id="login-pin" type="password" placeholder="4-digit PIN" inputmode="numeric" maxlength="4" />
                <button class="btn btn-primary" id="login-submit-btn" data-label="Login">Login</button>
                <p class="auth-small">No account? Switch to <a href="#" id="goto-register">Create Profile</a>.</p>
            </div>`;
    }

    function renderRegisterForm() {
        return `
            <div class="profile-auth-form">
                <p class="auth-subtitle">Create a free profile — just a name and a 4-digit PIN. No email needed.</p>
                <input class="profile-input" id="reg-displayname" type="text" placeholder="Display name (e.g. Swayam)" autocomplete="off" maxlength="20" />
                <input class="profile-input" id="reg-username" type="text" placeholder="Username (e.g. swayam123)" autocomplete="off" maxlength="20" />
                <input class="profile-input" id="reg-pin" type="password" placeholder="Choose a 4-digit PIN" inputmode="numeric" maxlength="4" />
                <button class="btn btn-primary" id="register-submit-btn" data-label="Create Profile">Create Profile</button>
                <p class="auth-small">Already have one? Switch to <a href="#" id="goto-login">Login</a>.</p>
            </div>`;
    }

    function bindTabEvents() {
        document.querySelectorAll('.ptab').forEach(btn => {
            btn.addEventListener('click', () => renderModal(btn.dataset.tab));
        });
    }

    function bindLoginForm() {
        const btn = document.getElementById('login-submit-btn');
        const gotoReg = document.getElementById('goto-register');
        if (gotoReg) gotoReg.addEventListener('click', e => { e.preventDefault(); renderModal('register'); });

        async function doLogin() {
            const username = document.getElementById('login-username').value.trim();
            const pin      = document.getElementById('login-pin').value.trim();
            setModalError('');
            if (!username || !pin) return setModalError('Enter both username and PIN.');
            if (!/^\d{4}$/.test(pin)) return setModalError('PIN must be exactly 4 digits.');

            setModalLoading(btn, true);
            try {
                const res = await apiPost('/api/profile/login', { username, pin });
                if (res.error) { setModalError(res.error); }
                else {
                    saveSession(res.profile.username, pin, res.profile);
                    updateLobbyProfileBtn();
                    autoFillName(res.profile.displayName);
                    await renderModal('profile');
                }
            } catch (e) {
                setModalError('Network error. Please try again.');
            }
            setModalLoading(btn, false);
        }

        btn.addEventListener('click', doLogin);
        ['login-username', 'login-pin'].forEach(id => {
            document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
        });
    }

    function bindRegisterForm() {
        const btn = document.getElementById('register-submit-btn');
        const gotoLogin = document.getElementById('goto-login');
        if (gotoLogin) gotoLogin.addEventListener('click', e => { e.preventDefault(); renderModal('login'); });

        async function doRegister() {
            const displayName = document.getElementById('reg-displayname').value.trim();
            const username    = document.getElementById('reg-username').value.trim();
            const pin         = document.getElementById('reg-pin').value.trim();
            setModalError('');
            if (!displayName || !username || !pin) return setModalError('All fields are required.');
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return setModalError('Username: 3–20 chars, letters/numbers/underscores.');
            if (!/^\d{4}$/.test(pin)) return setModalError('PIN must be exactly 4 digits.');

            setModalLoading(btn, true);
            try {
                const res = await apiPost('/api/profile/register', { username, displayName, pin });
                if (res.error) { setModalError(res.error); }
                else {
                    saveSession(res.profile.username, pin, res.profile);
                    updateLobbyProfileBtn();
                    autoFillName(res.profile.displayName);
                    await renderModal('profile');
                }
            } catch (e) {
                setModalError('Network error. Please try again.');
            }
            setModalLoading(btn, false);
        }

        btn.addEventListener('click', doRegister);
        ['reg-displayname', 'reg-username', 'reg-pin'].forEach(id => {
            document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
        });
    }

    // ─── Lobby Integration ────────────────────────────────────────────────────

    function autoFillName(displayName) {
        const input = document.getElementById('player-name');
        if (input && !input.value && displayName) input.value = displayName;
    }

    function updateLobbyProfileBtn() {
        const btn = document.getElementById('profile-btn');
        if (!btn) return;
        if (isLoggedIn()) {
            const s = getSession();
            btn.textContent = `👤 ${s.data?.displayName || s.username}`;
            btn.classList.add('profile-logged-in');
        } else {
            btn.textContent = '👤 Profile';
            btn.classList.remove('profile-logged-in');
        }
    }

    // ─── Badge Toast ──────────────────────────────────────────────────────────

    function showBadgeToast(badge) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast badge-toast';
        toast.innerHTML = `<span class="badge-toast-icon">${badge.icon}</span> <b>New Badge!</b> ${badge.name}<br><small>${badge.desc}</small>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    // ─── Game Result Submission ───────────────────────────────────────────────

    /**
     * Called from app.js after every game over.
     * @param {number} score  - player's final score
     * @param {boolean} won   - did this player win?
     * @param {string} mode   - game mode (classic, bollywood, etc.)
     */
    window.submitGameResult = async function (score, won, mode) {
        if (!isLoggedIn()) {
            // Guest path — save score anonymously
            if (!score || score <= 0) return;
            try {
                const res = await apiPost('/api/leaderboard/guest-score', { score, mode });
                if (res && res.guestName) {
                    showToast(
                        `Score saved as ${res.guestName}! Sign in to track your progress.`,
                        'info'
                    );
                }
            } catch (_) { /* silent */ }
            return;
        }
        const { username, pin } = getSession();
        try {
            const res = await apiPost('/api/profile/save-game', { username, pin, score, won, mode });
            if (res.error) return;
            // Show badges earned
            if (res.newBadges && res.newBadges.length > 0) {
                res.newBadges.forEach((badge, i) => {
                    setTimeout(() => showBadgeToast(badge), i * 1200);
                });
            }
            // Update cached profile
            const s = getSession();
            if (s.data) {
                s.data.stats   = res.stats   || s.data.stats;
                s.data.streak  = res.streak  || s.data.streak;
                saveSession(s.username, s.pin, s.data);
            }
        } catch (_) { /* silent — don't block game flow */ }
    };

    // ─── Utility ──────────────────────────────────────────────────────────────

    function escapeHtmlProfile(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ─── Initialise ───────────────────────────────────────────────────────────

    function init() {
        // Auto-fill name if already logged in
        if (isLoggedIn()) {
            const s = getSession();
            autoFillName(s.data?.displayName);
        }

        // Profile button in lobby
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            updateLobbyProfileBtn();
            profileBtn.addEventListener('click', async () => {
                showModal();
                const tab = isLoggedIn() ? 'profile' : 'login';
                await renderModal(tab);
            });
        }

        // Modal close button
        const closeBtn = document.getElementById('profile-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        // Close on backdrop click
        const modal = getModal();
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // Expose openProfileModal globally so leaderboard button can open Hall of Fame tab
        window.openProfileModal = async function (tab = 'profile') {
            showModal();
            await renderModal(tab);
        };
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
