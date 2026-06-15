import { z } from "zod";

export const createProviderSchema = z.object({
    name: z
        .string()
        .min(1, "Tên sản phẩm không được để trống")
        .max(100),

    province: z.string().optional(),
    region: z.string().optional(),

    type: z.string().min(1, "Loại vé không được để trống"),

    numberLength: z.number().optional(),
    minNumber: z.number().optional(),
    maxNumber: z.number().optional(),

    price: z.number().min(1, "Giá vé phải lớn hơn 0"),

    drawSchedule: z.string().optional(),
    drawTime: z.string().optional(),

    description: z.string().optional(),
    image: z.any().optional(),
    displayOrder: z.number().optional(),

    status: z.enum(["active", "inactive"]).optional(),
});

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;
