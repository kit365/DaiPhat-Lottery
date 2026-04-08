import { useQuery } from "@tanstack/react-query";
import { getServices, getServiceBySlug } from "../api/service.api";

export const useServices = (params?: any) => {
    return useQuery({
        queryKey: ["client-services", params],
        queryFn: () => getServices(params),
        select: (res: any) => res.data || [],
    });
};

export const useServiceDetail = (slug: string) => {
    return useQuery({
        queryKey: ["client-service-detail", slug],
        queryFn: () => getServiceBySlug(slug),
        enabled: !!slug,
        select: (res: any) => res.data,
    });
};
