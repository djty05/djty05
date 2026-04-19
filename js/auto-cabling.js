// Intelligent auto-cabling: suggests and auto-routes connections

function getConnectionSuggestions() {
  const suggestions = [];

  // Power distribution rules
  const powerComponents = canvasState.components.filter(c => {
    const part = getPartById(c.partId);
    return part && (part.category === 'Power Supplies' || part.category === 'Controllers');
  });

  const otherComponents = canvasState.components.filter(c => {
    const part = getPartById(c.partId);
    return part && part.category !== 'Power Supplies' && part.category !== 'Enclosures';
  });

  // Rule 1: Connect all +12V to PSU output
  const psuComponent = powerComponents.find(c => getPartById(c.partId).category === 'Power Supplies');
  if (psuComponent) {
    const psuTerminal = getTerminalByName(psuComponent, '+12V');
    otherComponents.forEach(comp => {
      const term = getTerminalByName(comp, '+12V');
      if (term && !connectionExists(psuComponent, psuTerminal.name, comp, term.name)) {
        suggestions.push({
          type: 'power',
          from: psuComponent,
          fromTerm: '+12V',
          to: comp,
          toTerm: '+12V',
          priority: 5,
          color: '#dc2626',
          cableType: '2-pair Power',
        });
      }
    });
  }

  // Rule 2: Connect all GND together
  const gndTerminals = [];
  canvasState.components.forEach(comp => {
    const term = getTerminalByName(comp, 'GND');
    if (term) gndTerminals.push({ comp, term });
  });
  for (let i = 0; i < gndTerminals.length - 1; i++) {
    if (!connectionExists(gndTerminals[i].comp, 'GND', gndTerminals[i + 1].comp, 'GND')) {
      suggestions.push({
        type: 'gnd',
        from: gndTerminals[i].comp,
        fromTerm: 'GND',
        to: gndTerminals[i + 1].comp,
        toTerm: 'GND',
        priority: 5,
        color: '#000',
        cableType: '2-pair Power',
      });
    }
  }

  // Rule 3: RS485 daisy chain (TX+/TX-)
  const rs485Components = canvasState.components.filter(c => {
    const part = getPartById(c.partId);
    if (!part) return false;
    const terminals = part.terminals.map(t => t.name);
    return terminals.some(t => t.includes('TX'));
  });
  for (let i = 0; i < rs485Components.length - 1; i++) {
    const from = rs485Components[i];
    const to = rs485Components[i + 1];
    const fromTx = getTerminalByName(from, 'TX+');
    const toRx = getTerminalByName(to, 'RX+');
    if (fromTx && toRx && !connectionExists(from, fromTx.name, to, toRx.name)) {
      suggestions.push({
        type: 'serial',
        from,
        fromTerm: 'TX+',
        to,
        toTerm: 'RX+',
        priority: 4,
        color: '#0099ff',
        cableType: '4-core Security',
      });
    }
  }

  // Rule 4: Ethernet (ETH or RJ45 connections)
  const ethComponents = canvasState.components.filter(c => {
    const part = getPartById(c.partId);
    if (!part) return false;
    const terminals = part.terminals.map(t => t.name);
    return terminals.some(t => t.includes('ETH'));
  });
  if (ethComponents.length >= 2) {
    const controller = ethComponents.find(c => getPartById(c.partId).category === 'Controllers');
    const modules = ethComponents.filter(c => c !== controller);
    if (controller && modules.length > 0) {
      modules.forEach(mod => {
        const fromTerm = getTerminalByName(controller, 'ETH+');
        const toTerm = getTerminalByName(mod, 'ETH+');
        if (fromTerm && toTerm && !connectionExists(controller, fromTerm.name, mod, toTerm.name)) {
          suggestions.push({
            type: 'ethernet',
            from: controller,
            fromTerm: 'ETH+',
            to: mod,
            toTerm: 'ETH+',
            priority: 3,
            color: '#10b981',
            cableType: 'CAT6',
          });
        }
      });
    }
  }

  // Rule 5: Reader connections (multiformat readers to controllers via RS485)
  const readers = canvasState.components.filter(c => {
    const part = getPartById(c.partId);
    return part && part.category === 'Card Readers';
  });
  const controllerWithRS485 = canvasState.components.find(c => {
    const part = getPartById(c.partId);
    if (!part) return false;
    return part.category === 'Controllers' && part.terminals.some(t => t.name.includes('RS485') || t.name.includes('RX'));
  });
  if (controllerWithRS485) {
    readers.forEach(reader => {
      const readerTerms = getPartById(reader.partId).terminals;
      const ctrlTerms = getPartById(controllerWithRS485.partId).terminals;

      const readerData = readerTerms.find(t => t.name.includes('DATA') || t.name.includes('RX'));
      const ctrlData = ctrlTerms.find(t => t.name.includes('RS485+') || t.name.includes('RX+'));

      if (readerData && ctrlData && !connectionExists(controllerWithRS485, ctrlData.name, reader, readerData.name)) {
        suggestions.push({
          type: 'reader',
          from: controllerWithRS485,
          fromTerm: ctrlData.name,
          to: reader,
          toTerm: readerData.name,
          priority: 3,
          color: '#06b6d4',
          cableType: '4-core Security',
        });
      }
    });
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

function autoConnectAllSuggestions() {
  const suggestions = getConnectionSuggestions();
  let count = 0;

  suggestions.forEach(sug => {
    const wireId = `W${++canvasState.nextWireId}`;
    const wireData = {
      id: wireId,
      fromComp: sug.from.id,
      fromTerm: sug.fromTerm,
      toComp: sug.to.id,
      toTerm: sug.toTerm,
      type: sug.cableType,
    };

    const path = createWirePath(
      sug.from.x + 60,
      sug.from.y + 60,
      sug.to.x + 60,
      sug.to.y + 60,
      wireId,
      sug.cableType
    );
    path.setAttribute('stroke', sug.color);
    document.getElementById('layer-wires').appendChild(path);
    canvasState.wires.push(wireData);
    count++;
  });

  updateStats();
  renderCableSchedule();
  toast(`Auto-connected ${count} cables`);
}

function showConnectionSuggestions() {
  const suggestions = getConnectionSuggestions();
  if (suggestions.length === 0) {
    toast('No connections suggested');
    return;
  }

  let html = '<h4>Suggested Connections</h4>';
  html += '<div style="max-height:300px; overflow-y:auto">';

  suggestions.forEach((sug, idx) => {
    const fromPart = getPartById(sug.from.partId);
    const toPart = getPartById(sug.to.partId);
    html += `
      <div style="padding:8px; border:1px solid #e5e7eb; margin:4px 0; border-radius:4px">
        <div style="font-size:12px; color:#6b7280">
          <strong>${sug.from.id}</strong>.${sug.fromTerm} → <strong>${sug.to.id}</strong>.${sug.toTerm}
        </div>
        <div style="font-size:11px; color:#9ca3af">
          ${fromPart?.code} to ${toPart?.code}
        </div>
        <div style="font-size:10px; margin-top:4px">
          <span style="background:${sug.color}; color:#fff; padding:2px 6px; border-radius:3px">
            ${sug.cableType}
          </span>
        </div>
      </div>
    `;
  });
  html += '</div>';
  html += `<button onclick="autoConnectAllSuggestions()" style="width:100%; padding:8px; margin-top:10px; background:var(--primary); color:#fff; border:none; border-radius:4px; cursor:pointer">
    Auto-Connect All (${suggestions.length})
  </button>`;

  // Show in a modal or side panel
  const panel = document.getElementById('properties-panel') || document.getElementById('modal-power');
  if (panel) {
    panel.innerHTML = html;
  }
}

function getTerminalByName(component, name) {
  const part = getPartById(component.partId);
  if (!part) return null;
  return part.terminals.find(t => t.name === name || t.name.includes(name.substring(0, 3)));
}

function connectionExists(fromComp, fromTerm, toComp, toTerm) {
  return canvasState.wires.some(w =>
    (w.fromComp === fromComp.id && w.fromTerm === fromTerm && w.toComp === toComp.id && w.toTerm === toTerm) ||
    (w.fromComp === toComp.id && w.fromTerm === toTerm && w.toComp === fromComp.id && w.toTerm === fromTerm)
  );
}

function getRecommendedCableType(fromTerm, toTerm) {
  const allTerms = (fromTerm + toTerm).toUpperCase();

  if (allTerms.includes('ETH') || allTerms.includes('RJ45')) return 'CAT6';
  if (allTerms.includes('RS485') || allTerms.includes('TX') || allTerms.includes('RX')) return '4-core Security';
  if (allTerms.includes('REL') || allTerms.includes('IN') || allTerms.includes('ALARM')) return '2-pair';
  if (allTerms.includes('+12V') || allTerms.includes('GND')) return '2-pair Power';
  return '4-core Security';
}
