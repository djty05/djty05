// Multi-Enclosure Project Management with Proper Scaling

let currentProject = null;
let selectedEnclosureIdx = 0;

// ===== PROJECT FUNCTIONS =====

function initializeProject(projectName = 'New Project') {
  currentProject = {
    name: projectName,
    enclosures: [],
    siteComponents: [],
  };
  selectedEnclosureIdx = 0;
}

function addEnclosureToProject(enclosureId) {
  if (!currentProject) initializeProject();

  const enclosure = getPartById(enclosureId);
  if (!enclosure) return;

  // Calculate position (stagger them)
  const x = (currentProject.enclosures.length % 3) * 450;
  const y = Math.floor(currentProject.enclosures.length / 3) * 350;

  currentProject.enclosures.push({
    id: `ENC-${Date.now()}-${currentProject.enclosures.length}`,
    enclosureId,
    variantIdx: 0,
    placedParts: {},
    orientation: 'landscape',
    x,
    y,
  });

  selectedEnclosureIdx = currentProject.enclosures.length - 1;
  renderEnclosureLayout();
  updatePowerInfo();
}

function removeEnclosureFromProject(idx) {
  if (!currentProject || idx < 0 || idx >= currentProject.enclosures.length) return;
  currentProject.enclosures.splice(idx, 1);
  if (selectedEnclosureIdx >= currentProject.enclosures.length) {
    selectedEnclosureIdx = Math.max(0, currentProject.enclosures.length - 1);
  }
  renderEnclosureLayout();
}

function selectEnclosure(idx) {
  if (idx >= 0 && idx < currentProject?.enclosures.length) {
    selectedEnclosureIdx = idx;
    renderEnclosureLayout();
  }
}

// ===== ENCLOSURE DESIGN =====

