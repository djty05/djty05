// Main app initialization

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('tb-date');
  if (dateInput) dateInput.value = today;

  // Start with enclosure selector
  showEnclosureSelector();

  // Populate palette
  populateParts();

  // Header buttons
  document.getElementById('btn-menu').addEventListener('click', () => {
    openModal('modal-menu');
  });

  document.getElementById('btn-info').addEventListener('click', () => {
    updatePowerInfo();
    openModal('modal-power');
  });

  // Menu actions
  document.getElementById('btn-new').addEventListener('click', newProject);
  document.getElementById('btn-change-enclosure').addEventListener('click', () => {
    closeModal('modal-menu');
    showEnclosureSelector();
  });
  document.getElementById('btn-save').addEventListener('click', saveProject);
  document.getElementById('btn-load').addEventListener('click', () => {
    document.getElementById('file-load').click();
  });
  document.getElementById('file-load').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => loadProject(evt.target.result);
    reader.readAsText(file);
  });

  document.getElementById('btn-import-csv').addEventListener('click', () => {
    closeModal('modal-menu');
    openModal('modal-csv');
  });
  document.getElementById('btn-import-csv-go').addEventListener('click', importCSV);

  document.getElementById('btn-titleblock').addEventListener('click', () => {
    closeModal('modal-menu');
    openModal('modal-titleblock');
  });

  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  // Page tabs
  document.querySelectorAll('.page-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      const page = e.target.getAttribute('data-page');
      switchPage(page);
    });
  });

  document.getElementById('btn-skip-enclosure')?.addEventListener('click', skipEnclosure);

  // Search
  document.getElementById('search-parts')?.addEventListener('input', e => {
    filterParts(e.target.value);
  });

  renderEnclosureLayout();
});

function populateParts() {
  const list = document.getElementById('parts-list');
  list.innerHTML = '';

  const categories = getCategories();

  categories.forEach(cat => {
    const parts = getPartsByCategory(cat);

    const header = document.createElement('div');
    header.className = 'part-category-header';
    header.textContent = cat;
    list.appendChild(header);

    parts.forEach(part => {
      const card = createPaletteCard(part);
      list.appendChild(card);
    });
  });
}

function createPaletteCard(part) {
  const card = document.createElement('div');
  card.className = 'part-card';
  card.dataset.partId = part.id;
  card.dataset.category = part.category;

  let thumbClass = `part-card-thumb size-${(part.pcbSize || 'c').toLowerCase()}`;
  if (part.type === 'psu') thumbClass += ' psu';

  const sizeLabel = part.pcbSize === 'external' ? 'EXT' :
    (part.pcbSize ? `SIZE ${part.pcbSize}` : 'N/A');

  card.innerHTML = `
    <div class="${thumbClass}">${sizeLabel}</div>
    <div class="part-card-info">
      <div class="part-card-code">${part.code}</div>
      <div class="part-card-desc">${part.description}</div>
      <div class="part-card-price">$${part.price.toFixed(0)}${part.wattage ? ' · ' + part.wattage + 'W' : ''}</div>
    </div>
  `;

  makePaletteCardDraggable(card, part.id);
  makePaletteCardTouchable(card, part.id);

  card.addEventListener('click', e => {
    // Only trigger click-select on non-touch devices
    if (!('ontouchstart' in window)) {
      selectPartFromPalette(part.id);
    }
  });

  return card;
}

function filterParts(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.part-card').forEach(card => {
    const code = card.querySelector('.part-card-code')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.part-card-desc')?.textContent.toLowerCase() || '';
    card.style.display = (code.includes(q) || desc.includes(q)) ? '' : 'none';
  });

  document.querySelectorAll('.part-category-header').forEach(h => {
    h.style.display = query ? 'none' : '';
  });
}

