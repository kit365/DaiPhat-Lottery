import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportBatch } from '../../../api/importBatch.api';
import {
    buildFormValuesFromBatch,
    convertCreateFormToEditDraft,
    mergeImportBatchEditDraftWithServer,
    transferCreateFormToEditDraft,
    readLocalImportBatchEditDraft,
    clearLocalImportBatchEditDraft,
} from './importBatchEditDraft';

const storage = new Map<string, string>();

beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
            storage.set(key, value);
        },
        removeItem: (key: string) => {
            storage.delete(key);
        },
    });
});

const sampleBatch: ImportBatch = {
    id: 2,
    batchCode: 'PN-0002',
    drawDate: '2026-07-09',
    supplierId: 5,
    status: 'DRAFT',
    importMode: 'IN_DAY',
    lines: [
        {
            id: 11,
            lotteryStationId: 3,
            batchType: 'NEW',
            declareQuantity: 1,
            importCost: 10000,
            totalQuantity: 0,
            totalCostValue: 10000,
        },
    ],
};

describe('importBatchEditDraft', () => {
    it('maps server lines with station id and batch type', () => {
        const values = buildFormValuesFromBatch(sampleBatch, (id) => `Station ${id}`);

        expect(values.lines).toHaveLength(1);
        expect(values.lines[0]).toMatchObject({
            id: 11,
            lotteryStationId: 3,
            declareQuantity: 1,
            importCost: 10000,
            resolvedBatchType: 'NEW',
            stationName: 'Station 3',
        });
    });

    it('keeps server lines when draft only has a blank placeholder row', () => {
        const merged = mergeImportBatchEditDraftWithServer(
            {
                supplierId: 5,
                drawDate: '2026-07-09',
                importMode: 'IN_DAY',
                invoiceEvidenceUrl: '',
                lines: [
                    {
                        lotteryStationId: 0,
                        declareQuantity: 1,
                        importCost: 10000,
                    },
                ],
            },
            sampleBatch,
            (id) => `Station ${id}`
        );

        expect(merged.lines).toHaveLength(1);
        expect(merged.lines[0]).toMatchObject({
            id: 11,
            lotteryStationId: 3,
            resolvedBatchType: 'NEW',
            stationName: 'Station 3',
        });
    });

    it('overlays draft edits onto matching server lines', () => {
        const merged = mergeImportBatchEditDraftWithServer(
            {
                supplierId: 5,
                drawDate: '2026-07-09',
                importMode: 'IN_DAY',
                invoiceEvidenceUrl: 'https://example.com/receipt.jpg',
                lines: [
                    {
                        id: 11,
                        lotteryStationId: 3,
                        declareQuantity: 5,
                        importCost: 12000,
                        resolvedBatchType: 'NEW',
                    },
                ],
            },
            sampleBatch
        );

        expect(merged.invoiceEvidenceUrl).toBe('https://example.com/receipt.jpg');
        expect(merged.lines[0]).toMatchObject({
            id: 11,
            lotteryStationId: 3,
            declareQuantity: 5,
            importCost: 12000,
            resolvedBatchType: 'NEW',
        });
    });

    it('updates server line when draft row matches by station id without line id', () => {
        const merged = mergeImportBatchEditDraftWithServer(
            {
                supplierId: 5,
                drawDate: '2026-07-09',
                importMode: 'IN_DAY',
                invoiceEvidenceUrl: '',
                lines: [
                    {
                        lotteryStationId: 3,
                        declareQuantity: 5,
                        importCost: 12000,
                        resolvedBatchType: 'NEW',
                        stationName: 'Station 3',
                    },
                    {
                        lotteryStationId: 7,
                        declareQuantity: 8,
                        importCost: 10000,
                        resolvedBatchType: 'NEW',
                        stationName: 'Station 7',
                    },
                ],
            },
            sampleBatch,
            (id) => `Station ${id}`
        );

        expect(merged.lines).toHaveLength(2);
        expect(merged.lines[0]).toMatchObject({
            id: 11,
            lotteryStationId: 3,
            declareQuantity: 5,
            importCost: 12000,
        });
        expect(merged.lines[0]?.restoredFromCreate).toBeFalsy();
        expect(merged.lines[1]).toMatchObject({
            lotteryStationId: 7,
            declareQuantity: 8,
            importCost: 10000,
        });
    });

    it('transfers create form lines into edit draft local storage', () => {
        clearLocalImportBatchEditDraft(2);

        transferCreateFormToEditDraft(
            2,
            {
                drawDate: '2026-07-09',
                supplierId: 5,
                importMode: 'IN_DAY',
                invoiceEvidenceUrl: 'https://example.com/receipt.jpg',
                lines: [
                    {
                        lotteryStationId: 3,
                        declareQuantity: 5,
                        importCost: 12000,
                        resolvedBatchType: 'NEW',
                    },
                    {
                        lotteryStationId: 7,
                        declareQuantity: 8,
                        importCost: 10000,
                        resolvedBatchType: 'NEW',
                    },
                ],
            },
            sampleBatch
        );

        const saved = readLocalImportBatchEditDraft(2);
        expect(saved?.values.lines).toHaveLength(2);
        expect(saved?.values.lines[0]).toMatchObject({
            id: 11,
            lotteryStationId: 3,
            declareQuantity: 5,
            importCost: 12000,
        });
        expect(saved?.values.lines[1]).toMatchObject({
            lotteryStationId: 7,
            declareQuantity: 8,
            importCost: 10000,
            restoredFromCreate: true,
        });
        expect(saved?.values.invoiceEvidenceUrl).toBe('https://example.com/receipt.jpg');

        clearLocalImportBatchEditDraft(2);
    });

    it('converts create form values to edit draft shape', () => {
        const draft = convertCreateFormToEditDraft({
            drawDate: '2026-07-09',
            supplierId: 5,
            importMode: 'IN_DAY',
            lines: [
                {
                    lotteryStationId: 3,
                    declareQuantity: 2,
                    importCost: 10000,
                    resolvedBatchType: 'NEW',
                    stationName: 'Station 3',
                },
            ],
        });

        expect(draft.lines).toHaveLength(1);
        expect(draft.lines[0]).toMatchObject({
            lotteryStationId: 3,
            declareQuantity: 2,
            stationName: 'Station 3',
            removed: false,
        });
    });
});
