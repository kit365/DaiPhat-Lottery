import { z } from "zod";

const phoneRegex = /^0(3[2-9]|7[06-9]|8[1-9]|9[0-46-9]|5[2689])[0-9]{7}$/;

const streetAgentProfileBaseSchema = z.object({
    firstName: z.string().min(1, "Vui lòng nhập tên").max(100, "Tên không vượt quá 100 ký tự"),
    lastName: z.string().min(1, "Vui lòng nhập họ").max(100, "Họ không vượt quá 100 ký tự"),
    phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ hoặc không thuộc nhà mạng hỗ trợ"),
    cccd: z.string().regex(/^[0-9]{9,12}$/, "Số CCCD không hợp lệ"),
    imageUrl: z.string().optional().nullable(),
    contactAddress: z.string().max(255, "Địa chỉ không vượt quá 255 ký tự").optional(),
    contactProvince: z.string().max(100, "Tỉnh/thành không vượt quá 100 ký tự").optional(),
    coverageArea: z.string().max(255, "Địa bàn bán không vượt quá 255 ký tự").optional(),
    commissionRate: z.coerce.number().min(0, "Tỷ lệ hoa hồng phải từ 0 trở lên").max(1, "Tỷ lệ hoa hồng không vượt quá 100%").optional().nullable(),
    contractStartDate: z.string().optional().nullable(),
    contractEndDate: z.string().optional().nullable(),
    depositBalance: z.coerce.number().min(0, "Số dư ký quỹ phải từ 0 trở lên").optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
});

const contractDateRefinement = (data: { contractStartDate?: string | null; contractEndDate?: string | null }) => {
    if (!data.contractStartDate || !data.contractEndDate) return true;
    return data.contractEndDate >= data.contractStartDate;
};

export const createStreetAgentProfileSchema = streetAgentProfileBaseSchema.refine(contractDateRefinement, {
    message: "Ngày kết thúc hợp đồng phải sau ngày bắt đầu",
    path: ["contractEndDate"],
});

export const updateStreetAgentProfileSchema = streetAgentProfileBaseSchema.extend({
    depositAdjustmentReason: z.string().max(500, "Lý do điều chỉnh không vượt quá 500 ký tự").optional().nullable(),
}).refine(contractDateRefinement, {
    message: "Ngày kết thúc hợp đồng phải sau ngày bắt đầu",
    path: ["contractEndDate"],
});

export type CreateStreetAgentProfileFormValues = z.infer<typeof createStreetAgentProfileSchema>;
export type UpdateStreetAgentProfileFormValues = z.infer<typeof updateStreetAgentProfileSchema>;
