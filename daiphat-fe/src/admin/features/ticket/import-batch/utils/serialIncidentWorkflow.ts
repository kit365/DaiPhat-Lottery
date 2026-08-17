export type SerialIncidentGroup = 'INTERNAL_INVENTORY' | 'ACTIVE_TRANSACTION' | 'TERMINAL';

const TERMINAL_SERIAL_STATUSES = new Set([
    'SOLD',
    'EXPIRED',
]);

export const FAULTY_TICKET_CONDITIONS = new Set(['DAMAGED', 'LOST', 'VOIDED']);

export type SerialIncidentFields = {
    status?: string | null;
    ticketCondition?: string | null;
    returnBatchLineId?: number | string | null;
};

export const normalizeSerialStatus = (status?: string | null): string =>
    (status || '').toUpperCase().replace(/-/g, '_');

export const normalizeTicketCondition = (condition?: string | null): string =>
    (condition || '').toUpperCase().replace(/-/g, '_');

export const isFaultyTicketCondition = (condition?: string | null): boolean =>
    FAULTY_TICKET_CONDITIONS.has(normalizeTicketCondition(condition));

export const getSerialIncidentGroup = (status?: string | null): SerialIncidentGroup => {
    const normalized = normalizeSerialStatus(status);
    if (normalized === 'IN_STOCK') {
        return 'INTERNAL_INVENTORY';
    }
    if (normalized === 'RESERVED' || normalized === 'PROXY_HOLDING') {
        return 'ACTIVE_TRANSACTION';
    }
    return 'TERMINAL';
};

/**
 * Serials that can be selected for warehouse cancel / fault report.
 * IN_STOCK, RESERVED and PROXY_HOLDING are eligible.
 * Faulty ticketCondition or linked returnBatchLineId are not eligible.
 */
export const isSerialIncidentEligible = (
    statusOrSerial?: string | null | SerialIncidentFields,
    options?: { ticketCondition?: string | null; returnBatchLineId?: number | string | null }
): boolean => {
    const fields: SerialIncidentFields =
        statusOrSerial != null && typeof statusOrSerial === 'object'
            ? statusOrSerial
            : {
                  status: statusOrSerial as string | null | undefined,
                  ticketCondition: options?.ticketCondition,
                  returnBatchLineId: options?.returnBatchLineId,
              };

    const normalized = normalizeSerialStatus(fields.status);
    if (
        normalized !== 'IN_STOCK'
        && normalized !== 'RESERVED'
        && normalized !== 'PROXY_HOLDING'
    ) {
        return false;
    }
    if (
        fields.returnBatchLineId != null &&
        fields.returnBatchLineId !== '' &&
        Number(fields.returnBatchLineId) > 0
    ) {
        return false;
    }
    if (isFaultyTicketCondition(fields.ticketCondition)) {
        return false;
    }
    return true;
};

export const isActiveTransactionSerialStatus = (status?: string | null): boolean =>
    normalizeSerialStatus(status) === 'RESERVED' || normalizeSerialStatus(status) === 'PROXY_HOLDING';

export type SerialRefundScopeItem = {
    id: string | number;
    serialNumber?: string;
    status?: string | null;
    ticketCondition?: string | null;
    returnBatchLineId?: number | string | null;
    ticketNumbers?: string;
    reservedByOrderId?: string | null;
};

export const getActiveTransactionSerials = <T extends SerialRefundScopeItem>(serials: T[]): T[] =>
    serials.filter((serial) => {
        if (isActiveTransactionSerialStatus(serial.status)) return true;
        return normalizeSerialStatus(serial.status) === 'IN_STOCK' && Boolean(serial.reservedByOrderId);
    });

export const groupSerialsByOrderId = <T extends SerialRefundScopeItem>(
    serials: T[]
): Record<string, T[]> => {
    const groups: Record<string, T[]> = {};
    serials.forEach((serial) => {
        const orderId = serial.reservedByOrderId;
        if (!orderId) return;
        const key = String(orderId);
        if (!groups[key]) groups[key] = [];
        groups[key].push(serial);
    });
    return groups;
};

