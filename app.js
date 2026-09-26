import { validate, createSheets, previewSvg, makePdf } from './core.js';
const $ = id => document.getElementById(id);
let generated = null, page = 0;
function readSettings() {
  return { fontSize: Number($('font-size').value), gridSize: Number($('grid-size').value), pages: Number($('page-count').value), lines: $('grid-lines').checked };
}
function render() {
  $('preview').innerHTML = previewSvg(generated.settings, generated.sheets[page]);
  $('summary').textContent = `${generated.settings.gridSize}mm角 / ${generated.settings.fontSize}pt / 線${generated.settings.lines ? 'あり' : 'なし'}`;
  document.querySelector('.pagination').hidden = generated.sheets.length === 1;
  $('page-label').textContent = `${page + 1} / ${generated.sheets.length} ページ`;
  $('previous').disabled = page === 0;
  $('next').disabled = page === generated.sheets.length - 1;
}
$('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const settings = readSettings(); validate(settings);
    generated = { settings, sheets: createSheets(settings.pages) }; page = 0;
    render(); $('form-error').textContent = ''; $('download').disabled = false;
    $('status').textContent = `${settings.pages}枚を生成しました。この並びで保存できます。`;
  } catch (error) { $('form-error').textContent = error.message; }
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
    const doc = makePdf(window.jspdf.jsPDF, generated.settings, generated.sheets);
    doc.save(`digits-a4-${generated.settings.pages}pages.pdf`);
    $('status').textContent = 'PDFを保存しました。端末によってはPDF画面から保存してください。';
  } catch (error) { $('status').textContent = `保存できませんでした。${error.message}`; }
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
