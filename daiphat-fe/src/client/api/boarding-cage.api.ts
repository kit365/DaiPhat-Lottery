import { apiApp } from "../../api";

export interface AvailableCagesParams {
  checkInDate: string;
  checkOutDate: string;
  type?: string;
  size?: string;
}

export const getAvailableCages = (params: AvailableCagesParams) => {
  return apiApp.get("/api/v1/client/cage/boarding-cages/available", {
    params
  });
};
