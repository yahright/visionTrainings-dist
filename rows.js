// Per-row coloring to help the eye stay on one row.
// 'none': all black / 'zebra': black and blue alternate / 'rows': every row its own color /
// 'custom': colors chosen per row (settings.rowColors, color ids; repeats if rows outnumber it).
export const ROW_COLOR_MODES = ['none', 'zebra', 'rows', 'custom'];
export const COLORS = [
  { id: 'black', label: '黒', hex: '#000000' },
  { id: 'red', label: '赤', hex: '#d0312d' },
  { id: 'blue', label: '青', hex: '#1f4fd1' },
  { id: 'purple', label: '紫', hex: '#8a3fbf' },
  { id: 'green', label: '緑', hex: '#14833b' },
  { id: 'pink', label: 'ピンク', hex: '#e5508f' },
  { id: 'yellow', label: '黄色', hex: '#e6b800' },
  { id: 'brown', label: '茶色', hex: '#8b5a2b' },
  { id: 'orange', label: 'オレンジ', hex: '#f07800' },
];
export const MAX_ROW_COLORS = 5;
export const DEFAULT_ROW_COLORS = ['black', 'red', 'blue', 'green', 'purple'];
const HEX = Object.fromEntries(COLORS.map(c => [c.id, c.hex]));
const ZEBRA = ['#000000', '#1f4fd1'];
const ROWS = DEFAULT_ROW_COLORS.map(id => HEX[id]);

export function rowColor(mode = 'none', row, custom = DEFAULT_ROW_COLORS) {
  if (mode === 'zebra') return ZEBRA[row % ZEBRA.length];
  if (mode === 'rows') return ROWS[row % ROWS.length];
  if (mode === 'custom') return HEX[custom[row % custom.length]];
  return '#000000';
}

export const colorLabel = id => COLORS.find(c => c.id === id)?.label;

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}

export function validateRowColor(mode, custom) {
  if (mode !== undefined && !ROW_COLOR_MODES.includes(mode)) throw new Error('行の色は「なし・ゼブラ・行ごとに別の色・行ごとに色を指定」から選んでください。');
  if (mode === 'custom' && !(Array.isArray(custom) && custom.length >= 1 && custom.length <= MAX_ROW_COLORS && custom.every(id => id in HEX))) {
    throw new Error(`行ごとの色は${COLORS.map(c => c.label).join('・')}から選んでください。`);
  }
}
