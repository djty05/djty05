// Mobile-first canvas: tap-to-place, touch gestures

let canvasState = {
  components: [],
  wires: [],
  selectedComponent: null,
  selectedPartId: null,
  gridSize: 20,
  snapToGrid: true,
  zoom: 1,
  panX: 0,
  panY: 0,
  mode: 'select',
  wiringFrom: null,
  nextComponentId: 1,
  nextWireId: 1,
};

function initCanvas() {
  const svg = document.getElementById('svg-canvas');
  if (!svg) return;

  drawFrame('svg-canvas');

  // Touch events for placement
  svg.addEventListener('click', handleCanvasClick);
  svg.addEventListener('touchend', handleCanvasTouch);

  // Component selection
  svg.addEventListener('click', e => {
    const comp = e.target.closest('.component');
    if (comp && canvasState.mode === 'select') {
      selectComponent(comp);
    }
  });

  // Delete button
  document.getElementById('btn-delete')?.addEventListener('click', () => {
    if (canvasState.selectedComponent) {
      deleteComponent(canvasState.selectedComponent);
    }
  });

  // Zoom fit
  document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
    fitCanvasToView();
  });

  // Tool buttons
  document.getElementById('tool-select')?.addEventListener('click', () => {
    switchTool('select');
  });
  document.getElementById('tool-wire')?.addEventListener('click', () => {
    switchTool('wire');
  });

  updateZoom();
}

function handleCanvasClick(e) {
  const svg = document.getElementById('svg-canvas');
  const rect = svg.getBoundingClientRect();
  const x = (e.clientX - rect.left) / canvasState.zoom;
  const y = (e.clientY - rect.top) / canvasState.zoom;

  if (canvasState.mode === 'select' && canvasState.selectedPartId) {
    placeComponent(canvasState.selectedPartId, x, y);
    canvasState.selectedPartId = null;
  }

  if (canvasState.mode === 'wire') {
    const terminal = e.target.closest('.terminal');
    if (terminal) {
      handleWireClick(terminal, e);
    }
  }
}

function handleCanvasTouch(e) {
  // Delegate to click handler for touch
  if (e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    const svg = document.getElementById('svg-canvas');
    const rect = svg.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / canvasState.zoom;
    const y = (touch.clientY - rect.top) / canvasState.zoom;

    if (canvasState.mode === 'select' && canvasState.selectedPartId) {
      placeComponent(canvasState.selectedPartId, x, y);
      canvasState.selectedPartId = null;
    }
  }
}

function selectPartFromPalette(partId) {
  canvasState.selectedPartId = partId;
  toast('Tap on the schematic to place the component');
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
    'Cables': 'CB',
    'Enclosures': 'S',
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

  const compData = { id: refDes, partId, x, y, rotation: 0 };

  document.getElementById('layer-components').appendChild(g);
  canvasState.components.push(compData);

  updatePowerInfo();
  updateStats();
  renderBOM();
  renderCableSchedule();
  toast(`Added ${part.code} as ${refDes}`);
}

function selectComponent(elem) {
  document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  elem.classList.add('selected');
  canvasState.selectedComponent = elem;
}

function deleteComponent(elem) {
  const refDes = elem.getAttribute('data-ref');
  elem.remove();
  canvasState.components = canvasState.components.filter(c => c.id !== refDes);
  canvasState.selectedComponent = null;
  updatePowerInfo();
  updateStats();
  toast(`Deleted ${refDes}`);
}

function handleWireClick(terminal, e) {
  e.stopPropagation();
  const component = terminal.closest('.component');
  if (!component) return;

  const termName = terminal.getAttribute('data-term-name');
  const compRef = component.getAttribute('data-ref');
  const x = parseFloat(component.getAttribute('transform')?.match(/translate\(([\d.]+)/)?.[1] || 0) +
            parseFloat(terminal.getAttribute('cx') || 0);
  const y = parseFloat(component.getAttribute('transform')?.match(/translate\(\d+, ([\d.]+)\)/)?.[1] || 0) +
            parseFloat(terminal.getAttribute('cy') || 0);

  if (!canvasState.wiringFrom) {
    canvasState.wiringFrom = { compRef, termName, x, y };
    terminal.classList.add('active');
    toast(`Click second terminal for ${compRef}.${termName}`);
  } else {
    if (canvasState.wiringFrom.compRef === compRef && canvasState.wiringFrom.termName === termName) {
      toast('Cannot wire to itself');
      return;
    }

    const wireId = `W${++canvasState.nextWireId}`;
    const wireData = {
      id: wireId,
      fromComp: canvasState.wiringFrom.compRef,
      fromTerm: canvasState.wiringFrom.termName,
      toComp: compRef,
      toTerm: termName,
    };

    const path = createWirePath(canvasState.wiringFrom.x, canvasState.wiringFrom.y, x, y, wireId);
    document.getElementById('layer-wires').appendChild(path);
    canvasState.wires.push(wireData);

    document.querySelectorAll('.terminal.active').forEach(t => t.classList.remove('active'));
    canvasState.wiringFrom = null;
    updateStats();
    renderCableSchedule();
    toast(`Wired ${wireId}`);
  }
}

function switchTool(tool) {
  canvasState.mode = tool;
  document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
  document.getElementById(`tool-${tool}`)?.classList.add('active');
}

function updateZoom() {
  const svg = document.getElementById('svg-canvas');
  const wrap = document.getElementById('canvas-wrap');
  if (!svg || !wrap) return;

  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  const viewBox = svg.viewBox.baseVal;
  const scale = Math.min(w / viewBox.width, h / viewBox.height) * 0.9;

  svg.style.width = viewBox.width * scale + 'px';
  svg.style.height = viewBox.height * scale + 'px';

  document.getElementById('zoom-display').textContent = Math.round(scale * 100) + '%';
}

function fitCanvasToView() {
  updateZoom();
}

function drawFrame(svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const gridLayer = document.getElementById('layer-grid');
  gridLayer.innerHTML = '';

  const viewBox = svg.viewBox.baseVal;
  const w = viewBox.width;
  const h = viewBox.height;

  // Grid
  const gridSize = 20;
  for (let x = 0; x < w; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'grid-minor');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', h);
    gridLayer.appendChild(line);
  }
  for (let y = 0; y < h; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'grid-minor');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', w);
    line.setAttribute('y2', y);
    gridLayer.appendChild(line);
  }

  // Frame
  const frameLayer = document.getElementById('layer-frame');
  frameLayer.innerHTML = '';
  const frame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  frame.setAttribute('class', 'frame-border');
  frame.setAttribute('x', 0);
  frame.setAttribute('y', 0);
  frame.setAttribute('width', w);
  frame.setAttribute('height', h);
  frameLayer.appendChild(frame);
}

function updateStats() {
  document.getElementById('info-components').textContent = canvasState.components.length;
  document.getElementById('info-cables').textContent = canvasState.wires.length;

  let total = 0;
  canvasState.components.forEach(comp => {
    const part = getPartById(comp.partId);
    if (part) total += part.price;
  });
  document.getElementById('info-total').textContent = '$' + total.toFixed(2);
}