function renderEnclosureLayout() {
  const container = document.getElementById('enclosure-workspace');
  if (!container) return;

  container.innerHTML = '';

  if (!currentProject || currentProject.enclosures.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:60px; color:var(--ir-gray)">
        <h3 style="font-weight:300">No enclosures in project</h3>
        <p>Add an enclosure to begin design</p>
        <button class="variant-btn" onclick="showEnclosureSelector()" style="background:var(--ir-red); color:white; border-color:var(--ir-red); margin-top:10px">Add Enclosure</button>
      </div>
    `;
    return;
  }

  const enclosureData = currentProject.enclosures[selectedEnclosureIdx];
  const enclosure = getPartById(enclosureData.enclosureId);
  const variant = enclosure.variants[enclosureData.variantIdx];

  // Header
  const header = document.createElement('div');
  header.className = 'enclosure-title-bar';
  header.style.marginBottom = '16px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const titleDiv = document.createElement('div');
  titleDiv.style.display = 'flex';
  titleDiv.style.alignItems = 'center';
  titleDiv.style.gap = '12px';
  titleDiv.innerHTML = `
    <span class="logo-dots" style="display:inline-block; width:22px; height:16px; background-image: radial-gradient(circle, var(--ir-red) 2px, transparent 2px), radial-gradient(circle, var(--ir-red) 2px, transparent 2px), radial-gradient(circle, var(--ir-red) 2px, transparent 2px); background-size: 6px 6px; background-position: 0 0, 6px 0, 12px 0; background-repeat: no-repeat;"></span>
    <div>
      <div class="title-sub">Enclosure Design ${selectedEnclosureIdx + 1} of ${currentProject.enclosures.length}</div>
      <div class="title-main">${enclosure.description}</div>
    </div>
  `;
  header.appendChild(titleDiv);

  const rightDiv = document.createElement('div');
  rightDiv.style.display = 'flex';
  rightDiv.style.alignItems = 'center';
  rightDiv.style.gap = '12px';
  rightDiv.innerHTML = `
    <div style="text-align:right; font-size:11px; color:#aaa">
      <div>${enclosure.code}</div>
      <div>${enclosure.psuRating}W · ${enclosure.batteryCapacity}</div>
    </div>
    <button id="btn-rotate" style="background:transparent; color:var(--ir-white); border:1px solid rgba(255,255,255,0.3); padding:6px 12px; border-radius:3px; cursor:pointer; font-size:12px; white-space:nowrap">
      ${enclosureData.orientation === 'landscape' ? '⤵️ Portrait' : '⤴️ Landscape'}
    </button>
  `;
  header.appendChild(rightDiv);
  header.style.gap = '16px';
  container.appendChild(header);

  document.getElementById('btn-rotate')?.addEventListener('click', () => {
    enclosureData.orientation = enclosureData.orientation === 'landscape' ? 'portrait' : 'landscape';
    renderEnclosureLayout();
  });

  // Enclosure selector tabs
  if (currentProject.enclosures.length > 1) {
    const tabs = document.createElement('div');
    tabs.className = 'variant-selector';
    currentProject.enclosures.forEach((enc, idx) => {
      const btn = document.createElement('button');
      btn.className = 'variant-btn' + (idx === selectedEnclosureIdx ? ' active' : '');
      const part = getPartById(enc.enclosureId);
      btn.textContent = `${part.code} (${idx + 1})`;
      btn.addEventListener('click', () => selectEnclosure(idx));
      tabs.appendChild(btn);
    });
    const removeBtn = document.createElement('button');
    removeBtn.className = 'variant-btn';
    removeBtn.textContent = '− Remove';
    removeBtn.style.background = '#fecaca';
    removeBtn.style.borderColor = '#dc2626';
    removeBtn.style.color = '#dc2626';
    removeBtn.addEventListener('click', () => {
      if (confirm('Remove this enclosure?')) {
        removeEnclosureFromProject(selectedEnclosureIdx);
      }
    });
    tabs.appendChild(removeBtn);
    container.appendChild(tabs);
  }

  // Variant selector
  if (enclosure.variants.length > 1) {
    const selector = document.createElement('div');
    selector.className = 'variant-selector';
    enclosure.variants.forEach((v, idx) => {
      const btn = document.createElement('button');
      btn.className = 'variant-btn' + (idx === enclosureData.variantIdx ? ' active' : '');
      btn.textContent = v.name;
      btn.addEventListener('click', () => {
        enclosureData.variantIdx = idx;
        enclosureData.placedParts = {};
        renderEnclosureLayout();
      });
      selector.appendChild(btn);
    });
    container.appendChild(selector);
  }

  // Enclosure box (properly scaled)
  const box = document.createElement('div');
  box.className = 'enclosure-box';
  const scale = 0.95; // 95% scale — larger for smaller real-mm dimensions

  const isPortrait = enclosureData.orientation === 'portrait';

  // Pick correct layout: portrait uses portraitSlots + portrait dimensions, else landscape
  const hasPortrait = isPortrait && variant.portraitSlots;
  const slotsToRender = hasPortrait ? variant.portraitSlots : variant.slots;
  const displayWidth = hasPortrait ? (enclosure.portrait_width_mm || enclosure.height_mm) : enclosure.width_mm;
  const displayHeight = hasPortrait ? (enclosure.portrait_height_mm || enclosure.width_mm) : enclosure.height_mm;

  box.style.width = (displayWidth * scale) + 'px';
  box.style.height = (displayHeight * scale) + 'px';
  box.style.position = 'relative';
  box.style.background = '#ececec';
  box.style.border = '3px solid #2a2a2a';
  box.style.borderRadius = '4px';
  box.style.margin = '0 auto 16px';
  box.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.5)';

  // Battery shelf indicator — battery is ALWAYS at the bottom
  const batterySlot = slotsToRender.find(s => s.size === 'battery');
  if (batterySlot) {
    const shelf = document.createElement('div');
    shelf.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${(batterySlot.y - 5) * scale}px;
      height: 3px;
      background: linear-gradient(to bottom, #888, #555);
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      pointer-events: none;
      z-index: 1;
    `;
    box.appendChild(shelf);

    const compartment = document.createElement('div');
    compartment.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${(batterySlot.y - 5) * scale}px;
      bottom: 0;
      background: rgba(200,200,200,0.35);
      pointer-events: none;
      z-index: 0;
    `;
    box.appendChild(compartment);
  }

  slotsToRender.forEach(slot => {
    const el = createSlotElement(slot, enclosureData, scale);
    el.style.zIndex = '2';
    box.appendChild(el);
  });

  container.appendChild(box);

  // Info
  const info = document.createElement('div');
  info.style.cssText = 'margin-top:16px; font-size:11px; color:var(--ir-gray); text-align:center; max-width:600px; margin-left:auto; margin-right:auto';
  info.innerHTML = `
    <strong>Dimensions:</strong> ${displayWidth}mm × ${displayHeight}mm ·
    <strong>${slotsToRender.filter(s => !s.fixed && s.size !== 'battery').length} slots</strong>
  `;
  container.appendChild(info);
}

function createSlotElement(slot, enclosureData, scale) {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = (slot.x * scale) + 'px';
  el.style.top = (slot.y * scale) + 'px';
  el.style.width = (slot.w * scale) + 'px';
  el.style.height = (slot.h * scale) + 'px';
  el.dataset.slotId = slot.id;
  el.dataset.slotSize = slot.size;

  if (slot.size === 'battery') {
    el.className = 'battery-slot';
    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; pointer-events:none">
        <span style="font-size:13px">🔋</span>
        <span style="font-weight:700">${slot.label || 'Battery'}</span>
      </div>
    `;
    el.style.fontSize = '11px';
    return el;
  }

  if (slot.fixed === 'transformer') {
    el.className = 'transformer-slot';
    el.innerHTML = `<strong>XFMR</strong><small>AC Input</small>`;
    el.style.fontSize = '10px';
    return el;
  }

  el.className = `pcb-slot size-${slot.size}`;
  el.style.fontSize = '11px';

  const placedPartId = enclosureData.placedParts[slot.id];
  if (placedPartId) {
    const part = getPartById(placedPartId);
    if (part) {
      el.classList.add('filled');
      el.innerHTML = `
        <div class="mount-holes">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pcb-label" style="font-size:11px">${part.code}</div>
      `;
      el.title = part.code;
      el.addEventListener('click', () => {
        delete enclosureData.placedParts[slot.id];
        renderEnclosureLayout();
        updatePowerInfo();
      });
    }
  } else {
    el.innerHTML = `
      <div class="mount-holes">
        <span></span><span></span><span></span><span></span>
      </div>
      <div class="pcb-slot-label"></div>
    `;
  }

  el.addEventListener('dragover', handleDragOver);
  el.addEventListener('dragleave', handleDragLeave);
  el.addEventListener('drop', e => handleSlotDrop(e, enclosureData));
  el.addEventListener('click', () => handleSlotClick(slot.id, enclosureData));

  return el;
}

