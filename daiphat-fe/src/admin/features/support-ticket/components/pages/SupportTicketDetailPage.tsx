"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { useMemo, useState, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';
import { CanAccess } from '@/admin/components/auth/CanAccess';
import { PERMISSIONS } from '@/admin/constants/permission.constants';
import { prefixAdmin } from '@/admin/constants/routes';
import { StaffComplaintTimeline } from '../sections/StaffComplaintTimeline';
import {
    useAssignSupportTicket,
    useGetStaffTicketDetail,
    useResolveSupportTicket,
} from '../../hooks/useSupportTicket';
import { useGetStaffRefundDetail } from '@/admin/features/refund/hooks/useRefundManagement';
import { useOrderDetail } from '@/admin/features/orders/hooks/useOrder';
import { useGetBanks } from '@/client/hooks/useBankAccount';
import {
    getRefundStatusAdminBadgeModifier,
    getRefundStatusLabel,
} from '@/admin/features/refund/utils/refundStatusBadge.util';
import {
    getOrderStatusAdminBadgeModifier,
    getOrderStatusBadge,
} from '@/shared/components/StatusBadge/orderStatusMap';
import { getOrderTypeLabel } from '@/types/order.type';
import { RefundType, UserBankAccountResponse, VietQrBankResponse } from '@/types/refund.type';
import {
    ADMIN_DIALOG_ACTIONS_SX,
    ADMIN_DIALOG_CONTENT_SX,
    ADMIN_DIALOG_PAPER_SX,
    ADMIN_DIALOG_TITLE_SX,
} from '@/admin/components/ui/AdminConfirmDialog';
import {
    findReasonComment,
    getTicketCategoryIcon,
    isTerminalTicketStatus,
    TicketRefType,
    TicketStatus,
    TICKET_REF_TYPE_LABELS,
    TICKET_STATUS_LABELS,
    getTicketStatusBadgeClass,
} from '@/types/support.type';

function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <Typography
            variant="caption"
            sx={{ color: 'var(--palette-text-disabled)', display: 'block', mb: 0.75, fontWeight: 600 }}
        >
            {children}
        </Typography>
    );
}

function FieldValue({ children, sx }: { children: ReactNode; sx?: object }) {
    return (
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--palette-text-primary)', ...sx }}>
            {children}
        </Typography>
    );
}

function CardSectionTitle({ title, sx }: { title: string; sx?: object }) {
    return (
        <Typography
            sx={{
                fontSize: '1.0625rem',
                fontWeight: 700,
                color: 'var(--palette-text-primary)',
                mb: 2.5,
                ...sx,
            }}
        >
            {title}
        </Typography>
    );
}

const cardSx = {
    borderRadius: '16px',
    border: '1px solid rgba(145, 158, 171, 0.16)',
    boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.08)',
} as const;

const headerButtonSx = {
    height: 36,
    px: 2,
    borderRadius: '8px',
    fontWeight: 700,
    textTransform: 'none' as const,
    boxShadow: 'none',
};

function normalizeLegacySystemNote(
    content: string,
    context: { refType?: TicketRefType; ticketCategoryName?: string }
) {
    if (!content) return content;

    const lower = content.toLowerCase();

    // Chuẩn hóa thông báo giải quyết sang giao diện admin
    if (
        lower.includes('khiếu nại đã được đánh dấu giải quyết') ||
        lower.includes('yêu cầu hỗ trợ đã được giải quyết') ||
        lower.includes('vui lòng xác nhận bạn có hài lòng với phương án này')
    ) {
        return 'Khiếu nại đã được đánh dấu giải quyết.';
    }

    if (lower.includes('khách hàng hài lòng với phương án giải quyết')) {
        return 'Khách hàng hài lòng với phương án giải quyết. Khiếu nại đã đóng.';
    }

    if (lower.includes('khách hàng chưa hài lòng với phương án giải quyết')) {
        return 'Khách hàng chưa hài lòng với phương án giải quyết. Khiếu nại được mở lại.';
    }

    const marker = 'đã tiếp nhận ticket';
    if (lower.includes(marker)) {
        const markerIndex = lower.indexOf(marker);
        const actor = markerIndex > 0 ? content.slice(0, markerIndex).trim() : 'Nhân viên';

        if (context.refType === TicketRefType.PRIZE_CLAIM) {
            return `${actor} đã tiếp nhận yêu cầu trả thưởng`;
        }
        if (context.refType === TicketRefType.REFUND_REQUEST) {
            return `${actor} đã tiếp nhận yêu cầu hoàn tiền`;
        }
        if (context.refType === TicketRefType.ORDER) {
            return `${actor} đã tiếp nhận khiếu nại đơn hàng`;
        }

        if (context.ticketCategoryName?.trim()) {
            return `${actor} đã tiếp nhận yêu cầu ${context.ticketCategoryName.trim().toLowerCase()}`;
        }
        return `${actor} đã tiếp nhận yêu cầu hỗ trợ`;
    }

    return content;
}

