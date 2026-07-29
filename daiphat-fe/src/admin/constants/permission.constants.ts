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
    STREET_AGENT: {
        VIEW: "streetAgent:view",
        CREATE: "streetAgent:create",
        EDIT: "streetAgent:edit",
        DELETE: "streetAgent:delete",
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
    IMPORT_BATCH: {
        VIEW: "importBatch:view",
        CREATE: "importBatch:create",
    },
    SUPPLIER: {
        VIEW: "supplier:view",
        CREATE: "supplier:create",
        EDIT: "supplier:edit",
    },
    PROVIDER: {
        VIEW: "provider:view",
        CREATE: "provider:create",
        EDIT: "provider:edit",
        DELETE: "provider:delete",
        SYNC: "provider:sync",
    },
    TICKET_SERVICE: {
        VIEW: "ticketService:view",
        CREATE: "ticketService:create",
        EDIT: "ticketService:edit",
    },
    ORDER: {
        VIEW: "order:view",
        CREATE: "order:create",
        EDIT: "order:edit",
        DELETE: "order:delete",
    },
    REFUND: {
        VIEW: "refund:view",
        PROCESS: "refund:process",
    },
    PRIZE_PAYOUT: {
        VIEW: "prizePayout:view",
        PROCESS: "prizePayout:process",
    },
    REGION: {
        VIEW: "region:view",
        CREATE: "region:create",
        EDIT: "region:edit",
        DELETE: "region:delete",
        SYNC: "region:sync",
    },
    PRIZE_STRUCTURE: {
        VIEW: "prizeStructure:view",
        CREATE: "prizeStructure:create",
        EDIT: "prizeStructure:edit",
        DELETE: "prizeStructure:delete",
        SYNC: "prizeStructure:sync",
    },
    LOTTERY_RESULT: {
        VIEW: "lotteryResult:view",
        CREATE: "lotteryResult:create",
        EDIT: "lotteryResult:edit",
        DELETE: "lotteryResult:delete",
        SYNC: "lotteryResult:sync",
    },
    TICKET_SERVICE_ORDER: {
        VIEW: "ticketServiceOrder:view",
        EDIT: "ticketServiceOrder:edit",
    },
    CHAT: {
        VIEW: "chat:view",
        MANAGE: "chat:manage",
    },
    NOTIFICATION: {
        VIEW: "notification:view",
    },
    REVIEW: {
        VIEW: "review:view",
    },
    SUPPORT_TICKET: {
        VIEW: "supportTicket:view",
        PROCESS: "supportTicket:process",
    },
    CALENDAR: {
        VIEW: "calendar:view",
    },
    SETTINGS: {
        VIEW: "settings:view",
        EDIT: "settings:edit",
    },
} as const;
