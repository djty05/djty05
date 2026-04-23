// Drag-drop state for palette -> enclosure slots
// Works with both mouse (HTML5 DnD) and touch (custom handlers)

let draggingPartId = null;
let selectedPaletteId = null;
let touchGhost = null;

// Keep for backward compat with other files
let canvasState = {
  components: [],
  wires: [],
  selectedComponent: null,
  nextComponentId: 1,
  nextWireId: 1,
};

// ===== HTML5 DRAG (desktop) =====
function makePaletteCardDraggable(card, partId) {
  card.draggable = true;

  card.addEventListener('dragstart', e => {
    draggingPartId = partId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', partId);
  });

  card.addEventListener('dragend', () => {
    draggingPartId = null;
    card.classList.remove('dragging');
  });
}

// ===== TOUCH (mobile) =====
function makePaletteCardTouchable(card, partId) {
  let touchStarted = false;

  card.addEventListener('touchstart', e => {
    touchStarted = true;
    selectedPaletteId = partId;
    draggingPartId = partId;
    document.querySelectorAll('.part-card.selected').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    const part = getPartById(partId);
    if (part) {
      touchGhost = document.createElement('div');
      touchGhost.className = 'drag-ghost';
      touchGhost.innerHTML = `
        <div style="background: var(--ir-red); color: white; padding: 6px 10px; border-radius: 3px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3)">
          ${part.code}
        </div>
      `;
      document.body.appendChild(touchGhost);
      const touch = e.touches[0];
      touchGhost.style.left = touch.clientX + 'px';
      touchGhost.style.top = touch.clientY + 'px';
    }
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    if (!touchGhost) return;
    const touch = e.touches[0];
    touchGhost.style.left = touch.clientX + 'px';
    touchGhost.style.top = touch.clientY + 'px';

    document.querySelectorAll('.pcb-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = el?.closest('.pcb-slot:not(.filled)');
    if (slot) {
      const slotSize = slot.dataset.slotSize;
      if (canPlaceInSlot(draggingPartId, slotSize)) {
        slot.classList.add('drag-over');
      }
    }
  }, { passive: true });

  card.addEventListener('touchend', e => {
    if (touchGhost) {
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const slot = el?.closest('.pcb-slot:not(.filled)');
      if (slot) {
        const slotId = slot.dataset.slotId;
        placePartInSlot(slotId, draggingPartId);
      } else if (touchStarted) {
        // If they just tapped without dragging, keep it selected for tap-to-place
        toast('Tap a matching slot to place');
      }
      touchGhost.remove();
      touchGhost = null;
    }
    document.querySelectorAll('.pcb-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
    touchStarted = false;
  });
}

function selectPartFromPalette(partId) {
  selectedPaletteId = partId;
  draggingPartId = partId;
  document.querySelectorAll('.part-card.selected').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-part-id="${partId}"]`);
  card?.classList.add('selected');
  const part = getPartById(partId);
  toast('Tap a matching slot to place ' + (part?.code || ''));
}
