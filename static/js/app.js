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
    el('link-facebook').href = 'https://www.facebook.com/marketplace/sydney/search/?query=' + enc;
    el('link-cashconv').href = 'https://www.cashconverters.com.au/shop/tools-motor-hardware/power-tools-industrial/multimeters-electrical-testers/multimeter';
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
                    // Mark all scanner cards as searching
                    document.querySelectorAll('.scanner-card').forEach(c => {
                        c.className = 'scanner-card testing';
                        c.querySelector('.scanner-result').textContent = 'searching...';
                    });
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
                    updateScannerCard(msg.scanner, msg.count > 0 ? 'ok' : 'error', msg.count);
                } else if (msg.type === 'scanner_done') {
                    doneScanners = msg.progress;
                    const pct = (doneScanners / totalScanners * 100).toFixed(0);
                    const fill = document.getElementById('search-progress-fill');
                    const text = document.getElementById('search-progress-text');
                    if (fill) fill.style.width = pct + '%';
                    if (text) text.textContent = `${msg.scanner}: ${msg.error ? 'failed' : '0 results'} — ${doneScanners}/${totalScanners} sources`;
                    updateScannerCard(msg.scanner, msg.error ? 'error' : 'error', 0);
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

// ---- Scanner Diagnostics ----
document.getElementById('btn-test-scanners')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-test-scanners');
    const cards = document.querySelectorAll('.scanner-card');

    btn.textContent = 'Testing...';
    btn.classList.add('testing');

    cards.forEach(card => {
        card.className = 'scanner-card testing';
        card.querySelector('.scanner-result').textContent = 'testing...';
    });

    try {
        const r = await fetch(API + '/api/test-scanners');
        const d = await r.json();

        // Reset all first
        cards.forEach(card => { card.className = 'scanner-card'; });

        for (const result of d.results) {
            const card = document.querySelector(`.scanner-card[data-scanner="${result.scanner_id}"]`);
            if (!card) continue;

            if (result.status === 'ok') {
                card.className = 'scanner-card ok';
                card.querySelector('.scanner-result').textContent = `${result.count} results (${result.time_seconds}s)`;
            } else {
                card.className = 'scanner-card fail';
                card.querySelector('.scanner-result').textContent = result.error ? result.error.substring(0, 30) : 'no results';
            }
        }
    } catch(e) {
        cards.forEach(card => {
            card.className = 'scanner-card fail';
            card.querySelector('.scanner-result').textContent = 'test failed';
        });
    }

    btn.textContent = 'Test All Scanners';
    btn.classList.remove('testing');
});

// Update scanner panel during streaming search
function updateScannerCard(scannerName, status, count) {
    const cards = document.querySelectorAll('.scanner-card');
    for (const card of cards) {
        const name = card.querySelector('.scanner-name').textContent;
        if (scannerName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(scannerName.split(' ')[0].toLowerCase())) {
            if (status === 'ok') {
                card.className = 'scanner-card ok';
                card.querySelector('.scanner-result').textContent = count + ' found';
            } else if (status === 'error') {
                card.className = 'scanner-card fail';
                card.querySelector('.scanner-result').textContent = 'failed';
            } else if (status === 'searching') {
                card.className = 'scanner-card testing';
                card.querySelector('.scanner-result').textContent = 'searching...';
            }
            break;
        }
    }
}

// ---- Interactive Map Location Picker ----
const AU_CITIES = {
    'Sydney': [-33.8688, 151.2093],
    'Melbourne': [-37.8136, 144.9631],
    'Brisbane': [-27.4698, 153.0251],
    'Perth': [-31.9505, 115.8605],
    'Adelaide': [-34.9285, 138.6007],
    'Hobart': [-42.8821, 147.3272],
    'Darwin': [-12.4634, 130.8456],
    'Canberra': [-35.2809, 149.1300],
    'Gold Coast': [-28.0167, 153.4000],
    'Newcastle': [-32.9283, 151.7817],
    'Cairns': [-16.9186, 145.7781],
    'Townsville': [-19.2590, 146.8169],
    'Geelong': [-38.1499, 144.3617],
    'Wollongong': [-34.4278, 150.8931],
};

let locationMap = null;
let locationMarker = null;

