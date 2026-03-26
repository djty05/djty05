/* =============================================
   MarketScan — Frontend JS
   ============================================= */

const API = '';
let pollInterval = null;
let currentListings = [];
let searchResults = [];

// ---- Helpers ----
function parsePrice(priceStr) {
    if (!priceStr) return null;
    const m = priceStr.replace(/,/g, '').match(/[\d.]+/);
    if (!m) return null;
    const val = parseFloat(m[0]);
    return isNaN(val) ? null : val;
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Mobile bottom tab bar ----
function initMobileTabs() {
    const existing = document.querySelector('.mobile-tabs');
    if (existing) return;

    const bar = document.createElement('nav');
    bar.className = 'mobile-tabs';
    bar.innerHTML = `
        <button class="mobile-tab active" data-tab="feed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Feed
        </button>
        <button class="mobile-tab" data-tab="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Search
        </button>
        <button class="mobile-tab" data-tab="log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Log
        </button>
    `;
    document.body.appendChild(bar);

    bar.querySelectorAll('.mobile-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
}
initMobileTabs();

// ---- Tab switching ----
function switchTab(tabName) {
    // Desktop nav tabs
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => {
        if (t.dataset.tab === tabName) t.classList.add('active');
    });

    // Mobile tabs
    document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mobile-tab').forEach(t => {
        if (t.dataset.tab === tabName) t.classList.add('active');
    });

    // Content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const target = document.getElementById('tab-' + tabName);
    if (target) target.classList.add('active');

    if (tabName === 'log') loadLog();
}

