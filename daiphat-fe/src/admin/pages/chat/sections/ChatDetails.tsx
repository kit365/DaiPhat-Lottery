import {
    Box,
    Typography,
    Avatar,
    Stack,
    Divider,
    IconButton,
    Chip,
    Button,
    Grid,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { Participant } from '../types/chat';

interface ChatDetailsProps {
    participant?: Participant;
}

export const ChatDetails = ({ participant }: ChatDetailsProps) => {
    if (!participant) return null;

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            {/* Thông tin khách hàng */}
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Avatar
                    src={participant.avatar}
                    sx={{ width: 80, height: 80, mx: 'auto', mb: 1.5, fontSize: '1.5rem', fontWeight: 800, border: '2px solid #eee' }}
                >
                    {participant.fullName?.[0]}
                </Avatar>
                
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {participant.fullName}
                    </Typography>
                    <Box sx={{ bgcolor: '#fff0f0', color: '#df1b1c', px: 0.75, py: 0.25, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700 }}>
                        VIP
                    </Box>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 2 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                    Đang online
                </Typography>

                <Box sx={{ textAlign: 'left', bgcolor: '#f8f9fa', p: 1.5, borderRadius: 2, mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">SĐT:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{participant.phone || '0987654321'}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Tổng đơn:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>15 đơn</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Tổng chi:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#df1b1c' }}>1,500,000đ</Typography>
                    </Stack>
                </Box>
                
                <Button fullWidth variant="outlined" sx={{ color: '#df1b1c', borderColor: '#df1b1c', '&:hover': { borderColor: '#c11718', bgcolor: '#fff0f0' } }}>
                    Xem chi tiết khách hàng
                </Button>
            </Box>

            <Divider />

            {/* Timeline hội thoại */}
            <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Timeline hội thoại
                </Typography>
                <Stack spacing={2} sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', left: 15, top: 10, bottom: 10, width: 2, bgcolor: '#eee' } }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#e0f2fe', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon icon="solar:user-speak-bold" />
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Khách bắt đầu chat</Typography>
                            <Typography variant="caption" color="text.secondary">09:00 AM</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#dcfce7', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon icon="solar:smart-home-bold" />
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>AI Bot tiếp nhận</Typography>
                            <Typography variant="caption" color="text.secondary">09:00 AM</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#ffedd5', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon icon="solar:user-circle-bold" />
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Chờ nhân viên</Typography>
                            <Typography variant="caption" color="text.secondary">09:05 AM</Typography>
                        </Box>
                    </Stack>
                </Stack>
            </Box>

            <Divider />

            {/* Thao tác nhanh */}
            <Box sx={{ p: 3, flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                    Thao tác nhanh
                </Typography>
                <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                        <Button fullWidth variant="outlined" sx={{ color: 'text.primary', borderColor: '#eee', justifyContent: 'flex-start', px: 1.5 }}>
                            <Icon icon="solar:chat-line-bold" width={18} style={{ marginRight: 8, color: '#6366f1' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Trả lời mẫu</Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button fullWidth variant="outlined" sx={{ color: 'text.primary', borderColor: '#eee', justifyContent: 'flex-start', px: 1.5 }}>
                            <Icon icon="solar:magnifer-bold" width={18} style={{ marginRight: 8, color: '#f59e0b' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Tra cứu vé</Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button fullWidth variant="outlined" sx={{ color: 'text.primary', borderColor: '#eee', justifyContent: 'flex-start', px: 1.5 }}>
                            <Icon icon="solar:box-bold" width={18} style={{ marginRight: 8, color: '#10b981' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Tra đơn hàng</Typography>
                        </Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button fullWidth variant="outlined" sx={{ color: 'text.primary', borderColor: '#eee', justifyContent: 'flex-start', px: 1.5 }}>
                            <Icon icon="solar:ticket-sale-bold" width={18} style={{ marginRight: 8, color: '#ec4899' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Mã giảm giá</Typography>
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
