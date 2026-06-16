import { NotificationResponse, NOTIFICATION_REFERENCE_TYPE } from "../../types/notifications.type";

type RouteResolver = (referenceId?: string | null) => string | null;

const NOTIFICATION_ROUTES: Record<string, RouteResolver> = {
    [NOTIFICATION_REFERENCE_TYPE.BLOG_POST]: (referenceId) =>
        referenceId ? `/blogs/detail/${referenceId}` : null,
    [NOTIFICATION_REFERENCE_TYPE.ORDER]: (referenceId) =>
        referenceId ? `/profile/orders/${referenceId}` : null,
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
