import type {
    ControllerFieldState,
    FieldErrors,
    UseFormClearErrors,
    UseFormSetError,
} from 'react-hook-form';
import type { CreateTicketFormValues } from '../schemas/ticket.schema';

const ALWAYS_VISIBLE_ERROR_TYPES = new Set([
    'duplicate',
    'relationship',
    'quota',
    'length',
    'api',
]);

/** Show resolver errors only after field interaction or submit; always show programmatic errors. */
export const shouldShowFieldError = (
    fieldState: Pick<ControllerFieldState, 'error' | 'isTouched' | 'isDirty'>,
    isSubmitted: boolean
): boolean => {
    if (!fieldState.error) {
        return false;
    }
    const errorType = String(fieldState.error.type ?? '');
    if (ALWAYS_VISIBLE_ERROR_TYPES.has(errorType)) {
        return true;
    }
    return fieldState.isTouched || fieldState.isDirty || isSubmitted;
};

export const getVisibleFieldErrorMessage = (
    fieldState: Pick<ControllerFieldState, 'error' | 'isTouched' | 'isDirty'>,
    isSubmitted: boolean
): string | undefined =>
    shouldShowFieldError(fieldState, isSubmitted) ? fieldState.error?.message : undefined;

export const SERIAL_DUPLICATE_MESSAGE = 'Số sê-ri vé số đã tồn tại trong hệ thống.';
export const DUPLICATE_NUMBERS_MESSAGE = 'Dãy số bị trùng trong cùng một lần nhập.';
export const TICKET_WITHOUT_SERIAL_MESSAGE = 'Mỗi dãy số phải có ít nhất một số sê-ri.';
export const SERIAL_WITHOUT_TICKET_MESSAGE = 'Số sê-ri phải thuộc một dãy số.';
export const QUOTA_OVERFLOW_SERIAL_MESSAGE = 'Số lượng vé vượt quá số lượng còn lại có thể nhập.';
export const QUOTA_UNDER_DECLARE_MESSAGE =
    'Số lượng vé nhập ít hơn số lượng còn lại theo khai báo.';

export const normalizeSerialNumber = (value?: string) => value?.trim().toLowerCase() ?? '';
export const normalizeTicketNumbers = (value?: string) => value?.trim() ?? '';

export type SerialInput = { id?: string | number; serialNumber?: string };
export type TicketSectionInput = { numbers?: string; serials?: SerialInput[]; ticketId?: number };
export type SerialPath = { sectionIndex: number; serialIndex: number };

export type SectionRelationshipIssue =
    | { type: 'ticket_without_serial'; sectionIndex: number }
    | { type: 'serial_without_ticket'; sectionIndex: number; serialIndex: number }
    | { type: 'empty_ticket'; sectionIndex: number };

export const countFilledSerials = (sections: TicketSectionInput[]) =>
    sections.reduce((total, section) => {
        const filledInSection = (section.serials ?? []).filter((serial) =>
            normalizeSerialNumber(serial.serialNumber)
        ).length;
        return total + filledInSection;
    }, 0);

/** @deprecated Use countFilledSerials for quota checks */
export const countPendingSerials = countFilledSerials;

export const sectionHasFilledSerial = (section: TicketSectionInput) =>
    (section.serials ?? []).some((serial) => normalizeSerialNumber(serial.serialNumber));

export const findSectionRelationshipIssues = (
    sections: TicketSectionInput[]
): SectionRelationshipIssue[] => {
    const issues: SectionRelationshipIssue[] = [];

    sections.forEach((section, sectionIndex) => {
        const hasNumber = !!normalizeTicketNumbers(section.numbers);
        const filledSerialIndices = (section.serials ?? [])
            .map((serial, serialIndex) =>
                normalizeSerialNumber(serial.serialNumber) ? serialIndex : -1
            )
            .filter((serialIndex) => serialIndex >= 0);

        if (!hasNumber && filledSerialIndices.length === 0) {
            issues.push({ type: 'empty_ticket', sectionIndex });
            return;
        }

        if (!hasNumber && filledSerialIndices.length > 0) {
            filledSerialIndices.forEach((serialIndex) => {
                issues.push({ type: 'serial_without_ticket', sectionIndex, serialIndex });
            });
            return;
        }

        if (hasNumber && filledSerialIndices.length === 0) {
            issues.push({ type: 'ticket_without_serial', sectionIndex });
        }
    });

    return issues;
};

