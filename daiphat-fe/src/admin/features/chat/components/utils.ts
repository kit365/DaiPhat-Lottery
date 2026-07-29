import { Conversation, ConversationStatusEnum, Message, CustomerChatTimelineResponse, SessionBoundaryResponse } from '../../../../types/chat.type';
import { flattenTimelineItems, formatSessionStartedLabel } from '../../../../utils/chatTimeline.util';
import { mapMessage } from '../services/chatService';

const isActiveStatus = (status: Conversation['status']): boolean =>
    status !== ConversationStatusEnum.CLOSED;

/** Số tin chưa đọc trên danh sách hỗ trợ — đã đóng không còn unread. */
export const getManagementUnreadCount = (conversation: Conversation): number => {
    if (conversation.status === ConversationStatusEnum.CLOSED) {
        return 0;
    }
    return conversation.unreadCount ?? 0;
};

const SESSION_DIVIDER_PATTERNS = [
    'phiên hỗ trợ mới bắt đầu',
    'phiên hỗ trợ đã kết thúc',
    'phiên hỗ trợ với',
    'đã kết thúc. lần sau bạn có thể',
];

const AI_NOTICE_PATTERNS = [
    'ai hiện chưa được kích hoạt',
    'ai tạm thời không khả dụng',
    'chưa có nhân viên trực tuyến',
    'hiện chưa có nhân viên',
    'đang kết nối bạn với nhân viên',
    'đang chuyển tiếp cho nhân viên',
    'đang chuyển cho nhân viên',
    'hệ thống đã ghi nhận tin nhắn',
    'đã tiếp nhận và sẽ hỗ trợ',
    'đang chờ nhân viên tiếp nhận',
];

