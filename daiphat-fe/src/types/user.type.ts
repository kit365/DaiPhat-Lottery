import { RoleResponse as Role } from "./role.type";

export enum UserStatus {
    ACTIVE = "ACTIVE",
    PENDING = "PENDING",
    LOCKED = "LOCKED",
    BANNED = "BANNED",
    DELETED = "DELETED"
}

export interface User {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string; 
    gender?: string;
    dob?: string;
    phone?: string;
    phoneNumber?: string; // Unified field for phone data from various endpoints
    imagePublicId?: string;
    avatarUrl?: string;
    avatar?: string; // FE mapped
    role?: Role;
    rolesName?: string[]; // FE mapped
    permissions?: string[];
    status: UserStatus | string;
    hasPassword?: boolean;
    agreedToTerms?: boolean;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    zodiac?: string;
    fortune?: string;
    age?: number;
    failedLoginAttempts?: number;
    lockedUntil?: string;
    createdAt?: string;
    updatedAt?: string;
}


export const STATUS_LABELS: Record<string, string> = {
    'ACTIVE': 'Hoạt động',
    'PENDING': 'Chờ xử lý',
    'BANNED': 'Bị cấm',
    'LOCKED': 'Bị khóa',
    'DELETED': 'Đã xóa'
};

export const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'ACTIVE', label: 'Hoạt động' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'BANNED', label: 'Bị cấm' },
    { value: 'LOCKED', label: 'Bị khóa' },
];


export const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    'ACTIVE': 'success',
    'PENDING': 'warning',
    'BANNED': 'error',
    'LOCKED': 'default',
    'DELETED': 'default'
};
