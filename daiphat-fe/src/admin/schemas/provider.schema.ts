import { z } from "zod";

export const createProviderSchema = z.object({
    name: z
        .string()
        .min(1, "Tên sản phẩm không được để trống")
        .max(100),

    province: z.string().optional(),
    region: z.string().optional(),

    price: z.number().min(1, "Giá vé phải lớn hơn 0"),

    drawDays: z.array(z.string()).min(1, "Danh sách ngày quay không được để trống"),
    drawTime: z.string().min(1, "Giờ quay không được để trống"),

    description: z.string().optional(),
    image: z.any().optional(),

    status: z.enum(["active", "inactive"]).optional(),
});

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;
