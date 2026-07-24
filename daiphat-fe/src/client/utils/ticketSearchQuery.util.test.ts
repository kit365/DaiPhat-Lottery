import { describe, expect, it } from 'vitest';
import {
    isValidTicketSearchLength,
    normalizeTicketSearchDigits,
    normalizeTicketSearchMode,
} from './ticketSearchQuery.util';

describe('ticketSearchQuery.util [DP-37][DP-255]', () => {
    it('normalizeTicketSearchDigits: chỉ giữ số, cắt tối đa 6', () => {
        expect(normalizeTicketSearchDigits('68')).toBe('68');
        expect(normalizeTicketSearchDigits(' 8a6-8 ')).toBe('868');
        expect(normalizeTicketSearchDigits('123456789')).toBe('123456');
        expect(normalizeTicketSearchDigits(null)).toBe('');
        expect(normalizeTicketSearchDigits(undefined)).toBe('');
    });

    it('isValidTicketSearchLength: trống OK; có nhập thì ≥ 2', () => {
        expect(isValidTicketSearchLength('')).toBe(true);
        expect(isValidTicketSearchLength('6')).toBe(false);
        expect(isValidTicketSearchLength('68')).toBe(true);
        expect(isValidTicketSearchLength('686868')).toBe(true);
    });

    it('normalizeTicketSearchMode: parse case-insensitive, fallback SUFFIX', () => {
        expect(normalizeTicketSearchMode('suffix')).toBe('SUFFIX');
        expect(normalizeTicketSearchMode(' PREFIX ')).toBe('PREFIX');
        expect(normalizeTicketSearchMode('exact')).toBe('EXACT');
        expect(normalizeTicketSearchMode('contains')).toBe('CONTAINS');
        expect(normalizeTicketSearchMode(null)).toBe('SUFFIX');
        expect(normalizeTicketSearchMode('tail')).toBe('SUFFIX');
        expect(normalizeTicketSearchMode('bad', 'CONTAINS')).toBe('CONTAINS');
    });
});
