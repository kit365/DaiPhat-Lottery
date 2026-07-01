import { z } from "zod";
import { isProviderActivationReady } from "../pages/provider/utils/provider-activation";

const commissionRateSchema = z
    .union([z.number(), z.null()])
    .optional()
    .refine(
        (value) => value == null || (value >= 0 && value <= 1),
        "Tỷ lệ hoa hồng phải từ 0% đến 100%"
    );

export const createProviderSchema = z.object({
    name: z
        .string()
        .min(1, "Tên sản phẩm không được để trống")
        .max(100),

    province: z.string().optional(),
    region: z.string().optional(),

    price: z.number().min(1, "Giá vé phải lớn hơn 0"),

    commissionRate: commissionRateSchema,

    drawDays: z.array(z.string()).min(1, "Danh sách ngày quay không được để trống"),
    drawTime: z.string().min(1, "Giờ quay không được để trống"),

    description: z.string().optional(),
    image: z.any().optional(),

    isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if (data.isActive && !isProviderActivationReady(data)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Vui lòng hoàn thiện tất cả thông tin bắt buộc trước khi kích hoạt nhà đài",
            path: ["isActive"],
        });
    }
});

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;

export { isProviderActivationReady };
