import { z } from "zod";

export const settingGeneralSchema = z.object({
    websiteName: z.string().optional().or(z.literal("")),
    websiteDomain: z.string().optional().or(z.literal("")),
    logo: z.string().optional().or(z.literal("")),
    favicon: z.string().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    copyright: z.string().optional().or(z.literal("")),
    defaultPassword: z.string().optional().or(z.literal("")),
    facebook: z.string().optional().or(z.literal("")),
    instagram: z.string().optional().or(z.literal("")),
    ticketSubtypes: z.array(z.object({
        name: z.string().min(1, "Vui lòng nhập tên giống"),
        type: z.enum(["dog", "cat", "other"])
    })).default([]),
    ticketServiceColors: z.array(z.object({
        ticketServiceId: z.string(),
        color: z.string()
    })).optional(),
    privacyPolicy: z.string().optional().or(z.literal("")),
    termsOfUse: z.string().optional().or(z.literal("")),
    conditions: z.string().optional().or(z.literal("")),
    goongApiKey: z.string().optional().or(z.literal("")),
    goongMapKey: z.string().optional().or(z.literal("")),
});

export type SettingGeneralFormValues = z.infer<typeof settingGeneralSchema>;

/** Schema for Shipping Settings */
export const settingShippingSchema = z.object({
    tokenGoShip: z.string().min(1, "Vui lòng nhập Token GoShip"),
});

export type SettingShippingFormValues = z.infer<typeof settingShippingSchema>;

/** Schema for Payment Settings */
export const settingPaymentSchema = z.object({
    zaloAppId: z.string().min(1, "Vui lòng nhập App Id"),
    zaloKey1: z.string().min(1, "Vui lòng nhập Key 1"),
    zaloKey2: z.string().min(1, "Vui lòng nhập Key 2"),
    zaloDomain: z.string().url("Domain không hợp lệ").min(1, "Vui lòng nhập Tên miền"),
    vnpTmnCode: z.string().min(1, "Vui lòng nhập Tmn Code"),
    vnpHashSecret: z.string().min(1, "Vui lòng nhập Hash Secret"),
    vnpUrl: z.string().url("URL không hợp lệ").min(1, "Vui lòng nhập URL"),
});

export type SettingPaymentFormValues = z.infer<typeof settingPaymentSchema>;

/** Schema for Social Login Settings */
export const settingLoginSocialSchema = z.object({
    googleClientId: z.string().min(1, "Vui lòng nhập Client Id"),
    googleClientSecret: z.string().min(1, "Vui lòng nhập Client Secret"),
    googleCallbackUrl: z.string().url("URL không hợp lệ").min(1, "Vui lòng nhập Callback URL"),
    facebookAppId: z.string().min(1, "Vui lòng nhập App Id"),
    facebookAppSecret: z.string().min(1, "Vui lòng nhập App Secret"),
    facebookCallbackUrl: z.string().url("URL không hợp lệ").min(1, "Vui lòng nhập Callback URL"),
});

export type SettingLoginSocialFormValues = z.infer<typeof settingLoginSocialSchema>;

/** Schema for App Password Settings */
export const settingAppPasswordSchema = z.object({
    gmailUser: z.string().email("Email không hợp lệ").min(1, "Vui lòng nhập Gmail User"),
    gmailPassword: z.string().min(1, "Vui lòng nhập Gmail Password"),
});

export type SettingAppPasswordFormValues = z.infer<typeof settingAppPasswordSchema>;

/** Schema for Static Pages */
export const settingPageSchema = z.object({
    title: z.string().min(1, "Vui lòng nhập tiêu đề trang"),
    content: z.string().optional().or(z.literal("")),
});

export type SettingPageFormValues = z.infer<typeof settingPageSchema>;

