import { useMutation, useQuery } from "@tanstack/react-query";
import { createBooking, getTimeSlots } from "../api/booking.api";

export const useCreateBooking = () => {
    return useMutation({
        mutationFn: (data: any) => createBooking(data),
    });
};

export const useTimeSlots = (date: string, serviceId: string) => {
    return useQuery({
        queryKey: ["time-slots", date, serviceId],
        enabled: false, retry: false, queryFn: () => getTimeSlots(date, serviceId),
         
        select: (data) => data.data.data // Assuming structure { code, message, data: [...] }
    });
};
