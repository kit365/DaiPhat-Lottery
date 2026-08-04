"use client";

import { ConversationTitle } from '../components/ConversationTitle';
import { ConversationAvatarLetter } from '../components/ConversationAvatarLetter';
import {
    getConversationDisplayTitle,
    getConversationAvatarLetter,
    isAdminDividerMessage,
    getAssigneeDisplayLabel,
    getAdminSystemNoticeText,
    buildTimelineRows,
    formatSessionBoundaryDetail,
    parseSessionCloseNotice,
    formatWaitDuration,
    TimelineRow,
} from '../utils';
import {
    Box,
    Stack,
    Typography,
    Avatar,
    InputBase,
    CircularProgress,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ThemeProvider,
    useTheme,
    useMediaQuery,
    createTheme,
    Collapse,
} from '@mui/material';
import { formatChatMessageContent } from '../../../../../client/utils/ticketSuggestToken.util';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { Icon } from '@iconify/react';
import { useCallback, useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppToast as toast } from '../../../../../utils/toast.util';
import {
    useConversations,
    useCustomerChatTimeline,
    ADMIN_CHAT_CONVERSATIONS_KEY,
    adminChatCustomerTimelineKey,
    adminChatDetailKey,
    useAssignConversation,
    useCloseConversation,
    mergeCustomerTimelineMessage,
} from '../../hooks/useChat';
import { useChatSocket } from '../../hooks/useChatSocket';
import { chatService } from '../../services/chatService';
import { Link } from '@/components/router-compat';
import { prefixAdmin } from '../../../../constants/routes';
import { Conversation, Message } from '../../../../../types/chat.type';
import { ChatSocketMessageEvent } from '../../../../../types/websocket.type';
import { ChatConversationSocketEvent, MessageSenderRole, ConversationStatusEnum, ConversationCloseReason, CLOSE_REASON_OPTIONS } from '../../../../../types/chat.type';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import dayjs from 'dayjs';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    [ConversationStatusEnum.OPEN]: { label: 'Mở', color: 'var(--palette-info-dark)', bg: 'var(--palette-info-lighter)' },
    [ConversationStatusEnum.ACTIVE]: { label: 'Đang xử lý', color: 'var(--palette-success-dark)', bg: 'var(--palette-success-lighter)' },
    [ConversationStatusEnum.WAITING_FOR_OPERATOR]: { label: 'Chờ nhân viên nhận', color: 'var(--palette-warning-dark)', bg: 'var(--palette-warning-lighter)' },
    [ConversationStatusEnum.WAITING_FOR_CUSTOMER]: { label: 'Chờ khách hàng', color: 'var(--palette-info-main)', bg: 'var(--palette-info-lighter)' },
    [ConversationStatusEnum.CLOSED]: { label: 'Đã đóng', color: 'var(--palette-grey-700)', bg: 'var(--palette-grey-200)' },
};

const mapSocketMessage = (payload: ChatSocketMessageEvent): Message => ({
    id: payload.id ?? Date.now(),
    senderId: payload.senderId,
    senderType: payload.senderType || MessageSenderRole.CUSTOMER,
    conversationId: payload.conversationId,
    content: payload.content?.trim() || '',
    type: 'TEXT',
    createdAt: payload.createdAt || new Date().toISOString(),
});

interface ChatWindowProps {
    conversationId: number | null;
    onToggleDetails?: () => void;
}

