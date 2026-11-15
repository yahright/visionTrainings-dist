import { FONT_DATA, FONT_CENTER, FONT_EXTENT } from './fonts/digits-font.js';
import { ANIMALS, animalUrl } from './animals.js';
import { SHAPES, SHAPE_STROKE_MIN, SHAPE_STROKE_MAX, shapePreviewSvg, makeShapePdf } from './shapes.js';
import { gridDimensions, validateGrid } from './grid.js';
import { rowColor, hexToRgb, validateRowColor } from './rows.js';
export const ROW_LINE_COLOR = '#555555', ROW_LINE_PT = 1;
export const PT_TO_MM = 25.4 / 72;

export async function loadPreviewFont() {
  const font = new FontFace('Sheet Digits UD', `url(data:font/ttf;base64,${FONT_DATA})`, { weight: '700' });
  await font.load();
  document.fonts.add(font);
}

export function validate(settings) {
  const { fontSize, gridSize, pages, mode = 'digits' } = settings;
  if (!['digits', 'animals', 'shapes'].includes(mode)) throw new Error('数字・動物・図形のどれかを選んでください。');
  if (!Number.isInteger(pages) || pages < 1 || pages > 100) throw new Error('枚数は1〜100枚で指定してください。');
  validateRowColor(settings.rowColor);
  const total = validateGrid(settings);
  if (mode === 'shapes') {
    if (!Array.isArray(settings.shapes) || settings.shapes.length < 2 || settings.shapes.length > SHAPES.length || new Set(settings.shapes).size !== settings.shapes.length || settings.shapes.some(id => !SHAPES.some(shape => shape.id === id))) throw new Error('図形を2種類以上選んでください。');
    if (total < settings.shapes.length) throw new Error('選んだ図形がすべて入るように、行数・列数を増やすか図形の種類を減らしてください。');
    if (!Number.isInteger(settings.shapeSize) || settings.shapeSize < 12 || settings.shapeSize > 23) throw new Error('図形の大きさは12〜23mmで指定してください。');
    if (settings.shapeStroke !== undefined && !(Number.isFinite(settings.shapeStroke) && settings.shapeStroke >= SHAPE_STROKE_MIN && settings.shapeStroke <= SHAPE_STROKE_MAX)) throw new Error(`線の太さは${SHAPE_STROKE_MIN}〜${SHAPE_STROKE_MAX}mmで指定してください。`);
    if (typeof settings.title !== 'string' || settings.title.length > 40 || !/^[\x20-\x7e]*$/.test(settings.title)) throw new Error('タイトルは半角英数字40文字以内で入力してください。');
    validateSheetCount(settings, total, pages);
    return;
  }
  if (!Number.isInteger(gridSize) || gridSize < 100 || gridSize > 190) throw new Error('グリッドの長い辺は100〜190mmで指定してください。');
  if (mode === 'animals') {
    if (![3, 4, 5].includes(settings.animalCount)) throw new Error('動物は3・4・5種類から選んでください。');
    if (!Array.isArray(settings.animals) || new Set(settings.animals).size !== settings.animalCount || settings.animals.length !== settings.animalCount || settings.animals.some(id => !ANIMALS.some(animal => animal.id === id))) throw new Error(`動物を${settings.animalCount}種類選んでください。`);
    if (total < settings.animals.length) throw new Error('選んだ動物がすべて入るように、行数・列数を増やしてください。');
    if (!Number.isInteger(settings.animalSize) || settings.animalSize < 40 || settings.animalSize > 95) throw new Error('動物の大きさは40〜95%で指定してください。');
  } else {
    if (!Number.isInteger(fontSize) || fontSize < 24 || fontSize > 124) throw new Error('文字サイズは24〜124ptで指定してください。');
    const { rows, cols } = gridDimensions(settings);
    const maxFont = Math.floor((gridSize / Math.max(rows, cols) - 4) / (FONT_EXTENT * PT_TO_MM));
    if (fontSize > maxFont) throw new Error(`このグリッドでは文字サイズを${maxFont}pt以下にしてください。`);
  }
  validateSheetCount(settings, total, pages);
}