function TicketRefundBankCard({
    bankAccount,
    banks,
}: {
    bankAccount?: UserBankAccountResponse | null;
    banks?: VietQrBankResponse[];
}) {
    if (!bankAccount) {
        return (
            <Typography variant="body2" color="text.secondary">
                Yêu cầu hoàn tiền chưa có thông tin tài khoản ngân hàng.
            </Typography>
        );
    }

    const matchedBank = banks?.find(
        (b) =>
            (bankAccount.bankBin && b.bin === bankAccount.bankBin) ||
            (bankAccount.bankName && (
                b.name?.toLowerCase() === bankAccount.bankName.toLowerCase() ||
                b.shortName?.toLowerCase() === bankAccount.bankName.toLowerCase() ||
                bankAccount.bankName.toLowerCase().includes(b.shortName?.toLowerCase() || '') ||
                bankAccount.bankName.toLowerCase().includes(b.name?.toLowerCase() || '')
            ))
    );

    const logoUrl = bankAccount.bankLogo || matchedBank?.logo;

    const handleCopy = async (val: string, label: string) => {
        try {
            await navigator.clipboard.writeText(val);
            toast.success(`Đã sao chép ${label}`);
        } catch {
            toast.error('Không thể sao chép');
        }
    };

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: 'var(--palette-background-neutral, #F8FAFC)',
                border: '1px solid rgba(145, 158, 171, 0.16)',
            }}
        >
            <Stack direction="row" spacing={1.75} alignItems="center" sx={{ mb: 2 }}>
                {logoUrl ? (
                    <Box
                        component="img"
                        src={logoUrl}
                        alt={bankAccount.bankName}
                        sx={{
                            width: 46,
                            height: 46,
                            objectFit: 'contain',
                            borderRadius: '10px',
                            bgcolor: '#fff',
                            border: '1px solid #e2e8f0',
                            p: 0.5,
                            flexShrink: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: 46,
                            height: 46,
                            borderRadius: '10px',
                            bgcolor: '#fff',
                            border: '1px solid #e2e8f0',
                            display: 'grid',
                            placeItems: 'center',
                            color: 'var(--palette-text-secondary)',
                            flexShrink: 0,
                        }}
                    >
                        <Box component="i" className="fa-solid fa-building-columns" sx={{ fontSize: 20 }} />
                    </Box>
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, display: 'block' }}>
                        Ngân hàng
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                        {bankAccount.bankName || '—'}
                    </Typography>
                </Box>
            </Stack>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Số tài khoản
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography
                            sx={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '1.0625rem',
                                letterSpacing: '0.05em',
                                color: 'var(--palette-text-primary)',
                            }}
                        >
                            {bankAccount.bankAccountNo || '—'}
                        </Typography>
                        {bankAccount.bankAccountNo && (
                            <Tooltip title="Sao chép số tài khoản">
                                <IconButton
                                    size="small"
                                    onClick={() => handleCopy(bankAccount.bankAccountNo, 'số tài khoản')}
                                    sx={{ color: 'var(--palette-primary-main)', p: '4px' }}
                                >
                                    <Box component="i" className="fa-solid fa-copy" sx={{ fontSize: 13 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Chủ tài khoản
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                textTransform: 'uppercase',
                                color: 'var(--palette-text-primary)',
                            }}
                        >
                            {bankAccount.bankAccountName || '—'}
                        </Typography>
                        {bankAccount.bankAccountName && (
                            <Tooltip title="Sao chép tên chủ tài khoản">
                                <IconButton
                                    size="small"
                                    onClick={() => handleCopy(bankAccount.bankAccountName, 'tên chủ tài khoản')}
                                    sx={{ color: 'var(--palette-primary-main)', p: '4px' }}
                                >
                                    <Box component="i" className="fa-solid fa-copy" sx={{ fontSize: 13 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
}

function buildReferenceLink(refType?: TicketRefType, refId?: string, supportTicketId?: number) {
    if (!refType || !refId) return null;
    if (refType === TicketRefType.ORDER) {
        return `/${prefixAdmin}/order/detail/${refId}`;
    }
    if (refType === TicketRefType.REFUND_REQUEST) {
        return `/${prefixAdmin}/refunds/detail/${refId}`;
    }
    if (refType === TicketRefType.PRIZE_CLAIM) {
        const base = `/${prefixAdmin}/prize-payouts/detail/${refId}`;
        return supportTicketId ? `${base}?fromSupportTicketId=${supportTicketId}` : base;
    }
    return null;
}

export const SupportTicketDetailPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();
    const ticketId = Number(id);
    const [resolveOpen, setResolveOpen] = useState(false);
    const [resolution, setResolution] = useState('');

    const { data, isLoading, isError } = useGetStaffTicketDetail(ticketId);
    const assignMutation = useAssignSupportTicket();
    const resolveMutation = useResolveSupportTicket();

    const ticket = data?.data;
    const refundReferenceId = ticket?.refType === TicketRefType.REFUND_REQUEST
        ? Number(ticket.refId)
        : 0;
    const orderReferenceId = ticket?.refType === TicketRefType.ORDER
        ? ticket.refId || ''
        : '';
    const { data: refundData, isLoading: isRefundLoading } = useGetStaffRefundDetail(refundReferenceId);
    const { data: orderData, isLoading: isOrderLoading } = useOrderDetail(orderReferenceId);
    const { data: banksData } = useGetBanks();
    const refundDetail = refundData?.data;
    const relatedOrder = orderData?.data;

    const reasonComment = useMemo(() => {
        if (!ticket) return undefined;
        return (
            findReasonComment(ticket.comments || [], ticket.resolvedReasonId) ||
            findReasonComment(ticket.comments || [], ticket.rejectedReasonId)
        );
    }, [ticket]);

    const isOverdue = useMemo(() => {
        if (!ticket?.dueAt) return false;
        if (isTerminalTicketStatus(ticket.status)) return false;
        return dayjs(ticket.dueAt).isBefore(dayjs());
    }, [ticket?.dueAt, ticket?.status]);

    const canAssign = ticket?.status === TicketStatus.OPEN;
    const canResolve = ticket?.status === TicketStatus.IN_PROGRESS;

    const breadcrumbItems = [
        { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
        { label: 'Khiếu nại', to: `/${prefixAdmin}/support-tickets/list` },
        { label: `#${ticketId}` },
    ];

    if (isLoading) {
        return (
            <>
                <PageHeader title={`Khiếu nại #${ticketId}`} breadcrumbItems={breadcrumbItems} />
                <SpinnerLoading />
            </>
        );
    }

    if (isError || !ticket) {
        return (
            <Box textAlign="center" py={8}>
                <Typography color="text.secondary">Không tìm thấy yêu cầu hỗ trợ</Typography>
                <Button sx={{ mt: 2 }} onClick={() => router.push(`/${prefixAdmin}/support-tickets/list`)}>
                    Quay lại danh sách
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', mx: 'auto' }}>
            <PageHeader
                title={ticket.title}
                titleExtra={
                    <AdminStatusBadge
                        label={TICKET_STATUS_LABELS[ticket.status]}
                        modifier={getTicketStatusBadgeClass(ticket.status)}
                    />
                }
                description={
                    <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>
                        Khiếu nại #{ticket.id}
                        {ticket.ticketCategoryName ? ` · ${ticket.ticketCategoryName}` : ''}
                        {' · '}
                        Tạo {dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}
                        {ticket.dueAt
                            ? ` · Hạn ${dayjs(ticket.dueAt).format('DD/MM/YYYY HH:mm')}${isOverdue ? ' (quá hạn)' : ''}`
                            : ''}
                    </Typography>
                }
                breadcrumbItems={breadcrumbItems}
                action={
                    canAssign ? (
                        <CanAccess permission={PERMISSIONS.SUPPORT_TICKET.PROCESS}>
                            <Button
                                variant="contained"
                                disabled={assignMutation.isPending}
                                onClick={() => assignMutation.mutate(ticketId)}
                                sx={{
                                    ...headerButtonSx,
                                    bgcolor: 'var(--palette-grey-800)',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: 'var(--palette-grey-900)' },
                                }}
                            >
                                {assignMutation.isPending ? 'Đang tiếp nhận…' : 'Tiếp nhận'}
                            </Button>
                        </CanAccess>
                    ) : undefined
                }
            />

            {isOverdue && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
                    Đã quá hạn xử lý {ticket.dueAt ? `(${dayjs(ticket.dueAt).format('DD/MM/YYYY HH:mm')})` : ''}.
                    Ưu tiên xử lý yêu cầu này.
                </Alert>
            )}

            <Grid container spacing={3} alignItems="stretch">
                <Grid size={{ xs: 12, lg: 5 }} sx={{ display: 'flex' }}>
                    <Stack spacing={3} sx={{ flex: 1, width: '100%' }}>
                        {/* Card 1: Tổng quan khiếu nại (đã tích hợp Kết quả xử lý) */}
                        <Card sx={cardSx}>
                            <CardContent sx={{ p: 3 }}>
                                <CardSectionTitle title="Tổng quan khiếu nại" />
                                <Grid container spacing={2.5}>
                                    {/* Danh mục hiển thị nổi bật, rõ ràng */}
                                    <Grid size={{ xs: 12 }}>
                                        <FieldLabel>Danh mục khiếu nại</FieldLabel>
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                borderRadius: '12px',
                                                bgcolor: 'var(--palette-background-neutral, #F4F6F8)',
                                                border: '1px solid rgba(145, 158, 171, 0.16)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: '10px',
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                    bgcolor: '#fff',
                                                    color: 'var(--palette-primary-main, #FF3030)',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Box
                                                    component="i"
                                                    className={`fa-solid ${getTicketCategoryIcon(ticket.ticketCategoryCode)}`}
                                                    sx={{ fontSize: 16 }}
                                                />
                                            </Box>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>
                                                    {ticket.ticketCategoryName || '—'}
                                                </Typography>
                                                {ticket.ticketCategoryCode && (
                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', display: 'block' }}>
                                                        Mã danh mục: {ticket.ticketCategoryCode}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Grid>

                                    {/* Mô tả từ khách hàng */}
                                    <Grid size={{ xs: 12 }}>
                                        <FieldLabel>Mô tả từ khách hàng</FieldLabel>
                                        <Box
                                            sx={{
                                                p: 1.75,
                                                borderRadius: '10px',
                                                bgcolor: 'var(--palette-background-neutral, #F8FAFC)',
                                                border: '1px solid rgba(145, 158, 171, 0.16)',
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    whiteSpace: 'pre-wrap',
                                                    fontWeight: 500,
                                                    lineHeight: 1.7,
                                                    color: 'var(--palette-text-primary)',
                                                }}
                                            >
                                                {ticket.description || 'Không có mô tả'}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    {/* Tệp đính kèm */}
                                    <Grid size={{ xs: 12 }}>
                                        <FieldLabel>Tệp đính kèm</FieldLabel>
                                        {ticket.attachmentUrl ? (
                                            <Box
                                                component="a"
                                                href={ticket.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 1.25,
                                                    p: 1,
                                                    borderRadius: '10px',
                                                    border: '1px solid rgba(145, 158, 171, 0.24)',
                                                    bgcolor: '#fff',
                                                    textDecoration: 'none',
                                                    color: 'var(--palette-text-primary)',
                                                    transition: 'all 200ms',
                                                    '&:hover': {
                                                        borderColor: 'var(--palette-primary-main)',
                                                        bgcolor: 'var(--palette-background-neutral)',
                                                    },
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={ticket.attachmentUrl}
                                                    alt=""
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        objectFit: 'cover',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--palette-divider)',
                                                        bgcolor: 'var(--palette-background-neutral)',
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-primary-main)' }}>
                                                        Xem tệp đính kèm ↗
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)' }}>
                                                        Nhấn để mở hình ảnh
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <FieldValue sx={{ fontWeight: 500, color: 'var(--palette-text-secondary)' }}>
                                                Không có
                                            </FieldValue>
                                        )}
                                    </Grid>

                                    {/* Lưới thông tin cơ bản */}
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Khách hàng</FieldLabel>
                                        <FieldValue>{ticket.customerName || '—'}</FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Người tiếp nhận</FieldLabel>
                                        <FieldValue>{ticket.assignedToName || 'Chưa tiếp nhận'}</FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Hạn xử lý</FieldLabel>
                                        <FieldValue sx={{ color: isOverdue ? 'var(--palette-error-main)' : undefined }}>
                                            {ticket.dueAt ? dayjs(ticket.dueAt).format('DD/MM/YYYY HH:mm') : '—'}
                                        </FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Cập nhật lần cuối</FieldLabel>
                                        <FieldValue>{dayjs(ticket.updatedAt).format('DD/MM/YYYY HH:mm')}</FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Ngày tạo</FieldLabel>
                                        <FieldValue>{dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}</FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Mã khiếu nại</FieldLabel>
                                        <FieldValue>#{ticket.id}</FieldValue>
                                    </Grid>

                                    {/* Kết quả xử lý / Lý do từ chối (được đưa vào trong Tổng quan khiếu nại) */}
                                    {(reasonComment || ticket.response || ticket.resolvedAt || ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.REJECTED) && (
                                        <Grid size={{ xs: 12 }}>
                                            <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
                                            <Box
                                                sx={{
                                                    mt: 1.5,
                                                    p: 2,
                                                    borderRadius: '12px',
                                                    bgcolor: ticket.status === TicketStatus.REJECTED
                                                        ? 'rgba(255, 72, 66, 0.08)'
                                                        : 'rgba(34, 197, 94, 0.08)',
                                                    border: '1px solid',
                                                    borderColor: ticket.status === TicketStatus.REJECTED
                                                        ? 'rgba(255, 72, 66, 0.24)'
                                                        : 'rgba(34, 197, 94, 0.24)',
                                                }}
                                            >
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                    <Box
                                                        component="i"
                                                        className={`fa-solid ${ticket.status === TicketStatus.REJECTED ? 'fa-circle-xmark' : 'fa-circle-check'}`}
                                                        sx={{
                                                            fontSize: 16,
                                                            color: ticket.status === TicketStatus.REJECTED
                                                                ? 'var(--palette-error-main, #FF4842)'
                                                                : 'var(--palette-success-main, #22C55E)',
                                                        }}
                                                    />
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: ticket.status === TicketStatus.REJECTED
                                                                ? 'var(--palette-error-darker, #7A0C2E)'
                                                                : 'var(--palette-success-darker, #115E59)',
                                                        }}
                                                    >
                                                        {ticket.status === TicketStatus.REJECTED ? 'Lý do từ chối' : 'Kết quả xử lý'}
                                                    </Typography>
                                                </Stack>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        whiteSpace: 'pre-wrap',
                                                        fontWeight: 500,
                                                        lineHeight: 1.65,
                                                        color: 'var(--palette-text-primary)',
                                                        mb: (ticket.resolvedAt || ticket.updatedAt) ? 1 : 0,
                                                    }}
                                                >
                                                    {reasonComment?.content || ticket.response || (ticket.status === TicketStatus.RESOLVED ? 'Đã giải quyết yêu cầu của khách hàng.' : 'Đã từ chối khiếu nại.')}
                                                </Typography>
                                                {(ticket.resolvedAt || (ticket.status === TicketStatus.RESOLVED && ticket.updatedAt)) && (
                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', display: 'block' }}>
                                                        Thời gian: {dayjs(ticket.resolvedAt || ticket.updatedAt).format('DD/MM/YYYY HH:mm')}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Card 2: Thông tin yêu cầu hoàn tiền (Thiết kế lại hiện đại, rõ ràng, có ảnh ngân hàng) */}
                        {ticket.refType === TicketRefType.REFUND_REQUEST && (
                            <Card sx={cardSx}>
                                <CardContent sx={{ p: 3 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                                        <CardSectionTitle title="Thông tin yêu cầu hoàn tiền" sx={{ mb: 0 }} />
                                        {refundDetail && (
                                            <Box
                                                component="a"
                                                href={`/${prefixAdmin}/refunds/detail/${refundDetail.refund.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: '0.875rem',
                                                    color: 'var(--palette-primary-main)',
                                                    textDecoration: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    '&:hover': { textDecoration: 'underline' },
                                                }}
                                            >
                                                #{refundDetail.refund.id}
                                                <Box component="i" className="fa-solid fa-arrow-up-right-from-square" sx={{ fontSize: 11 }} />
                                            </Box>
                                        )}
                                    </Stack>

                                    {isRefundLoading ? (
                                        <Typography variant="body2" color="text.secondary">Đang tải thông tin hoàn tiền…</Typography>
                                    ) : refundDetail ? (
                                        <Stack spacing={2.5}>
                                            <Grid container spacing={2}>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <FieldLabel>Mã yêu cầu</FieldLabel>
                                                    <Box
                                                        component="a"
                                                        href={`/${prefixAdmin}/refunds/detail/${refundDetail.refund.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: 'var(--palette-primary-main)',
                                                            textDecoration: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            '&:hover': { textDecoration: 'underline' },
                                                        }}
                                                    >
                                                        #{refundDetail.refund.id}
                                                        <Box component="i" className="fa-solid fa-arrow-up-right-from-square" sx={{ fontSize: 11 }} />
                                                    </Box>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <FieldLabel>Trạng thái hoàn tiền</FieldLabel>
                                                    <AdminStatusBadge
                                                        label={getRefundStatusLabel(refundDetail.refund.status)}
                                                        modifier={getRefundStatusAdminBadgeModifier(refundDetail.refund.status)}
                                                    />
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <FieldLabel>Số tiền hoàn</FieldLabel>
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 800,
                                                            fontSize: '1.125rem',
                                                            color: 'var(--palette-error-main, #FF4842)',
                                                        }}
                                                    >
                                                        {Number(refundDetail.refund.refundAmount || 0).toLocaleString('vi-VN')}đ
                                                    </Typography>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <FieldLabel>Loại hoàn tiền</FieldLabel>
                                                    <FieldValue>
                                                        {refundDetail.refund.refundType === RefundType.FULL_ORDER ? 'Hoàn toàn bộ đơn' : 'Hoàn một phần'}
                                                    </FieldValue>
                                                </Grid>
                                                <Grid size={{ xs: 12 }}>
                                                    <FieldLabel>Lý do hoàn tiền</FieldLabel>
                                                    <Box
                                                        sx={{
                                                            p: 1.5,
                                                            borderRadius: '8px',
                                                            bgcolor: 'var(--palette-background-neutral, #F8FAFC)',
                                                            border: '1px solid rgba(145, 158, 171, 0.16)',
                                                        }}
                                                    >
                                                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--palette-text-primary)', lineHeight: 1.6 }}>
                                                            {refundDetail.refund.refundReason || '—'}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>

                                            <Divider sx={{ borderStyle: 'dashed' }} />

                                            <Box>
                                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, mb: 1.5, color: 'var(--palette-text-primary)' }}>
                                                    Tài khoản nhận hoàn tiền
                                                </Typography>
                                                <TicketRefundBankCard
                                                    bankAccount={refundDetail.refund.bankAccount}
                                                    banks={banksData?.data}
                                                />
                                            </Box>
                                        </Stack>
                                    ) : (
                                        <Alert severity="warning">Không tải được thông tin yêu cầu hoàn tiền liên quan.</Alert>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Card 3: Thông tin đơn hàng liên quan (nếu có) */}
                        {ticket.refType === TicketRefType.ORDER && (
                            <Card sx={cardSx}>
                                <CardContent sx={{ p: 3 }}>
                                    <CardSectionTitle title="Thông tin đơn hàng liên quan" />
                                    {isOrderLoading ? (
                                        <Typography variant="body2" color="text.secondary">Đang tải thông tin đơn hàng…</Typography>
                                    ) : relatedOrder ? (
                                        <Grid container spacing={2.5}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldLabel>Mã đơn hàng</FieldLabel>
                                                <Box
                                                    component="a"
                                                    href={`/${prefixAdmin}/order/detail/${relatedOrder.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    sx={{ fontWeight: 700, color: 'var(--palette-primary-main)', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                                >
                                                    {relatedOrder.orderCode} ↗
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldLabel>Trạng thái</FieldLabel>
                                                <AdminStatusBadge
                                                    label={getOrderStatusBadge(relatedOrder.status).label}
                                                    modifier={getOrderStatusAdminBadgeModifier(relatedOrder.status)}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldLabel>Loại đơn</FieldLabel>
                                                <FieldValue>{getOrderTypeLabel(relatedOrder.orderType)}</FieldValue>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldLabel>Tổng tiền</FieldLabel>
                                                <FieldValue>{Number(relatedOrder.finalAmount || relatedOrder.totalAmount || 0).toLocaleString('vi-VN')}đ</FieldValue>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldLabel>Ngày tạo đơn</FieldLabel>
                                                <FieldValue>{dayjs(relatedOrder.createdAt).format('DD/MM/YYYY HH:mm')}</FieldValue>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <FieldLabel>Loại khiếu nại</FieldLabel>
                                                <FieldValue>{ticket.ticketCategoryName || '—'}</FieldValue>
                                            </Grid>
                                        </Grid>
                                    ) : (
                                        <Alert severity="warning">Không tải được thông tin đơn hàng liên quan.</Alert>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                </Grid>

                <Grid
                    size={{ xs: 12, lg: 7 }}
                    sx={{
                        display: 'flex',
                        minHeight: { xs: 520, lg: 'auto' },
                    }}
                >
                    <StaffComplaintTimeline
                        ticketId={ticketId}
                        status={ticket.status}
                        canResolve={canResolve}
                        isResolving={resolveMutation.isPending}
                        onResolveClick={() => setResolveOpen(true)}
                        formatSystemNote={(content) =>
                            normalizeLegacySystemNote(content, {
                                refType: ticket.refType,
                                ticketCategoryName: ticket.ticketCategoryName,
                            })
                        }
                    />
                </Grid>
            </Grid>

            <Dialog
                open={resolveOpen}
                onClose={() => !resolveMutation.isPending && setResolveOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{ className: 'admin-theme', sx: ADMIN_DIALOG_PAPER_SX }}
            >
                <DialogTitle sx={ADMIN_DIALOG_TITLE_SX}>Đánh dấu đã giải quyết</DialogTitle>
                <DialogContent sx={ADMIN_DIALOG_CONTENT_SX}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Nhập kết quả xử lý gửi đến khách hàng. Khi xác nhận, khiếu nại sẽ chuyển sang trạng thái “Đã giải quyết”.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={8}
                        label="Kết quả xử lý"
                        value={resolution}
                        onChange={(event) => setResolution(event.target.value.slice(0, 2000))}
                        helperText={`${resolution.length}/2000`}
                        placeholder="Mô tả phương án hoặc kết quả đã xử lý cho khách hàng…"
                    />
                </DialogContent>
                <DialogActions sx={ADMIN_DIALOG_ACTIONS_SX}>
                    <Button
                        variant="outlined"
                        disabled={resolveMutation.isPending}
                        onClick={() => {
                            setResolveOpen(false);
                            setResolution('');
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={!resolution.trim() || resolveMutation.isPending}
                        onClick={() => {
                            const response = resolution.trim();
                            if (!response) return;
                            resolveMutation.mutate(
                                { id: ticketId, response },
                                {
                                    onSuccess: (result) => {
                                        if (result.success) {
                                            setResolveOpen(false);
                                            setResolution('');
                                        }
                                    },
                                }
                            );
                        }}
                    >
                        {resolveMutation.isPending ? 'Đang cập nhật…' : 'Xác nhận đã giải quyết'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
