// Detailed realistic PCB symbols with actual connectors, LEDs, and component layouts

function createComponentSymbol(partId, refDes) {
  const part = getPartById(partId);
  if (!part) return null;

  // Route to detailed PCB renderers based on component type
  if (part.code.includes('996001')) return createISCSymbol(refDes, part);
  if (part.code.includes('996035')) return createIACSymbol(refDes, part);
  if (part.code.includes('996905')) return createExpressSymbol(refDes, part);
  if (part.code.includes('996018')) return createILAMSymbol(refDes, part);
  if (part.code.includes('996012')) return createLANAccSymbol(refDes, part);
  if (part.code.includes('996005')) return createIOExpSymbol(refDes, part);
  if (part.code.includes('996091') || part.code.includes('996092')) return createPSUSymbol(refDes, part);
  if (part.code.includes('994720')) return createSIFERSymbol(refDes, part);
  if (part.code.includes('994725')) return createSIFERKeypadSymbol(refDes, part);
  if (part.code.includes('996795')) return createT4000Symbol(refDes, part);

  // Default generic component
  return createGenericComponentSymbol(refDes, part);
}

// ===== ISC CONTROLLER (IR-996001PCB&K) =====
function createISCSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 180, h = 220;

  // PCB board (green with gold edges)
  const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  board.setAttribute('class', 'comp-bg');
  board.setAttribute('x', 0);
  board.setAttribute('y', 0);
  board.setAttribute('width', w);
  board.setAttribute('height', h);
  board.setAttribute('fill', '#1a5c2a');
  board.setAttribute('stroke', '#d4af37');
  board.setAttribute('stroke-width', 2);
  board.setAttribute('rx', 3);
  g.appendChild(board);

  // Board reference
  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('class', 'comp-ref');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '16');
  ref.setAttribute('fill', '#fff');
  ref.setAttribute('font-weight', 'bold');
  ref.textContent = refDes;
  g.appendChild(ref);

  // Part code
  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 45);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '10');
  code.setAttribute('fill', '#d4af37');
  code.textContent = 'ISC';
  g.appendChild(code);

  // Power LED
  drawLED(g, w - 15, 15, '#ff0000', 'PWR');
  // Status LED
  drawLED(g, w - 15, 40, '#00ff00', 'STS');
  // Network LED
  drawLED(g, w - 15, 65, '#0099ff', 'NET');

  // Terminal blocks (left side)
  drawTerminalBlock(g, 8, 70, part.terminals.slice(0, 6), 'power/serial');
  drawTerminalBlock(g, 8, 130, part.terminals.slice(6, 12), 'relay');

  // Input terminals (bottom right)
  drawTerminalBlock(g, 130, 185, part.terminals.slice(12, 16), 'input');

  // Mounting holes
  drawMountingHole(g, 8, 8);
  drawMountingHole(g, w - 8, 8);
  drawMountingHole(g, 8, h - 8);
  drawMountingHole(g, w - 8, h - 8);

  return g;
}

// ===== IAC CONTROLLER (IR-996035PCB&K) =====
function createIACSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 170, h = 200;

  const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  board.setAttribute('class', 'comp-bg');
  board.setAttribute('x', 0);
  board.setAttribute('y', 0);
  board.setAttribute('width', w);
  board.setAttribute('height', h);
  board.setAttribute('fill', '#1a5c2a');
  board.setAttribute('stroke', '#d4af37');
  board.setAttribute('stroke-width', 2);
  board.setAttribute('rx', 3);
  g.appendChild(board);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '15');
  ref.setAttribute('fill', '#fff');
  ref.setAttribute('font-weight', 'bold');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 42);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '9');
  code.setAttribute('fill', '#d4af37');
  code.textContent = 'IAC';
  g.appendChild(code);

  // LEDs
  drawLED(g, w - 12, 15, '#ff0000', 'PWR');
  drawLED(g, w - 12, 40, '#00ff00', 'STS');
  drawLED(g, w - 12, 65, '#0099ff', 'ETH');

  // RJ45 Ethernet connector
  drawRJ45(g, w - 30, 90);

  // Terminal blocks
  drawTerminalBlock(g, 8, 65, part.terminals.slice(0, 6), 'power/serial');
  drawTerminalBlock(g, 8, 130, part.terminals.slice(6, 12), 'relay');

  drawMountingHole(g, 8, 8);
  drawMountingHole(g, w - 8, 8);
  drawMountingHole(g, 8, h - 8);
  drawMountingHole(g, w - 8, h - 8);

  return g;
}

