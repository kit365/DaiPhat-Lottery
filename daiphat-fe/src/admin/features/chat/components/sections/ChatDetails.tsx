"use client";

import { Box, Typography, Avatar, Stack, Button } from '@mui/material';
import Link from '@/admin/components/navigation/AdminLink';
import { Conversation } from '../../../../../types/chat.type';
import { ConversationStatusEnum } from '../../../../../types/chat.type';
import { getConversationDisplayTitle, getAssigneeDisplayLabel, getManagementUnreadCount } from '../utils';
import { ConversationAvatarLetter } from '../components/ConversationAvatarLetter';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { prefixAdmin } from '../../../../constants/routes';
import dayjs from 'dayjs';

interface ChatDetailsProps {
    conversation?: Conversation;
}

const STATUS_LABELS: Record<string, string> = {
    [ConversationStatusEnum.OPEN]: 'Mở',
    [ConversationStatusEnum.ACTIVE]: 'Đang xử lý',
    [ConversationStatusEnum.WAITING_FOR_OPERATOR]: 'Chờ nhân viên',
    [ConversationStatusEnum.WAITING_FOR_CUSTOMER]: 'Chờ khách hàng',
    [ConversationStatusEnum.CLOSED]: 'Đã đóng',
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <Stack spacing={0.25} sx={{ py: 1.25 }}>
        <Typography
            variant="caption"
            sx={{
                color: 'var(--palette-text-disabled)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                fontSize: '0.6875rem',
            }}
        >
            {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)', wordBreak: 'break-all' }}>
            {value}
        </Typography>
    </Stack>
);

export const ChatDetails = ({ conversation }: ChatDetailsProps) => {
    const currentUserId = useAuthStore((state) => state.user?.id);

    if (!conversation) {
        return (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Chọn hội thoại để xem thông tin khách.
                </Typography>
            </Box>
        );
    }

    const unread = getManagementUnreadCount(conversation);

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
            }}
        >
            <Box sx={{ px: 3, pt: 4, pb: 3, textAlign: 'center' }}>
                <Avatar
                    sx={{
                        width: 96,
                        height: 96,
                        mx: 'auto',
                        mb: 2,
                        fontSize: '2rem',
                        fontWeight: 700,
                        bgcolor: 'var(--palette-grey-200)',
                        color: 'var(--palette-text-secondary)',
                    }}
                >
                    <ConversationAvatarLetter conversation={conversation} />
                </Avatar>
                <Typography sx={{ fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.3, mb: 0.5 }}>
                    {getConversationDisplayTitle(conversation)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {STATUS_LABELS[conversation.status] || conversation.status}
                </Typography>
            </Box>

            <Box sx={{ px: 3, pb: 3 }}>
                <Typography
                    sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: 'var(--palette-text-disabled)',
                        mb: 0.5,
                    }}
                >
                    THÔNG TIN
                </Typography>
                <InfoRow label="MÃ KHÁCH" value={conversation.customerId || '—'} />
                <InfoRow label="NHÂN VIÊN" value={getAssigneeDisplayLabel(conversation, currentUserId)} />
                <InfoRow
                    label="CẬP NHẬT"
                    value={conversation.updatedAt ? dayjs(conversation.updatedAt).format('DD/MM/YYYY HH:mm') : '—'}
                />
                <InfoRow label="CHƯA ĐỌC" value={String(unread)} />

                {conversation.customerId && (
                    <Button
                        component={Link}
                        href={`/${prefixAdmin}/account-user/detail/${conversation.customerId}`}
                        fullWidth
                        variant="outlined"
                        sx={{
                            mt: 1.5,
                            height: 40,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 700,
                            boxShadow: 'none',
                            borderColor: 'rgba(145, 158, 171, 0.24)',
                            color: 'var(--palette-text-primary)',
                            '&:hover': {
                                borderColor: 'var(--palette-text-primary)',
                                bgcolor: 'transparent',
                            },
                        }}
                    >
                        Hồ sơ khách hàng
                    </Button>
                )}
            </Box>
        </Box>
    );
};