function switchPage(page) {
  document.querySelectorAll('.page-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  if (page === 'bom') renderBOM();
  if (page === 'cable') renderCableSchedule();
  if (page === 'schematic') renderSchematicDiagram();
}

function newProject() {
  if (Object.keys(placedParts).length > 0 && !confirm('Discard current project?')) return;

  placedParts = {};
  closeModal('modal-menu');
  renderEnclosureLayout();
  updateStats();
  toast('New project');
}

function saveProject() {
  const project = {
    enclosureId: currentEnclosure?.id,
    variantIdx: currentVariantIdx,
    placedParts,
    titleBlock: {
      project: document.getElementById('tb-project')?.value,
      client: document.getElementById('tb-client')?.value,
      site: document.getElementById('tb-site')?.value,
      dwgNo: document.getElementById('tb-dwgno')?.value,
      rev: document.getElementById('tb-rev')?.value,
      sheet: document.getElementById('tb-sheet')?.value,
      date: document.getElementById('tb-date')?.value,
      scale: document.getElementById('tb-scale')?.value,
      drawn: document.getElementById('tb-drawn')?.value,
      company: document.getElementById('tb-company')?.value,
      lic: document.getElementById('tb-lic')?.value,
    },
  };

  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Integriti-${document.getElementById('tb-dwgno')?.value || 'DWG'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  localStorage.setItem('ir-project', json);
  closeModal('modal-menu');
  toast('Project saved');
}

function loadProject(jsonStr) {
  try {
    const project = JSON.parse(jsonStr);
    if (project.enclosureId) {
      currentEnclosure = getPartById(project.enclosureId);
      currentVariantIdx = project.variantIdx || 0;
    }
    placedParts = project.placedParts || {};

    if (project.titleBlock) {
      const tb = project.titleBlock;
      Object.keys(tb).forEach(key => {
        const map = { project: 'tb-project', client: 'tb-client', site: 'tb-site',
          dwgNo: 'tb-dwgno', rev: 'tb-rev', sheet: 'tb-sheet', date: 'tb-date',
          scale: 'tb-scale', drawn: 'tb-drawn', company: 'tb-company', lic: 'tb-lic' };
        const el = document.getElementById(map[key]);
        if (el && tb[key] !== undefined) el.value = tb[key];
      });
    }

    renderEnclosureLayout();
    updatePowerInfo();
    updateStats();
    toast('Project loaded');
  } catch (e) {
    toast('Error: ' + e.message);
  }
}

function importCSV() {
  const textarea = document.getElementById('csv-input');
  const text = textarea.value.trim();
  if (!text) {
    toast('Paste CSV data first');
    return;
  }

  const lines = text.split('\n');
  let imported = 0;

  lines.slice(1).forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 3) return;

    const [code, desc, cat, watt, price] = parts;
    const existing = PARTS_CATALOG.find(p => p.code === code);

    if (!existing) {
      PARTS_CATALOG.push({
        id: `CUSTOM-${code}`,
        category: cat || 'Custom',
        code,
        manufacturer: 'Custom',
        description: desc,
        price: parseFloat(price) || 0,
        wattage: parseFloat(watt) || 0,
        pcbSize: 'C',
        type: 'module',
        terminals: [],
      });
      imported++;
    }
  });

  populateParts();
  closeModal('modal-csv');
  document.getElementById('csv-input').value = '';
  toast(`Imported ${imported} parts`);
}

function renderSchematicDiagram() {
  const container = document.getElementById('schematic-preview');
  if (!container) return;

  const components = getPlacedComponents();

  if (components.length === 0) {
    container.innerHTML = '<p class="muted" style="text-align:center; padding:40px">No components placed. Drag PCBs into the enclosure layout first.</p>';
    return;
  }

  let html = '<div style="display:grid; gap:8px">';

  components.forEach(c => {
    html += `
      <div style="display:flex; gap:12px; padding:12px; border:1px solid var(--ir-border); border-left:4px solid var(--ir-red); background:var(--ir-white); border-radius:3px">
        <div style="background:var(--ir-red); color:white; padding:4px 8px; border-radius:2px; font-size:11px; font-weight:700; align-self:flex-start">${c.slotId}</div>
        <div style="flex:1">
          <strong>${c.part.code}</strong>
          <div style="font-size:12px; color:var(--ir-gray); margin:2px 0">${c.part.description}</div>
          <div style="font-size:11px; color:var(--ir-gray)">
            Terminals: ${c.part.terminals?.map(t => t.name).join(' · ') || 'N/A'}
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}
