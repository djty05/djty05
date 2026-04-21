// Cable Schedule - aggregates all enclosures

function generateCableSchedule() {
  const schedule = [];
  const components = getPlacedComponents();
  if (components.length === 0) return schedule;

  const nameMap = (typeof buildComponentNames === 'function') ? buildComponentNames() : {};
  const designatorFor = (c) => nameMap[`${c.enclosureIdx}:${c.slotId}`]
    || c.component.shortName
    || c.component.code;

  let n = 1;

  // Group by enclosure
  const enclosures = new Map();
  components.forEach(c => {
    if (!enclosures.has(c.enclosureIdx)) {
      enclosures.set(c.enclosureIdx, []);
    }
    enclosures.get(c.enclosureIdx).push(c);
  });

  // For each enclosure, generate cables
  enclosures.forEach((comps, encIdx) => {
    const psu = comps.find(c => c.component.type === 'psu');
    const controller = comps.find(c => c.component.type === 'controller');

    // Power to other components
    if (psu) {
      const psuName = designatorFor(psu);
      comps.forEach(c => {
        if (c.component.type !== 'psu' && c.component.wattage > 0) {
          schedule.push({
            ref: `C${n++}`,
            from: psuName,
            to: designatorFor(c),
            type: '2-pair Power',
            length: 1,
          });
        }
      });
    }

    // Controller to modules
    if (controller) {
      const ctrlName = designatorFor(controller);
      comps.filter(c => c.component.type === 'module').forEach(c => {
        schedule.push({
          ref: `C${n++}`,
          from: ctrlName,
          to: designatorFor(c),
          type: 'RS485/UBUS',
          length: 1,
        });
      });
    }
  });

  return schedule;
}

function renderCableSchedule() {
  const table = document.getElementById('cable-table');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';

  const schedule = generateCableSchedule();

  if (schedule.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--ir-gray); padding:20px">No cables generated. Place components first.</td></tr>';
    return;
  }

  schedule.forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${c.ref}</strong></td>
      <td>${c.from}</td>
      <td>${c.to}</td>
      <td>${c.type}</td>
      <td style="text-align:center">${c.length}</td>
    `;
    tbody.appendChild(row);
  });
}
