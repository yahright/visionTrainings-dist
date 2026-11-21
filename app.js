import { validate, createSheets, previewSvg, makePdf, makeCombinedPdf, orientationOf, MAX_COMBINED_PAGES, loadPreviewFont } from './core.js';
import { MAX_COPIES, itemPages, trayPages, expandTray, loadTray, saveTray, moveItem } from './tray.js';
import { ANIMALS, animalUrl, loadAnimalImages } from './animals.js';
import { SHAPES, shapeIcon, shapeMaxSize } from './shapes.js';
import { gridDimensions } from './grid.js';
import { COLORS, DEFAULT_ROW_COLORS, colorLabel as rowColorName } from './rows.js';
const $ = id => document.getElementById(id);
let generated = null, page = 0;
const fontReady = loadPreviewFont().then(() => true, () => false);
const dimensionsByMode = { digits: { rows: 5, cols: 5 }, animals: { rows: 5, cols: 5 }, shapes: { rows: 5, cols: 10 } };
function showShapeSizeRange(rows, cols) {
  if ($('sheet-mode').value !== 'shapes' || !(rows >= 1 && rows <= 5 && cols >= 1 && cols <= 10)) return;
  const stroke = Number($('shape-stroke').value);
  const gap = id => { if ($(`${id}-auto`).checked) return 'auto'; const v = Number($(id).value); return v >= 0 && v <= 50 ? v : undefined; };
  const max = shapeMaxSize({ mode: 'shapes', rows, cols, shapeStroke: stroke >= 0.2 && stroke <= 3 ? stroke : undefined, shapeGapX: gap('shape-gap-x'), shapeGapY: gap('shape-gap-y') });
  if (max < 12) { $('shape-size-range').textContent = '間隔が広すぎます。間隔を狭くしてください'; return; }
  $('shape-size').max = max;
  if (Number($('shape-size').value) > max) $('shape-size').value = max;
  $('shape-size-range').textContent = `12〜${max}mm（行・列が少なく、線が細く、間隔が狭いほど大きくできます）`;
}
function showGridCount() {
  const rows = Number($('grid-rows').value), cols = Number($('grid-cols').value);
  dimensionsByMode[$('sheet-mode').value] = { rows, cols };
  showShapeSizeRange(rows, cols);
  $('grid-count').textContent = Number.isInteger(rows) && rows >= 1 && rows <= 5 && Number.isInteger(cols) && cols >= 1 && cols <= Number($('grid-cols').max)
    ? `${rows}行×${cols}列＝${rows * cols}個` : '行数・列数を範囲内の整数で指定してください。';
}
for (const id of ['grid-rows', 'grid-cols', 'shape-stroke', 'shape-gap-x', 'shape-gap-y']) $(id).addEventListener('input', showGridCount);
// Per-row color pickers (one per row) shown when 「行ごとに色を指定」 is chosen.
const customRowColors = [...DEFAULT_ROW_COLORS];
const hexOf = id => COLORS.find(c => c.id === id).hex;
function renderRowColorPickers() {
  const custom = $('row-color').value === 'custom' && !$('row-color').disabled;
  $('row-color-custom').hidden = !custom;
  if (!custom) return;
  const rows = Math.min(5, Math.max(1, Number($('grid-rows').value) || 1));
  $('row-color-custom').innerHTML = customRowColors.slice(0, rows).map((id, row) =>
    `<label class="row-color-pick"><span>${row + 1}行目</span><i class="swatch" style="background:${hexOf(id)}"></i><select data-row="${row}" aria-label="${row + 1}行目の色">${COLORS.map(c => `<option value="${c.id}"${c.id === id ? ' selected' : ''}>${c.label}</option>`).join('')}</select></label>`).join('');
}
$('row-color').addEventListener('change', renderRowColorPickers);
$('grid-rows').addEventListener('input', renderRowColorPickers);
$('row-color-custom').addEventListener('change', event => {
  const select = event.target.closest('select[data-row]');
  if (!select) return;
  customRowColors[Number(select.dataset.row)] = select.value;
  select.previousElementSibling.style.background = hexOf(select.value);
});
const readRowColors = () => customRowColors.slice(0, Math.min(5, Math.max(1, Number($('grid-rows').value) || 1)));
for (const id of ['shape-gap-x', 'shape-gap-y']) $(`${id}-auto`).addEventListener('change', () => { $(id).disabled = $(`${id}-auto`).checked; showGridCount(); });
const readGap = id => $(`${id}-auto`).checked ? 'auto' : Number($(id).value);
const gapLabel = gap => gap === 'auto' ? '自動' : `${gap}mm`;
$('animal-choices').innerHTML = ANIMALS.map((animal, i) => `<label class="animal-choice"><input type="checkbox" name="animal" value="${animal.id}" ${i < 3 ? 'checked' : ''}><img src="${animalUrl(animal.id)}" alt="" width="64" height="64"><span>${animal.label}</span></label>`).join('');
$('shape-choices').innerHTML = SHAPES.map((shape, i) => `<label class="animal-choice"><input type="checkbox" name="shape" value="${shape.id}" ${i < 3 ? 'checked' : ''}>${shapeIcon(shape.id)}<span>${shape.label}</span></label>`).join('');
function selectedShapes() { return [...document.querySelectorAll('input[name="shape"]:checked')].map(input => input.value); }
function showShapeSelection() { $('shape-selection').textContent = `2種類以上を選択：現在${selectedShapes().length}種類`; }
$('shape-choices').addEventListener('change', showShapeSelection);
function selectedAnimals() { return [...document.querySelectorAll('input[name="animal"]:checked')].map(input => input.value); }
function showSelection() { $('animal-selection').textContent = `${$('animal-count').value}種類を選択：現在${selectedAnimals().length}種類`; }
function syncMode() {
  const mode = $('sheet-mode').value, animals = mode === 'animals', shapes = mode === 'shapes';
  $('grid-rows').value = dimensionsByMode[mode].rows;
  $('grid-cols').max = shapes ? 10 : 5;
  $('grid-cols').value = dimensionsByMode[mode].cols;
  showGridCount();
  $('animal-options').hidden = !animals;
  $('animal-options').disabled = !animals;
  $('shape-options').hidden = !shapes;
  $('shape-options').disabled = !shapes;
  $('font-field').hidden = mode !== 'digits';
  $('font-size').disabled = mode !== 'digits';
  for (const id of ['grid-field', 'lines-field']) $(id).hidden = shapes;
  $('row-color-field').hidden = $('row-color').disabled = animals;
  $('row-lines-field').hidden = $('row-lines').disabled = mode !== 'digits';
  $('grid-size').disabled = $('grid-lines').disabled = shapes;
  $('print-note').textContent = `印刷は「A4・${shapes ? '横' : '縦'}・実際のサイズ（100%）」で。`;
  showSelection(); showShapeSelection(); renderRowColorPickers();
}
$('sheet-mode').addEventListener('change', syncMode);
$('animal-count').addEventListener('change', () => {
  const count = Number($('animal-count').value);
  const selection = selectedAnimals().slice(0, count);
  for (const animal of ANIMALS) if (selection.length < count && !selection.includes(animal.id)) selection.push(animal.id);
  document.querySelectorAll('input[name="animal"]').forEach(input => { input.checked = selection.includes(input.value); });
  showSelection();
});
$('animal-choices').addEventListener('change', showSelection);
syncMode();
const readRowColor = () => $('row-color').value === 'custom' ? { rowColor: 'custom', rowColors: readRowColors() } : { rowColor: $('row-color').value };
function readSettings() {
  const dimensions = { rows: Number($('grid-rows').value), cols: Number($('grid-cols').value) };
  if ($('sheet-mode').value === 'shapes') return { ...dimensions, mode: 'shapes', pages: Number($('page-count').value), shapes: selectedShapes(), shapeSize: Number($('shape-size').value), shapeStroke: Number($('shape-stroke').value), shapeGapX: readGap('shape-gap-x'), shapeGapY: readGap('shape-gap-y'), title: $('shape-title').value.trim(), ...readRowColor() };
  const common = { ...dimensions, mode: $('sheet-mode').value, gridSize: Number($('grid-size').value), pages: Number($('page-count').value), lines: $('grid-lines').checked };
  return common.mode === 'animals'
    ? { ...common, animalCount: Number($('animal-count').value), animals: selectedAnimals(), animalSize: Number($('animal-size').value) }
    : { ...common, fontSize: Number($('font-size').value), ...readRowColor(), rowLines: $('row-lines').checked };
}
function describe(settings) {
  const { rows, cols } = gridDimensions(settings), gridLabel = `${rows}行×${cols}列（${rows * cols}個）`;
  const colorLabel = settings.rowColor === 'custom' ? ` / 色 ${settings.rowColors.map(rowColorName).join('・')}` : { zebra: ' / ゼブラ', rows: ' / 行ごとの色' }[settings.rowColor] || '';
  if (settings.mode === 'shapes') return `${gridLabel} / 図形${settings.shapes.length}種類・${settings.shapeSize}mm・線${settings.shapeStroke}mm・間隔 横${gapLabel(settings.shapeGapX)}/縦${gapLabel(settings.shapeGapY)}${colorLabel}`;
  const content = settings.mode === 'animals' ? `動物${settings.animalCount}種類・${settings.animalSize}%` : `${settings.fontSize}pt${colorLabel}${settings.rowLines ? ' / 行線' : ''}`;
  return `${gridLabel} / 長辺${settings.gridSize}mm / ${content} / 線${settings.lines ? 'あり' : 'なし'}`;
}
function render() {
  $('preview').innerHTML = previewSvg(generated.settings, generated.sheets[page]);
  $('preview').classList.toggle('landscape', generated.settings.mode === 'shapes');
  $('summary').textContent = describe(generated.settings);
  document.querySelector('.pagination').hidden = generated.sheets.length === 1;
  $('page-label').textContent = `${page + 1} / ${generated.sheets.length} ページ`;
  $('previous').disabled = page === 0;
  $('next').disabled = page === generated.sheets.length - 1;
}
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  if ($('generate').disabled) return;
  try {
    const settings = readSettings(); validate(settings);
    $('generate').disabled = true; $('generate').textContent = '生成中…';
    let animalImages = {};
    if (settings.mode === 'animals') animalImages = await loadAnimalImages(settings.animals);
    else if (settings.mode === 'digits' && !await fontReady) throw new Error('数字フォントを読み込めませんでした。画面を再読み込みしてください。');
    generated = { settings, sheets: createSheets(settings.pages, settings), animalImages }; page = 0;
    render(); $('form-error').textContent = ''; $('download').disabled = false;
    $('add-to-tray').disabled = false; $('add-to-tray').textContent = 'まとめに追加';
    $('status').textContent = `${settings.pages}枚を生成しました。この並びで保存できます。`;
  } catch (error) { $('form-error').textContent = error.message; }
  finally { $('generate').disabled = false; $('generate').textContent = '生成'; }
});
$('settings-form').addEventListener('input', () => {
  $('form-error').textContent = '';
  if (generated) $('status').textContent = JSON.stringify(readSettings()) === JSON.stringify(generated.settings)
    ? `${generated.settings.pages}枚を生成済み。この並びで保存できます。`
    : '設定を変更しました。「生成」で反映します。PDFは現在のプレビューを保存します。';
});
$('previous').addEventListener('click', () => { if (page > 0) { page--; render(); } });
$('next').addEventListener('click', () => { if (page < generated.sheets.length - 1) { page++; render(); } });
$('download').addEventListener('click', () => {
  if (!generated) return;
  try {
    if (!window.jspdf) throw new Error('PDF機能を読み込めませんでした。画面を再読み込みしてください。');
    const doc = makePdf(window.jspdf.jsPDF, generated.settings, generated.sheets, generated.animalImages);
    doc.save(`${{ animals: 'animals', shapes: 'shape-touch', digits: 'digits' }[generated.settings.mode]}-a4-${generated.settings.pages}pages.pdf`);
    $('status').textContent = 'PDFを保存しました。端末によってはPDF画面から保存してください。';
  } catch (error) { $('status').textContent = `保存できませんでした。${error.message}`; }
});

