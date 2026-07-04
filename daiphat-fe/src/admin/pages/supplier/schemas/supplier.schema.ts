import { z } from 'zod';

export const supplierFormSchema = z.object({
    name: z.string().trim().min(1, 'Vui lòng nhập tên nhà cung cấp'),
    code: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập mã nhà cung cấp')
        .regex(/^[A-Za-z0-9_]+$/, 'Mã chỉ gồm chữ, số và dấu gạch dưới'),
    type: z.enum(['LOTTERY_COMPANY', 'DISTRIBUTOR'], {
        required_error: 'Vui lòng chọn loại nhà cung cấp',
    }),
    contactName: z.string().optional(),
    contactPhone: z.string().trim().min(1, 'Vui lòng nhập số điện thoại'),
    contactEmail: z
        .string()
        .optional()
        .refine((v) => !v || v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
            message: 'Email không hợp lệ',
        }),
    address: z.string().optional(),
    taxCode: z.string().optional(),
    paymentTermDays: z.preprocess(
        (value) => (value === '' || value === undefined ? null : value),
        z.coerce.number().min(0, 'Số ngày thanh toán không được âm').nullable().optional()
    ),
    defaultImportCost: z.preprocess(
        (value) => (value === '' || value === undefined ? null : value),
        z.coerce.number().min(0, 'Giá vốn mặc định không được âm').nullable().optional()
    ),
    isActive: z.boolean(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