export const isSessionDividerText = (text: string): boolean => {
    const normalized = text.toLowerCase();
    return SESSION_DIVIDER_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export const isAiSystemNoticeText = (text: string): boolean => {
    const normalized = text.toLowerCase();
    return AI_NOTICE_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export const isAdminDividerMessage = (message: Message): boolean => {
    const content = message.content?.trim() || '';
    if (message.type === 'SYSTEM') {
        return true;
    }
    if (isSessionDividerText(content)) {
        return true;
    }
    return message.senderType === 'AI_SYSTEM' && isAiSystemNoticeText(content);
};

export const getAssigneeDisplayLabel = (
    conversation: Conversation,
    currentUserId?: string | null
): string => {
    if (conversation.status === ConversationStatusEnum.CLOSED) {
        return 'Đã đóng';
    }
    if (!conversation.assignedOperatorId) {
        return 'Chưa phân công';
    }
    if (currentUserId && conversation.assignedOperatorId === currentUserId) {
        return 'Bản thân';
    }
    return conversation.assignedOperatorName || 'Nhân viên';
};

/** Copy phía staff — không dùng lời khách ("hỗ trợ bạn ngay"). */
export const getAdminSystemNoticeText = (
    content: string,
    options?: {
        currentUserId?: string | null;
        assignedOperatorId?: string | null;
        assignedOperatorName?: string | null;
    }
): string => {
    const text = content?.trim() || '';
    if (!text) {
        return text;
    }

    const normalized = text.toLowerCase();
    const isMe =
        !!options?.currentUserId &&
        !!options.assignedOperatorId &&
        options.assignedOperatorId === options.currentUserId;

    if (normalized.includes('đã tiếp nhận và sẽ hỗ trợ')) {
        if (isMe) {
            return 'Bạn đã tiếp nhận hội thoại này.';
        }
        const nameMatch = text.match(/^(.+?)\s+đã tiếp nhận/i);
        const name = nameMatch?.[1]?.trim() || options?.assignedOperatorName;
        if (name && name.toLowerCase() !== 'nhân viên') {
            return `${name} đã tiếp nhận hội thoại.`;
        }
        return 'Nhân viên đã tiếp nhận hội thoại.';
    }

    if (normalized.includes('lần sau bạn có thể được hỗ trợ')) {
        return text.replace(/\s*Lần sau bạn có thể được hỗ trợ bởi nhân viên khác\./i, '').trim();
    }

    if (
        normalized.includes('ai hiện chưa được kích hoạt') ||
        normalized.includes('hệ thống đã ghi nhận tin nhắn')
    ) {
        return 'Trợ lý AI chưa kích hoạt. Tin nhắn khách đã được ghi nhận.';
    }

    if (
        normalized.includes('chưa thể xử lý logic chi tiết') ||
        normalized.includes('đã ghi nhận yêu cầu của bạn')
    ) {
        return 'AI không xử lý được yêu cầu. Đang chuyển cho nhân viên.';
    }

    if (normalized.includes('ai tạm thời không khả dụng')) {
        return 'AI tạm thời không khả dụng. Đang chuyển cho nhân viên.';
    }

    if (
        normalized.includes('chưa có nhân viên trực tuyến') ||
        normalized.includes('hiện chưa có nhân viên')
    ) {
        return 'Chưa có nhân viên trực tuyến. Khách đang chờ phản hồi.';
    }

    if (
        normalized.includes('đang kết nối bạn với nhân viên') ||
        normalized.includes('yêu cầu của bạn đang chờ') ||
        normalized.includes('đang chờ nhân viên tiếp nhận') ||
        normalized.includes('đang chuyển tiếp cho nhân viên') ||
        normalized.includes('đang chuyển cho nhân viên')
    ) {
        return 'Hội thoại đang chờ nhân viên tiếp nhận.';
    }

    return text;
};

export const getConversationPreviewText = (
    conversation: Conversation,
    statusLabels: Record<string, string> = {},
    currentUserId?: string | null
): string => {
    if (conversation.handoffSummary) {
        const firstLine = conversation.handoffSummary.split('\n').find((line) => line.trim().length > 0);
        if (firstLine) {
            return firstLine.trim();
        }
    }
    const lastMsg = conversation.lastMessage;
    if (!lastMsg?.content) {
        return statusLabels[conversation.status] || 'Chưa có tin nhắn...';
    }
    if (isSessionDividerText(lastMsg.content) || isAiSystemNoticeText(lastMsg.content)) {
        return getAdminSystemNoticeText(lastMsg.content, {
            currentUserId,
            assignedOperatorId: conversation.assignedOperatorId,
            assignedOperatorName: conversation.assignedOperatorName,
        });
    }
    return lastMsg.content;
};

export type TimelineRow =
    | { kind: 'session_boundary'; key: string; boundary: SessionBoundaryResponse }
    | { kind: 'message'; key: string; message: Message; sessionCloseOperatorId?: string | null };

export const parseSessionCloseNotice = (
    content: string
): { operatorName: string } | null => {
    const match = content.trim().match(/^Phiên hỗ trợ với (.+?) đã kết thúc/i);
    if (!match?.[1]) {
        return null;
    }
    return { operatorName: match[1].trim() };
};

export const buildTimelineRows = (pages: CustomerChatTimelineResponse[]): TimelineRow[] => {
    const items = flattenTimelineItems(pages);
    const rows: TimelineRow[] = [];

    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const boundary = item.sessionBoundary;
        if (boundary?.sessionStartedAt && formatSessionStartedLabel(boundary.sessionStartedAt)) {
            rows.push({
                kind: 'session_boundary',
                key: `session-${boundary.conversationId}-${item.message.id}`,
                boundary,
            });
        }

        if (item.message.type === 'TEXT' || item.message.type === 'SYSTEM') {
            const nextBoundary = items[index + 1]?.sessionBoundary;
            const isSessionCloseDivider = Boolean(parseSessionCloseNotice(item.message.content ?? ''));

            rows.push({
                kind: 'message',
                key: `message-${item.message.id}`,
                message: mapMessage(item.message),
                sessionCloseOperatorId: isSessionCloseDivider
                    ? nextBoundary?.previousOperatorId ?? null
                    : undefined,
            });
        }
    }

    return rows;
};

export const formatSessionBoundaryDetail = (boundary: SessionBoundaryResponse): string =>
    formatSessionStartedLabel(boundary.sessionStartedAt) ?? '';

export const groupConversationsByCustomer = (conversations: Conversation[]): Conversation[] => {
    const byCustomer = new Map<string, Conversation[]>();

    for (const conversation of conversations) {
        const existing = byCustomer.get(conversation.customerId) ?? [];
        existing.push(conversation);
        byCustomer.set(conversation.customerId, existing);
    }

    return Array.from(byCustomer.values()).map((group) => {
        const sorted = [...group].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const primary = sorted.find((conversation) => isActiveStatus(conversation.status)) ?? sorted[0];

        return {
            ...primary,
            unreadCount: group.reduce(
                (total, conversation) => total + getManagementUnreadCount(conversation),
                0
            ),
        };
    });
};

export const getConversationDisplayTitle = (conv: Conversation | null | undefined): string => {
    if (!conv) return 'Khách hàng';

    const anyConv = conv as Conversation & {
        customerName?: string;
        customer?: { name?: string; fullName?: string };
    };
    const customerName =
        anyConv.customerName || anyConv.customer?.fullName || anyConv.customer?.name;
    if (customerName) return customerName;

    if (conv.title && conv.title !== 'Yêu cầu hỗ trợ từ khách hàng') {
        return conv.title;
    }

    if (conv.customerId) {
        return `Khách hàng #${conv.customerId.substring(0, 8)}`;
    }

    return 'Khách hàng ẩn danh';
};

export const getConversationAvatarLetter = (conv: Conversation | null | undefined): string => {
    const title = getConversationDisplayTitle(conv);
    if (title === 'Yêu cầu hỗ trợ từ khách hàng') return 'Y';
    return title.charAt(0).toUpperCase();
};

/** Human wait duration for SLA chip, e.g. "5 phút", "1 giờ 12 phút". */
export const formatWaitDuration = (escalatedAt?: string | null): string => {
    if (!escalatedAt) {
        return '';
    }
    const started = new Date(escalatedAt).getTime();
    if (Number.isNaN(started)) {
        return '';
    }
    const totalMinutes = Math.max(0, Math.floor((Date.now() - started) / 60_000));
    if (totalMinutes < 1) {
        return 'dưới 1 phút';
    }
    if (totalMinutes < 60) {
        return `${totalMinutes} phút`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
};
