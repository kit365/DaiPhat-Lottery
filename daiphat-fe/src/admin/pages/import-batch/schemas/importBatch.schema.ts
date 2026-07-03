import { z } from 'zod';
import type { ImportBatchType } from '../../../api/importBatch.api';

const importBatchLineSchema = z.object({
    lotteryStationId: z.coerce.number().min(1, 'Vui lòng chọn nhà đài'),
    declareQuantity: z.coerce.number().min(1, 'Số lượng khai báo phải lớn hơn 0'),
    importCost: z.coerce.number().min(0.01, 'Giá vốn phải lớn hơn 0'),
    resolvedBatchType: z
        .enum(['NEW', 'SUPPLEMENTARY', 'LATE_IMPORT', 'ADJUSTMENT'])
        .optional(),
});

export const createImportBatchSchema = z
    .object({
        drawDate: z.string().min(1, 'Vui lòng chọn ngày quay'),
        importMode: z.enum(['IN_DAY', 'POST_DRAW_SUPPLEMENT']),
        sharedInvoiceEvidenceUrl: z.string().optional(),
        lines: z.array(importBatchLineSchema).min(1, 'Phải có ít nhất một dòng nhập lô'),
    })
    .superRefine((data, ctx) => {
        const stationIds = new Set<number>();
        let requiresSharedReceipt = false;

        data.lines.forEach((line, index) => {
            if (stationIds.has(line.lotteryStationId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Mỗi nhà đài chỉ được xuất hiện một lần trong phiếu.',
                    path: ['lines', index, 'lotteryStationId'],
                });
            }
            stationIds.add(line.lotteryStationId);

            const type = line.resolvedBatchType as ImportBatchType | undefined;
            if (data.importMode === 'IN_DAY' && (type === 'NEW' || type === 'LATE_IMPORT')) {
                requiresSharedReceipt = true;
            }
        });

        if (
            data.importMode === 'IN_DAY' &&
            requiresSharedReceipt &&
            !data.sharedInvoiceEvidenceUrl?.trim()
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vui lòng tải lên ảnh biên lai.',
                path: ['sharedInvoiceEvidenceUrl'],
            });
        }
    });

export type CreateImportBatchFormValues = z.infer<typeof createImportBatchSchema>;
export type CreateImportBatchLineFormValues = z.infer<typeof importBatchLineSchema>;
