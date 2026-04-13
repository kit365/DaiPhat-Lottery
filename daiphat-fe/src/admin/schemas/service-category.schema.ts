import { z } from "zod";

export const ticketServiceCategorySchema = z.object({
    name: z.string().min(1, "Tên danh mục không được để trống"),
    slug: z.string().optional(),
    parentId: z.string().optional(),
    description: z.string().optional(),
    avatar: z.string().optional(),
    userTicketTypes: z.array(z.string()),
    status: z.enum(["active", "inactive"]),
});

export type TicketServiceCategoryFormValues = z.infer<typeof ticketServiceCategorySchema>;
