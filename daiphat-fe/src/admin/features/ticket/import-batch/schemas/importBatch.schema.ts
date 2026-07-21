import { z } from 'zod';
import type { ImportBatchType } from '../types/importBatch.type';
import {
    declaredQuantitiesMatch,
    IMPORT_BATCH_DECLARE_QUANTITY_MISMATCH_MESSAGE,
    sumImportBatchLineDeclaredQuantity,
} from '../utils/importBatchDeclaredQuantity';
import { hasInvoiceEvidence } from '../utils/invoiceEvidence';

/** URL đã upload hoặc File local — upload khi bấm xác nhận/lưu. */
const invoiceEvidenceSchema = z.union([z.string(), z.instanceof(File)]).nullish();

const importBatchLineSchema = z.object({
    lotteryStationId: z.coerce.number().min(1, 'Vui lòng chọn nhà đài'),
    declareQuantity: z.coerce.number().min(1, 'Số lượng khai báo phải lớn hơn 0'),
    importCost: z.coerce.number().min(0.01, 'Giá vốn phải lớn hơn 0'),
    resolvedBatchType: z
        .enum(['NEW', 'SUPPLEMENTARY', 'LATE_IMPORT', 'ADJUSTMENT'])
        .optional(),
    stationName: z.string().optional(),
});

export const createImportBatchSchema = z
    .object({
        drawDate: z.string().min(1, 'Vui lòng chọn ngày quay'),
        supplierId: z.coerce.number().min(1, 'Vui lòng chọn nhà cung cấp'),
        importMode: z.enum(['IN_DAY', 'POST_DRAW_SUPPLEMENT']),
        totalDeclareQuantity: z.coerce
            .number()
            .min(1, 'Tổng số lượng khai báo phiếu nhập lô phải lớn hơn 0'),
        invoiceEvidenceUrl: invoiceEvidenceSchema,
        note: z.string().optional(),
        lines: z.array(importBatchLineSchema),
    })
    .superRefine((data, ctx) => {
        if (data.lines.length < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Phải có ít nhất một dòng nhập lô.',
                path: ['lines'],
            });
            return;
        }

        if (!declaredQuantitiesMatch(data.totalDeclareQuantity, data.lines)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: IMPORT_BATCH_DECLARE_QUANTITY_MISMATCH_MESSAGE,
                path: ['totalDeclareQuantity'],
            });
        }

        const stationIds = new Set<number>();
        let requiresInvoice = false;

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
                requiresInvoice = true;
            }
        });

        if (data.importMode === 'IN_DAY' && requiresInvoice && !hasInvoiceEvidence(data.invoiceEvidenceUrl)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vui lòng chọn ảnh biên lai.',
                path: ['invoiceEvidenceUrl'],
            });
        }
    });

export type CreateImportBatchFormValues = z.infer<typeof createImportBatchSchema>;
export type CreateImportBatchLineFormValues = z.infer<typeof importBatchLineSchema>;

const updateImportBatchLineSchema = z
    .object({
        id: z.number().optional(),
        lotteryStationId: z.coerce.number().optional(),
        declareQuantity: z.coerce.number().optional(),
        importCost: z.coerce.number().optional(),
        resolvedBatchType: z
            .enum(['NEW', 'SUPPLEMENTARY', 'LATE_IMPORT', 'ADJUSTMENT'])
            .optional(),
        status: z.enum(['OPEN', 'IMPORTING', 'PAUSED', 'IMPORTED', 'CANCELLED']).optional(),
        readOnly: z.boolean().optional(),
        removed: z.boolean().optional(),
        stationName: z.string().optional(),
        totalQuantity: z.number().optional(),
        restoredFromCreate: z.boolean().optional(),
    })
    .superRefine((line, ctx) => {
        if (line.removed) {
            return;
        }

        if (!line.lotteryStationId || line.lotteryStationId < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vui lòng chọn nhà đài',
                path: ['lotteryStationId'],
            });
        }

        if (!line.declareQuantity || line.declareQuantity < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Số lượng khai báo phải lớn hơn 0',
                path: ['declareQuantity'],
            });
        }

        const imported = line.totalQuantity ?? 0;
        // PAUSED lines may temporarily go below imported while the reduction dialog
        // selects tickets to delete; BE enforces consistency after ticket removal.
        if (
            imported > 0 &&
            line.declareQuantity != null &&
            line.declareQuantity < imported &&
            line.status !== 'PAUSED'
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Số lượng khai báo (${line.declareQuantity.toLocaleString('vi-VN')}) không được nhỏ hơn số vé đã nhập (${imported.toLocaleString('vi-VN')}). Vui lòng xóa bớt vé đã nhập trước khi giảm số lượng khai báo.`,
                path: ['declareQuantity'],
            });
        }

        if (line.importCost == null || line.importCost < 0.01) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Giá vốn phải lớn hơn 0',
                path: ['importCost'],
            });
        }
    });

export const updateImportBatchHeaderSchema = z.object({
    supplierId: z.coerce.number().min(1, 'Vui lòng chọn nhà cung cấp'),
    drawDate: z.string().min(1, 'Vui lòng chọn ngày quay'),
    invoiceEvidenceUrl: invoiceEvidenceSchema,
});

export type UpdateImportBatchHeaderFormValues = z.infer<typeof updateImportBatchHeaderSchema>;

export const updateImportBatchSchema = z
    .object({
        supplierId: z.coerce.number().min(1, 'Vui lòng chọn nhà cung cấp'),
        totalDeclareQuantity: z.coerce
            .number()
            .min(1, 'Tổng số lượng khai báo phiếu nhập lô phải lớn hơn 0'),
        invoiceEvidenceUrl: invoiceEvidenceSchema,
        importMode: z.enum(['IN_DAY', 'POST_DRAW_SUPPLEMENT']),
        drawDate: z.string().min(1),
        lines: z.array(updateImportBatchLineSchema),
    })
    .superRefine((data, ctx) => {
        const activeLines = data.lines.filter((line) => !line.removed);
        if (activeLines.length < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Phải có ít nhất một dòng nhập lô.',
                path: ['lines'],
            });
            return;
        }

        if (!declaredQuantitiesMatch(data.totalDeclareQuantity, data.lines)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: IMPORT_BATCH_DECLARE_QUANTITY_MISMATCH_MESSAGE,
                path: ['totalDeclareQuantity'],
            });
        }

        const stationIds = new Set<number>();
        let requiresInvoice = false;

        activeLines.forEach((line) => {
            const lineIndex = data.lines.indexOf(line);
            if (line.lotteryStationId != null) {
                if (stationIds.has(line.lotteryStationId)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Mỗi nhà đài chỉ được xuất hiện một lần trong phiếu.',
                        path: ['lines', lineIndex, 'lotteryStationId'],
                    });
                }
                stationIds.add(line.lotteryStationId);
            }

            const type = line.resolvedBatchType as ImportBatchType | undefined;
            if (data.importMode === 'IN_DAY' && (type === 'NEW' || type === 'LATE_IMPORT')) {
                requiresInvoice = true;
            }
        });

        if (data.importMode === 'IN_DAY' && requiresInvoice && !hasInvoiceEvidence(data.invoiceEvidenceUrl)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vui lòng chọn ảnh biên lai.',
                path: ['invoiceEvidenceUrl'],
            });
        }
    });

export type UpdateImportBatchFormValues = z.infer<typeof updateImportBatchSchema>;
export type UpdateImportBatchLineFormValues = z.infer<typeof updateImportBatchLineSchema>;
