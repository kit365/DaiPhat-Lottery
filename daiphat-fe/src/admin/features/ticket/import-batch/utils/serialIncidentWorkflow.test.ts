import { describe, expect, it } from 'vitest';
import {
    applyReplacementSerialDuplicateErrors,
    DUPLICATE_REPLACEMENT_SERIAL_MESSAGE,
    findSameCurrentReplacementSerialIds,
    getActiveTransactionSerials,
    getReplacementSerialConflictToastMessage,
    groupSerialsByOrderId,
    isActiveTransactionSerialStatus,
    isAlreadyFaultReportedSerial,
    isFaultyTicketCondition,
    isSerialIncidentEligible,
    needsRefundPrepStep,
    SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE,
} from './serialIncidentWorkflow';

describe('serialIncidentWorkflow refund prep', () => {
    it('detects RESERVED and PROXY_HOLDING as active transaction statuses', () => {
        expect(isActiveTransactionSerialStatus('RESERVED')).toBe(true);
        expect(isActiveTransactionSerialStatus('PROXY_HOLDING')).toBe(true);
        expect(isActiveTransactionSerialStatus('IN_STOCK')).toBe(false);
    });

    it('allows selecting IN_STOCK, RESERVED and PROXY_HOLDING', () => {
        expect(isSerialIncidentEligible('RESERVED')).toBe(true);
        expect(isSerialIncidentEligible('IN_STOCK')).toBe(true);
        expect(isSerialIncidentEligible('PROXY_HOLDING')).toBe(true);
        expect(isSerialIncidentEligible('SOLD')).toBe(false);
    });

    it('excludes faulty ticketCondition and return-batch-linked serials', () => {
        expect(isSerialIncidentEligible('IN_STOCK', { ticketCondition: 'DAMAGED' })).toBe(false);
        expect(isSerialIncidentEligible('IN_STOCK', { ticketCondition: 'LOST' })).toBe(false);
        expect(isSerialIncidentEligible({ status: 'IN_STOCK', ticketCondition: 'GOOD' })).toBe(true);
        expect(isSerialIncidentEligible({ status: 'IN_STOCK', returnBatchLineId: 12 })).toBe(false);
        expect(isSerialIncidentEligible({ status: 'IN_STOCK', returnBatchLineId: 0 })).toBe(true);
        expect(isSerialIncidentEligible({ status: 'IN_STOCK', returnBatchLineId: '0' })).toBe(true);
        expect(isFaultyTicketCondition('DAMAGED')).toBe(true);
        expect(isAlreadyFaultReportedSerial({ status: 'IN_STOCK', ticketCondition: 'LOST' })).toBe(true);
        expect(isAlreadyFaultReportedSerial({ status: 'IN_STOCK', ticketCondition: 'VOIDED' })).toBe(true);
        expect(isAlreadyFaultReportedSerial({ status: 'IN_STOCK', ticketCondition: 'GOOD' })).toBe(false);
        expect(isFaultyTicketCondition('VOIDED')).toBe(true);
    });

    it('TICKET + INTERNAL_FAULT + all IN_STOCK does not need refund step', () => {
        const serials = [
            { id: 1, status: 'IN_STOCK' },
            { id: 2, status: 'IN_STOCK' },
        ];
        expect(needsRefundPrepStep('TICKET', serials, 'INTERNAL_FAULT')).toBe(false);
    });

    it('TICKET + INTERNAL_FAULT + mix IN_STOCK and PROXY_HOLDING needs refund step', () => {
        const serials = [
            { id: 1, status: 'IN_STOCK' },
            { id: 2, status: 'PROXY_HOLDING', reservedByOrderId: 'ord-1' },
        ];
        expect(needsRefundPrepStep('TICKET', serials, 'INTERNAL_FAULT')).toBe(true);
        expect(getActiveTransactionSerials(serials).map((s) => s.id)).toEqual([2]);
    });

    it('TICKET + DATA_ENTRY_FAULT + PROXY_HOLDING does not need refund step', () => {
        const serials = [{ id: 1, status: 'PROXY_HOLDING', reservedByOrderId: 'ord-1' }];
        expect(needsRefundPrepStep('TICKET', serials, 'DATA_ENTRY_FAULT')).toBe(false);
    });

    it('SERIAL mode + selected RESERVED needs refund step', () => {
        const serials = [{ id: 1, status: 'RESERVED', reservedByOrderId: 'ord-1' }];
        expect(needsRefundPrepStep('SERIAL', serials)).toBe(true);
    });

    it('SERIAL mode + selected PROXY_HOLDING needs refund step', () => {
        const serials = [{ id: 1, status: 'PROXY_HOLDING', reservedByOrderId: 'ord-1' }];
        expect(needsRefundPrepStep('SERIAL', serials)).toBe(true);
    });

    it('SERIAL mode + only IN_STOCK does not need refund step', () => {
        const serials = [{ id: 1, status: 'IN_STOCK' }];
        expect(needsRefundPrepStep('SERIAL', serials)).toBe(false);
    });

    it('SERIAL mode + IN_STOCK linked to an order needs refund step', () => {
        const serials = [{ id: 1, status: 'IN_STOCK', reservedByOrderId: 'ord-1' }];
        expect(needsRefundPrepStep('SERIAL', serials)).toBe(true);
    });

    it('groups active serials by order id for submit orchestration', () => {
        const serials = [
            { id: 1, status: 'PROXY_HOLDING', reservedByOrderId: 'ord-1' },
            { id: 2, status: 'PROXY_HOLDING', reservedByOrderId: 'ord-1' },
            { id: 3, status: 'PROXY_HOLDING', reservedByOrderId: 'ord-2' },
        ];
        const grouped = groupSerialsByOrderId(serials);
        expect(Object.keys(grouped)).toEqual(['ord-1', 'ord-2']);
        expect(grouped['ord-1'].length).toBe(2);
    });
});

