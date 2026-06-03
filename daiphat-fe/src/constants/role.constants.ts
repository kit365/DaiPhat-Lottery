export const USER_ROLES = {
    ADMIN: 'ROLE_ADMIN',
    MEMBER: 'ROLE_MEMBER',
    STREET_AGENT: 'ROLE_STREET_AGENT',
    STAFF_OPERATOR: 'ROLE_STAFF_OPERATOR'
} as const;

export type UserRoleType = typeof USER_ROLES[keyof typeof USER_ROLES];
