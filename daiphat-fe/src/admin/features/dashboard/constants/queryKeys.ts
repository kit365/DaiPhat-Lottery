import { createQueryKeyScope } from '@/shared/react-query/createQueryKeys';

const scope = createQueryKeyScope('dashboard');

export const DASHBOARD_QUERY_KEYS = {
    ECOMMERCE_OVERVIEW: 'ecommerce-overview',
} as const;

export const dashboardQueryKeys = {
    scope,
    ecommerceOverview: () =>
        ['dashboard', DASHBOARD_QUERY_KEYS.ECOMMERCE_OVERVIEW, 'demo'] as const,
};
