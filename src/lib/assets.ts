// Big media (videos) kept in IndexedDB on this computer. A project stores only
// "asset:<id>"; localStorage, where projects live, holds a few MB at most.

const DB = 'protojam-assets', STORE = 'files';

const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export const putAsset = async (blob: Blob): Promise<string> => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return `asset:${id}`;
};

const urls = new Map<string, Promise<string>>();

// A URL the page can play, for an "asset:" reference or a plain URL.
export const assetUrl = (src: string): Promise<string> => {
  if (!src.startsWith('asset:')) return Promise.resolve(src);
  if (!urls.has(src)) {
    urls.set(src, open().then(db => new Promise<string>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(src.slice(6));
      req.onsuccess = () => req.result ? resolve(URL.createObjectURL(req.result)) : reject(new Error('missing asset'));
      req.onerror = () => reject(req.error);
    })));
  }
  return urls.get(src)!;
};
