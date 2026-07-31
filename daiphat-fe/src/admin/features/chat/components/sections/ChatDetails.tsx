import {
    Box,
    Typography,
    Avatar,
    Stack,
    Divider,
    Button,
    Grid,
    Chip,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Conversation } from '../../../../../types/chat.type';
import { getConversationDisplayTitle, getAssigneeDisplayLabel, getConversationAvatarLetter, getManagementUnreadCount } from '../utils';
import { useAuthStore } from '../../../../../stores/useAuthStore';

interface ChatDetailsProps {
    conversation?: Conversation;
}

const STATUS_LABELS: Record<string, string> = {
    OPEN: 'Mở',
    ACTIVE: 'Đang xử lý',
    WAITING_FOR_OPERATOR: 'Chờ nhân viên',
    WAITING_FOR_CUSTOMER: 'Chờ khách hàng',
    CLOSED: 'Đã đóng',
};

export const ChatDetails = ({ conversation }: ChatDetailsProps) => {
    const currentUserId = useAuthStore((state) => state.user?.id);

    if (!conversation) return null;

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Avatar
                    sx={{ width: 80, height: 80, mx: 'auto', mb: 1.5, fontSize: '1.5rem', fontWeight: 800, border: '2px solid var(--palette-divider)' }}
                >
                    {getConversationAvatarLetter(conversation)}
                </Avatar>
                
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {getConversationDisplayTitle(conversation)}
                    </Typography>
                </Stack>

                <Chip
                    label={STATUS_LABELS[conversation.status] || conversation.status}
                    size="small"
                    sx={{ mb: 2 }}
                />

                <Box sx={{ textAlign: 'left', bgcolor: 'var(--palette-background-neutral)', p: 1.5, borderRadius: 2, mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Mã KH:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{conversation.customerId}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Nhân viên:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {getAssigneeDisplayLabel(conversation, currentUserId)}
                        </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Tin chưa đọc:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--palette-primary-main)' }}>
                            {getManagementUnreadCount(conversation)}
                        </Typography>
                    </Stack>
                </Box>
                
                <Button fullWidth variant="outlined" sx={{ color: 'var(--palette-primary-main)', borderColor: 'var(--palette-primary-main)', '&:hover': { borderColor: 'var(--palette-primary-dark)', bgcolor: 'var(--palette-error-lighter)' } }}>
                    Xem chi tiết khách hàng
                </Button>
            </Box>

            <Divider />

            <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Timeline hội thoại
                </Typography>
                <Stack spacing={2} sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', left: 15, top: 10, bottom: 10, width: 2, bgcolor: 'var(--palette-divider)' } }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'var(--palette-info-lighter)', color: 'var(--palette-info-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon icon="solar:user-speak-bold" />
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Khách bắt đầu chat</Typography>
                            <Typography variant="caption" color="text.secondary">—</Typography>
                        </Box>
                    </Stack>
                    {conversation.assignedOperatorId && (
                        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'var(--palette-success-lighter)', color: 'var(--palette-success-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon icon="solar:user-circle-bold" />
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>Nhân viên đã nhận</Typography>
                                <Typography variant="caption" color="text.secondary">—</Typography>
                            </Box>
                        </Stack>
                    )}
                </Stack>
            </Box>

            <Divider />

            <Box sx={{ p: 3, flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Thao tác nhanh
                </Typography>
                <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                        <Button fullWidth variant="outlined" sx={{ color: 'text.primary', borderColor: 'var(--palette-divider)', justifyContent: 'flex-start', px: 1.5 }}>
                            <Icon icon="solar:chat-line-bold" width={18} style={{ marginRight: 8, color: 'var(--palette-info-dark)' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Trả lời mẫu</Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button fullWidth variant="outlined" sx={{ color: 'text.primary', borderColor: 'var(--palette-divider)', justifyContent: 'flex-start', px: 1.5 }}>
                            <Icon icon="solar:magnifer-bold" width={18} style={{ marginRight: 8, color: 'var(--palette-warning-main)' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Tra cứu vé</Typography>
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ p: 3, pt: 0 }}>
                <Button fullWidth variant="contained" sx={{ bgcolor: 'var(--palette-grey-200)', color: 'var(--palette-error-main)', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: 'var(--palette-error-lighter)', boxShadow: 'none' } }}>
                    Đóng hội thoại
                </Button>
            </Box>
        </Box>
    );
};
