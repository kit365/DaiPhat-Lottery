import { z } from "zod";

export const createCategorySchema = z.object({
    name: z
        .string()
        .min(1, "Tên danh mục không được để trống")
        .max(100, "Tên danh mục không được quá 100 ký tự"),

    slug: z.string().optional(),

    description: z.string().optional(),

    parent: z.string().optional(),

    status: z.enum(["active", "inactive"]),

    avatar: z.string().min(1, "Vui lòng chọn hình ảnh"),
});

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;