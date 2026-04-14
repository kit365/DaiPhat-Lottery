import { useQuery } from "@tanstack/react-query";
import { getServices, getServiceBySlug } from "../api/service.api";

export const useServices = (params?: any) => {
    return useQuery({
        queryKey: ["client-services", params],
        enabled: false,
        retry: false,
        queryFn: () => getServices(params),
        select: (res: any) => res.data || [],
    });
};

export const useServiceDetail = (slug: string) => {
    return useQuery({
        queryKey: ["client-service-detail", slug],
        enabled: false,
        retry: false,
        queryFn: () => getServiceBySlug(slug),
        select: (res: any) => res.data,
    });
};
