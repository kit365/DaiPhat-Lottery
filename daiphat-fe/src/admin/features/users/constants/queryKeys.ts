export const QUERY_KEYS = {
    ACCOUNTS_ADMIN: 'accounts-admin',
    ACCOUNT_ADMIN_DETAIL: 'account-admin',
    USER_STATUSES: 'user-statuses',
    SEARCH_CUSTOMERS: 'search-customers',
    STAFF_BY_TICKET_SERVICE: 'staff-by-ticketService',
    ROLES: 'roles',
    USER_ORDERS: 'user-orders',
} as const;

export const userOrdersQueryKey = (userId: string, page: number, rowsPerPage: number) =>
    [QUERY_KEYS.USER_ORDERS, userId, page, rowsPerPage] as const;