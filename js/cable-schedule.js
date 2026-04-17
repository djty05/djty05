// Cable Schedule auto-generation

function generateCableSchedule() {
  const schedule = [];
  let cableNum = 1;

  canvasState.wires.forEach(wire => {
    const fromComp = canvasState.components.find(c => c.id === wire.fromComp);
    const toComp = canvasState.components.find(c => c.id === wire.toComp);

    if (!fromComp || !toComp) return;

    const fromPart = getPartById(fromComp.partId);
    const toPart = getPartById(toComp.partId);

    // Infer cable type based on terminal types
    let cableType = 'Multi-pair';
    let cores = 4;

    if (wire.fromTerm.includes('DATA') || wire.toTerm.includes('DATA')) {
      cableType = 'CAT6';
      cores = 8;
    } else if (wire.fromTerm.includes('TX') || wire.toTerm.includes('TX')) {
      cableType = '4-core Security';
      cores = 4;
    } else if (wire.fromTerm.includes('REL') || wire.toTerm.includes('REL')) {
      cableType = '2-pair';
      cores = 2;
    } else if (wire.fromTerm.includes('ALARM') || wire.toTerm.includes('ALARM')) {
      cableType = '2-pair';
      cores = 2;
    } else if (wire.fromTerm.includes('+12V') || wire.fromTerm.includes('GND')) {
      cableType = '2-pair Power';
      cores = 2;
    }

    // Estimate cable length (rough, based on component distance)
    const dx = fromComp.x - toComp.x;
    const dy = fromComp.y - toComp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const estimatedLength = Math.max(1, Math.round(dist / 100)); // rough estimate

    schedule.push({
      ref: `C${cableNum++}`,
      fromDevice: wire.fromComp,
      fromTerm: wire.fromTerm,
      toDevice: wire.toComp,
      toTerm: wire.toTerm,
      cableType,
      cores,
      length: estimatedLength,
      notes: `${fromPart?.code || '?'} to ${toPart?.code || '?'}`,
    });
  });

  return schedule;
}

function renderCableSchedule() {
  const table = document.getElementById('cable-table');
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';

  const schedule = generateCableSchedule();

  schedule.forEach(cable => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${cable.ref}</strong></td>
      <td>${cable.fromDevice}</td>
      <td><small>${cable.fromTerm}</small></td>
      <td>${cable.toDevice}</td>
      <td><small>${cable.toTerm}</small></td>
      <td>${cable.cableType}</td>
      <td style="text-align:center">${cable.cores}</td>
      <td style="text-align:center">${cable.length}</td>
      <td><small>${cable.notes}</small></td>
    `;
    tbody.appendChild(row);
  });

  // Update mini title block on Cable page
  updateMiniTitleBlock('titleblock-cable');
}
