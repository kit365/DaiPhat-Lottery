import { describe, expect, it } from 'vitest';
import {
    extractPendingDraftSections,
    mergePersistedAndDraftSections,
} from './ticketLineFormHydration';

describe('ticketLineFormHydration draft restore', () => {
    it('keeps pending serial numbers when persisting and restoring draft sections', () => {
        const sections = [
            {
                numbers: '123456',
                quantity: 2,
                serials: [
                    { serialNumber: 'A111111', ticketImg: undefined },
                    { serialNumber: 'A222222', ticketImg: undefined },
                ],
            },
        ];

        const pending = extractPendingDraftSections(sections);
        expect(pending).not.toBeNull();
        expect(pending?.[0]?.serials).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ serialNumber: 'A111111' }),
                expect.objectContaining({ serialNumber: 'A222222' }),
            ])
        );

        const restored = mergePersistedAndDraftSections([], { ticketSections: pending ?? [] });
        expect(restored[0]?.numbers).toBe('123456');
        expect(restored[0]?.serials.map((serial) => serial.serialNumber)).toEqual(
            expect.arrayContaining(['A111111', 'A222222'])
        );
    });

    it('does not treat numbers-only sections as empty draft', () => {
        const pending = extractPendingDraftSections([
            {
                numbers: '654321',
                quantity: 1,
                serials: [{ serialNumber: '', ticketImg: undefined }],
            },
        ]);

        expect(pending?.[0]?.numbers).toBe('654321');
        expect(pending?.[0]?.serials).toEqual(
            expect.arrayContaining([expect.objectContaining({ serialNumber: '' })])
        );
    });
});
