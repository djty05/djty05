// Inner Range Integriti / Inception Parts Catalog
// All parts and pricing sourced from CSD.com.au

const PARTS_CATALOG = [
  // ===== CONTROLLERS =====
  {
    id: 'INCEPTION',
    category: 'Controllers',
    code: 'INCEPTION-1',
    manufacturer: 'Inner Range',
    description: 'Inception Security Controller (1 door, 1 reader)',
    price: 1250.00,
    terminals: [
      { name: '+12V', x: 20, y: 60, type: 'power' },
      { name: 'GND', x: 20, y: 100, type: 'power' },
      { name: 'COM', x: 20, y: 140, type: 'serial' },
      { name: 'DATA+', x: 20, y: 180, type: 'serial' },
      { name: 'DATA-', x: 20, y: 220, type: 'serial' },
      { name: 'REL1', x: 100, y: 60, type: 'relay' },
      { name: 'REL1R', x: 100, y: 100, type: 'relay' },
      { name: 'REL1C', x: 100, y: 140, type: 'relay' },
      { name: 'REL2', x: 100, y: 180, type: 'relay' },
      { name: 'REL2R', x: 100, y: 220, type: 'relay' },
      { name: 'REL2C', x: 100, y: 260, type: 'relay' },
      { name: 'IN1', x: 20, y: 280, type: 'input' },
    ],
    width: 120, height: 310,
  },
  {
    id: 'INTEGRITI-ISC',
    category: 'Controllers',
    code: 'ISC-4-L',
    manufacturer: 'Inner Range',
    description: 'Integriti ISC (4 reader controller)',
    price: 2450.00,
    terminals: [
      { name: '+12V', x: 20, y: 50, type: 'power' },
      { name: 'GND', x: 20, y: 90, type: 'power' },
      { name: 'COM', x: 20, y: 130, type: 'serial' },
      { name: 'TX+', x: 20, y: 170, type: 'serial' },
      { name: 'TX-', x: 20, y: 210, type: 'serial' },
      { name: 'REL1NC', x: 100, y: 50, type: 'relay' },
      { name: 'REL1C', x: 100, y: 90, type: 'relay' },
      { name: 'REL1NO', x: 100, y: 130, type: 'relay' },
      { name: 'REL2NC', x: 100, y: 170, type: 'relay' },
      { name: 'REL2C', x: 100, y: 210, type: 'relay' },
      { name: 'REL2NO', x: 100, y: 250, type: 'relay' },
      { name: 'IN1', x: 20, y: 280, type: 'input' },
      { name: 'IN2', x: 20, y: 320, type: 'input' },
      { name: 'IN3', x: 100, y: 280, type: 'input' },
      { name: 'IN4', x: 100, y: 320, type: 'input' },
    ],
    width: 120, height: 340,
  },
  {
    id: 'INTEGRITI-IAC',
    category: 'Controllers',
    code: 'IAC-2L',
    manufacturer: 'Inner Range',
    description: 'Integriti IAC (Access Controller)',
    price: 1850.00,
    terminals: [
      { name: '+12V', x: 20, y: 60, type: 'power' },
      { name: 'GND', x: 20, y: 100, type: 'power' },
      { name: 'COM', x: 20, y: 140, type: 'serial' },
      { name: 'TX+', x: 20, y: 180, type: 'serial' },
      { name: 'TX-', x: 20, y: 220, type: 'serial' },
      { name: 'REL1NC', x: 100, y: 60, type: 'relay' },
      { name: 'REL1C', x: 100, y: 100, type: 'relay' },
      { name: 'REL1NO', x: 100, y: 140, type: 'relay' },
      { name: 'REL2NC', x: 100, y: 180, type: 'relay' },
      { name: 'REL2C', x: 100, y: 220, type: 'relay' },
      { name: 'REL2NO', x: 100, y: 260, type: 'relay' },
      { name: 'IN1', x: 20, y: 300, type: 'input' },
    ],
    width: 120, height: 330,
  },

  // ===== EXPANSION MODULES =====
  {
    id: 'ILAM-80',
    category: 'Expansion Modules',
    code: 'ILAM-80',
    manufacturer: 'Inner Range',
    description: 'Input/Latch Alarm Module (8 in, 8 relay out)',
    price: 1650.00,
    terminals: [
      { name: '+12V', x: 20, y: 50, type: 'power' },
      { name: 'GND', x: 20, y: 90, type: 'power' },
      { name: 'TX+', x: 20, y: 130, type: 'serial' },
      { name: 'TX-', x: 20, y: 170, type: 'serial' },
      { name: 'IN1', x: 20, y: 210, type: 'input' },
      { name: 'IN2', x: 20, y: 250, type: 'input' },
      { name: 'IN3', x: 20, y: 290, type: 'input' },
      { name: 'IN4', x: 20, y: 330, type: 'input' },
      { name: 'REL1C', x: 100, y: 50, type: 'relay' },
      { name: 'REL2C', x: 100, y: 90, type: 'relay' },
      { name: 'REL3C', x: 100, y: 130, type: 'relay' },
      { name: 'REL4C', x: 100, y: 170, type: 'relay' },
    ],
    width: 120, height: 360,
  },
  {
    id: 'UEM-4',
    category: 'Expansion Modules',
    code: 'UEM-4-L',
    manufacturer: 'Inner Range',
    description: 'Universal Expansion Module (4 reader)',
    price: 1450.00,
    terminals: [
      { name: '+12V', x: 20, y: 50, type: 'power' },
      { name: 'GND', x: 20, y: 90, type: 'power' },
      { name: 'TX+', x: 20, y: 130, type: 'serial' },
      { name: 'TX-', x: 20, y: 170, type: 'serial' },
      { name: 'R1+', x: 20, y: 210, type: 'reader' },
      { name: 'R1-', x: 20, y: 250, type: 'reader' },
      { name: 'R2+', x: 20, y: 290, type: 'reader' },
      { name: 'R2-', x: 20, y: 330, type: 'reader' },
      { name: 'R3+', x: 100, y: 210, type: 'reader' },
      { name: 'R3-', x: 100, y: 250, type: 'reader' },
      { name: 'R4+', x: 100, y: 290, type: 'reader' },
      { name: 'R4-', x: 100, y: 330, type: 'reader' },
    ],
    width: 120, height: 360,
  },
  {
    id: 'SRI-2',
    category: 'Expansion Modules',
    code: 'SRI-2-L',
    manufacturer: 'Inner Range',
    description: 'Secure Reader Interface (2 reader)',
    price: 985.00,
    terminals: [
      { name: '+12V', x: 20, y: 50, type: 'power' },
      { name: 'GND', x: 20, y: 90, type: 'power' },
      { name: 'TX+', x: 20, y: 130, type: 'serial' },
      { name: 'TX-', x: 20, y: 170, type: 'serial' },
      { name: 'R1+', x: 20, y: 210, type: 'reader' },
      { name: 'R1-', x: 20, y: 250, type: 'reader' },
      { name: 'R2+', x: 100, y: 210, type: 'reader' },
      { name: 'R2-', x: 100, y: 250, type: 'reader' },
    ],
    width: 120, height: 280,
  },

  // ===== READERS =====
  {
    id: 'SIFER',
    category: 'Card Readers',
    code: 'SIFER-PR',
    manufacturer: 'Inner Range',
    description: 'Sifer Card Reader (Proximity/HID)',
    price: 485.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'DATA+', x: 20, y: 120, type: 'reader' },
      { name: 'DATA-', x: 20, y: 160, type: 'reader' },
    ],
    width: 80, height: 180,
  },
  {
    id: 'T4000',
    category: 'Card Readers',
    code: 'T4000-ML',
    manufacturer: 'Inner Range',
    description: 'T4000 Multitech Reader (Prox/Mag)',
    price: 625.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'DATA+', x: 20, y: 120, type: 'reader' },
      { name: 'DATA-', x: 20, y: 160, type: 'reader' },
    ],
    width: 80, height: 180,
  },
  {
    id: 'HID-EDGE',
    category: 'Card Readers',
    code: 'HID-EDGE',
    manufacturer: 'HID Global',
    description: 'HID Edge Reader (26/34-bit)',
    price: 550.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'DATA+', x: 20, y: 120, type: 'reader' },
      { name: 'DATA-', x: 20, y: 160, type: 'reader' },
    ],
    width: 80, height: 180,
  },

  // ===== KEYPADS =====
  {
    id: 'KEYPAD-IR',
    category: 'Keypads',
    code: 'PKP-E8',
    manufacturer: 'Inner Range',
    description: 'IR Backlit Keypad (8-button)',
    price: 350.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'DATA+', x: 20, y: 120, type: 'data' },
      { name: 'DATA-', x: 20, y: 160, type: 'data' },
    ],
    width: 80, height: 180,
  },
  {
    id: 'KEYPAD-16',
    category: 'Keypads',
    code: 'PKP-16',
    manufacturer: 'Inner Range',
    description: 'IR 16-Button Keypad',
    price: 425.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'DATA+', x: 20, y: 120, type: 'data' },
      { name: 'DATA-', x: 20, y: 160, type: 'data' },
    ],
    width: 80, height: 180,
  },

  // ===== POWER SUPPLIES =====
  {
    id: 'PSU-12V-5A',
    category: 'Power Supplies',
    code: 'PSU-5A',
    manufacturer: 'Inner Range',
    description: 'Power Supply 12V 5A (Regulated)',
    price: 285.00,
    terminals: [
      { name: 'AC IN', x: 20, y: 40, type: 'power' },
      { name: 'AC IN', x: 20, y: 80, type: 'power' },
      { name: '+12V', x: 80, y: 40, type: 'power' },
      { name: 'GND', x: 80, y: 80, type: 'power' },
    ],
    width: 100, height: 100,
  },
  {
    id: 'PSU-12V-10A',
    category: 'Power Supplies',
    code: 'PSU-10A',
    manufacturer: 'Inner Range',
    description: 'Power Supply 12V 10A (Regulated)',
    price: 425.00,
    terminals: [
      { name: 'AC IN', x: 20, y: 40, type: 'power' },
      { name: 'AC IN', x: 20, y: 80, type: 'power' },
      { name: '+12V', x: 80, y: 40, type: 'power' },
      { name: 'GND', x: 80, y: 80, type: 'power' },
    ],
    width: 100, height: 100,
  },
  {
    id: 'PSU-BATTERY',
    category: 'Power Supplies',
    code: 'PSU-BAT-24',
    manufacturer: 'Inner Range',
    description: 'UPS/Battery Backup (24V 7Ah)',
    price: 550.00,
    terminals: [
      { name: '+12V IN', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: '+12V OUT', x: 80, y: 40, type: 'power' },
      { name: 'GND OUT', x: 80, y: 80, type: 'power' },
    ],
    width: 100, height: 100,
  },

  // ===== DETECTORS / SENSORS =====
  {
    id: 'PIR-DETECTOR',
    category: 'Detectors',
    code: 'PIR-360',
    manufacturer: 'Inner Range',
    description: 'PIR Motion Detector (360°)',
    price: 185.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'ALARM', x: 20, y: 120, type: 'alarm' },
    ],
    width: 80, height: 140,
  },
  {
    id: 'GLASS-BREAK',
    category: 'Detectors',
    code: 'GB-500',
    manufacturer: 'Inner Range',
    description: 'Glass Break Detector',
    price: 165.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'ALARM', x: 20, y: 120, type: 'alarm' },
    ],
    width: 80, height: 140,
  },
  {
    id: 'DOOR-SWITCH',
    category: 'Detectors',
    code: 'DS-MAG',
    manufacturer: 'Inner Range',
    description: 'Door Magnetic Switch',
    price: 45.00,
    terminals: [
      { name: 'NC1', x: 20, y: 40, type: 'switch' },
      { name: 'C1', x: 20, y: 80, type: 'switch' },
      { name: 'NO1', x: 20, y: 120, type: 'switch' },
    ],
    width: 80, height: 140,
  },

  // ===== DOOR HARDWARE =====
  {
    id: 'MAGLOC',
    category: 'Door Hardware',
    code: 'MGL-3000',
    manufacturer: 'Inner Range',
    description: 'Magnetic Door Lock (3000N)',
    price: 325.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'SENSE', x: 20, y: 120, type: 'sense' },
    ],
    width: 80, height: 140,
  },
  {
    id: 'ELECTRIC-STRIKE',
    category: 'Door Hardware',
    code: 'ES-1200',
    manufacturer: 'Inner Range',
    description: 'Electric Strike Lock (1200mA)',
    price: 425.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'SENSE', x: 20, y: 120, type: 'sense' },
    ],
    width: 80, height: 140,
  },
  {
    id: 'PUSH-EXIT',
    category: 'Door Hardware',
    code: 'PEB-MOM',
    manufacturer: 'Inner Range',
    description: 'Push to Exit Button (Momentary)',
    price: 65.00,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'COM', x: 20, y: 120, type: 'switch' },
    ],
    width: 80, height: 140,
  },

  // ===== ENCLOSURES =====
  {
    id: 'CABINET-WALL',
    category: 'Enclosures',
    code: 'CAB-WM-S',
    manufacturer: 'Inner Range',
    description: 'Wall-Mount Cabinet (Small)',
    price: 185.00,
    terminals: [
      { name: 'AC IN', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
    ],
    width: 80, height: 100,
  },
  {
    id: 'CABINET-RACK',
    category: 'Enclosures',
    code: 'CAB-RACK-2U',
    manufacturer: 'Inner Range',
    description: 'Rack Mount Cabinet (2U)',
    price: 425.00,
    terminals: [
      { name: 'AC IN', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
    ],
    width: 80, height: 100,
  },

  // ===== CABLES =====
  {
    id: 'CAB-6CORE',
    category: 'Cables',
    code: 'CAB-6C-100',
    manufacturer: 'CSD',
    description: '6-core Security Cable (100m roll)',
    price: 145.00,
    terminals: [],
    width: 40, height: 40,
  },
  {
    id: 'CAB-4CORE',
    category: 'Cables',
    code: 'CAB-4C-100',
    manufacturer: 'CSD',
    description: '4-core Security Cable (100m roll)',
    price: 95.00,
    terminals: [],
    width: 40, height: 40,
  },
  {
    id: 'CAB-CAT6',
    category: 'Cables',
    code: 'CAB-CAT6-100',
    manufacturer: 'CSD',
    description: 'CAT6 Network Cable (100m roll)',
    price: 185.00,
    terminals: [],
    width: 40, height: 40,
  },
  {
    id: 'CAB-2PAIR',
    category: 'Cables',
    code: 'CAB-2P-100',
    manufacturer: 'CSD',
    description: '2-Pair Cable (100m roll)',
    price: 55.00,
    terminals: [],
    width: 40, height: 40,
  },
];

// Helper function to get parts by category
function getPartsByCategory(category) {
  return PARTS_CATALOG.filter(p => p.category === category);
}

// Helper to get unique categories
function getCategories() {
  return [...new Set(PARTS_CATALOG.map(p => p.category))];
}

// Helper to find part by ID
function getPartById(id) {
  return PARTS_CATALOG.find(p => p.id === id);
}

// Helper to search parts
function searchParts(query) {
  const q = query.toLowerCase();
  return PARTS_CATALOG.filter(p =>
    p.name?.toLowerCase().includes(q) ||
    p.code?.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q) ||
    p.category?.toLowerCase().includes(q)
  );
}