function handleSlotDrop(e, enclosureData) {
  e.preventDefault();
  e.target.closest('.pcb-slot')?.classList.remove('drag-over');
  const partId = draggingPartId;
  const slotId = e.target.closest('[data-slot-id]')?.dataset.slotId;
  if (slotId && partId) {
    placePartInSlot(slotId, partId, enclosureData);
  }
}

function handleSlotClick(slotId, enclosureData) {
  if (selectedPaletteId && !enclosureData.placedParts[slotId]) {
    placePartInSlot(slotId, selectedPaletteId, enclosureData);
  }
}

function canPlaceInSlot(partId, slotSize) {
  if (!partId) return false;
  const part = getPartById(partId);
  if (!part) return false;
  if (part.pcbSize === 'external') return false;
  return part.pcbSize === slotSize;
}

function placePartInSlot(slotId, partId, enclosureData) {
  const part = getPartById(partId);
  if (!part) return;

  const enclosure = getPartById(enclosureData.enclosureId);
  const variant = enclosure.variants[enclosureData.variantIdx];
  const slotsToSearch = (enclosureData.orientation === 'portrait' && variant.portraitSlots)
    ? variant.portraitSlots
    : variant.slots;
  const slot = slotsToSearch.find(s => s.id === slotId);

  if (!slot || slot.fixed || slot.size === 'battery') {
    toast('Cannot place there');
    return;
  }

  if (!canPlaceInSlot(partId, slot.size)) {
    toast(`${part.code} doesn't fit Size ${slot.size}`);
    return;
  }

  if (enclosureData.placedParts[slotId]) {
    toast('Slot occupied');
    return;
  }

  enclosureData.placedParts[slotId] = partId;
  renderEnclosureLayout();
  updatePowerInfo();
  updateStats();
  toast(`Placed ${part.code}`);
  selectedPaletteId = null;
  document.querySelectorAll('.part-card.selected').forEach(c => c.classList.remove('selected'));
}

