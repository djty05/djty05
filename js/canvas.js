// Canvas interactions: drag-drop, select, wire, pan, zoom

let canvasState = {
  components: [],
  wires: [],
  selectedComponent: null,
  selectedWire: null,
  gridSize: 20,
  snapToGrid: true,
  zoom: 1,
  panX: 0,
  panY: 0,
  mode: 'select', // select, wire, text, pan
  wiringFrom: null,
  nextComponentId: 1,
  nextWireId: 1,
};

const SVG_WIDTH = 4200;
const SVG_HEIGHT = 2970;

function initCanvas() {
  const svg = document.getElementById('svg-canvas');
  const wrap = document.getElementById('canvas-wrap');
  if (!svg) return;

  drawFrame('svg-canvas', SVG_WIDTH, SVG_HEIGHT);

  // Drag-drop from palette
  svg.addEventListener('dragover', e => {
    e.preventDefault();
    e.dropEffect = 'copy';
    document.getElementById('drop-zone')?.remove();
    const zone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    zone.id = 'drop-zone';
    zone.setAttribute('class', 'drop-zone show');
    zone.setAttribute('x', Math.max(100, e.offsetX - 50));
    zone.setAttribute('y', Math.max(100, e.offsetY - 50));
    zone.setAttribute('width', 100);
    zone.setAttribute('height', 100);
    svg.appendChild(zone);
  });

  svg.addEventListener('dragleave', e => {
    if (e.target === svg) {
      document.getElementById('drop-zone')?.remove();
    }
  });

  svg.addEventListener('drop', e => {
    e.preventDefault();
    document.getElementById('drop-zone')?.remove();

    const partId = e.dataTransfer.getData('text/partid');
    if (!partId) return;

    const rect = svg.getBoundingClientRect();
    const pt = svg.createSVGPoint();
    pt.x = e.clientX - rect.left;
    pt.y = e.clientY - rect.top;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    placeComponent(partId, Math.round(svgPt.x), Math.round(svgPt.y));
  });

  // Canvas click for wiring & selection
  svg.addEventListener('click', e => {
    if (canvasState.mode === 'wire') {
      handleWireClick(e);
    } else if (canvasState.mode === 'select') {
      const rect = svg.getBoundingClientRect();
      const pt = svg.createSVGPoint();
      pt.x = e.clientX - rect.left;
      pt.y = e.clientY - rect.top;
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

      if (!e.target.closest('.component') && !e.target.closest('.wire')) {
        deselectAll();
      }
    }
  });

  // Component interaction
  svg.addEventListener('mousedown', e => {
    const comp = e.target.closest('.component');
    if (comp && canvasState.mode === 'select') {
      selectComponent(comp, e);
    }

    const wire = e.target.closest('.wire');
    if (wire && canvasState.mode === 'select') {
      selectWire(wire, e);
    }
  });

  // Zoom & pan
  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, canvasState.zoom * delta));
    const zoomChange = newZoom - canvasState.zoom;
    canvasState.zoom = newZoom;
    updateZoom();
  });

  // Middle mouse / spacebar drag for pan
  let isPanning = false;
  let panStart = { x: 0, y: 0 };

  wrap.addEventListener('mousedown', e => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
    }
  });

  wrap.addEventListener('mousemove', e => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      canvasState.panX += dx;
      canvasState.panY += dy;
      panStart = { x: e.clientX, y: e.clientY };
      updatePan();
    }
  });

  wrap.addEventListener('mouseup', () => {
    isPanning = false;
  });

  // Double-click to edit reference
  svg.addEventListener('dblclick', e => {
    const comp = e.target.closest('.component');
    if (comp) {
      editComponentRef(comp);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (canvasState.selectedComponent) deleteComponent(canvasState.selectedComponent);
      if (canvasState.selectedWire) deleteWire(canvasState.selectedWire);
    }
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      if (canvasState.selectedComponent) duplicateComponent(canvasState.selectedComponent);
    }
    if (e.key === 'r' && canvasState.selectedComponent) {
      rotateComponent(canvasState.selectedComponent);
    }
  });
}

