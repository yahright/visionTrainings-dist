// "shape touch" worksheet: outline shapes in a 5 x 10 grid on A4 landscape,
// with the touch order shown below a double rule.
import { rowColor, hexToRgb } from './rows.js';
export const SHAPES = [
  { id: 'triangle', label: '三角' },
  { id: 'circle', label: '丸' },
  { id: 'square', label: '四角' },
  { id: 'diamond', label: 'ひし形' },
  { id: 'star', label: '星' },
];
export const SHAPE_ROWS = 5, SHAPE_COLS = 10;
const PAGE_W = 297, PAGE_H = 210, PITCH_X = 27, PITCH_Y = 27, FIRST_ROW = 32;
const TITLE_Y = 15, RULE_Y = 168, RULE_GAP = 2, RULE_LEFT = 19, KEY_Y = 185, KEY_PITCH = 29;
export const SHAPE_STROKE = 0.3;

// Outline of a shape whose nominal size is `size` mm, centered at (cx, cy).
// Circles are { circle: r }; everything else is a closed polygon.
export function shapeOutline(id, cx, cy, size) {
  if (id === 'circle') return { circle: size / 2, cx, cy };
  let points;
  if (id === 'square') {
    const h = size * 0.92 / 2;
    points = [[-h, -h], [h, -h], [h, h], [-h, h]];
  } else if (id === 'triangle') {
    const w = size * 1.12 / 2, h = size * 0.97 / 2;
    points = [[0, -h], [w, h], [-w, h]];
  } else if (id === 'diamond') {
    const w = size * 0.5, h = size * 0.56;
    points = [[0, -h], [w, 0], [0, h], [-w, 0]];
  } else if (id === 'star') {
    const outer = size * 0.58, inner = outer * 0.42;
    points = Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? inner : outer, a = -Math.PI / 2 + i * Math.PI / 5;
      return [r * Math.cos(a), r * Math.sin(a)];
    });
    // Center the star's bounding box vertically.
    const ys = points.map(p => p[1]), dy = -(Math.min(...ys) + Math.max(...ys)) / 2;
    points = points.map(([x, y]) => [x, y + dy]);
  } else throw new Error('不明な図形です。');
  return { points: points.map(([x, y]) => [cx + x, cy + y]) };
}

export function shapeLayout() {
  const left = PAGE_W / 2 - (SHAPE_COLS - 1) / 2 * PITCH_X;
  const cells = Array.from({ length: SHAPE_ROWS * SHAPE_COLS }, (_, i) => [left + (i % SHAPE_COLS) * PITCH_X, FIRST_ROW + Math.floor(i / SHAPE_COLS) * PITCH_Y]);
  const keyLeft = (count) => PAGE_W / 2 - (count - 1) / 2 * KEY_PITCH;
  return { cells, keyLeft, KEY_Y, KEY_PITCH, TITLE_Y, RULE_Y, RULE_GAP, RULE_LEFT, PAGE_W, PAGE_H };
}

export function shapeIcon(id) {
  return `<svg viewBox="0 0 30 30" width="54" height="54" aria-hidden="true">${outlineSvg(shapeOutline(id, 15, 15, 22), 1.2)}</svg>`;
}

function outlineSvg(outline, stroke, color = 'black') {
  const style = `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="miter"`;
  if (outline.circle) return `<circle cx="${outline.cx}" cy="${outline.cy}" r="${outline.circle}" ${style}/>`;
  return `<polygon points="${outline.points.map(p => p.map(v => +v.toFixed(3)).join(',')).join(' ')}" ${style}/>`;
}

function escapeXml(text) {
  return text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

export function shapePreviewSvg(settings, sheet) {
  const L = shapeLayout();
  let content = `<rect width="${L.PAGE_W}" height="${L.PAGE_H}" fill="white"/>`;
  if (settings.title) content += `<text x="${L.PAGE_W / 2}" y="${L.TITLE_Y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${12 * 25.4 / 72}" fill="black">${escapeXml(settings.title)}</text>`;
  sheet.cells.forEach((id, i) => {
    content += `<g data-shape="${id}">${outlineSvg(shapeOutline(id, ...L.cells[i], settings.shapeSize), SHAPE_STROKE, rowColor(settings.rowColor, Math.floor(i / SHAPE_COLS)))}</g>`;
  });
  for (const y of [L.RULE_Y, L.RULE_Y + L.RULE_GAP]) content += `<path d="M ${L.RULE_LEFT} ${y} H ${L.PAGE_W - L.RULE_LEFT}" stroke="black" stroke-width="${SHAPE_STROKE}"/>`;
  const keyLeft = L.keyLeft(sheet.order.length);
  sheet.order.forEach((id, i) => {
    content += `<g data-key="${id}">${outlineSvg(shapeOutline(id, keyLeft + i * L.KEY_PITCH, L.KEY_Y, settings.shapeSize), SHAPE_STROKE)}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.PAGE_W} ${L.PAGE_H}" role="img" aria-label="図形タッチのA4横シート">${content}</svg>`;
}

function drawOutline(doc, outline) {
  if (outline.circle) { doc.circle(outline.cx, outline.cy, outline.circle, 'S'); return; }
  const [first, ...rest] = outline.points;
  let [px, py] = first;
  const deltas = rest.map(([x, y]) => { const d = [x - px, y - py]; px = x; py = y; return d; });
  doc.lines(deltas, first[0], first[1], [1, 1], 'S', true);
}

export function makeShapePdf(jsPDF, settings, sheets) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  const L = shapeLayout();
  doc.setProperties({ title: `${settings.title || 'shape touch'} - A4 landscape 5x10` });
  sheets.forEach((sheet, page) => {
    if (page) doc.addPage('a4', 'landscape');
    doc.setDrawColor(0); doc.setLineWidth(SHAPE_STROKE); doc.setLineJoin('miter');
    if (settings.title) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(0);
      doc.text(settings.title, L.PAGE_W / 2, L.TITLE_Y, { align: 'center' });
    }
    sheet.cells.forEach((id, i) => {
      doc.setDrawColor(...hexToRgb(rowColor(settings.rowColor, Math.floor(i / SHAPE_COLS))));
      drawOutline(doc, shapeOutline(id, ...L.cells[i], settings.shapeSize));
    });
    doc.setDrawColor(0);
    for (const y of [L.RULE_Y, L.RULE_Y + L.RULE_GAP]) doc.line(L.RULE_LEFT, y, L.PAGE_W - L.RULE_LEFT, y);
    const keyLeft = L.keyLeft(sheet.order.length);
    sheet.order.forEach((id, i) => drawOutline(doc, shapeOutline(id, keyLeft + i * L.KEY_PITCH, L.KEY_Y, settings.shapeSize)));
  });
  return doc;
}
