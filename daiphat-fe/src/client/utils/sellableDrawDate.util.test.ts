import { describe, expect, it } from 'vitest';
import {
    defaultSellableDrawDate,
    isTodayDrawPassed,
    resolveSellableDrawDateParam,
    tomorrowIsoVn,
} from './sellableDrawDate.util';

/** 24/07/2026 15:00 VN = 08:00 UTC */
const beforeDraw = new Date('2026-07-24T08:00:00.000Z');
/** 24/07/2026 16:15 VN = 09:15 UTC */
const atDraw = new Date('2026-07-24T09:15:00.000Z');
/** 24/07/2026 19:50 VN = 12:50 UTC */
const afterDraw = new Date('2026-07-24T12:50:00.000Z');

describe('sellableDrawDate.util', () => {
    it('isTodayDrawPassed: false trước 16:15, true từ 16:15', () => {
        expect(isTodayDrawPassed('16:15', beforeDraw)).toBe(false);
        expect(isTodayDrawPassed('16:15', atDraw)).toBe(true);
        expect(isTodayDrawPassed('16:15', afterDraw)).toBe(true);
    });

    it('defaultSellableDrawDate: hôm nay trước giờ xổ, ngày mai sau giờ xổ', () => {
        expect(defaultSellableDrawDate(beforeDraw)).toBe('2026-07-24');
        expect(defaultSellableDrawDate(afterDraw)).toBe('2026-07-25');
        expect(defaultSellableDrawDate(afterDraw)).toBe(tomorrowIsoVn(afterDraw));
    });

    it('resolveSellableDrawDateParam: clamp ngày hôm nay sau giờ xổ về ngày mai', () => {
        expect(resolveSellableDrawDateParam(null, afterDraw)).toBe('2026-07-25');
        expect(resolveSellableDrawDateParam('today', afterDraw)).toBe('2026-07-25');
        expect(resolveSellableDrawDateParam('2026-07-24', afterDraw)).toBe('2026-07-25');
        expect(resolveSellableDrawDateParam('2026-07-24', beforeDraw)).toBe('2026-07-24');
        expect(resolveSellableDrawDateParam('tomorrow', afterDraw)).toBe('2026-07-25');
    });
});
