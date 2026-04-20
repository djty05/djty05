// Inner Range Parts Catalog with Real Dimensions & External Components

const PARTS_CATALOG = [
  // ===== CONTROLLERS (PCB Size A) =====
  {
    id: 'IR-996001',
    category: 'Controllers',
    code: 'IR-996001PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti ISC (3000/4000)',
    price: 2450,
    wattage: 8,
    pcbSize: 'A',
    type: 'controller',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'ETH+', type: 'ethernet' }, { name: 'ETH-', type: 'ethernet' },
      { name: 'RS485+', type: 'serial' }, { name: 'RS485-', type: 'serial' },
      { name: 'TX+', type: 'serial' }, { name: 'RX+', type: 'serial' },
      { name: 'REL1', type: 'relay' }, { name: 'REL2', type: 'relay' },
      { name: 'IN1', type: 'input' }, { name: 'IN2', type: 'input' },
    ],
  },
  {
    id: 'IR-996035',
    category: 'Controllers',
    code: 'IR-996035PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti IAC',
    price: 1895,
    wattage: 7,
    pcbSize: 'A',
    type: 'controller',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'ETH+', type: 'ethernet' }, { name: 'ETH-', type: 'ethernet' },
      { name: 'RS485+', type: 'serial' }, { name: 'RS485-', type: 'serial' },
      { name: 'REL1', type: 'relay' }, { name: 'IN1', type: 'input' },
    ],
  },

  // ===== EXPANSION MODULES (PCB Size B) =====
  {
    id: 'IR-996018',
    category: 'Expansion Modules',
    code: 'IR-996018PCB&K',
    manufacturer: 'Inner Range',
    description: 'ILAM (2-Door/2-Reader)',
    price: 795,
    wattage: 3,
    pcbSize: 'B',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'RS485+', type: 'serial' }, { name: 'RS485-', type: 'serial' },
    ],
  },
  {
    id: 'IR-996535',
    category: 'Expansion Modules',
    code: 'IR-996535',
    manufacturer: 'Inner Range',
    description: 'UniBus 2-Door/2-Reader Expander',
    price: 625,
    wattage: 2.5,
    pcbSize: 'B',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
    ],
  },
  {
    id: 'IR-996012',
    category: 'Expansion Modules',
    code: 'IR-996012PCB&K',
    manufacturer: 'Inner Range',
    description: 'LAN Access Module',
    price: 595,
    wattage: 2,
    pcbSize: 'B',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'ETH+', type: 'ethernet' }, { name: 'ETH-', type: 'ethernet' },
    ],
  },
  {
    id: 'IR-996005',
    category: 'Expansion Modules',
    code: 'IR-996005PCB&K',
    manufacturer: 'Inner Range',
    description: 'UEM (16-Zone Input)',
    price: 545,
    wattage: 2,
    pcbSize: 'B',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
    ],
  },

  // ===== POWER (PCB Size C) =====
  {
    id: 'IR-996091',
    category: 'Power',
    code: 'IR-996091PCB&K',
    manufacturer: 'Inner Range',
    description: 'Smart 3A PSU',
    price: 385,
    wattage: 0,
    psuRating: 36,
    pcbSize: 'C',
    type: 'psu',
    terminals: [
      { name: 'AC-IN', type: 'power' }, { name: 'AC-N', type: 'power' },
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
    ],
  },
  {
    id: 'IR-996092',
    category: 'Power',
    code: 'IR-996092',
    manufacturer: 'Inner Range',
    description: 'Smart 8A PSU',
    price: 595,
    wattage: 0,
    psuRating: 96,
    pcbSize: 'C',
    type: 'psu',
    terminals: [
      { name: 'AC-IN', type: 'power' }, { name: 'AC-N', type: 'power' },
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
    ],
  },

  // ===== READERS (external, go on site) =====
  {
    id: 'IR-994720',
    category: 'Readers',
    code: 'IR-994720',
    manufacturer: 'Inner Range',
    description: 'SIFER Multi-Format Reader',
    price: 345,
    wattage: 1.5,
    pcbSize: 'external',
    type: 'reader',
  },
  {
    id: 'IR-994725',
    category: 'Readers',
    code: 'IR-994725',
    manufacturer: 'Inner Range',
    description: 'SIFER Reader + Keypad',
    price: 425,
    wattage: 2,
    pcbSize: 'external',
    type: 'reader',
  },
  {
    id: 'IR-996795',
    category: 'Readers',
    code: 'IR-996795',
    manufacturer: 'Inner Range',
    description: 'T4000 OSDP Reader',
    price: 285,
    wattage: 1.2,
    pcbSize: 'external',
    type: 'reader',
  },

  // ===== LOCKS & HARDWARE (external, go on site) =====
  {
    id: 'LOCK-EL01',
    category: 'Locks & Hardware',
    code: 'EL-STRIKE',
    manufacturer: 'Inner Range',
    description: 'Electric Strike Lock',
    price: 95,
    wattage: 0.8,
    pcbSize: 'external',
    type: 'lock',
  },
  {
    id: 'LOCK-M2',
    category: 'Locks & Hardware',
    code: 'MAGLC-2',
    manufacturer: 'Inner Range',
    description: 'Magnetic Lock 2-way',
    price: 125,
    wattage: 0.5,
    pcbSize: 'external',
    type: 'lock',
  },
  {
    id: 'LOCK-T1',
    category: 'Locks & Hardware',
    code: 'TURNSTY-1',
    manufacturer: 'Inner Range',
    description: 'Turnstile Motor Controller',
    price: 185,
    wattage: 1.2,
    pcbSize: 'external',
    type: 'lock',
  },
  {
    id: 'SENSOR-PIR',
    category: 'Sensors',
    code: 'PIR-MOTION',
    manufacturer: 'Inner Range',
    description: 'PIR Motion Detector',
    price: 65,
    wattage: 0.2,
    pcbSize: 'external',
    type: 'sensor',
  },
  {
    id: 'SENSOR-DOOR',
    category: 'Sensors',
    code: 'DOOR-CONTACT',
    manufacturer: 'Inner Range',
    description: 'Door Contact Sensor',
    price: 45,
    wattage: 0.1,
    pcbSize: 'external',
    type: 'sensor',
  },
  {
    id: 'KEYPAD-TERM',
    category: 'Keypads',
    code: 'TERM-LCD',
    manufacturer: 'Inner Range',
    description: 'Terminal Display',
    price: 495,
    wattage: 2,
    pcbSize: 'external',
    type: 'keypad',
  },

  // ===== ENCLOSURES (with real dimensions in mm - based on Inner Range specs) =====
  // Layout convention:
  //   - Battery shelf sits at the BOTTOM spanning most of the width
  //   - Transformer is in the bottom-LEFT corner next to the battery
  //   - PCBs mount on the backplate above the battery shelf
  //
  {
    id: 'ENC-MD3A',
    category: 'Enclosures',
    code: 'IR-995201',
    manufacturer: 'Inner Range',
    description: 'Medium Enclosure (3A, 9Ah)',
    price: 685,
    wattage: 0,
    psuRating: 36,
    batteryCapacity: '9Ah',
    size: 'medium',
    width_mm: 520,
    height_mm: 420,
    type: 'enclosure',
    variants: [
      {
        name: 'Standard Layout',
        slots: [
          // Top row: Size A (controllers)
          { id: 'A1', size: 'A', x: 25, y: 25, w: 220, h: 140 },
          { id: 'A2', size: 'A', x: 275, y: 25, w: 220, h: 140 },
          // Middle row: Size B (modules)
          { id: 'B1', size: 'B', x: 25, y: 185, w: 220, h: 95 },
          { id: 'B2', size: 'B', x: 275, y: 185, w: 220, h: 95 },
          // Lower row: Size C (PSU/small)
          { id: 'C1', size: 'C', x: 25, y: 295, w: 220, h: 35 },
          { id: 'C2', size: 'C', x: 275, y: 295, w: 220, h: 35 },
          // Bottom shelf: Transformer + Battery (full width)
          { id: 'PSU', size: 'C', x: 25, y: 345, w: 85, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 120, y: 345, w: 375, h: 60, label: '9Ah Battery' },
        ],
      },
      {
        name: 'Dense Layout',
        slots: [
          { id: 'C1', size: 'C', x: 25, y: 25, w: 220, h: 45 },
          { id: 'C2', size: 'C', x: 275, y: 25, w: 220, h: 45 },
          { id: 'B1', size: 'B', x: 25, y: 85, w: 220, h: 90 },
          { id: 'B2', size: 'B', x: 275, y: 85, w: 220, h: 90 },
          { id: 'B3', size: 'B', x: 25, y: 190, w: 220, h: 90 },
          { id: 'B4', size: 'B', x: 275, y: 190, w: 220, h: 90 },
          { id: 'C3', size: 'C', x: 25, y: 295, w: 220, h: 35 },
          { id: 'C4', size: 'C', x: 275, y: 295, w: 220, h: 35 },
          { id: 'PSU', size: 'C', x: 25, y: 345, w: 85, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 120, y: 345, w: 375, h: 60, label: '9Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-MD8A',
    category: 'Enclosures',
    code: 'IR-995202',
    manufacturer: 'Inner Range',
    description: 'Medium Enclosure (8A, 18Ah)',
    price: 895,
    wattage: 0,
    psuRating: 96,
    batteryCapacity: '18Ah',
    size: 'medium',
    width_mm: 520,
    height_mm: 460,
    type: 'enclosure',
    variants: [
      {
        name: 'Standard Layout',
        slots: [
          // Top row: Size A
          { id: 'A1', size: 'A', x: 25, y: 25, w: 220, h: 140 },
          { id: 'A2', size: 'A', x: 275, y: 25, w: 220, h: 140 },
          // Middle row: Size B
          { id: 'B1', size: 'B', x: 25, y: 185, w: 220, h: 95 },
          { id: 'B2', size: 'B', x: 275, y: 185, w: 220, h: 95 },
          // Lower row: Size C
          { id: 'C1', size: 'C', x: 25, y: 300, w: 220, h: 50 },
          { id: 'C2', size: 'C', x: 275, y: 300, w: 220, h: 50 },
          // Battery shelf — 18Ah is larger so taller
          { id: 'PSU', size: 'C', x: 25, y: 365, w: 90, h: 80, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 125, y: 365, w: 370, h: 80, label: '18Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-LG8A',
    category: 'Enclosures',
    code: 'IR-995203',
    manufacturer: 'Inner Range',
    description: 'Large Enclosure (8A, 18Ah)',
    price: 1195,
    wattage: 0,
    psuRating: 96,
    batteryCapacity: '18Ah',
    size: 'large',
    width_mm: 620,
    height_mm: 520,
    type: 'enclosure',
    variants: [
      {
        name: 'Access Control',
        slots: [
          // Top row: Size A
          { id: 'A1', size: 'A', x: 25, y: 25, w: 265, h: 150 },
          { id: 'A2', size: 'A', x: 320, y: 25, w: 275, h: 150 },
          // Middle row: Size B
          { id: 'B1', size: 'B', x: 25, y: 195, w: 180, h: 100 },
          { id: 'B2', size: 'B', x: 220, y: 195, w: 180, h: 100 },
          { id: 'B3', size: 'B', x: 415, y: 195, w: 180, h: 100 },
          // Lower row: Size C (small modules)
          { id: 'C1', size: 'C', x: 25, y: 315, w: 180, h: 90 },
          { id: 'C2', size: 'C', x: 220, y: 315, w: 180, h: 90 },
          { id: 'C3', size: 'C', x: 415, y: 315, w: 180, h: 90 },
          // Battery shelf — full width
          { id: 'PSU', size: 'C', x: 25, y: 425, w: 90, h: 80, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 125, y: 425, w: 470, h: 80, label: '18Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-XL8A',
    category: 'Enclosures',
    code: 'IR-995204',
    manufacturer: 'Inner Range',
    description: 'Xtra Large Enclosure (8A, 18Ah)',
    price: 1485,
    wattage: 0,
    psuRating: 96,
    batteryCapacity: '18Ah',
    size: 'xlarge',
    width_mm: 720,
    height_mm: 580,
    type: 'enclosure',
    variants: [
      {
        name: 'Full System',
        slots: [
          // Top row: 3x Size A controllers
          { id: 'A1', size: 'A', x: 25, y: 25, w: 220, h: 155 },
          { id: 'A2', size: 'A', x: 260, y: 25, w: 220, h: 155 },
          { id: 'A3', size: 'A', x: 495, y: 25, w: 200, h: 155 },
          // Middle row: 3x Size B
          { id: 'B1', size: 'B', x: 25, y: 200, w: 220, h: 105 },
          { id: 'B2', size: 'B', x: 260, y: 200, w: 220, h: 105 },
          { id: 'B3', size: 'B', x: 495, y: 200, w: 200, h: 105 },
          // Lower middle: 3x Size B
          { id: 'B4', size: 'B', x: 25, y: 325, w: 220, h: 105 },
          { id: 'B5', size: 'B', x: 260, y: 325, w: 220, h: 105 },
          { id: 'B6', size: 'B', x: 495, y: 325, w: 200, h: 105 },
          // Lower row: 3x Size C
          { id: 'C1', size: 'C', x: 25, y: 445, w: 220, h: 50 },
          { id: 'C2', size: 'C', x: 260, y: 445, w: 220, h: 50 },
          { id: 'C3', size: 'C', x: 495, y: 445, w: 200, h: 50 },
          // Battery shelf — full width
          { id: 'PSU', size: 'C', x: 25, y: 510, w: 90, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 125, y: 510, w: 570, h: 60, label: '18Ah Battery' },
        ],
      },
    ],
  },
];

function getPartById(id) {
  return PARTS_CATALOG.find(p => p.id === id);
}

function getPartsByCategory(cat) {
  return PARTS_CATALOG.filter(p => p.category === cat && p.type !== 'enclosure');
}

function getCategories() {
  const cats = new Set();
  PARTS_CATALOG.forEach(p => {
    if (p.type !== 'enclosure') cats.add(p.category);
  });
  return [...cats];
}

function getEnclosures() {
  return PARTS_CATALOG.filter(p => p.type === 'enclosure');
}

function getPartsBySize(size) {
  return PARTS_CATALOG.filter(p => p.pcbSize === size && p.type !== 'enclosure');
}
