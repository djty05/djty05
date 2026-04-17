// Project persistence (localStorage + JSON export)

function saveProject() {
  const project = {
    name: titleBlockState.project || 'Untitled',
    timestamp: new Date().toISOString(),
    components: canvasState.components,
    wires: canvasState.wires,
    titleBlock: titleBlockState,
    viewport: {
      zoom: canvasState.zoom,
      panX: canvasState.panX,
      panY: canvasState.panY,
    },
  };

  localStorage.setItem('ir-last-project', JSON.stringify(project));

  // Also trigger download
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `IR-Schematic-${titleBlockState.dwgNo}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast('Project saved!');
}

function loadProject(jsonString) {
  try {
    const project = JSON.parse(jsonString);

    // Clear canvas
    document.getElementById('layer-components').innerHTML = '';
    document.getElementById('layer-wires').innerHTML = '';
    canvasState.components = [];
    canvasState.wires = [];

    // Restore components
    project.components.forEach(comp => {
      const g = createComponentSymbol(comp.partId, comp.id);
      if (g) {
        g.setAttribute('id', `comp-${comp.id}`);
        g.setAttribute('transform', `translate(${comp.x}, ${comp.y}) rotate(${comp.rotation || 0})`);
        document.getElementById('layer-components').appendChild(g);
      }
      canvasState.components.push(comp);
    });

    // Restore wires
    project.wires.forEach(wire => {
      const fromComp = canvasState.components.find(c => c.id === wire.fromComp);
      const toComp = canvasState.components.find(c => c.id === wire.toComp);
      if (fromComp && toComp) {
        const path = createWirePath(
          fromComp.x + 60,
          fromComp.y + 60,
          toComp.x + 60,
          toComp.y + 60,
          wire.id,
          wire.type
        );
        document.getElementById('layer-wires').appendChild(path);
      }
      canvasState.wires.push(wire);
    });

    // Restore title block
    Object.assign(titleBlockState, project.titleBlock);
    initTitleBlock();

    // Restore viewport
    if (project.viewport) {
      canvasState.zoom = project.viewport.zoom;
      canvasState.panX = project.viewport.panX;
      canvasState.panY = project.viewport.panY;
      updateZoom();
      updatePan();
    }

    onCanvasChange();
    toast('Project loaded!');
  } catch (e) {
    toast('Error loading project: ' + e.message);
  }
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('ir-last-project');
  if (saved) {
    loadProject(saved);
  }
}

function newProject() {
  if (canvasState.components.length > 0 && !confirm('Discard current project?')) {
    return;
  }

  document.getElementById('layer-components').innerHTML = '';
  document.getElementById('layer-wires').innerHTML = '';
  canvasState.components = [];
  canvasState.wires = [];
  canvasState.selectedComponent = null;
  canvasState.selectedWire = null;
  canvasState.nextComponentId = 1;
  canvasState.nextWireId = 1;

  Object.assign(titleBlockState, {
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
  });

  initTitleBlock();
  onCanvasChange();
  toast('New project created');
}
