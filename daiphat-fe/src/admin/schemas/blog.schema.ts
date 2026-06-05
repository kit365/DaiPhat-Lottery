import { z } from "zod";

export const createBlogSchema = z.object({
    name: z
        .string()
        .min(1, "Tiêu đề bài viết không được để trống")
        .max(200, "Tiêu đề không được quá 200 ký tự"),

    slug: z.string().optional(),

    description: z.string().max(500, "Mô tả ngắn không được quá 500 ký tự").optional(),

    content: z.string().min(1, "Nội dung bài viết không được để trống"),

    avatar: z.any().refine((val) => {
        if (!val) return false;
        if (typeof val === "string" && val.trim() === "") return false;
        return true;
    }, "Vui lòng chọn ảnh bìa"),

    category: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một danh mục bài viết"),

    status: z.enum(["draft", "published", "unpublished", "scheduled"]).default("draft"),

    type: z.string().min(1, "Vui lòng chọn loại bài viết"),

    tags: z.array(z.union([z.string(), z.number()])).optional().default([]),

    scheduledAt: z.string().optional().nullable(),
});

export type CreateBlogFormValues = z.infer<typeof createBlogSchema>;
