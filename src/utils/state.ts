import type { Equipment, PlacedEquipment, RackState } from '../models/types.ts';

const STORAGE_KEY = 'rack-planner-state';

let nextId = 1;

function generateInstanceId(): string {
  return `inst-${Date.now()}-${nextId++}`;
}

export function createEmptyState(): RackState {
  return { totalRU: 18, placed: [] };
}

export function loadState(): RackState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RackState;
      if (parsed.placed && parsed.totalRU) return parsed;
    }
  } catch { /* ignore */ }
  return createEmptyState();
}

export function saveState(state: RackState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isSlotAvailable(state: RackState, startRU: number, ruSize: number): boolean {
  if (startRU < 1 || startRU + ruSize - 1 > state.totalRU) return false;
  for (const p of state.placed) {
    const pEnd = p.startRU + p.equipment.ruSize - 1;
    const newEnd = startRU + ruSize - 1;
    if (startRU <= pEnd && newEnd >= p.startRU) return false;
  }
  return true;
}

export function addEquipment(state: RackState, equipment: Equipment, startRU: number): PlacedEquipment | null {
  if (!isSlotAvailable(state, startRU, equipment.ruSize)) return null;
  const placed: PlacedEquipment = {
    instanceId: generateInstanceId(),
    equipment,
    startRU,
  };
  state.placed.push(placed);
  state.placed.sort((a, b) => a.startRU - b.startRU);
  saveState(state);
  return placed;
}

export function removeEquipment(state: RackState, instanceId: string): boolean {
  const idx = state.placed.findIndex(p => p.instanceId === instanceId);
  if (idx === -1) return false;
  state.placed.splice(idx, 1);
  saveState(state);
  return true;
}

export function getTotalPower(state: RackState): number {
  return state.placed.reduce((sum, p) => sum + p.equipment.powerDraw, 0);
}

export function getUsedRU(state: RackState): number {
  return state.placed.reduce((sum, p) => sum + p.equipment.ruSize, 0);
}

export function clearState(state: RackState): void {
  state.placed = [];
  saveState(state);
}