export const findQuotaOverflowSerialPaths = (
    sections: TicketSectionInput[],
    remainingQuota: number
): SerialPath[] => {
    const safeQuota = Math.max(0, remainingQuota);
    const overflowPaths: SerialPath[] = [];
    let filledCount = 0;

    sections.forEach((section, sectionIndex) => {
        (section.serials ?? []).forEach((serial, serialIndex) => {
            if (!normalizeSerialNumber(serial.serialNumber)) {
                return;
            }
            // Persisted serials already count toward imported quota on the server.
            if (serial.id != null && String(serial.id).trim() !== '') {
                return;
            }
            filledCount += 1;
            if (filledCount > safeQuota) {
                overflowPaths.push({ sectionIndex, serialIndex });
            }
        });
    });

    return overflowPaths;
};

export const applySectionRelationshipFieldErrors = (
    issues: SectionRelationshipIssue[],
    setError: UseFormSetError<CreateTicketFormValues>
) => {
    issues.forEach((issue) => {
        if (issue.type === 'ticket_without_serial') {
            setError(`ticketSections.${issue.sectionIndex}.serials.root`, {
                type: 'relationship',
                message: TICKET_WITHOUT_SERIAL_MESSAGE,
            });
            setError(`ticketSections.${issue.sectionIndex}.serials.0.serialNumber`, {
                type: 'relationship',
                message: TICKET_WITHOUT_SERIAL_MESSAGE,
            });
        } else if (issue.type === 'serial_without_ticket') {
            setError(`ticketSections.${issue.sectionIndex}.numbers`, {
                type: 'relationship',
                message: SERIAL_WITHOUT_TICKET_MESSAGE,
            });
            setError(`ticketSections.${issue.sectionIndex}.serials.${issue.serialIndex}.serialNumber`, {
                type: 'relationship',
                message: SERIAL_WITHOUT_TICKET_MESSAGE,
            });
        } else if (issue.type === 'empty_ticket') {
            setError(`ticketSections.${issue.sectionIndex}.numbers`, {
                type: 'relationship',
                message: 'Dãy số không được để trống',
            });
        }
    });
};

export const applyQuotaOverflowFieldErrors = (
    paths: SerialPath[],
    setError: UseFormSetError<CreateTicketFormValues>,
    message: string = QUOTA_OVERFLOW_SERIAL_MESSAGE
) => {
    paths.forEach(({ sectionIndex, serialIndex }) => {
        setError(`ticketSections.${sectionIndex}.serials.${serialIndex}.serialNumber`, {
            type: 'quota',
            message,
        });
    });
};

export const isQuotaExceededApiError = (error: unknown): boolean => {
    const code = (error as any)?.response?.data?.code ?? (error as any)?.response?.data?.errorCode;
    const message = String((error as any)?.response?.data?.message ?? '');
    return (
        code === 'IMPORT_BATCH_LINE_QUANTITY_EXCEEDED' ||
        message.toLowerCase().includes('vượt quá số lượng')
    );
};

/** Returns every index whose serial appears more than once within a flat list. */
export const findDuplicateSerialIndices = (serials: SerialInput[]): number[] => {
    const groups = new Map<string, number[]>();

    serials.forEach((serial, index) => {
        const key = normalizeSerialNumber(serial.serialNumber);
        if (!key) {
            return;
        }
        const bucket = groups.get(key) ?? [];
        bucket.push(index);
        groups.set(key, bucket);
    });

    const duplicateIndices: number[] = [];
    groups.forEach((indices) => {
        if (indices.length > 1) {
            duplicateIndices.push(...indices);
        }
    });

    return duplicateIndices.sort((a, b) => a - b);
};

export const findDuplicateSerialPaths = (sections: TicketSectionInput[]): SerialPath[] => {
    const groups = new Map<string, SerialPath[]>();

    sections.forEach((section, sectionIndex) => {
        (section.serials ?? []).forEach((serial, serialIndex) => {
            const key = normalizeSerialNumber(serial.serialNumber);
            if (!key) {
                return;
            }
            const bucket = groups.get(key) ?? [];
            bucket.push({ sectionIndex, serialIndex });
            groups.set(key, bucket);
        });
    });

    const duplicatePaths: SerialPath[] = [];
    groups.forEach((paths) => {
        if (paths.length > 1) {
            duplicatePaths.push(...paths);
        }
    });

    return duplicatePaths.sort((a, b) => {
        if (a.sectionIndex !== b.sectionIndex) {
            return a.sectionIndex - b.sectionIndex;
        }
        return a.serialIndex - b.serialIndex;
    });
};

export const findDuplicateNumberSectionIndices = (sections: TicketSectionInput[]): number[] => {
    const groups = new Map<string, number[]>();

    sections.forEach((section, sectionIndex) => {
        const key = normalizeTicketNumbers(section.numbers);
        if (!key) {
            return;
        }
        const bucket = groups.get(key) ?? [];
        bucket.push(sectionIndex);
        groups.set(key, bucket);
    });

    const duplicateIndices: number[] = [];
    groups.forEach((indices) => {
        if (indices.length > 1) {
            duplicateIndices.push(...indices);
        }
    });

    return duplicateIndices.sort((a, b) => a - b);
};

