import { describe, expect, it } from 'vitest';
import {
    isOcrLegacyFallbackMessage,
    isOcrTimeoutMessage,
    normalizeOcrScanErrorMessage,
    normalizeOcrWarningList,
    OCR_SOFT_FAIL_MESSAGE,
    OCR_TIMEOUT_MESSAGE,
} from './ocrScanErrorMessage';

describe('ocrScanErrorMessage', () => {
    it('identifies legacy OCR fallback messages', () => {
        expect(
            isOcrLegacyFallbackMessage(
                'Đã chuyển sang OCR local (legacy) vì groq không dùng được: AI cloud tạm nghỉ sau khi hết hạn mức (còn ~887s). Dùng OCR local.'
            )
        ).toBe(true);
        expect(
            isOcrLegacyFallbackMessage(
                'Hạn mức quét AI trong ngày đã hết. Hệ thống dùng OCR local.'
            )
        ).toBe(true);
        expect(isOcrLegacyFallbackMessage('Ảnh bị mờ')).toBe(false);
    });

    it('filters out legacy fallback messages from toast warning list', () => {
        const warnings = [
            'Đã chuyển sang OCR local (legacy) vì groq không dùng được: AI cloud tạm nghỉ',
            'Một số thông tin trên vé bị che hoặc không rõ.',
        ];
        const normalized = normalizeOcrWarningList(warnings);
        expect(normalized).toHaveLength(1);
        expect(normalized[0]).not.toContain('legacy');
        expect(normalized[0]).not.toContain('OCR local');
    });

    it('normalizes legacy fallback messages to soft fail copy instead of legacy toast', () => {
        const result = normalizeOcrScanErrorMessage(
            'Đã chuyển sang OCR local (legacy) vì groq không dùng được'
        );
        expect(result).toBe(OCR_SOFT_FAIL_MESSAGE);
    });

    it('maps proxy/axios OCR deadlines to a clear timeout message', () => {
        expect(
            normalizeOcrScanErrorMessage(
                'Không kết nối được máy chủ API. Kiểm tra backend đang chạy.'
            )
        ).toBe(OCR_TIMEOUT_MESSAGE);
        expect(normalizeOcrScanErrorMessage('timeout of 190000ms exceeded')).toBe(
            OCR_TIMEOUT_MESSAGE
        );
        expect(isOcrTimeoutMessage('Quét OCR mất quá nhiều thời gian')).toBe(true);
    });
});
