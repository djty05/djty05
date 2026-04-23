// A3 Title Block rendering

const titleBlockState = {
  project: 'Inner Range Integriti System',
  client: '',
  site: '',
  drawing: 'Security System Schematic',
  dwgNo: 'DWG-001',
  sheet: '1 of 1',
  rev: 'A',
  drawn: '',
  checked: '',
  approved: '',
  date: new Date().toISOString().split('T')[0],
  scale: 'NTS',
  company: '',
  lic: '',
  notes: '',
};

function initTitleBlock() {
  const fields = [
    'project', 'client', 'site', 'drawing', 'dwgno', 'sheet',
    'rev', 'drawn', 'checked', 'approved', 'date', 'scale', 'company', 'lic', 'notes'
  ];

  fields.forEach(field => {
    const elem = document.getElementById(`tb-${field}`);
    if (elem) {
      elem.value = titleBlockState[field] || '';
      elem.addEventListener('change', e => {
        titleBlockState[field] = e.target.value;
        renderTitleBlockOnSchematic();
        renderTitleBlockPreview();
        updateMiniTitleBlock('titleblock-bom');
        updateMiniTitleBlock('titleblock-cable');
      });
    }
  });

  renderTitleBlockOnSchematic();
}

function renderTitleBlockOnSchematic() {
  const layer = document.getElementById('layer-titleblock');
  if (!layer) return;

  layer.innerHTML = '';
  const SVG_W = 4200;
  const SVG_H = 2970;

  const tbW = 1200; // Title block width
  const tbH = 180;  // Title block height
  const tbX = SVG_W - tbW - 40;
  const tbY = SVG_H - tbH - 40;

  // Title block background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('class', 'titleblock-bg');
  bg.setAttribute('x', tbX);
  bg.setAttribute('y', tbY);
  bg.setAttribute('width', tbW);
  bg.setAttribute('height', tbH);
  layer.appendChild(bg);

  // Grid lines for structure
  const lineY1 = tbY + 60;
  const lineY2 = tbY + 120;
  const lineX1 = tbX + 300;
  const lineX2 = tbX + 600;
  const lineX3 = tbX + 900;

  [lineY1, lineY2].forEach(y => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'titleblock-line');
    line.setAttribute('x1', tbX);
    line.setAttribute('y1', y);
    line.setAttribute('x2', tbX + tbW);
    line.setAttribute('y2', y);
    layer.appendChild(line);
  });

  [lineX1, lineX2, lineX3].forEach(x => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'titleblock-line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', tbY);
    line.setAttribute('x2', x);
    line.setAttribute('y2', tbY + tbH);
    layer.appendChild(line);
  });

  // Title text
  const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  titleText.setAttribute('class', 'tb-title-big');
  titleText.setAttribute('x', tbX + 20);
  titleText.setAttribute('y', tbY + 45);
  titleText.textContent = titleBlockState.drawing.substring(0, 40);
  layer.appendChild(titleText);

  // Fields in grid
  const fields = [
    { label: 'DWG No', value: titleBlockState.dwgNo, x: tbX + 20, y: tbY + 80 },
    { label: 'REV', value: titleBlockState.rev, x: tbX + lineX1 + 20, y: tbY + 80 },
    { label: 'Scale', value: titleBlockState.scale, x: tbX + lineX2 + 20, y: tbY + 80 },
    { label: 'Date', value: titleBlockState.date, x: tbX + lineX3 + 20, y: tbY + 80 },
    { label: 'Drawn', value: titleBlockState.drawn, x: tbX + 20, y: tbY + 140 },
    { label: 'Checked', value: titleBlockState.checked, x: tbX + lineX1 + 20, y: tbY + 140 },
    { label: 'Approved', value: titleBlockState.approved, x: tbX + lineX2 + 20, y: tbY + 140 },
    { label: 'Sheet', value: titleBlockState.sheet, x: tbX + lineX3 + 20, y: tbY + 140 },
  ];

  fields.forEach(f => {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'tb-label');
    label.setAttribute('x', f.x);
    label.setAttribute('y', f.y - 20);
    label.setAttribute('font-size', '9');
    label.textContent = f.label;
    layer.appendChild(label);

    const value = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    value.setAttribute('class', 'tb-value');
    value.setAttribute('x', f.x);
    value.setAttribute('y', f.y);
    value.setAttribute('font-size', '14');
    value.textContent = f.value.substring(0, 20);
    layer.appendChild(value);
  });
}

function renderTitleBlockPreview() {
  const preview = document.getElementById('titleblock-preview');
  if (!preview) return;

  let html = `
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <tr>
        <td style="border:1px solid #111; padding:8px; width:60%">
          <strong>${titleBlockState.drawing}</strong><br/>
          <small>${titleBlockState.site}</small>
        </td>
        <td style="border:1px solid #111; padding:8px; width:20%">
          <div style="font-size:10px; font-weight:600">DWG No</div>
          <div>${titleBlockState.dwgNo}</div>
        </td>
        <td style="border:1px solid #111; padding:8px; width:20%">
          <div style="font-size:10px; font-weight:600">REV</div>
          <div>${titleBlockState.rev}</div>
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #111; padding:8px">
          <strong>Client:</strong> ${titleBlockState.client}<br/>
          <strong>Company:</strong> ${titleBlockState.company}<br/>
          <strong>Lic#:</strong> ${titleBlockState.lic}
        </td>
        <td style="border:1px solid #111; padding:8px; text-align:center">
          <div style="font-size:10px; font-weight:600">SCALE</div>
          <div style="font-size:14px; font-weight:700">${titleBlockState.scale}</div>
        </td>
        <td style="border:1px solid #111; padding:8px; text-align:center">
          <div style="font-size:10px; font-weight:600">DATE</div>
          <div>${titleBlockState.date}</div>
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #111; padding:8px; vertical-align:top">
          <div style="font-size:10px; color:#666">Notes:</div>
          <div style="font-size:11px; max-height:60px; overflow:hidden">${titleBlockState.notes}</div>
        </td>
        <td colspan="2" style="border:1px solid #111; padding:4px">
          <table style="width:100%; font-size:9px">
            <tr>
              <td style="border-right:1px solid #111">Drawn: ${titleBlockState.drawn}</td>
              <td style="border-right:1px solid #111">Checked: ${titleBlockState.checked}</td>
              <td>Approved: ${titleBlockState.approved}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  preview.innerHTML = html;
}

function updateMiniTitleBlock(elemId) {
  const elem = document.getElementById(elemId);
  if (!elem) return;

  elem.innerHTML = `
    <div><strong>${titleBlockState.dwgNo}</strong></div>
    <div><strong>Rev:</strong> ${titleBlockState.rev}</div>
    <div><strong>Date:</strong> ${titleBlockState.date}</div>
    <div><strong>Drawn:</strong> ${titleBlockState.drawn}</div>
  `;
}
