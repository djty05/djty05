// Cable Schedule - auto-generates from placed components

function generateCableSchedule() {
  const schedule = [];
  const components = getPlacedComponents();
  if (components.length === 0) return schedule;

  // Find PSU
  const psu = components.find(c => c.part.type === 'psu');
  const controller = components.find(c => c.part.type === 'controller');

  let n = 1;

  // Power distribution
  if (psu) {
    components.forEach(c => {
      if (c.part.type !== 'psu' && c.part.wattage > 0) {
        schedule.push({
          ref: `C${n++}`,
          from: psu.slotId,
          to: c.slotId,
          type: '2-pair Power',
          length: 1,
        });
      }
    });
  }

  // Controller to modules (RS485/UBUS)
  if (controller) {
    components.filter(c => c.part.type === 'module').forEach(c => {
      schedule.push({
        ref: `C${n++}`,
        from: controller.slotId,
        to: c.slotId,
        type: 'RS485/UBUS',
        length: 1,
      });
    });

    // Controller to readers
    components.filter(c => c.part.type === 'reader').forEach(c => {
      schedule.push({
        ref: `C${n++}`,
        from: controller.slotId,
        to: c.slotId + ' (external)',
        type: '4-core Security',
        length: 10,
      });
    });

    // Controller to keypads
    components.filter(c => c.part.type === 'keypad').forEach(c => {
      schedule.push({
        ref: `C${n++}`,
        from: controller.slotId,
        to: c.slotId + ' (external)',
        type: '4-core Security',
        length: 5,
      });
    });
  }

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
