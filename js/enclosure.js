// Enclosure management with slot-based drag-drop layout

let currentEnclosure = null;
let currentVariantIdx = 0;
let placedParts = {}; // { slotId: partId }

function selectEnclosure(enclosureId) {
  const enclosure = getPartById(enclosureId);
  if (!enclosure) return;

  currentEnclosure = enclosure;
  currentVariantIdx = 0;
  placedParts = {};
  closeModal('modal-enclosure');
  toast(`Enclosure selected: ${enclosure.code}`);
  updatePowerInfo();
  renderEnclosureLayout();
}

function skipEnclosure() {
  currentEnclosure = null;
  currentVariantIdx = 0;
  placedParts = {};
  closeModal('modal-enclosure');
  toast('No enclosure selected');
  renderEnclosureLayout();
}

function showEnclosureSelector() {
  const list = document.getElementById('enclosure-list');
  list.innerHTML = '';
  const enclosures = getEnclosures();
  enclosures.forEach(enc => {
    const btn = document.createElement('button');
    btn.innerHTML = `
      <strong>${enc.description}</strong>
      <small>${enc.code} · ${enc.psuRating}W PSU · ${enc.batteryCapacity} Battery</small>
      <small style="color: var(--ir-red); font-weight:600; margin-top:4px">$${enc.price.toFixed(0)}</small>
    `;
    btn.addEventListener('click', () => selectEnclosure(enc.id));
    list.appendChild(btn);
  });
  openModal('modal-enclosure');
}

function changeVariant(idx) {
  currentVariantIdx = idx;
  placedParts = {};
  renderEnclosureLayout();
}

function renderEnclosureLayout() {
  const container = document.getElementById('enclosure-workspace');
  if (!container) return;

  container.innerHTML = '';

  if (!currentEnclosure) {
    container.innerHTML = `
      <div style="text-align:center; padding:60px; color:var(--ir-gray)">
        <h3 style="font-weight:300">No enclosure selected</h3>
        <p>Click the menu to select an enclosure</p>
        <button class="variant-btn" onclick="showEnclosureSelector()" style="background:var(--ir-red); color:white; border-color:var(--ir-red); margin-top:10px">Select Enclosure</button>
      </div>
    `;
    return;
  }

  const variant = currentEnclosure.variants[currentVariantIdx];

  // Title bar - Inner Range style
  const titleBar = document.createElement('div');
  titleBar.className = 'enclosure-title-bar';
  titleBar.innerHTML = `
    <div class="logo">
      <span class="logo-dots"></span>
      <div>
        <div class="title-sub">Layout Options</div>
        <div class="title-main">${currentEnclosure.description}</div>
      </div>
    </div>
    <div style="text-align:right; font-size:11px; color:#aaa">
      <div>${currentEnclosure.code}</div>
      <div>${currentEnclosure.psuRating}W · ${currentEnclosure.batteryCapacity}</div>
    </div>
  `;
  container.appendChild(titleBar);

  // Variant selector
  if (currentEnclosure.variants.length > 1) {
    const selector = document.createElement('div');
    selector.className = 'variant-selector';
    currentEnclosure.variants.forEach((v, idx) => {
      const btn = document.createElement('button');
      btn.className = 'variant-btn' + (idx === currentVariantIdx ? ' active' : '');
      btn.textContent = v.name;
      btn.addEventListener('click', () => changeVariant(idx));
      selector.appendChild(btn);
    });
    container.appendChild(selector);
  }

  // Enclosure box with slots
  const box = document.createElement('div');
  box.className = `enclosure-box ${currentEnclosure.size}`;
  box.id = 'enclosure-box';

  variant.slots.forEach(slot => {
    const el = createSlotElement(slot);
    box.appendChild(el);
  });

  container.appendChild(box);

  // Info panel
  const info = document.createElement('div');
  info.style.cssText = 'margin-top:16px; font-size:11px; color:var(--ir-gray); text-align:center';
  info.innerHTML = `
    <strong>${variant.slots.filter(s => !s.fixed && s.size !== 'battery').length}</strong> available slots ·
    Drag PCBs from the palette into matching size slots ·
    <strong style="color:var(--ir-red)">Size A</strong> = Controllers ·
    <strong style="color:var(--ir-red)">Size B</strong> = Expansion ·
    <strong style="color:var(--ir-red)">Size C</strong> = Small modules
  `;
  container.appendChild(info);
}

