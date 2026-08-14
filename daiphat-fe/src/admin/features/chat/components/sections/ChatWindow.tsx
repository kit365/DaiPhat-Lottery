"use client";

import Link from "@/admin/components/navigation/AdminLink";
import { ConversationTitle } from '../components/ConversationTitle';
import { ConversationAvatarLetter } from '../components/ConversationAvatarLetter';
import {
    isAdminDividerMessage,
    getAssigneeDisplayLabel,
    getAdminSystemNoticeText,
    getConversationDisplayTitle,
    buildTimelineRows,
    formatSessionBoundaryDetail,
    parseSessionCloseNotice,
    TimelineRow} from '../utils';
import {
    Box,
    Stack,
    Typography,
    Avatar,
    TextField,
    Autocomplete,
    InputBase,
    CircularProgress,
    IconButton,
    Tooltip,
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
import { Button } from '../../../../components/ui/Button';
import { ChatDetails } from './ChatDetails';
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
import { prefixAdmin } from '../../../../constants/routes';
import { Conversation, Message } from '../../../../../types/chat.type';
import { ChatSocketMessageEvent } from '../../../../../types/websocket.type';
import { ChatConversationSocketEvent, MessageSenderRole, ConversationStatusEnum, ConversationCloseReason, CLOSE_REASON_OPTIONS } from '../../../../../types/chat.type';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import dayjs from 'dayjs';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';

const formatBubbleTime = (iso?: string) => {
    if (!iso) return '';
    const t = dayjs(iso);
    if (!t.isValid()) return '';
    const mins = dayjs().diff(t, 'minute');
    if (mins < 1) return 'vừa xong';
    if (mins < 60) return `${mins} phút`;
    const hours = dayjs().diff(t, 'hour');
    if (hours < 24) return `${hours} giờ`;
    return t.format('HH:mm · DD/MM');
};

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
    recipients?: Conversation[];
    onSelectRecipient?: (id: number) => void;
    onToggleDetails?: () => void;
    showDetails?: boolean;
}

