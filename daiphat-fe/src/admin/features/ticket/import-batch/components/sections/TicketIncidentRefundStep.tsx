import React, { useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Chip,
    CircularProgress,
    Link as MuiLink,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Link as RouterLink } from '@/components/router-compat';
import dayjs from 'dayjs';
import { useQueries } from '@tanstack/react-query';
import { getOrderDetail } from '../../../../orders/services/orderService';
import { getOrderStatusBadge } from '../../../../orders/constants/orderStatus.constants';
import { prefixAdmin } from '../../../../../constants/routes';
import { OrderDetailStatus } from '../../../../../../types/order.type';
import {
    formatRefundCurrency,
    ORDER_CANCEL_REASON_DEFAULTS,
} from '../../../../../../types/refund.type';
import {
    buildOrderDetailLineViews,
    canFullyCancelOrderForIncidents,
    countScopedRefundSerials,
    isOrderAwaitingPayment,
    isOrderCancelled,
    ORDER_RECEIVE_TYPE_LABELS,
    ORDER_TYPE_LABELS,
    resolveIncidentOrderRefundAmount,
    resolveOrderDetailIdForIncident,
    resolveOrderPaymentLabel,
} from '../../utils/orderIncidentRefund.utils';

export type RefundIncidentDraft = {
    orderDetailId: number;
    serialId: number;
    serialNumber?: string;
    ticketNumbers?: string;
    reason: 'DAMAGED' | 'LOST';
    damagedReason?: string;
    damagedEvidenceUrl?: string;
};

export type RefundOrderDraft = {
    cancelReason: string;
    incidents: RefundIncidentDraft[];
    orderCode?: string;
    orderStatus?: string;
    refundAmount?: number;
    activeDetailCount?: number;
    canFullOrderCancel?: boolean;
    customerName?: string;
    customerPhone?: string;
    orderType?: string;
    receiveType?: string;
    createdAt?: string;
    totalAmount?: number;
    expectedPickupAt?: string;
    paymentStatusLabel?: string;
    ticketLineCount?: number;
    incidentSerialValue?: number;
};

type IncidentItem = {
    id: number;
    serialNumber?: string;
    ticketNumbers?: string;
    status: 'DAMAGED' | 'LOST' | 'VOIDED';
    damagedReason?: string;
    damagedEvidenceUrl?: string;
    reservedByOrderId?: string;
};

type Props = {
    incidentItems: IncidentItem[];
    refundDraftByOrderId: Record<string, RefundOrderDraft>;
    onRefundDraftChange: (orderId: string, patch: Partial<RefundOrderDraft>) => void;
    onSyncOrderDrafts: (drafts: Record<string, RefundOrderDraft>) => void;
};

const OrderInfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block' }}>
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={700} color="#0f172a">
            {value || '—'}
        </Typography>
    </Box>
);

