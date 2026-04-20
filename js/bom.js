// Bill of Materials - works with placedParts + enclosure

function generateBOM() {
  const items = {};

  // Add enclosure
  if (currentEnclosure) {
    items[currentEnclosure.id] = {
      code: currentEnclosure.code,
      description: currentEnclosure.description,
      price: currentEnclosure.price,
      qty: 1,
    };
  }

  // Add placed components
  getPlacedComponents().forEach(c => {
    if (!items[c.partId]) {
      items[c.partId] = {
        code: c.part.code,
        description: c.part.description,
        price: c.part.price,
        qty: 0,
      };
    }
    items[c.partId].qty++;
  });

  return Object.values(items);
}

function renderBOM() {
  const table = document.getElementById('bom-table');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';

  const bom = generateBOM();
  let total = 0;
  let n = 1;

  bom.forEach(item => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${n}</td>
      <td style="text-align:center"><strong>${item.qty}</strong></td>
      <td><strong>${item.code}</strong></td>
      <td>${item.description}</td>
      <td style="text-align:right">$${item.price.toFixed(2)}</td>
      <td style="text-align:right"><strong>$${lineTotal.toFixed(2)}</strong></td>
    `;
    tbody.appendChild(row);
    n++;
  });

  const totalCell = document.getElementById('bom-total');
  if (totalCell) totalCell.textContent = '$' + total.toFixed(2);
}
