import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getUsers } from "../../../api/account-user.api";
import { QUERY_KEYS } from "../../../../constants/queryKeys";
import { IAccountUserListFilters } from "../configs/types";

interface UseAccountUserListOptions {
    roleIds?: string[];
    createdBy?: string;
    assignedStaffId?: string;
}

const buildListParams = (
    filters: IAccountUserListFilters,
    options: UseAccountUserListOptions
) => ({
    page: filters.page,
    limit: filters.limit,
    q: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status.join(",") : undefined,
    sortBy: filters.sortBy,
    direction: filters.direction,
    roleIds: options.roleIds,
    ...(options.createdBy && { createdBy: options.createdBy }),
    ...(options.assignedStaffId && { assignedStaffId: options.assignedStaffId }),
});

export const useAccountUserList = (options: UseAccountUserListOptions = {}) => {
    const [filters, setFilters] = useState<IAccountUserListFilters>({
        status: [],
        search: "",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        direction: "desc",
    });

    const params = buildListParams(filters, options);

    const { data: res, isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.ACCOUNTS_USER, params],
        queryFn: () => getUsers(params),
        placeholderData: keepPreviousData,
    });

    const users = res?.data?.recordList || [];
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
            search: "",
            page: 1,
        }));
    };

    return {
        users,
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
