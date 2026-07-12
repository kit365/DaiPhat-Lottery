import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supplierBaseSchema = z.object({
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
        .refine((v) => !v || v.trim() === '' || emailRegex.test(v.trim()), {
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

/** Edit form — activation fields stay optional until the user turns on Hoạt động. */
export const supplierFormSchema = supplierBaseSchema;

/** Create form — address, phone, email, payment terms, and default cost are required. */
export const supplierCreateSchema = supplierBaseSchema.extend({
    contactEmail: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập email')
        .refine((v) => emailRegex.test(v), { message: 'Email không hợp lệ' }),
    address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ'),
    paymentTermDays: z.preprocess(
        (value) => (value === '' || value === undefined ? null : value),
        z.coerce
            .number({
                required_error: 'Vui lòng nhập số ngày thanh toán',
                invalid_type_error: 'Vui lòng nhập số ngày thanh toán',
            })
            .min(0, 'Số ngày thanh toán không được âm')
    ),
    defaultImportCost: z.preprocess(
        (value) => (value === '' || value === undefined ? null : value),
        z.coerce
            .number({
                required_error: 'Vui lòng nhập giá vốn mặc định',
                invalid_type_error: 'Vui lòng nhập giá vốn mặc định',
            })
            .gt(0, 'Giá vốn mặc định phải lớn hơn 0')
    ),
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
    isActive: false,
};

export const supplierCreateDefaultValues: SupplierFormValues = {
    ...supplierFormDefaultValues,
    isActive: true,
};