function factorial(n) {
  let result = 1n;
  for (let i = 2; i <= n; i++) result *= BigInt(i);
  return result;
}

// Small grids can have fewer distinct sheets than the requested page count.
// Count them exactly so duplicate rejection cannot run forever.
function validateSheetCount(settings, total, count) {
  let possibilities;
  if (settings.mode === 'animals') {
    const k = settings.animals.length, partitions = Array(k + 1).fill(0n);
    partitions[0] = 1n;
    for (let n = 1; n <= total; n++) {
      for (let j = k; j >= 1; j--) partitions[j] = BigInt(j) * partitions[j] + partitions[j - 1];
      partitions[0] = 0n;
    }
    possibilities = partitions[k] * factorial(k);
  } else if (settings.mode === 'shapes') {
    const k = settings.shapes.length, base = Math.floor(total / k), extra = total % k;
    const arrangements = factorial(total) / (factorial(base + 1) ** BigInt(extra) * factorial(base) ** BigInt(k - extra));
    const choices = factorial(k) / (factorial(extra) * factorial(k - extra));
    possibilities = arrangements * choices * factorial(k);
  } else possibilities = 10n ** BigInt(total);
  if (BigInt(count) > possibilities) throw new Error(`この行数・列数では異なる並びは最大${possibilities}枚です。枚数を減らすか、行数・列数を増やしてください。`);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Each chosen shape appears as evenly as possible across the cells;
// the key below the rule shows every chosen shape once in a random order.
function createShapeSheet(shapes, total) {
  const base = Math.floor(total / shapes.length);
  const extra = shuffle([...shapes]).slice(0, total - base * shapes.length);
  const cells = shapes.flatMap(id => Array(base + (extra.includes(id) ? 1 : 0)).fill(id));
  return { cells: shuffle(cells), order: shuffle([...shapes]) };
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
  const total = validateGrid(settings);
  if (isAnimals || settings.mode === 'shapes') validate({ ...settings, pages: count });
  else validateSheetCount(settings, total, count);
  const sheets = [], seen = new Set();
  let attempts = 0;
  while (sheets.length < count) {
    if (++attempts > 10000) throw new Error('異なる並びを作りきれませんでした。枚数を減らすか、もう一度生成してください。');
    if (settings.mode === 'shapes') {
      const sheet = createShapeSheet(settings.shapes, total), key = JSON.stringify(sheet);
      if (!seen.has(key)) { seen.add(key); sheets.push(sheet); }
      continue;
    }
    // Ensure every chosen animal occurs at least once, then randomize positions.
    const pool = isAnimals ? settings.animals : Array.from({ length: 10 }, (_, i) => i);
    const items = isAnimals ? [...pool] : [];
    while (items.length < total) items.push(pool[randomIndex(pool.length)]);
    if (isAnimals) shuffle(items);
    const key = items.join(',');
    if (!seen.has(key)) { seen.add(key); sheets.push(items); }
  }
  return sheets;
}

export function layout(settings) {
  const { rows, cols } = gridDimensions(settings), cell = settings.gridSize / Math.max(rows, cols);
  const width = cols * cell, height = rows * cell;
  return { rows, cols, width, height, left: (210 - width) / 2, top: (297 - height) / 2, cell, sizeMm: settings.fontSize * PT_TO_MM };
}

export function previewSvg(settings, digits) {
  if (settings.mode === 'shapes') return shapePreviewSvg(settings, digits);
  const { rows, cols, width, height, left, top, cell, sizeMm } = layout(settings);
  let content = '<rect width="210" height="297" fill="white"/>';
  if (settings.lines) {
    for (let i = 0; i <= cols; i++) content += `<path d="M ${left+i*cell} ${top} v ${height}" fill="none" stroke="#a6a6a6" stroke-width="${0.5*PT_TO_MM}"/>`;
    for (let i = 0; i <= rows; i++) content += `<path d="M ${left} ${top+i*cell} h ${width}" fill="none" stroke="#a6a6a6" stroke-width="${0.5*PT_TO_MM}"/>`;
  }
  if (settings.mode === 'digits' && settings.rowLines) for (let i = 1; i < rows; i++) {
    content += `<path data-row-line d="M ${left} ${top+i*cell} h ${width}" fill="none" stroke="${ROW_LINE_COLOR}" stroke-width="${ROW_LINE_PT*PT_TO_MM}"/>`;
  }
  digits.forEach((digit, i) => {
    if (settings.mode === 'animals') {
      const side = cell * settings.animalSize / 100;
      const x = left + (i % cols + .5) * cell - side / 2;
      const y = top + (Math.floor(i / cols) + .5) * cell - side / 2;
      const label = ANIMALS.find(animal => animal.id === digit).label;
      content += `<image href="${animalUrl(digit)}" x="${x}" y="${y}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet" data-animal="${digit}" role="img" aria-label="${label}"/>`;
      return;
    }
    const x = left + (i % cols + .5) * cell;
    const y = top + (Math.floor(i / cols) + .5) * cell + sizeMm * FONT_CENTER;
    content += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Sheet Digits UD" font-weight="700" font-size="${sizeMm}" fill="${rowColor(settings.rowColor, Math.floor(i / cols))}">${digit}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" role="img" aria-label="${settings.mode === 'animals' ? '動物' : '数字'}${rows * cols}個、${rows}行×${cols}列のA4シート">${content}</svg>`;
}

export function makePdf(jsPDF, settings, sheets, animalImages = {}) {
  if (settings.mode === 'shapes') return makeShapePdf(jsPDF, settings, sheets);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const isAnimals = settings.mode === 'animals';
  if (!isAnimals) {
    doc.addFileToVFS('SheetDigitsUD-Bold.ttf', FONT_DATA);
    doc.addFont('SheetDigitsUD-Bold.ttf', 'Sheet Digits UD', 'bold');
  }
  const { rows, cols, width, height, left, top, cell, sizeMm } = layout(settings);
  doc.setProperties({ title: `Random ${isAnimals ? 'animals' : 'digits'} - A4 ${rows}x${cols} grid` });
  sheets.forEach((digits, page) => {
    if (page) doc.addPage();
    if (settings.lines) {
      doc.setDrawColor(166); doc.setLineWidth(.5 * PT_TO_MM);
      for (let i = 0; i <= cols; i++) doc.line(left + i * cell, top, left + i * cell, top + height);
      for (let i = 0; i <= rows; i++) doc.line(left, top + i * cell, left + width, top + i * cell);
    }
    if (!isAnimals && settings.rowLines) {
      doc.setDrawColor(...hexToRgb(ROW_LINE_COLOR)); doc.setLineWidth(ROW_LINE_PT * PT_TO_MM);
      for (let i = 1; i < rows; i++) doc.line(left, top + i * cell, left + width, top + i * cell);
    }
    if (!isAnimals) { doc.setFont('Sheet Digits UD', 'bold'); doc.setFontSize(settings.fontSize); }
    digits.forEach((digit, i) => {
      if (isAnimals) {
        const asset = animalImages[digit];
        if (!asset) throw new Error('動物の絵が見つかりません。生成し直してください。');
        const side = cell * settings.animalSize / 100;
        // Match SVG's aspect-ratio preserving image placement.
        const ratio = asset.naturalWidth / asset.naturalHeight;
        const width = ratio >= 1 ? side : side * ratio;
        const height = ratio >= 1 ? side / ratio : side;
        doc.addImage(asset, 'PNG', left + (i % cols + .5) * cell - width / 2,
          top + (Math.floor(i / cols) + .5) * cell - height / 2, width, height, digit, 'FAST');
        return;
      }
      doc.setTextColor(...hexToRgb(rowColor(settings.rowColor, Math.floor(i / cols))));
      doc.text(String(digit), left + (i % cols + .5) * cell, top + (Math.floor(i / cols) + .5) * cell + sizeMm * FONT_CENTER, { align: 'center' });
    });
  });
  return doc;
}
