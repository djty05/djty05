// Inner Range Parts Catalog with REAL Inner Range Enclosure Dimensions
// XL Enclosure spec confirmed: 700mm Length x 358mm Width x 83mm Depth
// Allow 20mm at bottom for mains cable entry

const PARTS_CATALOG = [
  // ===== CONTROLLERS (PCB Size A - SQUARE 160x160mm) =====
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

  // ===== EXPANSION MODULES (PCB Size B - 160x80mm or 80x160mm) =====
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

  // ===== POWER (PCB Size C - SMALL 80x60mm) =====
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

  // ===== READERS (external) =====
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

  // ===== LOCKS & HARDWARE (external) =====
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

  // ============================================
  // ENCLOSURES - REAL Inner Range Specifications
  // ============================================
  // XL CONFIRMED SPEC: 700mm length × 358mm width × 83mm depth
  // PCB Sizes (real): A=160×160mm, B=160×80mm, C=80×60mm
  // Battery 9Ah: ~150×65mm | Battery 18Ah: ~180×80mm
  // Transformer: ~80×80mm
  // Bottom 20mm reserved for mains cable entry
  // ============================================

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
    width_mm: 380,
    height_mm: 280,
    portrait_width_mm: 280,
    portrait_height_mm: 380,
    type: 'enclosure',
    variants: [
      {
        name: 'Vertical B + A',
        // Landscape 380×280: top component zone 0-200, bottom shelf 200-280
        slots: [
          { id: 'B1', size: 'B', x: 15, y: 15, w: 80, h: 160 },
          { id: 'A1', size: 'A', x: 105, y: 15, w: 160, h: 160 },
          { id: 'C1', size: 'C', x: 275, y: 15, w: 90, h: 60 },
          { id: 'C2', size: 'C', x: 275, y: 85, w: 90, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 200, w: 80, h: 65, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 200, w: 260, h: 65, label: '9Ah Battery' },
        ],
        // Portrait 280×380: top component zone 0-300, bottom shelf 300-380
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'B1', size: 'B', x: 185, y: 15, w: 80, h: 160 },
          { id: 'B2', size: 'B', x: 15, y: 185, w: 160, h: 80 },
          { id: 'C1', size: 'C', x: 185, y: 185, w: 80, h: 60 },
          { id: 'C2', size: 'C', x: 185, y: 250, w: 80, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 300, w: 80, h: 65, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 300, w: 160, h: 65, label: '9Ah Battery' },
        ],
      },
      {
        name: 'Dense Modules',
        slots: [
          { id: 'B1', size: 'B', x: 15, y: 15, w: 160, h: 80 },
          { id: 'B2', size: 'B', x: 185, y: 15, w: 160, h: 80 },
          { id: 'B3', size: 'B', x: 15, y: 105, w: 160, h: 80 },
          { id: 'B4', size: 'B', x: 185, y: 105, w: 160, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 200, w: 80, h: 65, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 200, w: 260, h: 65, label: '9Ah Battery' },
        ],
        portraitSlots: [
          { id: 'B1', size: 'B', x: 15, y: 15, w: 250, h: 80 },
          { id: 'B2', size: 'B', x: 15, y: 105, w: 250, h: 80 },
          { id: 'B3', size: 'B', x: 15, y: 195, w: 250, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 300, w: 80, h: 65, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 300, w: 160, h: 65, label: '9Ah Battery' },
        ],
      },
      {
        name: 'Controller + C',
        slots: [
          { id: 'A1', size: 'A', x: 105, y: 15, w: 160, h: 160 },
          { id: 'C1', size: 'C', x: 15, y: 15, w: 80, h: 60 },
          { id: 'C2', size: 'C', x: 15, y: 85, w: 80, h: 60 },
          { id: 'C3', size: 'C', x: 275, y: 15, w: 90, h: 60 },
          { id: 'C4', size: 'C', x: 275, y: 85, w: 90, h: 60 },
          { id: 'C5', size: 'C', x: 105, y: 185, w: 80, h: 60 },
          { id: 'C6', size: 'C', x: 195, y: 185, w: 80, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 200, w: 80, h: 65, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 285, y: 200, w: 80, h: 65, label: '9Ah' },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'C1', size: 'C', x: 185, y: 15, w: 80, h: 60 },
          { id: 'C2', size: 'C', x: 185, y: 85, w: 80, h: 60 },
          { id: 'C3', size: 'C', x: 15, y: 185, w: 80, h: 60 },
          { id: 'C4', size: 'C', x: 105, y: 185, w: 80, h: 60 },
          { id: 'C5', size: 'C', x: 195, y: 185, w: 70, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 300, w: 80, h: 65, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 300, w: 160, h: 65, label: '9Ah Battery' },
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
    width_mm: 480,
    height_mm: 320,
    portrait_width_mm: 320,
    portrait_height_mm: 480,
    type: 'enclosure',
    variants: [
      {
        name: 'Vertical B + A (18Ah)',
        // Landscape 480×320: top zone 0-205, bottom shelf 205-320 (taller for 18Ah)
        slots: [
          { id: 'B1', size: 'B', x: 15, y: 15, w: 80, h: 160 },
          { id: 'A1', size: 'A', x: 105, y: 15, w: 160, h: 160 },
          { id: 'A2', size: 'A', x: 275, y: 15, w: 160, h: 160 },
          { id: 'C1', size: 'C', x: 105, y: 185, w: 80, h: 60 },
          { id: 'C2', size: 'C', x: 195, y: 185, w: 80, h: 60 },
          { id: 'C3', size: 'C', x: 285, y: 185, w: 80, h: 60 },
          { id: 'C4', size: 'C', x: 375, y: 185, w: 60, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 220, w: 80, h: 85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 250, w: 360, h: 55, label: '18Ah Battery' },
        ],
        // Portrait 320×480: top zone 0-405, bottom shelf 405-480
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'B1', size: 'B', x: 185, y: 15, w: 80, h: 160 },
          { id: 'A2', size: 'A', x: 15, y: 185, w: 160, h: 160 },
          { id: 'C1', size: 'C', x: 185, y: 185, w: 80, h: 60 },
          { id: 'C2', size: 'C', x: 185, y: 255, w: 80, h: 60 },
          { id: 'C3', size: 'C', x: 15, y: 355, w: 80, h: 60 },
          { id: 'C4', size: 'C', x: 105, y: 355, w: 80, h: 60 },
          { id: 'C5', size: 'C', x: 195, y: 355, w: 70, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 420, w: 80, h: 55, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 420, w: 160, h: 55, label: '18Ah Battery' },
        ],
      },
      {
        name: 'Dense Layout',
        slots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'A2', size: 'A', x: 185, y: 15, w: 160, h: 160 },
          { id: 'B1', size: 'B', x: 355, y: 15, w: 110, h: 80 },
          { id: 'B2', size: 'B', x: 355, y: 105, w: 110, h: 80 },
          { id: 'B3', size: 'B', x: 15, y: 185, w: 160, h: 60 },
          { id: 'B4', size: 'B', x: 185, y: 185, w: 160, h: 60 },
          { id: 'C1', size: 'C', x: 355, y: 195, w: 110, h: 50 },
          { id: 'PSU', size: 'C', x: 15, y: 255, w: 80, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 255, w: 360, h: 60, label: '18Ah Battery' },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'B1', size: 'B', x: 185, y: 15, w: 80, h: 160 },
          { id: 'A2', size: 'A', x: 15, y: 185, w: 160, h: 160 },
          { id: 'B2', size: 'B', x: 185, y: 185, w: 80, h: 160 },
          { id: 'C1', size: 'C', x: 15, y: 355, w: 80, h: 60 },
          { id: 'C2', size: 'C', x: 105, y: 355, w: 80, h: 60 },
          { id: 'C3', size: 'C', x: 195, y: 355, w: 70, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 420, w: 80, h: 55, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 420, w: 160, h: 55, label: '18Ah Battery' },
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
    width_mm: 600,
    height_mm: 358,
    portrait_width_mm: 358,
    portrait_height_mm: 600,
    type: 'enclosure',
    variants: [
      {
        name: 'Standard',
        // Landscape 600×358: top zone 0-265, bottom shelf 265-358
        slots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'A2', size: 'A', x: 185, y: 15, w: 160, h: 160 },
          { id: 'A3', size: 'A', x: 355, y: 15, w: 160, h: 160 },
          { id: 'C1', size: 'C', x: 525, y: 15, w: 60, h: 60 },
          { id: 'C2', size: 'C', x: 525, y: 85, w: 60, h: 60 },
          { id: 'B1', size: 'B', x: 15, y: 185, w: 160, h: 80 },
          { id: 'B2', size: 'B', x: 185, y: 185, w: 160, h: 80 },
          { id: 'B3', size: 'B', x: 355, y: 185, w: 160, h: 80 },
          { id: 'B4', size: 'B', x: 525, y: 185, w: 60, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 280, w: 80, h: 70, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 280, w: 480, h: 70, label: '18Ah Battery' },
        ],
        // Portrait 358×600 - TALL narrow (real Inner Range orientation)
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'A2', size: 'A', x: 185, y: 15, w: 160, h: 160 },
          { id: 'A3', size: 'A', x: 15, y: 185, w: 160, h: 160 },
          { id: 'B1', size: 'B', x: 185, y: 185, w: 160, h: 80 },
          { id: 'B2', size: 'B', x: 185, y: 275, w: 160, h: 80 },
          { id: 'B3', size: 'B', x: 15, y: 355, w: 160, h: 80 },
          { id: 'B4', size: 'B', x: 185, y: 355, w: 160, h: 80 },
          { id: 'C1', size: 'C', x: 15, y: 445, w: 80, h: 60 },
          { id: 'C2', size: 'C', x: 105, y: 445, w: 80, h: 60 },
          { id: 'C3', size: 'C', x: 195, y: 445, w: 80, h: 60 },
          { id: 'C4', size: 'C', x: 285, y: 445, w: 60, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 520, w: 80, h: 70, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 520, w: 240, h: 70, label: '18Ah Battery' },
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
    // CONFIRMED REAL SPEC: 700mm length × 358mm width × 83mm depth
    // Bottom 20mm reserved for mains cable entry
    width_mm: 700,
    height_mm: 358,
    portrait_width_mm: 358,
    portrait_height_mm: 700,
    type: 'enclosure',
    variants: [
      {
        name: 'Full System',
        // Landscape 700×358: 4 controllers across, modules below, battery shelf at bottom
        slots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'A2', size: 'A', x: 185, y: 15, w: 160, h: 160 },
          { id: 'A3', size: 'A', x: 355, y: 15, w: 160, h: 160 },
          { id: 'A4', size: 'A', x: 525, y: 15, w: 160, h: 160 },
          { id: 'B1', size: 'B', x: 15, y: 185, w: 160, h: 80 },
          { id: 'B2', size: 'B', x: 185, y: 185, w: 160, h: 80 },
          { id: 'B3', size: 'B', x: 355, y: 185, w: 160, h: 80 },
          { id: 'B4', size: 'B', x: 525, y: 185, w: 160, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 275, w: 80, h: 60, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 275, w: 580, h: 60, label: '18Ah Battery' },
          // Bottom 20mm (y=338-358) reserved for mains cable entry
        ],
        // Portrait 358×700 - TALL narrow (REAL Inner Range orientation)
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 160, h: 160 },
          { id: 'A2', size: 'A', x: 185, y: 15, w: 160, h: 160 },
          { id: 'A3', size: 'A', x: 15, y: 185, w: 160, h: 160 },
          { id: 'A4', size: 'A', x: 185, y: 185, w: 160, h: 160 },
          { id: 'B1', size: 'B', x: 15, y: 355, w: 160, h: 80 },
          { id: 'B2', size: 'B', x: 185, y: 355, w: 160, h: 80 },
          { id: 'B3', size: 'B', x: 15, y: 445, w: 160, h: 80 },
          { id: 'B4', size: 'B', x: 185, y: 445, w: 160, h: 80 },
          { id: 'C1', size: 'C', x: 15, y: 535, w: 80, h: 60 },
          { id: 'C2', size: 'C', x: 105, y: 535, w: 80, h: 60 },
          { id: 'C3', size: 'C', x: 195, y: 535, w: 80, h: 60 },
          { id: 'C4', size: 'C', x: 285, y: 535, w: 60, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 605, w: 80, h: 70, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 105, y: 605, w: 240, h: 70, label: '18Ah Battery' },
          // Bottom 20mm (y=680-700) reserved for mains cable entry
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
