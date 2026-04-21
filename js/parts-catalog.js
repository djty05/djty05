// Inner Range Parts Catalog with REAL Inner Range Enclosure Dimensions
// XL Enclosure spec confirmed: 700mm Length x 358mm Width x 83mm Depth
// Allow 20mm at bottom for mains cable entry

const PARTS_CATALOG = [
  // ===== CONTROLLERS (PCB Size A - SQUARE 160x160mm) =====
  {
    id: 'IR-996001',
    category: 'Controllers',
    code: 'IR-996001PCB&K',
    shortName: 'ISC',
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
    shortName: 'IAC',
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
    shortName: 'ILAM',
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
    shortName: 'SLAM',
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
    shortName: 'LAM',
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
    shortName: 'UEM',
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
    shortName: 'PSU3',
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
    shortName: 'PSU8',
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
    shortName: 'SIFER',
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
    shortName: 'SIFER-K',
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
    shortName: 'T4K',
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
    shortName: 'STRIKE',
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
    shortName: 'MAG',
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
    shortName: 'TURN',
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
    shortName: 'PIR',
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
    shortName: 'DC',
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
    shortName: 'TERM',
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
    standoffPlateInset: 8,  // mm inset from enclosure edge
    type: 'enclosure',
    variants: [
      {
        name: 'Vertical B + A',
        // Landscape 380×280: standoff plate area 0-180, shelf 180-280
        slots: [
          { id: 'B1', size: 'B', x: 15, y: 15, w: 95, h: 155 },
          { id: 'A1', size: 'A', x: 120, y: 15, w: 155, h: 155 },
          { id: 'C1', size: 'C', x: 285, y: 15, w: 80, h: 70 },
          { id: 'C2', size: 'C', x: 285, y: 95, w: 80, h: 70 },
          { id: 'PSU', size: 'C', x: 15, y: 185, w: 85, h: 85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 190, w: 155, h: 80, label: '9Ah Battery' },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 155, h: 155 },
          { id: 'B1', size: 'B', x: 180, y: 15, w: 95, h: 155 },
          { id: 'B2', size: 'B', x: 15, y: 180, w: 155, h: 95 },
          { id: 'C1', size: 'C', x: 180, y: 180, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 180, y: 260, w: 95, h: 35 },
          { id: 'PSU', size: 'C', x: 15, y: 290, w: 85, h: 85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 290, w: 155, h: 85, label: '9Ah Battery' },
        ],
      },
      {
        name: 'Dense Modules',
        slots: [
          { id: 'B1', size: 'B', x: 15, y: 15, w: 155, h: 80 },
          { id: 'B2', size: 'B', x: 180, y: 15, w: 155, h: 80 },
          { id: 'B3', size: 'B', x: 15, y: 100, w: 155, h: 80 },
          { id: 'B4', size: 'B', x: 180, y: 100, w: 155, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 185, w: 85, h: 85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 190, w: 155, h: 80, label: '9Ah Battery' },
        ],
        portraitSlots: [
          { id: 'B1', size: 'B', x: 15, y: 15, w: 250, h: 80 },
          { id: 'B2', size: 'B', x: 15, y: 100, w: 250, h: 80 },
          { id: 'B3', size: 'B', x: 15, y: 185, w: 250, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 290, w: 85, h: 85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 290, w: 155, h: 85, label: '9Ah Battery' },
        ],
      },
      {
        name: 'Controller + C',
        slots: [
          { id: 'A1', size: 'A', x: 120, y: 15, w: 155, h: 155 },
          { id: 'C1', size: 'C', x: 15, y: 15, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 15, y: 95, w: 95, h: 75 },
          { id: 'C3', size: 'C', x: 285, y: 15, w: 80, h: 70 },
          { id: 'C4', size: 'C', x: 285, y: 95, w: 80, h: 75 },
          { id: 'PSU', size: 'C', x: 15, y: 185, w: 85, h: 85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 190, w: 155, h: 80, label: '9Ah Battery' },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 155, h: 155 },
          { id: 'C1', size: 'C', x: 180, y: 15, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 180, y: 95, w: 95, h: 75 },
          { id: 'C3', size: 'C', x: 15, y: 180, w: 80, h: 70 },
          { id: 'C4', size: 'C', x: 105, y: 180, w: 80, h: 70 },
          { id: 'C5', size: 'C', x: 195, y: 180, w: 80, h: 70 },
          { id: 'PSU', size: 'C', x: 15, y: 290, w: 85, h: 85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 290, w: 155, h: 85, label: '9Ah Battery' },
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
    height_mm: 340,
    portrait_width_mm: 340,
    portrait_height_mm: 480,
    standoffPlateInset: 8,
    type: 'enclosure',
    variants: [
      {
        name: 'Vertical B + A (18Ah)',
        slots: [
          { id: 'B1', size: 'B', x: 15, y: 15, w: 95, h: 155 },
          { id: 'A1', size: 'A', x: 120, y: 15, w: 155, h: 155 },
          { id: 'A2', size: 'A', x: 285, y: 15, w: 155, h: 155 },
          { id: 'C1', size: 'C', x: 15, y: 180, w: 95, h: 25 },
          { id: 'PSU', size: 'C', x: 15, y: 215, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 215, w: 180, h: 120, label: '18Ah Battery' },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 155, h: 155 },
          { id: 'B1', size: 'B', x: 180, y: 15, w: 95, h: 155 },
          { id: 'A2', size: 'A', x: 15, y: 180, w: 155, h: 155 },
          { id: 'B2', size: 'B', x: 180, y: 180, w: 145, h: 80 },
          { id: 'C1', size: 'C', x: 180, y: 270, w: 145, h: 65 },
          { id: 'PSU', size: 'C', x: 15, y: 350, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 350, w: 180, h: 120, label: '18Ah Battery' },
        ],
      },
      {
        name: 'Dense Layout',
        slots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 155, h: 155 },
          { id: 'A2', size: 'A', x: 180, y: 15, w: 155, h: 155 },
          { id: 'B1', size: 'B', x: 345, y: 15, w: 120, h: 80 },
          { id: 'B2', size: 'B', x: 345, y: 100, w: 120, h: 70 },
          { id: 'B3', size: 'B', x: 15, y: 180, w: 155, h: 30 },
          { id: 'B4', size: 'B', x: 180, y: 180, w: 155, h: 30 },
          { id: 'C1', size: 'C', x: 345, y: 180, w: 120, h: 30 },
          { id: 'PSU', size: 'C', x: 15, y: 215, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 215, w: 180, h: 120, label: '18Ah Battery' },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 155, h: 155 },
          { id: 'B1', size: 'B', x: 180, y: 15, w: 95, h: 155 },
          { id: 'A2', size: 'A', x: 15, y: 180, w: 155, h: 155 },
          { id: 'B2', size: 'B', x: 180, y: 180, w: 145, h: 80 },
          { id: 'B3', size: 'B', x: 180, y: 270, w: 145, h: 65 },
          { id: 'PSU', size: 'C', x: 15, y: 350, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 350, w: 180, h: 120, label: '18Ah Battery' },
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
    standoffPlateInset: 8,
    type: 'enclosure',
    variants: [
      {
        name: 'Standard',
        // Landscape 600×358: top 0-180, mid 180-220, bottom shelf 220-345 (135mm for 18Ah)
        slots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 155, h: 155 },
          { id: 'A2', size: 'A', x: 180, y: 15, w: 155, h: 155 },
          { id: 'A3', size: 'A', x: 345, y: 15, w: 155, h: 155 },
          { id: 'B1', size: 'B', x: 510, y: 15, w: 75, h: 155 },
          { id: 'B2', size: 'B', x: 15, y: 180, w: 155, h: 30 },
          { id: 'B3', size: 'B', x: 180, y: 180, w: 155, h: 30 },
          { id: 'B4', size: 'B', x: 345, y: 180, w: 155, h: 30 },
          { id: 'C1', size: 'C', x: 510, y: 180, w: 75, h: 30 },
          { id: 'PSU', size: 'C', x: 15, y: 220, w: 85, h: 125, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 220, w: 180, h: 125, label: '18Ah Battery' },
          { id: 'C2', size: 'C', x: 305, y: 230, w: 90, h: 60 },
          { id: 'C3', size: 'C', x: 405, y: 230, w: 90, h: 60 },
          { id: 'C4', size: 'C', x: 505, y: 230, w: 80, h: 60 },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 15, w: 155, h: 155 },
          { id: 'A2', size: 'A', x: 180, y: 15, w: 155, h: 155 },
          { id: 'A3', size: 'A', x: 15, y: 180, w: 155, h: 155 },
          { id: 'B1', size: 'B', x: 180, y: 180, w: 155, h: 80 },
          { id: 'B2', size: 'B', x: 180, y: 270, w: 155, h: 65 },
          { id: 'B3', size: 'B', x: 15, y: 345, w: 155, h: 80 },
          { id: 'B4', size: 'B', x: 180, y: 345, w: 155, h: 80 },
          { id: 'C1', size: 'C', x: 15, y: 435, w: 80, h: 30 },
          { id: 'C2', size: 'C', x: 105, y: 435, w: 80, h: 30 },
          { id: 'C3', size: 'C', x: 195, y: 435, w: 80, h: 30 },
          { id: 'C4', size: 'C', x: 285, y: 435, w: 50, h: 30 },
          { id: 'PSU', size: 'C', x: 15, y: 470, w: 85, h: 125, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 470, w: 225, h: 125, label: '18Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-XL8A',
    category: 'Enclosures',
    code: 'IR-995203',  // Real Inner Range XL code per Document 635203
    manufacturer: 'Inner Range',
    description: 'Xtra Large Enclosure (8A, 18Ah)',
    price: 1485,
    wattage: 0,
    psuRating: 96,
    batteryCapacity: '18Ah',
    size: 'xlarge',
    // CONFIRMED REAL SPEC per Document 635203:
    // 700mm length × 358mm width × 83mm depth
    // Battery 18Ah: 180×145mm | Battery 17Ah: 180×145mm
    // Bottom 20mm reserved for mains cable entry
    width_mm: 700,
    height_mm: 358,
    portrait_width_mm: 358,
    portrait_height_mm: 700,
    standoffPlateInset: 8,
    cableEntryMm: 20,
    // Ordering options per Inner Range spec sheet (AU/NZ, UK/EU, ME, US/CA)
    orderingOptions: [
      { code: '995203',    name: 'Enclosure Only',       psuId: null },
      { code: '995203PE2', name: '+ 2A Transformer',     psuId: null, psuNote: '2A Transformer' },
      { code: '995203PE3', name: '+ SMART 3A PSU',       psuId: 'IR-996091' },
      { code: '995203PE8', name: '+ SMART 8A PSU',       psuId: 'IR-996092' },
    ],
    type: 'enclosure',
    // Layout variants per Document Part No: 635203 (mounting position options)
    variants: [
      {
        // Ref: "Integriti Size A mounting positions (1 req'd)"
        name: '1× Size A',
        slots: [
          { id: 'A1', size: 'A', x: 270, y: 30, w: 160, h: 160 },
          { id: 'PSU', size: 'C', x: 15, y: 220, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 210, w: 180, h: 125, label: '18Ah Battery' },
          { id: 'C1', size: 'C', x: 305, y: 250, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 405, y: 250, w: 95, h: 70 },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 100, y: 200, w: 160, h: 160 },
          { id: 'PSU', size: 'C', x: 15, y: 555, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 545, w: 180, h: 125, label: '18Ah Battery' },
          { id: 'C1', size: 'C', x: 15, y: 420, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 115, y: 420, w: 95, h: 70 },
        ],
      },
      {
        // Ref: "Concept Size A mounting positions (2 req'd, Mini Expandar, Analogue Module)"
        name: '2× Size A',
        slots: [
          { id: 'A1', size: 'A', x: 185, y: 30, w: 160, h: 160 },
          { id: 'A2', size: 'A', x: 355, y: 30, w: 160, h: 160 },
          { id: 'PSU', size: 'C', x: 15, y: 220, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 210, w: 180, h: 125, label: '18Ah Battery' },
          { id: 'C1', size: 'C', x: 305, y: 250, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 405, y: 250, w: 95, h: 70 },
          { id: 'C3', size: 'C', x: 525, y: 250, w: 95, h: 70 },
        ],
        portraitSlots: [
          { id: 'A1', size: 'A', x: 15, y: 30, w: 160, h: 160 },
          { id: 'A2', size: 'A', x: 185, y: 30, w: 160, h: 160 },
          { id: 'C1', size: 'C', x: 15, y: 210, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 115, y: 210, w: 95, h: 70 },
          { id: 'C3', size: 'C', x: 15, y: 290, w: 330, h: 60 },
          { id: 'PSU', size: 'C', x: 15, y: 555, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 545, w: 180, h: 125, label: '18Ah Battery' },
        ],
      },
      {
        // Ref: "Concept Size B mounting positions (3 qty)"
        name: '3× Size B',
        slots: [
          { id: 'B1', size: 'B', x: 30, y: 30, w: 160, h: 80 },
          { id: 'B2', size: 'B', x: 30, y: 120, w: 160, h: 80 },
          { id: 'B3', size: 'B', x: 250, y: 30, w: 160, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 230, w: 85, h: 105, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 210, w: 180, h: 125, label: '18Ah Battery' },
          { id: 'C1', size: 'C', x: 465, y: 30, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 570, y: 30, w: 95, h: 70 },
        ],
        portraitSlots: [
          { id: 'B1', size: 'B', x: 30, y: 30, w: 290, h: 80 },
          { id: 'B2', size: 'B', x: 30, y: 120, w: 290, h: 80 },
          { id: 'B3', size: 'B', x: 30, y: 210, w: 290, h: 80 },
          { id: 'C1', size: 'C', x: 30, y: 300, w: 140, h: 70 },
          { id: 'C2', size: 'C', x: 185, y: 300, w: 140, h: 70 },
          { id: 'PSU', size: 'C', x: 15, y: 555, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 545, w: 180, h: 125, label: '18Ah Battery' },
        ],
      },
      {
        // Ref: "Concept Size B mounting positions (4 qty)"
        name: '4× Size B',
        slots: [
          { id: 'B1', size: 'B', x: 30, y: 30, w: 160, h: 80 },
          { id: 'B2', size: 'B', x: 30, y: 120, w: 160, h: 80 },
          { id: 'B3', size: 'B', x: 250, y: 30, w: 160, h: 80 },
          { id: 'B4', size: 'B', x: 250, y: 120, w: 160, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 230, w: 85, h: 105, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 210, w: 180, h: 125, label: '18Ah Battery' },
          { id: 'C1', size: 'C', x: 465, y: 30, w: 95, h: 70 },
          { id: 'C2', size: 'C', x: 570, y: 30, w: 95, h: 70 },
          { id: 'C3', size: 'C', x: 465, y: 110, w: 200, h: 60 },
        ],
        portraitSlots: [
          { id: 'B1', size: 'B', x: 30, y: 30, w: 290, h: 80 },
          { id: 'B2', size: 'B', x: 30, y: 120, w: 290, h: 80 },
          { id: 'B3', size: 'B', x: 30, y: 210, w: 290, h: 80 },
          { id: 'B4', size: 'B', x: 30, y: 300, w: 290, h: 80 },
          { id: 'C1', size: 'C', x: 30, y: 390, w: 140, h: 70 },
          { id: 'C2', size: 'C', x: 185, y: 390, w: 140, h: 70 },
          { id: 'PSU', size: 'C', x: 15, y: 555, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 545, w: 180, h: 125, label: '18Ah Battery' },
        ],
      },
      {
        // Ref: "Concept Size B mounting positions (5 qty)"
        name: '5× Size B',
        slots: [
          { id: 'B1', size: 'B', x: 30, y: 30, w: 160, h: 80 },
          { id: 'B2', size: 'B', x: 30, y: 120, w: 160, h: 80 },
          { id: 'B3', size: 'B', x: 250, y: 30, w: 160, h: 80 },
          { id: 'B4', size: 'B', x: 250, y: 120, w: 160, h: 80 },
          { id: 'B5', size: 'B', x: 465, y: 30, w: 160, h: 80 },
          { id: 'PSU', size: 'C', x: 15, y: 230, w: 85, h: 105, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 210, w: 180, h: 125, label: '18Ah Battery' },
          { id: 'C1', size: 'C', x: 465, y: 120, w: 95, h: 60 },
          { id: 'C2', size: 'C', x: 570, y: 120, w: 95, h: 60 },
        ],
        portraitSlots: [
          { id: 'B1', size: 'B', x: 30, y: 30, w: 290, h: 80 },
          { id: 'B2', size: 'B', x: 30, y: 120, w: 290, h: 80 },
          { id: 'B3', size: 'B', x: 30, y: 210, w: 290, h: 80 },
          { id: 'B4', size: 'B', x: 30, y: 300, w: 290, h: 80 },
          { id: 'B5', size: 'B', x: 30, y: 390, w: 290, h: 80 },
          { id: 'C1', size: 'C', x: 30, y: 480, w: 140, h: 70 },
          { id: 'C2', size: 'C', x: 185, y: 480, w: 140, h: 70 },
          { id: 'PSU', size: 'C', x: 15, y: 555, w: 85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 545, w: 180, h: 125, label: '18Ah Battery' },
        ],
      },
      {
        // Ref: "Full System with 8A PSU and dual batteries" (Example 2 from earlier ref)
        name: 'Full System (8A PSU)',
        slots: [
          { id: 'B1', size: 'B', x: 30, y: 30, w: 100, h: 165 },
          { id: 'B2', size: 'B', x: 150, y: 30, w: 200, h: 75 },
          { id: 'B3', size: 'B', x: 150, y: 115, w: 200, h: 75 },
          { id: 'C1', size: 'C', x: 370, y: 30, w: 95, h: 70 },
          { id: 'B4', size: 'B', x: 475, y: 30, w: 200, h: 75 },
          { id: 'B5', size: 'B', x: 370, y: 115, w: 305, h: 75 },
          { id: 'PSU8', size: 'psu-module', x: 200, y: 215, w: 280, h: 75, fixed: '8a-psu', label: '8Amp PSU' },
          { id: 'BAT1', size: 'battery', x: 15, y: 230, w: 155, h: 100, label: '9Ah Battery' },
          { id: 'BAT2', size: 'battery', x: 500, y: 215, w: 180, h: 125, label: '18Ah Battery' },
        ],
        portraitSlots: [
          { id: 'B1', size: 'B', x: 30, y: 30, w: 100, h: 165 },
          { id: 'B2', size: 'B', x: 150, y: 30, w: 175, h: 75 },
          { id: 'B3', size: 'B', x: 150, y: 115, w: 175, h: 75 },
          { id: 'C1', size: 'C', x: 30, y: 215, w: 95, h: 70 },
          { id: 'B4', size: 'B', x: 140, y: 215, w: 185, h: 70 },
          { id: 'B5', size: 'B', x: 30, y: 300, w: 295, h: 75 },
          { id: 'PSU8', size: 'psu-module', x: 30, y: 400, w: 290, h: 75, fixed: '8a-psu', label: '8Amp PSU' },
          { id: 'BAT1', size: 'battery', x: 15, y: 500, w: 155, h: 100, label: '9Ah Battery' },
          { id: 'BAT2', size: 'battery', x: 180, y: 500, w: 145, h: 145, label: '18Ah Battery' },
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
