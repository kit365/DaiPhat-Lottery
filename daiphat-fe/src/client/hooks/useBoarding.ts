import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAvailableCages } from "../api/boarding-cage.api";
import {
  createBoardingCageReview,
  getBoardingCageDetail,
  getBoardingCageReviews,
  getFoodTemplates,
  getExerciseTemplates,
} from "../api/boarding-cage-detail.api";
import {
  createBoardingBooking,
  payBoardingBooking,
  getBoardingConfig,
} from "../api/boarding-booking.api";

export const useCreateBoardingBooking = () => {
  return useMutation({
    mutationFn: (data: any) => createBoardingBooking(data),
  });
};

export const usePayBoardingBooking = () => {
  return useMutation({
    mutationFn: ({ id, gateway }: { id: string; gateway: "zalopay" | "vnpay" }) =>
      payBoardingBooking(id, gateway),
  });
};

export const useAvailableCages = (
  checkInDate: string,
  checkOutDate: string,
  type?: string,
  size?: string
) => {
  return useQuery({
    queryKey: ["boarding-cages", checkInDate, checkOutDate, type, size],
    queryFn: async () => {
      const response = await getAvailableCages({
        checkInDate,
        checkOutDate,
        type,
        size,
      });
      return response.data;
    },
    enabled: !!checkInDate && !!checkOutDate,
    select: (data) => {
      if (Array.isArray(data)) return data;
      if (Array.isArray((data as any)?.data)) return (data as any).data;
      return [];
    },
  });
};

export const useBoardingCageDetail = (id?: string) => {
  return useQuery({
    queryKey: ["boarding-cage-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await getBoardingCageDetail(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useBoardingCageReviews = (id?: string) => {
  return useQuery({
    queryKey: ["boarding-cage-reviews", id],
    queryFn: async () => {
      if (!id) return { reviews: [], total: 0, averageRating: 0 };
      const response = await getBoardingCageReviews(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateBoardingCageReview = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fullName: string; rating: number; comment: string }) => {
      if (!id) throw new Error("Missing cage id");
      return createBoardingCageReview(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boarding-cage-reviews", id] });
    },
  });
};

export const useFoodTemplates = (petType: string = "all") => {
  return useQuery({
    queryKey: ["food-templates", petType],
    queryFn: async () => {
      const res = await getFoodTemplates(petType);
      return res.data?.data || [];
    },
  });
};

export const useExerciseTemplates = (petType: string = "all") => {
  return useQuery({
    queryKey: ["exercise-templates", petType],
    queryFn: async () => {
      const res = await getExerciseTemplates(petType);
      return res.data?.data || [];
    },
  });
};
export const useBoardingConfig = () => {
  return useQuery({
    queryKey: ["boarding-config"],
    queryFn: async () => {
      const res = await getBoardingConfig();
      return res.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
