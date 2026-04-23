// Detailed realistic PCB symbols with actual component layouts

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

  return createGenericComponentSymbol(refDes, part);
}

// ===== ISC CONTROLLER (IR-996001PCB&K) - 4 modules wide =====
function createISCSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 280, h = 200;

  // PCB board
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

  // Board reference
  const ref = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  ref.setAttribute('x', w / 2);
  ref.setAttribute('y', 20);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '16');
  ref.setAttribute('fill', '#fff');
  ref.setAttribute('font-weight', 'bold');
  ref.textContent = refDes;
  g.appendChild(ref);

  // Component layout (resistors, capacitors, ICs)
  drawComponentDensity(g, 15, 35, w - 30, 80); // Main IC area
  drawComponentDensity(g, 15, 125, w - 30, 60); // Power distribution
  drawComponentDensity(g, 15, 195, w - 30, 35); // Decoupling caps

  // LEDs
  drawLED(g, w - 12, 40, '#ff0000', 'PWR');
  drawLED(g, w - 12, 60, '#00ff00', 'STS');
  drawLED(g, w - 12, 80, '#0099ff', 'NET');

  // Terminal blocks
  drawTerminalBlock(g, 8, 155, part.terminals.slice(0, 6));
  drawTerminalBlock(g, 8, 210, part.terminals.slice(6, 12));
  drawTerminalBlock(g, 130, 225, part.terminals.slice(12, 16));

  // Mounting holes
  drawMountingHole(g, 5, 5);
  drawMountingHole(g, w - 5, 5);
  drawMountingHole(g, 5, h - 5);
  drawMountingHole(g, w - 5, h - 5);

  return g;
}

// ===== IAC CONTROLLER - 4 modules wide =====
function createIACSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 280, h = 200;

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
  ref.setAttribute('y', 20);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '15');
  ref.setAttribute('fill', '#fff');
  ref.setAttribute('font-weight', 'bold');
  ref.textContent = refDes;
  g.appendChild(ref);

  // Component areas - denser layout
  drawComponentDensity(g, 12, 35, w - 24, 75);
  drawComponentDensity(g, 12, 120, w - 24, 50);
  drawComponentDensity(g, 12, 180, w - 24, 30);

  // LEDs
  drawLED(g, w - 10, 40, '#ff0000', 'PWR');
  drawLED(g, w - 10, 60, '#00ff00', 'STS');
  drawLED(g, w - 10, 80, '#0099ff', 'ETH');

  // RJ45 Ethernet
  drawRJ45(g, w - 35, 110);

  // Terminal blocks
  drawTerminalBlock(g, 8, 145, part.terminals.slice(0, 6));
  drawTerminalBlock(g, 8, 195, part.terminals.slice(6, 12));

  // Mounting holes
  drawMountingHole(g, 5, 5);
  drawMountingHole(g, w - 5, 5);
  drawMountingHole(g, 5, h - 5);
  drawMountingHole(g, w - 5, h - 5);

  return g;
}

// ===== EXPRESS CONTROLLER - 4 modules wide =====
function createExpressSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 280, h = 180;

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
  ref.setAttribute('y', 20);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '14');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  // Component layout
  drawComponentDensity(g, 10, 32, w - 20, 65);
  drawComponentDensity(g, 10, 105, w - 20, 50);

  // WiFi LED
  drawLED(g, w - 10, 35, '#ff00ff', 'WiFi');
  drawLED(g, w - 10, 55, '#00ff00', 'STS');

  // Antenna
  const antenna = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  antenna.setAttribute('points', `${w - 18},70 ${w - 12},55 ${w - 6},70`);
  antenna.setAttribute('stroke', '#d4af37');
  antenna.setAttribute('stroke-width', 2);
  antenna.setAttribute('fill', 'none');
  g.appendChild(antenna);

  drawTerminalBlock(g, 8, 165, part.terminals);

  drawMountingHole(g, 5, 5);
  drawMountingHole(g, w - 5, 5);
  drawMountingHole(g, 5, h - 5);
  drawMountingHole(g, w - 5, h - 5);

  return g;
}

