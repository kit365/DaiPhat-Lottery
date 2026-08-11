/** Local File until upload; URL string after successful upload / from server. */
export type InvoiceEvidenceValue = string | File | null | undefined;

export const hasInvoiceEvidence = (value: InvoiceEvidenceValue): boolean => {
    if (value instanceof File) {
        return value.size > 0;
    }
    return typeof value === 'string' && value.trim().length > 0;
};

/**
 * True after upload completes with a persistable URL (not blob/data/File).
 * Accepts absolute http(s) (Cloudinary) and safe relative paths like `/uploads/...`
 * from local storage — same rules as BE StorageUtils.validateImageEvidenceUrl.
 */
export const isPersistableInvoiceEvidenceUrl = (value: InvoiceEvidenceValue): boolean => {
    if (typeof value !== 'string') {
        return false;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
        return false;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return true;
    }
    // Local filesystem storage returns `/uploads/...` when public-base-url is empty.
    return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('..');
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
