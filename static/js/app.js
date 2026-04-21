document.addEventListener('DOMContentLoaded', () => {
    const resultsGrid = document.getElementById('results-grid');
    const emptyState = document.getElementById('empty-state');
    const resultsCount = document.getElementById('results-count');
    const scannerStatus = document.getElementById('scanner-status');
    const quickTerms = document.getElementById('quick-terms');
    const searchInput = document.getElementById('search-input');

    let resultCount = 0;
    let map = null;
    let settingsMap = null;
    let markers = [];
    let locationMarker = null;
    let evtSource = null;

    // --- SSE ---
    function connectSSE() {
        if (evtSource) evtSource.close();
        evtSource = new EventSource('/api/stream');

        evtSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'result') {
                    addResult(data.listing);
                } else if (data.type === 'status') {
                    updateStatus(data.scanner, data.status, data.count, data.error);
                } else if (data.type === 'done') {
                    // All scanners finished
                }
            } catch (e) {
                console.error('SSE parse error:', e);
            }
        };

        evtSource.onerror = () => {
            setTimeout(connectSSE, 3000);
        };
    }

    // --- Results ---
    function addResult(listing) {
        if (emptyState) emptyState.style.display = 'none';
        resultCount++;
        resultsCount.textContent = `(${resultCount})`;

        const card = document.createElement('div');
        card.className = 'listing-card';

        const sourceClass = getSourceClass(listing.marketplace);
        const imageHtml = listing.image_url
            ? `<img class="card-image" src="${escapeHtml(listing.image_url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'card-image no-image\\'>No image</div>'">`
            : '<div class="card-image no-image">No image</div>';

        const url = listing.url && listing.url !== '#fb-login'
            ? listing.url
            : '#';

        card.innerHTML = `
            ${imageHtml}
            <div class="card-body">
                <span class="card-source ${sourceClass}">${escapeHtml(listing.marketplace)}</span>
                <div class="card-title">
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(listing.title)}</a>
                </div>
                <div class="card-price">${escapeHtml(listing.price)}</div>
                <div class="card-location">${escapeHtml(listing.location)}</div>
                ${listing.date_found ? `<div class="card-date">${escapeHtml(listing.date_found)}</div>` : ''}
            </div>
        `;

        if (url === '#fb-login') {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                document.getElementById('fb-modal').classList.remove('hidden');
            });
        }

        resultsGrid.insertBefore(card, resultsGrid.firstChild);
    }

    function getSourceClass(marketplace) {
        const m = (marketplace || '').toLowerCase();
        if (m.includes('ebay')) return 'ebay';
        if (m.includes('gumtree')) return 'gumtree';
        if (m.includes('facebook')) return 'facebook';
        if (m.includes('cash')) return 'cashconverters';
        if (m.includes('trading')) return 'tradingpost';
        return '';
    }

    // --- Status ---
    function updateStatus(scanner, status, count, error) {
        let badge = document.getElementById(`status-${scanner}`);
        if (!badge) {
            badge = document.createElement('span');
            badge.id = `status-${scanner}`;
            scannerStatus.appendChild(badge);
        }

        const label = scannerLabel(scanner);
        let text = status;
        if (status === 'done' && count !== undefined) text = `done (${count})`;
        if (status === 'error' && error) text = `error`;

        badge.className = `status-badge ${status}`;
        badge.innerHTML = `<span class="status-dot ${status}"></span> ${escapeHtml(label)}: ${escapeHtml(text)}`;
    }

    function scannerLabel(id) {
        const labels = {
            ebay: 'eBay',
            gumtree: 'Gumtree',
            facebook: 'Facebook',
            cashconverters: 'Cash Conv.',
            tradingpost: 'Trading Post',
        };
        return labels[id] || id;
    }

    // --- Actions ---
    function getEnabledSources() {
        const checks = document.querySelectorAll('#source-filters input[type=checkbox]');
        return Array.from(checks).filter(c => c.checked).map(c => c.value);
    }

    document.getElementById('btn-scan-all').addEventListener('click', () => {
        scannerStatus.innerHTML = '';
        resultCount = 0;
        resultsCount.textContent = '(0)';
        resultsGrid.querySelectorAll('.listing-card').forEach(c => c.remove());
        if (emptyState) emptyState.style.display = 'none';

        fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sources: getEnabledSources() }),
        });
    });

    document.getElementById('btn-search').addEventListener('click', () => {
        const term = searchInput.value.trim();
        if (!term) return;
        doSearch(term);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const term = searchInput.value.trim();
            if (term) doSearch(term);
        }
    });

    function doSearch(term) {
        scannerStatus.innerHTML = '';
        resultCount = 0;
        resultsCount.textContent = '(0)';
        resultsGrid.querySelectorAll('.listing-card').forEach(c => c.remove());
        if (emptyState) emptyState.style.display = 'none';

        fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ term: term, sources: getEnabledSources() }),
        });
    }

    document.getElementById('btn-clear').addEventListener('click', () => {
        resultsGrid.querySelectorAll('.listing-card').forEach(c => c.remove());
        resultCount = 0;
        resultsCount.textContent = '(0)';
        if (emptyState) emptyState.style.display = '';
    });

    // --- Map ---
    document.getElementById('btn-toggle-map').addEventListener('click', () => {
        const container = document.getElementById('map-container');
        container.classList.toggle('hidden');
        if (!map && !container.classList.contains('hidden')) {
            initMap();
        }
    });

    function initMap() {
        map = L.map('map').setView([-33.8688, 151.2093], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);
    }

    // --- Facebook Login ---
    document.getElementById('btn-fb-login').addEventListener('click', () => {
        document.getElementById('fb-modal').classList.remove('hidden');
    });

    document.getElementById('fb-modal-close').addEventListener('click', () => {
        document.getElementById('fb-modal').classList.add('hidden');
    });

    document.getElementById('fb-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('fb-email').value.trim();
        const password = document.getElementById('fb-password').value;
        const errorEl = document.getElementById('fb-login-error');
        const successEl = document.getElementById('fb-login-success');
        const submitBtn = document.getElementById('fb-login-submit');

        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        try {
            const resp = await fetch('/api/fb-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await resp.json();

            if (data.success) {
                successEl.textContent = data.message || 'Logged in!';
                successEl.classList.remove('hidden');
                document.getElementById('fb-status-text').textContent = 'FB Connected';
                document.getElementById('btn-fb-login').classList.add('btn-accent');
                document.getElementById('btn-fb-login').classList.remove('btn-fb');
                setTimeout(() => {
                    document.getElementById('fb-modal').classList.add('hidden');
                }, 1500);
            } else {
                errorEl.textContent = data.error || 'Login failed';
                errorEl.classList.remove('hidden');
            }
        } catch (err) {
            errorEl.textContent = 'Network error. Try again.';
            errorEl.classList.remove('hidden');
        }

        submitBtn.textContent = 'Log In to Facebook';
        submitBtn.disabled = false;
    });

    // --- Settings ---
    document.getElementById('btn-settings').addEventListener('click', async () => {
        const resp = await fetch('/api/config');
        const config = await resp.json();

        document.getElementById('settings-terms').value = config.search_terms.join('\n');
        document.getElementById('settings-interval').value = config.scan_interval_minutes;
        document.getElementById('settings-location-name').value = config.location.name || '';
        document.getElementById('settings-radius').value = config.location.radius_km || 50;

        document.getElementById('settings-modal').classList.remove('hidden');

        setTimeout(() => {
            if (!settingsMap) {
                const lat = config.location.lat || -33.8688;
                const lng = config.location.lng || 151.2093;
                settingsMap = L.map('settings-map').setView([lat, lng], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OSM'
                }).addTo(settingsMap);

                locationMarker = L.marker([lat, lng], { draggable: true }).addTo(settingsMap);
                locationMarker.on('dragend', () => {
                    const pos = locationMarker.getLatLng();
                    document.getElementById('settings-location-name').value =
                        `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
                });

                settingsMap.on('click', (e) => {
                    locationMarker.setLatLng(e.latlng);
                    document.getElementById('settings-location-name').value =
                        `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
                });
            }
            settingsMap.invalidateSize();
        }, 200);
    });

    document.getElementById('settings-modal-close').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('hidden');
    });

    document.getElementById('settings-save').addEventListener('click', async () => {
        const terms = document.getElementById('settings-terms').value
            .split('\n').map(t => t.trim()).filter(t => t);
        const interval = parseInt(document.getElementById('settings-interval').value) || 30;
        const locationName = document.getElementById('settings-location-name').value;
        const radius = parseInt(document.getElementById('settings-radius').value) || 50;

        let lat = -33.8688, lng = 151.2093;
        if (locationMarker) {
            const pos = locationMarker.getLatLng();
            lat = pos.lat;
            lng = pos.lng;
        }

        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                search_terms: terms,
                scan_interval_minutes: interval,
                location: { lat, lng, radius_km: radius, name: locationName },
            }),
        });

        document.getElementById('settings-modal').classList.add('hidden');
        loadConfig();
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });

    // --- Load config and init ---
    async function loadConfig() {
        try {
            const resp = await fetch('/api/config');
            const config = await resp.json();

            quickTerms.innerHTML = '';
            config.search_terms.forEach(term => {
                const pill = document.createElement('span');
                pill.className = 'quick-term';
                pill.textContent = term;
                pill.addEventListener('click', () => {
                    searchInput.value = term;
                    doSearch(term);
                });
                quickTerms.appendChild(pill);
            });
        } catch (e) {
            console.error('Failed to load config:', e);
        }
    }

    async function checkFbStatus() {
        try {
            const resp = await fetch('/api/fb-status');
            const data = await resp.json();
            if (data.logged_in) {
                document.getElementById('fb-status-text').textContent = 'FB Connected';
                document.getElementById('btn-fb-login').classList.add('btn-accent');
                document.getElementById('btn-fb-login').classList.remove('btn-fb');
            }
        } catch (e) {}
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Init
    connectSSE();
    loadConfig();
    checkFbStatus();
});
