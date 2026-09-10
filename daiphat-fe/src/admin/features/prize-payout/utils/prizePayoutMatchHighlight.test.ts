import { describe, expect, it } from 'vitest';
import { splitLastMatchHighlight } from './prizePayoutMatchHighlight';

describe('splitLastMatchHighlight', () => {
    it('highlights entire KQXS when it equals the matched suffix only', () => {
        expect(splitLastMatchHighlight('6207', 4)).toEqual([
            { text: '6207', highlighted: true },
        ]);
    });

    it('splits ticket prefix and highlighted suffix', () => {
        expect(splitLastMatchHighlight('196207', 4)).toEqual([
            { text: '19', highlighted: false },
            { text: '6207', highlighted: true },
        ]);
    });

    it('keeps prefix split when both sides have leading digits', () => {
        expect(splitLastMatchHighlight('084310', 5)).toEqual([
            { text: '0', highlighted: false },
            { text: '84310', highlighted: true },
        ]);
        expect(splitLastMatchHighlight('984310', 5)).toEqual([
            { text: '9', highlighted: false },
            { text: '84310', highlighted: true },
        ]);
    });

    it('respects display spaces in ticket numbers', () => {
        expect(splitLastMatchHighlight('19 6207', 4)).toEqual([
            { text: '19 ', highlighted: false },
            { text: '6207', highlighted: true },
        ]);
    });
});
