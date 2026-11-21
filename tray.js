// "まとめPDF" tray: generated sets kept with their exact arrangement so that one PDF
// can hold several kinds of sheets, each repeated `copies` times.
export const TRAY_KEY = 'visionTrainings.tray.v1', MAX_COPIES = 20;

export const itemPages = item => item.sheets.length * item.copies;
export const trayPages = items => items.reduce((sum, item) => sum + itemPages(item), 0);

// Each set is repeated as a whole (A, B, A, B), like collated printing.
export function expandTray(items) {
  return items.map(({ settings, sheets, copies }) => ({ settings, sheets: Array.from({ length: copies }, () => sheets).flat() }));
}

export function validTrayItem(item, validate) {
  try {
    if (!item || typeof item.id !== 'string' || !Array.isArray(item.sheets) || !item.sheets.length) return false;
    if (!Number.isInteger(item.copies) || item.copies < 1 || item.copies > MAX_COPIES) return false;
    validate({ ...item.settings, pages: item.sheets.length });
    return true;
  } catch { return false; }
}

export function loadTray(storage, validate) {
  try {
    const items = JSON.parse(storage.getItem(TRAY_KEY) || '[]');
    return Array.isArray(items) ? items.filter(item => validTrayItem(item, validate)) : [];
  } catch { return []; }
}

export function saveTray(storage, items) {
  try { storage.setItem(TRAY_KEY, JSON.stringify(items)); return true; } catch { return false; }
}

export function moveItem(items, index, delta) {
  const to = index + delta;
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
