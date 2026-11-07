import { validate, createSheets, previewSvg, makePdf, loadPreviewFont } from './core.js';
import { ANIMALS, animalUrl, loadAnimalImages } from './animals.js';
import { SHAPES, shapeIcon } from './shapes.js';
const $ = id => document.getElementById(id);
let generated = null, page = 0;
const fontReady = loadPreviewFont().then(() => true, () => false);
$('animal-choices').innerHTML = ANIMALS.map((animal, i) => `<label class="animal-choice"><input type="checkbox" name="animal" value="${animal.id}" ${i < 3 ? 'checked' : ''}><img src="${animalUrl(animal.id)}" alt="" width="64" height="64"><span>${animal.label}</span></label>`).join('');
$('shape-choices').innerHTML = SHAPES.map((shape, i) => `<label class="animal-choice"><input type="checkbox" name="shape" value="${shape.id}" ${i < 3 ? 'checked' : ''}>${shapeIcon(shape.id)}<span>${shape.label}</span></label>`).join('');
function selectedShapes() { return [...document.querySelectorAll('input[name="shape"]:checked')].map(input => input.value); }
function showShapeSelection() { $('shape-selection').textContent = `2種類以上を選択：現在${selectedShapes().length}種類`; }
$('shape-choices').addEventListener('change', showShapeSelection);
function selectedAnimals() { return [...document.querySelectorAll('input[name="animal"]:checked')].map(input => input.value); }
function showSelection() { $('animal-selection').textContent = `${$('animal-count').value}種類を選択：現在${selectedAnimals().length}種類`; }
function syncMode() {
  const mode = $('sheet-mode').value, animals = mode === 'animals', shapes = mode === 'shapes';
  $('animal-options').hidden = !animals;
  $('animal-options').disabled = !animals;
  $('shape-options').hidden = !shapes;
  $('shape-options').disabled = !shapes;
  $('font-field').hidden = mode !== 'digits';
  $('font-size').disabled = mode !== 'digits';
  for (const id of ['grid-field', 'lines-field']) $(id).hidden = shapes;
  $('grid-size').disabled = $('grid-lines').disabled = shapes;
  $('print-note').textContent = `印刷は「A4・${shapes ? '横' : '縦'}・実際のサイズ（100%）」で。`;
  showSelection(); showShapeSelection();
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
function readSettings() {
  if ($('sheet-mode').value === 'shapes') return { mode: 'shapes', pages: Number($('page-count').value), shapes: selectedShapes(), shapeSize: Number($('shape-size').value), title: $('shape-title').value.trim() };
  const common = { mode: $('sheet-mode').value, gridSize: Number($('grid-size').value), pages: Number($('page-count').value), lines: $('grid-lines').checked };
  return common.mode === 'animals'
    ? { ...common, animalCount: Number($('animal-count').value), animals: selectedAnimals(), animalSize: Number($('animal-size').value) }
    : { ...common, fontSize: Number($('font-size').value) };
}
function render() {
  $('preview').innerHTML = previewSvg(generated.settings, generated.sheets[page]);
  const settings = generated.settings;
  $('preview').classList.toggle('landscape', settings.mode === 'shapes');
  if (settings.mode === 'shapes') $('summary').textContent = `図形${settings.shapes.length}種類・${settings.shapeSize}mm / 5×10`;
  else {
  const content = settings.mode === 'animals' ? `動物${settings.animalCount}種類・${settings.animalSize}%` : `${settings.fontSize}pt`;
  $('summary').textContent = `${settings.gridSize}mm角 / ${content} / 線${settings.lines ? 'あり' : 'なし'}`;
  }
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
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
