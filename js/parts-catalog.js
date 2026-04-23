// Inner Range Parts Catalog — dimensions verified against manufacturer DXFs
// Mounting grid per IR standoff plate: 95mm horizontal × 84mm vertical hole
// centres, 5mm edge inset. All module PCBs are 94mm tall.
//
// PCB sizes (from DXF KO-layer outlines):
//   A  = 200×200 mm  — Integriti controller (IR-996001 ISC, IR-996035 IAC)
//   B  = 200×94  mm  — ILAM, SLAM, UniBus Door Controller, 16-Zone UEM, LAM
//   C  = 105×94  mm  — UniBus 8-Zone, 8-Aux, 4-Aux (I/P Analog) expanders
//   Cs = 94×94   mm  — UniBus UART, 2A/3A Smart PSU
//
// Depth (all 12V boards): ~83mm enclosure depth available.
// XL enclosure spec: 700 L × 358 W × 83 D, 20mm bottom mains cable entry.

const PARTS_CATALOG = [
  // ===== CONTROLLERS (PCB Size A — 200×200mm) =====
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

  // ===== EXPANSION MODULES (PCB Size B — 200×94mm, confirmed via DXFs
  //       936012 ILAM/SLAM and 936535 UniBus Door Controller) =====
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
    description: 'UniBus 2-Door/2-Reader Expander (SLAM)',
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
    id: 'IR-936535',
    category: 'Expansion Modules',
    code: '936535',
    shortName: 'UDC',
    manufacturer: 'Inner Range',
    description: 'UniBus Door Controller',
    price: 695,
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

  // ===== UniBus EXPANDERS (PCB Size C — 105×94mm, confirmed via DXFs
  //       936500 / 936510 / 936515) =====
  {
    id: 'IR-936500',
    category: 'UniBus Expanders',
    code: '936500',
    shortName: 'U8Z',
    manufacturer: 'Inner Range',
    description: 'UniBus 8-Zone Expander',
    price: 425,
    wattage: 1.5,
    pcbSize: 'C',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
    ],
  },
  {
    id: 'IR-936515',
    category: 'UniBus Expanders',
    code: '936515',
    shortName: 'U8A',
    manufacturer: 'Inner Range',
    description: 'UniBus 8-Aux Expander',
    price: 395,
    wattage: 1.5,
    pcbSize: 'C',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
    ],
  },
  {
    id: 'IR-936510',
    category: 'UniBus Expanders',
    code: '936510',
    shortName: 'U4A',
    manufacturer: 'Inner Range',
    description: 'UniBus 4 I/P Analog Expander',
    price: 445,
    wattage: 1.5,
    pcbSize: 'C',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
    ],
  },

  // ===== POWER / SMALL MODULES (PCB Size Cs — 94×94mm square, confirmed
  //       via DXFs 936520 UART + 936550 2A/3A Smart PSU) =====
  {
    id: 'IR-936520',
    category: 'UniBus Expanders',
    code: '936520',
    shortName: 'UART',
    manufacturer: 'Inner Range',
    description: 'UniBus UART',
    price: 325,
    wattage: 1,
    pcbSize: 'Cs',
    type: 'module',
    terminals: [
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
      { name: 'UBUS+', type: 'serial' }, { name: 'UBUS-', type: 'serial' },
    ],
  },
  {
    id: 'IR-996090',
    category: 'Power',
    code: '936550-2A',
    shortName: 'PSU2',
    manufacturer: 'Inner Range',
    description: 'Smart 2A PSU',
    price: 325,
    wattage: 0,
    psuRating: 24,
    pcbSize: 'Cs',
    type: 'psu',
    terminals: [
      { name: 'AC-IN', type: 'power' }, { name: 'AC-N', type: 'power' },
      { name: '+12V', type: 'power' }, { name: 'GND', type: 'power' },
    ],
  },
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
    pcbSize: 'Cs',
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
    pcbSize: 'B',
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
  // ENCLOSURES — layouts built on real IR standoff-plate grid
  // ============================================
  // XL spec: 700mm length × 358mm width × 83mm depth
  // PCB sizes (verified via DXF KO-layer outlines):
  //   A  = 200×200 mm   (controller)
  //   B  = 200×94  mm   (full-width expansion module; ILAM/SLAM/Door Ctl/PSU8)
  //   C  = 105×94  mm   (UniBus expander — 8-Zone, 4-Aux, 8-Aux)
  //   Cs = 94×94   mm   (UniBus square — UART, 2A/3A Smart PSU)
  // Mounting grid: 95mm horizontal × 84mm vertical hole centres, 5mm edge inset.
  // Battery 9Ah: ~150×65mm | Battery 18Ah: ~180×120mm
  // Transformer: ~85×85mm (2/3A) or ~85×115mm (8A)
  // Bottom 20mm reserved for mains cable entry on XL
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
    // MD3A is too short for Size A (needs 200mm of plate height); it holds
    // a single row of 94-tall modules plus the 9Ah battery shelf.
    width_mm: 380,
    height_mm: 280,
    portrait_width_mm: 280,
    portrait_height_mm: 380,
    standoffPlateInset: 8,
    type: 'enclosure',
    variants: [
      {
        name: 'Single Size B',
        // Land 380×280, shelf y=185: 1 full-width Size B row
        slots: [
          { id: 'B1',  size: 'B',  x:  90, y:  15, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 185, w:  85, h:  85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 195, w: 155, h:  75, label: '9Ah Battery' },
        ],
        // Port 280×380, shelf y=230
        portraitSlots: [
          { id: 'B1',  size: 'B',  x:  40, y:  15, w: 200, h:  94 },
          { id: 'C1',  size: 'C',  x:  15, y: 120, w: 105, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 125, y: 120, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 230, w:  85, h:  95, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 240, w: 155, h:  85, label: '9Ah Battery' },
        ],
      },
      {
        name: 'Mixed Modules',
        // Land 380×280, shelf y=185: 2 Size C + 1 Size Cs in one row
        slots: [
          { id: 'C1',  size: 'C',  x:  15, y:  15, w: 105, h:  94 },
          { id: 'C2',  size: 'C',  x: 130, y:  15, w: 105, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 250, y:  15, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 185, w:  85, h:  85, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 195, w: 155, h:  75, label: '9Ah Battery' },
        ],
        // Port 280×380
        portraitSlots: [
          { id: 'C1',  size: 'C',  x:  15, y:  15, w: 105, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 130, y:  15, w:  94, h:  94 },
          { id: 'C2',  size: 'C',  x:  15, y: 120, w: 105, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 130, y: 120, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 230, w:  85, h:  95, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 240, w: 155, h:  85, label: '9Ah Battery' },
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
    // 8A-capable medium enclosure — fits 1 Size A or 2 rows of 94-tall modules
    // plus an 18Ah battery + 8A transformer on the bottom shelf.
    width_mm: 480,
    height_mm: 340,
    portrait_width_mm: 340,
    portrait_height_mm: 480,
    standoffPlateInset: 8,
    type: 'enclosure',
    variants: [
      {
        name: 'Controller + Modules',
        // Land 480×340, shelf y=220: 1× Size A left, 2×2 grid of Size C on right
        slots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'C1',  size: 'C',  x: 225, y:  15, w: 105, h:  94 },
          { id: 'C2',  size: 'C',  x: 335, y:  15, w: 105, h:  94 },
          { id: 'C3',  size: 'C',  x: 225, y: 115, w: 105, h:  94 },
          { id: 'C4',  size: 'C',  x: 335, y: 115, w: 105, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 220, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 220, w: 250, h: 120, label: '18Ah Battery' },
        ],
        // Port 340×480, shelf y=335: Size A at top, right column of Cs, Size B below A
        portraitSlots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'Cs1', size: 'Cs', x: 230, y:  15, w:  94, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 230, y: 115, w:  94, h:  94 },
          { id: 'B1',  size: 'B',  x:  70, y: 225, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 335, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 335, w: 210, h: 120, label: '18Ah Battery' },
        ],
      },
      {
        name: 'Dual Size B + PSU8',
        // Land 480×340, shelf y=220: 2 rows of Size B. Suits 8A PSU (PSU8 is Size B).
        slots: [
          { id: 'B1',  size: 'B',  x:  15, y:  15, w: 200, h:  94 },
          { id: 'B2',  size: 'B',  x: 225, y:  15, w: 200, h:  94 },
          { id: 'B3',  size: 'B',  x:  15, y: 115, w: 200, h:  94 },
          { id: 'B4',  size: 'B',  x: 225, y: 115, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 220, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 220, w: 250, h: 120, label: '18Ah Battery' },
        ],
        // Port 340×480, shelf y=335: 3 stacked Size B + right column of Cs
        portraitSlots: [
          { id: 'B1',  size: 'B',  x:  70, y:  15, w: 200, h:  94 },
          { id: 'B2',  size: 'B',  x:  70, y: 115, w: 200, h:  94 },
          { id: 'B3',  size: 'B',  x:  70, y: 215, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 335, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 335, w: 210, h: 120, label: '18Ah Battery' },
        ],
      },
      {
        name: 'Dense Modules',
        // Land 480×340, shelf y=220: 2 rows with mix of B/C/Cs
        slots: [
          { id: 'B1',  size: 'B',  x:  15, y:  15, w: 200, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 225, y:  15, w:  94, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 329, y:  15, w:  94, h:  94 },
          { id: 'C1',  size: 'C',  x:  15, y: 115, w: 105, h:  94 },
          { id: 'C2',  size: 'C',  x: 130, y: 115, w: 105, h:  94 },
          { id: 'C3',  size: 'C',  x: 245, y: 115, w: 105, h:  94 },
          { id: 'Cs3', size: 'Cs', x: 360, y: 115, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 220, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 220, w: 250, h: 120, label: '18Ah Battery' },
        ],
        portraitSlots: [
          { id: 'B1',  size: 'B',  x:  70, y:  15, w: 200, h:  94 },
          { id: 'C1',  size: 'C',  x:  15, y: 115, w: 105, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 125, y: 115, w:  94, h:  94 },
          { id: 'C2',  size: 'C',  x: 225, y: 115, w: 105, h:  94 },
          { id: 'C3',  size: 'C',  x:  15, y: 215, w: 105, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 125, y: 215, w:  94, h:  94 },
          { id: 'C4',  size: 'C',  x: 225, y: 215, w: 105, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 335, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 335, w: 210, h: 120, label: '18Ah Battery' },
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
        name: 'Dual Controller',
        // Land 600×358, shelf y=225: 2×Size A + stacked Cs on right
        slots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'A2',  size: 'A',  x: 225, y:  15, w: 200, h: 200 },
          { id: 'C1',  size: 'C',  x: 435, y:  15, w: 105, h:  94 },
          { id: 'C2',  size: 'C',  x: 435, y: 115, w: 105, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 225, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 225, w: 250, h: 120, label: '18Ah Battery' },
        ],
        // Port 358×600, shelf y=475: 2 Size A stacked + right column of Cs
        portraitSlots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'A2',  size: 'A',  x:  15, y: 225, w: 200, h: 200 },
          { id: 'Cs1', size: 'Cs', x: 230, y:  15, w:  94, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 230, y: 115, w:  94, h:  94 },
          { id: 'Cs3', size: 'Cs', x: 230, y: 225, w:  94, h:  94 },
          { id: 'Cs4', size: 'Cs', x: 230, y: 325, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 475, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 475, w: 240, h: 120, label: '18Ah Battery' },
        ],
      },
      {
        name: 'Controller + Modules',
        // Land 600×358, shelf y=225: 1 Size A + 2 rows of modules right
        slots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'B1',  size: 'B',  x: 225, y:  15, w: 200, h:  94 },
          { id: 'C1',  size: 'C',  x: 435, y:  15, w: 105, h:  94 },
          { id: 'C2',  size: 'C',  x: 225, y: 115, w: 105, h:  94 },
          { id: 'C3',  size: 'C',  x: 335, y: 115, w: 105, h:  94 },
          { id: 'C4',  size: 'C',  x: 445, y: 115, w: 105, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 225, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 225, w: 250, h: 120, label: '18Ah Battery' },
        ],
        // Port 358×600, shelf y=475
        portraitSlots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'Cs1', size: 'Cs', x: 230, y:  15, w:  94, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 230, y: 115, w:  94, h:  94 },
          { id: 'B1',  size: 'B',  x:  70, y: 225, w: 200, h:  94 },
          { id: 'B2',  size: 'B',  x:  70, y: 325, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 475, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 475, w: 240, h: 120, label: '18Ah Battery' },
        ],
      },
      {
        name: 'Modules Only',
        // Land 600×358, shelf y=225: 3 Size B + a row of C/Cs
        slots: [
          { id: 'B1',  size: 'B',  x:  15, y:  15, w: 200, h:  94 },
          { id: 'B2',  size: 'B',  x: 225, y:  15, w: 200, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 435, y:  15, w:  94, h:  94 },
          { id: 'B3',  size: 'B',  x:  15, y: 115, w: 200, h:  94 },
          { id: 'C1',  size: 'C',  x: 225, y: 115, w: 105, h:  94 },
          { id: 'C2',  size: 'C',  x: 335, y: 115, w: 105, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 445, y: 115, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 225, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 225, w: 250, h: 120, label: '18Ah Battery' },
        ],
        // Port 358×600, shelf y=475
        portraitSlots: [
          { id: 'B1',  size: 'B',  x:  70, y:  15, w: 200, h:  94 },
          { id: 'B2',  size: 'B',  x:  70, y: 115, w: 200, h:  94 },
          { id: 'B3',  size: 'B',  x:  70, y: 215, w: 200, h:  94 },
          { id: 'B4',  size: 'B',  x:  70, y: 315, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 475, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 475, w: 240, h: 120, label: '18Ah Battery' },
        ],
      },
    ],
  },
  {
    id: 'ENC-XL8A',
    category: 'Enclosures',
    code: 'IR-995203',
    manufacturer: 'Inner Range',
    description: 'Xtra Large Enclosure (8A, 18Ah)',
    price: 1485,
    wattage: 0,
    psuRating: 96,
    batteryCapacity: '18Ah',
    size: 'xlarge',
    // 700×358×83mm per Doc 635203. 20mm bottom mains cable entry.
    width_mm: 700,
    height_mm: 358,
    portrait_width_mm: 358,
    portrait_height_mm: 700,
    standoffPlateInset: 8,
    cableEntryMm: 20,
    orderingOptions: [
      { code: '995203',    name: 'Enclosure Only',       psuId: null },
      { code: '995203PE2', name: '+ 2A Transformer',     psuId: null, psuNote: '2A Transformer' },
      { code: '995203PE3', name: '+ SMART 3A PSU',       psuId: 'IR-996091' },
      { code: '995203PE8', name: '+ SMART 8A PSU',       psuId: 'IR-996092' },
    ],
    type: 'enclosure',
    variants: [
      {
        name: '1× Size A + Modules',
        // Land 700×358, shelf y=215
        slots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'B1',  size: 'B',  x: 225, y:  15, w: 200, h:  94 },
          { id: 'C1',  size: 'C',  x: 435, y:  15, w: 105, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 545, y:  15, w:  94, h:  94 },
          { id: 'C2',  size: 'C',  x: 225, y: 115, w: 105, h:  94 },
          { id: 'C3',  size: 'C',  x: 335, y: 115, w: 105, h:  94 },
          { id: 'C4',  size: 'C',  x: 445, y: 115, w: 105, h:  94 },
          { id: 'C5',  size: 'C',  x: 555, y: 115, w: 105, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 215, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 215, w: 250, h: 125, label: '18Ah Battery' },
        ],
        // Port 358×700, shelf y=535 (usable top 0-530)
        portraitSlots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'Cs1', size: 'Cs', x: 230, y:  15, w:  94, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 230, y: 115, w:  94, h:  94 },
          { id: 'B1',  size: 'B',  x:  70, y: 225, w: 200, h:  94 },
          { id: 'B2',  size: 'B',  x:  70, y: 325, w: 200, h:  94 },
          { id: 'B3',  size: 'B',  x:  70, y: 425, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 540, w:  85, h: 125, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 540, w: 240, h: 125, label: '18Ah Battery' },
        ],
      },
      {
        name: '2× Size A + Modules',
        // Land 700×358, shelf y=215
        slots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'A2',  size: 'A',  x: 225, y:  15, w: 200, h: 200 },
          { id: 'C1',  size: 'C',  x: 435, y:  15, w: 105, h:  94 },
          { id: 'C2',  size: 'C',  x: 545, y:  15, w: 105, h:  94 },
          { id: 'C3',  size: 'C',  x: 435, y: 115, w: 105, h:  94 },
          { id: 'C4',  size: 'C',  x: 545, y: 115, w: 105, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 215, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 215, w: 250, h: 125, label: '18Ah Battery' },
        ],
        // Port 358×700 — 2 A stacked + right Cs column + Size B at bottom
        portraitSlots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'A2',  size: 'A',  x:  15, y: 225, w: 200, h: 200 },
          { id: 'Cs1', size: 'Cs', x: 230, y:  15, w:  94, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 230, y: 115, w:  94, h:  94 },
          { id: 'Cs3', size: 'Cs', x: 230, y: 225, w:  94, h:  94 },
          { id: 'Cs4', size: 'Cs', x: 230, y: 325, w:  94, h:  94 },
          { id: 'B1',  size: 'B',  x:  70, y: 435, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 540, w:  85, h: 125, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 540, w: 240, h: 125, label: '18Ah Battery' },
        ],
      },
      {
        name: '3× Size A',
        // Land 700×358, shelf y=215: max capacity — 3 controllers side-by-side
        slots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'A2',  size: 'A',  x: 225, y:  15, w: 200, h: 200 },
          { id: 'A3',  size: 'A',  x: 435, y:  15, w: 200, h: 200 },
          { id: 'PSU', size: 'Cs', x:  15, y: 215, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 215, w: 250, h: 125, label: '18Ah Battery' },
        ],
        // Port: 2 A stacked + modules (3rd A doesn't fit with battery shelf)
        portraitSlots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'A2',  size: 'A',  x:  15, y: 225, w: 200, h: 200 },
          { id: 'Cs1', size: 'Cs', x: 230, y:  15, w:  94, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 230, y: 115, w:  94, h:  94 },
          { id: 'Cs3', size: 'Cs', x: 230, y: 225, w:  94, h:  94 },
          { id: 'Cs4', size: 'Cs', x: 230, y: 325, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 540, w:  85, h: 125, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 540, w: 240, h: 125, label: '18Ah Battery' },
        ],
      },
      {
        name: 'PSU8 + Controller + Modules',
        // Land 700×358, shelf y=215. Size B row includes slot for 8A PSU (also Size B).
        slots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'B1',  size: 'B',  x: 225, y:  15, w: 200, h:  94 },  // ← PSU8 auto-lands here
          { id: 'C1',  size: 'C',  x: 435, y:  15, w: 105, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 545, y:  15, w:  94, h:  94 },
          { id: 'B2',  size: 'B',  x: 225, y: 115, w: 200, h:  94 },
          { id: 'C2',  size: 'C',  x: 435, y: 115, w: 105, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 545, y: 115, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 215, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 215, w: 250, h: 125, label: '18Ah Battery' },
        ],
        portraitSlots: [
          { id: 'A1',  size: 'A',  x:  15, y:  15, w: 200, h: 200 },
          { id: 'Cs1', size: 'Cs', x: 230, y:  15, w:  94, h:  94 },
          { id: 'Cs2', size: 'Cs', x: 230, y: 115, w:  94, h:  94 },
          { id: 'B1',  size: 'B',  x:  70, y: 225, w: 200, h:  94 },   // ← PSU8 auto-lands here
          { id: 'B2',  size: 'B',  x:  70, y: 325, w: 200, h:  94 },
          { id: 'B3',  size: 'B',  x:  70, y: 425, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 540, w:  85, h: 125, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 540, w: 240, h: 125, label: '18Ah Battery' },
        ],
      },
      {
        name: 'Modules Only',
        // Land 700×358, shelf y=215: 3 Size B on row 1, more modules on row 2
        slots: [
          { id: 'B1',  size: 'B',  x:  15, y:  15, w: 200, h:  94 },
          { id: 'B2',  size: 'B',  x: 225, y:  15, w: 200, h:  94 },
          { id: 'B3',  size: 'B',  x: 435, y:  15, w: 200, h:  94 },
          { id: 'B4',  size: 'B',  x:  15, y: 115, w: 200, h:  94 },
          { id: 'B5',  size: 'B',  x: 225, y: 115, w: 200, h:  94 },
          { id: 'C1',  size: 'C',  x: 435, y: 115, w: 105, h:  94 },
          { id: 'Cs1', size: 'Cs', x: 545, y: 115, w:  94, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 215, w:  85, h: 115, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 215, w: 250, h: 125, label: '18Ah Battery' },
        ],
        portraitSlots: [
          { id: 'B1',  size: 'B',  x:  70, y:  15, w: 200, h:  94 },
          { id: 'B2',  size: 'B',  x:  70, y: 115, w: 200, h:  94 },
          { id: 'B3',  size: 'B',  x:  70, y: 215, w: 200, h:  94 },
          { id: 'B4',  size: 'B',  x:  70, y: 315, w: 200, h:  94 },
          { id: 'B5',  size: 'B',  x:  70, y: 415, w: 200, h:  94 },
          { id: 'PSU', size: 'Cs', x:  15, y: 540, w:  85, h: 125, fixed: 'transformer' },
          { id: 'BAT', size: 'battery', x: 110, y: 540, w: 240, h: 125, label: '18Ah Battery' },
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
