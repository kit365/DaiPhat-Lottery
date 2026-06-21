export enum RefundRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    TRANSFERRED = 'TRANSFERRED',
    CANCELLED = 'CANCELLED'
}

export enum RefundType {
    FULL_ORDER = 'FULL_ORDER',
    ORDER_DETAIL = 'ORDER_DETAIL'
}

export enum RefundRequestRole {
    CUSTOMER = 'CUSTOMER',
    STAFF = 'STAFF'
}

export interface UserBankAccountResponse {
    id: number;
    bankName: string;
    bankLogo?: string;
    bankBin: string;
    bankAccountNo: string;
    bankAccountName: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserBankAccountRequest {
    bankBin: string;
    bankAccountNo: string;
    bankAccountName: string;
    isDefault?: boolean;
}

export type UpdateUserBankAccountRequest = CreateUserBankAccountRequest;

export interface VietQrBankResponse {
    code: string;
    bin: string;
    name: string;
    shortName: string;
    logo: string;
}

export interface CreateRefundRequestRequest {
    refundType: RefundType;
    orderId: string;
    orderDetailId?: number;
    refundAmount: number;
    refundReason: string;
    bankAccountId: number;
}

export interface RefundRequestResponse {
    id: number;
    refundType: RefundType;
    orderId: string;
    orderDetailId?: number;
    requestedBy: string;
    requestRole: RefundRequestRole;
    status: RefundRequestStatus;
    refundAmount: number;
    refundReason: string;
    bankAccountId: number;
    bankAccount?: UserBankAccountResponse;
    rejectReason?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    transferEvidenceUrl?: string;
    transferredAt?: string;
    transferredBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetMyRefundsParams {
    page?: number;
    limit?: number;
    status?: RefundRequestStatus | string;
    orderId?: string;
    search?: string;
}