export const needsRefundPrepStep = (
    cancelMode: 'TICKET' | 'SERIAL',
    targetSerials: SerialRefundScopeItem[],
    ticketFaultedBy?: string
): boolean => {
    const activeSerials = getActiveTransactionSerials(targetSerials);
    if (activeSerials.length === 0) return false;
    // Ticket-level data-entry moves serials onto the new lottery number; orders stay attached.
    if (cancelMode === 'TICKET' && ticketFaultedBy === 'DATA_ENTRY_FAULT') {
        return false;
    }
    return true;
};

export const isTerminalSerialStatus = (status?: string | null): boolean =>
    TERMINAL_SERIAL_STATUSES.has(normalizeSerialStatus(status));

/** @deprecated Prefer {@link isFaultyTicketCondition}. */
export const FAULTY_SERIAL_STATUSES = FAULTY_TICKET_CONDITIONS;

/** @deprecated Prefer {@link isFaultyTicketCondition}. */
export const isFaultySerialStatus = (status?: string | null): boolean =>
    isFaultyTicketCondition(status);

/** Serial đã báo hỏng/mất/hủy (ticketCondition) — không cần báo lỗi lại. */
export const isAlreadyFaultReportedSerial = (
    statusOrSerial?: string | null | SerialIncidentFields,
    ticketCondition?: string | null
): boolean => {
    const fields: SerialIncidentFields =
        statusOrSerial != null && typeof statusOrSerial === 'object'
            ? statusOrSerial
            : {
                  status: statusOrSerial as string | null | undefined,
                  ticketCondition,
              };

    return isFaultyTicketCondition(fields.ticketCondition);
};

/** @deprecated Prefer {@link isAlreadyFaultReportedSerial}. */
export const isAlreadyFaultReportedSerialStatus = (
    status?: string | null,
    ticketCondition?: string | null
): boolean => isAlreadyFaultReportedSerial(status, ticketCondition);

export const getSerialsPendingFaultReport = (
    serials: Array<{
        id: string | number;
        serialNumber?: string;
        status?: string | null;
        ticketCondition?: string | null;
        returnBatchLineId?: number | string | null;
    }>
) =>
    serials.filter(
        (serial) => isSerialIncidentEligible(serial) && !isAlreadyFaultReportedSerial(serial)
    );

export const areAllIncidentSerialsFaultyReported = (
    serials: Array<{
        status?: string | null;
        ticketCondition?: string | null;
        returnBatchLineId?: number | string | null;
    }>
): boolean => {
    const requiringReport = serials.filter((serial) => isSerialIncidentEligible(serial));
    return (
        requiringReport.length > 0 &&
        requiringReport.every((serial) => isAlreadyFaultReportedSerial(serial))
    );
};

export const DUPLICATE_REPLACEMENT_SERIAL_MESSAGE =
    'Số sê-ri thay thế không được trùng với sê-ri khác trong danh sách.';

export const SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE =
    'Số sê-ri thay thế phải khác số sê-ri hiện tại.';

const REPLACEMENT_SERIAL_CONFLICT_MESSAGES = new Set([
    DUPLICATE_REPLACEMENT_SERIAL_MESSAGE,
    SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE,
]);

export const normalizeReplacementSerial = (value?: string | null): string =>
    (value ?? '').trim().toLowerCase();

export const findDuplicateReplacementSerialIds = (
    entries: Array<{ id: string | number; replacementSerial?: string }>
): Set<string | number> => {
    const byValue = new Map<string, Array<string | number>>();

    entries.forEach(({ id, replacementSerial }) => {
        const normalized = normalizeReplacementSerial(replacementSerial);
        if (!normalized) return;

        if (!byValue.has(normalized)) {
            byValue.set(normalized, []);
        }
        byValue.get(normalized)!.push(id);
    });

    const duplicateIds = new Set<string | number>();
    byValue.forEach((ids) => {
        if (ids.length > 1) {
            ids.forEach((entryId) => duplicateIds.add(entryId));
        }
    });

    return duplicateIds;
};

