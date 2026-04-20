// Inner Range Integriti Parts Catalog - Real CSD.com.au part numbers
// PCB Sizes: A = Large (Controllers), B = Medium (Expansion), C = Small (Readers/misc)

const PARTS_CATALOG = [
  // ===== CONTROLLERS (PCB Size A) =====
  {
    id: 'IR-996001',
    category: 'Controllers',
    code: 'IR-996001PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti Intelligent System Controller (ISC)',
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
    description: 'Integriti Integrated Access Controller (IAC)',
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
  {
    id: 'IR-996905',
    category: 'Controllers',
    code: 'IR-996905',
    manufacturer: 'Inner Range',
    description: 'Inception Controller (8-zone)',
    price: 1395,
    wattage: 6,
    pcbSize: 'A',
    type: 'controller',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'ETH+', type: 'ethernet' }, { name: 'ETH-', type: 'ethernet' },
      { name: 'REL1', type: 'relay' }, { name: 'IN1', type: 'input' },
    ],
  },

  // ===== EXPANSION MODULES (PCB Size B) =====
  {
    id: 'IR-996018',
    category: 'Expansion Modules',
    code: 'IR-996018PCB&K',
    manufacturer: 'Inner Range',
    description: 'Intelligent LAN Access Module (ILAM) 2-Door/2-Reader',
    price: 795,
    wattage: 3,
    pcbSize: 'B',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'RS485+', type: 'serial' }, { name: 'RS485-', type: 'serial' },
      { name: 'DOOR1', type: 'relay' }, { name: 'DOOR2', type: 'relay' },
      { name: 'RDR1', type: 'reader' }, { name: 'RDR2', type: 'reader' },
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
      { name: 'DOOR1', type: 'relay' }, { name: 'DOOR2', type: 'relay' },
    ],
  },
  {
    id: 'IR-996012',
    category: 'Expansion Modules',
    code: 'IR-996012PCB&K',
    manufacturer: 'Inner Range',
    description: 'LAN Access Module (Ethernet Bridge)',
    price: 595,
    wattage: 2,
    pcbSize: 'B',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'ETH+', type: 'ethernet' }, { name: 'ETH-', type: 'ethernet' },
      { name: 'RS485+', type: 'serial' }, { name: 'RS485-', type: 'serial' },
    ],
  },
  {
    id: 'IR-996005',
    category: 'Expansion Modules',
    code: 'IR-996005PCB&K',
    manufacturer: 'Inner Range',
    description: '16-Zone Input Expander (UEM)',
    price: 545,
    wattage: 2,
    pcbSize: 'B',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
      { name: 'IN1', type: 'input' }, { name: 'IN8', type: 'input' },
    ],
  },
  {
    id: 'IR-996065',
    category: 'Expansion Modules',
    code: 'IR-996065PCB&K',
    manufacturer: 'Inner Range',
    description: '8-Relay Output Expander (SRI)',
    price: 495,
    wattage: 3,
    pcbSize: 'B',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
      { name: 'REL1', type: 'relay' }, { name: 'REL8', type: 'relay' },
    ],
  },

  // ===== POWER (PCB Size C) =====
  {
    id: 'IR-996091',
    category: 'Power Supplies',
    code: 'IR-996091PCB&K',
    manufacturer: 'Inner Range',
    description: 'Smart 3A Power Supply',
    price: 385,
    wattage: 0,
    psuRating: 36,
    pcbSize: 'C',
    type: 'psu',
    terminals: [
      { name: 'AC-IN', type: 'power' }, { name: 'AC-N', type: 'power' },
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'BAT+', type: 'power' }, { name: 'BAT-', type: 'power' },
    ],
  },
  {
    id: 'IR-996092',
    category: 'Power Supplies',
    code: 'IR-996092',
    manufacturer: 'Inner Range',
    description: 'Smart 8A Power Supply',
    price: 595,
    wattage: 0,
    psuRating: 96,
    pcbSize: 'C',
    type: 'psu',
    terminals: [
      { name: 'AC-IN', type: 'power' }, { name: 'AC-N', type: 'power' },
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'BAT+', type: 'power' }, { name: 'BAT-', type: 'power' },
    ],
  },

  // ===== READERS (external - no slot needed) =====
  {
    id: 'IR-994720',
    category: 'Readers',
    code: 'IR-994720',
    manufacturer: 'Inner Range',
    description: 'SIFER Multi-Format Reader (Mifare/DESFire)',
    price: 345,
    wattage: 1.5,
    pcbSize: 'external',
    type: 'reader',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'DATA+', type: 'data' }, { name: 'DATA-', type: 'data' },
    ],
  },
  {
    id: 'IR-994725',
    category: 'Readers',
    code: 'IR-994725',
    manufacturer: 'Inner Range',
    description: 'SIFER Reader with Keypad',
    price: 425,
    wattage: 2,
    pcbSize: 'external',
    type: 'reader',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'DATA+', type: 'data' }, { name: 'DATA-', type: 'data' },
    ],
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
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'OSDP+', type: 'data' }, { name: 'OSDP-', type: 'data' },
    ],
  },

  // ===== KEYPADS (external - no slot needed) =====
  {
    id: 'IR-995050',
    category: 'Keypads',
    code: 'IR-995050',
    manufacturer: 'Inner Range',
    description: 'Integriti Touch Screen Terminal',
    price: 1250,
    wattage: 3,
    pcbSize: 'external',
    type: 'keypad',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'RS485+', type: 'serial' }, { name: 'RS485-', type: 'serial' },
    ],
  },
  {
    id: 'IR-995060',
    category: 'Keypads',
    code: 'IR-995060',
    manufacturer: 'Inner Range',
    description: 'Inception Elite LCD Terminal',
    price: 495,
    wattage: 2,
    pcbSize: 'external',
    type: 'keypad',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
    ],
  },

  // ===== ENCLOSURES =====
  {
    id: 'ENC-SM3A',
    category: 'Enclosures',
    code: 'IR-995200',
    manufacturer: 'Inner Range',
    description: 'Small Enclosure with 3A PSU',
    price: 485,
    wattage: 0,
    psuRating: 36,
    batteryCapacity: '7Ah',
    size: 'small',
    type: 'enclosure',
    variants: [
      {
        name: 'Standard',
        slots: [
          { id: 'A1', size: 'A', x: 30, y: 25, w: 200, h: 140 },
          { id: 'B1', size: 'B', x: 240, y: 25, w: 150, h: 100 },
          { id: 'C1', size: 'C', x: 240, y: 135, w: 70, h: 70 },
          { id: 'PSU', size: 'C', x: 25, y: 200, w: 50, h: 70, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 90, y: 200, w: 180, h: 70, label: '7Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-MD3A',
    category: 'Enclosures',
    code: 'IR-995201',
    manufacturer: 'Inner Range',
    description: 'Medium Enclosure with 3A PSU',
    price: 685,
    wattage: 0,
    psuRating: 36,
    batteryCapacity: '9Ah',
    size: 'medium',
    type: 'enclosure',
    variants: [
      {
        name: 'Layout 1 (18Ah)',
        slots: [
          { id: 'A1', size: 'A', x: 25, y: 25, w: 110, h: 170 },
          { id: 'A2', size: 'A', x: 145, y: 25, w: 160, h: 170 },
          { id: 'C1', size: 'C', x: 25, y: 205, w: 110, h: 80 },
          { id: 'PSU', size: 'C', x: 25, y: 295, w: 50, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 90, y: 290, w: 215, h: 75, label: '18Ah Battery' },
        ],
      },
      {
        name: 'Layout 2 (9Ah)',
        slots: [
          { id: 'A1', size: 'A', x: 25, y: 25, w: 110, h: 170 },
          { id: 'A2', size: 'A', x: 145, y: 25, w: 160, h: 170 },
          { id: 'C1', size: 'C', x: 25, y: 205, w: 100, h: 80 },
          { id: 'B1', size: 'B', x: 140, y: 205, w: 165, h: 80 },
          { id: 'PSU', size: 'C', x: 25, y: 295, w: 50, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 90, y: 300, w: 155, h: 55, label: '9Ah Battery' },
        ],
      },
      {
        name: 'Layout 3 (Dense)',
        slots: [
          { id: 'C1', size: 'C', x: 25, y: 25, w: 105, h: 80 },
          { id: 'B1', size: 'B', x: 140, y: 25, w: 165, h: 80 },
          { id: 'C2', size: 'C', x: 25, y: 115, w: 105, h: 80 },
          { id: 'B2', size: 'B', x: 140, y: 115, w: 165, h: 80 },
          { id: 'C3', size: 'C', x: 25, y: 205, w: 85, h: 80 },
          { id: 'C4', size: 'C', x: 120, y: 205, w: 85, h: 80 },
          { id: 'C5', size: 'C', x: 215, y: 205, w: 85, h: 80 },
          { id: 'PSU', size: 'C', x: 25, y: 295, w: 50, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 90, y: 300, w: 155, h: 55, label: '9Ah Battery' },
        ],
      },
      {
        name: 'Layout 4 (Top-PSU)',
        slots: [
          { id: 'PSU', size: 'C', x: 25, y: 25, w: 50, h: 70, fixed: 'transformer' },
          { id: 'A1', size: 'A', x: 95, y: 25, w: 210, h: 170 },
          { id: 'C1', size: 'C', x: 25, y: 110, w: 60, h: 85 },
          { id: 'C2', size: 'C', x: 25, y: 205, w: 90, h: 80 },
          { id: 'C3', size: 'C', x: 125, y: 205, w: 90, h: 80 },
          { id: 'C4', size: 'C', x: 225, y: 205, w: 80, h: 80 },
          { id: 'BAT', size: 'battery', x: 95, y: 300, w: 210, h: 55, label: '9Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-MD8A',
    category: 'Enclosures',
    code: 'IR-995202',
    manufacturer: 'Inner Range',
    description: 'Medium Enclosure with 8A PSU',
    price: 895,
    wattage: 0,
    psuRating: 96,
    batteryCapacity: '18Ah',
    size: 'medium',
    type: 'enclosure',
    variants: [
      {
        name: 'Standard',
        slots: [
          { id: 'A1', size: 'A', x: 25, y: 25, w: 110, h: 170 },
          { id: 'A2', size: 'A', x: 145, y: 25, w: 160, h: 170 },
          { id: 'C1', size: 'C', x: 25, y: 205, w: 110, h: 80 },
          { id: 'PSU', size: 'C', x: 25, y: 295, w: 50, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 90, y: 290, w: 215, h: 75, label: '18Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-LG8A',
    category: 'Enclosures',
    code: 'IR-995203',
    manufacturer: 'Inner Range',
    description: 'Large Enclosure with 8A PSU',
    price: 1195,
    wattage: 0,
    psuRating: 96,
    batteryCapacity: '18Ah',
    size: 'large',
    type: 'enclosure',
    variants: [
      {
        name: 'LAN Access Control (8 Door)',
        slots: [
          { id: 'A1', size: 'A', x: 40, y: 30, w: 260, h: 100 },
          { id: 'B1', size: 'B', x: 40, y: 140, w: 260, h: 70 },
          { id: 'B2', size: 'B', x: 40, y: 220, w: 260, h: 70 },
          { id: 'B3', size: 'B', x: 40, y: 300, w: 260, h: 70 },
          { id: 'C1', size: 'C', x: 320, y: 30, w: 260, h: 90 },
          { id: 'C2', size: 'C', x: 320, y: 130, w: 260, h: 80 },
          { id: 'PSU', size: 'C', x: 40, y: 400, w: 50, h: 80, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 100, y: 400, w: 200, h: 80, label: '18Ah Battery' },
          { id: 'C3', size: 'C', x: 320, y: 220, w: 260, h: 170 },
          { id: 'C4', size: 'C', x: 320, y: 400, w: 260, h: 80 },
        ],
      },
      {
        name: 'Intrusion System',
        slots: [
          { id: 'A1', size: 'A', x: 40, y: 30, w: 260, h: 150 },
          { id: 'B1', size: 'B', x: 40, y: 190, w: 260, h: 80 },
          { id: 'C1', size: 'C', x: 320, y: 30, w: 80, h: 90 },
          { id: 'C2', size: 'C', x: 410, y: 30, w: 170, h: 90 },
          { id: 'C3', size: 'C', x: 320, y: 130, w: 260, h: 70 },
          { id: 'B2', size: 'B', x: 320, y: 210, w: 260, h: 80 },
          { id: 'C4', size: 'C', x: 40, y: 280, w: 260, h: 110 },
          { id: 'PSU', size: 'C', x: 40, y: 400, w: 50, h: 80, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 100, y: 400, w: 480, h: 80, label: '18Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-WB8A',
    category: 'Enclosures',
    code: 'IR-995204',
    manufacturer: 'Inner Range',
    description: 'Wide Body Enclosure with 8A PSU',
    price: 1485,
    wattage: 0,
    psuRating: 96,
    batteryCapacity: '18Ah',
    size: 'widebody',
    type: 'enclosure',
    variants: [
      {
        name: 'Full System',
        slots: [
          { id: 'A1', size: 'A', x: 30, y: 30, w: 220, h: 140 },
          { id: 'A2', size: 'A', x: 270, y: 30, w: 220, h: 140 },
          { id: 'B1', size: 'B', x: 30, y: 180, w: 220, h: 90 },
          { id: 'B2', size: 'B', x: 270, y: 180, w: 220, h: 90 },
          { id: 'B3', size: 'B', x: 510, y: 30, w: 180, h: 90 },
          { id: 'B4', size: 'B', x: 510, y: 130, w: 180, h: 90 },
          { id: 'C1', size: 'C', x: 30, y: 280, w: 100, h: 80 },
          { id: 'C2', size: 'C', x: 140, y: 280, w: 100, h: 80 },
          { id: 'C3', size: 'C', x: 250, y: 280, w: 100, h: 80 },
          { id: 'C4', size: 'C', x: 360, y: 280, w: 100, h: 80 },
          { id: 'C5', size: 'C', x: 470, y: 280, w: 100, h: 80 },
          { id: 'C6', size: 'C', x: 580, y: 280, w: 110, h: 80 },
          { id: 'PSU', size: 'C', x: 30, y: 430, w: 50, h: 80, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 100, y: 430, w: 280, h: 80, label: '18Ah Battery' },
          { id: 'C7', size: 'C', x: 400, y: 430, w: 290, h: 80 },
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
