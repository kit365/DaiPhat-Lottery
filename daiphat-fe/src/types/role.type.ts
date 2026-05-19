export interface Role {
    id: string;
    code: string;
    name: string;
    description?: string;
    permissions?: string[];
}
