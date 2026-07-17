export enum TicketStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    WAITING_FOR_CUSTOMER = 'WAITING_FOR_CUSTOMER',
    RESOLVED = 'RESOLVED',
    REJECTED = 'REJECTED',
    CLOSED = 'CLOSED',
}

export enum TicketRefType {
    ORDER = 'ORDER',
    PAYMENT_TRANSACTION = 'PAYMENT_TRANSACTION',
    PRIZE_CLAIM = 'PRIZE_CLAIM',
    REFUND_REQUEST = 'REFUND_REQUEST',
}

export enum TicketCommentSenderRole {
    CUSTOMER = 'CUSTOMER',
    OPERATOR = 'OPERATOR',
    SYSTEM = 'SYSTEM',
}

export enum StaffTicketResponseAction {
    NORMAL = 'NORMAL',
    RESOLVE = 'RESOLVE',
    REJECT = 'REJECT',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
    [TicketStatus.OPEN]: 'Mới tạo',
    [TicketStatus.IN_PROGRESS]: 'Đang xử lý',
    [TicketStatus.WAITING_FOR_CUSTOMER]: 'Chờ khách phản hồi',
    [TicketStatus.RESOLVED]: 'Đã giải quyết',
    [TicketStatus.REJECTED]: 'Đã từ chối',
    [TicketStatus.CLOSED]: 'Đã đóng',
};

export const TICKET_REF_TYPE_LABELS: Record<TicketRefType, string> = {
    [TicketRefType.ORDER]: 'Đơn hàng',
    [TicketRefType.PAYMENT_TRANSACTION]: 'Giao dịch thanh toán',
    [TicketRefType.PRIZE_CLAIM]: 'Yêu cầu nhận thưởng',
    [TicketRefType.REFUND_REQUEST]: 'Yêu cầu hoàn tiền',
};

export interface TicketCategoryResponse {
    id: number;
    name: string;
    code: string;
    description: string;
    priority: number;
    requiredRefType: TicketRefType | null;
    parentId?: number | null;
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

export interface StaffSupportTicketResponseRequest {
    content: string;
    action: StaffTicketResponseAction;
}

export interface ResolutionFeedbackRequest {
    satisfied: boolean;
}

export function sortCommentsByCreatedAt(
    comments: SupportTicketCommentResponse[]
): SupportTicketCommentResponse[] {
    return [...comments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export function findLastConversationalComment(
    comments: SupportTicketCommentResponse[]
): SupportTicketCommentResponse | undefined {
    return sortCommentsByCreatedAt(comments)
        .filter((c) => c.senderRole !== TicketCommentSenderRole.SYSTEM)
        .pop();
}

export function findReasonComment(
    comments: SupportTicketCommentResponse[],
    reasonId?: number | null
): SupportTicketCommentResponse | undefined {
    if (!reasonId) return undefined;
    return comments.find((comment) => comment.id === reasonId);
}

export function isTerminalTicketStatus(status: TicketStatus): boolean {
    return (
        status === TicketStatus.RESOLVED ||
        status === TicketStatus.REJECTED ||
        status === TicketStatus.CLOSED
    );
}

export function canCustomerSendComment(
    status: TicketStatus,
    comments: SupportTicketCommentResponse[]
): boolean {
    if (isTerminalTicketStatus(status)) {
        return false;
    }
    const last = findLastConversationalComment(comments);
    if (!last) {
        return true;
    }
    return last.senderRole !== TicketCommentSenderRole.CUSTOMER;
}

export function canOperatorSendComment(
    status: TicketStatus,
    comments: SupportTicketCommentResponse[]
): boolean {
    if (isTerminalTicketStatus(status)) {
        return false;
    }
    if (status === TicketStatus.OPEN) {
        return false;
    }
    const last = findLastConversationalComment(comments);
    if (!last) {
        return true;
    }
    return last.senderRole !== TicketCommentSenderRole.OPERATOR;
}

export interface SupportTicketStaffSummaryResponse {
    id: number;
    ticketCategoryId: number;
    title: string;
    status: TicketStatus;
    customerId: string;
    customerName?: string;
    assignedTo?: string;
    assignedToName?: string;
    refId?: string;
    refType?: TicketRefType;
    dueAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ResolveSupportTicketRequest {
    response: string;
}

export interface GetStaffTicketsParams {
    page?: number;
    limit?: number;
    statuses?: string;
    search?: string;
    assignedTo?: string;
    sortBy?: 'dueAt' | 'createdAt' | 'updatedAt';
    direction?: 'asc' | 'desc';
    refType?: TicketRefType;
    ticketCategoryId?: number;
    categoryCodes?: string;
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
    resolvedReasonId?: number;
    rejectedReasonId?: number;
    resolvedAt?: string;
    dueAt?: string;
    createdAt: string;
    updatedAt: string;
    comments: SupportTicketCommentResponse[];
    customerName?: string;
    assignedToName?: string;
    ticketCategoryName?: string;
    ticketCategoryCode?: string;
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
