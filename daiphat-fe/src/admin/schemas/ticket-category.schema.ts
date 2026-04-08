import { z } from "zod";

export const createTicketCategorySchema = z.object({
    name: z
        .string()
        .min(1, "Tên Miền/Tỉnh thành không được để trống")
        .max(100),

    description: z.string().optional(),

    parent: z.string().optional(),

    status: z.enum(["active", "inactive"]),

    avatar: z.string().min(1, "Vui lòng chọn hình ảnh"),
});

export type CreateTicketCategoryFormValues = z.infer<typeof createTicketCategorySchema>;