describe('serialIncidentWorkflow replacement serial conflicts', () => {
    it('flags a replacement serial that matches the current serial', () => {
        const sameIds = findSameCurrentReplacementSerialIds([
            { id: 1, replacementSerial: 'IBSEED-20260817-2-NEW-050-02', currentSerial: 'IBSEED-20260817-2-NEW-050-02' },
            { id: 2, replacementSerial: 'IBSEED-NEW', currentSerial: 'IBSEED-OLD' },
        ]);

        expect(sameIds.has(1)).toBe(true);
        expect(sameIds.has(2)).toBe(false);
    });

    it('ignores case and surrounding spaces when comparing with the current serial', () => {
        const sameIds = findSameCurrentReplacementSerialIds([
            { id: 1, replacementSerial: '  ibseed-050-02  ', currentSerial: 'IBSEED-050-02' },
        ]);

        expect(sameIds.has(1)).toBe(true);
    });

    it('applies a field error when the replacement serial is unchanged', () => {
        const next = applyReplacementSerialDuplicateErrors(
            {
                1: {
                    selected: true,
                    status: 'VOIDED',
                    replacementSerial: 'IBSEED-20260817-2-NEW-050-02',
                    errors: {},
                },
            },
            [1],
            [{ id: 1, serialNumber: 'IBSEED-20260817-2-NEW-050-02' }]
        );

        expect(next[1].errors?.replacementSerial).toBe(SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE);
        expect(getReplacementSerialConflictToastMessage(next)).toBe(SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE);
    });

    it('keeps duplicate-among-replacements error when values differ from current serials', () => {
        const next = applyReplacementSerialDuplicateErrors(
            {
                1: { selected: true, status: 'VOIDED', replacementSerial: 'NEW-001', errors: {} },
                2: { selected: true, status: 'VOIDED', replacementSerial: 'NEW-001', errors: {} },
            },
            [1, 2],
            [
                { id: 1, serialNumber: 'OLD-001' },
                { id: 2, serialNumber: 'OLD-002' },
            ]
        );

        expect(next[1].errors?.replacementSerial).toBe(DUPLICATE_REPLACEMENT_SERIAL_MESSAGE);
        expect(next[2].errors?.replacementSerial).toBe(DUPLICATE_REPLACEMENT_SERIAL_MESSAGE);
    });
});
