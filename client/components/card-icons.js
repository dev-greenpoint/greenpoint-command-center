// Small curated set of monochrome line icons for Strategy Builder card-grid
// blocks. Plain SVG (no icon font/library) so it stays dependency-free and
// colors via currentColor to match either host page's theme. Loaded as a
// plain <script src> alongside strategy-render.js — used by the builder
// (icon picker) and the shared renderer (card-grid output) alike.

const CARD_ICON_SET = {
  target:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  growth:     '<polyline points="4,17 10,11 14,15 20,6"/><polyline points="14,6 20,6 20,12"/>',
  idea:       '<circle cx="12" cy="10" r="6"/><line x1="10" y1="18" x2="14" y2="18"/><line x1="11" y1="21" x2="13" y2="21"/><line x1="12" y1="16" x2="12" y2="18"/>',
  audience:   '<circle cx="9" cy="9" r="3.5"/><circle cx="16" cy="9" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M13 20a5 5 0 0 1 9 0"/>',
  calendar:   '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
  star:       '<polygon points="12,3 14.8,9.2 21.5,9.8 16.5,14.2 18,21 12,17.3 6,21 7.5,14.2 2.5,9.8 9.2,9.2"/>',
  success:    '<circle cx="12" cy="12" r="9"/><polyline points="8,12.5 11,15.5 16,9"/>',
  link:       '<rect x="2" y="8" width="11" height="8" rx="4"/><rect x="11" y="8" width="11" height="8" rx="4"/>',
  globe:      '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/>',
  heart:      '<path d="M12 21s-7-4.5-9.5-9C1 8.5 2.5 4 7 4c2.2 0 4 1.3 5 3 1-1.7 2.8-3 5-3 4.5 0 6 4.5 4.5 8-2.5 4.5-9.5 9-9.5 9z"/>',
  milestone:  '<line x1="5" y1="3" x2="5" y2="21"/><path d="M5 4h13l-3 4 3 4H5"/>',
  shield:     '<path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/>',
  clock:      '<circle cx="12" cy="12" r="9"/><line x1="12" y1="12" x2="12" y2="7"/><line x1="12" y1="12" x2="16" y2="14"/>',
  budget:     '<ellipse cx="12" cy="8" rx="7" ry="3"/><path d="M5 8v5c0 1.7 3.1 3 7 3s7-1.3 7-3V8"/><path d="M5 13v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  design:     '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-.5-1.5-.5-2.5c0-1 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9.5-8z"/><circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none"/>',
  analytics:  '<line x1="4" y1="21" x2="20" y2="21"/><rect x="6" y="13" width="3" height="8"/><rect x="11" y="9" width="3" height="12"/><rect x="16" y="5" width="3" height="16"/>',
  compass:    '<circle cx="12" cy="12" r="9"/><polygon points="15,9 13,13 9,15 11,11"/>',
  award:      '<circle cx="12" cy="8" r="5"/><polyline points="9,12.5 7,21 12,18 17,21 15,12.5"/>',
  message:    '<rect x="3" y="5" width="18" height="12" rx="3"/><polyline points="8,17 8,21 12,17"/>',
  layers:     '<polygon points="12,4 21,9 12,14 3,9"/><polyline points="3,14 12,19 21,14"/>',
};

function renderCardIcon(id, size) {
  const inner = CARD_ICON_SET[id];
  if (!inner) return '';
  const s = size || 24;
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
