"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "@/admin/components/navigation/AdminLink";
import { useMemo, type ReactNode } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
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
} from '../../hooks/useSupportTicket';
import {
    findReasonComment,
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

function CardSectionTitle({ title }: { title: string }) {
    return (
        <Typography
            sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--palette-text-primary)',
                mb: 2.5,
            }}
        >
            {title}
        </Typography>
    );
}

const cardSx = {
    borderRadius: 'var(--shape-borderRadius-lg)',
    boxShadow: 'var(--customShadows-card)',
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
    const marker = 'đã tiếp nhận ticket';
    if (!content.toLowerCase().includes(marker)) {
        return content;
    }

    const markerIndex = content.toLowerCase().indexOf(marker);
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
    const pathname = usePathname() ?? '';
    const searchParamsForLocation = useSearchParams();
    const ticketId = Number(id);

    const { data, isLoading, isError } = useGetStaffTicketDetail(ticketId);
    const assignMutation = useAssignSupportTicket();

    const ticket = data?.data;

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
    const referenceLink = buildReferenceLink(ticket?.refType, ticket?.refId, ticket?.id);

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

    const relatedHref = referenceLink
        ? `${referenceLink}${referenceLink.includes('?') ? '&' : '?'}returnTo=${encodeURIComponent(
              `${pathname}${searchParamsForLocation?.toString() ? `?${searchParamsForLocation.toString()}` : ''}`
          )}&returnLabel=${encodeURIComponent(`Quay lại khiếu nại #${ticket.id}`)}`
        : null;

    const relatedLabel =
        ticket.refType === TicketRefType.PRIZE_CLAIM
            ? `#${ticket.refId}`
            : ticket.refType === TicketRefType.REFUND_REQUEST
              ? `#${ticket.refId}`
              : ticket.refType === TicketRefType.ORDER
                ? `#${ticket.refId}`
                : ticket.refId || '—';

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
                <Grid size={{ xs: 12, lg: 6 }} sx={{ display: 'flex' }}>
                    <Stack spacing={3} sx={{ flex: 1, width: '100%' }}>
                        <Card sx={cardSx}>
                            <CardContent sx={{ p: 3 }}>
                                <CardSectionTitle title="Thông tin khiếu nại" />
                                <Grid container spacing={2.5}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Danh mục</FieldLabel>
                                        <FieldValue>{ticket.ticketCategoryName || '—'}</FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>
                                            {ticket.refType ? TICKET_REF_TYPE_LABELS[ticket.refType] : 'Liên quan'}
                                        </FieldLabel>
                                        {relatedHref ? (
                                            <Link href={relatedHref} style={{ fontWeight: 700 }}>
                                                {relatedLabel}
                                            </Link>
                                        ) : (
                                            <FieldValue>{ticket.refId || '—'}</FieldValue>
                                        )}
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <FieldLabel>Mô tả</FieldLabel>
                                        <FieldValue sx={{ whiteSpace: 'pre-wrap', fontWeight: 500, lineHeight: 1.7 }}>
                                            {ticket.description}
                                        </FieldValue>
                                    </Grid>
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
                                                    mt: 0.25,
                                                    textDecoration: 'none',
                                                    color: 'var(--palette-text-primary)',
                                                    '&:hover': { textDecoration: 'underline' },
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={ticket.attachmentUrl}
                                                    alt=""
                                                    sx={{
                                                        width: 48,
                                                        height: 48,
                                                        objectFit: 'cover',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--palette-divider)',
                                                        bgcolor: 'var(--palette-background-neutral)',
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    Xem tệp
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <FieldValue sx={{ fontWeight: 500, color: 'var(--palette-text-secondary)' }}>
                                                Không có
                                            </FieldValue>
                                        )}
                                    </Grid>
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
                                </Grid>
                            </CardContent>
                        </Card>

                        {(reasonComment || ticket.response || ticket.resolvedAt) && (
                            <Card sx={cardSx}>
                                <CardContent sx={{ p: 3 }}>
                                    <CardSectionTitle
                                        title={
                                            ticket.status === TicketStatus.REJECTED
                                                ? 'Lý do từ chối'
                                                : 'Kết quả xử lý'
                                        }
                                    />
                                    {(reasonComment?.content || ticket.response) && (
                                        <Box sx={{ mb: ticket.resolvedAt ? 2 : 0 }}>
                                            <FieldValue sx={{ whiteSpace: 'pre-wrap', fontWeight: 500, lineHeight: 1.7 }}>
                                                {reasonComment?.content || ticket.response}
                                            </FieldValue>
                                        </Box>
                                    )}
                                    {ticket.resolvedAt && (
                                        <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)' }}>
                                            {dayjs(ticket.resolvedAt).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                </Grid>

                <Grid
                    size={{ xs: 12, lg: 6 }}
                    sx={{
                        display: 'flex',
                        height: { xs: 'min(70dvh, 640px)', lg: 'calc(100dvh - 240px)' },
                        maxHeight: { xs: 'min(70dvh, 640px)', lg: 'calc(100dvh - 240px)' },
                        alignSelf: { lg: 'flex-start' },
                    }}
                >
                    <StaffComplaintTimeline
                        ticketId={ticketId}
                        status={ticket.status}
                        formatSystemNote={(content) =>
                            normalizeLegacySystemNote(content, {
                                refType: ticket.refType,
                                ticketCategoryName: ticket.ticketCategoryName,
                            })
                        }
                    />
                </Grid>
            </Grid>
        </Box>
    );
};
