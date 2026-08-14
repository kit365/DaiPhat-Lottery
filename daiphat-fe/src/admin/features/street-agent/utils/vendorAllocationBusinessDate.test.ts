import { describe, expect, it } from 'vitest';
import {
    minVendorAllocationBusinessDate,
    resolveVendorAllocationBusinessDate,
} from './vendorAllocationBusinessDate';

/** 13/08/2026 14:59 VN = 07:59 UTC */
const beforeCutoff = new Date('2026-08-13T07:59:00.000Z');
/** 13/08/2026 15:00 VN = 08:00 UTC */
const atCutoff = new Date('2026-08-13T08:00:00.000Z');
/** 13/08/2026 15:01 VN = 08:01 UTC */
const afterCutoff = new Date('2026-08-13T08:01:00.000Z');

describe('vendorAllocationBusinessDate', () => {
    it('min: hôm nay trước giờ chốt, ngày mai từ lúc chốt', () => {
        expect(minVendorAllocationBusinessDate('15:00', beforeCutoff)).toBe('2026-08-13');
        expect(minVendorAllocationBusinessDate('15:00', atCutoff)).toBe('2026-08-14');
        expect(minVendorAllocationBusinessDate('15:00', afterCutoff)).toBe('2026-08-14');
    });

    it('min: thiếu cutoff chỉ chặn ngày quá khứ (min = hôm nay VN)', () => {
        expect(minVendorAllocationBusinessDate(null, afterCutoff)).toBe('2026-08-13');
        expect(minVendorAllocationBusinessDate('bad', afterCutoff)).toBe('2026-08-13');
    });

    it('resolve: giữ ngày hợp lệ, clamp ngày đã khóa', () => {
        expect(resolveVendorAllocationBusinessDate('2026-08-13', '15:00', beforeCutoff)).toBe(
            '2026-08-13'
        );
        expect(resolveVendorAllocationBusinessDate('2026-08-13', '15:00', afterCutoff)).toBe(
            '2026-08-14'
        );
        expect(resolveVendorAllocationBusinessDate('2026-08-12', '15:00', beforeCutoff)).toBe(
            '2026-08-13'
        );
        expect(resolveVendorAllocationBusinessDate('2026-08-20', '15:00', afterCutoff)).toBe(
            '2026-08-20'
        );
    });
});