export const isSerialDuplicateApiError = (error: unknown): boolean => {
    const message =
        (error as any)?.response?.data?.message ?? (error as any)?.message ?? '';
    const code = (error as any)?.response?.data?.code ?? (error as any)?.response?.data?.errorCode;

    return (
        code === 'LT_008' ||
        code === 'LT_085' ||
        String(message).toLowerCase().includes('sê-ri') ||
        String(message).toLowerCase().includes('serial')
    );
};

export const isDuplicateNumbersApiError = (error: unknown): boolean => {
    const code = (error as any)?.response?.data?.code ?? (error as any)?.response?.data?.errorCode;
    return code === 'LT_085';
};

export const findSerialPathsForApiFailure = (sections: TicketSectionInput[]): SerialPath[] => {
    const duplicatePaths = findDuplicateSerialPaths(sections);
    if (duplicatePaths.length > 0) {
        return duplicatePaths;
    }

    const filledPaths: SerialPath[] = [];
    sections.forEach((section, sectionIndex) => {
        (section.serials ?? []).forEach((serial, serialIndex) => {
            if (normalizeSerialNumber(serial.serialNumber)) {
                filledPaths.push({ sectionIndex, serialIndex });
            }
        });
    });
    return filledPaths;
};

export const applySerialDuplicateFieldErrors = (
    paths: SerialPath[],
    setError: UseFormSetError<CreateTicketFormValues>,
    message: string = SERIAL_DUPLICATE_MESSAGE
) => {
    paths.forEach(({ sectionIndex, serialIndex }) => {
        setError(`ticketSections.${sectionIndex}.serials.${serialIndex}.serialNumber`, {
            type: 'duplicate',
            message,
        });
    });
};

export const applyDuplicateNumberFieldErrors = (
    sectionIndices: number[],
    setError: UseFormSetError<CreateTicketFormValues>,
    message: string = DUPLICATE_NUMBERS_MESSAGE
) => {
    sectionIndices.forEach((sectionIndex) => {
        setError(`ticketSections.${sectionIndex}.numbers`, {
            type: 'duplicate',
            message,
        });
    });
};

export const clearSerialDuplicateFieldErrors = (
    paths: SerialPath[],
    clearErrors: UseFormClearErrors<CreateTicketFormValues>
) => {
    paths.forEach(({ sectionIndex, serialIndex }) => {
        clearErrors(`ticketSections.${sectionIndex}.serials.${serialIndex}.serialNumber`);
    });
};

export const clearDuplicateNumberFieldErrors = (
    sectionIndices: number[],
    clearErrors: UseFormClearErrors<CreateTicketFormValues>
) => {
    sectionIndices.forEach((sectionIndex) => {
        clearErrors(`ticketSections.${sectionIndex}.numbers`);
    });
};

export const findFirstSerialErrorPath = (
    errors: FieldErrors<CreateTicketFormValues>
): SerialPath | null => {
    const sections = errors.ticketSections;
    if (!sections || !Array.isArray(sections)) {
        return null;
    }

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
        const sectionError = sections[sectionIndex];
        if (!sectionError || typeof sectionError !== 'object') {
            continue;
        }

        if ('numbers' in sectionError && sectionError.numbers) {
            continue;
        }

        const serialPath = findFirstSerialInSection(sectionError, sectionIndex);
        if (serialPath) {
            return serialPath;
        }
    }

    return null;
};

const findFirstSerialInSection = (
    sectionError: Record<string, unknown>,
    sectionIndex: number
): SerialPath | null => {
    const serialErrors = sectionError.serials;
    if (!serialErrors || !Array.isArray(serialErrors)) {
        return null;
    }

    for (let serialIndex = 0; serialIndex < serialErrors.length; serialIndex += 1) {
        const serialError = serialErrors[serialIndex];
        if (serialError && typeof serialError === 'object' && 'serialNumber' in serialError) {
            return { sectionIndex, serialIndex };
        }
    }

    return null;
};

export const scrollToSerialField = (sectionIndex: number, serialIndex: number) => {
    requestAnimationFrame(() => {
        document.getElementById(`ticket-serial-field-${sectionIndex}-${serialIndex}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    });
};

export const scrollToNumberField = (sectionIndex: number) => {
    requestAnimationFrame(() => {
        document.getElementById(`ticket-number-field-${sectionIndex}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    });
};

export const scrollAndFocusNumberField = (sectionIndex: number) => {
    requestAnimationFrame(() => {
        const container = document.getElementById(`ticket-number-field-${sectionIndex}`);
        container?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
        const input = container?.querySelector('input');
        if (input instanceof HTMLInputElement) {
            window.setTimeout(() => {
                input.focus({ preventScroll: true });
            }, 300);
        }
    });
};
