import { z } from "zod";

export const createBlogSchema = z.object({
    name: z
        .string()
        .min(1, "Tiêu đề bài viết không được để trống")
        .max(200, "Tiêu đề không được quá 200 ký tự"),

    description: z.string().optional(), // Was excerpt

    content: z.string().min(1, "Nội dung bài viết không được để trống"),

    avatar: z.string().min(1, "Vui lòng chọn ảnh bìa"),

    category: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một danh mục bài viết"),

    status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export type CreateBlogFormValues = z.infer<typeof createBlogSchema>;
