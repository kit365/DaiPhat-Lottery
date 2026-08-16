export const DASHBOARD_QUERY_KEYS = {
    ECOMMERCE_OVERVIEW: 'ecommerce-overview',
} as const;

export const dashboardQueryKeys = {
    ecommerceOverview: () =>
        ['dashboard', DASHBOARD_QUERY_KEYS.ECOMMERCE_OVERVIEW, 'demo'] as const,
};
