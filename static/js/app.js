/* =============================================
   Marketplace Scanner — Frontend JS
   ============================================= */

const API = '';
let pollInterval = null;
let currentListings = [];

// ---- Tab switching ----
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        if (tab.dataset.tab === 'log') loadLog();
    });
});

// ---- Status polling ----
async function pollStatus() {
    try {
        const res = await fetch(`${API}/api/status`);
        const data = await res.json();

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

        document.getElementById('stat-total').textContent = data.stats.total || 0;
        document.getElementById('stat-new').textContent = data.stats.new || 0;
        document.getElementById('stat-ok').textContent = data.stats.scanners_ok || 0;

        if (data.last_scan) {
            const d = new Date(data.last_scan);
            document.getElementById('stat-time').textContent =
                d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        if (data.listing_count > 0 && data.listing_count !== currentListings.length) {
            loadListings();
        }
    } catch (e) { /* silent */ }
}

// ---- Load listings (live feed) ----
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
        renderListings(data.listings, document.getElementById('listings-feed'));
    } catch (e) {
        console.error('Failed to load listings:', e);
    }
}

// ---- Render listing cards into a container ----
function renderListings(listings, container, emptyMsg) {
    if (listings.length === 0) {
        container.innerHTML = `<div class="no-results">${emptyMsg || 'No listings found.'}</div>`;
        return;
    }

    container.innerHTML = '';
    const esc = s => s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';

    listings.forEach(l => {
        const card = document.createElement('a');
        card.href = l.url;
        card.target = '_blank';
        card.rel = 'noopener';
        card.className = 'listing-card' + (l.is_new ? ' is-new' : '');

        let imgHtml;
        if (l.image_url) {
            const proxied = `${API}/api/image-proxy?url=${encodeURIComponent(l.image_url)}`;
            imgHtml = `<img class="listing-img" src="${proxied}" alt="" loading="lazy"
                        onerror="this.outerHTML='<div class=\\'listing-img-placeholder\\'>No image</div>'">`;
        } else {
            imgHtml = '<div class="listing-img-placeholder">No image</div>';
        }

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

        container.appendChild(card);
    });
}

// ---- Load marketplace filter ----
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

// ---- Log ----
async function loadLog() {
    try {
        const res = await fetch(`${API}/api/log`);
        const data = await res.json();
        const content = document.getElementById('log-content');
        content.textContent = data.log.join('\n');
        content.scrollTop = content.scrollHeight;
    } catch (e) { /* silent */ }
}

// ---- Manual search ----
async function doManualSearch() {
    const query = document.getElementById('manual-query').value.trim();
    if (!query) return;

    const statusEl = document.getElementById('manual-status');
    const resultsEl = document.getElementById('manual-results');
    statusEl.textContent = 'Searching eBay...';
    resultsEl.innerHTML = '<div class="loading-msg"><div class="spinner"></div></div>';

    // Update quick links
    const encoded = encodeURIComponent(query);
    document.getElementById('link-ebay').href = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&LH_PrefLoc=1`;
    document.getElementById('link-gumtree').href = `https://www.gumtree.com.au/s-${encoded.replace(/%20/g, '+')}/k0`;
    document.getElementById('link-facebook').href = `https://www.facebook.com/marketplace/search/?query=${encoded}`;
    document.getElementById('link-cashconv').href = `https://www.cashconverters.com.au/shop?q=${encoded}`;

    try {
        const res = await fetch(`${API}/api/manual-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        const data = await res.json();
        statusEl.textContent = `Found ${data.total} results for "${query}"`;
        renderListings(data.listings, resultsEl, 'No results found. Try the quick links above to search directly.');
    } catch (e) {
        statusEl.textContent = 'Search failed — check terminal for errors';
        resultsEl.innerHTML = '';
    }
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

document.getElementById('btn-manual-search').addEventListener('click', doManualSearch);
document.getElementById('manual-query').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doManualSearch();
});

// Update quick links as user types
document.getElementById('manual-query').addEventListener('input', () => {
    const query = document.getElementById('manual-query').value.trim();
    if (query) {
        const encoded = encodeURIComponent(query);
        document.getElementById('link-ebay').href = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&LH_PrefLoc=1`;
        document.getElementById('link-gumtree').href = `https://www.gumtree.com.au/s-${encoded.replace(/%20/g, '+')}/k0`;
        document.getElementById('link-facebook').href = `https://www.facebook.com/marketplace/search/?query=${encoded}`;
        document.getElementById('link-cashconv').href = `https://www.cashconverters.com.au/shop?q=${encoded}`;
    }
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

pollInterval = setInterval(pollStatus, 5000);

// Refresh log if log tab is active
setInterval(() => {
    const logTab = document.getElementById('tab-log');
    if (logTab && logTab.classList.contains('active')) {
        loadLog();
    }
}, 3000);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}
