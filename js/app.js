// Main app initialization & orchestration

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all systems
  initCanvas();
  initTitleBlock();

  // Populate parts palette
  populatePalette();

  // Wire up header buttons
  document.getElementById('btn-new').addEventListener('click', newProject);
  document.getElementById('btn-save').addEventListener('click', saveProject);
  document.getElementById('btn-load').addEventListener('click', () => {
    document.getElementById('file-load').click();
  });
  document.getElementById('file-load').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      loadProject(evt.target.result);
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-export-json').addEventListener('click', saveProject);
  document.getElementById('btn-print').addEventListener('click', () => {
    document.body.classList.add('print-active');
    setTimeout(() => window.print(), 100);
    setTimeout(() => document.body.classList.remove('print-active'), 500);
  });

  // Tool buttons
  document.getElementById('tool-select').addEventListener('click', e => {
    switchTool('select', e.target);
  });
  document.getElementById('tool-wire').addEventListener('click', e => {
    switchTool('wire', e.target);
  });
  document.getElementById('tool-text').addEventListener('click', e => {
    switchTool('text', e.target);
  });
  document.getElementById('tool-pan').addEventListener('click', e => {
    switchTool('pan', e.target);
  });

  // Zoom controls
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    canvasState.zoom = Math.min(3, canvasState.zoom * 1.2);
    updateZoom();
  });
  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    canvasState.zoom = Math.max(0.5, canvasState.zoom / 1.2);
    updateZoom();
  });
  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    canvasState.zoom = 1;
    canvasState.panX = 0;
    canvasState.panY = 0;
    updateZoom();
    updatePan();
  });

  // Grid & snap
  document.getElementById('toggle-grid').addEventListener('change', e => {
    const grid = document.getElementById('layer-grid');
    grid.style.display = e.target.checked ? 'block' : 'none';
  });
  document.getElementById('toggle-snap').addEventListener('change', e => {
    canvasState.snapToGrid = e.target.checked;
    toast(e.target.checked ? 'Snap enabled' : 'Snap disabled');
  });

  // Component actions
  document.getElementById('btn-delete').addEventListener('click', () => {
    if (canvasState.selectedComponent) deleteComponent(canvasState.selectedComponent);
    if (canvasState.selectedWire) deleteWire(canvasState.selectedWire);
  });
  document.getElementById('btn-duplicate').addEventListener('click', () => {
    if (canvasState.selectedComponent) duplicateComponent(canvasState.selectedComponent);
  });
  document.getElementById('btn-rotate').addEventListener('click', () => {
    if (canvasState.selectedComponent) rotateComponent(canvasState.selectedComponent);
  });

  // Page tabs
  document.querySelectorAll('.page-tab').forEach(btn => {
    btn.addEventListener('click', e => {
      const page = e.target.getAttribute('data-tab');
      switchPage(page);
    });
  });

  // Parts palette search
  document.getElementById('search-parts').addEventListener('input', e => {
    const query = e.target.value;
    populatePalette(query);
  });

  // Palette tabs
  document.querySelectorAll('.palette-tabs .tab').forEach(tab => {
    tab.addEventListener('click', e => {
      const tabName = e.target.getAttribute('data-tab');
      switchPaletteTab(tabName);
    });
  });

  // Load last project from localStorage
  loadFromLocalStorage();
  updateZoom();

  // Initial stats
  updateStats();

  toast('Ready to design! Drag parts from the palette onto the schematic.');
});

function populatePalette(query = '') {
  const list = document.getElementById('parts-list');
  list.innerHTML = '';

  const categories = getCategories().sort();
  const q = query.toLowerCase();

  categories.forEach(cat => {
    const parts = getPartsByCategory(cat).filter(p => {
      return !q || p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
    });

    if (parts.length === 0) return;

    const catDiv = document.createElement('div');
    catDiv.className = 'parts-category';
    catDiv.innerHTML = `
      ${cat} <span class="count">${parts.length}</span>
    `;
    list.appendChild(catDiv);

    parts.forEach(part => {
      const card = document.createElement('div');
      card.className = 'part-card';
      card.draggable = true;

      const thumb = document.createElement('div');
      thumb.className = 'part-thumb';

      // Simple icon SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 46 40');
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', 4);
      rect.setAttribute('y', 4);
      rect.setAttribute('width', 38);
      rect.setAttribute('height', 32);
      rect.setAttribute('fill', getCategoryColor(cat));
      rect.setAttribute('rx', 2);
      svg.appendChild(rect);
      thumb.appendChild(svg);

      const info = document.createElement('div');
      info.className = 'part-info';
      info.innerHTML = `
        <div class="name">${part.code}</div>
        <div class="meta">${part.category}</div>
        <div class="price">$${part.price.toFixed(0)}</div>
      `;

      card.appendChild(thumb);
      card.appendChild(info);

      card.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/partid', part.id);
      });

      list.appendChild(card);
    });
  });
}

function switchTool(toolName, elem) {
  canvasState.mode = toolName;
  document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
  elem.classList.add('active');

  if (toolName === 'wire' && !canvasState.wiringFrom) {
    toast('Click first terminal to start wiring...');
  }
}

function switchPage(pageName) {
  document.querySelectorAll('.page-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageName}`).classList.add('active');

  document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

  if (pageName === 'bom') renderBOM();
  if (pageName === 'cable') renderCableSchedule();
  if (pageName === 'titleblock') renderTitleBlockPreview();
}

function switchPaletteTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');

  document.querySelectorAll('.palette-tabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Global handler for canvas changes
window.addEventListener('canvasupdate', onCanvasChange);

// Auto-save every 30 seconds
setInterval(() => {
  if (canvasState.components.length > 0) {
    const project = {
      name: titleBlockState.project || 'Untitled',
      timestamp: new Date().toISOString(),
      components: canvasState.components,
      wires: canvasState.wires,
      titleBlock: titleBlockState,
      viewport: { zoom: canvasState.zoom, panX: canvasState.panX, panY: canvasState.panY },
    };
    localStorage.setItem('ir-last-project', JSON.stringify(project));
  }
}, 30000);
