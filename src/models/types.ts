export type Brand = 'unifi' | 'control4' | 'sonos' | 'generic';

export interface Equipment {
  id: string;
  name: string;
  brand: Brand;
  category: string;
  ruSize: number;
  color: string;
  accentColor: string;
  powerDraw: number;
  description: string;
}

export interface PlacedEquipment {
  instanceId: string;
  equipment: Equipment;
  startRU: number;
}

export interface RackState {
  totalRU: number;
  placed: PlacedEquipment[];
}
