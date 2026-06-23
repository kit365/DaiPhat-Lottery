/**
 * ALL PERMISSION CODES
 * Limited to essential core modules currently existing in Backend AppPermission.java
 */
export const PERMISSIONS = {
    DASHBOARD: {
        SYSTEM: "dashboard:system",
        ANALYTICS: "dashboard:analytics",
        ECOMMERCE: "dashboard:ecommerce",
    },
    STATISTICS: {
        REVENUE: "stats:revenue",
        ORDER: "stats:order",
        SERVICE: "stats:service",
    },
    USER: {
        VIEW: "member:view",
        CREATE: "member:create",
        EDIT: "member:edit",
        DELETE: "member:delete",
    },
    ACCOUNT: {
        VIEW: "admin:view",
        CREATE: "admin:create",
        EDIT: "admin:edit",
        DELETE: "admin:delete",
    },
    ROLE: {
        VIEW: "role:view",
        CREATE: "role:create",
        EDIT: "role:edit",
        DELETE: "role:delete",
    },
    ARTICLE: {
        VIEW: "article:view",
        CREATE: "article:create",
        EDIT: "article:edit",
        DELETE: "article:delete",
    },
    TICKET: {
        VIEW: "ticket:view",
        CREATE: "ticket:create",
        EDIT: "ticket:edit",
        DELETE: "ticket:delete",
    },
    PROVIDER: {
        VIEW: "provider:view",
        CREATE: "provider:create",
        EDIT: "provider:edit",
    },
    TICKET_SERVICE: {
        VIEW: "ticketService:view",
        CREATE: "ticketService:create",
        EDIT: "ticketService:edit",
    },
    TICKET_SERVICE_ORDER: {
        VIEW: "ticketServiceOrder:view",
        EDIT: "ticketServiceOrder:edit",
    },
    COUPON: {
        VIEW: "coupon:view",
        CREATE: "coupon:create",
        EDIT: "coupon:edit",
    },
    CHAT: {
        VIEW: "chat:view",
        MANAGE: "chat:manage",
    },
    SUPPORT_TICKET: {
        VIEW: "chat:view",
        MANAGE: "chat:manage",
    },
    CALENDAR: {
        VIEW: "calendar:view",
    },
    SETTINGS: {
        VIEW: "settings:view",
        EDIT: "settings:edit",
    },
} as const;