function createSlotElement(slot) {
  const el = document.createElement('div');
  el.style.left = slot.x + 'px';
  el.style.top = slot.y + 'px';
  el.style.width = slot.w + 'px';
  el.style.height = slot.h + 'px';
  el.dataset.slotId = slot.id;
  el.dataset.slotSize = slot.size;

  if (slot.size === 'battery') {
    el.className = 'battery-slot';
    el.textContent = slot.label || 'Battery';
    return el;
  }

  if (slot.fixed === 'transformer') {
    el.className = 'transformer-slot';
    el.innerHTML = `4Amp<small>Transformer</small>`;
    return el;
  }

  el.className = `pcb-slot size-${slot.size}`;

  const placedPartId = placedParts[slot.id];
  if (placedPartId) {
    const part = getPartById(placedPartId);
    if (part) {
      el.classList.add('filled');
      el.innerHTML = `
        <div class="mount-holes">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pcb-label">${part.code}<br><small style="font-weight:400;opacity:.85">${part.description.substring(0, 30)}</small></div>
      `;
      el.title = `${part.code} - ${part.description}\nClick to remove`;
      el.addEventListener('click', () => removePart(slot.id));
    }
  } else {
    el.innerHTML = `
      <div class="mount-holes">
        <span></span><span></span><span></span><span></span>
      </div>
      <div class="pcb-slot-label"></div>
    `;
  }

  // Drag-drop handlers
  el.addEventListener('dragover', handleDragOver);
  el.addEventListener('dragleave', handleDragLeave);
  el.addEventListener('drop', handleDrop);

  // Touch handler - tap to place selected
  el.addEventListener('click', () => handleSlotClick(slot.id));

  return el;
}

function handleDragOver(e) {
  e.preventDefault();
  const partId = e.dataTransfer?.types?.includes('text/plain') ? draggingPartId : null;
  const slotSize = this.dataset.slotSize;
  const canAccept = canPlaceInSlot(draggingPartId, slotSize);
  if (canAccept) {
    this.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  } else {
    e.dataTransfer.dropEffect = 'none';
  }
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  const partId = e.dataTransfer.getData('text/plain') || draggingPartId;
  const slotId = this.dataset.slotId;
  placePartInSlot(slotId, partId);
}

function handleSlotClick(slotId) {
  if (selectedPaletteId && !placedParts[slotId]) {
    placePartInSlot(slotId, selectedPaletteId);
  }
}

function canPlaceInSlot(partId, slotSize) {
  if (!partId) return false;
  const part = getPartById(partId);
  if (!part) return false;
  if (part.pcbSize === 'external') return false;
  // Size A parts need Size A slots, B needs B, C needs C
  return part.pcbSize === slotSize;
}

function placePartInSlot(slotId, partId) {
  if (!currentEnclosure) {
    toast('Select an enclosure first');
    return;
  }

  const variant = currentEnclosure.variants[currentVariantIdx];
  const slot = variant.slots.find(s => s.id === slotId);
  if (!slot) return;

  if (slot.fixed || slot.size === 'battery') {
    toast('This slot is fixed');
    return;
  }

  if (!canPlaceInSlot(partId, slot.size)) {
    const part = getPartById(partId);
    toast(`${part?.code || 'Part'} doesn't fit in Size ${slot.size} slot`);
    return;
  }

  if (placedParts[slotId]) {
    toast('Slot already occupied');
    return;
  }

  placedParts[slotId] = partId;
  renderEnclosureLayout();
  updatePowerInfo();
  updateStats();
  const part = getPartById(partId);
  toast(`Placed ${part.code} in slot ${slotId}`);

  // Clear selection after placing
  selectedPaletteId = null;
  document.querySelectorAll('.part-card.selected').forEach(c => c.classList.remove('selected'));
}

function removePart(slotId) {
  const partId = placedParts[slotId];
  if (!partId) return;

  delete placedParts[slotId];
  renderEnclosureLayout();
  updatePowerInfo();
  updateStats();
  toast(`Removed from slot ${slotId}`);
}

function getPlacedComponents() {
  return Object.entries(placedParts).map(([slotId, partId]) => {
    const part = getPartById(partId);
    return { slotId, partId, part };
  }).filter(c => c.part);
}

function updatePowerInfo() {
  if (!currentEnclosure) {
    document.getElementById('info-enclosure').textContent = 'None';
    document.getElementById('info-psu').textContent = '—';
    return;
  }

  document.getElementById('info-enclosure').textContent = currentEnclosure.code;
  document.getElementById('info-psu').textContent = `${currentEnclosure.psuRating}W @ 12V`;

  const totalWatts = getPlacedComponents().reduce((sum, c) => sum + (c.part.wattage || 0), 0);
  document.getElementById('info-power-used').textContent = `${totalWatts.toFixed(1)}W`;

  const remaining = currentEnclosure.psuRating - totalWatts;
  const remainingEl = document.getElementById('info-power-remaining');
  remainingEl.textContent = `${remaining.toFixed(1)}W`;
  remainingEl.style.color = remaining < 0 ? '#dc2626' : (remaining < 5 ? '#f59e0b' : '#10b981');

  const warning = document.getElementById('power-warning');
  if (warning) warning.style.display = remaining < 0 ? 'block' : 'none';
}

function updateStats() {
  const components = getPlacedComponents();
  document.getElementById('info-components').textContent = components.length;
  document.getElementById('info-cables').textContent = '0';
  const total = components.reduce((sum, c) => sum + (c.part.price || 0), 0)
    + (currentEnclosure?.price || 0);
  document.getElementById('info-total').textContent = `$${total.toFixed(0)}`;
}

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
