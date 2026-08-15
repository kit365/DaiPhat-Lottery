import { z } from "zod";

export const contractArticleSchema = z.object({
    code: z.string().optional().nullable(),
    ordinal: z.number().optional().nullable(),
    title: z.string().trim().min(1, "Nhập tiêu đề điều khoản"),
    kind: z.enum(["TEXT", "PRIZE_TICKET_TABLE", "OPTIONAL_TEXT"]),
    body: z.string().optional().nullable(),
});

export const upsertContractSchema = z.object({
    type: z.enum(["STREET_AGENT_SALES", "PRIZE_PAYOUT"]),
    title: z.string().trim().min(1, "Nhập tên hiển thị cho khách"),
    staffName: z.string().trim().min(1, "Nhập tên hiển thị cho nhân viên"),
    subtitle: z.string().optional().nullable(),
    partyARoleLabel: z.string().trim().min(1, "Nhập nhãn Bên A"),
    partyBRoleLabel: z.string().trim().min(1, "Nhập nhãn Bên B"),
    partyASignatureLabel: z.string().trim().min(1, "Nhập nhãn chữ ký Bên A"),
    partyBSignatureLabel: z.string().trim().min(1, "Nhập nhãn chữ ký Bên B"),
    footerNote: z.string().optional().nullable(),
    isDefault: z.boolean().optional(),
    articles: z.array(contractArticleSchema).min(1, "Cần ít nhất một điều khoản"),
});

export type UpsertContractFormValues = z.infer<typeof upsertContractSchema>;
