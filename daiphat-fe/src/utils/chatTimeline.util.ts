import { InfiniteData } from '@tanstack/react-query';
import {
    ChatMessageResponse,
    CustomerChatTimelineItem,
    CustomerChatTimelineResponse,
} from '../types/chat.type';

/**
 * Concatenate timeline pages in chronological order (older pages prepended via fetchPreviousPage).
 */
export const flattenTimelineItems = (
    pages: CustomerChatTimelineResponse[]
): CustomerChatTimelineItem[] => pages.flatMap((page) => page.items);

const createTimelineChatMessage = (
    message: Partial<ChatMessageResponse> &
        Pick<ChatMessageResponse, 'id' | 'conversationId' | 'senderType' | 'content' | 'type' | 'createdAt'>
): ChatMessageResponse => {
    const rawMessage = message as ChatMessageResponse & { read?: boolean };
    const resolvedIsRead = rawMessage.isRead ?? rawMessage.read ?? false;

    return {
        parentId: null,
        senderId: message.senderId ?? null,
        intent: null,
        confidence: null,
        fileUrl: null,
        fileName: null,
        isEdited: false,
        editedAt: null,
        readerCount: 0,
        isDeleted: false,
        deletedAt: null,
        updatedAt: message.createdAt,
        ...message,
        isRead: resolvedIsRead,
    };
};

const createTimelinePage = (message: ChatMessageResponse): CustomerChatTimelineResponse => ({
    items: [{ message, sessionBoundary: null }],
    hasMore: false,
    nextCursor: null,
});

const isInboundUnreadMessage = (message: ChatMessageResponse): boolean =>
    message.senderType === 'OPERATOR' && !message.isRead;

/** Messenger-style label from conversation createdAt (Thứ / Hôm nay / ngày). */
export const formatSessionStartedLabel = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

    if (diffDays === 0) {
        return 'Hôm nay';
    }
    if (diffDays === 1) {
        return 'Hôm qua';
    }
    if (diffDays < 7) {
        const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });
        return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    return date.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

/** Count inbound messages the customer has not read yet. */
export const countUnreadInboundMessages = (
    pages: CustomerChatTimelineResponse[]
): number =>
    flattenTimelineItems(pages).filter((item) => isInboundUnreadMessage(item.message)).length;

/** Conversation ids that still have unread inbound messages in the timeline cache. */
export const getUnreadConversationIds = (pages: CustomerChatTimelineResponse[]): number[] => {
    const ids = new Set<number>();
    for (const item of flattenTimelineItems(pages)) {
        if (isInboundUnreadMessage(item.message)) {
            ids.add(item.message.conversationId);
        }
    }
    return Array.from(ids);
};

/** Optimistically mark inbound timeline messages as read for the closed-widget badge. */
export const markCustomerTimelineAsRead = (
    data: InfiniteData<CustomerChatTimelineResponse> | undefined
): InfiniteData<CustomerChatTimelineResponse> | undefined => {
    if (!data?.pages.length) {
        return data;
    }

    let changed = false;
    const pages = data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => {
            if (item.message.senderType !== 'OPERATOR' || item.message.isRead) {
                return item;
            }
            changed = true;
            return {
                ...item,
                message: {
                    ...item.message,
                    isRead: true,
                },
            };
        }),
    }));

    return changed ? { ...data, pages } : data;
};

/** Build a single-page timeline snapshot from conversation detail messages (ascending). */
export const buildTimelineInfiniteDataFromMessages = (
    messages: ChatMessageResponse[]
): InfiniteData<CustomerChatTimelineResponse> => {
    const sorted = [...messages].sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();
        if (leftTime !== rightTime) {
            return leftTime - rightTime;
        }
        return left.id - right.id;
    });

    return {
        pages: [
            {
                items: sorted.map((message) => ({
                    message: createTimelineChatMessage(message),
                    sessionBoundary: null,
                })),
                hasMore: false,
                nextCursor: null,
            },
        ],
        pageParams: [undefined],
    };
};

/** Append a message to the newest timeline page; skip when message id already exists. */
export const mergeCustomerTimelineMessage = (
    data: InfiniteData<CustomerChatTimelineResponse> | undefined,
    message: ChatMessageResponse
): InfiniteData<CustomerChatTimelineResponse> => {
    const normalizedMessage = createTimelineChatMessage(message);

    if (!data?.pages.length) {
        return {
            pages: [createTimelinePage(normalizedMessage)],
            pageParams: [undefined],
        };
    }

    const alreadyExists = data.pages.some((page) =>
        page.items.some((item) => item.message.id === normalizedMessage.id)
    );
    if (alreadyExists) {
        return data;
    }

    const pages = data.pages.map((page, index) => {
        if (index !== data.pages.length - 1) {
            return page;
        }

        return {
            ...page,
            items: [
                ...page.items,
                {
                    message: normalizedMessage,
                    sessionBoundary: null,
                },
            ],
        };
    });

    return {
        ...data,
        pages,
    };
};
