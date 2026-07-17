import { z } from "zod";

export const roleSchema = z.object({
    name: z.string().min(1, "Vui lòng nhập tên nhóm quyền"),
    description: z.string().optional(),
    isStaff: z.boolean(),
    ticketServiceIds: z.array(z.string()),
    permissions: z.array(z.string()),
    departmentId: z.string().optional().nullable(),
    status: z.enum(["active", "inactive"]),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
