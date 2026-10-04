// Boyanmış görseller için kalıcı IndexedDB önbelleği (taş yüzleri, avatar çerçeveleri). Hata durumunda sessizce bellekte kalır.
export const DB = (() => {
  let p = null;
  const open = () =>
    p ||
    (p = new Promise((res, rej) => {
      const r = indexedDB.open('patisever-tiles', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  return {
    async get(k) {
      try {
        const db = await open();
        return await new Promise((res) => {
          const q = db.transaction('img').objectStore('img').get(k);
          q.onsuccess = () => res(q.result || null);
          q.onerror = () => res(null);
        });
      } catch {
        return null;
      }
    },
    async put(k, v) {
      try {
        const db = await open();
        db.transaction('img', 'readwrite').objectStore('img').put(v, k);
      } catch {}
    },
    async prefix(pre) {
      const out = new Map();
      try {
        const db = await open();
        await new Promise((res) => {
          const q = db
            .transaction('img')
            .objectStore('img')
            .openCursor(IDBKeyRange.bound(pre, pre + '\uffff'));
          q.onsuccess = () => {
            const c = q.result;
            if (c) {
              out.set(c.key.slice(pre.length), c.value);
              c.continue();
            } else res();
          };
          q.onerror = () => res();
        });
      } catch {}
      return out;
    },
  };
})();
