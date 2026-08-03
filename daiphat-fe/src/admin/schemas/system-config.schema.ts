import { z } from 'zod';
import {
    ConfigDataType,
    parseValidationRules,
    SystemConfigValidationRules,
} from '../features/system-config/types/system-config';

const descriptionSchema = z
    .string()
    .trim()
    .min(1, 'Mô tả không được để trống')
    .max(255, 'Mô tả tối đa 255 ký tự');

const intValueSchema = z
    .string()
    .trim()
    .min(1, 'Giá trị không được để trống')
    .refine((val) => /^-?\d+$/.test(val), 'Giá trị phải là số nguyên');

const timeValueSchema = z
    .string()
    .trim()
    .min(1, 'Giá trị không được để trống')
    .refine((val) => /^([01]\d|2[0-3]):[0-5]\d$/.test(val), 'Giá trị phải có định dạng HH:mm');

const applyIntRules = (schema: z.ZodString, rules: SystemConfigValidationRules | null) => {
    if (!rules) return schema;
    return schema.superRefine((val, ctx) => {
        const num = Number(val);
        if (typeof rules.min === 'number' && num < rules.min) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Giá trị tối thiểu là ${rules.min}`,
            });
        }
        if (typeof rules.max === 'number' && num > rules.max) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Giá trị tối đa là ${rules.max}`,
            });
        }
    });
};

const applyTimeRules = (schema: z.ZodString, rules: SystemConfigValidationRules | null) => {
    if (!rules) return schema;
    return schema.superRefine((val, ctx) => {
        if (typeof rules.min === 'string' && val < rules.min) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Giá trị không được trước ${rules.min}`,
            });
        }
        if (typeof rules.max === 'string' && val > rules.max) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Giá trị không được sau ${rules.max}`,
            });
        }
    });
};

const getValueSchema = (dataType: ConfigDataType, validationRules?: string | null) => {
    const rules = parseValidationRules(validationRules);
    switch (dataType) {
        case ConfigDataType.INT:
            return applyIntRules(intValueSchema, rules);
        case ConfigDataType.TIME:
            return applyTimeRules(timeValueSchema, rules);
        case ConfigDataType.BOOLEAN:
            return z.enum(['true', 'false'], { message: 'Giá trị phải là true hoặc false' });
        case ConfigDataType.DECIMAL:
            return z
                .string()
                .trim()
                .min(1, 'Giá trị không được để trống')
                .refine((val) => /^-?\d+(\.\d+)?$/.test(val), 'Giá trị phải là số thập phân');
        case ConfigDataType.JSON:
            return z
                .string()
                .trim()
                .min(1, 'Giá trị không được để trống')
                .superRefine((val, ctx) => {
                    try {
                        JSON.parse(val);
                    } catch {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: 'Giá trị phải là JSON hợp lệ',
                        });
                    }
                });
        default:
            return z.string().trim().min(1, 'Giá trị không được để trống');
    }
};

export const createUpdateSystemConfigSchema = (
    dataType: ConfigDataType,
    validationRules?: string | null
) =>
    z.object({
        configName: z
            .string()
            .trim()
            .min(1, 'Tên cấu hình không được để trống')
            .max(255, 'Tên cấu hình tối đa 255 ký tự'),
        configValue: getValueSchema(dataType, validationRules),
        description: descriptionSchema,
    });

export type UpdateSystemConfigFormValues = z.infer<
    ReturnType<typeof createUpdateSystemConfigSchema>
>;
