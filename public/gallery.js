// ─── Chitrakaar Drawing Gallery ───────────────────────────────────────────────
// Fetches recent drawings from /api/gallery and replays stroke data on canvas.
// Drawings are auto-deleted from MongoDB after 7 days via TTL index.
// ──────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)  return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24)  return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ─── Canvas Replay ────────────────────────────────────────────────────────
    // Strokes use normalized coords (0–1). Scale to any canvas size.

    function replayStrokes(canvas, strokes) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        // Background — match in-game canvas background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, W, H);

        if (!strokes || strokes.length === 0) return;

        // Group consecutive same-color/size lines into paths for performance
        let prevColor = null, prevSize = null;

        strokes.forEach(s => {
            if (s.type === 'line') {
                const scaledSize = Math.max(0.5, s.size * (W / 800));
                if (s.color !== prevColor || scaledSize !== prevSize) {
                    if (prevColor !== null) ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth   = scaledSize;
                    ctx.lineCap     = 'round';
                    ctx.lineJoin    = 'round';
                    prevColor = s.color;
                    prevSize  = scaledSize;
                    ctx.moveTo(s.x1 * W, s.y1 * H);
                }
                ctx.moveTo(s.x1 * W, s.y1 * H);
                ctx.lineTo(s.x2 * W, s.y2 * H);
            } else if (s.type === 'fill') {
                // Flood fill is complex to replay — render as a color swatch dot
                if (prevColor !== null) { ctx.stroke(); prevColor = null; }
                ctx.save();
                ctx.fillStyle = s.color;
                ctx.fillRect(0, 0, W, H); // simplify: just paint bg for fills
                ctx.restore();
            }
        });

        if (prevColor !== null) ctx.stroke();
    }

    // ─── Modal ────────────────────────────────────────────────────────────────

    function getModal()   { return document.getElementById('gallery-modal'); }
    function showModal()  { getModal().classList.add('active'); }
    function closeModal() { getModal().classList.remove('active'); }

    // ─── Full-size lightbox when a card is clicked ────────────────────────────

    function openLightbox(drawing) {
        const existing = document.getElementById('gallery-lightbox');
        if (existing) existing.remove();

        const lb = document.createElement('div');
        lb.id = 'gallery-lightbox';
        lb.className = 'gallery-lightbox';
        lb.innerHTML = `
            <div class="gallery-lb-box">
                <div class="gallery-lb-header">
                    <span class="gallery-lb-word">${escapeHtml(drawing.word)}</span>
                    <span class="gallery-lb-meta">by ${escapeHtml(drawing.drawerName)} · ${timeAgo(drawing.createdAt)}</span>
                    <button class="gallery-lb-close" aria-label="Close">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <canvas class="gallery-lb-canvas" id="gallery-lb-canvas"></canvas>
            </div>`;

        document.body.appendChild(lb);

        const canvas = document.getElementById('gallery-lb-canvas');
        // Use device pixel ratio for crisp canvas on retina
        const DPR = window.devicePixelRatio || 1;
        const W = Math.min(window.innerWidth - 48, 640);
        const H = Math.round(W * 0.625); // 16:10 aspect
        canvas.width  = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        canvas.getContext('2d').scale(DPR, DPR);

        replayStrokes(canvas, drawing.strokes);

        // Close on backdrop click or close button
        lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
        lb.querySelector('.gallery-lb-close').addEventListener('click', () => lb.remove());

        // Close on Escape
        const onKey = e => { if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);

        requestAnimationFrame(() => lb.classList.add('active'));
    }

    // ─── Render gallery grid ──────────────────────────────────────────────────

    function renderGallery(drawings) {
        const body = document.getElementById('gallery-modal-body');

        if (!drawings || drawings.length === 0) {
            body.innerHTML = `
                <div class="gallery-empty">
                    No drawings yet. Play a game and come back!
                </div>`;
            return;
        }

        body.innerHTML = `<div class="gallery-grid" id="gallery-grid"></div>`;
        const grid = document.getElementById('gallery-grid');

        drawings.forEach(drawing => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            card.title = `${drawing.word} — by ${drawing.drawerName}`;

            const canvas = document.createElement('canvas');
            canvas.className = 'gallery-canvas';

            // Preview canvas: 240×150 logical pixels
            const DPR = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width  = 240 * DPR;
            canvas.height = 150 * DPR;
            canvas.style.width  = '100%';
            canvas.style.height = '100%';
            canvas.getContext('2d').scale(DPR, DPR);

            card.appendChild(canvas);
            card.insertAdjacentHTML('beforeend', `
                <div class="gallery-card-info">
                    <span class="gallery-word">${escapeHtml(drawing.word)}</span>
                    <span class="gallery-meta">by ${escapeHtml(drawing.drawerName)} · ${timeAgo(drawing.createdAt)}</span>
                </div>`);

            grid.appendChild(card);

            // Replay strokes on this card's canvas
            // Use requestAnimationFrame to avoid blocking UI during bulk render
            requestAnimationFrame(() => replayStrokes(canvas, drawing.strokes));

            card.addEventListener('click', () => openLightbox(drawing));
        });
    }

    // ─── Open gallery modal ───────────────────────────────────────────────────

    async function openGallery() {
        showModal();

        const body = document.getElementById('gallery-modal-body');
        body.innerHTML = '<div class="gallery-loading">Loading drawings...</div>';

        try {
            const res      = await fetch('/api/gallery');
            const drawings = await res.json();
            if (!Array.isArray(drawings)) throw new Error('Bad response');
            renderGallery(drawings);
        } catch (_) {
            body.innerHTML = '<div class="gallery-empty">Could not load gallery. Try again later.</div>';
        }
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        const btn       = document.getElementById('gallery-btn');
        const closeBtn  = document.getElementById('gallery-modal-close');
        const overlay   = getModal();

        if (btn)      btn.addEventListener('click', openGallery);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay)  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) closeModal();
        });
    });

    // Expose globally so other scripts can open it
    window.openGallery = openGallery;

})();