// ===== ILAM MODULE - 2 modules wide =====
function createILAMSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 140, h = 200;

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
  ref.setAttribute('y', 20);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '14');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  drawComponentDensity(g, 10, 32, w - 20, 70);
  drawComponentDensity(g, 10, 110, w - 20, 60);

  drawLED(g, w - 10, 40, '#ff0000', 'PWR');
  drawLED(g, w - 10, 60, '#00ff00', 'RDY');
  drawRJ45(g, w - 30, 85);

  drawTerminalBlock(g, 8, 140, part.terminals.slice(0, 4));
  drawTerminalBlock(g, 8, 195, part.terminals.slice(4, 8));

  drawMountingHole(g, 5, 5);
  drawMountingHole(g, w - 5, 5);
  drawMountingHole(g, 5, h - 5);
  drawMountingHole(g, w - 5, h - 5);

  return g;
}

// ===== LAN ACCESS MODULE - 2 modules wide =====
function createLANAccSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 140, h = 200;

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
  ref.setAttribute('y', 20);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '12');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  drawComponentDensity(g, 8, 32, w - 16, 70);
  drawComponentDensity(g, 8, 110, w - 16, 50);

  drawLED(g, w - 10, 40, '#00ff00');
  drawRJ45(g, w - 28, 75);

  drawTerminalBlock(g, 8, 130, part.terminals.slice(0, 2));
  drawTerminalBlock(g, 8, 175, part.terminals.slice(2, 6));

  drawMountingHole(g, 5, 5);
  drawMountingHole(g, w - 5, 5);
  drawMountingHole(g, 5, h - 5);
  drawMountingHole(g, w - 5, h - 5);

  return g;
}

// ===== I/O EXPANDER - 2 modules wide =====
function createIOExpSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 140, h = 200;

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
  ref.setAttribute('y', 20);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '12');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  drawComponentDensity(g, 8, 32, w - 16, 65);
  drawComponentDensity(g, 8, 105, w - 16, 55);

  drawLED(g, w - 10, 40, '#00ff00');

  drawTerminalBlock(g, 8, 130, part.terminals.slice(0, 2));
  drawTerminalBlock(g, 8, 165, part.terminals.slice(2, 6));
  drawTerminalBlock(g, 8, 195, part.terminals.slice(6, 10));

  drawMountingHole(g, 5, 5);
  drawMountingHole(g, w - 5, 5);
  drawMountingHole(g, 5, h - 5);
  drawMountingHole(g, w - 5, h - 5);

  return g;
}

// ===== POWER SUPPLY - 1 module wide =====
function createPSUSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 70, h = 180;

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
  ref.setAttribute('y', 20);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '14');
  ref.setAttribute('fill', '#fff');
  ref.setAttribute('font-weight', 'bold');
  ref.textContent = refDes;
  g.appendChild(ref);

  // Heavy component layout for PSU
  drawComponentDensity(g, 12, 35, w - 24, 90, true);
  drawComponentDensity(g, 12, 135, w - 24, 35, true);

  drawLED(g, w - 12, 45, '#00ff00', 'ON');

  // Terminal blocks
  drawTerminalBlock(g, 8, 75, part.terminals.slice(0, 2));
  drawTerminalBlock(g, 8, 115, part.terminals.slice(2, 4));
  drawTerminalBlock(g, 8, 160, part.terminals.slice(4, 6));

  return g;
}

// ===== SIFER READER - 1 module wide =====
function createSIFERSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 70, h = 160;

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

  // PCB component area
  drawComponentDensity(g, 10, 35, w - 20, 50);

  // Reader window
  const window = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  window.setAttribute('x', 12);
  window.setAttribute('y', 90);
  window.setAttribute('width', w - 24);
  window.setAttribute('height', 45);
  window.setAttribute('fill', '#0a0a0a');
  window.setAttribute('stroke', '#1a5c9c');
  window.setAttribute('stroke-width', 1);
  g.appendChild(window);

  // Status LED
  drawLED(g, w - 10, 125, '#0099ff', 'RDY');

  drawTerminalBlock(g, 8, 150, part.terminals);

  return g;
}

