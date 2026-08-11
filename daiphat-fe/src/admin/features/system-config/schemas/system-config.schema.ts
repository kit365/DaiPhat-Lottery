import { z } from 'zod';
import {
    ConfigDataType,
    parseValidationRules,
    SystemConfigValidationRules,
} from '../types/system-config';

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
        .refine(
            (val) => /^([01]\d|2[0-3]):[0-5]\d$/.test(val),
            'Giá trị phải có định dạng HH:mm (ví dụ 17:00)'
        );

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

const applyDecimalRules = (schema: z.ZodString, rules: SystemConfigValidationRules | null) => {
    if (!rules) return schema;
    return schema.superRefine((val, ctx) => {
        const num = Number(val);
        if (Number.isNaN(num)) return;
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
            return applyDecimalRules(
                z
                    .string()
                    .trim()
                    .min(1, 'Giá trị không được để trống')
                    .refine((val) => /^-?\d+(\.\d+)?$/.test(val), 'Giá trị phải là số thập phân'),
                rules
            );
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
        case ConfigDataType.STRING: {
            const allowEmpty = Boolean(rules?.allowEmpty);
            const allowedValues = rules?.allowedValues?.filter(Boolean) ?? [];
            let schema = z.string();
            if (!allowEmpty) {
                schema = schema.trim().min(1, 'Giá trị không được để trống');
            }
            return schema.superRefine((val, ctx) => {
                const normalized = val.trim();
                if (!allowEmpty && !normalized) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Giá trị không được để trống',
                    });
                }
                if (typeof rules?.maxLength === 'number' && normalized.length > rules.maxLength) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Tối đa ${rules.maxLength} ký tự`,
                    });
                }
                if (allowedValues.length > 0 && !allowedValues.includes(normalized)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Giá trị phải là một trong: ${allowedValues.join(', ')}`,
                    });
                }
            });
        }
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
