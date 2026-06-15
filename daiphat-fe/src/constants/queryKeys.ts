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

    // User / Customer
    ACCOUNTS_USER: 'accounts-user',
    ACCOUNT_USER_DETAIL: 'account-user',
    USER_STATUSES: 'user-statuses',

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
} as const;
