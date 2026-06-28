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
                TICKET_SERVICES: `/${prefixAdmin}/dashboard/statistics/ticketServices`,
            },
            SETTINGS: {
                ROOT: `/${prefixAdmin}/dashboard/settings`,
                GENERAL: `/${prefixAdmin}/dashboard/settings/general`,
                SHIPPING: `/${prefixAdmin}/dashboard/settings/shipping`,
                PAYMENT: `/${prefixAdmin}/dashboard/settings/payment`,
                SOCIAL: `/${prefixAdmin}/dashboard/settings/social`,
                APP_PASSWORD: `/${prefixAdmin}/dashboard/settings/app-password`,
                TICKET_SUBTYPE: `/${prefixAdmin}/settings/ticketSubtype/list`,
            }
        },
        TICKETS: {
            LIST: `/${prefixAdmin}/ticket/list`,
            PROVIDER: `/${prefixAdmin}/provider/list`,
            PRIZE_STRUCTURE: `/${prefixAdmin}/prize-structures/list`,
            DRAW_RESULT: `/${prefixAdmin}/draw-results`,
            REGION: `/${prefixAdmin}/region/list`,
            ATTRIBUTE: `/${prefixAdmin}/ticket/attribute/list`,
            EXPIRED: `/${prefixAdmin}/ticket/expired`,
        },
        TICKET_SERVICES: {
            LIST: `/${prefixAdmin}/ticketService/list`,
            CREATE: `/${prefixAdmin}/ticketService/create`,
            CATEGORIES: `/${prefixAdmin}/ticketService/categories`,
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
        TICKET_SERVICE_ORDERS: {
            LIST: `/${prefixAdmin}/ticketServiceOrder/list`,
            CREATE: `/${prefixAdmin}/ticketServiceOrder/create`,
            CONFIG: `/${prefixAdmin}/ticketServiceOrder/config`,
            EDIT: `/${prefixAdmin}/ticketServiceOrder/edit/`,
            DETAIL: `/${prefixAdmin}/ticketServiceOrder/detail/`,
        },
        REVIEWS: `/${prefixAdmin}/review`,
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
            }
        },
        CHAT: `/${prefixAdmin}/chat`,
        COUPONS: {
            LIST: `/${prefixAdmin}/coupon/list`,
            CREATE: `/${prefixAdmin}/coupon/create`,
        },
        CALENDAR: `/${prefixAdmin}/calendar`,
        NOTIFICATIONS: `/${prefixAdmin}/notifications`,
        PROFILE: `/${prefixAdmin}/profile`,
        ACCOUNT: `/${prefixAdmin}/account`,
        MANAGEMENT: {
            ROOT: `/${prefixAdmin}/management/dashboard`,
        },
        SHIPPING: {
            ROOT: `/${prefixAdmin}/shipping/tasks`,
        },
    },
    PUBLIC: {
        HOME: "/",
        SETUP_PROFILE: "/setup-profile",
        SCHEDULE: "/lich-mo-thuong",
    }
} as const;
