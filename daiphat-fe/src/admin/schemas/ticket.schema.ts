import { z } from "zod";

export const createTicketSchema = z.object({
    productId: z.string().or(z.number()).refine(val => !!val, { message: "Sản phẩm vé số không được để trống" }),
    ticketImg: z.any().optional(),
    serialNumber: z.string().min(1, "Số sê-ri không được để trống"),
    numbers: z.string().min(1, "Dãy số không được để trống"),
    drawDate: z.string().min(1, "Ngày quay không được để trống"),
    batchCode: z.string().min(1, "Mã lô nhập không được để trống"),
});

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>;
