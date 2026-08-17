import { describe, expect, it } from 'vitest';
import { hasInvoiceEvidence, isPersistableInvoiceEvidenceUrl } from './invoiceEvidence';

describe('isPersistableInvoiceEvidenceUrl', () => {
    it('accepts absolute http(s) URLs', () => {
        expect(isPersistableInvoiceEvidenceUrl('https://cdn.example/receipt.jpg')).toBe(true);
        expect(isPersistableInvoiceEvidenceUrl('http://localhost:8080/uploads/a.jpg')).toBe(true);
    });

    it('accepts local storage relative upload paths', () => {
        expect(isPersistableInvoiceEvidenceUrl('/uploads/lottery-tickets/abc.jpg')).toBe(true);
    });

    it('rejects empty, blob, data, File, and unsafe paths', () => {
        expect(isPersistableInvoiceEvidenceUrl('')).toBe(false);
        expect(isPersistableInvoiceEvidenceUrl('   ')).toBe(false);
        expect(isPersistableInvoiceEvidenceUrl('blob:http://localhost/x')).toBe(false);
        expect(isPersistableInvoiceEvidenceUrl('data:image/png;base64,abc')).toBe(false);
        expect(isPersistableInvoiceEvidenceUrl(null)).toBe(false);
        expect(isPersistableInvoiceEvidenceUrl(new File(['x'], 'a.jpg'))).toBe(false);
        expect(isPersistableInvoiceEvidenceUrl('//evil.example/x.jpg')).toBe(false);
        expect(isPersistableInvoiceEvidenceUrl('/uploads/../secret.jpg')).toBe(false);
        expect(isPersistableInvoiceEvidenceUrl('not-a-url')).toBe(false);
    });
});

describe('hasInvoiceEvidence', () => {
    it('accepts non-empty File or string', () => {
        expect(hasInvoiceEvidence(new File(['x'], 'a.jpg'))).toBe(true);
        expect(hasInvoiceEvidence('/uploads/a.jpg')).toBe(true);
        expect(hasInvoiceEvidence('')).toBe(false);
    });
});
