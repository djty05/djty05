// Main app - Multi-Enclosure Project Support

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('tb-date');
  if (dateInput) dateInput.value = today;

  // Initialize project
  initializeProject('New Project');
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

  // Site page buttons
  document.getElementById('btn-add-enclosure')?.addEventListener('click', showEnclosureSelector);
  document.getElementById('btn-add-reader')?.addEventListener('click', () => {
    showAddComponentDialog('reader');
  });
  document.getElementById('btn-add-lock')?.addEventListener('click', () => {
    showAddComponentDialog('lock');
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

  if (page === 'site') renderSitePlan();
  if (page === 'bom') renderBOM();
  if (page === 'cable') renderCableSchedule();
  if (page === 'schematic') renderSchematicDiagram();
}

function renderSitePlan() {
  const canvas = document.getElementById('site-canvas');
  if (!canvas || !currentProject) return;

  canvas.innerHTML = '';
  canvas.style.display = 'flex';
  canvas.style.flexWrap = 'wrap';
  canvas.style.gap = '20px';
  canvas.style.padding = '20px';
  canvas.style.justifyContent = 'center';

  currentProject.enclosures.forEach((enclosure, idx) => {
    const part = getPartById(enclosure.enclosureId);
    const card = document.createElement('div');
    card.style.cssText = `
      background: white;
      border: 2px solid var(--ir-red);
      padding: 12px;
      border-radius: 4px;
      cursor: pointer;
      flex: 0 1 auto;
      text-align: center;
      transition: all 0.2s;
    `;
    card.onmouseover = () => card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    card.onmouseout = () => card.style.boxShadow = 'none';

    card.innerHTML = `
      <strong style="display:block; color:var(--ir-red); margin-bottom:4px">${part.code}</strong>
      <div style="font-size:11px; color:var(--ir-gray); margin-bottom:8px">${part.description}</div>
      <div style="font-size:10px; color:var(--ir-gray); margin-bottom:8px">${part.width_mm}×${part.height_mm}mm</div>
      <div style="display:flex; gap:4px; justify-content:center">
        <button onclick="selectEnclosure(${idx})" style="flex:1; padding:6px; background:var(--ir-red); color:white; border:none; border-radius:2px; font-size:11px; cursor:pointer">Edit</button>
        <button onclick="removeEnclosureFromProject(${idx})" style="flex:0 0 30px; padding:6px; background:#fecaca; color:#dc2626; border:none; border-radius:2px; cursor:pointer">✕</button>
      </div>
    `;
    canvas.appendChild(card);
  });

  if (currentProject.enclosures.length === 0) {
    canvas.innerHTML = '<div style="text-align:center; color:var(--ir-gray); padding:40px">No enclosures. Click + Add to start.</div>';
  }
}

function renderSchematicDiagram() {
  const container = document.getElementById('schematic-preview');
  if (!container) return;

  const components = getPlacedComponents();

  if (components.length === 0) {
    container.innerHTML = '<p class="muted" style="text-align:center; padding:40px">No components placed.</p>';
    return;
  }

  let html = '<div style="display:grid; gap:8px">';

  components.forEach(c => {
    html += `
      <div style="display:flex; gap:12px; padding:12px; border:1px solid var(--ir-border); border-left:4px solid var(--ir-red); background:var(--ir-white); border-radius:3px">
        <div style="background:var(--ir-red); color:white; padding:4px 8px; border-radius:2px; font-size:11px; font-weight:700; align-self:flex-start">${c.enclosurePart.code}</div>
        <div style="flex:1">
          <strong>${c.component.code}</strong>
          <div style="font-size:12px; color:var(--ir-gray); margin:2px 0">${c.component.description}</div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function newProject() {
  if (currentProject?.enclosures.length > 0 && !confirm('Discard project?')) return;
  initializeProject('New Project');
  renderEnclosureLayout();
  updateStats();
  toast('New project');
}

function saveProject() {
  if (!currentProject) return;

  const project = {
    name: currentProject.name,
    enclosures: currentProject.enclosures,
    siteComponents: currentProject.siteComponents,
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
    currentProject = project;
    selectedEnclosureIdx = 0;

    if (project.titleBlock) {
      const tb = project.titleBlock;
      const map = {
        project: 'tb-project', client: 'tb-client', site: 'tb-site',
        dwgNo: 'tb-dwgno', rev: 'tb-rev', sheet: 'tb-sheet', date: 'tb-date',
        scale: 'tb-scale', drawn: 'tb-drawn', company: 'tb-company', lic: 'tb-lic'
      };
      Object.keys(tb).forEach(key => {
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

function showAddComponentDialog(type) {
  // Placeholder - would open a dialog to select reader/lock from catalog
  const typeLabel = type === 'reader' ? 'Reader' : 'Lock';
  const parts = PARTS_CATALOG.filter(p => p.type === type);
  if (parts.length === 0) {
    toast(`No ${typeLabel}s available`);
    return;
  }
  toast(`Add ${typeLabel} feature coming soon`);
}

function skipEnclosure() {
  if (currentProject.enclosures.length === 0) {
    renderEnclosureLayout();
    toast('No enclosure - site-only mode');
  }
}
