import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportBatch } from '../types/importBatch.type';
import {
    buildFormValuesFromBatch,
    convertCreateFormToEditDraft,
    discardStaleImportBatchBrowserDrafts,
    mergeImportBatchEditDraftWithServer,
    transferCreateFormToEditDraft,
    readLocalImportBatchEditDraft,
    clearLocalImportBatchEditDraft,
    writeLocalImportBatchEditDraft,
} from './importBatchEditDraft';
import { writeTicketLineFormDraft, readTicketLineFormDraft } from '../../inventory/utils/ticketLineFormDraftStorage';
import dayjs from 'dayjs';

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

    it('discards browser drafts when batch is cancelled', () => {
        writeLocalImportBatchEditDraft(2, {
            supplierId: 5,
            drawDate: '2026-07-09',
            importMode: 'IN_DAY',
            totalDeclareQuantity: 1,
            invoiceEvidenceUrl: '',
            ticketListImageUrls: [],
            lines: [],
        });
        writeTicketLineFormDraft(2, 11, {
            ticketSections: [{ numbers: '123456', quantity: 1, serials: [{ serialNumber: '1' }] }],
        });

        discardStaleImportBatchBrowserDrafts({
            ...sampleBatch,
            status: 'CANCELLED',
        });

        expect(readLocalImportBatchEditDraft(2)).toBeNull();
        expect(readTicketLineFormDraft(2, 11)).toBeNull();
    });

    it('discards ticket drafts for cancelled lines only', () => {
        writeTicketLineFormDraft(2, 11, {
            ticketSections: [{ numbers: '123456', quantity: 1, serials: [{ serialNumber: '1' }] }],
        });
        writeTicketLineFormDraft(2, 12, {
            ticketSections: [{ numbers: '654321', quantity: 1, serials: [{ serialNumber: '2' }] }],
        });

        discardStaleImportBatchBrowserDrafts({
            ...sampleBatch,
            status: 'RECEIVING',
            lines: [
                { ...sampleBatch.lines![0], id: 11, status: 'CANCELLED' },
                {
                    id: 12,
                    lotteryStationId: 4,
                    batchType: 'NEW',
                    declareQuantity: 1,
                    importCost: 10000,
                    totalQuantity: 0,
                    totalCostValue: 10000,
                    status: 'OPEN',
                },
            ],
        });

        expect(readTicketLineFormDraft(2, 11)).toBeNull();
        expect(readTicketLineFormDraft(2, 12)).not.toBeNull();
    });

    it('discards all browser drafts when same-day intake is closed', () => {
        writeLocalImportBatchEditDraft(2, {
            supplierId: 5,
            drawDate: dayjs().format('YYYY-MM-DD'),
            importMode: 'IN_DAY',
            totalDeclareQuantity: 1,
            invoiceEvidenceUrl: '',
            ticketListImageUrls: [],
            lines: [],
        });
        writeTicketLineFormDraft(2, 11, {
            ticketSections: [{ numbers: '123456', quantity: 1, serials: [{ serialNumber: '1' }] }],
        });

        discardStaleImportBatchBrowserDrafts(
            {
                ...sampleBatch,
                drawDate: dayjs().format('YYYY-MM-DD'),
                status: 'DRAFT',
            },
            {
                returnCutOffTime: '16:00',
                returnBufferMinutes: 45,
                now: dayjs().hour(15).minute(30).second(0).millisecond(0),
            }
        );

        expect(readLocalImportBatchEditDraft(2)).toBeNull();
        expect(readTicketLineFormDraft(2, 11)).toBeNull();
    });
});
