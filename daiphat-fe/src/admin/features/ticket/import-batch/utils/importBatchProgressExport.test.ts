import { describe, expect, it } from 'vitest';
import { reconciliationFileStem } from './importBatchProgressExport';

describe('reconciliationFileStem', () => {
    it('names the reconciliation after the file it describes', () => {
        expect(reconciliationFileStem('phieu-nhap-ve-minh_chinh-20260817.xlsx')).toBe(
            'phieu-doi-chieu-phieu-nhap-ve-minh_chinh-20260817'
        );
    });

    /**
     * Exporting, re-uploading and exporting again is routine. Before this, each
     * pass glued another "phieu-doi-chieu-" on the front until the name outgrew
     * the cell that displays it.
     */
    it('does not stack its own prefix when re-exporting an export', () => {
        expect(
            reconciliationFileStem('phieu-doi-chieu-phieu-nhap-ve-minh_chinh-20260817-1602.xlsx')
        ).toBe('phieu-doi-chieu-phieu-nhap-ve-minh_chinh');
    });

    it('unwinds a name that already stacked several rounds', () => {
        expect(
            reconciliationFileStem(
                'phieu-doi-chieu-phieu-doi-chieu-doi-chieu-phieu-nhap-ve-20260817-1602.xlsx'
            )
        ).toBe('phieu-doi-chieu-phieu-nhap-ve');
    });

    it('falls back to a fixed stem when no file name is known', () => {
        expect(reconciliationFileStem()).toBe('phieu-doi-chieu-nhap-ve');
        expect(reconciliationFileStem('phieu-doi-chieu-.xlsx')).toBe('phieu-doi-chieu-nhap-ve');
    });

    it('keeps a name that merely looks similar', () => {
        expect(reconciliationFileStem('bang-doi-chieu-thang-8.xlsx')).toBe(
            'phieu-doi-chieu-bang-doi-chieu-thang-8'
        );
    });
});
