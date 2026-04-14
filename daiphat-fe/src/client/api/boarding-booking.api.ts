import { apiApp } from "../../api";

export interface CreateBoardingBookingPayload {
  cageId: string;
  checkInDate: string;
  checkOutDate: string;
  petIds: string[];
  quantity?: number;
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
  specialCare?: string;
  discountAmount?: number;
  appliedCoupon?: string;
  paymentMethod?: string;
  paymentGateway?: "zalopay" | "vnpay";
}

export const createBoardingBooking = (data: CreateBoardingBookingPayload) => {
  return apiApp.post("/client/boarding/boarding-bookings", data);
};

export const payBoardingBooking = (id: string, gateway: "zalopay" | "vnpay") => {
  return apiApp.post(`/client/boarding/boarding-bookings/${id}/pay`, { gateway });
};
export const cancelBoardingBooking = (id: string, reason?: string) => {
  return apiApp.patch(`/client/boarding/boarding-bookings/${id}/cancel`, { reason });
};
export const getBoardingConfig = () => {
  return apiApp.get("/client/boarding/config");
};
