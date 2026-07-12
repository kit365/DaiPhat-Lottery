import { z } from "zod";

export const createProviderSchema = z.object({
    name: z
        .string()
        .min(1, "Tên nhà đài không được để trống")
        .max(100),

    province: z.string().optional(),

    region: z.string().trim().min(1, "Vui lòng chọn vùng miền"),

    price: z
        .number({
            required_error: "Vui lòng nhập giá vé",
            invalid_type_error: "Giá vé không hợp lệ",
        })
        .min(1, "Giá vé phải lớn hơn 0"),

    commissionRate: z.coerce
        .number({
            required_error: "Vui lòng nhập tỷ lệ hoa hồng",
            invalid_type_error: "Tỷ lệ hoa hồng không hợp lệ",
        })
        .min(0, "Tỷ lệ hoa hồng phải từ 0 trở lên")
        .max(1, "Tỷ lệ hoa hồng không vượt quá 100%"),

    drawDays: z
        .array(z.string())
        .min(1, "Vui lòng chọn lịch quay"),

    drawTime: z.string().trim().min(1, "Vui lòng chọn giờ quay"),

    description: z.string().optional(),
    image: z.any().optional(),

    status: z.enum(["active", "inactive"]).optional(),
});

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;
