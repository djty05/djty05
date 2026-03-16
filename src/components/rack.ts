import type { RackState } from '../models/types.ts';
import { renderEquipmentPanel } from './equipment-panel.ts';

export function createRack(
  state: RackState,
  onSelect: (instanceId: string | null) => void,
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'rack-container';

  const frame = document.createElement('div');
  frame.className = 'rack-frame';

  const slots = document.createElement('div');
  slots.className = 'rack-slots';

  for (let ru = 1; ru <= state.totalRU; ru++) {
    const slot = document.createElement('div');
    slot.className = 'rack-slot';
    slot.dataset.ru = String(ru);

    const ruLabel = document.createElement('span');
    ruLabel.className = 'ru-number';
    ruLabel.textContent = String(ru);
    slot.appendChild(ruLabel);

    slots.appendChild(slot);
  }

  frame.appendChild(slots);
  container.appendChild(frame);

  // Initial render of placed equipment
  renderPlacedEquipment(slots, state, onSelect);

  return container;
}

export function renderPlacedEquipment(
  slotsContainer: HTMLElement,
  state: RackState,
  onSelect: (instanceId: string | null) => void,
): void {
  const allSlots = slotsContainer.querySelectorAll<HTMLElement>('.rack-slot');

  // Reset all slots
  allSlots.forEach(slot => {
    slot.className = 'rack-slot';
    // Remove equipment panels but keep RU number
    const panel = slot.querySelector('.equipment-panel');
    if (panel) panel.remove();
    slot.style.height = '';
    slot.style.display = '';
  });

  // Place equipment
  for (const placed of state.placed) {
    const startIdx = placed.startRU - 1;
    const slot = allSlots[startIdx];
    if (!slot) continue;

    slot.classList.add('occupied');
    slot.style.height = `${placed.equipment.ruSize * 44 + (placed.equipment.ruSize - 1) * 2}px`;

    const panel = renderEquipmentPanel(placed.equipment, placed.instanceId);
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(placed.instanceId);
    });
    slot.appendChild(panel);

    // Hide continuation slots
    for (let i = 1; i < placed.equipment.ruSize; i++) {
      const contSlot = allSlots[startIdx + i];
      if (contSlot) {
        contSlot.classList.add('occupied-continuation');
        contSlot.style.display = 'none';
      }
    }
  }
}
