export const prefixAdmin = "admin";

export const ROUTES = {
    ADMIN: {
        ROOT: `/${prefixAdmin}`,
        AUTH: {
            LOGIN: `/${prefixAdmin}/auth/login`,
            REGISTER: `/${prefixAdmin}/auth/register`,
            FORGOT_PASSWORD: `/${prefixAdmin}/auth/forgot-password`,
            CALLBACK: `/${prefixAdmin}/auth/callback`,
            SETUP_PROFILE: `/${prefixAdmin}/setup-profile`,
        },
        DASHBOARD: {
            ROOT: `/${prefixAdmin}/dashboard`,
            SYSTEM: `/${prefixAdmin}/dashboard/system`,
            ANALYTICS: `/${prefixAdmin}/dashboard/analytics`,
            ECOMMERCE: `/${prefixAdmin}/dashboard/ecommerce`,
            STATISTICS: {
                GENERAL: `/${prefixAdmin}/dashboard/statistics/general`,
                ORDERS: `/${prefixAdmin}/dashboard/statistics/orders`,
            },
            SETTINGS: {
                ROOT: `/${prefixAdmin}/dashboard/settings`,
                GENERAL: `/${prefixAdmin}/dashboard/settings/general`,
                POLICIES: `/${prefixAdmin}/dashboard/settings/policies`,
                PAGES: `/${prefixAdmin}/dashboard/settings/pages`,
                CONTRACTS: `/${prefixAdmin}/dashboard/settings/contracts`,
                SYSTEM_CONFIG: `/${prefixAdmin}/settings/system-config/list`,
            }
        },
        TICKETS: {
            LIST: `/${prefixAdmin}/ticket/list`,
            DETAIL: (id: number | string) => `/${prefixAdmin}/ticket/detail/${id}`,
            EDIT: (id: number | string) => `/${prefixAdmin}/ticket/edit/${id}`,
            PROVIDER: `/${prefixAdmin}/provider/list`,
            PROVIDER_DETAIL: (id: number | string) => `/${prefixAdmin}/provider/detail/${id}`,
            PROVIDER_EDIT: (id: number | string) => `/${prefixAdmin}/provider/edit/${id}`,
            PRIZE_STRUCTURE: `/${prefixAdmin}/prize-structures/list`,
            DRAW_RESULT: `/${prefixAdmin}/draw-results`,
            REGION: `/${prefixAdmin}/region/list`,
            EXPIRED: `/${prefixAdmin}/ticket/expired`,
        },
        IMPORT_BATCH: {
            LIST: `/${prefixAdmin}/import-batch/list`,
            CREATE: `/${prefixAdmin}/import-batch/create`,
            EDIT: (id: number | string) => `/${prefixAdmin}/import-batch/edit/${id}`,
            DETAIL: (id: number | string) => `/${prefixAdmin}/import-batch/detail/${id}`,
            LINE_DETAIL: (batchId: number | string, lineId: number | string) => `/${prefixAdmin}/import-batch/detail/${batchId}/line/${lineId}`,
        },
        RETURN_BATCH: {
            LIST: `/${prefixAdmin}/return-batch/list`,
            EDIT: (id: number | string) => `/${prefixAdmin}/return-batch/edit/${id}`,
            DETAIL: (id: number | string) => `/${prefixAdmin}/return-batch/detail/${id}`,
            INSPECT: (id: number | string) => `/${prefixAdmin}/return-batch/inspect/${id}`,
        },
        SUPPLIER_SETTLEMENT: {
            LIST: `/${prefixAdmin}/supplier-settlement/list`,
            DETAIL: (id: number | string) => `/${prefixAdmin}/supplier-settlement/detail/${id}`,
            INSPECT: (id: number | string) => `/${prefixAdmin}/supplier-settlement/inspect/${id}`,
        },
        SUPPLIER: {
            LIST: `/${prefixAdmin}/supplier/list`,
            CREATE: `/${prefixAdmin}/supplier/create`,
            DETAIL: (id: number | string) => `/${prefixAdmin}/supplier/detail/${id}`,
            EDIT: (id: number | string) => `/${prefixAdmin}/supplier/edit/${id}`,
        },
        BLOGS: {
            LIST: `/${prefixAdmin}/blog/list`,
            DETAIL: `/${prefixAdmin}/blog/detail/`,
            CATEGORIES: `/${prefixAdmin}/blog-category/list`,
            TAGS: `/${prefixAdmin}/blog-tag/list`,
        },
        ORDERS: {
            LIST: `/${prefixAdmin}/order/list`,
            DETAIL: `/${prefixAdmin}/order/detail/`,
            CREATE_COUNTER: `/${prefixAdmin}/order/create-counter`,
        },
        REFUNDS: {
            LIST: `/${prefixAdmin}/refunds/list`,
            DETAIL: `/${prefixAdmin}/refunds/detail/`,
        },
        PRIZE_PAYOUTS: {
            LIST: `/${prefixAdmin}/prize-payouts/list`,
            DETAIL: `/${prefixAdmin}/prize-payouts/detail/`,
            CREATE: `/${prefixAdmin}/prize-payouts/create`,
        },
        PRIZE_CLAIM_SUBMISSIONS: {
            LIST: `/${prefixAdmin}/prize-claim-submissions`,
            DETAIL: (id: number | string) => `/${prefixAdmin}/prize-claim-submissions/${id}`,
            CREATE: `/${prefixAdmin}/prize-claim-submissions/create`,
        },
        SUPPORT_TICKETS: {
            LIST: `/${prefixAdmin}/support-tickets/list`,
            DETAIL: `/${prefixAdmin}/support-tickets/detail/`,
            CATEGORIES: `/${prefixAdmin}/support-tickets/categories`,
        },
        ROLES: {
            LIST: `/${prefixAdmin}/role/list`,
            CREATE: `/${prefixAdmin}/role/create`,
        },
        ACCOUNTS: {
            ADMIN: {
                LIST: `/${prefixAdmin}/account-admin/list`,
                CREATE: `/${prefixAdmin}/account-admin/create`,
                EDIT: `/${prefixAdmin}/account-admin/edit`,
                DETAIL: `/${prefixAdmin}/account-admin/detail`,
                CHANGE_PASSWORD: `/${prefixAdmin}/account-admin/change-password`,
            },
            USER: {
                LIST: `/${prefixAdmin}/account-user/list`,
                CREATE: `/${prefixAdmin}/account-user/create`,
                EDIT: `/${prefixAdmin}/account-user/edit`,
                DETAIL: `/${prefixAdmin}/account-user/detail`,
                CHANGE_PASSWORD: `/${prefixAdmin}/account-user/change-password`,
            },
            STREET_AGENT: {
                LIST: `/${prefixAdmin}/street-agent/list`,
                CREATE: `/${prefixAdmin}/street-agent/create`,
                EDIT: `/${prefixAdmin}/street-agent/edit`,
                LUCKY_PATTERNS: `/${prefixAdmin}/street-agent/lucky-patterns`,
                ALLOCATION: `/${prefixAdmin}/street-agent/allocation`,
                ALLOCATION_BATCHES: `/${prefixAdmin}/street-agent/allocation/batches`,
                ALLOCATION_BATCH_DETAIL: (id: number | string) => `/${prefixAdmin}/street-agent/allocation/batches/${id}`,
                REPORTS: `/${prefixAdmin}/street-agent/reports`,
                CONTRACT_PDF: (id: number | string) => `/${prefixAdmin}/street-agent/contract/${id}`,
            }
        },
        CHAT: `/${prefixAdmin}/chat`,
        NOTIFICATIONS: `/${prefixAdmin}/notifications`,
        REPORTS: {
            REVENUE: `/${prefixAdmin}/reports/revenue`,
        },
        PROFILE: `/${prefixAdmin}/profile`,
        ACCOUNT: `/${prefixAdmin}/account`,
        MANAGEMENT: {
            ROOT: `/${prefixAdmin}/dashboard`,
        },
        SHIPPING: {
            ROOT: `/${prefixAdmin}/shipping/tasks`,
        },
    },
    PUBLIC: {
        HOME: "/",
        SETUP_PROFILE: "/setup-profile",
        TICKETS: "/tickets",
        SCHEDULE: "/schedule",
        FORTUNE: "/fortune",
        BLOGS: "/blogs",
        CART: "/cart",
        CHECKOUT: "/checkout",
        PROFILE: {
            ROOT: "/profile",
            OVERVIEW: "/profile/overview",
            INFO: "/profile/info",
            MY_TICKETS: "/profile/tickets",
            ORDERS: "/profile/orders",
            REFUNDS: "/profile/refunds",
            PRIZE_PAYOUTS: "/profile/prize-payouts",
            COMPLAINTS: "/profile/complaints",
            BANK_ACCOUNTS: "/profile/bank-accounts",
            NOTIFICATIONS: "/profile/notifications",
            SETTINGS: "/profile/settings",
        },
    }
} as const;
