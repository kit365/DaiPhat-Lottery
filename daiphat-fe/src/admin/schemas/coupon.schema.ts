import { z } from "zod";

export const createCouponSchema = z.object({
    code: z
        .string()
        .min(1, "Mã giảm giá không được để trống")
        .max(50, "Mã giảm giá không được quá 50 ký tự"),

    name: z
        .string()
        .min(1, "Tên mã giảm giá không được để trống")
        .max(100, "Tên không được quá 100 ký tự"),

    description: z.string().optional(),

    typeDiscount: z.enum(["percentage", "fixed"]).default("percentage"),

    value: z.coerce.number().min(0, "Giá trị phải lớn hơn hoặc bằng 0"),

    minOrderValue: z.coerce.number().min(0).optional().default(0),

    maxDiscountValue: z.coerce.number().min(0).optional().default(0),

    usageLimit: z.coerce.number().min(0).optional().default(0),

    startDate: z.string().optional().or(z.literal("")),

    endDate: z.string().optional().or(z.literal("")),

    typeDisplay: z.enum(["public", "private"]).default("private"),

    status: z.enum(["active", "inactive"]).default("inactive"),
});

export type CreateCouponFormValues = z.infer<typeof createCouponSchema>;
