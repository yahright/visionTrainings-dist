// Per-row coloring to help the eye stay on one row.
// 'none': all black / 'zebra': black and blue alternate / 'rows': every row its own color.
export const ROW_COLOR_MODES = ['none', 'zebra', 'rows'];
const ZEBRA = ['#000000', '#1f4fd1'];
const ROWS = ['#000000', '#d0312d', '#1f4fd1', '#14833b', '#8a3fbf'];

export function rowColor(mode = 'none', row) {
  if (mode === 'zebra') return ZEBRA[row % ZEBRA.length];
  if (mode === 'rows') return ROWS[row % ROWS.length];
  return '#000000';
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}

export function validateRowColor(mode) {
  if (mode !== undefined && !ROW_COLOR_MODES.includes(mode)) throw new Error('行の色は「なし・ゼブラ・行ごとに別の色」から選んでください。');
}