// ===== EXPRESS CONTROLLER =====
function createExpressSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 140, h = 160;

  const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  board.setAttribute('class', 'comp-bg');
  board.setAttribute('x', 0);
  board.setAttribute('y', 0);
  board.setAttribute('width', w);
  board.setAttribute('height', h);
  board.setAttribute('fill', '#1a5c2a');
  board.setAttribute('stroke', '#d4af37');
  board.setAttribute('stroke-width', 2);
  board.setAttribute('rx', 3);
  g.appendChild(board);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '14');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 40);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '9');
  code.setAttribute('fill', '#d4af37');
  code.textContent = 'EXPRESS';
  g.appendChild(code);

  // WiFi LED
  drawLED(g, w - 10, 15, '#ff00ff', 'WiFi');
  drawLED(g, w - 10, 40, '#00ff00', 'STS');

  // Antenna symbol
  const antenna = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  antenna.setAttribute('points', `${w - 20},50 ${w - 15},40 ${w - 10},50`);
  antenna.setAttribute('stroke', '#d4af37');
  antenna.setAttribute('stroke-width', 1.5);
  antenna.setAttribute('fill', 'none');
  g.appendChild(antenna);

  drawTerminalBlock(g, 8, 70, part.terminals, 'power/serial');

  drawMountingHole(g, 8, 8);
  drawMountingHole(g, w - 8, 8);
  drawMountingHole(g, 8, h - 8);
  drawMountingHole(g, w - 8, h - 8);

  return g;
}

// ===== ILAM MODULE =====
function createILAMSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 160, h = 200;

  const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  board.setAttribute('x', 0);
  board.setAttribute('y', 0);
  board.setAttribute('width', w);
  board.setAttribute('height', h);
  board.setAttribute('fill', '#1a5c2a');
  board.setAttribute('stroke', '#d4af37');
  board.setAttribute('stroke-width', 2);
  board.setAttribute('rx', 3);
  g.appendChild(board);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '14');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 40);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '9');
  code.setAttribute('fill', '#d4af37');
  code.textContent = 'ILAM-8';
  g.appendChild(code);

  drawLED(g, w - 10, 15, '#ff0000', 'PWR');
  drawLED(g, w - 10, 40, '#00ff00', 'RDY');

  drawRJ45(g, w - 25, 65);

  // Reader inputs
  drawTerminalBlock(g, 8, 60, [part.terminals[0], part.terminals[1]], 'power');
  drawTerminalBlock(g, 8, 95, [part.terminals[2], part.terminals[3]], 'network');
  drawTerminalBlock(g, 8, 130, part.terminals.slice(4), 'reader');

  drawMountingHole(g, 8, 8);
  drawMountingHole(g, w - 8, 8);
  drawMountingHole(g, 8, h - 8);
  drawMountingHole(g, w - 8, h - 8);

  return g;
}

// ===== LAN ACCESS MODULE =====
function createLANAccSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 150, h = 180;

  const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  board.setAttribute('x', 0);
  board.setAttribute('y', 0);
  board.setAttribute('width', w);
  board.setAttribute('height', h);
  board.setAttribute('fill', '#2d5a3d');
  board.setAttribute('stroke', '#d4af37');
  board.setAttribute('stroke-width', 2);
  board.setAttribute('rx', 3);
  g.appendChild(board);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '12');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 40);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '8');
  code.setAttribute('fill', '#d4af37');
  code.textContent = 'LAN ACC';
  g.appendChild(code);

  drawLED(g, w - 10, 15, '#00ff00');
  drawRJ45(g, w - 25, 60);

  drawTerminalBlock(g, 8, 55, [part.terminals[0], part.terminals[1]], 'power');
  drawTerminalBlock(g, 8, 100, part.terminals.slice(2), 'reader');

  drawMountingHole(g, 8, 8);
  drawMountingHole(g, w - 8, 8);
  drawMountingHole(g, 8, h - 8);
  drawMountingHole(g, w - 8, h - 8);

  return g;
}

// ===== I/O EXPANDER =====
function createIOExpSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 140, h = 180;

  const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  board.setAttribute('x', 0);
  board.setAttribute('y', 0);
  board.setAttribute('width', w);
  board.setAttribute('height', h);
  board.setAttribute('fill', '#2d5a3d');
  board.setAttribute('stroke', '#d4af37');
  board.setAttribute('stroke-width', 2);
  board.setAttribute('rx', 3);
  g.appendChild(board);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '12');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 40);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '8');
  code.setAttribute('fill', '#d4af37');
  code.textContent = 'IO EXP-8';
  g.appendChild(code);

  drawLED(g, w - 10, 15, '#00ff00');

  drawTerminalBlock(g, 8, 60, [part.terminals[0], part.terminals[1]], 'power');
  drawTerminalBlock(g, 8, 100, part.terminals.slice(2, 6), 'serial');
  drawTerminalBlock(g, 8, 140, part.terminals.slice(6), 'relay');

  drawMountingHole(g, 8, 8);
  drawMountingHole(g, w - 8, 8);
  drawMountingHole(g, 8, h - 8);
  drawMountingHole(g, w - 8, h - 8);

  return g;
}