export const ChatWindow = ({
    conversationId,
    recipients = [],
    onSelectRecipient,
    onToggleDetails,
    showDetails,
}: ChatWindowProps) => {
    const [message, setMessage] = useState('');
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closeReason, setCloseReason] = useState<ConversationCloseReason>('RESOLVED');
    const [showPreHandoff, setShowPreHandoff] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
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
        setSummaryOpen(false);
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
        const hour = new Date().getHours();
        const greeting =
            hour < 12 ? 'Chào buổi sáng!' : hour < 18 ? 'Chào buổi chiều!' : 'Chào buổi tối!';

        return (
            <Box
                sx={{
                    height: '100%',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'var(--palette-background-paper)',
                    overflow: 'hidden',
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                        px: 2.5,
                        minHeight: 72,
                        flexShrink: 0,
                        borderBottom: '1px solid rgba(145, 158, 171, 0.16)',
                    }}
                >
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--palette-text-primary)', flexShrink: 0 }}>
                        Đến:
                    </Typography>
                    <Autocomplete
                        options={recipients}
                        getOptionLabel={(option) => getConversationDisplayTitle(option)}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        filterOptions={(options, state) => {
                            const q = state.inputValue.trim().toLowerCase();
                            if (!q) return options;
                            return options.filter((conv) => {
                                const title = getConversationDisplayTitle(conv).toLowerCase();
                                const preview = (conv.lastMessage?.content || '').toLowerCase();
                                return title.includes(q) || preview.includes(q);
                            });
                        }}
                        onChange={(_, value) => {
                            if (value) onSelectRecipient?.(value.id);
                        }}
                        noOptionsText="Không có hội thoại"
                        popupIcon={null}
                        sx={{ width: 280, maxWidth: '100%' }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="+ Người nhận"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '0.9375rem',
                                        borderRadius: '8px',
                                        bgcolor: '#fff',
                                        '& fieldset': { borderColor: 'rgba(145, 158, 171, 0.32)' },
                                        '&:hover fieldset': { borderColor: 'rgba(145, 158, 171, 0.48)' },
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#1C252E',
                                            borderWidth: '1px',
                                        },
                                    },
                                }}
                            />
                        )}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 0.75,
                                    width: 280,
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    backgroundImage: 'none',
                                    bgcolor: '#fff',
                                    boxShadow:
                                        '0px 5px 5px -3px rgba(145, 158, 171, 0.2), 0px 8px 10px 1px rgba(145, 158, 171, 0.14), 0px 3px 14px 2px rgba(145, 158, 171, 0.12)',
                                },
                            },
                            listbox: {
                                sx: { py: 0.5, maxHeight: 320 },
                            },
                        }}
                        renderOption={(props, option) => {
                            const { key, ...rest } = props;
                            return (
                                <Box
                                    component="li"
                                    key={key}
                                    {...rest}
                                    sx={{
                                        display: 'flex !important',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        px: '12px !important',
                                        py: '8px !important',
                                        '&.Mui-focused, &[aria-selected="true"]': {
                                            bgcolor: 'var(--palette-action-selected) !important',
                                        },
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            fontSize: '0.8125rem',
                                            fontWeight: 700,
                                            bgcolor: 'var(--palette-grey-200)',
                                            color: 'var(--palette-text-secondary)',
                                        }}
                                    >
                                        <ConversationAvatarLetter conversation={option} />
                                    </Avatar>
                                    <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                        {getConversationDisplayTitle(option)}
                                    </Typography>
                                </Box>
                            );
                        }}
                    />
                </Stack>

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 4,
                        textAlign: 'center',
                    }}
                >
                    <Box
                        component="img"
                        src="https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/icons/empty/ic-chat-active.svg"
                        alt=""
                        sx={{ width: 160, height: 160, mb: 2.5 }}
                    />
                    <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--palette-text-primary)', mb: 0.75 }}>
                        {greeting}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Viết gì đó hay ho...
                    </Typography>
                </Box>

                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        flexShrink: 0,
                        borderTop: '1px solid rgba(145, 158, 171, 0.16)',
                    }}
                >
                    <InputBase
                        fullWidth
                        placeholder="Nhập tin nhắn"
                        disabled
                        sx={{
                            fontSize: '0.9375rem',
                            py: 0.75,
                            color: 'var(--palette-text-primary)',
                        }}
                    />
                </Box>
            </Box>
        );
    }

    return (
        <>
        <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: '1px solid rgba(145, 158, 171, 0.16)',
                    minHeight: 72,
                    flexShrink: 0,
                    bgcolor: 'var(--palette-background-paper)',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5} minWidth={0}>
                    <Avatar sx={{ width: 36, height: 36, fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
                        <ConversationAvatarLetter conversation={activeConversation} />
                    </Avatar>
                    <Box minWidth={0}>
                        <ConversationTitle
                            conversation={activeConversation}
                            variant="subtitle2"
                            noWrap
                            sx={{ fontWeight: 700, lineHeight: 1.3 }}
                        />
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {STATUS_LABELS[activeConversation?.status || '']?.label || activeConversation?.status}
                            {activeConversation?.customerId ? ` · ${activeConversation.customerId.slice(0, 8)}` : ''}
                            {activeConversation && <> · {getAssigneeDisplayLabel(activeConversation, userId)}</>}
                            {!isConnected && ' · Đang kết nối…'}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={0.5} flexShrink={0} alignItems="center">
                    {canClose && (
                        <Button
                            variant="outlined"
                            onClick={handleCloseConversation}
                            disabled={closeMutation.isPending}
                            sx={{
                                height: 36,
                                px: 1.5,
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 700,
                                boxShadow: 'none',
                                borderColor: 'rgba(145, 158, 171, 0.24)',
                                color: 'var(--palette-text-primary)',
                            }}
                        >
                            {closeMutation.isPending ? 'Đang đóng…' : 'Đóng'}
                        </Button>
                    )}
                    {canClaim && (
                        <Button
                            variant="contained"
                            onClick={handleAssignToMe}
                            disabled={assignMutation.isPending}
                            sx={{
                                height: 36,
                                px: 1.5,
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 700,
                                boxShadow: 'none',
                                bgcolor: 'var(--palette-grey-800)',
                                '&:hover': { bgcolor: 'var(--palette-grey-900)' },
                            }}
                        >
                            {assignMutation.isPending ? 'Đang nhận…' : 'Nhận hội thoại'}
                        </Button>
                    )}
                    {onToggleDetails && (
                        <Tooltip title={showDetails ? 'Ẩn thông tin' : 'Hiện thông tin'}>
                            <IconButton
                                onClick={onToggleDetails}
                                aria-label={showDetails ? 'Ẩn thông tin' : 'Hiện thông tin'}
                                sx={{
                                    color: showDetails ? 'var(--palette-text-primary)' : 'var(--palette-text-secondary)',
                                    bgcolor: showDetails ? 'rgba(145, 158, 171, 0.12)' : 'transparent',
                                }}
                            >
                                <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>

            <Box sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
            <Box sx={{ flex: '1 1 auto', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box
                ref={scrollRef}
                sx={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflowY: 'auto',
                    px: 3,
                    py: 3,
                    bgcolor: 'var(--palette-background-paper)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: isLoading || !timelineRows.length ? 'center' : 'flex-end',
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2.5,
                    }}
                >
                    <Box ref={topSentinelRef} sx={{ height: 1, flexShrink: 0 }} />
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
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {activeConversation?.handoffSummary
                                    ? 'Chưa có tin nhắn với nhân viên. Mở tóm tắt bên dưới nếu cần.'
                                    : 'Hãy bắt đầu cuộc trò chuyện.'}
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
                                            href={`/${prefixAdmin}/account-admin/detail/${operatorId}`}
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

                        const senderType = String(msg.senderType || '').toUpperCase();
                        const isMe =
                            senderType === MessageSenderRole.OPERATOR ||
                            (!!userId && msg.senderId === userId && senderType !== MessageSenderRole.CUSTOMER);
                        const isBot = senderType === MessageSenderRole.AI_SYSTEM;
                        const isLast = index === timelineRows.length - 1;

                        const isReadByCustomer =
                            msg.isRead ||
                            (activeConversation?.customerLastReadAt &&
                                new Date(msg.createdAt) <= new Date(activeConversation.customerLastReadAt));
                        const showSeen = isMe && isLast && isReadByCustomer;
                        const senderName = isMe
                            ? 'Bạn'
                            : isBot
                              ? 'AI'
                              : getConversationDisplayTitle(activeConversation);
                        const meta = `${senderName}, ${formatBubbleTime(msg.createdAt)}`;

                        return (
                            <Stack
                                key={row.key}
                                direction="row"
                                justifyContent={isMe ? 'flex-end' : 'flex-start'}
                                alignItems="flex-start"
                                spacing={1.25}
                                sx={{ width: '100%' }}
                            >
                                {!isMe && (
                                    <Avatar
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            minWidth: 32,
                                            minHeight: 32,
                                            mt: 2.25,
                                            fontSize: isBot ? '0.65rem' : '0.8rem',
                                            fontWeight: 700,
                                            bgcolor: 'var(--palette-grey-200)',
                                            color: 'var(--palette-text-secondary)',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {isBot ? 'AI' : <ConversationAvatarLetter conversation={activeConversation} />}
                                    </Avatar>
                                )}
                                <Box
                                    sx={{
                                        maxWidth: '72%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isMe ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'var(--palette-text-disabled)',
                                            fontSize: '0.75rem',
                                            mb: 0.75,
                                            px: 0.25,
                                        }}
                                    >
                                        {meta}
                                        {showSeen ? ' · Đã xem' : ''}
                                    </Typography>
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.25,
                                            borderRadius: '12px',
                                            bgcolor: isMe ? '#FFE9D5' : '#F4F6F8',
                                            color: '#1C252E',
                                            width: 'fit-content',
                                            maxWidth: '100%',
                                            border: 'none',
                                            boxShadow: 'none',
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                lineHeight: 1.6,
                                                wordBreak: 'break-word',
                                                whiteSpace: 'pre-wrap',
                                                fontSize: '0.875rem',
                                            }}
                                        >
                                            {isBot ? formatChatMessageContent(msg.content ?? '') : msg.content}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        );
                    })
                    )}
                </Box>
            </Box>

            {activeConversation?.handoffSummary && (
                <Box
                    sx={{
                        flexShrink: 0,
                        borderTop: '1px solid rgba(145, 158, 171, 0.16)',
                        bgcolor: 'var(--palette-background-paper)',
                    }}
                >
                    {!summaryOpen ? (
                        <Box sx={{ px: 2.5, py: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setSummaryOpen(true)}
                                sx={{
                                    height: 32,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    borderColor: 'rgba(145, 158, 171, 0.32)',
                                    color: 'var(--palette-text-primary)',
                                }}
                            >
                                Xem tóm tắt
                            </Button>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                mx: 2,
                                mb: 1.5,
                                mt: 1.5,
                                p: 2,
                                maxHeight: 240,
                                overflowY: 'auto',
                                borderRadius: '12px',
                                bgcolor: '#FFF7E8',
                                border: '1px solid #FFE0B2',
                            }}
                        >
                            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B76E00' }}>
                                    Tóm tắt trước khi gặp nhân viên
                                </Typography>
                                <Stack direction="row" alignItems="center" spacing={0.5} flexShrink={0}>
                                    {canExpandPreHandoff && (
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => void handleTogglePreHandoff()}
                                            disabled={loadingPreHandoff}
                                            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 0 }}
                                        >
                                            {loadingPreHandoff
                                                ? 'Đang tải…'
                                                : showPreHandoff
                                                  ? 'Ẩn lịch sử AI'
                                                  : 'Lịch sử AI'}
                                        </Button>
                                    )}
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setSummaryOpen(false);
                                            setShowPreHandoff(false);
                                        }}
                                        aria-label="Đóng tóm tắt"
                                        sx={{ color: 'var(--palette-text-secondary)' }}
                                    >
                                        <CloseOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
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
                </Box>
            )}

            <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'var(--palette-background-paper)', borderTop: '1px solid rgba(145, 158, 171, 0.16)', flexShrink: 0 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 1,
                    }}
                >
                    <InputBase
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder={
                            activeConversation?.status === 'CLOSED'
                                ? 'Hội thoại đã đóng'
                                : canReply
                                ? 'Nhập tin nhắn'
                                : 'Nhận hội thoại để trả lời'
                        }
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!canReply}
                        sx={{
                            fontSize: '0.9375rem',
                            py: 0.75,
                            px: 0.5,
                            color: 'var(--palette-text-primary)',
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={() => void handleSend()}
                        disabled={!message.trim() || !canReply}
                        sx={{
                            height: 36,
                            minWidth: 64,
                            px: 2,
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 700,
                            boxShadow: 'none',
                            bgcolor: 'var(--palette-grey-800)',
                            '&:hover': { bgcolor: 'var(--palette-grey-900)' },
                            '&.Mui-disabled': { bgcolor: 'var(--palette-grey-300)', color: 'var(--palette-grey-500)', boxShadow: 'none' },
                        }}
                    >
                        Gửi
                    </Button>
                </Box>
            </Box>
            </Box>
            {showDetails && (
                <Box
                    sx={{
                        width: 280,
                        flexShrink: 0,
                        minHeight: 0,
                        height: '100%',
                        borderLeft: '1px solid rgba(145, 158, 171, 0.16)',
                        overflowY: 'auto',
                        bgcolor: 'var(--palette-background-paper)',
                    }}
                >
                    <ChatDetails conversation={activeConversation} />
                </Box>
            )}
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
                    <Button
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
