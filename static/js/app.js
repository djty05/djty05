/* =============================================
   MarketScan — Frontend JS v7
   ============================================= */

const API = '';
let currentListings = [];
let searchResults = [];

// ---- Helpers ----
function parsePrice(s) {
    if (!s) return null;
    const m = s.replace(/,/g, '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) || null : null;
}
function esc(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ---- Tab switching ----
function switchTab(name) {
    document.querySelectorAll('.chip-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.m-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('tab-' + name);
    if (el) el.classList.add('active');
    if (name === 'log') loadLog();
}
document.querySelectorAll('.chip-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
document.querySelectorAll('.m-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// ---- Status polling ----
async function poll() {
    try {
        const r = await fetch(API + '/api/status');
        const d = await r.json();
        const b = document.getElementById('status-badge');
        if (d.scan_paused) { b.textContent = 'Paused'; b.className = 'pill paused'; }
        else if (d.scan_running) {
            const name = d.current_scanner ? ' — ' + d.current_scanner : '';
            b.textContent = 'Scanning' + name; b.className = 'pill running';
        } else { b.textContent = 'Idle'; b.className = 'pill'; }

        document.getElementById('stat-total').textContent = d.stats.total || 0;
        document.getElementById('stat-new').textContent = d.stats.new || 0;
        document.getElementById('stat-ok').textContent = d.stats.scanners_ok || 0;
        if (d.last_scan) {
            document.getElementById('stat-time').textContent =
                new Date(d.last_scan).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        }
        if (d.listing_count > 0 && d.listing_count !== currentListings.length) loadListings();
    } catch(e) {}
}

// ---- Listings ----
async function loadListings() {
    try {
        const r = await fetch(API + '/api/listings');
        const d = await r.json();
        currentListings = d.listings;
        populateDropdowns(currentListings, 'f-marketplace', 'f-location');
        applyFeedFilters();
    } catch(e) { console.error(e); }
}

function populateDropdowns(items, mpId, locId) {
    const mps = new Set(), locs = new Set();
    items.forEach(l => {
        if (l.marketplace) mps.add(l.marketplace);
        if (l.location && l.location !== 'Australia') locs.add(l.location);
    });
    const mp = document.getElementById(mpId), loc = document.getElementById(locId);
    if (!mp || !loc) return;
    const mpV = mp.value, locV = loc.value;
    mp.innerHTML = '<option value="">All Marketplaces</option>';
    [...mps].sort().forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; mp.appendChild(o); });
    mp.value = mpV;
    loc.innerHTML = '<option value="">All Locations</option>';
    [...locs].sort().forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; loc.appendChild(o); });
    loc.value = locV;
}

// ---- Filter + Sort ----
function filterSort(items, o) {
    let f = items.slice();
    if (o.q) { const q = o.q.toLowerCase(); f = f.filter(l => (l.title||'').toLowerCase().includes(q) || (l.description||'').toLowerCase().includes(q)); }
    if (o.mp) f = f.filter(l => l.marketplace === o.mp);
    if (o.loc) { const lc = o.loc.toLowerCase(); f = f.filter(l => l.location && l.location.toLowerCase().includes(lc)); }
    if (o.myLoc) { const ml = o.myLoc.toLowerCase(); f = f.filter(l => l.location && l.location.toLowerCase().includes(ml)); }
    if (o.pmin != null) f = f.filter(l => { const p = parsePrice(l.price); return p === null || p >= o.pmin; });
    if (o.pmax != null) f = f.filter(l => { const p = parsePrice(l.price); return p === null || p <= o.pmax; });
    if (o.newOnly) f = f.filter(l => l.is_new);
    switch(o.sort) {
        case 'date-asc': f.sort((a,b) => (a.date_found||'').localeCompare(b.date_found||'')); break;
        case 'price-asc': f.sort((a,b) => (parsePrice(a.price)||99999) - (parsePrice(b.price)||99999)); break;
        case 'price-desc': f.sort((a,b) => (parsePrice(b.price)||0) - (parsePrice(a.price)||0)); break;
        case 'marketplace': f.sort((a,b) => (a.marketplace||'').localeCompare(b.marketplace||'')); break;
        default: f.sort((a,b) => (b.date_found||'').localeCompare(a.date_found||''));
    }
    return f;
}

function getOpts(prefix) {
    const g = id => document.getElementById(id);
    return {
        q: (g(prefix === 'f' ? 'f-search' : 'global-search')?.value.trim() || ''),
        mp: g(prefix+'-marketplace')?.value || '',
        loc: g(prefix+'-location')?.value || '',
        myLoc: prefix === 'f' ? (g('f-my-location')?.value || '') : '',
        pmin: g(prefix+'-price-min')?.value ? parseFloat(g(prefix+'-price-min').value) : null,
        pmax: g(prefix+'-price-max')?.value ? parseFloat(g(prefix+'-price-max').value) : null,
        sort: g(prefix+'-sort')?.value || 'date-desc',
        newOnly: prefix === 'f' ? (g('f-new-only')?.checked || false) : false,
    };
}

function applyFeedFilters() {
    const f = filterSort(currentListings, getOpts('f'));
    const c = document.getElementById('feed-count');
    c.textContent = currentListings.length ? `Showing ${f.length} of ${currentListings.length} results` : '';
    renderCards(f, document.getElementById('listings-grid'));
}

function applySearchFilters() {
    const f = filterSort(searchResults, getOpts('sf'));
    const c = document.getElementById('search-count');
    c.textContent = searchResults.length ? `Showing ${f.length} of ${searchResults.length} results` : '';
    renderCards(f, document.getElementById('search-results'), 'No results. Try the quick links to search directly.');
}

// ---- Render cards ----
function renderCards(items, container, emptyMsg) {
    if (!items.length) {
        container.innerHTML = '<div class="no-results">' + (emptyMsg || 'No listings match your filters.') + '</div>';
        return;
    }
    container.innerHTML = '';
    items.forEach(l => appendCard(l, container));
}

function appendCard(l, container) {
    const a = document.createElement('a');
    a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
    a.className = 'card' + (l.is_new ? ' is-new' : '');
    let img;
    if (l.image_url) {
        const src = API + '/api/image-proxy?url=' + encodeURIComponent(l.image_url);
        img = `<img class="card-img" src="${src}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'card-img-none\\'>No image</div>'">`;
    } else {
        img = '<div class="card-img-none">No image</div>';
    }
    a.innerHTML = `${img}<div class="card-body">
        <div class="card-price">${esc(l.price)}</div>
        <div class="card-title">${esc(l.title)}</div>
        <div class="card-meta">
            <span class="card-source">${esc(l.marketplace)}</span>
            ${l.is_new ? '<span class="card-new">NEW</span>' : ''}
            <span class="card-location">${esc(l.location)}</span>
        </div>
    </div>`;
    container.appendChild(a);
}

// ---- Log ----
async function loadLog() {
    try {
        const r = await fetch(API + '/api/log');
        const d = await r.json();
        const el = document.getElementById('log-content');
        el.textContent = d.log.join('\n');
        el.scrollTop = el.scrollHeight;
    } catch(e) {}
}

// ---- Quick links ----
function updateQuickLinks(q) {
    if (!q) return;
    const enc = encodeURIComponent(q);
    const el = id => document.getElementById(id);
    el('link-ebay').href = 'https://www.ebay.com.au/sch/i.html?_nkw=' + enc + '&LH_PrefLoc=1';
    el('link-gumtree').href = 'https://www.gumtree.com.au/s-' + enc.replace(/%20/g,'+') + '/k0';
    el('link-facebook').href = 'https://www.facebook.com/marketplace/search/?query=' + enc;
    el('link-cashconv').href = 'https://www.cashconverters.com.au/shop?q=' + enc;
    el('link-tradingpost').href = 'https://www.tradingpost.com.au/search?q=' + enc;
}

// ---- Streaming search ----
async function doSearch(query) {
    if (!query) return;
    const statusEl = document.getElementById('manual-status');
    const resultsWrap = document.getElementById('tab-search-results');
    const resultsEl = document.getElementById('search-results');
    const searchBtn = document.getElementById('btn-global-search');

    // Get pre-search marketplace and location selections
    const marketplace = document.getElementById('s-marketplace')?.value || '';
    const location = document.getElementById('s-location')?.value || '';

    searchBtn.disabled = true;
    searchResults = [];
    resultsEl.innerHTML = '';
    resultsWrap.style.display = 'flex';
    updateQuickLinks(query);

    // Show progress
    const mpLabel = marketplace ? document.getElementById('s-marketplace').selectedOptions[0].text : 'all marketplaces';
    const locLabel = location || 'All Australia';
    statusEl.innerHTML = '<div class="search-progress">' +
        '<div class="progress-bar"><div class="progress-fill" id="search-progress-fill"></div></div>' +
        '<span class="progress-text" id="search-progress-text">Searching ' + mpLabel + ' in ' + locLabel + '...</span></div>';

    let totalScanners = 6, doneScanners = 0, totalResults = 0;

    // Build URL with marketplace and location params
    let streamUrl = API + '/api/stream-search?q=' + encodeURIComponent(query);
    if (marketplace) streamUrl += '&marketplace=' + encodeURIComponent(marketplace);
    if (location) streamUrl += '&location=' + encodeURIComponent(location);

    try {
        const response = await fetch(streamUrl);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                let msg;
                try { msg = JSON.parse(line.slice(6)); } catch(e) { continue; }

                if (msg.type === 'start') {
                    totalScanners = msg.scanners;
                } else if (msg.type === 'results') {
                    doneScanners = msg.progress;
                    totalResults = msg.total;
                    for (const listing of msg.listings) {
                        searchResults.push(listing);
                        appendCard(listing, resultsEl);
                    }
                    const pct = (doneScanners / totalScanners * 100).toFixed(0);
                    const fill = document.getElementById('search-progress-fill');
                    const text = document.getElementById('search-progress-text');
                    if (fill) fill.style.width = pct + '%';
                    if (text) text.textContent = `${msg.scanner}: +${msg.count} — ${doneScanners}/${totalScanners} sources (${totalResults} total)`;
                } else if (msg.type === 'scanner_done') {
                    doneScanners = msg.progress;
                    const pct = (doneScanners / totalScanners * 100).toFixed(0);
                    const fill = document.getElementById('search-progress-fill');
                    const text = document.getElementById('search-progress-text');
                    if (fill) fill.style.width = pct + '%';
                    if (text) text.textContent = `${msg.scanner}: ${msg.error ? 'no results' : '0'} — ${doneScanners}/${totalScanners} sources`;
                } else if (msg.type === 'done') {
                    statusEl.textContent = `Found ${msg.total} results for "${query}" across ${totalScanners} marketplaces`;
                }
            }
        }
    } catch(e) {
        // Fallback
        statusEl.textContent = 'Streaming failed, trying standard search...';
        try {
            const r = await fetch(API + '/api/manual-search', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ query, marketplace, location }),
            });
            const d = await r.json();
            searchResults = d.listings || [];
            statusEl.textContent = d.error ? 'Error: ' + d.error : 'Found ' + d.total + ' results for "' + query + '"';
            renderCards(searchResults, resultsEl, 'No results.');
        } catch(e2) { statusEl.textContent = 'Search failed: ' + e2.message; }
    }

    if (searchResults.length > 0) {
        populateDropdowns(searchResults, 'sf-marketplace', 'sf-location');
    }
    searchBtn.disabled = false;
}

