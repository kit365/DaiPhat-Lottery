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

    // User / Customer
    ACCOUNTS_USER: 'accounts-user',
    ACCOUNT_USER_DETAIL: 'account-user',
    STREET_AGENT_PROFILES: 'street-agent-profiles',
    STREET_AGENT_PROFILE_DETAIL: 'street-agent-profile',

    // Role
    ROLE_DETAIL: 'role',

    // Station/Provider
    PROVIDERS: 'providers',
    PROVIDER_DETAIL: 'provider',
    STATIONS_TODAY: 'stations-today',
    STATIONS_TOMORROW: 'stations-tomorrow',

    // Import batch
    IMPORT_BATCH_ACTIVE_DRAFT: 'import-batch-active-draft',
    IMPORT_BATCH_LIST: 'import-batch-list',
    IMPORT_BATCH_DETAIL: 'import-batch-detail',
    IMPORT_BATCH_CLASSIFY_PREVIEW: 'import-batch-classify-preview',
    IMPORT_BATCH_ELIGIBLE_STATIONS: 'import-batch-eligible-stations',
    IMPORT_BATCH_TIME_POLICY: 'import-batch-time-policy',
    IMPORT_BATCH_INCOMPLETE: 'import-batch-incomplete',
    IMPORT_BATCH_WITHOUT_LINES: 'import-batch-without-lines',
    IMPORT_BATCH_REDUCTION_TICKETS: 'import-batch-reduction-tickets',
    IMPORT_BATCH_LINE_ENTRY_TICKETS: 'import-batch-line-entry-tickets',

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

    // Blogs (Shared / Client-facing)
    PUBLIC_BLOG_CATEGORIES: 'public-blog-categories',
    PUBLIC_BLOG_POSTS: 'public-posts',
} as const;