function placeComponent(partId, x, y) {
  const part = getPartById(partId);
  if (!part) return;

  const refPrefix = {
    'Controllers': 'C',
    'Expansion Modules': 'E',
    'Card Readers': 'R',
    'Keypads': 'K',
    'Power Supplies': 'P',
    'Detectors': 'D',
    'Door Hardware': 'H',
    'Enclosures': 'S',
    'Cables': 'CB',
  }[part.category] || 'X';

  const refNum = ++canvasState.nextComponentId;
  const refDes = refPrefix + refNum;

  if (canvasState.snapToGrid) {
    x = Math.round(x / canvasState.gridSize) * canvasState.gridSize;
    y = Math.round(y / canvasState.gridSize) * canvasState.gridSize;
  }

  const g = createComponentSymbol(partId, refDes);
  if (!g) return;

  g.setAttribute('id', `comp-${refDes}`);
  g.setAttribute('transform', `translate(${x}, ${y})`);

  const compData = {
    id: refDes,
    partId,
    x,
    y,
    rotation: 0,
  };

  document.getElementById('layer-components').appendChild(g);
  canvasState.components.push(compData);

  selectComponent(g);
  updateStats();
  toast(`Added ${part.code} as ${refDes}`);
}

function selectComponent(elem, e) {
  if (e) e.stopPropagation();
  deselectAll();
  elem.classList.add('selected');
  canvasState.selectedComponent = elem;
  showProperties(elem);
}

function selectWire(elem, e) {
  if (e) e.stopPropagation();
  deselectAll();
  elem.classList.add('selected');
  canvasState.selectedWire = elem;
}

function deselectAll() {
  document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  canvasState.selectedComponent = null;
  canvasState.selectedWire = null;
  showProperties(null);
}

function deleteComponent(elem) {
  const refDes = elem.getAttribute('data-ref');
  elem.remove();
  canvasState.components = canvasState.components.filter(c => c.id !== refDes);
  deselectAll();
  updateStats();
  toast(`Deleted ${refDes}`);
}

function deleteWire(elem) {
  const wireId = elem.getAttribute('data-wire-id');
  elem.remove();
  canvasState.wires = canvasState.wires.filter(w => w.id !== wireId);
  deselectAll();
  updateStats();
  toast('Deleted wire');
}

function duplicateComponent(elem) {
  const refDes = elem.getAttribute('data-ref');
  const comp = canvasState.components.find(c => c.id === refDes);
  if (!comp) return;

  const refNum = ++canvasState.nextComponentId;
  const newRefPrefix = refDes.substring(0, refDes.length - (refNum.toString().length));
  const newRefDes = newRefPrefix + refNum;

  const g = createComponentSymbol(comp.partId, newRefDes);
  if (!g) return;

  const offsetX = comp.x + 150;
  const offsetY = comp.y;

  g.setAttribute('id', `comp-${newRefDes}`);
  g.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);

  const newCompData = { ...comp, id: newRefDes, x: offsetX, y: offsetY };

  document.getElementById('layer-components').appendChild(g);
  canvasState.components.push(newCompData);

  selectComponent(g);
  updateStats();
  toast(`Duplicated as ${newRefDes}`);
}

function rotateComponent(elem) {
  const refDes = elem.getAttribute('data-ref');
  const comp = canvasState.components.find(c => c.id === refDes);
  if (!comp) return;

  comp.rotation = (comp.rotation + 90) % 360;
  const currentTransform = elem.getAttribute('transform') || '';
  elem.setAttribute('transform', `translate(${comp.x}, ${comp.y}) rotate(${comp.rotation})`);
  toast(`Rotated ${refDes} to ${comp.rotation}°`);
}

function editComponentRef(elem) {
  const current = elem.getAttribute('data-ref');
  const newRef = prompt('Edit reference designator:', current);
  if (!newRef || newRef === current) return;

  const comp = canvasState.components.find(c => c.id === current);
  if (!comp) return;

  comp.id = newRef;
  elem.setAttribute('data-ref', newRef);
  elem.setAttribute('id', `comp-${newRef}`);

  // Update text in symbol
  const refText = elem.querySelector('.comp-ref');
  if (refText) refText.textContent = newRef;

  updateStats();
  toast(`Renamed to ${newRef}`);
}

