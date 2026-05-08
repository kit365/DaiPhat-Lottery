export enum SortDirection {
    ASC = 'asc',
    DESC = 'desc'
}

export enum AccountSortField {
    CREATED_AT = 'createdAt',
    FIRST_NAME = 'firstName',
    USERNAME = 'username',
    EMAIL = 'email'
}

export interface SortOption {
    value: string;
    label: string;
}

export const createSortValue = (field: string, direction: SortDirection) => `${field}:${direction}`;
