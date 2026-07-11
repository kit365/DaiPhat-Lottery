export const NOTIFICATION_CHANNEL = {
    IN_APP: "IN_APP",
    EMAIL: "EMAIL",
} as const;

export const NOTIFICATION_TYPE = {
    SYSTEM: "SYSTEM",
    AUTH: "AUTH",
    BLOG: "BLOG",
    ORDER: "ORDER",
} as const;

export const NOTIFICATION_STATUS = {
    PENDING: "PENDING",
    SENT: "SENT",
    FAILED: "FAILED",
} as const;

export const NOTIFICATION_REFERENCE_TYPE = {
    AUTH: "AUTH",
    BLOG_POST: "BLOG_POST",
    ORDER: "ORDER",
    REFUND: "REFUND",
    LOTTERY_STATION: "LOTTERY_STATION",
    SYSTEM: "SYSTEM",
    SUPPORT_TICKET: "SUPPORT_TICKET",
} as const;

export type NotificationChannel = typeof NOTIFICATION_CHANNEL[keyof typeof NOTIFICATION_CHANNEL];
export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];
export type NotificationStatus = typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS];
export type NotificationReferenceType =
    typeof NOTIFICATION_REFERENCE_TYPE[keyof typeof NOTIFICATION_REFERENCE_TYPE];

export interface NotificationReferenceAvailabilityResponse {
    available: boolean;
    referenceType?: NotificationReferenceType | null;
    referenceId?: string | null;
    message?: string | null;
}

export interface NotificationResponse {
    notificationId: number;
    userId: string;
    title: string;
    content: string;
    isRead: boolean;
    type: NotificationType;
    channel: NotificationChannel;
    referenceId?: string | null;
    referenceType?: NotificationReferenceType | null;
    status: NotificationStatus;
    createdAt: string;
    deletedAt?: string | null;
}

export interface NotificationSettingResponse {
    notificationSettingId: number;
    userId: string;
    channel: NotificationChannel;
    type: NotificationType;
    isEnabled: boolean;
    updatedAt: string;
}

export interface CreateNotificationRequest {
    userId: string;
    title: string;
    content: string;
    type: NotificationType;
    channel: NotificationChannel;
    referenceId?: string | null;
    referenceType?: NotificationReferenceType | null;
    status?: NotificationStatus | null;
}

export interface UpdateNotificationRequest {
    title?: string;
    content?: string;
    isRead?: boolean;
    type?: NotificationType;
    channel?: NotificationChannel;
    referenceId?: string | null;
    referenceType?: NotificationReferenceType | null;
    status?: NotificationStatus;
}

export interface UpsertNotificationSettingRequest {
    userId: string;
    channel: NotificationChannel;
    type: NotificationType;
    isEnabled: boolean;
}
