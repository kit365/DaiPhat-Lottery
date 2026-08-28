export const QUERY_KEYS = {
    AUTH_ME: 'admin-me',
    CLIENT_ME: 'client-me',
    CLIENT_NOTIFICATIONS: 'client-notifications',
    CLIENT_NOTIFICATION_SETTINGS: 'client-notification-settings',

    PUBLIC_STATIONS_TODAY: 'public-stations-today',
    PUBLIC_STATIONS_TOMORROW: 'public-stations-tomorrow',
    PUBLIC_STATIONS_BY_DRAW_DATE: 'public-stations-by-draw-date',
    PUBLIC_SCHEDULE_ALL: 'public-schedule-all',
    PUBLIC_BUY_TICKET: 'public-buy-ticket',
    PUBLIC_SYSTEM_CONFIG: 'public-system-config',
    PUBLIC_SYSTEM_CONFIG_BATCH: 'public-system-config-batch',
    PUBLIC_BLOG_CATEGORIES: 'public-blog-categories',
    PUBLIC_BLOG_POSTS: 'public-posts',
    PASSWORD_POLICY: 'password-policy',

    LOTTERY_RESULTS: 'lottery-results',
    LOTTERY_RESULTS_LIVE: 'lottery-results-live',
    LOTTERY_RESULT_DETAILS: 'lottery-result-details',

    CLIENT_ORDER_RECEIVE_TYPES: 'client-order-receive-types',
    CLIENT_ORDER_STATUSES: 'client-order-statuses',
    CLIENT_MY_ORDERS: 'client-my-orders',
    CLIENT_MY_ORDER_DETAIL: 'client-my-order-detail',
    CLIENT_PENDING_PAYMENT_COUNTDOWN: 'client-pending-payment-countdown',
    CLIENT_PENDING_PAYMENT_REMINDER: 'client-pending-payment-reminder',
    CLIENT_LOTTERY_TICKET_SEARCH: 'client-lottery-ticket-search',
    CLIENT_MY_TICKETS: 'client-my-tickets',
    CLIENT_TRANSACTION_TYPES: 'client-transaction-types',
    CLIENT_MY_REFUNDS: 'client-my-refunds',
    CLIENT_REFUND_DETAIL: 'client-refund-detail',
    CLIENT_REFUND_STATUSES: 'client-refund-statuses',
    CLIENT_REFUND_TYPES: 'client-refund-types',
    CLIENT_BANK_ACCOUNTS: 'client-bank-accounts',
    CLIENT_BANK_CATALOG: 'client-bank-catalog',
    CLIENT_ORDER_REFUND_ELIGIBILITY: 'client-order-refund-eligibility',
    CLIENT_PRIZE_PAYOUTS: 'client-prize-payouts',
    CLIENT_PRIZE_PAYOUT_DETAIL: 'client-prize-payout-detail',
    CLIENT_PRIZE_PAYOUT_STATUSES: 'client-prize-payout-statuses',
    CLIENT_PRIZE_PAYOUT_PENDING_COUNT: 'client-prize-payout-pending-count',
    CLIENT_TICKET_CATEGORIES: 'client-ticket-categories',
    CLIENT_MY_COMPLAINTS: 'client-my-complaints',
    CLIENT_COMPLAINT_DETAIL: 'client-complaint-detail',
    CLIENT_TICKET_COMMENTS: 'client-ticket-comments',
    CLIENT_ORDER_COMPLAINT_ELIGIBILITY: 'client-order-complaint-eligibility',
} as const;

export const publicSystemConfigQueryKey = (key: string) =>
    [QUERY_KEYS.PUBLIC_SYSTEM_CONFIG, key] as const;

export const publicSystemConfigBatchQueryKey = (keys: readonly string[]) =>
    [QUERY_KEYS.PUBLIC_SYSTEM_CONFIG_BATCH, ...keys] as const;

export const publicStationsQueryKeys = {
    today: () => [QUERY_KEYS.PUBLIC_STATIONS_TODAY] as const,
    tomorrow: () => [QUERY_KEYS.PUBLIC_STATIONS_TOMORROW] as const,
    byDrawDate: (drawDates: string[]) =>
        [QUERY_KEYS.PUBLIC_STATIONS_BY_DRAW_DATE, drawDates] as const,
} as const;

export const publicScheduleQueryKeys = {
    all: (params?: {
        region?: string;
        stationId?: number;
        stationIds?: number[];
        drawDate?: string;
    }) => [QUERY_KEYS.PUBLIC_SCHEDULE_ALL, params ?? {}] as const,
} as const;

/** Root queryKey giữ khi logout — catalog/config không gắn user. */
export const LOGOUT_PERSIST_QUERY_ROOTS = new Set<string>([
    QUERY_KEYS.PUBLIC_SYSTEM_CONFIG,
    QUERY_KEYS.PUBLIC_SYSTEM_CONFIG_BATCH,
    QUERY_KEYS.PASSWORD_POLICY,
    QUERY_KEYS.PUBLIC_STATIONS_TODAY,
    QUERY_KEYS.PUBLIC_STATIONS_TOMORROW,
    QUERY_KEYS.PUBLIC_STATIONS_BY_DRAW_DATE,
    QUERY_KEYS.PUBLIC_SCHEDULE_ALL,
    QUERY_KEYS.PUBLIC_BLOG_CATEGORIES,
    QUERY_KEYS.PUBLIC_BLOG_POSTS,
    QUERY_KEYS.PUBLIC_BUY_TICKET,
    QUERY_KEYS.CLIENT_ORDER_RECEIVE_TYPES,
    QUERY_KEYS.CLIENT_ORDER_STATUSES,
    QUERY_KEYS.CLIENT_TRANSACTION_TYPES,
    QUERY_KEYS.CLIENT_REFUND_STATUSES,
    QUERY_KEYS.CLIENT_REFUND_TYPES,
    QUERY_KEYS.CLIENT_PRIZE_PAYOUT_STATUSES,
    QUERY_KEYS.CLIENT_TICKET_CATEGORIES,
    QUERY_KEYS.CLIENT_BANK_CATALOG,
    QUERY_KEYS.CLIENT_LOTTERY_TICKET_SEARCH,
    QUERY_KEYS.LOTTERY_RESULTS,
    QUERY_KEYS.LOTTERY_RESULTS_LIVE,
    QUERY_KEYS.LOTTERY_RESULT_DETAILS,
]);
