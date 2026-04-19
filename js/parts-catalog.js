// Inner Range Integriti/Inception Parts Catalog - REAL CSD PART NUMBERS
// Updated with actual wattage, dimensions, and specifications

const PARTS_CATALOG = [
  // ===== ENCLOSURES (MUST SELECT ONE FIRST) =====
  {
    id: 'ENC-MEDIUM-3A',
    category: 'Enclosures',
    code: 'IR-995201PEI',
    manufacturer: 'Inner Range / WESCO',
    description: 'Integriti Medium Powered Enclosure with 3A Smart PSU',
    price: 1850.00,
    wattage: 36, // 3A @ 12V
    terminals: [],
    width: 460, height: 358, depth: 85,
    interiorWidth: 440, interiorHeight: 330, interiorDepth: 65,
    psuRating: 3, // Amps
    maxThermalDissipation: 45, // watts
    mountingPoints: 8,
    isEnclosure: true,
    layout: {
      psuPosition: { x: 50, y: 50, w: 120, h: 60 },
      batteryPosition: { x: 50, y: 120, w: 120, h: 80 },
      pcbSlots: [
        { label: 'PCB1', x: 200, y: 50, w: 180, h: 150 },
        { label: 'PCB2', x: 200, y: 210, w: 180, h: 150 },
      ],
    },
  },
  {
    id: 'ENC-MEDIUM-8A',
    category: 'Enclosures',
    code: 'IR-995201PE8',
    manufacturer: 'Inner Range / WESCO',
    description: 'Integriti Medium Powered Enclosure with 8A Smart PSU',
    price: 2150.00,
    wattage: 96, // 8A @ 12V
    terminals: [],
    width: 460, height: 358, depth: 85,
    interiorWidth: 440, interiorHeight: 330, interiorDepth: 65,
    psuRating: 8,
    maxThermalDissipation: 120,
    mountingPoints: 8,
    isEnclosure: true,
    layout: {
      psuPosition: { x: 50, y: 50, w: 120, h: 60 },
      batteryPosition: { x: 50, y: 120, w: 140, h: 100 },
      pcbSlots: [
        { label: 'PCB1', x: 200, y: 50, w: 180, h: 150 },
        { label: 'PCB2', x: 200, y: 210, w: 180, h: 150 },
      ],
    },
  },
  {
    id: 'ENC-LARGE-3A',
    category: 'Enclosures',
    code: 'IR-995203PEI',
    manufacturer: 'Inner Range / WESCO',
    description: 'Integriti Extra Large Powered Enclosure with 3A Smart PSU',
    price: 2350.00,
    wattage: 36,
    terminals: [],
    width: 702, height: 358, depth: 85,
    interiorWidth: 680, interiorHeight: 330, interiorDepth: 65,
    psuRating: 3,
    maxThermalDissipation: 45,
    mountingPoints: 12,
    isEnclosure: true,
    layout: {
      psuPosition: { x: 50, y: 50, w: 120, h: 60 },
      batteryPosition: { x: 50, y: 120, w: 120, h: 80 },
      pcbSlots: [
        { label: 'PCB1', x: 200, y: 50, w: 180, h: 150 },
        { label: 'PCB2', x: 420, y: 50, w: 180, h: 150 },
        { label: 'PCB3', x: 200, y: 210, w: 180, h: 150 },
        { label: 'PCB4', x: 420, y: 210, w: 180, h: 150 },
      ],
    },
  },
  {
    id: 'ENC-LARGE-8A',
    category: 'Enclosures',
    code: 'IR-995203PE8',
    manufacturer: 'Inner Range / WESCO',
    description: 'Integriti Extra Large Powered Enclosure with 8A Smart PSU',
    price: 2650.00,
    wattage: 96,
    terminals: [],
    width: 702, height: 358, depth: 85,
    interiorWidth: 680, interiorHeight: 330, interiorDepth: 65,
    psuRating: 8,
    maxThermalDissipation: 120,
    mountingPoints: 12,
    isEnclosure: true,
    layout: {
      psuPosition: { x: 50, y: 50, w: 120, h: 60 },
      batteryPosition: { x: 50, y: 120, w: 140, h: 100 },
      pcbSlots: [
        { label: 'PCB1', x: 200, y: 50, w: 180, h: 150 },
        { label: 'PCB2', x: 420, y: 50, w: 180, h: 150 },
        { label: 'PCB3', x: 200, y: 210, w: 180, h: 150 },
        { label: 'PCB4', x: 420, y: 210, w: 180, h: 150 },
      ],
    },
  },
  {
    id: 'ENC-WIDEBODY-3A',
    category: 'Enclosures',
    code: 'IR-995204PE3',
    manufacturer: 'Inner Range / WESCO',
    description: 'Integriti WideBody Powered Enclosure with 3A Smart PSU',
    price: 2450.00,
    wattage: 36,
    terminals: [],
    width: 800, height: 300, depth: 85,
    interiorWidth: 760, interiorHeight: 270, interiorDepth: 65,
    psuRating: 3,
    maxThermalDissipation: 45,
    mountingPoints: 10,
    isEnclosure: true,
    layout: {
      psuPosition: { x: 30, y: 30, w: 120, h: 50 },
      batteryPosition: { x: 30, y: 95, w: 120, h: 70 },
      pcbSlots: [
        { label: 'PCB1', x: 170, y: 30, w: 170, h: 130 },
        { label: 'PCB2', x: 360, y: 30, w: 170, h: 130 },
        { label: 'PCB3', x: 550, y: 30, w: 170, h: 130 },
      ],
    },
  },
  {
    id: 'ENC-WIDEBODY-8A',
    category: 'Enclosures',
    code: 'IR-995204PE8',
    manufacturer: 'Inner Range / WESCO',
    description: 'Integriti WideBody Powered Enclosure with 8A Smart PSU',
    price: 2750.00,
    wattage: 96,
    terminals: [],
    width: 800, height: 300, depth: 85,
    interiorWidth: 760, interiorHeight: 270, interiorDepth: 65,
    psuRating: 8,
    maxThermalDissipation: 120,
    mountingPoints: 10,
    isEnclosure: true,
    layout: {
      psuPosition: { x: 30, y: 30, w: 120, h: 50 },
      batteryPosition: { x: 30, y: 95, w: 140, h: 85 },
      pcbSlots: [
        { label: 'PCB1', x: 185, y: 30, w: 170, h: 130 },
        { label: 'PCB2', x: 375, y: 30, w: 170, h: 130 },
        { label: 'PCB3', x: 565, y: 30, w: 170, h: 130 },
      ],
    },
  },

  // ===== CONTROLLERS =====
  {
    id: 'ISC',
    category: 'Controllers',
    code: 'IR-996001PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti Security Controller (ISC)',
    price: 2450.00,
    wattage: 8,
    terminals: [
      { name: '+12V', x: 20, y: 60, type: 'power' },
      { name: 'GND', x: 20, y: 100, type: 'power' },
      { name: 'RX+', x: 20, y: 140, type: 'serial' },
      { name: 'RX-', x: 20, y: 180, type: 'serial' },
      { name: 'TX+', x: 20, y: 220, type: 'serial' },
      { name: 'TX-', x: 20, y: 260, type: 'serial' },
      { name: 'REL1NC', x: 100, y: 60, type: 'relay' },
      { name: 'REL1C', x: 100, y: 100, type: 'relay' },
      { name: 'REL1NO', x: 100, y: 140, type: 'relay' },
      { name: 'REL2NC', x: 100, y: 180, type: 'relay' },
      { name: 'REL2C', x: 100, y: 220, type: 'relay' },
      { name: 'REL2NO', x: 100, y: 260, type: 'relay' },
      { name: 'IN1', x: 20, y: 300, type: 'input' },
      { name: 'IN2', x: 20, y: 340, type: 'input' },
      { name: 'IN3', x: 100, y: 300, type: 'input' },
      { name: 'IN4', x: 100, y: 340, type: 'input' },
    ],
    width: 120, height: 360,
    physWidth: 160, physHeight: 100, physDepth: 25,
  },
  {
    id: 'IAC',
    category: 'Controllers',
    code: 'IR-996035PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti Access Controller (IAC)',
    price: 1950.00,
    wattage: 6,
    terminals: [
      { name: '+12V', x: 20, y: 60, type: 'power' },
      { name: 'GND', x: 20, y: 100, type: 'power' },
      { name: 'ETH1', x: 20, y: 140, type: 'serial' },
      { name: 'ETH2', x: 20, y: 180, type: 'serial' },
      { name: 'RS485+', x: 20, y: 220, type: 'serial' },
      { name: 'RS485-', x: 20, y: 260, type: 'serial' },
      { name: 'REL1NC', x: 100, y: 60, type: 'relay' },
      { name: 'REL1C', x: 100, y: 100, type: 'relay' },
      { name: 'REL1NO', x: 100, y: 140, type: 'relay' },
      { name: 'REL2NC', x: 100, y: 180, type: 'relay' },
      { name: 'REL2C', x: 100, y: 220, type: 'relay' },
      { name: 'REL2NO', x: 100, y: 260, type: 'relay' },
    ],
    width: 120, height: 300,
    physWidth: 180, physHeight: 120, physDepth: 30,
  },
  {
    id: 'EXPRESS',
    category: 'Controllers',
    code: 'IR-996905',
    manufacturer: 'Inner Range',
    description: 'Integriti Express Controller (WiFi)',
    price: 1650.00,
    wattage: 7,
    terminals: [
      { name: '+12V', x: 20, y: 60, type: 'power' },
      { name: 'GND', x: 20, y: 100, type: 'power' },
      { name: 'WiFi', x: 20, y: 140, type: 'network' },
      { name: 'RS485+', x: 20, y: 180, type: 'serial' },
      { name: 'RS485-', x: 20, y: 220, type: 'serial' },
    ],
    width: 100, height: 260,
    physWidth: 140, physHeight: 80, physDepth: 20,
  },

  // ===== MODULES =====
  {
    id: 'ILAM',
    category: 'Expansion Modules',
    code: 'IR-996018PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti Intelligent LAN Access Module (ILAM)',
    price: 1850.00,
    wattage: 12,
    terminals: [
      { name: '+12V', x: 20, y: 50, type: 'power' },
      { name: 'GND', x: 20, y: 90, type: 'power' },
      { name: 'ETH+', x: 20, y: 130, type: 'network' },
      { name: 'ETH-', x: 20, y: 170, type: 'network' },
      { name: 'R1+', x: 20, y: 210, type: 'reader' },
      { name: 'R1-', x: 20, y: 250, type: 'reader' },
      { name: 'R2+', x: 100, y: 210, type: 'reader' },
      { name: 'R2-', x: 100, y: 250, type: 'reader' },
    ],
    width: 120, height: 280,
    physWidth: 160, physHeight: 100, physDepth: 25,
  },
  {
    id: 'LANACC',
    category: 'Expansion Modules',
    code: 'IR-996012PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti Standard LAN Access Module',
    price: 1450.00,
    wattage: 10,
    terminals: [
      { name: '+12V', x: 20, y: 50, type: 'power' },
      { name: 'GND', x: 20, y: 90, type: 'power' },
      { name: 'ETH+', x: 20, y: 130, type: 'network' },
      { name: 'ETH-', x: 20, y: 170, type: 'network' },
      { name: 'R1+', x: 20, y: 210, type: 'reader' },
      { name: 'R1-', x: 20, y: 250, type: 'reader' },
    ],
    width: 120, height: 280,
    physWidth: 160, physHeight: 90, physDepth: 25,
  },
  {
    id: 'IOEXP',
    category: 'Expansion Modules',
    code: 'IR-996005PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti 8 Input 2 Relay I/O Expander',
    price: 850.00,
    wattage: 5,
    terminals: [
      { name: '+12V', x: 20, y: 50, type: 'power' },
      { name: 'GND', x: 20, y: 90, type: 'power' },
      { name: 'RX+', x: 20, y: 130, type: 'serial' },
      { name: 'RX-', x: 20, y: 170, type: 'serial' },
      { name: 'TX+', x: 20, y: 210, type: 'serial' },
      { name: 'TX-', x: 20, y: 250, type: 'serial' },
      { name: 'REL1C', x: 100, y: 50, type: 'relay' },
      { name: 'REL1NO', x: 100, y: 90, type: 'relay' },
      { name: 'REL2C', x: 100, y: 130, type: 'relay' },
      { name: 'REL2NO', x: 100, y: 170, type: 'relay' },
    ],
    width: 120, height: 280,
    physWidth: 140, physHeight: 85, physDepth: 20,
  },

  // ===== READERS =====
  {
    id: 'SIFER',
    category: 'Card Readers',
    code: 'IR-994720',
    manufacturer: 'Inner Range',
    description: 'Integriti SIFER Smart Card Reader (Proximity/HID/Mag)',
    price: 585.00,
    wattage: 2,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'RX+', x: 20, y: 120, type: 'reader' },
      { name: 'RX-', x: 20, y: 160, type: 'reader' },
    ],
    width: 80, height: 180,
    physWidth: 110, physHeight: 110, physDepth: 35,
  },
  {
    id: 'SIFER-KP',
    category: 'Card Readers',
    code: 'IR-994725',
    manufacturer: 'Inner Range',
    description: 'Integriti SIFER Keypad Reader (8-button + Prox)',
    price: 425.00,
    wattage: 1.5,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'RX+', x: 20, y: 120, type: 'reader' },
      { name: 'RX-', x: 20, y: 160, type: 'reader' },
    ],
    width: 80, height: 180,
    physWidth: 100, physHeight: 100, physDepth: 30,
  },
  {
    id: 'T4000',
    category: 'Card Readers',
    code: 'IR-996795',
    manufacturer: 'Inner Range',
    description: 'Integriti T4000 Multi-Tech Reader (Prox/Mag/Smart Card)',
    price: 725.00,
    wattage: 3,
    terminals: [
      { name: '+12V', x: 20, y: 40, type: 'power' },
      { name: 'GND', x: 20, y: 80, type: 'power' },
      { name: 'DATA+', x: 20, y: 120, type: 'reader' },
      { name: 'DATA-', x: 20, y: 160, type: 'reader' },
    ],
    width: 80, height: 180,
    physWidth: 120, physHeight: 120, physDepth: 40,
  },

  // ===== POWER SUPPLIES =====
  {
    id: 'PSU-3A',
    category: 'Power Supplies',
    code: 'IR-996091PCB&K',
    manufacturer: 'Inner Range',
    description: 'Integriti 3A Smart Power Supply (Regulated)',
    price: 485.00,
    wattage: 3, // 3A nominal at 12V = ~36W input, lower at 12V
    terminals: [
      { name: 'AC IN', x: 20, y: 40, type: 'power' },
      { name: 'AC IN', x: 20, y: 80, type: 'power' },
      { name: '+12V', x: 80, y: 40, type: 'power' },
      { name: 'GND', x: 80, y: 80, type: 'power' },
      { name: 'BAT+', x: 80, y: 120, type: 'power' },
      { name: 'BAT-', x: 80, y: 160, type: 'power' },
    ],
    width: 100, height: 180,
    physWidth: 180, physHeight: 100, physDepth: 60,
    psuRating: 3,
  },
  {
    id: 'PSU-8A',
    category: 'Power Supplies',
    code: 'IR-996092',
    manufacturer: 'Inner Range',
    description: 'Integriti 8A Smart Power Supply (Regulated)',
    price: 725.00,
    wattage: 8,
    terminals: [
      { name: 'AC IN', x: 20, y: 40, type: 'power' },
      { name: 'AC IN', x: 20, y: 80, type: 'power' },
      { name: '+12V', x: 80, y: 40, type: 'power' },
      { name: 'GND', x: 80, y: 80, type: 'power' },
      { name: 'BAT+', x: 80, y: 120, type: 'power' },
      { name: 'BAT-', x: 80, y: 160, type: 'power' },
    ],
    width: 100, height: 180,
    physWidth: 200, physHeight: 120, physDepth: 70,
    psuRating: 8,
  },

  // ===== CABLES =====
  {
    id: 'CAB-6C',
    category: 'Cables',
    code: 'CAB-6C-100M',
    manufacturer: 'CSD',
    description: '6-core 0.22mm Security Cable (100m)',
    price: 165.00,
    wattage: 0,
    terminals: [],
    width: 40, height: 40,
    physWidth: 0, physHeight: 0, physDepth: 0,
  },
  {
    id: 'CAB-4C',
    category: 'Cables',
    code: 'CAB-4C-100M',
    manufacturer: 'CSD',
    description: '4-core 0.22mm Security Cable (100m)',
    price: 115.00,
    wattage: 0,
    terminals: [],
    width: 40, height: 40,
    physWidth: 0, physHeight: 0, physDepth: 0,
  },
  {
    id: 'CAB-CAT6',
    category: 'Cables',
    code: 'CAB-CAT6-100M',
    manufacturer: 'CSD',
    description: 'CAT6 UTP Network Cable (100m)',
    price: 225.00,
    wattage: 0,
    terminals: [],
    width: 40, height: 40,
    physWidth: 0, physHeight: 0, physDepth: 0,
  },
];

function getPartsByCategory(category) {
  return PARTS_CATALOG.filter(p => p.category === category);
}

function getCategories() {
  return [...new Set(PARTS_CATALOG.map(p => p.category))].sort();
}

function getPartById(id) {
  return PARTS_CATALOG.find(p => p.id === id);
}

function searchParts(query) {
  const q = query.toLowerCase();
  return PARTS_CATALOG.filter(p =>
    p.code?.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q) ||
    p.category?.toLowerCase().includes(q)
  );
}

function getEnclosures() {
  return PARTS_CATALOG.filter(p => p.isEnclosure === true);
}

function calculateTotalPower(components) {
  return components.reduce((sum, comp) => {
    const part = getPartById(comp.partId);
    return sum + (part?.wattage || 0);
  }, 0);
}
