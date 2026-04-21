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

function addEnclosureToProject(enclosureId, orderingCode = null) {
  if (!currentProject) initializeProject();

  const enclosure = getPartById(enclosureId);
  if (!enclosure) return;

  // Determine ordering option (default = enclosure only)
  const orderingOptions = enclosure.orderingOptions || [];
  const ordering = orderingCode
    ? orderingOptions.find(o => o.code === orderingCode)
    : (orderingOptions[0] || null);

  // Calculate position (stagger them)
  const x = (currentProject.enclosures.length % 3) * 450;
  const y = Math.floor(currentProject.enclosures.length / 3) * 350;

  const newEnc = {
    id: `ENC-${Date.now()}-${currentProject.enclosures.length}`,
    enclosureId,
    variantIdx: 0,
    placedParts: {},
    orientation: 'landscape',
    x,
    y,
    orderingCode: ordering ? ordering.code : enclosure.code,
    orderingName: ordering ? ordering.name : 'Enclosure Only',
  };

  currentProject.enclosures.push(newEnc);
  selectedEnclosureIdx = currentProject.enclosures.length - 1;

  // Auto-place PSU PCB if ordering option includes one
  if (ordering && ordering.psuId) {
    const variant = enclosure.variants[0];
    const psuPcbSlot = variant.slots.find(s => s.size === 'C' && !s.fixed);
    if (psuPcbSlot) {
      newEnc.placedParts[psuPcbSlot.id] = ordering.psuId;
    }
  }

  renderEnclosureLayout();
  updatePowerInfo();
  updateStats();
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
  box.style.background = '#d4d4d4';
  box.style.border = '3px solid #2a2a2a';
  box.style.borderRadius = '4px';
  box.style.margin = '0 auto 16px';
  box.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.4)';

  // Support multiple batteries + PSU module
  const batterySlots = slotsToRender.filter(s => s.size === 'battery');
  const transformerSlot = slotsToRender.find(s => s.fixed === 'transformer');
  const psuModuleSlot = slotsToRender.find(s => s.size === 'psu-module');
  // Shelf starts at the topmost bottom-zone component
  const bottomZoneItems = [
    ...batterySlots,
    ...(transformerSlot ? [transformerSlot] : []),
    ...(psuModuleSlot ? [psuModuleSlot] : []),
  ];
  const shelfTopY = bottomZoneItems.length
    ? Math.min(...bottomZoneItems.map(s => s.y)) - 5
    : displayHeight;
  const cableEntryMm = enclosure.cableEntryMm || 0;
  const cableEntryY = displayHeight - cableEntryMm;

  // STANDOFF PLATE — perforated steel mounting plate behind PCBs
  const inset = enclosure.standoffPlateInset || 8;
  const plate = document.createElement('div');
  plate.className = 'standoff-plate';
  plate.style.cssText = `
    position: absolute;
    left: ${inset * scale}px;
    top: ${inset * scale}px;
    width: ${(displayWidth - inset * 2) * scale}px;
    height: ${(shelfTopY - inset) * scale}px;
    background:
      radial-gradient(circle at 1.5px 1.5px, rgba(80,80,80,0.45) 0.9px, transparent 1.1px),
      linear-gradient(135deg, #c8c8c8 0%, #b8b8b8 50%, #a8a8a8 100%);
    background-size: ${12 * scale}px ${12 * scale}px, 100% 100%;
    background-position: 0 0, 0 0;
    border: 1px solid #888;
    border-radius: 2px;
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,0.4),
      inset 0 2px 4px rgba(0,0,0,0.1),
      0 1px 2px rgba(0,0,0,0.15);
    pointer-events: none;
    z-index: 0;
  `;
  box.appendChild(plate);

  // BATTERY SHELF DIVIDER
  if (bottomZoneItems.length) {
    const shelf = document.createElement('div');
    shelf.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${shelfTopY * scale}px;
      height: 4px;
      background: linear-gradient(to bottom, #777, #444);
      box-shadow: 0 2px 3px rgba(0,0,0,0.4);
      pointer-events: none;
      z-index: 1;
    `;
    box.appendChild(shelf);

    const compartment = document.createElement('div');
    compartment.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${(shelfTopY + 4) * scale}px;
      bottom: 0;
      background: linear-gradient(to bottom, rgba(180,180,180,0.4) 0%, rgba(160,160,160,0.5) 100%);
      pointer-events: none;
      z-index: 0;
    `;
    box.appendChild(compartment);
  }

  // CABLE ENTRY ZONE (XL only — bottom 20mm)
  if (cableEntryMm > 0) {
    const cableZone = document.createElement('div');
    cableZone.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${cableEntryY * scale}px;
      height: ${cableEntryMm * scale}px;
      background: repeating-linear-gradient(
        45deg,
        rgba(255,200,0,0.15),
        rgba(255,200,0,0.15) 4px,
        rgba(0,0,0,0.05) 4px,
        rgba(0,0,0,0.05) 8px
      );
      border-top: 1px dashed #c89800;
      pointer-events: none;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.max(8, 9 * scale)}px;
      color: #886600;
      font-weight: 600;
      letter-spacing: 0.5px;
    `;
    cableZone.textContent = '⚡ MAINS CABLE ENTRY (20mm)';
    box.appendChild(cableZone);
  }

  // Build naming map (e.g. ILAM 1, ILAM 2, ISC 1)
  const nameMap = buildComponentNames();

  slotsToRender.forEach(slot => {
    const el = createSlotElement(slot, enclosureData, scale, nameMap);
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

// Build a global naming map across all enclosures
// Result: { "encIdx:slotId" -> "ILAM 1" }
function buildComponentNames() {
  const counters = {};
  const names = {};
  if (!currentProject) return names;

  currentProject.enclosures.forEach((enc, encIdx) => {
    Object.entries(enc.placedParts).forEach(([slotId, partId]) => {
      const part = getPartById(partId);
      if (!part) return;
      const short = part.shortName || part.code;
      counters[short] = (counters[short] || 0) + 1;
      names[`${encIdx}:${slotId}`] = `${short} ${counters[short]}`;
    });
  });

  // Site components also get numbers
  if (currentProject.siteComponents) {
    currentProject.siteComponents.forEach((sc, idx) => {
      const part = getPartById(sc.partId);
      if (!part) return;
      const short = part.shortName || part.code;
      counters[short] = (counters[short] || 0) + 1;
      names[`site:${idx}`] = `${short} ${counters[short]}`;
    });
  }

  return names;
}

// Expose globally so other modules (BOM, schematic) can use the names
window.buildComponentNames = buildComponentNames;

function createSlotElement(slot, enclosureData, scale, nameMap) {
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
      <div class="bat-terminals">
        <span class="bat-pos">+</span>
        <span class="bat-neg">−</span>
      </div>
      <div class="bat-label">${slot.label || 'Battery'}</div>
    `;
    return el;
  }

  if (slot.fixed === 'transformer') {
    el.className = 'transformer-slot';
    el.innerHTML = `
      <div class="xfmr-core"></div>
      <div class="xfmr-label">
        <strong>XFMR</strong>
        <small>AC Mains</small>
      </div>
    `;
    return el;
  }

  if (slot.size === 'psu-module' || slot.fixed === '8a-psu') {
    el.className = 'psu-module-slot';
    el.innerHTML = `
      <div class="psu-traces"></div>
      <div class="psu-label">
        <strong>${slot.label || '8Amp PSU'}</strong>
        <small>Integrated Power Supply</small>
      </div>
      <div class="psu-indicator"></div>
    `;
    return el;
  }

  el.className = `pcb-slot size-${slot.size}`;
  el.style.fontSize = '11px';

  const encIdx = currentProject?.enclosures.indexOf(enclosureData) ?? -1;
  const placedPartId = enclosureData.placedParts[slot.id];

  if (placedPartId) {
    const part = getPartById(placedPartId);
    if (part) {
      const designator = nameMap?.[`${encIdx}:${slot.id}`] || part.shortName || part.code;
      el.classList.add('filled');
      el.innerHTML = `
        <div class="mount-holes">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pcb-traces"></div>
        <div class="pcb-designator">${designator}</div>
        <div class="pcb-code">${part.code}</div>
      `;
      el.title = `${designator} — ${part.description}`;
      el.addEventListener('click', () => {
        delete enclosureData.placedParts[slot.id];
        renderEnclosureLayout();
        updatePowerInfo();
      });
    }
  } else {
    el.innerHTML = `
      <div class="standoff-corners">
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
      if (enc.orderingOptions && enc.orderingOptions.length > 0) {
        closeModal('modal-enclosure');
        showOrderingOptionsModal(enc);
      } else {
        addEnclosureToProject(enc.id);
        closeModal('modal-enclosure');
      }
    });
    list.appendChild(btn);
  });
  openModal('modal-enclosure');
}

function showOrderingOptionsModal(enclosure) {
  let modal = document.getElementById('modal-ordering');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-ordering';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 560px">
        <div class="modal-header">
          <h3 id="ordering-title">Ordering Options</h3>
          <button class="modal-close" onclick="closeModal('modal-ordering')">×</button>
        </div>
        <div class="modal-body" id="ordering-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('ordering-title').textContent =
    `${enclosure.description} — Ordering Options`;

  const body = document.getElementById('ordering-body');
  body.innerHTML = `
    <p style="margin:0 0 12px; font-size:12px; color:var(--ir-gray)">
      Select an ordering option (region-specific part codes will be used in BOM):
    </p>
    <div class="ordering-grid" id="ordering-grid"></div>
  `;

  const grid = document.getElementById('ordering-grid');
  enclosure.orderingOptions.forEach(opt => {
    const card = document.createElement('button');
    card.className = 'ordering-card';
    const psuDesc = opt.psuId
      ? getPartById(opt.psuId)?.description || opt.psuNote || ''
      : (opt.psuNote || 'No PSU included');
    card.innerHTML = `
      <div class="order-code">${opt.code}</div>
      <div class="order-name">${opt.name}</div>
      <div class="order-note">${psuDesc}</div>
    `;
    card.addEventListener('click', () => {
      addEnclosureToProject(enclosure.id, opt.code);
      closeModal('modal-ordering');
    });
    grid.appendChild(card);
  });

  openModal('modal-ordering');
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
