import { z } from 'zod';

const drawTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const supplierFormSchema = z
    .object({
        name: z.string().trim().min(1, 'Vui lòng nhập tên nhà cung cấp'),
        code: z
            .string()
            .trim()
            .min(1, 'Vui lòng nhập mã nhà cung cấp')
            .regex(/^[A-Za-z0-9_]+$/, 'Mã chỉ gồm chữ cái không dấu, số và dấu gạch dưới'),
        type: z.enum(['LOTTERY_COMPANY', 'DISTRIBUTOR'], {
            message: 'Vui lòng chọn loại nhà cung cấp',
        }),
        contactName: z.string().optional(),
        contactPhone: z
            .string()
            .trim()
            .min(1, 'Vui lòng nhập số điện thoại')
            .regex(/^[0-9+.\-\s]{8,20}$/, 'Số điện thoại không đúng định dạng'),
        contactEmail: z
            .string()
            .optional()
            .refine((v) => !v || v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
                message: 'Email không đúng định dạng',
            }),
        address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ'),
        taxCode: z.string().trim().min(1, 'Vui lòng nhập mã số thuế'),
        paymentTermDays: z
            .any()
            .refine((v) => v !== '' && v !== undefined && v !== null, {
                message: 'Vui lòng nhập số ngày thanh toán',
            })
            .transform((v) => Number(v))
            .refine((v) => !isNaN(v), { message: 'Vui lòng nhập số hợp lệ' })
            .refine((v) => v >= 0, { message: 'Số ngày thanh toán không được âm' }),
        defaultImportCost: z
            .any()
            .refine((v) => v !== '' && v !== undefined && v !== null, {
                message: 'Vui lòng nhập giá vốn mặc định',
            })
            .transform((v) => Number(v))
            .refine((v) => !isNaN(v), { message: 'Vui lòng nhập số hợp lệ' })
            .refine((v) => v >= 0, { message: 'Giá vốn mặc định không được âm' }),
        importAllowFrom: z
            .string()
            .trim()
            .regex(drawTimePattern, 'Giờ cho phép nhập vé phải theo định dạng HH:mm'),
        returnCutOffTime: z
            .string()
            .trim()
            .regex(drawTimePattern, 'Hạn trả vé phải theo định dạng HH:mm'),
        paymentCutOffTime: z
            .string()
            .trim()
            .regex(drawTimePattern, 'Giờ thanh toán NCC phải theo định dạng HH:mm'),
        isActive: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (data.importAllowFrom && data.returnCutOffTime) {
            if (data.returnCutOffTime <= data.importAllowFrom) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Hạn trả vé phải sau giờ bắt đầu cho phép nhập vé',
                    path: ['returnCutOffTime'],
                });
            }
        }
        if (data.returnCutOffTime && data.paymentCutOffTime) {
            if (data.paymentCutOffTime <= data.returnCutOffTime) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Giờ thanh toán NCC phải sau hạn trả vé',
                    path: ['paymentCutOffTime'],
                });
            }
        }
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
    importAllowFrom: '08:00',
    returnCutOffTime: '14:30',
    paymentCutOffTime: '19:00',
    isActive: true,
};
