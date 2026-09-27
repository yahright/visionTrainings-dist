import { FONT_DATA, FONT_CENTER, FONT_EXTENT } from './fonts/digits-font.js';
import { ANIMALS, animalUrl } from './animals.js';
export const PT_TO_MM = 25.4 / 72;

export async function loadPreviewFont() {
  const font = new FontFace('Sheet Digits UD', `url(data:font/ttf;base64,${FONT_DATA})`, { weight: '700' });
  await font.load();
  document.fonts.add(font);
}

export function validate(settings) {
  const { fontSize, gridSize, pages, mode = 'digits' } = settings;
  if (!['digits', 'animals'].includes(mode)) throw new Error('数字または動物を選んでください。');
  if (!Number.isInteger(gridSize) || gridSize < 100 || gridSize > 190) throw new Error('グリッドの一辺は100〜190mmで指定してください。');
  if (!Number.isInteger(pages) || pages < 1 || pages > 100) throw new Error('枚数は1〜100枚で指定してください。');
  if (mode === 'animals') {
    if (![3, 4, 5].includes(settings.animalCount)) throw new Error('動物は3・4・5種類から選んでください。');
    if (!Array.isArray(settings.animals) || new Set(settings.animals).size !== settings.animalCount || settings.animals.length !== settings.animalCount || settings.animals.some(id => !ANIMALS.some(animal => animal.id === id))) throw new Error(`動物を${settings.animalCount}種類選んでください。`);
    if (!Number.isInteger(settings.animalSize) || settings.animalSize < 40 || settings.animalSize > 95) throw new Error('動物の大きさは40〜95%で指定してください。');
  } else {
    if (!Number.isInteger(fontSize) || fontSize < 24 || fontSize > 124) throw new Error('文字サイズは24〜124ptで指定してください。');
    const maxFont = Math.floor((gridSize / 5 - 4) / (FONT_EXTENT * PT_TO_MM));
    if (fontSize > maxFont) throw new Error(`このグリッドでは文字サイズを${maxFont}pt以下にしてください。`);
  }
}

function randomIndex(length) {
  const limit = 256 - (256 % length);
  let value;
  do { value = crypto.getRandomValues(new Uint8Array(1))[0]; } while (value >= limit);
  return value % length;
}

export function createSheets(count, settings = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('枚数は1〜100枚で指定してください。');
  const isAnimals = settings.mode === 'animals';
  if (isAnimals) validate({ ...settings, pages: count });
  const sheets = [], seen = new Set();
  while (sheets.length < count) {
    // Ensure every chosen animal occurs at least once, then randomize positions.
    const pool = isAnimals ? settings.animals : Array.from({ length: 10 }, (_, i) => i);
    const items = isAnimals ? [...pool] : [];
    while (items.length < 25) items.push(pool[randomIndex(pool.length)]);
    if (isAnimals) for (let i = items.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    const key = items.join(',');
    if (!seen.has(key)) { seen.add(key); sheets.push(items); }
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
    if (settings.mode === 'animals') {
      const side = cell * settings.animalSize / 100;
      const x = left + (i % 5 + .5) * cell - side / 2;
      const y = top + (Math.floor(i / 5) + .5) * cell - side / 2;
      const label = ANIMALS.find(animal => animal.id === digit).label;
      content += `<image href="${animalUrl(digit)}" x="${x}" y="${y}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet" data-animal="${digit}" role="img" aria-label="${label}"/>`;
      return;
    }
    const x = left + (i % 5 + .5) * cell;
    const y = top + (Math.floor(i / 5) + .5) * cell + sizeMm * FONT_CENTER;
    content += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Sheet Digits UD" font-weight="700" font-size="${sizeMm}" fill="black">${digit}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" role="img" aria-label="${settings.mode === 'animals' ? '動物' : '数字'}25個のA4シート">${content}</svg>`;
}

export function makePdf(jsPDF, settings, sheets, animalImages = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const isAnimals = settings.mode === 'animals';
  if (!isAnimals) {
    doc.addFileToVFS('SheetDigitsUD-Bold.ttf', FONT_DATA);
    doc.addFont('SheetDigitsUD-Bold.ttf', 'Sheet Digits UD', 'bold');
  }
  const { left, top, cell, sizeMm } = layout(settings);
  doc.setProperties({ title: `Random ${isAnimals ? 'animals' : 'digits'} - A4 square 5x5 grid` });
  sheets.forEach((digits, page) => {
    if (page) doc.addPage();
    if (settings.lines) {
      doc.setDrawColor(166); doc.setLineWidth(.5 * PT_TO_MM);
      for (let i = 0; i <= 5; i++) {
        doc.line(left + i * cell, top, left + i * cell, top + settings.gridSize);
        doc.line(left, top + i * cell, left + settings.gridSize, top + i * cell);
      }
    }
    if (!isAnimals) { doc.setFont('Sheet Digits UD', 'bold'); doc.setFontSize(settings.fontSize); doc.setTextColor(0); }
    digits.forEach((digit, i) => {
      if (isAnimals) {
        const asset = animalImages[digit];
        if (!asset) throw new Error('動物の絵が見つかりません。生成し直してください。');
        const side = cell * settings.animalSize / 100;
        // Match SVG's aspect-ratio preserving image placement.
        const ratio = asset.naturalWidth / asset.naturalHeight;
        const width = ratio >= 1 ? side : side * ratio;
        const height = ratio >= 1 ? side / ratio : side;
        doc.addImage(asset, 'PNG', left + (i % 5 + .5) * cell - width / 2,
          top + (Math.floor(i / 5) + .5) * cell - height / 2, width, height, digit, 'FAST');
        return;
      }
      doc.text(String(digit), left + (i % 5 + .5) * cell, top + (Math.floor(i / 5) + .5) * cell + sizeMm * FONT_CENTER, { align: 'center' });
    });
  });
  return doc;
}
