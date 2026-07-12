import { z } from "zod";

export const createProviderSchema = z.object({
    name: z
        .string()
        .min(1, "Tên sản phẩm không được để trống")
        .max(100),

    province: z.string().optional(),
    region: z.string().optional(),

    price: z.number().min(1, "Giá vé phải lớn hơn 0"),

    commissionRate: z.coerce
        .number({
            required_error: "Tỷ lệ hoa hồng không được để trống",
            invalid_type_error: "Tỷ lệ hoa hồng không hợp lệ",
        })
        .min(0, "Tỷ lệ hoa hồng phải từ 0 trở lên")
        .max(1, "Tỷ lệ hoa hồng không vượt quá 100%"),

    drawDays: z.array(z.string()).min(1, "Danh sách ngày quay không được để trống"),
    drawTime: z.string().min(1, "Giờ quay không được để trống"),

    description: z.string().optional(),
    image: z.any().optional(),

    status: z.enum(["active", "inactive"]).optional(),
});

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;
