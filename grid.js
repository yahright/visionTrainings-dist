// Defaults preserve existing worksheets when dimensions are omitted.
export function gridDimensions(settings = {}) {
  return { rows: settings.rows ?? 5, cols: settings.cols ?? (settings.mode === 'shapes' ? 10 : 5) };
}

export function validateGrid(settings) {
  const { rows, cols } = gridDimensions(settings), maxCols = settings.mode === 'shapes' ? 10 : 5;
  if (!Number.isInteger(rows) || rows < 1 || rows > 5) throw new Error('縦の行数は1〜5行で指定してください。');
  if (!Number.isInteger(cols) || cols < 1 || cols > maxCols) throw new Error(`横の列数は1〜${maxCols}列で指定してください。`);
  return rows * cols;
}
