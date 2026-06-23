import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { prefixAdmin } from '../../constants/routes';
import { StaffTimelineChat } from './components/StaffTimelineChat';
import {
    useAssignSupportTicket,
    useGetAdminTicketCategories,
    useGetStaffTicketDetail,
    useResolveSupportTicket,
} from './hooks/useSupportTicket';
import {
    TicketStatus,
    TICKET_REF_TYPE_LABELS,
    TICKET_STATUS_LABELS,
} from '../../../types/support.type';

export const SupportTicketDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const ticketId = Number(id);

    const [resolveOpen, setResolveOpen] = useState(false);
    const [resolution, setResolution] = useState('');

    const { data, isLoading, isError } = useGetStaffTicketDetail(ticketId);
    const { data: categoriesData } = useGetAdminTicketCategories();
    const assignMutation = useAssignSupportTicket();
    const resolveMutation = useResolveSupportTicket();

    const ticket = data?.data;

    const categoryName = useMemo(() => {
        if (!ticket) return '—';
        return categoriesData?.data?.find((c) => c.id === ticket.ticketCategoryId)?.name || '—';
    }, [ticket, categoriesData]);

    const canAssign = ticket?.status === TicketStatus.OPEN;
    const canResolve =
        ticket?.status === TicketStatus.IN_PROGRESS ||
        ticket?.status === TicketStatus.WAITING_FOR_CUSTOMER;

    const handleResolve = () => {
        if (!resolution.trim()) return;
        resolveMutation.mutate(
            { id: ticketId, data: { response: resolution.trim() } },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        setResolveOpen(false);
                        setResolution('');
                    }
                },
            }
        );
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !ticket) {
        return (
            <Box textAlign="center" py={8}>
                <Typography color="text.secondary">Không tìm thấy yêu cầu hỗ trợ</Typography>
                <Button sx={{ mt: 2 }} onClick={() => navigate(`/${prefixAdmin}/support-tickets/list`)}>
                    Quay lại danh sách
                </Button>
            </Box>
        );
    }

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <Title title={`Khiếu nại #${ticket.id}`} />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Khiếu nại / Hỗ trợ', to: `/${prefixAdmin}/support-tickets/list` },
                            { label: `#${ticket.id}` },
                        ]}
                    />
                </div>
                <Box display="flex" gap={1} flexWrap="wrap">
                    {canAssign && (
                        <Button
                            variant="contained"
                            disabled={assignMutation.isPending}
                            onClick={() => assignMutation.mutate(ticketId)}
                        >
                            Tiếp nhận
                        </Button>
                    )}
                    {canResolve && (
                        <Button variant="outlined" color="success" onClick={() => setResolveOpen(true)}>
                            Giải quyết
                        </Button>
                    )}
                    <Button variant="outlined" onClick={() => navigate(`/${prefixAdmin}/support-tickets/list`)}>
                        Quay lại
                    </Button>
                </Box>
            </div>

            <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Chip
                    label={TICKET_STATUS_LABELS[ticket.status]}
                    color={ticket.status === TicketStatus.RESOLVED ? 'success' : 'primary'}
                    variant="outlined"
                />
                <Typography variant="body2" color="text.secondary">
                    Tạo lúc {dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}
                    {ticket.dueAt && ` · Hạn xử lý: ${dayjs(ticket.dueAt).format('DD/MM/YYYY HH:mm')}`}
                </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Thông tin yêu cầu
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1.5} mt={1}>
                                <InfoRow label="Danh mục" value={categoryName} />
                                <InfoRow label="Tiêu đề" value={ticket.title} />
                                <InfoRow label="Mô tả" value={ticket.description} />
                                <InfoRow label="Khách hàng" value={ticket.customerId} />
                                <InfoRow label="Nhân viên phụ trách" value={ticket.assignedTo || 'Chưa phân công'} />
                                {ticket.refId && ticket.refType && (
                                    <InfoRow
                                        label={TICKET_REF_TYPE_LABELS[ticket.refType]}
                                        value={ticket.refId}
                                    />
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Tệp đính kèm
                            </Typography>
                            {ticket.attachmentUrl ? (
                                <Box
                                    component="a"
                                    href={ticket.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Box
                                        component="img"
                                        src={ticket.attachmentUrl}
                                        alt="Đính kèm"
                                        sx={{ maxHeight: 240, maxWidth: '100%', borderRadius: 1, mt: 1 }}
                                    />
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary" mt={1}>
                                    Chưa có tệp đính kèm
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {ticket.status === TicketStatus.RESOLVED && ticket.response && (
                <Card sx={{ mb: 3, bgcolor: 'success.50' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Phương án giải quyết
                        </Typography>
                        <Typography variant="body2" whiteSpace="pre-wrap">
                            {ticket.response}
                        </Typography>
                        {ticket.resolvedAt && (
                            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                Giải quyết lúc {dayjs(ticket.resolvedAt).format('DD/MM/YYYY HH:mm')}
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            <StaffTimelineChat ticketId={ticket.id} status={ticket.status} />

            <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Giải quyết yêu cầu hỗ trợ</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Phương án giải quyết"
                        placeholder="Nhập nội dung phương án giải quyết cuối cùng..."
                        fullWidth
                        multiline
                        minRows={4}
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value.slice(0, 2000))}
                        helperText={`${resolution.length}/2000`}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResolveOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={!resolution.trim() || resolveMutation.isPending}
                        onClick={handleResolve}
                    >
                        Xác nhận giải quyết
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <Box>
        <Typography variant="caption" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={500} whiteSpace="pre-wrap">
            {value}
        </Typography>
    </Box>
);
