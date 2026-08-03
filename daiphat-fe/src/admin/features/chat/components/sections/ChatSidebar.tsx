"use client";

import { ConversationTitle } from '../components/ConversationTitle';
import { ConversationAvatarLetter } from '../components/ConversationAvatarLetter';
import { getConversationDisplayTitle, getConversationAvatarLetter, getAssigneeDisplayLabel, getConversationPreviewText, getManagementUnreadCount } from '../utils';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import {
    Box,
    TextField,
    Typography,
    Avatar,
    InputAdornment,
    List,
    ListItemButton,
    CircularProgress,
    Stack,
    IconButton,
    Chip,
    Badge,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Conversation } from '../../../../../types/chat.type';
import { MessageSenderRole, ConversationStatusEnum } from '../../../../../types/chat.type';
import dayjs from 'dayjs';

const WaitTimer = ({ startTime }: { startTime: string }) => {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        const calculateElapsed = () => {
            if (!startTime) return '';
            const diffMs = Date.now() - new Date(startTime).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Vừa xong';
            if (diffMins < 60) return `${diffMins}p`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h${diffMins % 60}p`;
            return `${Math.floor(diffHours / 24)} ngày`;
        };
        
        setElapsed(calculateElapsed());
        const interval = setInterval(() => setElapsed(calculateElapsed()), 60000);
        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <Typography variant="caption" sx={{ color: 'var(--palette-error-main)', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Icon icon="mdi:clock-outline" /> {elapsed}
        </Typography>
    );
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    [ConversationStatusEnum.OPEN]: { label: 'Mở', color: 'var(--palette-info-dark)', bg: 'var(--palette-info-lighter)' },
    [ConversationStatusEnum.ACTIVE]: { label: 'Đang xử lý', color: 'var(--palette-success-dark)', bg: 'var(--palette-success-lighter)' },
    [ConversationStatusEnum.WAITING_FOR_OPERATOR]: { label: 'Chờ nhân viên nhận', color: 'var(--palette-warning-dark)', bg: 'var(--palette-warning-lighter)' },
    [ConversationStatusEnum.WAITING_FOR_CUSTOMER]: { label: 'Chờ khách hàng', color: 'var(--palette-info-main)', bg: 'var(--palette-info-lighter)' },
    [ConversationStatusEnum.CLOSED]: { label: 'Đã đóng', color: 'var(--palette-grey-700)', bg: 'var(--palette-grey-200)' },
};

interface ChatSidebarProps {
    conversations: Conversation[];
    selectedId: number | null;
    onSelect: (id: number) => void;
}

export const ChatSidebar = ({ conversations, selectedId, onSelect }: ChatSidebarProps) => {
    const currentUserId = useAuthStore((state) => state.user?.id);

    return (
        <Box
            sx={{
                width: 320,
                borderRight: '1px solid var(--palette-divider)',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'var(--palette-background-paper)',
                flexShrink: 0,
            }}
        >
            <List sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 1 }}>
                {!conversations ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : conversations.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                            Không tìm thấy hội thoại nào
                        </Typography>
                    </Box>
                ) : (
                    conversations.map((conv: Conversation) => {
                        const isSelected = conv.id === selectedId;
                        const lastMsg = conv.lastMessage;
                        const statusInfo = STATUS_LABELS[conv.status] || STATUS_LABELS.OPEN;
                        const hasUnread = getManagementUnreadCount(conv) > 0;
                        const previewText = getConversationPreviewText(
                            conv,
                            Object.fromEntries(
                                Object.entries(STATUS_LABELS).map(([k, v]) => [k, v.label])
                            ),
                            currentUserId
                        );
                        
                        return (
                            <ListItemButton
                                key={conv.id}
                                selected={isSelected}
                                onClick={() => onSelect(conv.id)}
                                sx={{
                                    borderRadius: 2,
                                    mb: 1,
                                    p: 1.5,
                                    bgcolor: isSelected ? 'var(--palette-action-selected)' : 'transparent',
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: isSelected ? 'var(--palette-primary-light)' : 'var(--palette-action-hover)' },
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    position: 'relative',
                                    ...(isSelected && {
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            top: '10%',
                                            bottom: '10%',
                                            width: 3,
                                            bgcolor: 'var(--palette-primary-main)',
                                            borderRadius: '0 4px 4px 0'
                                        }
                                    })
                                }}
                            >
                                <Badge color="error" variant="dot" invisible={!hasUnread} overlap="circular" anchorOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{ mr: 1.5 }}>
                                    <Avatar sx={{ width: 44, height: 44, bgcolor: isSelected ? 'var(--palette-primary-main)' : 'var(--palette-grey-300)', color: isSelected ? 'white' : 'var(--palette-text-secondary)', fontWeight: 600 }}>
                                        <ConversationAvatarLetter conversation={conv} />
                                    </Avatar>
                                </Badge>

                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                        <ConversationTitle conversation={conv}  variant="subtitle2" noWrap sx={{ fontWeight: hasUnread || isSelected ? 700 : 600, fontSize: '0.9rem', color: isSelected ? 'var(--palette-primary-main)' : 'text.primary' }} />
                                        {conv.status === ConversationStatusEnum.WAITING_FOR_OPERATOR ? (
                                            <WaitTimer startTime={conv.escalatedAt || conv.updatedAt || ''} />
                                        ) : lastMsg?.senderType === MessageSenderRole.CUSTOMER ? (
                                            <WaitTimer startTime={lastMsg.createdAt} />
                                        ) : (
                                            <Typography variant="caption" sx={{ color: hasUnread ? 'var(--palette-primary-main)' : 'text.disabled', fontWeight: hasUnread ? 700 : 500 }}>
                                                {conv.updatedAt ? dayjs(conv.updatedAt).format('HH:mm') : ''}
                                            </Typography>
                                        )}
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                        <Typography 
                                            variant="body2" 
                                            noWrap 
                                            sx={{ 
                                                color: hasUnread ? 'text.primary' : (isSelected ? 'text.primary' : 'text.secondary'), 
                                                flexGrow: 1,
                                                fontSize: '0.8rem',
                                                fontWeight: hasUnread ? 700 : (isSelected ? 500 : 400)
                                            }}
                                        >
                                            {lastMsg?.senderType === MessageSenderRole.OPERATOR ? 'Bạn: ' : ''}
                                            {previewText}
                                        </Typography>
                                        
                                        <Chip
                                            label={statusInfo.label}
                                            size="small"
                                            sx={{
                                                bgcolor: statusInfo.bg,
                                                color: statusInfo.color,
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                height: 20,
                                            }}
                                        />
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.5 }}>
                                        {getAssigneeDisplayLabel(conv, currentUserId)}
                                    </Typography>
                                </Box>
                            </ListItemButton>
                        );
                    })
                )}
            </List>
        </Box>
    );
};
