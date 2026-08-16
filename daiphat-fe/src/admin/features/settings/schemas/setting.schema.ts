import { z } from "zod";

/** Existing HTTPS URL, pending local File (preview only), or cleared. Uploaded on Save. */
const mediaFieldSchema = z.custom<string | File | null | undefined>(
    (val) =>
        val === undefined ||
        val === null ||
        typeof val === "string" ||
        (typeof File !== "undefined" && val instanceof File),
    { message: "Ảnh không hợp lệ" }
);

export const settingGeneralSchema = z.object({
    websiteName: z.string().min(1, "Vui lòng nhập tên website"),
    websiteDomain: z.string().optional().or(z.literal("")),
    slogan: z.string().optional().or(z.literal("")),
    intro: z.string().optional().or(z.literal("")),
    logo: mediaFieldSchema,
    favicon: mediaFieldSchema,
    phone: z.string().optional().or(z.literal("")),
    supportOpenTime: z.union([
        z.literal(""),
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ mở không hợp lệ (HH:mm)"),
    ]),
    supportCloseTime: z.union([
        z.literal(""),
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ đóng không hợp lệ (HH:mm)"),
    ]),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    copyright: z.string().optional().or(z.literal("")),
    facebook: z.string().optional().or(z.literal("")),
    telegram: z.string().optional().or(z.literal("")),
    instagram: z.string().optional().or(z.literal("")),
    legalName: z.string().optional().or(z.literal("")),
    taxCode: z.string().optional().or(z.literal("")),
    legalRepresentative: z.string().optional().or(z.literal("")),
    legalRepresentativeTitle: z.string().optional().or(z.literal("")),
    contractSigningPlace: z.string().optional().or(z.literal("")),
    // Legacy optional fields (old SettingGeneralPage) — not persisted via GENERAL_SETTING
    defaultPassword: z.string().optional().or(z.literal("")),
    ticketServiceColors: z
        .array(
            z.object({
                ticketServiceId: z.string(),
                color: z.string(),
            })
        )
        .optional(),
    privacyPolicy: z.string().optional().or(z.literal("")),
    termsOfUse: z.string().optional().or(z.literal("")),
    conditions: z.string().optional().or(z.literal("")),
    goongApiKey: z.string().optional().or(z.literal("")),
    goongMapKey: z.string().optional().or(z.literal("")),
});

export type SettingGeneralFormValues = z.infer<typeof settingGeneralSchema>;

/** Schema for Static Pages */
export const settingPageSchema = z.object({
    title: z.string().min(1, "Vui lòng nhập tiêu đề trang"),
    content: z.string().optional().or(z.literal("")),
});

export type SettingPageFormValues = z.infer<typeof settingPageSchema>;

