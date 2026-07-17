/** Local File until save; URL string after upload / from server. */
export type InvoiceEvidenceValue = string | File | null | undefined;

export const hasInvoiceEvidence = (value: InvoiceEvidenceValue): boolean => {
    if (value instanceof File) {
        return value.size > 0;
    }
    return typeof value === 'string' && value.trim().length > 0;
};

export const resolveInvoiceEvidenceUrl = async (
    value: InvoiceEvidenceValue,
    upload: (file: File) => Promise<string>
): Promise<string | undefined> => {
    if (value instanceof File) {
        return upload(value);
    }
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    return undefined;
};

/** Draft / localStorage cannot store File — keep existing URL only. */
export const serializeInvoiceEvidenceForDraft = (value: InvoiceEvidenceValue): string =>
    typeof value === 'string' ? value.trim() : '';