// ===== SIFER KEYPAD READER - 1 module wide =====
function createSIFERKeypadSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 70, h = 180;

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
  ref.setAttribute('font-size', '11');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  // PCB component area
  drawComponentDensity(g, 8, 30, w - 16, 45);

  // 8 buttons in grid
  const btnLayout = [
    [22, 82], [58, 82], [22, 105], [58, 105],
    [22, 128], [58, 128], [22, 151], [58, 151],
  ];
  btnLayout.forEach(([x, y]) => {
    const btn = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    btn.setAttribute('cx', x);
    btn.setAttribute('cy', y);
    btn.setAttribute('r', 6);
    btn.setAttribute('fill', '#333');
    btn.setAttribute('stroke', '#666');
    btn.setAttribute('stroke-width', 0.5);
    g.appendChild(btn);
  });

  drawLED(g, w - 10, 50, '#0099ff');

  return g;
}

// ===== T4000 READER - 1 module wide =====
function createT4000Symbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 70, h = 170;

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
  ref.setAttribute('y', 22);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '12');
  ref.setAttribute('fill', '#fff');
  ref.textContent = refDes;
  g.appendChild(ref);

  // PCB components
  drawComponentDensity(g, 10, 32, w - 20, 50);

  // Reader window
  const window = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  window.setAttribute('x', 14);
  window.setAttribute('y', 90);
  window.setAttribute('width', w - 28);
  window.setAttribute('height', 45);
  window.setAttribute('fill', '#0a0a0a');
  window.setAttribute('stroke', '#1a5c9c');
  window.setAttribute('stroke-width', 1);
  g.appendChild(window);

  drawLED(g, w - 10, 140, '#00ff00');

  drawTerminalBlock(g, 8, 160, part.terminals);

  return g;
}

// ===== GENERIC COMPONENT =====
function createGenericComponentSymbol(refDes, part) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'component');
  g.setAttribute('data-part-id', part.id);
  g.setAttribute('data-ref', refDes);
  g.setAttribute('data-terminals', JSON.stringify(part.terminals));

  const w = 120, h = 120;

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
  ref.setAttribute('y', 35);
  ref.setAttribute('text-anchor', 'middle');
  ref.setAttribute('font-size', '14');
  ref.setAttribute('fill', '#1d4ed8');
  ref.setAttribute('font-weight', 'bold');
  ref.textContent = refDes;
  g.appendChild(ref);

  const code = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  code.setAttribute('x', w / 2);
  code.setAttribute('y', 55);
  code.setAttribute('text-anchor', 'middle');
  code.setAttribute('font-size', '10');
  code.setAttribute('fill', '#6b7280');
  code.textContent = part.code;
  g.appendChild(code);

  if (part.terminals) {
    part.terminals.forEach((term, idx) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'terminal');
      circle.setAttribute('cx', idx % 2 === 0 ? 8 : w - 8);
      circle.setAttribute('cy', 30 + (idx % 6) * 12);
      circle.setAttribute('r', 4);
      circle.setAttribute('data-term-name', term.name);
      circle.setAttribute('data-term-type', term.type || 'general');
      g.appendChild(circle);
    });
  }

  return g;
}

// ===== HELPER FUNCTIONS =====

