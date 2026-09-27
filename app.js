import { validate, createSheets, previewSvg, makePdf, loadPreviewFont } from './core.js';
import { ANIMALS, animalUrl, loadAnimalImages } from './animals.js';
const $ = id => document.getElementById(id);
let generated = null, page = 0;
const fontReady = loadPreviewFont().then(() => true, () => false);
$('animal-choices').innerHTML = ANIMALS.map((animal, i) => `<label class="animal-choice"><input type="checkbox" name="animal" value="${animal.id}" ${i < 3 ? 'checked' : ''}><img src="${animalUrl(animal.id)}" alt="" width="64" height="64"><span>${animal.label}</span></label>`).join('');
function selectedAnimals() { return [...document.querySelectorAll('input[name="animal"]:checked')].map(input => input.value); }
function showSelection() { $('animal-selection').textContent = `${$('animal-count').value}種類を選択：現在${selectedAnimals().length}種類`; }
function syncMode() {
  const animals = $('sheet-mode').value === 'animals';
  $('animal-options').hidden = !animals;
  $('animal-options').disabled = !animals;
  $('font-field').hidden = animals;
  $('font-size').disabled = animals;
  showSelection();
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
  const common = { mode: $('sheet-mode').value, gridSize: Number($('grid-size').value), pages: Number($('page-count').value), lines: $('grid-lines').checked };
  return common.mode === 'animals'
    ? { ...common, animalCount: Number($('animal-count').value), animals: selectedAnimals(), animalSize: Number($('animal-size').value) }
    : { ...common, fontSize: Number($('font-size').value) };
}
function render() {
  $('preview').innerHTML = previewSvg(generated.settings, generated.sheets[page]);
  const settings = generated.settings;
  const content = settings.mode === 'animals' ? `動物${settings.animalCount}種類・${settings.animalSize}%` : `${settings.fontSize}pt`;
  $('summary').textContent = `${settings.gridSize}mm角 / ${content} / 線${settings.lines ? 'あり' : 'なし'}`;
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
    else if (!await fontReady) throw new Error('数字フォントを読み込めませんでした。画面を再読み込みしてください。');
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
    doc.save(`${generated.settings.mode === 'animals' ? 'animals' : 'digits'}-a4-${generated.settings.pages}pages.pdf`);
    $('status').textContent = 'PDFを保存しました。端末によってはPDF画面から保存してください。';
  } catch (error) { $('status').textContent = `保存できませんでした。${error.message}`; }
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
