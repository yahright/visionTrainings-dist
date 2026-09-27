import { FONT_DATA, FONT_CENTER, FONT_EXTENT } from './fonts/digits-font.js';
export const PT_TO_MM = 25.4 / 72;

export async function loadPreviewFont() {
  const font = new FontFace('Sheet Digits UD', `url(data:font/ttf;base64,${FONT_DATA})`, { weight: '700' });
  await font.load();
  document.fonts.add(font);
}

export function validate(settings) {
  const { fontSize, gridSize, pages } = settings;
  if (!Number.isInteger(fontSize) || fontSize < 24 || fontSize > 124) throw new Error('文字サイズは24〜124ptで指定してください。');
  if (!Number.isInteger(gridSize) || gridSize < 100 || gridSize > 190) throw new Error('グリッドの一辺は100〜190mmで指定してください。');
  if (!Number.isInteger(pages) || pages < 1 || pages > 100) throw new Error('枚数は1〜100枚で指定してください。');
  const maxFont = Math.floor((gridSize / 5 - 4) / (FONT_EXTENT * PT_TO_MM));
  if (fontSize > maxFont) throw new Error(`このグリッドでは文字サイズを${maxFont}pt以下にしてください。`);
}

export function createSheets(count) {
  const sheets = [], seen = new Set();
  while (sheets.length < count) {
    const digits = [];
    while (digits.length < 25) {
      const values = crypto.getRandomValues(new Uint8Array(32));
      for (const value of values) {
        if (value < 250) digits.push(value % 10);
        if (digits.length === 25) break;
      }
    }
    const key = digits.join('');
    if (!seen.has(key)) { seen.add(key); sheets.push(digits); }
  }
  return sheets;
}

export function layout(settings) {
  return { left: (210 - settings.gridSize) / 2, top: (297 - settings.gridSize) / 2, cell: settings.gridSize / 5, sizeMm: settings.fontSize * PT_TO_MM };
}

export function previewSvg(settings, digits) {
  const { left, top, cell, sizeMm } = layout(settings);
  let content = '<rect width="210" height="297" fill="white"/>';
  if (settings.lines) for (let i = 0; i <= 5; i++) {
    content += `<path d="M ${left+i*cell} ${top} v ${settings.gridSize} M ${left} ${top+i*cell} h ${settings.gridSize}" fill="none" stroke="#a6a6a6" stroke-width="${0.5*PT_TO_MM}"/>`;
  }
  digits.forEach((digit, i) => {
    const x = left + (i % 5 + .5) * cell;
    const y = top + (Math.floor(i / 5) + .5) * cell + sizeMm * FONT_CENTER;
    content += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Sheet Digits UD" font-weight="700" font-size="${sizeMm}" fill="black">${digit}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" role="img" aria-label="数字25個のA4シート">${content}</svg>`;
}

export function makePdf(jsPDF, settings, sheets) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.addFileToVFS('SheetDigitsUD-Bold.ttf', FONT_DATA);
  doc.addFont('SheetDigitsUD-Bold.ttf', 'Sheet Digits UD', 'bold');
  const { left, top, cell, sizeMm } = layout(settings);
  doc.setProperties({ title: 'Random digits - A4 square 5x5 grid' });
  sheets.forEach((digits, page) => {
    if (page) doc.addPage();
    if (settings.lines) {
      doc.setDrawColor(166); doc.setLineWidth(.5 * PT_TO_MM);
      for (let i = 0; i <= 5; i++) {
        doc.line(left + i * cell, top, left + i * cell, top + settings.gridSize);
        doc.line(left, top + i * cell, left + settings.gridSize, top + i * cell);
      }
    }
    doc.setFont('Sheet Digits UD', 'bold'); doc.setFontSize(settings.fontSize); doc.setTextColor(0);
    digits.forEach((digit, i) => {
      doc.text(String(digit), left + (i % 5 + .5) * cell, top + (Math.floor(i / 5) + .5) * cell + sizeMm * FONT_CENTER, { align: 'center' });
    });
  });
  return doc;
}
