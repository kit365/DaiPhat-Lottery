export const USER_ROLES = {
    ADMIN: 'ROLE_ADMIN',
    MEMBER: 'ROLE_MEMBER',
    STAFF_SHIPPER: 'ROLE_STAFF_SHIPPER',
    STAFF_MANAGER: 'ROLE_STAFF_MANAGER'
} as const;

export type UserRoleType = typeof USER_ROLES[keyof typeof USER_ROLES];
