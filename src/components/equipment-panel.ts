import type { Equipment } from '../models/types.ts';

export function renderEquipmentPanel(equipment: Equipment, instanceId: string): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'equipment-panel';
  panel.dataset.instanceId = instanceId;
  panel.style.background = `linear-gradient(180deg, ${equipment.color} 0%, ${darken(equipment.color, 20)} 100%)`;
  panel.style.height = `${equipment.ruSize * 44 + (equipment.ruSize - 1) * 2}px`;

  // LED
  const led = document.createElement('div');
  led.className = 'panel-led';
  led.style.color = equipment.accentColor;
  led.style.backgroundColor = equipment.accentColor;
  panel.appendChild(led);

  // Name
  const name = document.createElement('span');
  name.className = 'panel-name';
  name.textContent = equipment.name;
  panel.appendChild(name);

  // Brand label
  const brand = document.createElement('span');
  brand.className = 'panel-brand';
  brand.textContent = equipment.brand === 'generic' ? '' : equipment.brand;
  panel.appendChild(brand);

  // Equipment-specific details
  renderDetails(panel, equipment);

  // Delete hint
  const hint = document.createElement('span');
  hint.className = 'delete-hint';
  hint.textContent = 'DEL';
  panel.appendChild(hint);

  return panel;
}

function renderDetails(panel: HTMLElement, eq: Equipment): void {
  switch (eq.id) {
    case 'unifi-udm-pro-max':
    case 'unifi-unvr': {
      const bays = document.createElement('div');
      bays.className = 'panel-hdd-bays';
      for (let i = 0; i < (eq.id === 'unifi-unvr' ? 4 : 1); i++) {
        const bay = document.createElement('div');
        bay.className = 'panel-hdd-bay';
        bays.appendChild(bay);
      }
      panel.appendChild(bays);
      break;
    }
    case 'unifi-usw-pro-24-poe': {
      const ports = document.createElement('div');
      ports.className = 'panel-ports';
      for (let i = 0; i < 24; i++) {
        const port = document.createElement('div');
        port.className = `panel-port${i < 8 ? ' active' : ''}`;
        ports.appendChild(port);
      }
      for (let i = 0; i < 2; i++) {
        const sfp = document.createElement('div');
        sfp.className = 'panel-port sfp';
        ports.appendChild(sfp);
      }
      panel.appendChild(ports);
      break;
    }
    case 'unifi-usw-lite-16-poe': {
      const ports = document.createElement('div');
      ports.className = 'panel-ports';
      for (let i = 0; i < 16; i++) {
        const port = document.createElement('div');
        port.className = `panel-port${i < 6 ? ' active' : ''}`;
        ports.appendChild(port);
      }
      panel.appendChild(ports);
      break;
    }
    case 'unifi-usp-pdu-pro': {
      const outlets = document.createElement('div');
      outlets.className = 'panel-outlets';
      for (let i = 0; i < 8; i++) {
        const outlet = document.createElement('div');
        outlet.className = 'panel-outlet';
        outlets.appendChild(outlet);
      }
      panel.appendChild(outlets);
      break;
    }
    case 'unifi-patch-24': {
      const keystones = document.createElement('div');
      keystones.className = 'panel-keystones';
      for (let i = 0; i < 24; i++) {
        const k = document.createElement('div');
        k.className = 'panel-keystone';
        keystones.appendChild(k);
      }
      panel.appendChild(keystones);
      break;
    }
    case 'c4-core':
      // Simple - just LED and name is enough
      break;
    case 'c4-amp-8ch':
    case 'c4-amp-16ch': {
      const channels = document.createElement('div');
      channels.className = 'panel-channels';
      const count = eq.id === 'c4-amp-8ch' ? 8 : 16;
      for (let i = 0; i < count; i++) {
        const ch = document.createElement('div');
        ch.className = `panel-channel${i < count / 2 ? ' active' : ''}`;
        channels.appendChild(ch);
      }
      panel.appendChild(channels);
      break;
    }
    case 'sonos-amp-x2':
    case 'sonos-amp-x4': {
      const amps = document.createElement('div');
      amps.className = 'panel-sonos-amps';
      const count = eq.id === 'sonos-amp-x2' ? 2 : 4;
      for (let i = 0; i < count; i++) {
        const unit = document.createElement('div');
        unit.className = 'panel-sonos-amp-unit';
        const label = document.createElement('span');
        label.textContent = 'SONOS';
        unit.appendChild(label);
        amps.appendChild(unit);
      }
      panel.appendChild(amps);
      break;
    }
    case 'generic-brush': {
      const brush = document.createElement('div');
      brush.className = 'panel-brush';
      panel.appendChild(brush);
      break;
    }
    case 'generic-vent': {
      const vents = document.createElement('div');
      vents.className = 'panel-vents';
      panel.appendChild(vents);
      break;
    }
    case 'generic-shelf': {
      const perf = document.createElement('div');
      perf.className = 'panel-perf';
      panel.appendChild(perf);
      break;
    }
    case 'generic-ups': {
      const lcd = document.createElement('div');
      lcd.className = 'panel-lcd';
      const lcdText = document.createElement('span');
      lcdText.textContent = '1500VA';
      lcd.appendChild(lcdText);
      panel.appendChild(lcd);
      const outlets = document.createElement('div');
      outlets.className = 'panel-outlets';
      for (let i = 0; i < 6; i++) {
        const outlet = document.createElement('div');
        outlet.className = 'panel-outlet';
        outlets.appendChild(outlet);
      }
      panel.appendChild(outlets);
      break;
    }
    case 'generic-blank':
      // Just solid color - nothing else needed
      break;
  }
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
  const b = Math.max(0, (num & 0x0000FF) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
