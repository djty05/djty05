// Enclosure management system with layout visualization

let currentEnclosure = null;

function selectEnclosure(enclosureId) {
  const enclosure = getPartById(enclosureId);
  if (!enclosure) return;

  currentEnclosure = enclosure;
  closeModal('modal-enclosure');
  toast(`Enclosure selected: ${enclosure.code}`);
  updatePowerInfo();
  updateLayoutPreview();
  initCanvas();
}

function skipEnclosure() {
  currentEnclosure = null;
  closeModal('modal-enclosure');
  toast('No enclosure selected');
  initCanvas();
}

function getEnclosurePSURating() {
  if (!currentEnclosure) return Infinity;
  return (currentEnclosure.psuRating || 0) * 12; // Convert Amps to Watts at 12V
}

function updatePowerInfo() {
  const el = document.getElementById('modal-power');
  if (!el) return;

  if (!currentEnclosure) {
    document.getElementById('info-enclosure').textContent = 'None';
    document.getElementById('info-psu').textContent = '—';
    document.getElementById('power-remaining-row').style.display = 'none';
    return;
  }

  const powerUsed = calculateTotalPower(canvasState.components);
  const psuCapacity = getEnclosurePSURating();
  const remaining = psuCapacity - powerUsed;
  const isOverload = remaining < 0;

  document.getElementById('info-enclosure').textContent = currentEnclosure.code;
  document.getElementById('info-psu').textContent = `${currentEnclosure.psuRating}A (${Math.round(psuCapacity)}W)`;
  document.getElementById('info-power-used').textContent = `${Math.round(powerUsed)}W`;
  document.getElementById('info-power-remaining').textContent = `${Math.round(remaining)}W`;
  document.getElementById('power-remaining-row').style.display = 'flex';

  const warning = document.getElementById('power-warning');
  if (isOverload) {
    warning.style.display = 'block';
    document.getElementById('info-power-remaining').style.color = '#dc2626';
  } else {
    warning.style.display = 'none';
    document.getElementById('info-power-remaining').style.color = '#10b981';
  }
}

function updateLayoutPreview() {
  const preview = document.getElementById('layout-preview');
  if (!preview || !currentEnclosure) {
    preview.innerHTML = '<p style="padding:20px; color:#6b7280">No enclosure selected</p>';
    return;
  }

  const layout = currentEnclosure.layout;
  if (!layout) {
    preview.innerHTML = '<p style="padding:20px; color:#6b7280">Layout not available</p>';
    return;
  }

  preview.innerHTML = '';

  const scale = preview.offsetWidth / currentEnclosure.interiorWidth || 1;

  // Draw PSU
  if (layout.psuPosition) {
    const psu = document.createElement('div');
    psu.className = 'layout-item';
    psu.style.left = layout.psuPosition.x * scale + 'px';
    psu.style.top = layout.psuPosition.y * scale + 'px';
    psu.style.width = layout.psuPosition.w * scale + 'px';
    psu.style.height = layout.psuPosition.h * scale + 'px';
    psu.style.background = 'rgba(220, 38, 38, 0.15)';
    psu.style.borderColor = '#dc2626';
    psu.textContent = 'PSU';
    preview.appendChild(psu);
  }

  // Draw battery
  if (layout.batteryPosition) {
    const batt = document.createElement('div');
    batt.className = 'layout-item';
    batt.style.left = layout.batteryPosition.x * scale + 'px';
    batt.style.top = layout.batteryPosition.y * scale + 'px';
    batt.style.width = layout.batteryPosition.w * scale + 'px';
    batt.style.height = layout.batteryPosition.h * scale + 'px';
    batt.style.background = 'rgba(251, 146, 60, 0.15)';
    batt.style.borderColor = '#f97316';
    batt.textContent = 'Battery';
    preview.appendChild(batt);
  }

  // Draw PCB slots
  if (layout.pcbSlots) {
    layout.pcbSlots.forEach(slot => {
      const pcb = document.createElement('div');
      pcb.className = 'layout-item';
      pcb.style.left = slot.x * scale + 'px';
      pcb.style.top = slot.y * scale + 'px';
      pcb.style.width = slot.w * scale + 'px';
      pcb.style.height = slot.h * scale + 'px';
      pcb.textContent = slot.label;
      preview.appendChild(pcb);
    });
  }

  // Show dimensions
  const dims = document.createElement('div');
  dims.style.position = 'absolute';
  dims.style.bottom = '4px';
  dims.style.right = '4px';
  dims.style.fontSize = '10px';
  dims.style.color = '#6b7280';
  dims.style.backgroundColor = 'rgba(255,255,255,0.7)';
  dims.style.padding = '2px 4px';
  dims.style.borderRadius = '2px';
  dims.textContent = `${currentEnclosure.interiorWidth}×${currentEnclosure.interiorHeight}×${currentEnclosure.interiorDepth}mm`;
  preview.appendChild(dims);
}

function showEnclosureSelector() {
  const modal = document.getElementById('modal-enclosure');
  const list = document.getElementById('enclosure-list');
  list.innerHTML = '';

  const enclosures = getEnclosures();
  enclosures.forEach(enc => {
    const btn = document.createElement('button');
    btn.className = 'enclosure-btn';
    btn.innerHTML = `
      <div style="font-weight:600; color:var(--primary)">${enc.code}</div>
      <div style="font-size:11px; color:#6b7280">${enc.psuRating}A PSU</div>
      <div style="font-size:11px; color:#6b7280">$${enc.price.toFixed(0)}</div>
    `;
    btn.addEventListener('click', () => selectEnclosure(enc.id));
    list.appendChild(btn);
  });

  modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
