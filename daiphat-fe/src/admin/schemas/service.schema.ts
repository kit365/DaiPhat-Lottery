import { z } from "zod";

const baseTicketServiceSchema = z.object({
    name: z.string().min(1, "Tên dịch vụ không được để trống"),
    slug: z.string().optional(),
    categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
    departmentId: z.string().min(1, "Vui lòng chọn phòng ban phụ trách"),
    description: z.string().optional(),
    procedure: z.string().optional(),
    duration: z.number().gt(0, "Thời lượng dự kiến phải lớn hơn 0"),
    minDuration: z.number().gt(0, "Thời lượng tối thiểu phải lớn hơn 0"),
    maxExtensionMinutes: z.number().min(0, "Thời gian gia hạn không được âm"),
    userTicketTypes: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một vùng miền"),
    pricingType: z.enum(["fixed", "by-weight"]),
    basePrice: z.number().optional(),
    priceList: z.array(z.object({
        label: z.string().optional(),
        value: z.number().optional()
    })),
    status: z.enum(["active", "inactive"]),
    images: z.array(z.string()).optional(),
    minAgeMonths: z.number().min(0, "Tuổi tối thiểu không được âm").default(0),
});

export type TicketServiceFormValues = z.infer<typeof baseTicketServiceSchema>;

export const ticketServiceSchema = baseTicketServiceSchema
    .refine((data) => data.minDuration <= data.duration, {
        message: "Thời lượng tối thiểu không được lớn hơn thời lượng dự kiến",
        path: ["minDuration"],
    });
