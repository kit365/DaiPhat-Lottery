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
    address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ'),
    taxCode: z.string().trim().min(1, 'Vui lòng nhập mã số thuế'),
    paymentTermDays: z.preprocess(
        (value) => (value === '' || value === undefined || value === null ? undefined : value),
        z.coerce.number({
            required_error: 'Vui lòng nhập số ngày thanh toán',
            invalid_type_error: 'Vui lòng nhập số hợp lệ',
        }).min(0, 'Số ngày thanh toán không được âm')
    ),
    defaultImportCost: z.preprocess(
        (value) => (value === '' || value === undefined || value === null ? undefined : value),
        z.coerce.number({
            required_error: 'Vui lòng nhập giá vốn mặc định',
            invalid_type_error: 'Vui lòng nhập số hợp lệ',
        }).min(0, 'Giá vốn mặc định không được âm')
    ),
    isActive: z.boolean(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export const supplierFormDefaultValues: SupplierFormValues = {
    name: '',
    code: '',
    type: 'DISTRIBUTOR',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    taxCode: '',
    paymentTermDays: 0,
    defaultImportCost: 10000,
    isActive: true,
};
