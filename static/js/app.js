/* =============================================
   Marketplace Scanner — Frontend JS
   ============================================= */

const API = '';
let pollInterval = null;
let currentListings = [];

// ---- Status polling ----
async function pollStatus() {
    try {
        const res = await fetch(`${API}/api/status`);
        const data = await res.json();

        // Update badge
        const badge = document.getElementById('status-badge');
        if (data.scan_paused) {
            badge.textContent = 'Paused';
            badge.className = 'badge paused';
        } else if (data.scan_running) {
            badge.textContent = 'Scanning...';
            badge.className = 'badge running';
        } else {
            badge.textContent = 'Idle';
            badge.className = 'badge';
        }

        // Update stats
        document.getElementById('stat-total').textContent = data.stats.total || 0;
        document.getElementById('stat-new').textContent = data.stats.new || 0;
        document.getElementById('stat-ok').textContent = data.stats.scanners_ok || 0;

        if (data.last_scan) {
            const d = new Date(data.last_scan);
            document.getElementById('stat-time').textContent =
                d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Refresh listings if scan just completed
        if (data.listing_count > 0 && data.listing_count !== currentListings.length) {
            loadListings();
        }
    } catch (e) { /* silent */ }
}

// ---- Load listings ----
async function loadListings() {
    const search = document.getElementById('search-input').value;
    const marketplace = document.getElementById('marketplace-filter').value;
    const sort = document.getElementById('sort-filter').value;
    const newOnly = document.getElementById('new-only').checked;

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (marketplace) params.set('marketplace', marketplace);
    if (sort) params.set('sort', sort);
    if (newOnly) params.set('new_only', 'true');

    try {
        const res = await fetch(`${API}/api/listings?${params}`);
        const data = await res.json();
        currentListings = data.listings;
        renderListings(data.listings);
    } catch (e) {
        console.error('Failed to load listings:', e);
    }
}

// ---- Render listing cards ----
function renderListings(listings) {
    const feed = document.getElementById('listings-feed');
    const loadingMsg = document.getElementById('loading-msg');

    if (listings.length === 0) {
        if (loadingMsg) {
            feed.innerHTML = '';
            feed.appendChild(loadingMsg);
        } else {
            feed.innerHTML = '<div class="no-results">No listings found. Try adjusting your filters.</div>';
        }
        return;
    }

    feed.innerHTML = '';

    listings.forEach(l => {
        const card = document.createElement('a');
        card.href = l.url;
        card.target = '_blank';
        card.rel = 'noopener';
        card.className = 'listing-card' + (l.is_new ? ' is-new' : '');

        // Image
        let imgHtml;
        if (l.image_url) {
            const proxied = `${API}/api/image-proxy?url=${encodeURIComponent(l.image_url)}`;
            imgHtml = `<img class="listing-img" src="${proxied}" alt="" loading="lazy"
                        onerror="this.outerHTML='<div class=\\'listing-img-placeholder\\'>No image</div>'">`;
        } else {
            imgHtml = '<div class="listing-img-placeholder">No image</div>';
        }

        // Escape HTML
        const esc = s => s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';

        card.innerHTML = `
            ${imgHtml}
            <div class="listing-info">
                <div class="listing-price">${esc(l.price)}</div>
                <div class="listing-title">${esc(l.title)}</div>
                <div class="listing-meta">
                    <span class="listing-marketplace">${esc(l.marketplace)}</span>
                    ${l.is_new ? '<span class="new-badge">NEW</span>' : ''}
                    <span class="listing-location">${esc(l.location)}</span>
                </div>
                ${l.description ? `<div class="listing-desc">${esc(l.description)}</div>` : ''}
            </div>
        `;

        feed.appendChild(card);
    });
}

// ---- Load marketplace filter options ----
async function loadMarketplaces() {
    try {
        const res = await fetch(`${API}/api/marketplaces`);
        const data = await res.json();
        const select = document.getElementById('marketplace-filter');
        data.forEach(mp => {
            const opt = document.createElement('option');
            opt.value = mp.key;
            opt.textContent = mp.name;
            select.appendChild(opt);
        });
    } catch (e) { /* silent */ }
}

// ---- Log panel ----
async function loadLog() {
    try {
        const res = await fetch(`${API}/api/log`);
        const data = await res.json();
        const content = document.getElementById('log-content');
        content.textContent = data.log.join('\n');
        content.scrollTop = content.scrollHeight;
    } catch (e) { /* silent */ }
}

// ---- Button handlers ----
document.getElementById('btn-scan').addEventListener('click', async () => {
    await fetch(`${API}/api/scan-now`, { method: 'POST' });
    pollStatus();
});

document.getElementById('btn-pause').addEventListener('click', async () => {
    await fetch(`${API}/api/pause`, { method: 'POST' });
    pollStatus();
});

document.getElementById('btn-log').addEventListener('click', () => {
    const panel = document.getElementById('log-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        loadLog();
    }
});

document.getElementById('log-toggle').addEventListener('click', () => {
    document.getElementById('log-panel').classList.add('hidden');
});

// ---- Filter event handlers ----
let searchDebounce = null;
document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadListings, 300);
});
document.getElementById('marketplace-filter').addEventListener('change', loadListings);
document.getElementById('sort-filter').addEventListener('change', loadListings);
document.getElementById('new-only').addEventListener('change', loadListings);

// ---- Init ----
loadMarketplaces();
loadListings();
pollStatus();

// Poll every 5 seconds
pollInterval = setInterval(() => {
    pollStatus();
}, 5000);

// Refresh log if panel is open
setInterval(() => {
    const panel = document.getElementById('log-panel');
    if (!panel.classList.contains('hidden')) {
        loadLog();
    }
}, 3000);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}
