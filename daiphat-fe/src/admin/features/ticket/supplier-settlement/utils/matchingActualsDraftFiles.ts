const DB_NAME = 'daiphat-matching-actuals-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'pending-files';

export type MatchingDraftFileRecord = {
    /** `${settlementId}:ncc` | `${settlementId}:import:{batchId}` | `${settlementId}:tickets:{batchId}:{index}` */
    id: string;
    settlementId: string;
    kind: 'ncc' | 'import' | 'tickets';
    batchId?: number;
    index?: number;
    name: string;
    type: string;
    lastModified: number;
    blob: Blob;
};

const openDb = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('settlementId', 'settlementId', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });

const fileToRecord = (
    settlementId: string | number,
    kind: MatchingDraftFileRecord['kind'],
    file: File,
    batchId?: number,
    index?: number
): MatchingDraftFileRecord => {
    const sid = String(settlementId);
    let id = `${sid}:ncc`;
    if (kind === 'import' && batchId != null) {
        id = `${sid}:import:${batchId}`;
    } else if (kind === 'tickets' && batchId != null) {
        id = `${sid}:tickets:${batchId}:${index ?? 0}`;
    }
    return {
        id,
        settlementId: sid,
        kind,
        batchId,
        index,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        blob: file,
    };
};

const recordToFile = (record: MatchingDraftFileRecord): File =>
    new File([record.blob], record.name, {
        type: record.type,
        lastModified: record.lastModified,
    });

const putRecord = async (record: MatchingDraftFileRecord): Promise<void> => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB put failed'));
    });
    db.close();
};

const deleteById = async (id: string): Promise<void> => {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
        });
        db.close();
    } catch {
        // ignore
    }
};

const getBySettlement = async (settlementId: string | number): Promise<MatchingDraftFileRecord[]> => {
    try {
        const db = await openDb();
        const sid = String(settlementId);
        const records = await new Promise<MatchingDraftFileRecord[]>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const index = tx.objectStore(STORE_NAME).index('settlementId');
            const request = index.getAll(sid);
            request.onsuccess = () => resolve((request.result as MatchingDraftFileRecord[]) || []);
            request.onerror = () => reject(request.error ?? new Error('IndexedDB getAll failed'));
        });
        db.close();
        return records;
    } catch {
        return [];
    }
};

export const putPendingNccReceiptFile = async (
    settlementId: string | number,
    file: File
): Promise<void> => {
    await putRecord(fileToRecord(settlementId, 'ncc', file));
};

export const clearPendingNccReceiptFile = async (settlementId: string | number): Promise<void> => {
    await deleteById(`${settlementId}:ncc`);
};

export const putPendingImportReceiptFile = async (
    settlementId: string | number,
    batchId: number,
    file: File
): Promise<void> => {
    await putRecord(fileToRecord(settlementId, 'import', file, batchId));
};

export const clearPendingImportReceiptFile = async (
    settlementId: string | number,
    batchId: number
): Promise<void> => {
    await deleteById(`${settlementId}:import:${batchId}`);
};

export const putPendingTicketListFiles = async (
    settlementId: string | number,
    batchId: number,
    files: File[]
): Promise<void> => {
    const existing = await getBySettlement(settlementId);
    await Promise.all(
        existing
            .filter((r) => r.kind === 'tickets' && r.batchId === batchId)
            .map((r) => deleteById(r.id))
    );
    await Promise.all(
        files.map((file, index) => putRecord(fileToRecord(settlementId, 'tickets', file, batchId, index)))
    );
};

export const clearPendingTicketListFiles = async (
    settlementId: string | number,
    batchId: number
): Promise<void> => {
    const existing = await getBySettlement(settlementId);
    await Promise.all(
        existing
            .filter((r) => r.kind === 'tickets' && r.batchId === batchId)
            .map((r) => deleteById(r.id))
    );
};

export type MatchingDraftPendingFiles = {
    nccReceipt: File | null;
    importReceiptById: Record<number, File>;
    ticketListFilesById: Record<number, File[]>;
};

export const loadPendingMatchingDraftFiles = async (
    settlementId: string | number
): Promise<MatchingDraftPendingFiles> => {
    const records = await getBySettlement(settlementId);
    const result: MatchingDraftPendingFiles = {
        nccReceipt: null,
        importReceiptById: {},
        ticketListFilesById: {},
    };
    const ticketBuckets = new Map<number, { index: number; file: File }[]>();

    records.forEach((record) => {
        const file = recordToFile(record);
        if (record.kind === 'ncc') {
            result.nccReceipt = file;
        } else if (record.kind === 'import' && record.batchId != null) {
            result.importReceiptById[record.batchId] = file;
        } else if (record.kind === 'tickets' && record.batchId != null) {
            const list = ticketBuckets.get(record.batchId) || [];
            list.push({ index: record.index ?? 0, file });
            ticketBuckets.set(record.batchId, list);
        }
    });

    ticketBuckets.forEach((entries, batchId) => {
        result.ticketListFilesById[batchId] = entries
            .sort((a, b) => a.index - b.index)
            .map((entry) => entry.file);
    });

    return result;
};

export const clearAllPendingMatchingDraftFiles = async (
    settlementId: string | number
): Promise<void> => {
    const records = await getBySettlement(settlementId);
    await Promise.all(records.map((r) => deleteById(r.id)));
};
