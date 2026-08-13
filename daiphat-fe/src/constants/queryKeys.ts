import { QUERY_KEYS as IMPORT_BATCH_QUERY_KEYS } from '@/admin/features/ticket/import-batch/constants/queryKeys';

export const QUERY_KEYS = {
    // Auth
    AUTH_ME: 'admin-me',
    CLIENT_ME: 'client-me',
    CLIENT_NOTIFICATIONS: 'client-notifications',
    CLIENT_NOTIFICATION_SETTINGS: 'client-notification-settings',
    ADMIN_NOTIFICATIONS: 'admin-notifications',

    // Admin / Staff
    ADMIN_ORDERS: 'admin-orders',
    ADMIN_ORDER_DETAIL: 'admin-order',
    ORDER_DETAIL_REFUND_PREP: 'order-detail-refund-prep',

    // User / Customer
    ACCOUNTS_USER: 'accounts-user',
    ACCOUNT_USER_DETAIL: 'account-user',
    USER_ORDERS: 'user-orders',
    STREET_AGENT_PROFILES: 'street-agent-profiles',
    STREET_AGENT_PROFILE_DETAIL: 'street-agent-profile',
    LUCKY_PATTERN_CONFIGS: 'lucky-pattern-configs',
    VENDOR_ALLOCATION_CANDIDATES: 'vendor-allocation-candidates',
    VENDOR_ALLOCATION_BATCH: 'vendor-allocation-batch',

    // Role
    ROLE_DETAIL: 'role',

    // Station/Provider
    PROVIDERS: 'providers',
    PROVIDER_DETAIL: 'provider',
    STATIONS_TODAY: 'stations-today',
    STATIONS_TOMORROW: 'stations-tomorrow',
    PUBLIC_STATIONS_TODAY: 'public-stations-today',
    PUBLIC_STATIONS_TOMORROW: 'public-stations-tomorrow',

    // Import batch (source of truth: feature constants)
    ...IMPORT_BATCH_QUERY_KEYS,

    // Supplier
    SUPPLIERS: 'suppliers',
    SUPPLIER_DETAIL: 'supplier-detail',
    SUPPLIERS_ACTIVE: 'suppliers-active',

    // Order (Client)
    CLIENT_ORDER_RECEIVE_TYPES: 'client-order-receive-types',
    CLIENT_ORDER_STATUSES: 'client-order-statuses',
    CLIENT_MY_ORDERS: 'client-my-orders',
    CLIENT_MY_ORDER_DETAIL: 'client-my-order-detail',
    CLIENT_PENDING_PAYMENT_COUNTDOWN: 'client-pending-payment-countdown',
    CLIENT_LOTTERY_TICKET_SEARCH: 'client-lottery-ticket-search',
    CLIENT_MY_TICKETS: 'client-my-tickets',

    // Transaction (Client)
    CLIENT_TRANSACTION_TYPES: 'client-transaction-types',

    // Refund (Client)
    CLIENT_MY_REFUNDS: 'client-my-refunds',
    CLIENT_REFUND_DETAIL: 'client-refund-detail',
    CLIENT_REFUND_STATUSES: 'client-refund-statuses',
    CLIENT_REFUND_TYPES: 'client-refund-types',
    CLIENT_BANK_ACCOUNTS: 'client-bank-accounts',
    CLIENT_BANK_CATALOG: 'client-bank-catalog',
    CLIENT_ORDER_REFUND_ELIGIBILITY: 'client-order-refund-eligibility',

    // Prize payout (Client)
    CLIENT_PRIZE_PAYOUTS: 'client-prize-payouts',
    CLIENT_PRIZE_PAYOUT_DETAIL: 'client-prize-payout-detail',
    CLIENT_PRIZE_PAYOUT_STATUSES: 'client-prize-payout-statuses',
    CLIENT_PRIZE_PAYOUT_PENDING_COUNT: 'client-prize-payout-pending-count',

    // Support / Complaints (Client)
    CLIENT_TICKET_CATEGORIES: 'client-ticket-categories',
    CLIENT_MY_COMPLAINTS: 'client-my-complaints',
    CLIENT_COMPLAINT_DETAIL: 'client-complaint-detail',
    CLIENT_TICKET_COMMENTS: 'client-ticket-comments',
    CLIENT_ORDER_COMPLAINT_ELIGIBILITY: 'client-order-complaint-eligibility',

    // Refunds (Admin)
    ADMIN_REFUNDS: 'admin-refunds',
    ADMIN_REFUND_DETAIL: 'admin-refund-detail',
    ADMIN_PRIZE_PAYOUTS: 'admin-prize-payouts',
    ADMIN_PRIZE_PAYOUT_DETAIL: 'admin-prize-payout-detail',
    ADMIN_PRIZE_PAYOUT_LOOKUP_STATIONS: 'admin-prize-payout-lookup-stations',
    ADMIN_CUSTOMER_BANK_ACCOUNTS: 'admin-customer-bank-accounts',
    ADMIN_BADGES: 'admin-badges',

    // Reviews (Admin)
    ADMIN_REVIEWS: 'admin-reviews',

    // System / public config
    PUBLIC_SYSTEM_CONFIG: 'public-system-config',
    PASSWORD_POLICY: 'password-policy',

    // Blogs (Shared / Client-facing)
    PUBLIC_BLOG_CATEGORIES: 'public-blog-categories',
    PUBLIC_BLOG_POSTS: 'public-posts',
} as const;

export const publicSystemConfigQueryKey = (key: string) =>
    [QUERY_KEYS.PUBLIC_SYSTEM_CONFIG, key] as const;

export const publicStationsQueryKeys = {
    today: () => [QUERY_KEYS.PUBLIC_STATIONS_TODAY] as const,
    tomorrow: () => [QUERY_KEYS.PUBLIC_STATIONS_TOMORROW] as const,
} as const;

export const orderDetailRefundPrepQueryKey = (orderId: string) =>
    [QUERY_KEYS.ORDER_DETAIL_REFUND_PREP, orderId] as const;

export const userOrdersQueryKey = (userId: string, page: number, rowsPerPage: number) =>
    [QUERY_KEYS.USER_ORDERS, userId, page, rowsPerPage] as const;
