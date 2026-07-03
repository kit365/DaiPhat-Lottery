import { z } from "zod";

export const createTicketSchema = z.object({
    importBatchLineId: z.string().or(z.number()).refine(val => !!val, { message: "Dòng phiếu nhập lô không được để trống" }),
    importBatchId: z.string().or(z.number()).optional(),
    stationId: z.string().or(z.number()).refine(val => !!val, { message: "Nhà đài không được để trống" }),
    serials: z.array(z.object({
        id: z.union([z.string(), z.number()]).optional(),
        serialNumber: z.string().min(1, "Số sê-ri không được để trống"),
        ticketImg: z.any().optional(),
    })).min(1, "Phải có ít nhất 1 số sê-ri"),
    numbers: z.string().min(1, "Dãy số không được để trống"),
    batchCode: z.string().min(1, "Mã lô nhập không được để trống"),
    drawDate: z.string().optional(),
});

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = createTicketSchema.extend({
    drawDate: z.string().optional(),
    status: z.string().optional(),
});

export type UpdateTicketFormValues = z.infer<typeof updateTicketSchema>;