// まとめPDF tray
const MODE_NAMES = { digits: '数字', animals: '動物', shapes: '図形タッチ' };
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
let tray = storage ? loadTray(storage, validate) : [];
function setTray(items, message = '') {
  tray = items;
  const saved = storage && saveTray(storage, tray);
  renderTray();
  const warning = tray.length && !saved ? '（この端末には保存できませんでした。再読み込みすると消えます）' : '';
  if (message || warning) $('tray-status').textContent = message + warning;
}
function renderTray() {
  const pages = trayPages(tray);
  $('tray-count').textContent = `${tray.length}種類・計${pages}ページ`;
  $('tray-empty').hidden = tray.length > 0;
  $('tray-actions').hidden = tray.length === 0;
  $('tray-fab').hidden = tray.length === 0;
  $('tray-fab-count').textContent = pages;
  $('tray-download').textContent = `まとめてPDF保存（${pages}ページ）`;
  $('tray-download').disabled = pages > MAX_COMBINED_PAGES;
  $('tray-list').innerHTML = tray.map((item, i) => `
    <li class="tray-item" data-index="${i}">
      <div class="tray-thumb ${item.settings.mode === 'shapes' ? 'landscape' : ''}">${previewSvg(item.settings, item.sheets[0])}</div>
      <div class="tray-info">
        <strong>${i + 1}. ${MODE_NAMES[item.settings.mode]}（A4${item.settings.mode === 'shapes' ? '横' : '縦'}）</strong>
        <span class="tray-desc">${describe(item.settings)}</span>
        <div class="tray-copies"><span>${item.sheets.length}枚 ×</span>
          <button type="button" data-action="less" aria-label="部数を減らす" ${item.copies <= 1 ? 'disabled' : ''}>−</button>
          <output aria-label="部数">${item.copies}</output>
          <button type="button" data-action="more" aria-label="部数を増やす" ${item.copies >= MAX_COPIES ? 'disabled' : ''}>＋</button>
          <span>部</span><span class="tray-total">＝ ${itemPages(item)}ページ</span></div>
      </div>
      <div class="tray-controls">
        <button type="button" data-action="up" aria-label="上へ" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-action="down" aria-label="下へ" ${i === tray.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" data-action="remove" aria-label="削除">×</button>
      </div>
    </li>`).join('');
  const orientations = new Set(tray.map(item => orientationOf(item.settings)));
  $('tray-status').textContent = '';
  if (pages > MAX_COMBINED_PAGES) $('tray-status').textContent = `合計${MAX_COMBINED_PAGES}ページまでです。部数を減らすか、シートを削除してください。`;
  else if (orientations.size > 1) $('tray-status').textContent = '縦と横のページが混ざります。印刷時は用紙の向きを「自動」、サイズを「実際のサイズ（100%）」にしてください。';
}
$('add-to-tray').addEventListener('click', () => {
  if (!generated) return;
  if (trayPages(tray) + generated.sheets.length > MAX_COMBINED_PAGES) { $('status').textContent = `まとめPDFは合計${MAX_COMBINED_PAGES}ページまでです。`; return; }
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  setTray([...tray, { id, settings: generated.settings, sheets: generated.sheets, copies: 1 }]);
  $('add-to-tray').disabled = true; $('add-to-tray').textContent = '追加済み';
  $('status').textContent = `まとめPDFに追加しました（計${trayPages(tray)}ページ）。別の設定で生成して、続けて追加できます。`;
});
$('tray-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const index = Number(button.closest('.tray-item').dataset.index), item = tray[index];
  const action = button.dataset.action;
  if (action === 'up' || action === 'down') setTray(moveItem(tray, index, action === 'up' ? -1 : 1));
  else if (action === 'remove') setTray(tray.filter((_, i) => i !== index), `${index + 1}. ${MODE_NAMES[item.settings.mode]}を削除しました。`);
  else {
    const copies = Math.min(MAX_COPIES, Math.max(1, item.copies + (action === 'more' ? 1 : -1)));
    setTray(tray.map((it, i) => i === index ? { ...it, copies } : it));
  }
  // Keep keyboard focus on the same control after re-rendering.
  const again = $('tray-list').querySelector(`.tray-item[data-index="${action === 'up' ? index - 1 : action === 'down' ? index + 1 : index}"] button[data-action="${action}"]`);
  if (again && !again.disabled) again.focus();
});
$('tray-clear').addEventListener('click', () => {
  if (confirm('まとめPDFのシートをすべて削除しますか？')) setTray([], 'すべて削除しました。');
});
$('tray-download').addEventListener('click', async () => {
  if (!tray.length) return;
  const button = $('tray-download');
  try {
    if (!window.jspdf) throw new Error('PDF機能を読み込めませんでした。画面を再読み込みしてください。');
    button.disabled = true; button.textContent = 'PDF作成中…';
    const animals = [...new Set(tray.flatMap(item => item.settings.mode === 'animals' ? item.settings.animals : []))];
    const images = animals.length ? await loadAnimalImages(animals) : {};
    const pages = trayPages(tray);
    makeCombinedPdf(window.jspdf.jsPDF, expandTray(tray), images).save(`sheets-a4-${pages}pages.pdf`);
    renderTray();
    $('tray-status').textContent = `${pages}ページのPDFを保存しました。端末によってはPDF画面から保存してください。`;
  } catch (error) { renderTray(); $('tray-status').textContent = `保存できませんでした。${error.message}`; }
});
renderTray();
// The floating "まとめ" button is only a shortcut; hide it while the tray itself is on screen.
if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
  document.body.classList.toggle('tray-visible', entry.isIntersecting);
}).observe($('tray'));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
