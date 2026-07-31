// localStorage no aguanta blobs grandes: las fotos van a IndexedDB, solo
// los metadatos livianos van a localStorage (ver queue.ts).

const DB_NAME = "hermes-captura";
const STORE = "blobs";

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarPaginas(itemId: string, paginas: Blob[]): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    paginas.forEach((blob, i) => tx.objectStore(STORE).put(blob, `${itemId}:${i}`));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function leerPaginas(itemId: string, cantidad: number): Promise<Blob[]> {
  const db = await abrirDb();
  const paginas = await new Promise<Blob[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const resultados: Blob[] = [];
    let pendientes = cantidad;
    if (cantidad === 0) {
      resolve([]);
      return;
    }
    for (let i = 0; i < cantidad; i++) {
      const req = store.get(`${itemId}:${i}`);
      req.onsuccess = () => {
        resultados[i] = req.result as Blob;
        pendientes -= 1;
        if (pendientes === 0) resolve(resultados);
      };
      req.onerror = () => reject(req.error);
    }
  });
  db.close();
  return paginas;
}

export async function borrarPaginas(itemId: string, cantidad: number): Promise<void> {
  const db = await abrirDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    for (let i = 0; i < cantidad; i++) tx.objectStore(STORE).delete(`${itemId}:${i}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
