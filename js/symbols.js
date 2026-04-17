// SVG Symbols & Component Rendering

function createComponentSymbol(partId, refDes) {
  const part = getPartById(partId);
  if (!part) return null;

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', partId);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = part.width || 100;
  const h = part.height || 120;

  // Background rect
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('class', 'comp-bg');
  bg.setAttribute('x', 0);
  bg.setAttribute('y', 0);
  bg.setAttribute('width', w);
  bg.setAttribute('height', h);
  bg.setAttribute('fill', '#f0f4f8');
  bg.setAttribute('stroke', '#334155');
  bg.setAttribute('stroke-width', 2);
  bg.setAttribute('rx', 4);
  g.appendChild(bg);

  // Reference text (larger)
  const refText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  refText.setAttribute('class', 'comp-ref');
  refText.setAttribute('x', w / 2);
  refText.setAttribute('y', 20);
  refText.setAttribute('text-anchor', 'middle');
  refText.setAttribute('font-size', '14');
  refText.setAttribute('fill', '#1d4ed8');
  refText.textContent = refDes;
  g.appendChild(refText);

  // Part code (smaller)
  const codeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  codeText.setAttribute('class', 'comp-code');
  codeText.setAttribute('x', w / 2);
  codeText.setAttribute('y', 40);
  codeText.setAttribute('text-anchor', 'middle');
  codeText.setAttribute('font-size', '10');
  codeText.setAttribute('fill', '#6b7280');
  codeText.textContent = part.code;
  g.appendChild(codeText);

  // Description (wrapped)
  const descText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  descText.setAttribute('class', 'comp-label');
  descText.setAttribute('x', w / 2);
  descText.setAttribute('y', h - 20);
  descText.setAttribute('text-anchor', 'middle');
  descText.setAttribute('font-size', '10');
  descText.setAttribute('fill', '#374151');
  const desc = part.description.substring(0, 20);
  descText.textContent = desc + (part.description.length > 20 ? '...' : '');
  g.appendChild(descText);

  // Terminals (circles)
  part.terminals.forEach(term => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'terminal');
    circle.setAttribute('cx', term.x);
    circle.setAttribute('cy', term.y);
    circle.setAttribute('r', 5);
    circle.setAttribute('data-term-name', term.name);
    circle.setAttribute('data-term-type', term.type || 'general');
    circle.setAttribute('data-term-index', part.terminals.indexOf(term));
    g.appendChild(circle);

    // Terminal label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('font-size', '8');
    label.setAttribute('fill', '#6b7280');
    label.setAttribute('pointer-events', 'none');
    if (term.x < w / 2) {
      label.setAttribute('x', term.x - 15);
      label.setAttribute('text-anchor', 'end');
    } else {
      label.setAttribute('x', term.x + 15);
      label.setAttribute('text-anchor', 'start');
    }
    label.setAttribute('y', term.y + 3);
    label.textContent = term.name;
    g.appendChild(label);
  });

  return g;
}

// Build legend entry SVG for right sidebar
function createLegendSymbol(partId, color = '#4b5563') {
  const part = getPartById(partId);
  if (!part) return null;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 26 20');
  svg.setAttribute('width', '26');
  svg.setAttribute('height', '20');

  // Simple colored rect icon
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', 0);
  rect.setAttribute('y', 0);
  rect.setAttribute('width', 26);
  rect.setAttribute('height', 20);
  rect.setAttribute('fill', color);
  rect.setAttribute('stroke', '#0f172a');
  rect.setAttribute('stroke-width', 1);
  rect.setAttribute('rx', 2);
  svg.appendChild(rect);

  // Category initial
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', 13);
  text.setAttribute('y', 13);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '10');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', '#fff');
  text.textContent = part.category.substring(0, 1);
  svg.appendChild(text);

  return svg;
}

// Color map for part categories
const CATEGORY_COLORS = {
  'Controllers': '#1d4ed8',
  'Expansion Modules': '#7c3aed',
  'Card Readers': '#06b6d4',
  'Keypads': '#f59e0b',
  'Power Supplies': '#dc2626',
  'Detectors': '#10b981',
  'Door Hardware': '#8b5cf6',
  'Enclosures': '#64748b',
  'Cables': '#6366f1',
};

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || '#6b7280';
}

// Terminal type colors
const TERMINAL_TYPE_COLORS = {
  'power': '#dc2626',
  'serial': '#1d4ed8',
  'relay': '#f59e0b',
  'reader': '#10b981',
  'input': '#8b5cf6',
  'data': '#06b6d4',
  'switch': '#64748b',
  'alarm': '#ef4444',
  'sense': '#fbbf24',
};

function getTerminalTypeColor(type) {
  return TERMINAL_TYPE_COLORS[type] || '#6b7280';
}

// Create cable/wire path between two terminals
function createWirePath(x1, y1, x2, y2, wireId = null, cableType = 'multi-pair') {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'wire');
  if (wireId) path.setAttribute('data-wire-id', wireId);
  path.setAttribute('data-cable-type', cableType);

  // Manhattan routing: horizontal -> vertical
  const midX = x1 + (x2 - x1) / 2;
  const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  path.setAttribute('d', d);

  return path;
}

// SVG frame & grid rendering
function drawFrame(svgId, width = 4200, height = 2970) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  // Grid layer
  const gridLayer = svg.getElementById('layer-grid');
  gridLayer.innerHTML = '';
  const gridSize = 20;

  // Minor grid
  for (let x = 0; x < width; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'grid-minor');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', height);
    gridLayer.appendChild(line);
  }
  for (let y = 0; y < height; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'grid-minor');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width);
    line.setAttribute('y2', y);
    gridLayer.appendChild(line);
  }

  // Major grid (every 100px)
  const majorGridSize = 100;
  for (let x = 0; x < width; x += majorGridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'grid-major');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', height);
    gridLayer.appendChild(line);
  }
  for (let y = 0; y < height; y += majorGridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'grid-major');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width);
    line.setAttribute('y2', y);
    gridLayer.appendChild(line);
  }

  // Frame border (outer edge)
  const frameLayer = svg.getElementById('layer-frame');
  frameLayer.innerHTML = '';
  const frame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  frame.setAttribute('class', 'frame-border');
  frame.setAttribute('x', 0);
  frame.setAttribute('y', 0);
  frame.setAttribute('width', width);
  frame.setAttribute('height', height);
  frameLayer.appendChild(frame);

  // Inner content border (title block margin)
  const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  inner.setAttribute('class', 'frame-inner');
  inner.setAttribute('x', 40);
  inner.setAttribute('y', 40);
  inner.setAttribute('width', width - 80);
  inner.setAttribute('height', height - 220); // room for title block at bottom
  frameLayer.appendChild(inner);
}
