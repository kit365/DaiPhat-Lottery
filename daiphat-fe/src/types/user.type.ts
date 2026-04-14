export interface Role {
    id?: string;
    code: string;
    name: string;
    description?: string;
    isStaff?: boolean;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    fullName?: string; // Derived or optional
    username: string;
    email: string;
    avatar?: string;
    avatarUrl?: string; // From BE
    permissions?: string[];
    roles?: Role[];
    role?: Role; // From BE
    phone?: string;
    totalPoint?: number;
    usedPoint?: number;
}
