import { describe, expect, it } from 'vitest';
import { getTicketCancelIneligibleReason, summarizeTicketCondition } from './cancelTicketSelection';

describe('getTicketCancelIneligibleReason', () => {
    it('allows an in-stock ticket with a GOOD unsold serial', () => {
        expect(
            getTicketCancelIneligibleReason({
                status: 'IN_STOCK',
                serials: [{ status: 'IN_STOCK', ticketCondition: 'GOOD', returnBatchLineId: null }],
            })
        ).toBeNull();
    });

    it('allows the ticket while at least one serial is still cancelable', () => {
        expect(
            getTicketCancelIneligibleReason({
                status: 'IN_STOCK',
                serials: [
                    { status: 'IN_STOCK', ticketCondition: 'DAMAGED' },
                    { status: 'IN_STOCK', ticketCondition: 'GOOD' },
                ],
            })
        ).toBeNull();
    });

    it('rejects sold-out or expired tickets by aggregate status', () => {
        expect(getTicketCancelIneligibleReason({ status: 'SOLD_OUT', serials: [] })).toContain('Hết hàng');
        expect(getTicketCancelIneligibleReason({ status: 'EXPIRED', serials: [] })).toContain('Hết hạn');
    });

    it('explains an in-stock ticket whose only serial was voided (hidden from the list)', () => {
        expect(getTicketCancelIneligibleReason({ status: 'IN_STOCK', serials: [] })).toContain('không còn sê-ri');
    });

    it('explains serials already reported damaged / lost', () => {
        const reason = getTicketCancelIneligibleReason({
            status: 'IN_STOCK',
            serials: [{ status: 'IN_STOCK', ticketCondition: 'LOST' }],
        });
        expect(reason).toContain('báo hỏng / thất lạc / hủy');
    });

    it('explains sold serials and serials already in a return batch', () => {
        expect(
            getTicketCancelIneligibleReason({
                status: 'IN_STOCK',
                serials: [{ status: 'SOLD', ticketCondition: 'GOOD' }],
            })
        ).toContain('đã bán');
        expect(
            getTicketCancelIneligibleReason({
                status: 'IN_STOCK',
                serials: [{ status: 'IN_STOCK', ticketCondition: 'GOOD', returnBatchLineId: 7 }],
            })
        ).toContain('phiếu trả');
    });
});

describe('summarizeTicketCondition', () => {
    it('keeps the legacy fallback when serials are not loaded', () => {
        expect(summarizeTicketCondition(undefined)).toBeNull();
    });

    it('derives the ticket condition from its serials', () => {
        expect(summarizeTicketCondition([{ ticketCondition: 'GOOD' }])?.label).toBe('Tốt');
        expect(summarizeTicketCondition([{ ticketCondition: 'DAMAGED' }])?.label).toBe('Hỏng');
        expect(summarizeTicketCondition([{ ticketCondition: 'LOST' }])?.label).toBe('Thất lạc');
        expect(summarizeTicketCondition([{ ticketCondition: 'GOOD' }, { ticketCondition: 'LOST' }])?.label).toBe(
            'Tốt 1/2'
        );
        expect(
            summarizeTicketCondition([{ ticketCondition: 'DAMAGED' }, { ticketCondition: 'LOST' }])?.label
        ).toBe('Hỏng / Thất lạc');
        expect(summarizeTicketCondition([])?.condition).toBe('NONE');
    });
});
