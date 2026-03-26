/* =============================================
   MarketScan — Frontend JS
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
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.m-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('tab-' + name);
    if (el) el.classList.add('active');
    if (name === 'log') loadLog();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
document.querySelectorAll('.m-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// ---- Status polling ----
async function poll() {
    try {
        const r = await fetch(API + '/api/status');
        const d = await r.json();
        const b = document.getElementById('status-badge');
        if (d.scan_paused) { b.textContent = 'Paused'; b.className = 'pill paused'; }
        else if (d.scan_running) { b.textContent = 'Scanning...'; b.className = 'pill running'; }
        else { b.textContent = 'Idle'; b.className = 'pill'; }

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
        q: prefix === 'f' ? (g('f-search')?.value.trim() || '') : '',
        mp: g(prefix+'-marketplace')?.value || '',
        loc: g(prefix+'-location')?.value || '',
        pmin: g(prefix+'-price-min')?.value ? parseFloat(g(prefix+'-price-min').value) : null,
        pmax: g(prefix+'-price-max')?.value ? parseFloat(g(prefix+'-price-max').value) : null,
        sort: g(prefix+'-sort')?.value || 'date-desc',
        newOnly: prefix === 'f' ? (g('f-new-only')?.checked || false) : false,
    };
}

function applyFeedFilters() {
    const f = filterSort(currentListings, getOpts('f'));
    const c = document.getElementById('feed-count');
    c.textContent = currentListings.length ? `Showing ${f.length} of ${currentListings.length}` : '';
    renderCards(f, document.getElementById('listings-grid'));
}

function applySearchFilters() {
    const f = filterSort(searchResults, getOpts('sf'));
    const c = document.getElementById('search-count');
    c.textContent = searchResults.length ? `Showing ${f.length} of ${searchResults.length}` : '';
    renderCards(f, document.getElementById('search-results'), 'No results. Try the quick links to search directly.');
}

// ---- Render cards ----
function renderCards(items, container, emptyMsg) {
    if (!items.length) {
        container.innerHTML = '<div class="no-results">' + (emptyMsg || 'No listings match your filters.') + '</div>';
        return;
    }
    container.innerHTML = '';
    items.forEach(l => {
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
            ${l.description ? '<div class="card-desc">' + esc(l.description) + '</div>' : ''}
        </div>`;
        container.appendChild(a);
    });
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

// ---- Manual search ----
async function doSearch() {
    const q = document.getElementById('manual-query').value.trim();
    if (!q) return;
    const status = document.getElementById('manual-status');
    const results = document.getElementById('search-results');
    const filters = document.getElementById('search-filters');
    status.textContent = 'Searching eBay Australia...';
    status.style.color = '';
    results.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    const enc = encodeURIComponent(q);
    document.getElementById('link-ebay').href = 'https://www.ebay.com.au/sch/i.html?_nkw=' + enc + '&LH_PrefLoc=1';
    document.getElementById('link-gumtree').href = 'https://www.gumtree.com.au/s-' + enc.replace(/%20/g,'+') + '/k0';
    document.getElementById('link-facebook').href = 'https://www.facebook.com/marketplace/search/?query=' + enc;
    document.getElementById('link-cashconv').href = 'https://www.cashconverters.com.au/shop?q=' + enc;
    document.getElementById('link-tradingpost').href = 'https://www.tradingpost.com.au/search?q=' + enc;

    try {
        const r = await fetch(API + '/api/manual-search', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ query: q }),
        });
        const d = await r.json();
        searchResults = d.listings || [];
        if (d.error) { status.textContent = 'Error: ' + d.error; status.style.color = '#f85149'; }
        else { status.textContent = 'Found ' + d.total + ' results for "' + q + '"'; }
        if (searchResults.length > 0) {
            filters.style.display = '';
            populateDropdowns(searchResults, 'sf-marketplace', 'sf-location');
        } else { filters.style.display = 'none'; }
        applySearchFilters();
    } catch(e) {
        status.textContent = 'Search failed: ' + e.message;
        status.style.color = '#f85149';
        results.innerHTML = '';
    }
}

// ---- Event listeners ----
document.getElementById('btn-scan').addEventListener('click', async () => { await fetch(API+'/api/scan-now',{method:'POST'}); poll(); });
document.getElementById('btn-pause').addEventListener('click', async () => { await fetch(API+'/api/pause',{method:'POST'}); poll(); });
document.getElementById('btn-manual-search').addEventListener('click', doSearch);
document.getElementById('manual-query').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

// Quick links update on type
document.getElementById('manual-query').addEventListener('input', () => {
    const q = document.getElementById('manual-query').value.trim();
    if (!q) return;
    const enc = encodeURIComponent(q);
    document.getElementById('link-ebay').href = 'https://www.ebay.com.au/sch/i.html?_nkw=' + enc + '&LH_PrefLoc=1';
    document.getElementById('link-gumtree').href = 'https://www.gumtree.com.au/s-' + enc.replace(/%20/g,'+') + '/k0';
    document.getElementById('link-facebook').href = 'https://www.facebook.com/marketplace/search/?query=' + enc;
    document.getElementById('link-cashconv').href = 'https://www.cashconverters.com.au/shop?q=' + enc;
    document.getElementById('link-tradingpost').href = 'https://www.tradingpost.com.au/search?q=' + enc;
});

// Feed filter events
let fd = null;
document.getElementById('f-search').addEventListener('input', () => { clearTimeout(fd); fd = setTimeout(applyFeedFilters, 300); });
document.getElementById('f-marketplace').addEventListener('change', applyFeedFilters);
document.getElementById('f-location').addEventListener('change', applyFeedFilters);
document.getElementById('f-price-min').addEventListener('input', () => { clearTimeout(fd); fd = setTimeout(applyFeedFilters, 500); });
document.getElementById('f-price-max').addEventListener('input', () => { clearTimeout(fd); fd = setTimeout(applyFeedFilters, 500); });
document.getElementById('f-sort').addEventListener('change', applyFeedFilters);
document.getElementById('f-new-only').addEventListener('change', applyFeedFilters);

// Search filter events
let sd = null;
document.getElementById('sf-marketplace').addEventListener('change', applySearchFilters);
document.getElementById('sf-location').addEventListener('change', applySearchFilters);
document.getElementById('sf-price-min').addEventListener('input', () => { clearTimeout(sd); sd = setTimeout(applySearchFilters, 500); });
document.getElementById('sf-price-max').addEventListener('input', () => { clearTimeout(sd); sd = setTimeout(applySearchFilters, 500); });
document.getElementById('sf-sort').addEventListener('change', applySearchFilters);

// ---- Init ----
loadListings();
poll();
setInterval(poll, 5000);
setInterval(() => { if (document.getElementById('tab-log')?.classList.contains('active')) loadLog(); }, 3000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