function getPlacedComponents() {
  if (!currentProject || currentProject.enclosures.length === 0) return [];

  const allComponents = [];
  currentProject.enclosures.forEach((enclosure, encIdx) => {
    const part = getPartById(enclosure.enclosureId);
    Object.entries(enclosure.placedParts).forEach(([slotId, partId]) => {
      const component = getPartById(partId);
      if (component) {
        allComponents.push({
          enclosureIdx,
          slotId,
          partId,
          component,
          enclosurePart: part,
        });
      }
    });
  });
  return allComponents;
}

function updatePowerInfo() {
  const enc = currentProject?.enclosures[selectedEnclosureIdx];
  if (!enc) {
    document.getElementById('info-enclosure').textContent = 'None';
    document.getElementById('info-psu').textContent = '—';
    return;
  }

  const enclosure = getPartById(enc.enclosureId);
  document.getElementById('info-enclosure').textContent = enclosure.code;
  document.getElementById('info-psu').textContent = `${enclosure.psuRating}W`;

  const components = getPlacedComponents().filter(c => c.enclosureIdx === selectedEnclosureIdx);
  const watts = components.reduce((sum, c) => sum + (c.component.wattage || 0), 0);
  document.getElementById('info-power-used').textContent = `${watts.toFixed(1)}W`;

  const remaining = enclosure.psuRating - watts;
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

  let total = 0;
  if (currentProject) {
    currentProject.enclosures.forEach(enc => {
      const part = getPartById(enc.enclosureId);
      total += part?.price || 0;
    });
    components.forEach(c => total += c.component.price || 0);
  }
  document.getElementById('info-total').textContent = `$${total.toFixed(0)}`;
}

function showEnclosureSelector() {
  const list = document.getElementById('enclosure-list');
  list.innerHTML = '';
  getEnclosures().forEach(enc => {
    const btn = document.createElement('button');
    btn.innerHTML = `
      <strong>${enc.description}</strong>
      <small>${enc.code} · ${enc.width_mm}×${enc.height_mm}mm · ${enc.psuRating}W · ${enc.batteryCapacity}</small>
      <small style="color: var(--ir-red); font-weight:600; margin-top:4px">$${enc.price.toFixed(0)}</small>
    `;
    btn.addEventListener('click', () => {
      addEnclosureToProject(enc.id);
      closeModal('modal-enclosure');
    });
    list.appendChild(btn);
  });
  openModal('modal-enclosure');
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

// Drag handlers
function handleDragOver(e) {
  e.preventDefault();
  const slotSize = e.target.closest('[data-slot-size]')?.dataset.slotSize;
  const canAccept = canPlaceInSlot(draggingPartId, slotSize);
  if (canAccept) {
    e.target.closest('.pcb-slot')?.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  } else {
    e.dataTransfer.dropEffect = 'none';
  }
}

function handleDragLeave(e) {
  e.target.closest('.pcb-slot')?.classList.remove('drag-over');
}
