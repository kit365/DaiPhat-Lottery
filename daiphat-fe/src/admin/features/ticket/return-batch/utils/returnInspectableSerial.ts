import { isFaultyTicketCondition, normalizeSerialStatus } from '../../import-batch/utils/serialIncidentWorkflow';
import type { InspectableReturnSerial } from '../types/returnBatch.type';

/** Serials still unsold and physically good: in-stock or expired leftover (vé ế). */
export const isReturnSelectableSerial = (serial: InspectableReturnSerial): boolean => {
    const status = normalizeSerialStatus(serial.status);
    if (status !== 'IN_STOCK' && status !== 'EXPIRED') return false;
    if (isFaultyTicketCondition(serial.ticketCondition)) return false;
    return true;
};

export const getInspectableTicketConditionLabel = (
    serial?: InspectableReturnSerial | null
): string =>
    serial?.ticketConditionDisplayName
    || serial?.ticketConditionLabel
    || (serial?.ticketCondition === 'GOOD' || !serial?.ticketCondition ? 'Tồn kho' : serial.ticketCondition);
