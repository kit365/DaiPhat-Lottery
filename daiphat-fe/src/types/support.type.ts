export enum TicketStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    WAITING_FOR_CUSTOMER = 'WAITING_FOR_CUSTOMER',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED',
}

export enum TicketRefType {
    ORDER = 'ORDER',
    PAYMENT_TRANSACTION = 'PAYMENT_TRANSACTION',
    PRIZE_CLAIM = 'PRIZE_CLAIM',
}

export enum TicketCommentSenderRole {
    CUSTOMER = 'CUSTOMER',
    OPERATOR = 'OPERATOR',
    SYSTEM = 'SYSTEM',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'Mới tạo',
    [TicketStatus.IN_PROGRESS]: 'Đang xử lý',
    [TicketStatus.WAITING_FOR_CUSTOMER]: 'Chờ khách phản hồi',
    [TicketStatus.RESOLVED]: 'Đã giải quyết',
    [TicketStatus.CLOSED]: 'Đã đóng',
};

export const TICKET_REF_TYPE_LABELS: Record<TicketRefType, string> = {
    [TicketRefType.ORDER]: 'Đơn hàng',
    [TicketRefType.PAYMENT_TRANSACTION]: 'Giao dịch thanh toán',
    [TicketRefType.PRIZE_CLAIM]: 'Yêu cầu nhận thưởng',
};

export interface TicketCategoryResponse {
    id: number;
    name: string;
    code: string;
    description: string;
    priority: number;
    requiredRefType: TicketRefType | null;
}

export interface SupportTicketCommentResponse {
    id: number;
    senderId?: string | null;
    senderRole: TicketCommentSenderRole;
    content: string;
    attachmentUrl?: string;
    createdAt: string;
}

export interface CreateSupportTicketCommentRequest {
    content: string;
}

export function findLastConversationalComment(
    comments: SupportTicketCommentResponse[]
): SupportTicketCommentResponse | undefined {
    return [...comments]
        .filter((c) => c.senderRole !== TicketCommentSenderRole.SYSTEM)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .pop();
}

export function canCustomerSendComment(
    status: TicketStatus,
    comments: SupportTicketCommentResponse[]
): boolean {
    if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
        return false;
    }
    const last = findLastConversationalComment(comments);
    if (!last) {
        return true;
    }
    return last.senderRole !== TicketCommentSenderRole.CUSTOMER;
}

export interface SupportTicketSummaryResponse {
    id: number;
    ticketCategoryId: number;
    title: string;
    status: TicketStatus;
    refId?: string;
    refType?: TicketRefType;
    dueAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SupportTicketResponse {
    id: number;
    ticketCategoryId: number;
    customerId: string;
    assignedTo?: string;
    title: string;
    description: string;
    attachmentUrl?: string;
    refId?: string;
    refType?: TicketRefType;
    status: TicketStatus;
    response?: string;
    resolvedAt?: string;
    dueAt?: string;
    createdAt: string;
    updatedAt: string;
    comments: SupportTicketCommentResponse[];
}

export interface CreateSupportTicketRequest {
    ticketCategoryId: number;
    title: string;
    description: string;
    refId?: string;
    refType?: TicketRefType;
}

export interface UpdateSupportTicketRequest {
    title?: string;
    description?: string;
    refId?: string;
    refType?: TicketRefType;
}

export interface GetMyTicketsParams {
    page?: number;
    limit?: number;
    status?: TicketStatus;
    search?: string;
}
