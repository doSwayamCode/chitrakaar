// ─── Chitrakaar Database Module ───────────────────────────────────────────────
// MongoDB Atlas (free tier) — all profile, streak, badge, and leaderboard logic
// lives here so server.js stays clean. Add new collections/helpers here as the
// game grows — server.js just imports what it needs.
// ──────────────────────────────────────────────────────────────────────────────

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// ─── Internal State ────────────────────────────────────────────────────────

let db = null;

// ─── Badge Definitions ────────────────────────────────────────────────────
// To add a new badge: add an entry here, then add its award() call in
// checkBadges() below. That's it. No other file needs changing.

const BADGES = {
    first_game:   { id: 'first_game',   icon: '🎨', name: 'First Steps',       desc: 'Play your first game' },
    winner:       { id: 'winner',       icon: '🏆', name: 'Top Drawer',         desc: 'Win a game' },
    streak_3:     { id: 'streak_3',     icon: '🔥', name: 'Hot Streak',         desc: 'Play 3 days in a row' },
    streak_7:     { id: 'streak_7',     icon: '⚡', name: 'Week Warrior',       desc: 'Play 7 days in a row' },
    streak_30:    { id: 'streak_30',    icon: '👑', name: 'Monthly Legend',     desc: 'Play 30 days in a row' },
    high_scorer:  { id: 'high_scorer',  icon: '🎯', name: 'High Scorer',        desc: 'Score 300+ in a single game' },
    champion:     { id: 'champion',     icon: '💎', name: 'Champion',           desc: 'Score 500+ in a single game' },
    veteran:      { id: 'veteran',      icon: '🎖️', name: 'Veteran',            desc: 'Play 50 games' },
    centurion:    { id: 'centurion',    icon: '💯', name: 'Centurion',          desc: 'Play 100 games' },
    speed_demon:  { id: 'speed_demon',  icon: '🚀', name: 'Speed Demon',        desc: 'Win a Speed mode game' },
    bollywood:    { id: 'bollywood',    icon: '🎬', name: 'Filmy',              desc: 'Win a Bollywood mode game' },
    hat_trick:    { id: 'hat_trick',    icon: '🎩', name: 'Hat Trick',          desc: 'Win 3 games in total' },
    unbeatable:   { id: 'unbeatable',   icon: '🌟', name: 'Unbeatable',         desc: 'Win 10 games in total' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * One-way hash of the PIN using a server-side secret.
 * Never stored or compared in plain text.
 */
function hashPin(pin) {
    const secret = process.env.PIN_SECRET || 'chitrakaar-pin-secret-2026';
    return crypto.createHash('sha256').update(String(pin) + secret).digest('hex');
}

/**
 * Check which new badges a player has earned after a game.
 * Returns { updatedBadges: string[], newBadges: BadgeObject[] }
 * 
 * To add future badges: just add more award() calls below.
 */
function checkBadges(profile, gameResult) {
    const { score, won, mode } = gameResult;
    const stats   = profile.stats;
    const streak  = profile.streak.current;
    const current = new Set(profile.badges || []);
    const newBadges = [];

    function award(id, condition) {
        if (condition && !current.has(id)) {
            current.add(id);
            newBadges.push(BADGES[id]);
        }
    }

    // ── Milestone badges ──────────────────────────────────────────────────
    award('first_game',  stats.gamesPlayed >= 1);
    award('winner',      stats.gamesWon    >= 1);
    award('hat_trick',   stats.gamesWon    >= 3);
    award('unbeatable',  stats.gamesWon    >= 10);

    // ── Streak badges ─────────────────────────────────────────────────────
    award('streak_3',  streak >= 3);
    award('streak_7',  streak >= 7);
    award('streak_30', streak >= 30);

    // ── Score badges ──────────────────────────────────────────────────────
    award('high_scorer', stats.bestScore >= 300);
    award('champion',    stats.bestScore >= 500);

    // ── Games played badges ───────────────────────────────────────────────
    award('veteran',   stats.gamesPlayed >= 50);
    award('centurion', stats.gamesPlayed >= 100);

    // ── Mode-specific badges ──────────────────────────────────────────────
    award('speed_demon', won && mode === 'speed');
    award('bollywood',   won && mode === 'bollywood');

    return { updatedBadges: [...current], newBadges };
}

/**
 * Calculates the new streak after a game is played today.
 * - If lastPlayedDate === today  → no change (already counted today)
 * - If lastPlayedDate === yesterday → streak continues
 * - Otherwise → streak resets to 1
 */
function updateStreak(profile) {
    const today = new Date().toISOString().slice(0, 10);     // YYYY-MM-DD
    const last  = profile.streak.lastPlayedDate;

    if (last === today) {
        // Already played today; streak unchanged
        return profile.streak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const current = (last === yesterdayStr) ? profile.streak.current + 1 : 1;
    const longest  = Math.max(current, profile.streak.longest || 0);

    return { current, longest, lastPlayedDate: today };
}

/**
 * Strip internal fields before sending to client.
 */
function sanitizeProfile(player) {
    if (!player) return null;
    const { pinHash, _id, ...safe } = player;
    return safe;
}

// ─── Connection ───────────────────────────────────────────────────────────

/**
 * Connect to MongoDB Atlas. Safe to call multiple times — reuses the
 * existing connection after the first call. Returns null if MONGO_URI
 * is not configured (graceful degradation — game works without DB).
 */
async function connect() {
    if (db) return db;

    if (!process.env.MONGO_URI) {
        console.log('[DB] MONGO_URI not set — profile features disabled (game still works)');
        return null;
    }

    try {
        const client = new MongoClient(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });
        await client.connect();
        db = client.db('chitrakaar');

        // ── One-time index setup ──────────────────────────────────────────
        // These are idempotent; safe to run every startup.
        const players = db.collection('players');
        await players.createIndex({ username: 1 },            { unique: true });
        await players.createIndex({ 'stats.totalScore': -1 });
        await players.createIndex({ 'stats.gamesPlayed': -1 });
        await players.createIndex({ 'streak.current': -1 });

        // Drawings — TTL auto-deletes anything older than 7 days
        const drawings = db.collection('drawings');
        await drawings.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
        await drawings.createIndex({ createdAt: -1 }); // for fast gallery fetch

        // Guest scores — TTL auto-deletes after 30 days; no signup needed
        const guest = db.collection('guest_scores');
        await guest.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
        await guest.createIndex({ score: -1 });

        console.log('[DB] MongoDB connected successfully');
        return db;
    } catch (err) {
        console.error('[DB] Connection failed:', err.message);
        return null;
    }
}

function getDb() { return db; }

// ─── Drawing Gallery ──────────────────────────────────────────────────────

/**
 * Save a completed drawing to the gallery.
 * Skips if DB unavailable or drawing is too sparse (<10 strokes).
 * Caps at 1000 strokes per drawing (~15-40 KB) to keep storage tiny.
 */
async function saveDrawing({ word, drawerName, strokes }) {
    const database = getDb();
    if (!database || !strokes || strokes.length < 10) return;
    const capped = strokes.slice(-1000); // keep last 1000 strokes max
    try {
        await database.collection('drawings').insertOne({
            word,
            drawerName,
            strokes: capped,
            createdAt: new Date(),
        });
    } catch (_) { /* non-critical, never crash the game */ }
}

/**
 * Fetch the most recent drawings for the gallery.
 * Returns stroke data so the client can replay them on canvas.
 */
async function getGallery(limit = 24) {
    const database = getDb();
    if (!database) return [];
    return database.collection('drawings')
        .find({}, { projection: { _id: 0, word: 1, drawerName: 1, strokes: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
}

// ─── Guest Scores ───────────────────────────────────────────────────────────

/**
 * Save a guest score after game over. Auto-generates Guest-N name.
 * Returns the guest number so the client can show it in a toast.
 */
async function saveGuestScore(score, mode) {
    const database = getDb();
    if (!database) return null;
    try {
        // Use a counter document to generate sequential guest numbers
        const counterResult = await database.collection('counters').findOneAndUpdate(
            { _id: 'guest_counter' },
            { $inc: { seq: 1 } },
            { upsert: true, returnDocument: 'after' }
        );
        const guestNum  = counterResult.seq || counterResult.value?.seq || 1;
        const guestName = `Guest-${guestNum}`;
        await database.collection('guest_scores').insertOne({
            displayName: guestName,
            score: Math.max(0, Math.min(score, 9999)),
            mode: mode || 'classic',
            createdAt: new Date(),
        });
        return guestNum;
    } catch (err) {
        console.error('[DB] saveGuestScore error:', err.message);
        return null;
    }
}

/**
 * Merge registered players and guest scores into one sorted leaderboard.
 * Players ranked by totalScore; guests ranked by their single game score.
 */
async function getMergedLeaderboard(limit = 20) {
    const database = getDb();
    if (!database) return [];
    try {
        const [players, guests] = await Promise.all([
            database.collection('players')
                .find({}, { projection: { pinHash: 0, _id: 0 } })
                .sort({ 'stats.totalScore': -1 })
                .limit(limit)
                .toArray(),
            database.collection('guest_scores')
                .find({}, { projection: { _id: 0 } })
                .sort({ score: -1 })
                .limit(limit)
                .toArray(),
        ]);

        // Normalise guest entries to match player shape for the frontend
        const normalisedGuests = guests.map(g => ({
            displayName: g.displayName,
            username: null,
            isGuest: true,
            stats: { totalScore: g.score, gamesPlayed: 1, gamesWon: 0, bestScore: g.score },
            streak: { current: 0, longest: 0 },
            badges: [],
            favouriteMode: g.mode,
            lastPlayedAt: g.createdAt,
        }));

        const combined = [...players, ...normalisedGuests];
        combined.sort((a, b) => b.stats.totalScore - a.stats.totalScore);
        return combined.slice(0, limit);
    } catch (err) {
        console.error('[DB] getMergedLeaderboard error:', err.message);
        return [];
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────
// Anything you add here is available everywhere via require('./db').

module.exports = {
    connect,
    getDb,
    hashPin,
    checkBadges,
    updateStreak,
    sanitizeProfile,
    saveDrawing,
    getGallery,
    saveGuestScore,
    getMergedLeaderboard,
    BADGES,
};