export const ChatWindow = ({ conversationId, onToggleDetails }: ChatWindowProps) => {
    const [message, setMessage] = useState('');
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closeReason, setCloseReason] = useState<ConversationCloseReason>('RESOLVED');
    const [showPreHandoff, setShowPreHandoff] = useState(false);
    const [preHandoffMessages, setPreHandoffMessages] = useState<Message[]>([]);
    const [loadingPreHandoff, setLoadingPreHandoff] = useState(false);

    const outerTheme = useTheme();
    const isMobile = useMediaQuery(outerTheme.breakpoints.down('sm'));
    const localTheme = useMemo(() => createTheme(outerTheme, {
        components: {
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: '16px',
                        padding: '16px',
                        width: '100%',
                        maxWidth: '480px',
                        margin: isMobile ? '16px' : '32px',
                        backgroundImage: 'none',
                        backgroundColor: outerTheme.palette.background.paper,
                        boxShadow: 'var(--customShadows-dialog)',
                    },
                },
            },
        },
    }), [outerTheme, isMobile]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const pendingScrollRestore = useRef(0);
    const shouldStickToBottom = useRef(true);
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const userId = user?.id;
    const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || '');
    const isAdmin = roleCode === 'ROLE_ADMIN' || roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN';
    const assignMutation = useAssignConversation();
    const closeMutation = useCloseConversation();

    const { data: conversations } = useConversations();
    const activeConversation = conversations?.find((c: Conversation) => c.id === conversationId);
    const customerId =
        activeConversation?.customerId ??
        conversations?.find((c: Conversation) => c.id === conversationId)?.customerId;

    const customerConversationIds = useMemo(() => {
        if (!customerId) {
            return [];
        }

        return Array.from(
            new Set(
                (conversations ?? [])
                    .filter(
                        (conversation) =>
                            conversation.customerId === customerId &&
                            conversation.status !== ConversationStatusEnum.CLOSED
                    )
                    .map((conversation) => conversation.id)
            )
        );
    }, [conversations, customerId]);

    const timelineQuery = useCustomerChatTimeline(customerId);
    const timelineRows = useMemo(
        () => buildTimelineRows(timelineQuery.data?.pages ?? []),
        [timelineQuery.data?.pages]
    );
    const isLoading = timelineQuery.isLoading;
    const canClaim =
        !!activeConversation &&
        activeConversation.status === 'WAITING_FOR_OPERATOR' &&
        !activeConversation.assignedOperatorId;
    const canReply =
        !!activeConversation &&
        activeConversation.status !== 'CLOSED' &&
        activeConversation.assignedOperatorId === userId;
    const canClose =
        !!activeConversation &&
        activeConversation.status !== 'CLOSED' &&
        (isAdmin || activeConversation.assignedOperatorId === userId);

    const canExpandPreHandoff =
        !!activeConversation &&
        !!activeConversation.handoffSummary &&
        (isAdmin || activeConversation.assignedOperatorId === userId);

    useEffect(() => {
        setShowPreHandoff(false);
        setPreHandoffMessages([]);
    }, [conversationId]);

    const handleTogglePreHandoff = async () => {
        if (!conversationId || !canExpandPreHandoff) {
            return;
        }
        if (showPreHandoff) {
            setShowPreHandoff(false);
            return;
        }
        if (preHandoffMessages.length > 0) {
            setShowPreHandoff(true);
            return;
        }
        setLoadingPreHandoff(true);
        try {
            const messages = await chatService.getPreHandoffMessages(Number(conversationId));
            setPreHandoffMessages(messages);
            setShowPreHandoff(true);
        } catch (error: unknown) {
            const err = error as { message?: string };
            toast.error(err?.message || 'Không thể tải lịch sử chat AI.');
        } finally {
            setLoadingPreHandoff(false);
        }
    };

    const resolveCustomerId = useCallback(
        (targetConversationId?: number | null) => {
            const cachedConversations =
                queryClient.getQueryData<Conversation[]>(ADMIN_CHAT_CONVERSATIONS_KEY) ?? conversations ?? [];

            return (
                cachedConversations.find((conversation) => conversation.id === conversationId)?.customerId ??
                cachedConversations.find((conversation) => conversation.id === targetConversationId)?.customerId ??
                customerId
            );
        },
        [conversationId, conversations, customerId, queryClient]
    );

    const handleIncomingMessage = useCallback(
        (payload: ChatSocketMessageEvent) => {
            if (!conversationId) {
                return;
            }

            const resolvedCustomerId = resolveCustomerId(payload.conversationId);
            if (!resolvedCustomerId) {
                return;
            }

            const incomingConversation =
                conversations?.find((conversation) => conversation.id === payload.conversationId) ??
                conversations?.find((conversation) => conversation.id === conversationId);
            if (!incomingConversation?.assignedOperatorId) {
                return;
            }

            const incoming = mapSocketMessage(payload);

            queryClient.setQueryData(
                adminChatCustomerTimelineKey(resolvedCustomerId),
                (prev) =>
                    mergeCustomerTimelineMessage(prev as any, {
                        id: incoming.id,
                        conversationId: incoming.conversationId,
                        senderId: incoming.senderId,
                        senderType: incoming.senderType,
                        content: incoming.content,
                        type: incoming.type,
                        createdAt: incoming.createdAt,
                        isRead: incoming.isRead ?? false,
                    } as any)
            );

            queryClient.setQueryData<Conversation[]>(
                ADMIN_CHAT_CONVERSATIONS_KEY,
                (prev = []) =>
                    prev.map((conversation) => {
                        if (
                            conversation.id !== incoming.conversationId &&
                            conversation.customerId !== resolvedCustomerId
                        ) {
                            return conversation;
                        }

                        return {
                            ...conversation,
                            updatedAt: incoming.createdAt,
                            lastMessage: {
                                id: incoming.id,
                                senderId: incoming.senderId ?? '',
                                senderType: incoming.senderType,
                                conversationId: incoming.conversationId,
                                content: incoming.content,
                                type: incoming.type,
                                createdAt: incoming.createdAt,
                            },
                            unreadCount:
                                incoming.senderType === MessageSenderRole.CUSTOMER
                                    ? (conversation.unreadCount ?? 0) + 1
                                    : conversation.unreadCount,
                        };
                    })
            );
            shouldStickToBottom.current = true;
        },
        [conversationId, conversations, queryClient, resolveCustomerId]
    );

    const handleConversationEvent = useCallback(
        (event: ChatConversationSocketEvent) => {
            const isSameCustomerThread =
                resolveCustomerId(event.conversationId) === customerId &&
                customerId != null;

            if (!conversationId) {
                return;
            }

            if (event.conversationId !== Number(conversationId) && !isSameCustomerThread) {
                return;
            }

            if (event.eventType === 'MESSAGE_READ') {
                queryClient.setQueryData<Conversation[]>(
                    ADMIN_CHAT_CONVERSATIONS_KEY,
                    (prev = []) =>
                        prev.map((conversation) =>
                            conversation.id === event.conversationId
                                ? {
                                      ...conversation,
                                      customerLastReadAt:
                                          event.customerLastReadAt ?? conversation.customerLastReadAt,
                                  }
                                : conversation
                        )
                );
                return;
            }

            if (event.eventType === 'CONVERSATION_CLOSED') {
                queryClient.setQueryData<Conversation[]>(
                    ADMIN_CHAT_CONVERSATIONS_KEY,
                    (prev = []) =>
                        prev.map((conversation) =>
                            conversation.id === event.conversationId
                                ? { ...conversation, status: event.status }
                                : conversation
                        )
                );
                queryClient.setQueryData(adminChatDetailKey(conversationId), (prev: unknown) => {
                    if (!prev || typeof prev !== 'object' || !('conversation' in prev)) {
                        return prev;
                    }
                    const detail = prev as { conversation: Conversation };
                    return {
                        ...detail,
                        conversation: { ...detail.conversation, status: event.status },
                    };
                });
                if (customerId) {
                    queryClient.invalidateQueries({ queryKey: adminChatCustomerTimelineKey(customerId) });
                }
                return;
            }

            if (
                event.eventType === 'CONVERSATION_ASSIGNED' ||
                event.eventType === 'CONVERSATION_TAKEN'
            ) {
                queryClient.setQueryData<Conversation[]>(
                    ADMIN_CHAT_CONVERSATIONS_KEY,
                    (prev = []) =>
                        prev.map((conversation) =>
                            conversation.id === event.conversationId
                                ? {
                                      ...conversation,
                                      status: event.status,
                                      assignedOperatorId:
                                          event.assignedOperatorId ?? conversation.assignedOperatorId,
                                  }
                                : conversation
                        )
                );
                queryClient.setQueryData(adminChatDetailKey(conversationId), (prev: unknown) => {
                    if (!prev || typeof prev !== 'object' || !('conversation' in prev)) {
                        return prev;
                    }
                    const detail = prev as { conversation: Conversation };
                    return {
                        ...detail,
                        conversation: {
                            ...detail.conversation,
                            status: event.status,
                            assignedOperatorId:
                                event.assignedOperatorId ?? detail.conversation.assignedOperatorId,
                        },
                    };
                });
                if (customerId) {
                    queryClient.invalidateQueries({
                        queryKey: adminChatCustomerTimelineKey(customerId),
                    });
                }
                return;
            }

            queryClient.invalidateQueries({ queryKey: ADMIN_CHAT_CONVERSATIONS_KEY });
            queryClient.invalidateQueries({ queryKey: adminChatDetailKey(conversationId) });
        },
        [conversationId, customerId, queryClient, resolveCustomerId]
    );

    const { sendMessage: sendRealtimeMessage, isConnected } = useChatSocket({
        conversationId,
        additionalConversationIds: customerConversationIds,
        onMessage: handleIncomingMessage,
        onConversationEvent: handleConversationEvent,
        enabled: !!conversationId && !!customerId,
    });

    const scrollToBottom = useCallback(() => {
        const container = scrollRef.current;
        if (!container) {
            return;
        }
        container.scrollTop = container.scrollHeight;
    }, []);

    useEffect(() => {
        shouldStickToBottom.current = true;
    }, [conversationId, customerId]);

    useLayoutEffect(() => {
        if (!shouldStickToBottom.current) {
            return;
        }
        scrollToBottom();
    }, [timelineRows.length, conversationId, scrollToBottom]);

    useEffect(() => {
        const sentinel = topSentinelRef.current;
        const container = scrollRef.current;
        if (!sentinel || !container) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0]?.isIntersecting &&
                    timelineQuery.hasPreviousPage &&
                    !timelineQuery.isFetchingPreviousPage
                ) {
                    pendingScrollRestore.current = container.scrollHeight;
                    shouldStickToBottom.current = false;
                    void timelineQuery.fetchPreviousPage();
                }
            },
            { root: container, threshold: 0, rootMargin: '120px 0px 0px 0px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [
        timelineQuery.hasPreviousPage,
        timelineQuery.isFetchingPreviousPage,
        timelineQuery.fetchPreviousPage,
        timelineRows.length,
        customerId,
    ]);

    const handleLoadOlderMessages = () => {
        if (!timelineQuery.hasPreviousPage || timelineQuery.isFetchingPreviousPage || !scrollRef.current) {
            return;
        }
        pendingScrollRestore.current = scrollRef.current.scrollHeight;
        shouldStickToBottom.current = false;
        void timelineQuery.fetchPreviousPage();
    };

    useLayoutEffect(() => {
        const container = scrollRef.current;
        if (!container || timelineQuery.isFetchingPreviousPage || pendingScrollRestore.current <= 0) {
            return;
        }
        const diff = container.scrollHeight - pendingScrollRestore.current;
        container.scrollTop += diff;
        pendingScrollRestore.current = 0;
    }, [timelineQuery.isFetchingPreviousPage, timelineQuery.data?.pages.length]);

    const handleAssignToMe = () => {
        if (!conversationId || !canClaim) {
            return;
        }
        assignMutation.mutate(Number(conversationId));
    };

    const handleCloseConversation = () => {
        if (!conversationId || !canClose) {
            return;
        }
        setCloseDialogOpen(true);
    };

    const confirmCloseConversation = () => {
        if (!conversationId || !canClose) {
            return;
        }
        closeMutation.mutate(
            { conversationId: Number(conversationId), reason: closeReason },
            { onSuccess: () => setCloseDialogOpen(false) }
        );
    };

    const handleSend = async () => {
        const normalizedText = message.trim();
        if (!normalizedText || !conversationId) {
            return;
        }

        if (!canReply) {
            toast.info('Bạn cần được phân công hội thoại này trước khi trả lời.');
            return;
        }

        const resolvedCustomerId =
            customerId ??
            conversations?.find((conversation) => conversation.id === conversationId)?.customerId;

        setMessage('');
        shouldStickToBottom.current = true;

        try {
            await sendRealtimeMessage({
                content: normalizedText,
                type: 'TEXT',
            });
        } catch {
            const resolvedCustomerId =
                customerId ??
                conversations?.find((conversation) => conversation.id === conversationId)?.customerId;
            if (resolvedCustomerId) {
                queryClient.invalidateQueries({ queryKey: adminChatCustomerTimelineKey(resolvedCustomerId) });
            }
            toast.error('Không thể gửi tin nhắn realtime lúc này.');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter' || e.shiftKey) {
            return;
        }
        if (e.nativeEvent.isComposing || e.keyCode === 229) {
            return;
        }
        e.preventDefault();
        void handleSend();
    };

    if (!conversationId) {
        return (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                    textAlign: 'center',
                }}
            >
                <Box
                    sx={{
                        width: 140,
                        height: 140,
                        borderRadius: '50%',
                        bgcolor: 'var(--palette-primary-lighter)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                    }}
                >
                    <Icon icon="solar:chat-round-dots-bold-duotone" width={80} color="var(--palette-primary-main)" />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, fontFamily: 'Barlow, sans-serif' }}>
                    Đại Phát Support
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 320 }}>
                    Chọn một hội thoại để bắt đầu tư vấn.
                </Typography>
            </Box>
        );
    }

    return (
        <>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                    px: 3,
                    py: 1.5,
                    borderBottom: '1px solid var(--palette-divider)',
                    minHeight: 70,
                    flexShrink: 0,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                        sx={{ width: 44, height: 44, fontWeight: 700, cursor: 'pointer' }}
                        onClick={onToggleDetails}
                    >
                        <ConversationAvatarLetter conversation={activeConversation} />
                    </Avatar>

                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <ConversationTitle conversation={activeConversation}  variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} />
                            {activeConversation?.status && (() => {
                                const statusInfo = STATUS_LABELS[activeConversation.status] || { label: activeConversation.status, color: 'var(--palette-primary-main)', bg: 'var(--palette-action-selected)' };
                                return (
                                    <Chip
                                        label={statusInfo.label}
                                        size="small"
                                        sx={{
                                            bgcolor: statusInfo.bg,
                                            color: statusInfo.color,
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            height: 22,
                                        }}
                                    />
                                );
                            })()}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Mã KH: {activeConversation?.customerId}
                            {activeConversation && (
                                <> · {getAssigneeDisplayLabel(activeConversation, userId)}</>
                            )}
                            {activeConversation?.status === ConversationStatusEnum.WAITING_FOR_OPERATOR
                                && activeConversation.escalatedAt && (
                                <> · Đã chờ {formatWaitDuration(activeConversation.escalatedAt)}</>
                            )}
                        </Typography>
                        {!isConnected && (
                            <Typography variant="caption" sx={{ color: 'var(--palette-warning-main)' }}>
                                Đang kết nối realtime...
                            </Typography>
                        )}
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                    {canClose && (
                        <Button
                            variant="outlined"
                            onClick={handleCloseConversation}
                            disabled={closeMutation.isPending}
                            sx={{
                                color: 'var(--palette-grey-600)',
                                borderColor: 'var(--palette-grey-300)',
                                fontWeight: 600,
                                '&:hover': { borderColor: 'var(--palette-grey-500)', bgcolor: 'var(--palette-grey-100)' },
                            }}
                        >
                            {closeMutation.isPending ? 'Đang đóng...' : 'Đóng hội thoại'}
                        </Button>
                    )}
                    {canClaim && (
                        <Button
                            variant="contained"
                            onClick={handleAssignToMe}
                            disabled={assignMutation.isPending}
                            sx={{
                                bgcolor: 'var(--palette-primary-main)',
                                color: 'white',
                                fontWeight: 600,
                                boxShadow: 'none',
                                '&:hover': { bgcolor: 'var(--palette-primary-dark)', boxShadow: 'none' },
                            }}
                        >
                            {assignMutation.isPending ? 'Đang nhận...' : 'Nhận hội thoại'}
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Box
                ref={scrollRef}
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 3,
                }}
            >
                <Box
                    sx={{
                        minHeight: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        gap: 2,
                    }}
                >
                    <Box ref={topSentinelRef} sx={{ height: 1, flexShrink: 0 }} />
                    {activeConversation?.handoffSummary && (
                        <Box
                            sx={{
                                flexShrink: 0,
                                mb: 1,
                                p: 2,
                                borderRadius: 2,
                                bgcolor: 'var(--palette-warning-lighter)',
                                border: '1px solid var(--palette-warning-light)',
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-warning-dark)' }}>
                                    Tóm tắt trước khi gặp nhân viên
                                </Typography>
                                {canExpandPreHandoff && (
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => void handleTogglePreHandoff()}
                                        disabled={loadingPreHandoff}
                                        sx={{ textTransform: 'none', fontWeight: 600 }}
                                    >
                                        {loadingPreHandoff
                                            ? 'Đang tải...'
                                            : showPreHandoff
                                              ? 'Ẩn lịch sử AI'
                                              : 'Xem toàn bộ lịch sử AI'}
                                    </Button>
                                )}
                            </Stack>
                            <Typography
                                variant="body2"
                                sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', lineHeight: 1.6 }}
                            >
                                {activeConversation.handoffSummary}
                            </Typography>
                            {!canExpandPreHandoff && canClaim && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Nhận hội thoại để xem chi tiết lịch sử chat với AI (nếu cần).
                                </Typography>
                            )}
                            <Collapse in={showPreHandoff}>
                                <Stack spacing={1.25} sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed var(--palette-divider)' }}>
                                    {preHandoffMessages.length === 0 ? (
                                        <Typography variant="caption" color="text.secondary">
                                            Không có tin nhắn AI trước khi tiếp nhận.
                                        </Typography>
                                    ) : (
                                        preHandoffMessages.map((msg) => (
                                            <Box key={`pre-${msg.id}`}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                    {msg.senderType === MessageSenderRole.CUSTOMER
                                                        ? 'Khách'
                                                        : msg.senderType === MessageSenderRole.AI_SYSTEM
                                                          ? 'AI'
                                                          : 'Hệ thống'}
                                                    {' · '}
                                                    {dayjs(msg.createdAt).format('HH:mm')}
                                                </Typography>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                    {msg.content}
                                                </Typography>
                                            </Box>
                                        ))
                                    )}
                                </Stack>
                            </Collapse>
                        </Box>
                    )}
                    {(timelineQuery.isFetchingPreviousPage || timelineQuery.hasPreviousPage) && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1, flexShrink: 0 }}>
                            {timelineQuery.isFetchingPreviousPage ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <CircularProgress size={18} />
                                    <Typography variant="caption" color="text.secondary">
                                        Đang tải tin nhắn cũ hơn...
                                    </Typography>
                                </Stack>
                            ) : (
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={handleLoadOlderMessages}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                >
                                    Tải tin nhắn cũ hơn
                                </Button>
                            )}
                        </Box>
                    )}
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                            <CircularProgress />
                        </Box>
                    ) : !timelineRows.length ? (
                        <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
                            <Typography variant="body2">
                                {activeConversation?.handoffSummary
                                    ? 'Chưa có tin nhắn sau khi tiếp nhận. Đọc tóm tắt phía trên trước khi trả lời.'
                                    : 'Chưa có tin nhắn.'}
                            </Typography>
                        </Box>
                    ) : (
                        timelineRows.map((row: TimelineRow, index: number) => {
                        if (row.kind === 'session_boundary') {
                            const label = formatSessionBoundaryDetail(row.boundary);
                            if (!label) {
                                return null;
                            }
                            return (
                                <Box key={row.key} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 999,
                                            bgcolor: 'grey.100',
                                            color: 'text.secondary',
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {label}
                                    </Typography>
                                </Box>
                            );
                        }

                        const msg = row.message;
                        if (isAdminDividerMessage(msg)) {
                            const closeNotice = parseSessionCloseNotice(msg.content || '');
                            const operatorId = row.sessionCloseOperatorId;

                            if (closeNotice && operatorId) {
                                return (
                                    <Typography
                                        key={row.key}
                                        variant="body2"
                                        sx={{
                                            textAlign: 'center',
                                            color: 'text.secondary',
                                            fontSize: '0.8125rem',
                                            lineHeight: 1.6,
                                            px: 2,
                                            py: 0.5,
                                        }}
                                    >
                                        Phiên hỗ trợ với{' '}
                                        <Box
                                            component={Link}
                                            to={`/${prefixAdmin}/account-admin/detail/${operatorId}`}
                                            sx={{
                                                color: 'primary.main',
                                                fontWeight: 600,
                                                textDecoration: 'none',
                                                '&:hover': { textDecoration: 'underline' },
                                            }}
                                        >
                                            {closeNotice.operatorName}
                                        </Box>{' '}
                                        đã kết thúc.
                                    </Typography>
                                );
                            }

                            return (
                                <Typography
                                    key={row.key}
                                    variant="body2"
                                    sx={{
                                        textAlign: 'center',
                                        color: 'text.secondary',
                                        fontSize: '0.8125rem',
                                        lineHeight: 1.6,
                                        px: 2,
                                        py: 0.5,
                                    }}
                                >
                                    {getAdminSystemNoticeText(msg.content || '', {
                                        currentUserId: userId,
                                        assignedOperatorId: activeConversation?.assignedOperatorId,
                                        assignedOperatorName: activeConversation?.assignedOperatorName,
                                    })}
                                </Typography>
                            );
                        }

                        const isMe = msg.senderType === MessageSenderRole.OPERATOR;
                        const isBot = msg.senderType === MessageSenderRole.AI_SYSTEM;
                        const isLast = index === timelineRows.length - 1;

                        const isReadByCustomer =
                            msg.isRead ||
                            (activeConversation?.customerLastReadAt &&
                                new Date(msg.createdAt) <= new Date(activeConversation.customerLastReadAt));
                        const showSeen = isMe && isLast && isReadByCustomer;

                        return (
                            <Stack
                                key={row.key}
                                direction="row"
                                justifyContent={isMe ? 'flex-end' : 'flex-start'}
                                alignItems="flex-end"
                                spacing={1}
                            >
                                {!isMe && !isBot && (
                                    <Avatar sx={{ width: 28, height: 28, mb: 0.5, fontSize: '0.8rem' }}>
                                        <ConversationAvatarLetter conversation={activeConversation} />
                                    </Avatar>
                                )}
                                {isBot && (
                                    <Avatar sx={{ width: 28, height: 28, mb: 0.5, bgcolor: 'var(--palette-info-lighter)', color: 'var(--palette-info-dark)' }}>
                                        <Icon icon="solar:smart-speaker-bold-duotone" width={18} />
                                    </Avatar>
                                )}
                                <Box
                                    sx={{
                                        maxWidth: '85%',
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isMe ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.25,
                                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                            bgcolor: isMe ? 'var(--palette-primary-main)' : isBot ? 'var(--palette-info-lighter)' : 'var(--palette-background-paper)',
                                            color: isMe ? 'white' : 'text.primary',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                            border: isMe ? 'none' : isBot ? '1px solid var(--palette-info-light)' : '1px solid var(--palette-divider)',
                                            width: 'fit-content',
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                            {isBot ? formatChatMessageContent(msg.content ?? '') : msg.content}
                                        </Typography>
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            opacity: 0.6,
                                            display: 'block',
                                            mt: 0.5,
                                            px: 1,
                                            textAlign: isMe ? 'right' : 'left',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        {dayjs(msg.createdAt).format('HH:mm')}
                                        {showSeen && (
                                            <span style={{ marginLeft: 4, fontWeight: 600, color: 'var(--palette-success-main)' }}>
                                                ✓ Đã xem
                                            </span>
                                        )}
                                    </Typography>
                                </Box>
                            </Stack>
                        );
                    })
                    )}
                </Box>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'var(--palette-background-paper)', borderTop: '1px solid var(--palette-divider)', flexShrink: 0 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'var(--palette-background-neutral)',
                        border: '1px solid var(--palette-grey-300)',
                        borderRadius: '50px',
                        p: 0.5,
                        pl: 2,
                        transition: 'all 0.2s',
                        '&:focus-within': {
                            borderColor: 'var(--palette-error-light)',
                            boxShadow: '0 0 0 1px var(--palette-error-lighter)',
                        },
                    }}
                >
                    <InputBase
                        fullWidth
                        placeholder={
                            activeConversation?.status === 'CLOSED'
                                ? 'Hội thoại đã đóng'
                                : canReply
                                ? 'Nhập câu trả lời...'
                                : 'Chưa được phân công hội thoại này'
                        }
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!canReply}
                        sx={{ fontSize: '0.9375rem', mr: 1 }}
                    />

                    <Button
                        variant="contained"
                        onClick={() => void handleSend()}
                        disabled={!message.trim() || !canReply}
                        sx={{
                            minWidth: 'auto',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            p: 0,
                            bgcolor: 'var(--palette-primary-main)',
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            '&:hover': { bgcolor: 'var(--palette-primary-dark)' },
                            '&.Mui-disabled': { bgcolor: 'var(--palette-grey-300)', color: 'var(--palette-grey-500)', boxShadow: 'none' },
                        }}
                    >
                        <Icon icon="solar:plain-bold" width={18} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
                    </Button>
                </Box>
            </Box>
        </Box>

        <ThemeProvider theme={localTheme}>
            <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: '1.25rem' }}>Đóng hội thoại</DialogTitle>
                <DialogContent sx={{ py: '20px !important' }}>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel id="close-reason-label">Lý do đóng</InputLabel>
                        <Select
                            labelId="close-reason-label"
                            label="Lý do đóng"
                            value={closeReason}
                            onChange={(event) => setCloseReason(event.target.value as ConversationCloseReason)}
                        >
                            {CLOSE_REASON_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ pt: 2, px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setCloseDialogOpen(false)}
                        variant="outlined"
                        color="inherit"
                        disabled={closeMutation.isPending}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            px: 3,
                            py: 1,
                        }}
                    >
                        Hủy
                    </Button>
                    <LoadingButton
                        onClick={() => void confirmCloseConversation()}
                        loading={closeMutation.isPending}
                        label="Xác nhận đóng"
                        loadingLabel="Đang đóng..."
                        variant="contained"
                    />
                </DialogActions>
            </Dialog>
        </ThemeProvider>
        </>
    );
};
