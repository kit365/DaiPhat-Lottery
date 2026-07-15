import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAccounts } from "../../../api/account-admin.api";
import { QUERY_KEYS } from "../../../../constants/queryKeys";
import { IAccountAdminListFilters } from "../configs/types";
import { RoleEnum } from "../configs/constants";

const DEFAULT_STAFF_ROLE_CODES = [RoleEnum.ADMIN, RoleEnum.STAFF_OPERATOR];

const buildListParams = (filters: IAccountAdminListFilters) => ({
    page: filters.page,
    limit: filters.limit,
    q: filters.search || undefined,
    status: filters.status.length > 0 ? filters.status.join(",") : undefined,
    roleIds: filters.roleIds.length > 0 ? filters.roleIds : DEFAULT_STAFF_ROLE_CODES,
    sortBy: filters.sortBy,
    direction: filters.direction,
});

export const useAccountAdminList = () => {
    const [filters, setFilters] = useState<IAccountAdminListFilters>({
        status: [],
        roleIds: [],
        search: "",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        direction: "desc",
    });

    const params = buildListParams(filters);

    const { data: res, isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.ACCOUNTS_ADMIN, params],
        queryFn: () => getAccounts(params),
        placeholderData: keepPreviousData,
    });

    const accounts = res?.data?.recordList || [];
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
            roleIds: [],
            search: "",
            page: 1,
        }));
    };

    return {
        accounts,
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
