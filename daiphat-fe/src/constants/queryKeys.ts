export const QUERY_KEYS = {
    // Auth
    AUTH_ME: 'admin-me',
    CLIENT_ME: 'client-me',
    CLIENT_NOTIFICATIONS: 'client-notifications',
    ADMIN_NOTIFICATIONS: 'admin-notifications',

    // Admin / Staff
    ACCOUNTS_ADMIN: 'accounts-admin',
    ACCOUNT_ADMIN_DETAIL: 'account-admin',
    STAFF_BY_TICKET_SERVICE: 'staff-by-ticketService',
    ADMIN_ORDERS: 'admin-orders',
    ADMIN_ORDER_DETAIL: 'admin-order',

    // User / Customer
    ACCOUNTS_USER: 'accounts-user',
    ACCOUNT_USER_DETAIL: 'account-user',
    USER_STATUSES: 'user-statuses',
    STREET_AGENT_PROFILES: 'street-agent-profiles',
    STREET_AGENT_PROFILE_DETAIL: 'street-agent-profile',

    // Role
    ROLES: 'roles',
    ROLE_DETAIL: 'role',

    // Blog
    BLOGS: 'blogs',
    BLOG_DETAIL: 'blog',
    BLOG_CATEGORIES: 'blog-categories',
    BLOG_CATEGORY_DETAIL: 'blog-category',
    BLOG_TAGS: 'blogTags',
    BLOG_TAGS_PAGED: 'blogTagsPaged',
    BLOG_TYPES: 'blogTypes',
    BLOG_STATUSES: 'blogStatuses',
    PUBLIC_BLOG_CATEGORIES: 'public-blog-categories',
    PUBLIC_BLOG_POSTS: 'public-posts',

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

    // Transaction (Client)
    CLIENT_TRANSACTION_TYPES: 'client-transaction-types',

    // Refund (Client)
    CLIENT_MY_REFUNDS: 'client-my-refunds',
    CLIENT_REFUND_DETAIL: 'client-refund-detail',
    CLIENT_REFUND_STATUSES: 'client-refund-statuses',
    CLIENT_REFUND_TYPES: 'client-refund-types',
    CLIENT_BANK_ACCOUNTS: 'client-bank-accounts',
    CLIENT_BANK_CATALOG: 'client-bank-catalog',

    // Support / Complaints (Client)
    CLIENT_TICKET_CATEGORIES: 'client-ticket-categories',
    CLIENT_MY_COMPLAINTS: 'client-my-complaints',
    CLIENT_COMPLAINT_DETAIL: 'client-complaint-detail',
    CLIENT_TICKET_COMMENTS: 'client-ticket-comments',

    // Support / Complaints (Admin)
    ADMIN_SUPPORT_TICKETS: 'admin-support-tickets',
    ADMIN_SUPPORT_TICKET_DETAIL: 'admin-support-ticket-detail',
    ADMIN_SUPPORT_TICKET_COMMENTS: 'admin-support-ticket-comments',
    ADMIN_TICKET_CATEGORIES: 'admin-ticket-categories',

    // Lottery Results
    LOTTERY_RESULTS: 'lottery-results',
    LOTTERY_RESULTS_LIVE: 'lottery-results-live',
    LOTTERY_RESULT_DETAILS: 'lottery-result-details',
} as const;