function handleWireClick(e) {
  const terminal = e.target.closest('.terminal');
  if (!terminal) return;

  const component = terminal.closest('.component');
  if (!component) return;

  const termName = terminal.getAttribute('data-term-name');
  const compRef = component.getAttribute('data-ref');
  const x = parseFloat(component.getAttribute('transform').match(/translate\(([\d.]+)/)[1]) +
            parseFloat(terminal.getAttribute('cx'));
  const y = parseFloat(component.getAttribute('transform').match(/translate\(\d+, ([\d.]+)\)/)[1]) +
            parseFloat(terminal.getAttribute('cy'));

  if (!canvasState.wiringFrom) {
    canvasState.wiringFrom = { compRef, termName, x, y, element: terminal };
    terminal.classList.add('active');
    toast(`Click second terminal to connect to ${compRef}.${termName}`);
  } else {
    if (canvasState.wiringFrom.compRef === compRef && canvasState.wiringFrom.termName === termName) {
      toast('Cannot connect terminal to itself');
      return;
    }

    const wireId = `W${++canvasState.nextWireId}`;
    const wireData = {
      id: wireId,
      fromComp: canvasState.wiringFrom.compRef,
      fromTerm: canvasState.wiringFrom.termName,
      toComp: compRef,
      toTerm: termName,
      type: 'multi-pair',
    };

    const path = createWirePath(canvasState.wiringFrom.x, canvasState.wiringFrom.y, x, y, wireId);
    document.getElementById('layer-wires').appendChild(path);
    canvasState.wires.push(wireData);

    canvasState.wiringFrom.element.classList.remove('active');
    canvasState.wiringFrom = null;
    updateStats();
    toast(`Connected wire ${wireId}`);
  }
}

function updateZoom() {
  const svg = document.getElementById('svg-canvas');
  const wrap = document.getElementById('canvas-wrap');
  if (!svg) return;

  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  const svgW = SVG_WIDTH;
  const svgH = SVG_HEIGHT;

  const scale = canvasState.zoom * Math.min(w / svgW, h / svgH);
  svg.style.width = svgW * canvasState.zoom + 'px';
  svg.style.height = svgH * canvasState.zoom + 'px';

  document.getElementById('zoom-display').textContent = Math.round(canvasState.zoom * 100) + '%';
}

function updatePan() {
  const svg = document.getElementById('svg-canvas');
  if (!svg) return;
  svg.style.transform = `translate(${canvasState.panX}px, ${canvasState.panY}px)`;
}

function showProperties(elem) {
  const panel = document.getElementById('properties-panel');
  if (!elem) {
    panel.innerHTML = '<p class="muted">Select a component or cable to edit properties.</p>';
    return;
  }

  const refDes = elem.getAttribute('data-ref');
  const partId = elem.getAttribute('data-part-id');
  const part = getPartById(partId);
  if (!part) return;

  let html = `<h4>${refDes}</h4>`;
  html += `<div class="prop-section">
    <label class="prop-row">
      <span>Part Code</span>
      <input type="text" value="${part.code}" readonly />
    </label>
    <label class="prop-row">
      <span>Description</span>
      <input type="text" value="${part.description}" readonly />
    </label>
    <label class="prop-row">
      <span>Category</span>
      <input type="text" value="${part.category}" readonly />
    </label>
    <label class="prop-row">
      <span>Unit Price</span>
      <input type="text" value="$${part.price.toFixed(2)}" readonly />
    </label>
  </div>`;

  if (part.terminals && part.terminals.length > 0) {
    html += `<h4>Terminals (${part.terminals.length})</h4><div class="prop-section">`;
    part.terminals.forEach(t => {
      html += `<div style="font-size:11px; padding:2px 0; color:#6b7280">
        <strong>${t.name}</strong> <span style="color:#999">(${t.type})</span>
      </div>`;
    });
    html += '</div>';
  }

  panel.innerHTML = html;
}

function updateStats() {
  document.getElementById('stat-components').textContent = canvasState.components.length;
  document.getElementById('stat-cables').textContent = canvasState.wires.length;
  document.getElementById('stat-bom').textContent = new Set(canvasState.components.map(c => c.partId)).size;

  let total = 0;
  canvasState.components.forEach(comp => {
    const part = getPartById(comp.partId);
    if (part) total += part.price;
  });
  document.getElementById('stat-total').textContent = '$' + total.toFixed(2);
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
