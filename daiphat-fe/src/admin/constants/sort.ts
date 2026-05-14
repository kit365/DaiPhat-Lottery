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

export const FILTER_ALL = 'all';

export const DEFAULT_SORT = {
    FIELD: AccountSortField.CREATED_AT,
    DIRECTION: SortDirection.DESC
};

export interface SortOption {
    value: string;
    label: string;
}

export const createSortValue = (field: string, direction: SortDirection) => `${field}:${direction}`;
