import { describe, expect, it } from 'vitest';
import {
    getActiveTransactionSerials,
    groupSerialsByOrderId,
    isActiveTransactionSerialStatus,
    isAlreadyFaultReportedSerial,
    isFaultyTicketCondition,
    isSerialIncidentEligible,
    needsRefundPrepStep,
} from './serialIncidentWorkflow';

describe('serialIncidentWorkflow refund prep', () => {
    it('detects RESERVED and PROXY_HOLDING as active transaction statuses', () => {
        expect(isActiveTransactionSerialStatus('RESERVED')).toBe(true);
        expect(isActiveTransactionSerialStatus('PROXY_HOLDING')).toBe(true);
        expect(isActiveTransactionSerialStatus('IN_STOCK')).toBe(false);
    });

    it('does not allow selecting RESERVED serials for cancel, allows IN_STOCK and PROXY_HOLDING', () => {
        expect(isSerialIncidentEligible('RESERVED')).toBe(false);
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

    it('SERIAL mode + selected PROXY_HOLDING needs refund step', () => {
        const serials = [{ id: 1, status: 'PROXY_HOLDING', reservedByOrderId: 'ord-1' }];
        expect(needsRefundPrepStep('SERIAL', serials)).toBe(true);
    });

    it('SERIAL mode + only IN_STOCK does not need refund step', () => {
        const serials = [{ id: 1, status: 'IN_STOCK' }];
        expect(needsRefundPrepStep('SERIAL', serials)).toBe(false);
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
