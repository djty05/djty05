// Bill of Materials auto-generation

function generateBOM() {
  const bomItems = {};

  // Aggregate components by part ID
  canvasState.components.forEach(comp => {
    const part = getPartById(comp.partId);
    if (!part) return;

    if (!bomItems[comp.partId]) {
      bomItems[comp.partId] = {
        partId: comp.partId,
        code: part.code,
        manufacturer: part.manufacturer,
        description: part.description,
        category: part.category,
        price: part.price,
        qty: 0,
        refDes: [],
      };
    }
    bomItems[comp.partId].qty++;
    bomItems[comp.partId].refDes.push(comp.id);
  });

  return Object.values(bomItems).sort((a, b) => a.category.localeCompare(b.category));
}

function renderBOM() {
  const table = document.getElementById('bom-table');
  const tbody = table.querySelector('tbody');
  const tfoot = table.querySelector('tfoot');
  tbody.innerHTML = '';

  const bom = generateBOM();
  let total = 0;
  let rowNum = 1;

  bom.forEach(item => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rowNum}</td>
      <td style="text-align:center">${item.qty}</td>
      <td><strong>${item.code}</strong></td>
      <td>${item.manufacturer}</td>
      <td>${item.description}</td>
      <td><small>${item.category}</small></td>
      <td>CSD.com.au</td>
      <td style="text-align:right">$${item.price.toFixed(2)}</td>
      <td style="text-align:right"><strong>$${lineTotal.toFixed(2)}</strong></td>
    `;
    tbody.appendChild(row);
    rowNum++;
  });

  // Update total
  const totalCell = document.getElementById('bom-total');
  if (totalCell) {
    totalCell.textContent = '$' + total.toFixed(2);
  }

  // Update mini title block on BOM page
  updateMiniTitleBlock('titleblock-bom');
}

// Auto-call when canvas updates
function onCanvasChange() {
  renderBOM();
  renderCableSchedule();
  renderTitleBlockPreview();
  updateStats();
}
