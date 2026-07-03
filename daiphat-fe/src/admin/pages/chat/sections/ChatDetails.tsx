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
import { Conversation } from '../../../../types/chat.type';
import { getConversationDisplayTitle, getAssigneeDisplayLabel, getConversationAvatarLetter } from '../utils';
import { useAuthStore } from '../../../../stores/useAuthStore';

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
                    sx={{ width: 80, height: 80, mx: 'auto', mb: 1.5, fontSize: '1.5rem', fontWeight: 800, border: '2px solid #eee' }}
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
                            {conversation.unreadCount ?? 0}
                        </Typography>
                    </Stack>
                </Box>
                
                <Button fullWidth variant="outlined" sx={{ color: 'var(--palette-primary-main)', borderColor: 'var(--palette-primary-main)', '&:hover': { borderColor: 'var(--palette-primary-dark)', bgcolor: '#fff0f0' } }}>
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
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#e0f2fe', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon icon="solar:user-speak-bold" />
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Khách bắt đầu chat</Typography>
                            <Typography variant="caption" color="text.secondary">—</Typography>
                        </Box>
                    </Stack>
                    {conversation.assignedOperatorId && (
                        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#dcfce7', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                            <Icon icon="solar:chat-line-bold" width={18} style={{ marginRight: 8, color: '#6366f1' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Trả lời mẫu</Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button fullWidth variant="outlined" sx={{ color: 'text.primary', borderColor: 'var(--palette-divider)', justifyContent: 'flex-start', px: 1.5 }}>
                            <Icon icon="solar:magnifer-bold" width={18} style={{ marginRight: 8, color: '#f59e0b' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Tra cứu vé</Typography>
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ p: 3, pt: 0 }}>
                <Button fullWidth variant="contained" sx={{ bgcolor: '#f1f5f9', color: '#ef4444', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: '#fee2e2', boxShadow: 'none' } }}>
                    Đóng hội thoại
                </Button>
            </Box>
        </Box>
    );
};
