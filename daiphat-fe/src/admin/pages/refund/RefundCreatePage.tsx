import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { prefixAdmin } from '../../constants/routes';
import { handleOrderTicketIncidents, updateOrderStatus } from '../../api/order.api';

export function RefundCreatePage() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as {
        orderId?: string;
        orderCode?: string;
        replacements?: Record<number, { faultedBy: 'DAMAGED' | 'LOST', damagedReason: string, damagedEvidenceUrl: string }>;
        orderDetails?: any[];
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [note, setNote] = useState('');

    const tickets = useMemo(() => {
        if (!state?.orderDetails || !state?.replacements) return [];
        return state.orderDetails
            .filter((d: any) => state.replacements![d.id])
            .map((d: any) => ({
                id: d.id,
                numbers: d.numbers || d.lotteryTicket?.numbers || d.serialNumber,
                stationName: d.stationName || d.lotteryTicket?.station?.name || '—',
                ...state.replacements![d.id],
            }));
    }, [state]);

    if (!state || !state.orderId) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Dữ liệu không hợp lệ.</Typography>
                <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Quay lại</Button>
            </Box>
        );
    }

    const handleSubmit = async () => {
        if (!state.replacements) return;
        setIsSubmitting(true);
        try {
            const damagedIds = Object.keys(state.replacements)
                .filter(id => state.replacements![Number(id)].faultedBy === 'DAMAGED')
                .map(Number);
            const lostIds = Object.keys(state.replacements)
                .filter(id => state.replacements![Number(id)].faultedBy === 'LOST')
                .map(Number);

            if (damagedIds.length > 0) {
                await handleOrderTicketIncidents(state.orderId!, {
                    orderDetailIds: damagedIds,
                    reason: 'DAMAGED',
                    note: note,
                });
            }

            if (lostIds.length > 0) {
                await handleOrderTicketIncidents(state.orderId!, {
                    orderDetailIds: lostIds,
                    reason: 'LOST',
                    note: note,
                });
            }

            await updateOrderStatus(state.orderId!, 'PENDING_PICKUP', 'Xử lý sự cố hoàn tất');

            toast.success('Đã tạo yêu cầu hoàn tiền và cập nhật đơn hàng thành công');
            navigate(`/${prefixAdmin}/order/detail/${state.orderId}`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu hoàn tiền');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                <IconButton onClick={() => navigate(-1)}>
                    <Icon icon="solar:arrow-left-linear" width={24} />
                </IconButton>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Tạo yêu cầu hoàn tiền
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Đơn hàng: {state.orderCode || state.orderId}
                    </Typography>
                </Box>
            </Stack>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 24px 0 rgba(34, 41, 47, 0.05)' }}>
                        <CardHeader 
                            title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Danh sách vé sự cố</Typography>} 
                        />
                        <Divider />
                        <CardContent sx={{ p: 0 }}>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Bộ số</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Đài</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Lý do (Faulted By)</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Chi tiết sự cố</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tickets.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell sx={{ fontWeight: 600 }}>{t.numbers}</TableCell>
                                                <TableCell>{t.stationName}</TableCell>
                                                <TableCell>
                                                    <Typography 
                                                        variant="caption" 
                                                        sx={{ 
                                                            px: 1, 
                                                            py: 0.5, 
                                                            borderRadius: '6px',
                                                            bgcolor: t.faultedBy === 'LOST' ? 'var(--palette-error-lighter)' : 'var(--palette-warning-lighter)',
                                                            color: t.faultedBy === 'LOST' ? 'var(--palette-error-dark)' : 'var(--palette-warning-dark)',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {t.faultedBy === 'LOST' ? 'Thất lạc' : 'Vé rách / Hư hỏng'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {t.damagedReason || '—'}
                                                    {t.damagedEvidenceUrl && (
                                                        <Box sx={{ mt: 0.5 }}>
                                                            <a href={t.damagedEvidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--palette-primary-main)' }}>
                                                                Xem minh chứng
                                                            </a>
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 24px 0 rgba(34, 41, 47, 0.05)' }}>
                        <CardHeader 
                            title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Thông tin bổ sung</Typography>} 
                        />
                        <Divider />
                        <CardContent>
                            <TextField
                                label="Ghi chú hoàn tiền"
                                fullWidth
                                multiline
                                minRows={3}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Nhập ghi chú cho yêu cầu hoàn tiền này..."
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 4 }}>
                <Button 
                    variant="outlined" 
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                >
                    Hủy bỏ
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleSubmit}
                    disabled={isSubmitting || tickets.length === 0}
                    startIcon={<Icon icon="solar:check-circle-bold-duotone" />}
                    sx={{ 
                        textTransform: 'none', 
                        fontWeight: 700, 
                        borderRadius: '8px',
                        boxShadow: 'none' 
                    }}
                >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận & Tạo yêu cầu'}
                </Button>
            </Stack>
        </Box>
    );
}
