import type { RackState } from '../models/types.ts';
import { equipmentCatalog } from '../data/equipment.ts';
import { addEquipment, isSlotAvailable } from './state.ts';

let currentDragId: string | null = null;

export function setCurrentDragId(id: string | null): void {
  currentDragId = id;
}

export function setupDragDrop(
  rackContainer: HTMLElement,
  state: RackState,
  onDrop: () => void,
): void {
  const slotsContainer = rackContainer.querySelector('.rack-slots') as HTMLElement;

  slotsContainer.addEventListener('dragover', (e: Event) => {
    const de = e as DragEvent;
    de.preventDefault();
    const slot = (de.target as HTMLElement).closest('.rack-slot') as HTMLElement | null;
    if (!slot || slot.classList.contains('occupied')) return;

    const equipId = currentDragId;
    if (!equipId) {
      de.dataTransfer!.dropEffect = 'copy';
      return;
    }

    const eq = equipmentCatalog.find(item => item.id === equipId);
    const ru = parseInt(slot.dataset.ru || '0');

    if (eq && isSlotAvailable(state, ru, eq.ruSize)) {
      de.dataTransfer!.dropEffect = 'copy';
      highlightDropZone(slotsContainer, ru, eq.ruSize, true);
    } else {
      de.dataTransfer!.dropEffect = 'none';
      highlightDropZone(slotsContainer, ru, eq?.ruSize || 1, false);
    }
  });

  slotsContainer.addEventListener('dragleave', (e: Event) => {
    const de = e as DragEvent;
    const related = de.relatedTarget as HTMLElement | null;
    if (!related || !slotsContainer.contains(related)) {
      clearHighlights(slotsContainer);
    }
  });

  slotsContainer.addEventListener('drop', (e: Event) => {
    const de = e as DragEvent;
    de.preventDefault();
    clearHighlights(slotsContainer);

    const equipId = de.dataTransfer?.getData('application/equipment-id');
    if (!equipId) return;

    const slot = (de.target as HTMLElement).closest('.rack-slot') as HTMLElement | null;
    if (!slot) return;

    const ru = parseInt(slot.dataset.ru || '0');
    const eq = equipmentCatalog.find(item => item.id === equipId);
    if (!eq) return;

    const placed = addEquipment(state, eq, ru);
    if (placed) {
      onDrop();
    }
  });
}

function highlightDropZone(container: HTMLElement, startRU: number, ruSize: number, valid: boolean): void {
  clearHighlights(container);
  for (let i = 0; i < ruSize; i++) {
    const slot = container.querySelector(`.rack-slot[data-ru="${startRU + i}"]`) as HTMLElement;
    if (slot) {
      slot.classList.add(valid ? 'drop-target' : 'drop-invalid');
    }
  }
}

function clearHighlights(container: HTMLElement): void {
  container.querySelectorAll('.rack-slot').forEach(slot => {
    slot.classList.remove('drop-target', 'drop-invalid');
  });
}
