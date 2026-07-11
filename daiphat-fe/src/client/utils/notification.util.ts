import { NotificationResponse, NOTIFICATION_REFERENCE_TYPE } from "../../types/notifications.type";
import { resolveNotificationReference } from "../services/notificationService";
import { UNAVAILABLE_REFERENCE_MESSAGE } from "../components/notification/UnavailableReferenceState";

type RouteResolver = (referenceId?: string | null) => string | null;

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value?: string | null): boolean =>
    !!value && UUID_PATTERN.test(value.trim());

const isNumericId = (value?: string | null): boolean =>
    !!value && /^\d+$/.test(value.trim());

/**
 * ORDER notifications must carry an order UUID.
 * Legacy refund notifications incorrectly used referenceType=ORDER with a Long refund id —
 * route those to the refund detail page instead of order detail.
 */
const resolveOrderPath: RouteResolver = (referenceId) => {
    if (!referenceId) {
        return null;
    }
    if (isUuid(referenceId)) {
        return `/profile/orders/${referenceId}`;
    }
    if (isNumericId(referenceId)) {
        return `/profile/refunds/${referenceId}`;
    }
    return null;
};

const NOTIFICATION_ROUTES: Record<string, RouteResolver> = {
    [NOTIFICATION_REFERENCE_TYPE.BLOG_POST]: (referenceId) =>
        referenceId ? `/blogs/detail/${referenceId}` : null,
    [NOTIFICATION_REFERENCE_TYPE.ORDER]: resolveOrderPath,
    [NOTIFICATION_REFERENCE_TYPE.REFUND]: (referenceId) =>
        referenceId ? `/profile/refunds/${referenceId}` : null,
    [NOTIFICATION_REFERENCE_TYPE.SUPPORT_TICKET]: (referenceId) =>
        referenceId ? `/profile/complaints/${referenceId}` : null,
    [NOTIFICATION_REFERENCE_TYPE.LOTTERY_STATION]: () => "/buy-ticket",
    [NOTIFICATION_REFERENCE_TYPE.AUTH]: () => null,
    [NOTIFICATION_REFERENCE_TYPE.SYSTEM]: () => null,
};

export const getNotificationPath = (notification: NotificationResponse): string | null => {
    const referenceType = notification.referenceType;
    if (!referenceType) {
        return null;
    }

    const resolver = NOTIFICATION_ROUTES[referenceType];
    if (!resolver) {
        return null;
    }

    return resolver(notification.referenceId);
};

export type NotificationNavigationResult =
    | { kind: "navigate"; path: string }
    | { kind: "unavailable"; message: string }
    | { kind: "none" };

/**
 * Resolves whether the notification target still exists before navigating.
 * Missing references return a friendly unavailable result instead of hard API errors.
 */
export const resolveNotificationNavigation = async (
    notification: NotificationResponse
): Promise<NotificationNavigationResult> => {
    const path = getNotificationPath(notification);
    if (!path) {
        return { kind: "none" };
    }

    const needsReferenceCheck =
        notification.referenceType === NOTIFICATION_REFERENCE_TYPE.ORDER ||
        notification.referenceType === NOTIFICATION_REFERENCE_TYPE.REFUND ||
        notification.referenceType === NOTIFICATION_REFERENCE_TYPE.SUPPORT_TICKET ||
        notification.referenceType === NOTIFICATION_REFERENCE_TYPE.BLOG_POST;

    if (!needsReferenceCheck || !notification.notificationId) {
        return { kind: "navigate", path };
    }

    try {
        const availability = await resolveNotificationReference(notification.notificationId);
        if (!availability.available) {
            return {
                kind: "unavailable",
                message: availability.message || UNAVAILABLE_REFERENCE_MESSAGE,
            };
        }
        return { kind: "navigate", path };
    } catch {
        // If resolve fails unexpectedly, still attempt navigation; detail pages handle soft misses.
        return { kind: "navigate", path };
    }
};
