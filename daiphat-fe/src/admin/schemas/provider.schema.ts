import { z } from "zod";

export const createProviderSchema = z.object({
    name: z
        .string()
        .min(1, "Tên nhà đài không được để trống")
        .max(100),

    description: z.string().optional(),

    avatar: z.string().min(1, "Vui lòng chọn logo nhà đài"),

    status: z.enum(["active", "inactive"]),
});

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;