document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ---- Status polling ----
async function pollStatus() {
    try {
        const res = await fetch(`${API}/api/status`);
        const data = await res.json();

        const badge = document.getElementById('status-badge');
        if (data.scan_paused) {
            badge.textContent = 'Paused';
            badge.className = 'status-pill paused';
        } else if (data.scan_running) {
            badge.textContent = 'Scanning...';
            badge.className = 'status-pill running';
        } else {
            badge.textContent = 'Idle';
            badge.className = 'status-pill';
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

// ---- Load listings from API ----
async function loadListings() {
    try {
        const res = await fetch(`${API}/api/listings`);
        const data = await res.json();
        currentListings = data.listings;
        populateFilterDropdowns(currentListings, 'f-marketplace', 'f-location');
        applyFeedFilters();
    } catch (e) {
        console.error('Failed to load listings:', e);
    }
}

// ---- Populate filter dropdowns ----
function populateFilterDropdowns(listings, mpId, locId) {
    const marketplaces = new Set();
    const locations = new Set();

    listings.forEach(l => {
        if (l.marketplace) marketplaces.add(l.marketplace);
        if (l.location && l.location !== 'Australia') locations.add(l.location);
    });

    const mpSelect = document.getElementById(mpId);
    const locSelect = document.getElementById(locId);
    if (!mpSelect || !locSelect) return;

    const mpVal = mpSelect.value;
    const locVal = locSelect.value;

    mpSelect.innerHTML = '<option value="">All Marketplaces</option>';
    [...marketplaces].sort().forEach(mp => {
        const opt = document.createElement('option');
        opt.value = mp;
        opt.textContent = mp;
        mpSelect.appendChild(opt);
    });
    mpSelect.value = mpVal;

    locSelect.innerHTML = '<option value="">All Locations</option>';
    [...locations].sort().forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc;
        opt.textContent = loc;
        locSelect.appendChild(opt);
    });
    locSelect.value = locVal;
}

// ---- Client-side filter + sort ----
function filterAndSort(listings, opts) {
    let filtered = listings.slice();

    if (opts.search) {
        const q = opts.search.toLowerCase();
        filtered = filtered.filter(l =>
            (l.title && l.title.toLowerCase().includes(q)) ||
            (l.description && l.description.toLowerCase().includes(q))
        );
    }

    if (opts.marketplace) {
        filtered = filtered.filter(l => l.marketplace === opts.marketplace);
    }

    if (opts.location) {
        const loc = opts.location.toLowerCase();
        filtered = filtered.filter(l => l.location && l.location.toLowerCase().includes(loc));
    }

    if (opts.priceMin !== null || opts.priceMax !== null) {
        filtered = filtered.filter(l => {
            const p = parsePrice(l.price);
            if (p === null) return true;
            if (opts.priceMin !== null && p < opts.priceMin) return false;
            if (opts.priceMax !== null && p > opts.priceMax) return false;
            return true;
        });
    }

    if (opts.newOnly) {
        filtered = filtered.filter(l => l.is_new);
    }

    switch (opts.sort) {
        case 'date-desc':
            filtered.sort((a, b) => (b.date_found || '').localeCompare(a.date_found || ''));
            break;
        case 'date-asc':
            filtered.sort((a, b) => (a.date_found || '').localeCompare(b.date_found || ''));
            break;
        case 'price-asc':
            filtered.sort((a, b) => (parsePrice(a.price) || 99999) - (parsePrice(b.price) || 99999));
            break;
        case 'price-desc':
            filtered.sort((a, b) => (parsePrice(b.price) || 0) - (parsePrice(a.price) || 0));
            break;
        case 'marketplace':
            filtered.sort((a, b) => (a.marketplace || '').localeCompare(b.marketplace || ''));
            break;
        default:
            filtered.sort((a, b) => (b.date_found || '').localeCompare(a.date_found || ''));
    }

    return filtered;
}

// ---- Apply feed filters ----
function applyFeedFilters() {
    const opts = {
        search: document.getElementById('f-search').value.trim(),
        marketplace: document.getElementById('f-marketplace').value,
        location: document.getElementById('f-location').value,
        priceMin: document.getElementById('f-price-min').value ? parseFloat(document.getElementById('f-price-min').value) : null,
        priceMax: document.getElementById('f-price-max').value ? parseFloat(document.getElementById('f-price-max').value) : null,
        sort: document.getElementById('f-sort').value,
        newOnly: document.getElementById('f-new-only').checked,
    };

    const filtered = filterAndSort(currentListings, opts);
    const countEl = document.getElementById('feed-count');
    if (currentListings.length > 0) {
        countEl.textContent = `${filtered.length} of ${currentListings.length}`;
    } else {
        countEl.textContent = '';
    }
    renderListings(filtered, document.getElementById('listings-feed'));
}

// ---- Apply search filters ----
function applySearchFilters() {
    const opts = {
        search: '',
        marketplace: document.getElementById('sf-marketplace').value,
        location: document.getElementById('sf-location').value,
        priceMin: document.getElementById('sf-price-min').value ? parseFloat(document.getElementById('sf-price-min').value) : null,
        priceMax: document.getElementById('sf-price-max').value ? parseFloat(document.getElementById('sf-price-max').value) : null,
        sort: document.getElementById('sf-sort').value,
        newOnly: false,
    };

    const filtered = filterAndSort(searchResults, opts);
    const countEl = document.getElementById('search-count');
    if (searchResults.length > 0) {
        countEl.textContent = `${filtered.length} of ${searchResults.length}`;
    } else {
        countEl.textContent = '';
    }
    renderListings(filtered, document.getElementById('manual-results'),
        'No results found. Try the quick links above to search directly.');
}

// ---- Render listing cards ----
function renderListings(listings, container, emptyMsg) {
    if (listings.length === 0) {
        container.innerHTML = `<div class="no-results">${emptyMsg || 'No listings match your filters.'}</div>`;
        return;
    }

    container.innerHTML = '';

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
                <div class="listing-price">${escapeHtml(l.price)}</div>
                <div class="listing-title">${escapeHtml(l.title)}</div>
                <div class="listing-meta">
                    <span class="listing-marketplace">${escapeHtml(l.marketplace)}</span>
                    ${l.is_new ? '<span class="new-badge">NEW</span>' : ''}
                    <span class="listing-location">${escapeHtml(l.location)}</span>
                </div>
                ${l.description ? `<div class="listing-desc">${escapeHtml(l.description)}</div>` : ''}
            </div>
        `;

        container.appendChild(card);
    });
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
    const filtersEl = document.getElementById('search-filters');
    statusEl.textContent = 'Searching eBay Australia...';
    statusEl.style.color = '';
    resultsEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    // Update quick links
    const encoded = encodeURIComponent(query);
    document.getElementById('link-ebay').href = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&LH_PrefLoc=1`;
    document.getElementById('link-gumtree').href = `https://www.gumtree.com.au/s-${encoded.replace(/%20/g, '+')}/k0`;
    document.getElementById('link-facebook').href = `https://www.facebook.com/marketplace/search/?query=${encoded}`;
    document.getElementById('link-cashconv').href = `https://www.cashconverters.com.au/shop?q=${encoded}`;
    document.getElementById('link-tradingpost').href = `https://www.tradingpost.com.au/search?q=${encoded}`;

    try {
        const res = await fetch(`${API}/api/manual-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        const data = await res.json();
        searchResults = data.listings || [];

        if (data.error) {
            statusEl.textContent = `Error: ${data.error}`;
            statusEl.style.color = '#ef4444';
        } else {
            statusEl.textContent = `Found ${data.total} results for "${query}"`;
        }

        if (searchResults.length > 0) {
            filtersEl.style.display = '';
            populateFilterDropdowns(searchResults, 'sf-marketplace', 'sf-location');
        } else {
            filtersEl.style.display = 'none';
        }

        applySearchFilters();
    } catch (e) {
        statusEl.textContent = `Search failed: ${e.message}. Check the terminal.`;
        statusEl.style.color = '#ef4444';
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

// Live-update quick links as user types
document.getElementById('manual-query').addEventListener('input', () => {
    const query = document.getElementById('manual-query').value.trim();
    if (query) {
        const encoded = encodeURIComponent(query);
        document.getElementById('link-ebay').href = `https://www.ebay.com.au/sch/i.html?_nkw=${encoded}&LH_PrefLoc=1`;
        document.getElementById('link-gumtree').href = `https://www.gumtree.com.au/s-${encoded.replace(/%20/g, '+')}/k0`;
        document.getElementById('link-facebook').href = `https://www.facebook.com/marketplace/search/?query=${encoded}`;
        document.getElementById('link-cashconv').href = `https://www.cashconverters.com.au/shop?q=${encoded}`;
        document.getElementById('link-tradingpost').href = `https://www.tradingpost.com.au/search?q=${encoded}`;
    }
});

// ---- Feed filter events ----
let feedDebounce = null;
document.getElementById('f-search').addEventListener('input', () => {
    clearTimeout(feedDebounce);
    feedDebounce = setTimeout(applyFeedFilters, 300);
});
document.getElementById('f-marketplace').addEventListener('change', applyFeedFilters);
document.getElementById('f-location').addEventListener('change', applyFeedFilters);
document.getElementById('f-price-min').addEventListener('input', () => {
    clearTimeout(feedDebounce);
    feedDebounce = setTimeout(applyFeedFilters, 500);
});
document.getElementById('f-price-max').addEventListener('input', () => {
    clearTimeout(feedDebounce);
    feedDebounce = setTimeout(applyFeedFilters, 500);
});
document.getElementById('f-sort').addEventListener('change', applyFeedFilters);
document.getElementById('f-new-only').addEventListener('change', applyFeedFilters);

// ---- Search filter events ----
let searchDebounce = null;
document.getElementById('sf-marketplace').addEventListener('change', applySearchFilters);
document.getElementById('sf-location').addEventListener('change', applySearchFilters);
document.getElementById('sf-price-min').addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(applySearchFilters, 500);
});
document.getElementById('sf-price-max').addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(applySearchFilters, 500);
});
document.getElementById('sf-sort').addEventListener('change', applySearchFilters);

// ---- Init ----
loadListings();
pollStatus();
pollInterval = setInterval(pollStatus, 5000);

setInterval(() => {
    const logTab = document.getElementById('tab-log');
    if (logTab && logTab.classList.contains('active')) loadLog();
}, 3000);

// PWA service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}
