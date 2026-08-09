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
    Chip,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from 'dayjs';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../components/ui/SpinnerLoading';
import { CanAccess } from '../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { prefixAdmin } from '../../../../constants/routes';
import { StaffComplaintTimeline } from '../sections/StaffComplaintTimeline';
import {
    useAssignSupportTicket,
    useGetStaffTicketDetail,
} from '../../hooks/useSupportTicket';
import {
    findReasonComment,
    isTerminalTicketStatus,
    TicketCommentSenderRole,
    TicketRefType,
    TicketStatus,
    TICKET_REF_TYPE_LABELS,
    TICKET_STATUS_LABELS,
} from '../../../../../types/support.type';

function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.75 }}>
            {children}
        </Typography>
    );
}

function FieldValue({ children, sx }: { children: ReactNode; sx?: object }) {
    return (
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', ...sx }}>
            {children}
        </Typography>
    );
}

function CardSectionTitle({ icon, title, iconColor = '#2065D1' }: { icon: string; title: string; iconColor?: string }) {
    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
            <Icon icon={icon} width={22} style={{ color: iconColor }} />
            <Typography sx={{ fontSize: '1.05rem', fontWeight: 700 }}>{title}</Typography>
        </Stack>
    );
}

const cardSx = {
    borderRadius: 'var(--shape-borderRadius-lg)',
    boxShadow: 'var(--customShadows-card)',
} as const;

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

    const systemNotes = useMemo(
        () => (ticket?.comments || []).filter((comment) => comment.senderRole === TicketCommentSenderRole.SYSTEM),
        [ticket?.comments]
    );

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

    if (isLoading) {
        return (
            <>
                <PageHeader
                    title={`Khiếu nại #${ticketId}`}
                    breadcrumbItems={[
                        { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                        { label: 'Khiếu nại', to: `/${prefixAdmin}/support-tickets/list` },
                        { label: `#${ticketId}` },
                    ]}
                />
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
        <>
            <PageHeader
                title={`Khiếu nại #${ticket.id}`}
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                    { label: 'Khiếu nại', to: `/${prefixAdmin}/support-tickets/list` },
                    { label: `#${ticket.id}` },
                ]}
                action={
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {canAssign && (
                            <CanAccess permission={(PERMISSIONS.SUPPORT_TICKET as any).MANAGE}>
                                <Button
                                    variant="contained"
                                    disabled={assignMutation.isPending}
                                    onClick={() => assignMutation.mutate(ticketId)}
                                    startIcon={<Icon icon="mdi:account-check-outline" />}
                                >
                                    Tiếp nhận
                                </Button>
                            </CanAccess>
                        )}
                        <Button variant="outlined" onClick={() => router.push(`/${prefixAdmin}/support-tickets/list`)}>
                            Quay lại
                        </Button>
                    </Stack>
                }
            />

            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
                <Chip label={TICKET_STATUS_LABELS[ticket.status]} color="primary" variant="outlined" />
                <Typography variant="body2" color="text.secondary">
                    Tạo lúc {dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}
                </Typography>
                {ticket.dueAt && (
                    <Typography variant="body2" color={isOverdue ? 'error.main' : 'text.secondary'} fontWeight={isOverdue ? 700 : 500}>
                        Hạn xử lý: {dayjs(ticket.dueAt).format('DD/MM/YYYY HH:mm')}
                        {isOverdue ? ' (quá hạn)' : ''}
                    </Typography>
                )}
            </Stack>

            {isOverdue && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Yêu cầu này đã vượt quá thời hạn cam kết xử lý. Vui lòng ưu tiên xử lý để đảm bảo SLA.
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Stack spacing={3}>
                        <Card sx={cardSx}>
                            <CardContent>
                                <CardSectionTitle icon="mdi:file-document-outline" title="Thông tin yêu cầu" />
                                <Grid container spacing={2.5}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Danh mục</FieldLabel>
                                        <FieldValue>{ticket.ticketCategoryName || '—'}</FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Tiêu đề</FieldLabel>
                                        <FieldValue>{ticket.title}</FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <FieldLabel>Mô tả</FieldLabel>
                                        <FieldValue sx={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                                            {ticket.description}
                                        </FieldValue>
                                    </Grid>
                                    {ticket.attachmentUrl && (
                                        <Grid size={{ xs: 12 }}>
                                            <FieldLabel>Hình đính kèm</FieldLabel>
                                            <Box
                                                component="a"
                                                href={ticket.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ display: 'block', mt: 1 }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={ticket.attachmentUrl}
                                                    alt="Hình đính kèm"
                                                    sx={{
                                                        width: '100%',
                                                        maxHeight: 280,
                                                        objectFit: 'contain',
                                                        borderRadius: 2,
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: 'background.neutral',
                                                    }}
                                                />
                                            </Box>
                                        </Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>

                        <Card sx={cardSx}>
                            <CardContent>
                                <CardSectionTitle icon="mdi:link-variant" title="Liên quan đến" />
                                <Grid container spacing={2.5}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>Loại</FieldLabel>
                                        <FieldValue>
                                            {ticket.refType ? TICKET_REF_TYPE_LABELS[ticket.refType] : '—'}
                                        </FieldValue>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FieldLabel>
                                            {ticket.refType === TicketRefType.PRIZE_CLAIM
                                                ? 'Yêu cầu trả thưởng'
                                                : ticket.refType === TicketRefType.REFUND_REQUEST
                                                  ? 'Yêu cầu hoàn tiền'
                                                  : ticket.refType === TicketRefType.ORDER
                                                    ? 'Đơn hàng'
                                                    : 'Mã đối tượng'}
                                        </FieldLabel>
                                        {referenceLink ? (
                                            <Link
                                                href={`${referenceLink}${referenceLink.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(`${pathname}${searchParamsForLocation?.toString() ? `?${searchParamsForLocation.toString()}` : ""}`)}&returnLabel=${encodeURIComponent(`Quay lại khiếu nại #${ticket.id}`)}`}
                                                style={{ fontWeight: 700, color: '#2065D1' }}
                                            >
                                                {ticket.refType === TicketRefType.PRIZE_CLAIM
                                                    ? `Mở yêu cầu trả thưởng #${ticket.refId}`
                                                    : ticket.refType === TicketRefType.REFUND_REQUEST
                                                      ? `Mở yêu cầu hoàn tiền #${ticket.refId}`
                                                      : ticket.refType === TicketRefType.ORDER
                                                        ? `Mở đơn hàng #${ticket.refId}`
                                                        : `#${ticket.refId}`}
                                            </Link>
                                        ) : (
                                            <FieldValue>{ticket.refId || '—'}</FieldValue>
                                        )}
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {(reasonComment || ticket.response || ticket.resolvedAt) && (
                            <Card sx={cardSx}>
                                <CardContent>
                                    <CardSectionTitle
                                        icon={
                                            ticket.status === TicketStatus.REJECTED
                                                ? 'mdi:close-octagon-outline'
                                                : 'mdi:check-decagram-outline'
                                        }
                                        title={
                                            ticket.status === TicketStatus.REJECTED
                                                ? 'Lý do từ chối'
                                                : 'Kết quả xử lý'
                                        }
                                        iconColor={ticket.status === TicketStatus.REJECTED ? '#B71D18' : '#FF3030'}
                                    />
                                    {(reasonComment?.content || ticket.response) && (
                                        <Box sx={{ mb: 2 }}>
                                            <FieldLabel>
                                                {ticket.status === TicketStatus.REJECTED
                                                    ? 'Nội dung từ chối'
                                                    : 'Lý do giải quyết (nội bộ)'}
                                            </FieldLabel>
                                            <FieldValue sx={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                                                {reasonComment?.content || ticket.response}
                                            </FieldValue>
                                        </Box>
                                    )}
                                    {ticket.resolvedAt && (
                                        <Box>
                                            <FieldLabel>
                                                {ticket.status === TicketStatus.REJECTED
                                                    ? 'Thời gian từ chối'
                                                    : 'Thời gian giải quyết'}
                                            </FieldLabel>
                                            <FieldValue>
                                                {dayjs(ticket.resolvedAt).format('DD/MM/YYYY HH:mm')}
                                            </FieldValue>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <Stack spacing={3}>
                        <Card sx={cardSx}>
                            <CardContent>
                                <CardSectionTitle icon="mdi:account-outline" title="Khách hàng" />
                                <FieldLabel>Họ tên</FieldLabel>
                                <FieldValue>{ticket.customerName || '—'}</FieldValue>
                                <Box sx={{ mt: 2 }}>
                                    <FieldLabel>Mã khách hàng</FieldLabel>
                                    <FieldValue sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                                        {ticket.customerId}
                                    </FieldValue>
                                </Box>
                            </CardContent>
                        </Card>

                        <Card sx={cardSx}>
                            <CardContent>
                                <CardSectionTitle icon="mdi:headset" title="Phân công xử lý" />
                                <FieldLabel>Người tiếp nhận</FieldLabel>
                                <FieldValue>{ticket.assignedToName || 'Chưa tiếp nhận'}</FieldValue>
                                {ticket.assignedTo && (
                                    <Box sx={{ mt: 2 }}>
                                        <FieldLabel>Mã nhân viên</FieldLabel>
                                        <FieldValue sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                                            {ticket.assignedTo}
                                        </FieldValue>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        <Card sx={cardSx}>
                            <CardContent>
                                <CardSectionTitle icon="mdi:clock-alert-outline" title="Cam kết xử lý (SLA)" />
                                <FieldLabel>Hạn xử lý</FieldLabel>
                                <FieldValue sx={{ color: isOverdue ? 'error.main' : 'text.primary' }}>
                                    {ticket.dueAt ? dayjs(ticket.dueAt).format('DD/MM/YYYY HH:mm') : '—'}
                                </FieldValue>
                                <Box sx={{ mt: 2 }}>
                                    <FieldLabel>Cập nhật lần cuối</FieldLabel>
                                    <FieldValue>{dayjs(ticket.updatedAt).format('DD/MM/YYYY HH:mm')}</FieldValue>
                                </Box>
                            </CardContent>
                        </Card>

                        {systemNotes.length > 0 && (
                            <Card sx={cardSx}>
                                <CardContent>
                                    <CardSectionTitle icon="mdi:history" title="Ghi chú hệ thống" />
                                    <Stack spacing={1.5}>
                                        {systemNotes.map((note) => (
                                            <Box
                                                key={note.id}
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 1.5,
                                                    bgcolor: 'background.neutral',
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                <Typography variant="body2">
                                                    {normalizeLegacySystemNote(note.content, {
                                                        refType: ticket.refType,
                                                        ticketCategoryName: ticket.ticketCategoryName,
                                                    })}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {dayjs(note.createdAt).format('DD/MM/YYYY HH:mm')}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                </Grid>
            </Grid>

            <StaffComplaintTimeline ticketId={ticketId} status={ticket.status} />
        </>
    );
};