// ===== POWER SUPPLY =====
function createPSUSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 130, h = 160;

  // Metallic casing effect
  const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  board.setAttribute('x', 0);
  board.setAttribute('y', 0);
  board.setAttribute('width', w);
  board.setAttribute('height', h);
  board.setAttribute('fill', '#4a4a4a');
  board.setAttribute('stroke', '#808080');
  board.setAttribute('stroke-width', 2);
  board.setAttribute('rx', 3);
  g.appendChild(board);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '14');
  ref.setAttribute('fill', '#fff');
  ref.setAttribute('font-weight', 'bold');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 42);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '9');
  code.setAttribute('fill', '#ffcc00');
  code.textContent = part.psuRating + 'A PSU';
  g.appendChild(code);

  // Power on/standby LED
  drawLED(g, w - 10, 15, '#00ff00', 'ON');

  // Terminal blocks
  drawTerminalBlock(g, 8, 55, part.terminals.slice(0, 2), 'power');
  drawTerminalBlock(g, 8, 95, part.terminals.slice(2, 4), 'power');
  drawTerminalBlock(g, 8, 135, part.terminals.slice(4), 'power');

  return g;
}

// ===== SIFER READER =====
function createSIFERSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 110, h = 130;

  // Reader bezel (black)
  const reader = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  reader.setAttribute('x', 0);
  reader.setAttribute('y', 0);
  reader.setAttribute('width', w);
  reader.setAttribute('height', h);
  reader.setAttribute('fill', '#1a1a1a');
  reader.setAttribute('stroke', '#333');
  reader.setAttribute('stroke-width', 2);
  reader.setAttribute('rx', 4);
  g.appendChild(reader);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '12');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  // Reader window (shiny effect)
  const window = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  window.setAttribute('x', 10);
  window.setAttribute('y', 35);
  window.setAttribute('width', w - 20);
  window.setAttribute('height', 40);
  window.setAttribute('fill', '#0a0a0a');
  window.setAttribute('stroke', '#1a5c9c');
  window.setAttribute('stroke-width', 1);
  g.appendChild(window);

  // Status LED (blue)
  drawLED(g, w - 10, 85, '#0099ff', 'RDY');

  drawTerminalBlock(g, 8, 108, part.terminals, 'reader');

  return g;
}

// ===== SIFER KEYPAD READER =====
function createSIFERKeypadSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 110, h = 150;

  const keypad = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  keypad.setAttribute('x', 0);
  keypad.setAttribute('y', 0);
  keypad.setAttribute('width', w);
  keypad.setAttribute('height', h);
  keypad.setAttribute('fill', '#1a1a1a');
  keypad.setAttribute('stroke', '#333');
  keypad.setAttribute('stroke-width', 2);
  keypad.setAttribute('rx', 4);
  g.appendChild(keypad);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 20);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '10');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  // Keypad buttons (8)
  const btnLayout = [
    [20, 32], [55, 32], [20, 55], [55, 55],
    [20, 78], [55, 78], [20, 101], [55, 101],
  ];
  btnLayout.forEach(([x, y]) => {
    const btn = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    btn.setAttribute('cx', x);
    btn.setAttribute('cy', y);
    btn.setAttribute('r', 5);
    btn.setAttribute('fill', '#333');
    btn.setAttribute('stroke', '#666');
    btn.setAttribute('stroke-width', 0.5);
    g.appendChild(btn);
  });

  drawLED(g, w - 8, 32, '#0099ff');

  drawTerminalBlock(g, 8, 125, part.terminals, 'reader');

  return g;
}

// ===== T4000 READER =====
function createT4000Symbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 120, h = 140;

  const reader = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  reader.setAttribute('x', 0);
  reader.setAttribute('y', 0);
  reader.setAttribute('width', w);
  reader.setAttribute('height', h);
  reader.setAttribute('fill', '#2d2d2d');
  reader.setAttribute('stroke', '#555');
  reader.setAttribute('stroke-width', 2);
  reader.setAttribute('rx', 4);
  g.appendChild(reader);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 25);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '12');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 40);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '9');
  code.setAttribute('fill', '#ffcc00');
  code.textContent = 'T4000';
  g.appendChild(code);

  // Multi-format reader window
  const window = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  window.setAttribute('x', 12);
  window.setAttribute('y', 48);
  window.setAttribute('width', w - 24);
  window.setAttribute('height', 35);
  window.setAttribute('fill', '#0a0a0a');
  window.setAttribute('stroke', '#1a5c9c');
  window.setAttribute('stroke-width', 1);
  g.appendChild(window);

  drawLED(g, w - 10, 92, '#00ff00');

  drawTerminalBlock(g, 8, 115, part.terminals, 'reader');

  return g;
}

