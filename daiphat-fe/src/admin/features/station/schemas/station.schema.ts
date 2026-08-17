import { z } from "zod";

export const createStationSchema = z.object({
    name: z
        .string()
        .min(1, "Tên nhà đài không được để trống")
        .max(100),

    code: z
        .string()
        .max(20, 'Mã nhà đài tối đa 20 ký tự')
        .regex(/^[A-Za-z0-9_-]*$/, 'Mã chỉ gồm chữ, số, gạch ngang và gạch dưới')
        .optional(),

    province: z.string().optional(),
    region: z.string().optional(),

    price: z.number().min(1, "Giá vé phải lớn hơn 0"),

    commissionRate: z.coerce
        .number()
        .gt(0, 'Tỉ lệ hoa hồng phải lớn hơn 0')
        .lte(1, 'Tỉ lệ hoa hồng không được vượt quá 1 (100%)'),

    drawDays: z.array(z.string()).min(1, "Danh sách ngày quay không được để trống"),
    drawTime: z.string().min(1, "Giờ quay không được để trống"),

    /** Empty = use global PRIZE_REDEMPTION_OFFICIAL_DEADLINE_DAYS. */
    prizeRedemptionOfficialDeadlineDays: z
        .union([z.literal(""), z.coerce.number().int().min(1).max(365)])
        .optional(),

    description: z.string().optional(),
    image: z.any().optional(),

    status: z.enum(["active", "inactive"]).optional(),
    type: z.string().optional(),
    numberLength: z.number().optional(),
    minNumber: z.number().optional(),
    maxNumber: z.number().optional(),
    displayOrder: z.number().optional(),
});

export type CreateStationFormValues = z.infer<typeof createStationSchema>;
