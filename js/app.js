// Main app initialization - Mobile-first

document.addEventListener('DOMContentLoaded', () => {
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tb-date').value = today;

  // Init modals
  showEnclosureSelector();

  // Populate parts palette
  populateParts();

  // Header buttons
  document.getElementById('btn-menu').addEventListener('click', () => {
    openModal('modal-menu');
  });

  document.getElementById('btn-info').addEventListener('click', () => {
    openModal('modal-power');
    updatePowerInfo();
  });

  // Menu actions
  document.getElementById('btn-new').addEventListener('click', newProject);
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

  document.getElementById('btn-export-json').addEventListener('click', saveProject);
  document.getElementById('btn-import-csv').addEventListener('click', () => {
    openModal('modal-csv');
  });
  document.getElementById('btn-import-csv-go').addEventListener('click', importCSV);

  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btn-titleblock').addEventListener('click', () => {
    openModal('modal-titleblock');
  });

  // Page tabs
  document.querySelectorAll('.page-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      const page = e.target.getAttribute('data-page');
      switchPage(page);
    });
  });

  // Skip enclosure button
  document.getElementById('btn-skip-enclosure')?.addEventListener('click', skipEnclosure);

  updateZoom();
  updateStats();
  toast('Ready! Select an enclosure to start.');
});

function populateParts() {
  const list = document.getElementById('parts-list');
  const categories = getCategories();

  categories.forEach(cat => {
    const parts = getPartsByCategory(cat);

    // Category header
    const catDiv = document.createElement('div');
    catDiv.style.fontSize = '11px';
    catDiv.style.fontWeight = '700';
    catDiv.style.padding = '8px 4px 2px';
    catDiv.style.textTransform = 'uppercase';
    catDiv.style.color = '#6b7280';
    catDiv.style.borderBottom = '1px solid #e5e7eb';
    catDiv.textContent = cat;
    list.appendChild(catDiv);

    // Parts
    parts.forEach(part => {
      const item = document.createElement('button');
      item.className = 'part-item';
      item.innerHTML = `
        <div class="code">${part.code}</div>
        <div class="desc">${part.description.substring(0, 40)}</div>
        <div class="desc">$${part.price.toFixed(0)}</div>
      `;
      item.addEventListener('click', () => {
        selectPartFromPalette(part.id);
      });
      list.appendChild(item);
    });
  });
}

function switchPage(page) {
  document.querySelectorAll('.page-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  if (page === 'bom') renderBOM();
  if (page === 'cable') renderCableSchedule();
  if (page === 'layout') updateLayoutPreview();
}

function newProject() {
  if (canvasState.components.length > 0 && !confirm('Discard current project?')) return;

  document.getElementById('layer-components').innerHTML = '';
  document.getElementById('layer-wires').innerHTML = '';
  canvasState.components = [];
  canvasState.wires = [];
  canvasState.selectedComponent = null;
  canvasState.nextComponentId = 1;
  canvasState.nextWireId = 1;

  closeModal('modal-menu');
  updateStats();
  renderBOM();
  toast('New project');
}

function saveProject() {
  const project = {
    enclosureId: currentEnclosure?.id,
    components: canvasState.components,
    wires: canvasState.wires,
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
  toast('Project saved!');
}

function loadProject(jsonStr) {
  try {
    const project = JSON.parse(jsonStr);

    // Restore enclosure
    if (project.enclosureId) {
      currentEnclosure = getPartById(project.enclosureId);
    }

    // Clear canvas
    document.getElementById('layer-components').innerHTML = '';
    document.getElementById('layer-wires').innerHTML = '';
    canvasState.components = [];
    canvasState.wires = [];

    // Restore components
    project.components?.forEach(comp => {
      const g = createComponentSymbol(comp.partId, comp.id);
      if (g) {
        g.setAttribute('id', `comp-${comp.id}`);
        g.setAttribute('transform', `translate(${comp.x}, ${comp.y})`);
        document.getElementById('layer-components').appendChild(g);
      }
      canvasState.components.push(comp);
      canvasState.nextComponentId = Math.max(canvasState.nextComponentId, parseInt(comp.id.match(/\d+/)?.[0] || 0) + 1);
    });

    // Restore wires
    project.wires?.forEach(wire => {
      const fromComp = canvasState.components.find(c => c.id === wire.fromComp);
      const toComp = canvasState.components.find(c => c.id === wire.toComp);
      if (fromComp && toComp) {
        const path = createWirePath(fromComp.x + 60, fromComp.y + 60, toComp.x + 60, toComp.y + 60, wire.id);
        document.getElementById('layer-wires').appendChild(path);
      }
      canvasState.wires.push(wire);
    });

    // Restore title block
    if (project.titleBlock) {
      document.getElementById('tb-project').value = project.titleBlock.project || '';
      document.getElementById('tb-client').value = project.titleBlock.client || '';
      document.getElementById('tb-site').value = project.titleBlock.site || '';
      document.getElementById('tb-dwgno').value = project.titleBlock.dwgNo || 'DWG-001';
      document.getElementById('tb-rev').value = project.titleBlock.rev || 'A';
      document.getElementById('tb-sheet').value = project.titleBlock.sheet || '1 of 1';
      document.getElementById('tb-date').value = project.titleBlock.date || '';
      document.getElementById('tb-scale').value = project.titleBlock.scale || 'NTS';
      document.getElementById('tb-drawn').value = project.titleBlock.drawn || '';
      document.getElementById('tb-company').value = project.titleBlock.company || '';
      document.getElementById('tb-lic').value = project.titleBlock.lic || '';
    }

    updatePowerInfo();
    updateStats();
    renderBOM();
    toast('Project loaded!');
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

  // Simple CSV parsing
  const lines = text.split('\n');
  let imported = 0;

  lines.slice(1).forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 3) return;

    const [code, desc, cat, watt, price] = parts;
    const existingPart = PARTS_CATALOG.find(p => p.code === code);

    if (!existingPart) {
      PARTS_CATALOG.push({
        id: `CUSTOM-${code}`,
        category: cat || 'Custom',
        code,
        manufacturer: 'Custom',
        description: desc,
        price: parseFloat(price) || 0,
        wattage: parseFloat(watt) || 0,
        terminals: [],
        width: 80,
        height: 80,
      });
      imported++;
    }
  });

  populateParts();
  closeModal('modal-csv');
  document.getElementById('csv-input').value = '';
  toast(`Imported ${imported} parts`);
}