export const TicketIncidentRefundStep: React.FC<Props> = ({
    incidentItems,
    refundDraftByOrderId,
    onRefundDraftChange,
    onSyncOrderDrafts,
}) => {
    const orderIds = useMemo(() => {
        const ids = new Set<string>();
        incidentItems.forEach((item) => {
            if (item.reservedByOrderId) ids.add(String(item.reservedByOrderId));
        });
        return Array.from(ids);
    }, [incidentItems]);

    const orderQueries = useQueries({
        queries: orderIds.map((orderId) => ({
            queryKey: ['order-detail-refund-prep', orderId],
            queryFn: () => getOrderDetail(orderId),
            enabled: !!orderId,
            staleTime: 0,
            refetchOnMount: 'always' as const,
            refetchOnWindowFocus: true,
        })),
    });

    const isLoading = orderQueries.some((q) => q.isLoading || q.isFetching);
    const ordersById = useMemo(() => {
        const map: Record<string, any> = {};
        orderQueries.forEach((query, index) => {
            const orderId = orderIds[index];
            if (orderId && query.data?.data) {
                map[orderId] = query.data.data;
            }
        });
        return map;
    }, [orderQueries, orderIds]);

    const ordersLoadedKey = useMemo(
        () =>
            orderIds
                .filter((id) => ordersById[id])
                .map((id) => {
                    const order = ordersById[id];
                    return [
                        id,
                        order?.orderCode ?? '',
                        order?.status ?? '',
                        order?.updatedAt ?? '',
                        order?.totalAmount ?? '',
                    ].join(':');
                })
                .join('|'),
        [orderIds, ordersById]
    );

    const incidentKey = useMemo(
        () =>
            incidentItems
                .map(
                    (item) =>
                        `${item.id}:${item.status}:${item.damagedReason ?? ''}:${item.damagedEvidenceUrl ?? ''}`
                )
                .join('|'),
        [incidentItems]
    );

    const lastSyncKeyRef = useRef('');

    useEffect(() => {
        if (orderIds.length === 0) return;
        if (!ordersLoadedKey) return;

        const syncKey = `${ordersLoadedKey}::${incidentKey}`;
        if (lastSyncKeyRef.current === syncKey) return;

        const nextDrafts: Record<string, RefundOrderDraft> = { ...refundDraftByOrderId };

        orderIds.forEach((orderId) => {
            const order = ordersById[orderId];
            if (!order) return;

            const itemsForOrder = incidentItems.filter(
                (item) => String(item.reservedByOrderId) === orderId
            );
            const activeDetails = (order?.orderDetails || []).filter(
                (d: any) => d?.status === OrderDetailStatus.ACTIVE || d?.status === 'ACTIVE'
            );

            const incidents: RefundIncidentDraft[] = itemsForOrder.map((item) => {
                const matchedDetail = (order?.orderDetails || []).find(
                    (detail: any) =>
                        resolveOrderDetailIdForIncident(detail, item.id, item.ticketNumbers) != null
                );
                const orderDetailId = matchedDetail
                    ? resolveOrderDetailIdForIncident(matchedDetail, item.id, item.ticketNumbers) ?? 0
                    : 0;

                return {
                    orderDetailId,
                    serialId: item.id,
                    serialNumber: item.serialNumber,
                    ticketNumbers: item.ticketNumbers,
                    reason: item.status === 'LOST' ? 'LOST' : 'DAMAGED',
                    damagedReason: item.damagedReason,
                    damagedEvidenceUrl: item.damagedEvidenceUrl || undefined,
                };
            });

            const lineViews = buildOrderDetailLineViews(order, incidents);
            const canFullOrderCancel = canFullyCancelOrderForIncidents(order, incidents);
            const refundAmount = resolveIncidentOrderRefundAmount(order, incidents);
            const needsRefundReason = canFullOrderCancel || refundAmount > 0;

            nextDrafts[orderId] = {
                cancelReason: needsRefundReason
                    ? refundDraftByOrderId[orderId]?.cancelReason ||
                      ORDER_CANCEL_REASON_DEFAULTS.OUT_OF_STOCK_INCIDENT
                    : '',
                incidents,
                orderCode: order?.orderCode,
                orderStatus: order?.status,
                refundAmount,
                activeDetailCount: activeDetails.length,
                canFullOrderCancel,
                customerName: order?.name,
                customerPhone: order?.phone,
                orderType: order?.orderType,
                receiveType: order?.receiveType,
                createdAt: order?.createdAt,
                totalAmount: order?.totalAmount,
                expectedPickupAt: order?.expectedPickupAt,
                paymentStatusLabel: resolveOrderPaymentLabel(order) ?? undefined,
                ticketLineCount: lineViews.length,
                incidentSerialValue: refundAmount,
            };
        });

        lastSyncKeyRef.current = syncKey;
        onSyncOrderDrafts(nextDrafts);
    }, [ordersLoadedKey, incidentKey, orderIds, ordersById, incidentItems, onSyncOrderDrafts, refundDraftByOrderId]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    return (
        <Stack spacing={2} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                Tạo đơn hoàn tiền cho vé đang giao dịch
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Các sê-ri RESERVED / PROXY_HOLDING cần xử lý theo đơn trước khi xác nhận báo sự cố. Chỉ tính các
                sê-ri thực sự được phân bổ trên order-detail. Đơn đã thanh toán: tạo yêu cầu hoàn tiền cho đúng các
                vé sự cố (không hủy đơn trừ khi đây là vé cuối). Đơn chưa thanh toán chỉ giải phóng giữ chỗ, không
                hoàn tiền.
            </Typography>

            {orderIds.map((orderId) => {
                const draft = refundDraftByOrderId[orderId];
                const order = ordersById[orderId];
                if (!draft) return null;

                const lineViews = buildOrderDetailLineViews(order, draft.incidents);
                const scopedSerialCount = countScopedRefundSerials(lineViews);
                const liveOrderStatus = order?.status || draft.orderStatus;
                const awaitingPayment = isOrderAwaitingPayment(order);
                const orderCancelled = isOrderCancelled(order);
                const missingDetail = draft.incidents.some((inc) => !inc.orderDetailId);
                const unmappedIncidentCount = draft.incidents.filter((inc) => {
                    if (!inc.orderDetailId) return true;
                    return !lineViews.some((line) =>
                        line.serials.some((serial) => serial.id === inc.serialId)
                    );
                }).length;
                const statusBadge = getOrderStatusBadge(liveOrderStatus);
                const orderTypeLabel =
                    ORDER_TYPE_LABELS[order?.orderType || draft.orderType || ''] ||
                    order?.orderType ||
                    draft.orderType ||
                    '—';
                const receiveTypeLabel =
                    ORDER_RECEIVE_TYPE_LABELS[order?.receiveType || draft.receiveType || ''] ||
                    order?.receiveType ||
                    draft.receiveType ||
                    '—';
                // Always derive from live order payload — never trust stale draft.refundAmount/orderStatus.
                const fullRefundAmount = resolveIncidentOrderRefundAmount(order, draft.incidents);
                const paymentLabel = resolveOrderPaymentLabel(order) || '—';

                return (
                    <Paper
                        key={orderId}
                        variant="outlined"
                        sx={{ p: 2, borderRadius: '12px', borderColor: '#fecaca', bgcolor: '#fff' }}
                    >
                        <Stack spacing={1.5}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={1}
                            >
                                <Stack spacing={0.5}>
                                    <MuiLink
                                        component={RouterLink}
                                        to={`/${prefixAdmin}/order/detail/${orderId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        underline="hover"
                                        sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}
                                    >
                                        {draft.orderCode || orderId}
                                    </MuiLink>
                                    <Typography variant="caption" color="text.secondary">
                                        Mã nội bộ: {orderId}
                                    </Typography>
                                </Stack>
                                <Chip
                                    label={statusBadge.label}
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '0.7rem',
                                        color: statusBadge.color,
                                        bgcolor: statusBadge.bg,
                                    }}
                                />
                            </Stack>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                    gap: 1.25,
                                    p: 1.25,
                                    borderRadius: '8px',
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                }}
                            >
                                <OrderInfoRow
                                    label="Người đặt"
                                    value={
                                        draft.customerName || order?.name
                                            ? `${draft.customerName || order?.name}${
                                                  (draft.customerPhone || order?.phone)
                                                      ? ` · ${draft.customerPhone || order?.phone}`
                                                      : ''
                                              }`
                                            : '—'
                                    }
                                />
                                <OrderInfoRow
                                    label="Thời gian đặt"
                                    value={
                                        draft.createdAt || order?.createdAt
                                            ? dayjs(draft.createdAt || order?.createdAt).format(
                                                  'DD/MM/YYYY HH:mm'
                                              )
                                            : '—'
                                    }
                                />
                                <OrderInfoRow label="Loại đơn" value={orderTypeLabel} />
                                <OrderInfoRow label="Hình thức nhận" value={receiveTypeLabel} />
                                <OrderInfoRow
                                    label="Tổng giá trị đơn"
                                    value={formatRefundCurrency(
                                        draft.totalAmount ?? order?.totalAmount ?? 0
                                    )}
                                />
                                <OrderInfoRow
                                    label="Thanh toán"
                                    value={paymentLabel}
                                />
                                <OrderInfoRow
                                    label="Dự kiến nhận vé"
                                    value={
                                        order?.expectedPickupAt || draft.expectedPickupAt
                                            ? dayjs(
                                                  order?.expectedPickupAt || draft.expectedPickupAt
                                              ).format('DD/MM/YYYY HH:mm')
                                            : '—'
                                    }
                                />
                                <OrderInfoRow
                                    label="Số dòng vé cần hoàn"
                                    value={String(lineViews.length)}
                                />
                            </Box>

                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: '8px',
                                    bgcolor: awaitingPayment || orderCancelled ? '#f8fafc' : '#fffbeb',
                                    border:
                                        awaitingPayment || orderCancelled
                                            ? '1px solid #e2e8f0'
                                            : '1px solid #fde68a',
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    fontWeight={800}
                                    color={awaitingPayment || orderCancelled ? '#475569' : '#b45309'}
                                >
                                    Tổng tiền hoàn dự kiến:{' '}
                                    {formatRefundCurrency(fullRefundAmount)}
                                </Typography>
                                {orderCancelled ? (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                                        Đơn đang ở trạng thái <b>Đã hủy</b> (khớp danh sách đơn hàng). Không tạo thêm
                                        khoản hoàn từ bước này.
                                    </Typography>
                                ) : awaitingPayment ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        Đơn đang <b>Chờ thanh toán</b> — chưa thu tiền khách, chỉ giải phóng giữ chỗ /
                                        cập nhật sê-ri sự cố (không tạo khoản hoàn).
                                    </Typography>
                                ) : (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        = đơn giá × số sê-ri đã map trên order-detail (
                                        {scopedSerialCount} sê-ri · {lineViews.length} dòng vé).
                                    </Typography>
                                )}
                            </Box>

                            {draft.canFullOrderCancel && !orderCancelled && (
                                <Typography variant="caption" color="success.main" fontWeight={600}>
                                    Đây là (các) sê-ri cuối còn hiệu lực trên đơn — sẽ hủy đơn và tạo hoàn
                                    tiền khi xác nhận.
                                </Typography>
                            )}
                            {!draft.canFullOrderCancel && !awaitingPayment && !orderCancelled && fullRefundAmount > 0 && (
                                <Typography variant="caption" color="warning.dark" fontWeight={600}>
                                    Sê-ri sự cố chưa phải vé cuối trên đơn — sẽ tạo đơn hoàn tiền cho đúng các vé
                                    này (thông báo hủy/hoàn từng vé), không hủy toàn bộ đơn hàng.
                                </Typography>
                            )}
                            {!draft.canFullOrderCancel && !awaitingPayment && !orderCancelled && fullRefundAmount <= 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    Không phát sinh khoản hoàn từ các sê-ri đã map — chỉ cập nhật trạng thái sự cố.
                                </Typography>
                            )}

                            {(missingDetail || unmappedIncidentCount > 0) && (
                                <Typography variant="caption" color="error" fontWeight={600}>
                                    Có {unmappedIncidentCount || draft.incidents.filter((i) => !i.orderDetailId).length}{' '}
                                    sê-ri sự cố chưa map đúng allocated serial trên đơn — đã loại khỏi tiền hoàn.
                                </Typography>
                            )}

                            <Stack spacing={1.25}>
                                <Typography variant="caption" fontWeight={800} color="#0f172a">
                                    Chi tiết dòng vé & sê-ri cần hoàn
                                </Typography>
                                {lineViews.length === 0 ? (
                                    <Typography variant="caption" color="error" fontWeight={600}>
                                        Chưa map được order-detail / sê-ri cần hoàn từ đơn hàng.
                                    </Typography>
                                ) : null}
                                {lineViews.map((line) => (
                                    <Paper
                                        key={line.orderDetailId || line.numbers}
                                        variant="outlined"
                                        sx={{
                                            borderRadius: '8px',
                                            borderColor: line.incidentSerialCount > 0 ? '#fecaca' : '#e2e8f0',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                px: 1.25,
                                                py: 1,
                                                bgcolor: line.incidentSerialCount > 0 ? '#fef2f2' : '#f8fafc',
                                                borderBottom: '1px solid #e2e8f0',
                                            }}
                                        >
                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                justifyContent="space-between"
                                                spacing={0.75}
                                            >
                                                <Stack spacing={0.25}>
                                                    <Typography variant="body2" fontWeight={800}>
                                                        Dãy số {line.numbers || '—'}
                                                        {line.stationName ? ` · ${line.stationName}` : ''}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {line.drawDate
                                                            ? `Ngày quay: ${dayjs(line.drawDate).format('DD/MM/YYYY')}`
                                                            : 'Ngày quay: —'}
                                                        {' · '}
                                                        SL {line.quantity} × {formatRefundCurrency(line.unitPrice)}
                                                        {' · '}
                                                        Dòng: {formatRefundCurrency(line.lineSubtotal)}
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.75} alignItems="center">
                                                    <Chip
                                                        size="small"
                                                        label={line.status || '—'}
                                                        sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                                                    />
                                                    {line.incidentSerialCount > 0 && (
                                                        <Chip
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                            label={`${line.incidentSerialCount} sê-ri sự cố`}
                                                            sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                                                        />
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Box>

                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>
                                                            Sê-ri
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>
                                                            Trạng thái sê-ri
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>
                                                            Đơn giá
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>
                                                            Báo sự cố
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>
                                                            Lý do / Ảnh MC
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {line.serials.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Chưa có sê-ri phân bổ trên dòng này.
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        line.serials.map((serial) => (
                                                            <TableRow
                                                                key={serial.id}
                                                                sx={{
                                                                    bgcolor: serial.isIncident
                                                                        ? 'rgba(254, 226, 226, 0.45)'
                                                                        : undefined,
                                                                }}
                                                            >
                                                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                                        {serial.ticketImg ? (
                                                                            <Box
                                                                                component="img"
                                                                                src={serial.ticketImg}
                                                                                alt=""
                                                                                sx={{
                                                                                    width: 28,
                                                                                    height: 28,
                                                                                    borderRadius: '4px',
                                                                                    objectFit: 'cover',
                                                                                }}
                                                                            />
                                                                        ) : null}
                                                                        <Box>
                                                                            {serial.serialNumber || serial.id}
                                                                            <Typography
                                                                                variant="caption"
                                                                                color="text.secondary"
                                                                                sx={{ display: 'block' }}
                                                                            >
                                                                                ID {serial.id}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Stack>
                                                                </TableCell>
                                                                <TableCell sx={{ fontSize: '0.75rem' }}>
                                                                    {serial.statusDisplayName ||
                                                                        serial.status ||
                                                                        '—'}
                                                                </TableCell>
                                                                <TableCell sx={{ fontSize: '0.75rem' }}>
                                                                    {formatRefundCurrency(line.unitPrice)}
                                                                </TableCell>
                                                                <TableCell sx={{ fontSize: '0.75rem' }}>
                                                                    {serial.isIncident ? (
                                                                        <Chip
                                                                            size="small"
                                                                            color="error"
                                                                            label={serial.incidentReason || 'Sự cố'}
                                                                            sx={{
                                                                                fontWeight: 700,
                                                                                fontSize: '0.65rem',
                                                                                height: 22,
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Trong đơn
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell sx={{ fontSize: '0.75rem', maxWidth: 180 }}>
                                                                    {serial.isIncident ? (
                                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                                            <Typography variant="caption">
                                                                                {serial.damagedReason || '—'}
                                                                            </Typography>
                                                                            {serial.damagedEvidenceUrl ? (
                                                                                <Box
                                                                                    component="img"
                                                                                    src={serial.damagedEvidenceUrl}
                                                                                    alt="MC"
                                                                                    sx={{
                                                                                        width: 32,
                                                                                        height: 32,
                                                                                        borderRadius: '4px',
                                                                                        objectFit: 'cover',
                                                                                    }}
                                                                                />
                                                                            ) : null}
                                                                        </Stack>
                                                                    ) : (
                                                                        '—'
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Paper>
                                ))}
                            </Stack>

                            {(draft.canFullOrderCancel || fullRefundAmount > 0) &&
                                !orderCancelled &&
                                !awaitingPayment && (
                                <TextField
                                    label={
                                        draft.canFullOrderCancel
                                            ? 'Lý do hủy / hoàn tiền'
                                            : 'Lý do hoàn tiền (các vé sự cố)'
                                    }
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    size="small"
                                    value={draft.cancelReason}
                                    onChange={(e) =>
                                        onRefundDraftChange(orderId, {
                                            cancelReason: e.target.value.slice(0, 500),
                                        })
                                    }
                                    helperText={
                                        draft.canFullOrderCancel
                                            ? 'Được điền sẵn theo sự cố kho — có thể chỉnh trước khi xác nhận hủy đơn.'
                                            : 'Dùng khi tạo yêu cầu hoàn tiền từng phần — đơn hàng vẫn giữ các vé còn lại.'
                                    }
                                />
                            )}
                        </Stack>
                    </Paper>
                );
            })}
        </Stack>
    );
};
