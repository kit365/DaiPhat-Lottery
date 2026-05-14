import { Role } from "./role.type.ts";

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
    fullName?: string; // FE mapped
    phone?: string;
    phoneNumber?: string; // Unified field for phone data from various endpoints
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
