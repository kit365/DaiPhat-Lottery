"use client";

import { useQuery } from "@tanstack/react-query";

export interface VietnamWard {
    name: string;
    code: number;
    division_type?: string;
}

export interface VietnamProvince {
    name: string;
    code: number;
    wards: VietnamWard[];
}

/** Shared province/ward source used by staff-facing address forms. */
export const useVietnamLocation = () =>
    useQuery<VietnamProvince[]>({
        queryKey: ["vietnam-location", "v2-2025"],
        queryFn: async () => {
            const response = await fetch("https://provinces.open-api.vn/api/v2/?depth=2");
            if (!response.ok) {
                throw new Error("Không tải được danh sách tỉnh/phường");
            }
            return response.json() as Promise<VietnamProvince[]>;
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });
