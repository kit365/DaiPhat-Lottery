import { BaseQueryParams } from "../../../config/type";
import { UserStatus } from "../../../../types/user.type";

export interface UserQueryParams extends BaseQueryParams {
    status?: UserStatus | string;
    ticketServiceId?: string;
}

export interface CreateUserRequest {
    email?: string;
    phone?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    username?: string;
    roleCode?: string;
    roles?: string[];
    status?: UserStatus | string;
    avatar?: string;
    avatarUrl?: string;
    password?: string;
    [key: string]: any; // Allow temporary flexibility for unknown backend fields, but eliminate strict 'any' in params
}

export type UpdateUserRequest = Partial<CreateUserRequest>;

export type UserMutationPayload = CreateUserRequest;