function initMap() {
    const mapEl = document.getElementById('location-map');
    if (!mapEl || !window.L) return;

    locationMap = L.map('location-map', {
        zoomControl: false,
        attributionControl: false,
    }).setView([-25.2744, 133.7751], 4); // Center of Australia

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
    }).addTo(locationMap);

    L.control.zoom({ position: 'topright' }).addTo(locationMap);

    // Add city markers
    for (const [city, [lat, lng]] of Object.entries(AU_CITIES)) {
        const marker = L.circleMarker([lat, lng], {
            radius: 5, fillColor: '#1a73e8', color: '#fff',
            weight: 1, fillOpacity: 0.8,
        }).addTo(locationMap);
        marker.bindTooltip(city, { direction: 'top', offset: [0, -8] });
        marker.on('click', () => selectMapCity(city, lat, lng));
    }

    // Click on map to find nearest city
    locationMap.on('click', (e) => {
        let nearest = null, minDist = Infinity;
        for (const [city, [lat, lng]] of Object.entries(AU_CITIES)) {
            const dist = Math.sqrt(Math.pow(e.latlng.lat - lat, 2) + Math.pow(e.latlng.lng - lng, 2));
            if (dist < minDist) { minDist = dist; nearest = city; }
        }
        if (nearest) {
            const [lat, lng] = AU_CITIES[nearest];
            selectMapCity(nearest, lat, lng);
        }
    });
}

function selectMapCity(city, lat, lng) {
    if (locationMarker) locationMap.removeLayer(locationMarker);
    locationMarker = L.marker([lat, lng]).addTo(locationMap);
    locationMap.setView([lat, lng], 8);

    // Update the dropdown
    const sel = document.getElementById('f-my-location');
    if (sel) { sel.value = city; }

    // Update label
    const label = document.getElementById('map-location-label');
    if (label) {
        label.textContent = city;
        label.className = 'map-location-label active';
    }

    // Also update search location
    const sSel = document.getElementById('s-location');
    if (sSel) { sSel.value = city; }

    applyFeedFilters();
}

// Sync dropdown to map
document.getElementById('f-my-location')?.addEventListener('change', function() {
    const city = this.value;
    if (city && AU_CITIES[city] && locationMap) {
        const [lat, lng] = AU_CITIES[city];
        selectMapCity(city, lat, lng);
    } else if (!city && locationMap) {
        if (locationMarker) locationMap.removeLayer(locationMarker);
        locationMap.setView([-25.2744, 133.7751], 4);
        const label = document.getElementById('map-location-label');
        if (label) { label.textContent = 'Click map to set location'; label.className = 'map-location-label'; }
    }
});

// ---- Facebook Login ----
async function checkFbStatus() {
    try {
        const r = await fetch(API + '/api/fb-status');
        const d = await r.json();
        const btn = document.getElementById('btn-fb-login');
        const txt = document.getElementById('fb-login-text');
        if (d.logged_in) {
            btn.classList.add('logged-in');
            txt.textContent = 'FB Connected';
        }
    } catch(e) {}
}

document.getElementById('btn-fb-login')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-fb-login');
    const txt = document.getElementById('fb-login-text');

    btn.classList.add('logging-in');
    txt.textContent = 'Opening browser...';

    try {
        const r = await fetch(API + '/api/fb-login', { method: 'POST' });
        const d = await r.json();

        if (d.ok) {
            btn.classList.remove('logging-in');
            btn.classList.add('logged-in');
            txt.textContent = 'FB Connected';
            alert('Facebook login successful! The scanner will now find Marketplace listings automatically.');
        } else {
            btn.classList.remove('logging-in');
            txt.textContent = 'Login to Facebook';
            alert('Login failed: ' + d.message);
        }
    } catch(e) {
        btn.classList.remove('logging-in');
        txt.textContent = 'Login to Facebook';
        alert('Error: ' + e.message + '. Make sure Playwright is installed.');
    }
});

// ---- Init ----
loadListings();
poll();
setInterval(poll, 2000);
setInterval(() => { if (document.getElementById('tab-log')?.classList.contains('active')) loadLog(); }, 3000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});

// Init map after page loads
setTimeout(() => { initMap(); checkFbStatus(); }, 500);