// ===== GENERIC COMPONENT (fallback) =====
function createGenericComponentSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 100, h = 100;

  const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  box.setAttribute('x', 0);
  box.setAttribute('y', 0);
  box.setAttribute('width', w);
  box.setAttribute('height', h);
  box.setAttribute('fill', '#f0f4f8');
  box.setAttribute('stroke', '#334155');
  box.setAttribute('stroke-width', 1.5);
  box.setAttribute('rx', 3);
  g.appendChild(box);

  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 30);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '14');
  ref.setAttribute('fill', '#1d4ed8');
  ref.setAttribute('font-weight', 'bold');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 50);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '10');
  code.setAttribute('fill', '#6b7280');
  code.textContent = part.code;
  g.appendChild(code);

  if (part.terminals) {
    part.terminals.forEach((term, idx) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'terminal');
      circle.setAttribute('cx', idx % 2 === 0 ? 5 : w - 5);
      circle.setAttribute('cy', 20 + (idx % 6) * 12);
      circle.setAttribute('r', 4);
      circle.setAttribute('data-term-name', term.name);
      circle.setAttribute('data-term-type', term.type || 'general');
      g.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('font-size', '7');
      label.setAttribute('fill', '#6b7280');
      label.setAttribute('pointer-events', 'none');
      label.setAttribute('x', idx % 2 === 0 ? 12 : w - 12);
      label.setAttribute('text-anchor', idx % 2 === 0 ? 'start' : 'end');
      label.setAttribute('y', 23 + (idx % 6) * 12);
      label.textContent = term.name;
      g.appendChild(label);
    });
  }

  return g;
}

// ===== HELPER FUNCTIONS =====

function drawLED(g, x, y, color, label = '') {
  // LED circle with glow
  const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  glow.setAttribute('cx', x);
  glow.setAttribute('cy', y);
  glow.setAttribute('r', 5);
  glow.setAttribute('fill', color);
  glow.setAttribute('opacity', '0.3');
  g.appendChild(glow);

  const led = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  led.setAttribute('cx', x);
  led.setAttribute('cy', y);
  led.setAttribute('r', 3);
  led.setAttribute('fill', color);
  led.setAttribute('stroke', '#000');
  led.setAttribute('stroke-width', 0.5);
  g.appendChild(led);

  if (label) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y + 10);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '6');
    text.setAttribute('fill', '#fff');
    text.textContent = label;
    g.appendChild(text);
  }
}

function drawTerminalBlock(g, x, y, terminals, type) {
  terminals.forEach((term, idx) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'terminal');
    circle.setAttribute('cx', x + idx * 16);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 4);
    circle.setAttribute('data-term-name', term.name);
    circle.setAttribute('data-term-type', term.type || type);
    g.appendChild(circle);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('font-size', '6');
    label.setAttribute('fill', '#d4af37');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('pointer-events', 'none');
    label.setAttribute('x', x + idx * 16);
    label.setAttribute('y', y - 8);
    label.textContent = term.name.substring(0, 3);
    g.appendChild(label);
  });
}

function drawMountingHole(g, x, y) {
  const hole = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hole.setAttribute('cx', x);
  hole.setAttribute('cy', y);
  hole.setAttribute('r', 2);
  hole.setAttribute('fill', '#ccc');
  hole.setAttribute('stroke', '#999');
  hole.setAttribute('stroke-width', 0.5);
  g.appendChild(hole);
}

function drawRJ45(g, x, y) {
  // RJ45 Ethernet connector
  const conn = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  conn.setAttribute('x', x);
  conn.setAttribute('y', y);
  conn.setAttribute('width', 20);
  conn.setAttribute('height', 12);
  conn.setAttribute('fill', '#333');
  conn.setAttribute('stroke', '#666');
  conn.setAttribute('stroke-width', 1);
  conn.setAttribute('rx', 1);
  g.appendChild(conn);

  // 8 pins
  for (let i = 0; i < 8; i++) {
    const pin = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    pin.setAttribute('x', x + 2 + i * 2);
    pin.setAttribute('y', y + 3);
    pin.setAttribute('width', 1.5);
    pin.setAttribute('height', 6);
    pin.setAttribute('fill', '#d4af37');
    g.appendChild(pin);
  }
}

function createWirePath(x1, y1, x2, y2, wireId = null, cableType = 'multi-pair') {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'wire');
  if (wireId) path.setAttribute('data-wire-id', wireId);
  path.setAttribute('data-cable-type', cableType);

  // Smart routing
  const midX = x1 + (x2 - x1) / 2;
  const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  path.setAttribute('d', d);

  return path;
}
