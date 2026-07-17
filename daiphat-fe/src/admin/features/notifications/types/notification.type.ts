export interface AdminNotificationItem {
    _id: string;
    title: string;
    content: string;
    status: 'read' | 'unread';
    type: string;
    createdAt: string;
    referenceId?: string | null;
    referenceType?: string | null;
}

export interface GetNotificationsParams {
    page?: number;
    limit?: number;
}

export interface AdminNotificationsPageResponse {
    success: boolean;
    data: AdminNotificationItem[];
    pagination: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        limit: number;
        isFirst: boolean;
        isLast: boolean;
    };
    statusCounts?: Record<string, number>;
}