export const findSameCurrentReplacementSerialIds = (
    entries: Array<{ id: string | number; replacementSerial?: string; currentSerial?: string }>
): Set<string | number> => {
    const sameCurrentIds = new Set<string | number>();

    entries.forEach(({ id, replacementSerial, currentSerial }) => {
        const replacement = normalizeReplacementSerial(replacementSerial);
        const current = normalizeReplacementSerial(currentSerial);
        if (replacement && current && replacement === current) {
            sameCurrentIds.add(id);
        }
    });

    return sameCurrentIds;
};

type ReplacementSerialFormSlice = {
    selected?: boolean;
    status?: string;
    replacementSerial?: string;
    errors?: {
        replacementSerial?: string;
        [key: string]: string | undefined;
    };
};

export const getReplacementSerialScopeIds = (
    formsState: Record<string | number, ReplacementSerialFormSlice>,
    scopeSerials: Array<{ id: string | number }>,
    options?: { treatAllSelectedAsVoided?: boolean }
): Array<string | number> => {
    if (options?.treatAllSelectedAsVoided) {
        return scopeSerials
            .filter((s) => formsState[s.id]?.selected)
            .map((s) => s.id);
    }

    return scopeSerials
        .filter((s) => formsState[s.id]?.selected && formsState[s.id]?.status === 'VOIDED')
        .map((s) => s.id);
};

export const applyReplacementSerialDuplicateErrors = <T extends ReplacementSerialFormSlice>(
    formsState: Record<string | number, T>,
    scopeIds: Array<string | number>,
    currentSerials: Array<{ id: string | number; serialNumber?: string }> = []
): Record<string | number, T> => {
    const currentById = new Map(
        currentSerials.map((serial) => [String(serial.id), serial.serialNumber])
    );
    const duplicateIds = findDuplicateReplacementSerialIds(
        scopeIds.map((scopeId) => ({
            id: scopeId,
            replacementSerial: formsState[scopeId]?.replacementSerial,
        }))
    );
    const sameCurrentIds = findSameCurrentReplacementSerialIds(
        scopeIds.map((scopeId) => ({
            id: scopeId,
            replacementSerial: formsState[scopeId]?.replacementSerial,
            currentSerial: currentById.get(String(scopeId)),
        }))
    );

    const next = { ...formsState };
    scopeIds.forEach((scopeId) => {
        const form = next[scopeId];
        if (!form) return;

        const errors = { ...(form.errors ?? {}) };
        if (sameCurrentIds.has(scopeId)) {
            errors.replacementSerial = SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE;
        } else if (duplicateIds.has(scopeId)) {
            errors.replacementSerial = DUPLICATE_REPLACEMENT_SERIAL_MESSAGE;
        } else if (
            errors.replacementSerial
            && REPLACEMENT_SERIAL_CONFLICT_MESSAGES.has(errors.replacementSerial)
        ) {
            delete errors.replacementSerial;
        }

        next[scopeId] = { ...form, errors };
    });

    return next;
};

export const hasDuplicateReplacementSerialErrors = (
    formsState: Record<string | number, ReplacementSerialFormSlice>
): boolean =>
    Object.values(formsState).some(
        (form) =>
            !!form.errors?.replacementSerial
            && REPLACEMENT_SERIAL_CONFLICT_MESSAGES.has(form.errors.replacementSerial)
    );

export const getReplacementSerialConflictToastMessage = (
    formsState: Record<string | number, ReplacementSerialFormSlice>
): string | null => {
    const messages = Object.values(formsState).map((form) => form.errors?.replacementSerial);
    if (messages.includes(SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE)) {
        return SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE;
    }
    if (messages.includes(DUPLICATE_REPLACEMENT_SERIAL_MESSAGE)) {
        return DUPLICATE_REPLACEMENT_SERIAL_MESSAGE;
    }
    return null;
};
