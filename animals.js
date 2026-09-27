export const ANIMALS = [
  { id: 'dog', label: '犬' },
  { id: 'cat', label: 'ネコ' },
  { id: 'duck', label: 'あひる' },
  { id: 'elephant', label: '象' },
  { id: 'sheep', label: '羊' },
];

export function animalUrl(id) {
  if (!ANIMALS.some(animal => animal.id === id)) throw new Error('不明な動物です。');
  return new URL(`./animals/${id}.png`, import.meta.url).href;
}

const loaded = new Map();
export function loadAnimalImages(ids) {
  return Promise.all(ids.map(id => {
    if (!loaded.has(id)) {
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve([id, img]);
        img.onerror = () => reject(new Error('動物の絵を読み込めませんでした。画面を再読み込みしてください。'));
        img.src = animalUrl(id);
      }).catch(error => { loaded.delete(id); throw error; });
      loaded.set(id, promise);
    }
    return loaded.get(id);
  })).then(entries => Object.fromEntries(entries));
}
