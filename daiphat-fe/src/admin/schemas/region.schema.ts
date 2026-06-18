import { z } from "zod";

export const updateRegionSchema = z.object({
    minNumber: z.number().min(0, "Số nhỏ nhất phải lớn hơn hoặc bằng 0"),
    maxNumber: z.number().min(0, "Số lớn nhất phải lớn hơn hoặc bằng 0"),
}).refine((data) => data.maxNumber >= data.minNumber, {
    message: "Số lớn nhất phải lớn hơn hoặc bằng Số nhỏ nhất",
    path: ["maxNumber"]
});

export type UpdateRegionFormValues = z.infer<typeof updateRegionSchema>;
