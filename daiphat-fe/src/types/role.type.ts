export interface PermissionResponse {
    id?: string;
    code: string;
    name: string;
    description?: string;
    groupName?: string;
    module?: string;
    action?: string;
    displayOrder?: number;
}

export interface RoleResponse {
    id: string;
    _id?: string;
    code: string;
    name: string;
    description?: string;
    permissions?: string[];
    isSystem?: boolean;
}

export interface CreateRoleRequest {
    code: string;
    name: string;
    description?: string;
    permissions?: string[];
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {}


export enum RoleEnum {
    ADMIN = 'ROLE_ADMIN',
    MEMBER = 'ROLE_MEMBER',
    STREET_AGENT = 'ROLE_STREET_AGENT',
    STAFF_OPERATOR = 'ROLE_STAFF_OPERATOR'
}
