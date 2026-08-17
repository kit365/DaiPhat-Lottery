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
    contactWard: z.string().max(100, "Phường/xã không vượt quá 100 ký tự").optional(),
    coverageAreaCodes: z.array(z.string()).optional().default([]),
    contractStartDate: z.string().optional().nullable(),
    contractEndDate: z.string().optional().nullable(),
    contractMaxDailyCap: z
        .preprocess(
            (val) => (val === "" || val === null || val === undefined ? null : val),
            z.coerce
                .number({ message: "Vui lòng nhập hạn mức hợp đồng" })
                .int("Hạn mức phải là số nguyên")
                .positive("Hạn mức phải là số nguyên dương")
                .optional()
                .nullable()
        ),
});

const contractDateRefinement = (data: { contractStartDate?: string | null; contractEndDate?: string | null }) => {
    if (!data.contractStartDate || !data.contractEndDate) return true;
    return data.contractEndDate >= data.contractStartDate;
};

export const createStreetAgentProfileSchema = streetAgentProfileBaseSchema
    .superRefine((data, ctx) => {
        if (!data.contractStartDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Vui lòng chọn ngày bắt đầu hợp đồng",
                path: ["contractStartDate"],
            });
        }
        if (!data.contractEndDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Vui lòng chọn ngày kết thúc hợp đồng",
                path: ["contractEndDate"],
            });
        }
    })
    .refine(contractDateRefinement, {
        message: "Ngày kết thúc hợp đồng phải sau ngày bắt đầu",
        path: ["contractEndDate"],
    });

export const updateStreetAgentProfileSchema = streetAgentProfileBaseSchema
    .refine(contractDateRefinement, {
        message: "Ngày kết thúc hợp đồng phải sau ngày bắt đầu",
        path: ["contractEndDate"],
    });

export const adjustDepositSchema = z.object({
    depositBalance: z.coerce.number().min(0, "Số dư ký quỹ phải từ 0 trở lên"),
    depositAdjustmentReason: z
        .string()
        .min(1, "Vui lòng nhập lý do điều chỉnh cọc")
        .max(500, "Lý do điều chỉnh không vượt quá 500 ký tự"),
});

export const upsertLuckyPatternConfigSchema = z
    .object({
        patternType: z.enum(["EXACT", "DIGIT_MATCH"]),
        exactNumbers: z.string().optional().nullable(),
        matchDigits: z.string().optional().nullable(),
        matchPosition: z.enum(["PREFIX", "SUFFIX", "ANYWHERE"]).optional().nullable(),
        name: z.string().min(1, "Vui lòng nhập tên cấu hình").max(100),
        description: z.string().max(500).optional().nullable(),
        badgeLabel: z.string().min(1, "Vui lòng nhập nhãn badge").max(50),
        badgeColor: z.string().max(30).optional().nullable(),
        priority: z.coerce.number().int().min(0).optional().nullable(),
        active: z.boolean().optional().nullable(),
    })
    .superRefine((data, ctx) => {
        if (data.patternType === "EXACT") {
            const exactStr = data.exactNumbers?.trim() || "";
            if (!exactStr) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Vui lòng nhập số khớp chính xác",
                    path: ["exactNumbers"],
                });
            } else if (!/^\d{5,6}$/.test(exactStr)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Số khớp chính xác phải từ 5 đến 6 chữ số",
                    path: ["exactNumbers"],
                });
            }
        }
        if (data.patternType === "DIGIT_MATCH") {
            if (!data.matchDigits?.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Vui lòng nhập cụm số cần khớp",
                    path: ["matchDigits"],
                });
            }
            if (!data.matchPosition) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Vui lòng chọn vị trí khớp",
                    path: ["matchPosition"],
                });
            }
        }
    });

export type CreateStreetAgentProfileFormValues = z.infer<typeof createStreetAgentProfileSchema>;
export type UpdateStreetAgentProfileFormValues = z.infer<typeof updateStreetAgentProfileSchema>;
export type AdjustDepositFormValues = z.infer<typeof adjustDepositSchema>;
export type UpsertLuckyPatternConfigFormValues = z.infer<typeof upsertLuckyPatternConfigSchema>;
