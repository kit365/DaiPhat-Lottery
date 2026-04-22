import { Role } from "./role.type.ts";

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    username: string;
    email: string;
    avatar?: string;
    avatarUrl?: string; // From BE
    permissions?: string[];
    roles?: Role[];
    phone?: string; // Standard FE
    totalPoint?: number;
    usedPoint?: number;
    hasPassword?: boolean;
    agreedToTerms?: boolean;
}
