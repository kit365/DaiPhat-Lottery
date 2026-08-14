"use client";

import { ConversationTitle } from '../components/ConversationTitle';
import { ConversationAvatarLetter } from '../components/ConversationAvatarLetter';
import { getConversationPreviewText, getManagementUnreadCount } from '../utils';
import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import {
    Box,
    Typography,
    Avatar,
    List,
    ListItemButton,
    Stack,
    IconButton,
    Tooltip,
    InputAdornment,
    TextField,
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Conversation } from '../../../../../types/chat.type';
import { MessageSenderRole, ConversationStatusEnum } from '../../../../../types/chat.type';
import dayjs from 'dayjs';

const STATUS_LABELS: Record<string, string> = {
    [ConversationStatusEnum.OPEN]: 'Mở',
    [ConversationStatusEnum.ACTIVE]: 'Đang xử lý',
    [ConversationStatusEnum.WAITING_FOR_OPERATOR]: 'Chờ nhân viên nhận',
    [ConversationStatusEnum.WAITING_FOR_CUSTOMER]: 'Chờ khách hàng',
    [ConversationStatusEnum.CLOSED]: 'Đã đóng',
};

const avatarStatusColor = (status?: string) => {
    if (status === ConversationStatusEnum.WAITING_FOR_OPERATOR) return '#FFAB00';
    if (status === ConversationStatusEnum.ACTIVE || status === ConversationStatusEnum.WAITING_FOR_CUSTOMER) {
        return '#22C55E';
    }
    if (status === ConversationStatusEnum.CLOSED) return '#919EAB';
    return '#22C55E';
};

const formatListTime = (iso?: string) => {
    if (!iso) return '';
    const t = dayjs(iso);
    if (!t.isValid()) return '';
    const mins = dayjs().diff(t, 'minute');
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút`;
    const hours = dayjs().diff(t, 'hour');
    if (hours < 24) return `${hours} giờ`;
    return t.format('DD/MM');
};

interface ChatSidebarProps {
    conversations: Conversation[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onBackToList?: () => void;
}

export const ChatSidebar = ({ conversations, selectedId, onSelect, onBackToList }: ChatSidebarProps) => {
    const currentUserId = useAuthStore((state) => state.user?.id);
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter((conv) => {
            const title = (conv.title || conv.customerName || conv.customerId || '').toLowerCase();
            const preview = (conv.lastMessage?.content || '').toLowerCase();
            return title.includes(q) || preview.includes(q);
        });
    }, [conversations, query]);

    return (
        <Box
            sx={{
                width: 320,
                height: '100%',
                minHeight: 0,
                borderRight: '1px solid rgba(145, 158, 171, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fff',
                flexShrink: 0,
                alignSelf: 'stretch',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ px: 2, pt: 2, pb: 1.5, flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    {onBackToList && (
                        <Tooltip title="Quay lại danh sách">
                            <IconButton
                                onClick={onBackToList}
                                size="small"
                                aria-label="Quay lại danh sách"
                                sx={{ color: 'var(--palette-text-secondary)' }}
                            >
                                <ArrowBackOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', flex: 1 }}>
                        Chat
                    </Typography>
                </Stack>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Tìm liên hệ..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: '#637381' }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            bgcolor: '#fff',
                            '& fieldset': { borderColor: 'rgba(145, 158, 171, 0.32)' },
                            '&:hover fieldset': { borderColor: 'rgba(145, 158, 171, 0.48)' },
                            '&.Mui-focused fieldset': { borderColor: '#1C252E', borderWidth: '1px' },
                        },
                    }}
                />
            </Box>

            <List
                disablePadding
                sx={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    px: 0,
                    py: 0,
                    alignContent: 'flex-start',
                }}
            >
                {visible.length === 0 ? (
                    <Typography
                        color="text.secondary"
                        sx={{ px: 1.5, py: 4, textAlign: 'center', fontSize: '1rem', fontWeight: 500 }}
                    >
                        Không có hội thoại
                    </Typography>
                ) : (
                    visible.map((conv) => {
                        const isSelected = conv.id === selectedId;
                        const lastMsg = conv.lastMessage;
                        const hasUnread = getManagementUnreadCount(conv) > 0;
                        const previewText = getConversationPreviewText(conv, STATUS_LABELS, currentUserId);
                        const prefix =
                            lastMsg?.senderType === MessageSenderRole.OPERATOR ? 'Bạn: ' : '';

                        return (
                            <ListItemButton
                                key={conv.id}
                                selected={isSelected}
                                disableRipple
                                onClick={() => onSelect(conv.id)}
                                sx={{
                                    borderRadius: 0,
                                    mb: 0,
                                    py: 1.25,
                                    px: 2,
                                    alignItems: 'flex-start',
                                    overflow: 'hidden',
                                    width: '100%',
                                    maxWidth: '100%',
                                    border: 'none',
                                    boxShadow: 'none',
                                    outline: 'none',
                                    bgcolor: isSelected ? 'var(--palette-action-selected)' : 'transparent',
                                    '&:hover': {
                                        bgcolor: 'var(--palette-action-hover)',
                                        boxShadow: 'none',
                                    },
                                    '&.Mui-selected': {
                                        bgcolor: 'var(--palette-action-selected)',
                                        borderRadius: 0,
                                        border: 'none',
                                        boxShadow: 'none',
                                        outline: 'none',
                                    },
                                    '&.Mui-selected:hover': {
                                        bgcolor: 'var(--palette-action-selected)',
                                    },
                                    '&.Mui-focusVisible': {
                                        bgcolor: 'var(--palette-action-selected)',
                                        outline: 'none',
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                <Box sx={{ position: 'relative', mr: 1.5, flexShrink: 0, width: 48, height: 48 }}>
                                    <Avatar
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            bgcolor: 'var(--palette-grey-200)',
                                            color: 'var(--palette-text-secondary)',
                                        }}
                                    >
                                        <ConversationAvatarLetter conversation={conv} />
                                    </Avatar>
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            right: 1,
                                            bottom: 1,
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            bgcolor: avatarStatusColor(conv.status),
                                            border: '2px solid #fff',
                                        }}
                                    />
                                </Box>
                                <Box sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', pt: 0.25 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1} sx={{ minWidth: 0 }}>
                                        <ConversationTitle
                                            conversation={conv}
                                            variant="subtitle2"
                                            noWrap
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                lineHeight: 1.4,
                                                color: 'var(--palette-text-primary)',
                                                flex: '1 1 auto',
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'var(--palette-text-disabled)',
                                                flexShrink: 0,
                                                fontSize: '0.75rem',
                                            }}
                                        >
                                            {formatListTime(conv.updatedAt)}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.25 }}>
                                        <Typography
                                            variant="body2"
                                            noWrap
                                            sx={{
                                                flex: '1 1 auto',
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                fontSize: '0.8125rem',
                                                color: hasUnread
                                                    ? 'var(--palette-text-primary)'
                                                    : 'var(--palette-text-secondary)',
                                                fontWeight: hasUnread ? 600 : 400,
                                            }}
                                        >
                                            {prefix}
                                            {previewText}
                                        </Typography>
                                        {hasUnread && (
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    bgcolor: '#22C55E',
                                                    flexShrink: 0,
                                                }}
                                            />
                                        )}
                                    </Stack>
                                </Box>
                            </ListItemButton>
                        );
                    })
                )}
            </List>
        </Box>
    );
};
