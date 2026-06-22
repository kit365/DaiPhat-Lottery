import { z } from 'zod';
import { ConfigDataType } from '../pages/settings/types/system-config';

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

const getValueSchema = (dataType: ConfigDataType) => {
    switch (dataType) {
        case ConfigDataType.INT:
            return intValueSchema;
        case ConfigDataType.TIME:
            return timeValueSchema;
        default:
            return intValueSchema;
    }
};

export const createUpdateSystemConfigSchema = (dataType: ConfigDataType) =>
    z.object({
        configValue: getValueSchema(dataType),
        description: descriptionSchema,
    });

export type UpdateSystemConfigFormValues = z.infer<
    ReturnType<typeof createUpdateSystemConfigSchema>
>;
