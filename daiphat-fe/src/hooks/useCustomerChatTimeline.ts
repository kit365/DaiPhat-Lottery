import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { chatConversationService } from '../client/services/chatConversationService';
import { chatService } from '../admin/features/chat/services/chatService';
import { CustomerChatTimelineResponse } from '../types/chat.type';

export type ChatTimelineScope = 'client' | 'admin';
export type TimelineCursor = { beforeCreatedAt: string; beforeId: number } | undefined;

const DEFAULT_TIMELINE_LIMIT = 30;

export const getCustomerChatTimelineKey = (scope: ChatTimelineScope, customerId: string) =>
    ['chat', 'customer-timeline', scope, customerId] as const;

/** Stable React Query key for authenticated client timeline (API uses JWT, not customerId). */
export const CLIENT_TIMELINE_USER_KEY = 'me';

/** @deprecated Use getCustomerChatTimelineKey('admin', customerId) */
export const adminChatCustomerTimelineKey = (customerId: string) =>
    getCustomerChatTimelineKey('admin', customerId);

/** @deprecated Use getCustomerChatTimelineKey('client', CLIENT_TIMELINE_USER_KEY) */
export const getClientChatTimelineKey = () =>
    getCustomerChatTimelineKey('client', CLIENT_TIMELINE_USER_KEY);

export const parseTimelineCursor = (cursor: string): { beforeCreatedAt: string; beforeId: number } => {
    const separatorIndex = cursor.lastIndexOf('|');
    return {
        beforeCreatedAt: cursor.slice(0, separatorIndex),
        beforeId: Number(cursor.slice(separatorIndex + 1)),
    };
};

const fetchTimelinePage = (
    scope: ChatTimelineScope,
    customerId: string,
    pageParam: TimelineCursor
): Promise<CustomerChatTimelineResponse> => {
    const params = {
        limit: DEFAULT_TIMELINE_LIMIT,
        beforeCreatedAt: pageParam?.beforeCreatedAt,
        beforeId: pageParam?.beforeId,
    };

    if (scope === 'client') {
        return chatConversationService.getMyTimeline(params);
    }

    return chatService.getCustomerTimeline(customerId, params);
};

export const useCustomerChatTimeline = (
    scope: ChatTimelineScope,
    customerId: string | null | undefined,
    options?: { enabled?: boolean }
) => {
    const enabled =
        options?.enabled ??
        (scope === 'client' ? true : Boolean(customerId));

    return useInfiniteQuery({
        queryKey: getCustomerChatTimelineKey(scope, customerId ?? ''),
        queryFn: ({ pageParam }) => fetchTimelinePage(scope, customerId ?? '', pageParam),
        initialPageParam: undefined as TimelineCursor,
        enabled,
        staleTime: scope === 'client' ? 30_000 : undefined,
        retry: scope === 'client' ? 1 : undefined,
        placeholderData: scope === 'client' ? keepPreviousData : undefined,
        getNextPageParam: () => undefined,
        getPreviousPageParam: (firstPage: CustomerChatTimelineResponse) =>
            firstPage.hasMore && firstPage.nextCursor
                ? parseTimelineCursor(firstPage.nextCursor)
                : undefined,
    });
};

export const useMyChatTimeline = (token?: string | null) =>
    useCustomerChatTimeline('client', CLIENT_TIMELINE_USER_KEY, { enabled: Boolean(token) });
