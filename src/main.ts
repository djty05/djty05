import './styles/main.css';
import './styles/rack.css';
import './styles/sidebar.css';
import './styles/equipment.css';

import { equipmentCatalog } from './data/equipment.ts';
import { createSidebar } from './components/sidebar.ts';
import { createRack, renderPlacedEquipment } from './components/rack.ts';
import { setupDragDrop, setCurrentDragId } from './utils/drag-drop.ts';
import { loadState, removeEquipment, clearState, getTotalPower, getUsedRU } from './utils/state.ts';

const app = document.getElementById('app')!;
const state = loadState();
let selectedInstanceId: string | null = null;

// === Header ===
const header = document.createElement('header');
header.className = 'header';
header.innerHTML = `
  <h1>RACK <span>PLANNER</span></h1>
  <div class="header-actions">
    <button id="btn-reset">Reset</button>
    <button id="btn-export">Export PNG</button>
  </div>
`;
app.appendChild(header);

// === Main Layout ===
const mainLayout = document.createElement('div');
mainLayout.className = 'main-layout';

// Sidebar
const sidebar = createSidebar();

// Capture drag ID from sidebar cards by looking up equipment by name
sidebar.addEventListener('dragstart', (e) => {
  const card = (e.target as HTMLElement).closest('.equipment-card');
  if (!card) return;
  const nameEl = card.querySelector('.equipment-card-name');
  if (!nameEl) return;
  const eq = equipmentCatalog.find(item => item.name === nameEl.textContent);
  if (eq) setCurrentDragId(eq.id);
}, true);

sidebar.addEventListener('dragend', () => {
  setCurrentDragId(null);
});

mainLayout.appendChild(sidebar);

// Rack selection handler
function handleSelect(instanceId: string | null) {
  document.querySelectorAll('.equipment-panel.selected').forEach(el => el.classList.remove('selected'));
  if (instanceId === selectedInstanceId) {
    selectedInstanceId = null;
    return;
  }
  selectedInstanceId = instanceId;
  if (instanceId) {
    const panel = document.querySelector(`.equipment-panel[data-instance-id="${instanceId}"]`);
    panel?.classList.add('selected');
  }
}

const rackContainer = createRack(state, handleSelect);
mainLayout.appendChild(rackContainer);
app.appendChild(mainLayout);

// === Stats Bar ===
const statsBar = document.createElement('div');
statsBar.className = 'stats-bar';
app.appendChild(statsBar);

function updateStats() {
  const used = getUsedRU(state);
  const power = getTotalPower(state);
  const pct = Math.round((used / state.totalRU) * 100);
  const powerClass = power > 1000 ? 'danger' : power > 500 ? 'warning' : '';

  statsBar.innerHTML = `
    <div class="stat">
      <span class="stat-label">Rack Usage:</span>
      <span class="stat-value">${used} / ${state.totalRU} RU (${pct}%)</span>
    </div>
    <div class="stat">
      <span class="stat-label">Power Draw:</span>
      <span class="stat-value ${powerClass}">${power}W</span>
    </div>
    <div class="stat">
      <span class="stat-label">Items:</span>
      <span class="stat-value">${state.placed.length}</span>
    </div>
  `;
}

function refreshRack() {
  const slotsContainer = rackContainer.querySelector('.rack-slots') as HTMLElement;
  renderPlacedEquipment(slotsContainer, state, handleSelect);
  updateStats();
  selectedInstanceId = null;
}

// === Drag & Drop ===
setupDragDrop(rackContainer, state, refreshRack);

// === Keyboard ===
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedInstanceId) {
    removeEquipment(state, selectedInstanceId);
    selectedInstanceId = null;
    refreshRack();
  }
  if (e.key === 'Escape') {
    handleSelect(null);
  }
});

// Click to deselect
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('.equipment-panel')) {
    handleSelect(null);
  }
});

// === Buttons ===
document.getElementById('btn-reset')?.addEventListener('click', () => {
  if (state.placed.length === 0 || confirm('Clear all equipment from the rack?')) {
    clearState(state);
    refreshRack();
  }
});

document.getElementById('btn-export')?.addEventListener('click', () => {
  const rackFrame = rackContainer.querySelector('.rack-frame') as HTMLElement;
  if (!rackFrame) return;

  try {
    const canvas = document.createElement('canvas');
    const rect = rackFrame.getBoundingClientRect();
    const scale = 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${rackFrame.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = 'rack-layout.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  } catch {
    alert('Export failed. Try using your browser\'s screenshot tool instead.');
  }
});

// === Initial render ===
updateStats();
