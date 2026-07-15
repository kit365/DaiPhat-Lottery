import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getStreetAgentProfiles } from "../../../api/street-agent.api";
import { QUERY_KEYS } from "../../../../constants/queryKeys";
import { IStreetAgentListFilters } from "../configs/types";

const buildListParams = (filters: IStreetAgentListFilters) => ({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status.join(",") : undefined,
    contactProvince:
        filters.contactProvince.length > 0 ? filters.contactProvince.join(",") : undefined,
});

export const useStreetAgentList = () => {
    const [filters, setFilters] = useState<IStreetAgentListFilters>({
        status: [],
        contactProvince: [],
        search: "",
        page: 1,
        limit: 10,
    });

    const { data: res, isLoading, error } = useStreetAgentProfilesQuery(filters);

    const profiles = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0 };

    const setFilter = (fieldId: string, values: string[]) => {
        setFilters((prev) => ({ ...prev, [fieldId]: values, page: 1 }));
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search, page: 1 }));
    };

    const setPage = (page: number) => {
        setFilters((prev) => ({ ...prev, page }));
    };

    const setLimit = (limit: number) => {
        setFilters((prev) => ({ ...prev, limit, page: 1 }));
    };

    const clearFilters = () => {
        setFilters((prev) => ({
            ...prev,
            status: [],
            contactProvince: [],
            search: "",
            page: 1,
        }));
    };

    return {
        profiles,
        pagination,
        isLoading,
        error,
        filters,
        setFilter,
        setSearchFilter,
        setPage,
        setLimit,
        clearFilters,
    };
};

const useStreetAgentProfilesQuery = (filters: IStreetAgentListFilters) => {
    const params = buildListParams(filters);

    return useQuery({
        queryKey: [QUERY_KEYS.STREET_AGENT_PROFILES, params],
        queryFn: () => getStreetAgentProfiles(params),
        placeholderData: keepPreviousData,
    });
};
