import type { Brand, Equipment } from '../models/types.ts';
import { equipmentCatalog, getEquipmentByBrand } from '../data/equipment.ts';

const brands: { key: Brand; label: string }[] = [
  { key: 'unifi', label: 'UniFi' },
  { key: 'control4', label: 'Control4' },
  { key: 'sonos', label: 'Sonos' },
  { key: 'generic', label: 'Generic' },
];

export function createSidebar(): HTMLElement {
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';

  const title = document.createElement('div');
  title.className = 'sidebar-title';
  title.textContent = 'Equipment Library';
  sidebar.appendChild(title);

  // Brand tabs
  const tabs = document.createElement('div');
  tabs.className = 'brand-tabs';

  const list = document.createElement('div');
  list.className = 'equipment-list';

  let activeBrand: Brand = 'unifi';

  function renderList(brand: Brand) {
    list.innerHTML = '';
    const items = getEquipmentByBrand(brand);
    for (const eq of items) {
      list.appendChild(createEquipmentCard(eq));
    }
  }

  for (const b of brands) {
    const tab = document.createElement('button');
    tab.className = `brand-tab${b.key === activeBrand ? ' active' : ''}`;
    tab.dataset.brand = b.key;
    tab.textContent = b.label;
    tab.addEventListener('click', () => {
      activeBrand = b.key;
      tabs.querySelectorAll('.brand-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderList(b.key);
    });
    tabs.appendChild(tab);
  }

  sidebar.appendChild(tabs);
  renderList(activeBrand);
  sidebar.appendChild(list);

  // "All" count
  const countDiv = document.createElement('div');
  countDiv.className = 'sidebar-title';
  countDiv.style.paddingBottom = '12px';
  countDiv.textContent = `${equipmentCatalog.length} items total`;
  sidebar.appendChild(countDiv);

  return sidebar;
}

function createEquipmentCard(eq: Equipment): HTMLElement {
  const card = document.createElement('div');
  card.className = 'equipment-card';
  card.draggable = true;

  card.addEventListener('dragstart', (e) => {
    e.dataTransfer!.setData('application/equipment-id', eq.id);
    e.dataTransfer!.effectAllowed = 'copy';
    card.style.opacity = '0.5';
  });

  card.addEventListener('dragend', () => {
    card.style.opacity = '1';
  });

  // Header
  const header = document.createElement('div');
  header.className = 'equipment-card-header';

  const name = document.createElement('span');
  name.className = 'equipment-card-name';
  name.textContent = eq.name;

  const ru = document.createElement('span');
  ru.className = 'equipment-card-ru';
  ru.textContent = `${eq.ruSize}U`;

  header.appendChild(name);
  header.appendChild(ru);
  card.appendChild(header);

  // Meta
  const meta = document.createElement('div');
  meta.className = 'equipment-card-meta';

  const cat = document.createElement('span');
  cat.textContent = eq.category;

  const power = document.createElement('span');
  power.textContent = eq.powerDraw > 0 ? `${eq.powerDraw}W` : 'passive';

  meta.appendChild(cat);
  meta.appendChild(power);
  card.appendChild(meta);

  // Preview bar
  const preview = document.createElement('div');
  preview.className = 'equipment-card-preview';
  preview.style.background = `linear-gradient(90deg, ${eq.color}, ${eq.accentColor})`;
  card.appendChild(preview);

  return card;
}
