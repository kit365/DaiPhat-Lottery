import { z } from "zod";

const drawTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateRegionSchema = z.object({
    minNumber: z.number().min(0, "Số nhỏ nhất phải lớn hơn hoặc bằng 0"),
    maxNumber: z.number().min(0, "Số lớn nhất phải lớn hơn hoặc bằng 0"),
    defaultDrawTime: z
        .string()
        .trim()
        .regex(drawTimePattern, "Giờ quay mặc định phải theo định dạng HH:mm"),
}).refine((data) => data.maxNumber >= data.minNumber, {
    message: "Số lớn nhất phải lớn hơn hoặc bằng Số nhỏ nhất",
    path: ["maxNumber"]
});

export type UpdateRegionFormValues = z.infer<typeof updateRegionSchema>;