function drawComponentDensity(g, x, y, width, height, heavy = false) {
  // Draw realistic component layout (resistors, caps, ICs)
  const density = heavy ? 12 : 8;

  // Small components (0603 resistors/caps)
  for (let i = 0; i < density; i++) {
    for (let j = 0; j < 3; j++) {
      const cx = x + (i * (width / density)) + Math.random() * 4;
      const cy = y + (j * (height / 3)) + Math.random() * 3;

      if (Math.random() > 0.4) {
        // Resistor (small rectangle)
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', cx);
        rect.setAttribute('y', cy);
        rect.setAttribute('width', 3);
        rect.setAttribute('height', 5);
        rect.setAttribute('fill', '#d4af37');
        rect.setAttribute('stroke', '#8b6914');
        rect.setAttribute('stroke-width', 0.5);
        g.appendChild(rect);

        // Component pads
        const pad1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pad1.setAttribute('cx', cx + 0.5);
        pad1.setAttribute('cy', cy - 1);
        pad1.setAttribute('r', 0.8);
        pad1.setAttribute('fill', '#d4af37');
        g.appendChild(pad1);

        const pad2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pad2.setAttribute('cx', cx + 0.5);
        pad2.setAttribute('cy', cy + 6);
        pad2.setAttribute('r', 0.8);
        pad2.setAttribute('fill', '#d4af37');
        g.appendChild(pad2);
      } else {
        // Capacitor (two parallel lines)
        const cap1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cap1.setAttribute('x1', cx);
        cap1.setAttribute('y1', cy);
        cap1.setAttribute('x2', cx + 4);
        cap1.setAttribute('y2', cy);
        cap1.setAttribute('stroke', '#d4af37');
        cap1.setAttribute('stroke-width', 1);
        g.appendChild(cap1);

        const cap2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cap2.setAttribute('x1', cx);
        cap2.setAttribute('y1', cy + 3);
        cap2.setAttribute('x2', cx + 4);
        cap2.setAttribute('y2', cy + 3);
        cap2.setAttribute('stroke', '#d4af37');
        cap2.setAttribute('stroke-width', 1);
        g.appendChild(cap2);
      }
    }
  }

  // IC chips
  if (width > 40) {
    for (let i = 0; i < 1; i++) {
      const icX = x + width / 2 - 8 + Math.random() * 8;
      const icY = y + height / 2 - 6 + Math.random() * 6;

      const ic = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      ic.setAttribute('x', icX);
      ic.setAttribute('y', icY);
      ic.setAttribute('width', 16);
      ic.setAttribute('height', 12);
      ic.setAttribute('fill', '#1a1a1a');
      ic.setAttribute('stroke', '#666');
      ic.setAttribute('stroke-width', 0.5);
      g.appendChild(ic);

      // IC pin markers
      for (let p = 0; p < 8; p++) {
        const pinX = icX + 1 + (p % 4) * 3.5;
        const pinY = icY + (p < 4 ? -0.5 : 12.5);
        const pin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pin.setAttribute('cx', pinX);
        pin.setAttribute('cy', pinY);
        pin.setAttribute('r', 0.4);
        pin.setAttribute('fill', '#d4af37');
        g.appendChild(pin);
      }
    }
  }
}

function drawLED(g, x, y, color, label = '') {
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

function drawTerminalBlock(g, x, y, terminals) {
  terminals.forEach((term, idx) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'terminal');
    circle.setAttribute('cx', x + idx * 16);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 4);
    circle.setAttribute('data-term-name', term.name);
    circle.setAttribute('data-term-type', term.type || 'general');
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
  const conn = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  conn.setAttribute('x', x);
  conn.setAttribute('y', y);
  conn.setAttribute('width', 22);
  conn.setAttribute('height', 13);
  conn.setAttribute('fill', '#333');
  conn.setAttribute('stroke', '#666');
  conn.setAttribute('stroke-width', 1);
  conn.setAttribute('rx', 1);
  g.appendChild(conn);

  for (let i = 0; i < 8; i++) {
    const pin = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    pin.setAttribute('x', x + 2 + i * 2.2);
    pin.setAttribute('y', y + 3);
    pin.setAttribute('width', 1.8);
    pin.setAttribute('height', 7);
    pin.setAttribute('fill', '#d4af37');
    g.appendChild(pin);
  }
}

function createWirePath(x1, y1, x2, y2, wireId = null) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'wire');
  if (wireId) path.setAttribute('data-wire-id', wireId);

  const midX = x1 + (x2 - x1) / 2;
  const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  path.setAttribute('d', d);

  return path;
}