// ---- Event listeners ----
// Global search (in navbar)
document.getElementById('btn-global-search').addEventListener('click', () => {
    const q = document.getElementById('global-search').value.trim();
    if (q) { switchTab('search'); doSearch(q); }
});
document.getElementById('global-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) { switchTab('search'); doSearch(q); }
    }
});
document.getElementById('global-search').addEventListener('input', () => {
    updateQuickLinks(document.getElementById('global-search').value.trim());
});

// Scan buttons
document.getElementById('btn-scan').addEventListener('click', async () => {
    const btn = document.getElementById('btn-scan');
    const badge = document.getElementById('status-badge');
    btn.classList.add('spinning');
    btn.disabled = true;
    badge.textContent = 'Starting scan...';
    badge.className = 'pill running';
    await fetch(API + '/api/scan-now', { method: 'POST' });
    for (let i = 0; i < 15; i++) setTimeout(() => poll(), i * 1000);
    setTimeout(() => { btn.classList.remove('spinning'); btn.disabled = false; }, 3000);
});
document.getElementById('btn-pause').addEventListener('click', async () => {
    await fetch(API + '/api/pause', { method: 'POST' });
    poll();
});

// Feed sidebar filters
let fd = null;
const feedFilter = () => { clearTimeout(fd); fd = setTimeout(applyFeedFilters, 300); };
document.getElementById('f-search').addEventListener('input', feedFilter);
document.getElementById('f-marketplace').addEventListener('change', applyFeedFilters);
document.getElementById('f-location').addEventListener('change', applyFeedFilters);
document.getElementById('f-price-go').addEventListener('click', applyFeedFilters);
document.getElementById('f-price-min').addEventListener('keydown', e => { if (e.key === 'Enter') applyFeedFilters(); });
document.getElementById('f-price-max').addEventListener('keydown', e => { if (e.key === 'Enter') applyFeedFilters(); });
document.getElementById('f-sort').addEventListener('change', applyFeedFilters);
document.getElementById('f-new-only').addEventListener('change', applyFeedFilters);
document.getElementById('f-my-location').addEventListener('change', applyFeedFilters);

// Search sidebar filters
let sd = null;
document.getElementById('sf-marketplace').addEventListener('change', applySearchFilters);
document.getElementById('sf-location').addEventListener('change', applySearchFilters);
document.getElementById('sf-price-go').addEventListener('click', applySearchFilters);
document.getElementById('sf-sort').addEventListener('change', applySearchFilters);

// ---- Init ----
loadListings();
poll();
setInterval(poll, 2000);
setInterval(() => { if (document.getElementById('tab-log')?.classList.contains('active')) loadLog(); }, 3000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
