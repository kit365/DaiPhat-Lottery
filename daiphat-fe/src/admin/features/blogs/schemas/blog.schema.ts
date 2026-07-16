import { z } from "zod";
import { BLOG_STATUS } from "../types/blog.type";

export const createBlogSchema = z.object({
    name: z
        .string()
        .min(1, "Tiêu đề bài viết không được để trống")
        .max(200, "Tiêu đề không được quá 200 ký tự"),

    description: z.string().max(500, "Mô tả ngắn không được quá 500 ký tự").optional(),

    content: z.string().min(1, "Nội dung bài viết không được để trống"),

    avatar: z.any().refine((val) => {
        if (!val) return false;
        if (typeof val === "string" && val.trim() === "") return false;
        return true;
    }, "Vui lòng chọn ảnh bìa"),

    category: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một danh mục bài viết"),

    status: z.enum([BLOG_STATUS.DRAFT, BLOG_STATUS.PUBLISHED, BLOG_STATUS.UNPUBLISHED, BLOG_STATUS.SCHEDULED]).default(BLOG_STATUS.DRAFT),

    type: z.string().min(1, "Vui lòng chọn loại bài viết"),

    tags: z.array(z.union([z.string(), z.number()])).optional().default([]),

    scheduledAt: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.status !== BLOG_STATUS.SCHEDULED) {
        return;
    }

    if (!data.scheduledAt) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scheduledAt"],
            message: "Vui lòng chọn thời gian xuất bản.",
        });
        return;
    }

    const scheduledTime = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledTime.getTime()) || scheduledTime.getTime() <= Date.now()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scheduledAt"],
            message: "Thời gian xuất bản phải lớn hơn thời điểm hiện tại.",
        });
    }
});

export type CreateBlogFormValues = z.infer<typeof createBlogSchema>;
