"use client";
import React, { useState, useMemo } from "react";

import {
    Alert,
    Box,
    Checkbox,
    Chip,
    Divider,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Button } from "../../../../components/ui/Button";
import { AdminTicketCard } from "../../../../components/ui/AdminTicketCard";
import {
    StreetAgentProfile,
    VendorAllocationAllocatedSerial,
    VendorAllocationBatch,
    VendorSettlementPreview,
} from "../../types/street-agent.type";
import { ALLOCATION_BATCH_STATUS_LABELS } from "../configs/constants";
import {
    formatCommission,
    formatCurrency,
    formatDate,
    formatDateTime,
} from "../../utils/format";
import {
    VENDOR_LATE_RETURN_POLICY_LABELS,
    VendorLateReturnPolicyValue,
} from "../../hooks/useVendorSettingsDefaults";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

const latePolicyLabel = (policy?: string | null) => {
    if (!policy) return "—";
    return (
        VENDOR_LATE_RETURN_POLICY_LABELS[policy as VendorLateReturnPolicyValue] || policy
    );
};

export const DetailRow = ({ label, value, description }: { label: React.ReactNode; value: React.ReactNode; description?: React.ReactNode }) => (
    <Stack spacing={0.25}>
        <Stack direction="row" justifyContent="space-between" gap={2}>
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
                {value}
            </Typography>
        </Stack>
        {description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {description}
            </Typography>
        )}
    </Stack>
);

const settlementStatusLabel = (status: string) => {
    if (status === "HANDED_OVER" || status === "CONFIRMED") return "Chưa quyết toán — chờ mở phiên trả";
    if (status === "RETURN_OPEN") return "Đang nhận trả";
    if (status === "SETTLED") return "Đúng hạn";
    if (status === "LATE_SETTLED") return "Trễ hạn";
    if (status === "CANCELLED" || status === "EXPIRED" || status === "DRAFT") return "Không áp dụng";
    return "Chưa quyết toán";
};

const profileLabel = (p?: StreetAgentProfile | null) => {
    if (!p) return "—";
    const name = `${p.lastName || ""} ${p.firstName || ""}`.trim();
    return name + (p.phone ? ` — ${p.phone}` : "");
};

export const VendorBatchInfoSection = ({
    batch,
    profile,
}: {
    batch: VendorAllocationBatch;
    profile?: StreetAgentProfile | null;
}) => {
    const showCutoffSummary = batch.status === "HANDED_OVER" || batch.status === "CONFIRMED" || batch.status === "RETURN_OPEN";
    return (
        <Stack spacing={1}>
            {showCutoffSummary && batch.returnCutoffSnapshot && (
                <Alert severity="info" sx={{ mb: 1, py: 0.5, px: 1.5 }} icon={false}>
                    <Typography variant="subtitle2" sx={{ color: "info.dark" }}>
                        Hạn trả vendor: {batch.returnCutoffSnapshot}
                    </Typography>
                    {(batch.supplierReturnCutoffSnapshot || batch.returnBufferMinutesSnapshot != null) && (
                        <Typography variant="caption" sx={{ color: "info.main", display: "block", mt: 0.25 }}>
                            Giờ chót gốc: {batch.supplierReturnCutoffSnapshot || "—"} · Buffer chuẩn bị: {batch.returnBufferMinutesSnapshot ?? 0} phút
                        </Typography>
                    )}
                </Alert>
            )}
            <Typography variant="subtitle2">Thông tin phiếu</Typography>
            <Typography>
                <strong>Mã:</strong> {batch.batchCode}
            </Typography>
            <Typography>
                <strong>Trạng thái:</strong>{" "}
                {ALLOCATION_BATCH_STATUS_LABELS[batch.status] || batch.status}
            </Typography>
            <Typography>
                <strong>Trạng thái quyết toán:</strong> {settlementStatusLabel(batch.status)}
            </Typography>
            <Typography>
                <strong>Ngày KD:</strong> {formatDate(batch.businessDate)}
            </Typography>
            <Typography>
                <strong>Đại lý:</strong> {profileLabel(profile)}
            </Typography>
            <DetailRow label="Đã giao" value={String(batch.allocatedQuantity)} />
            <DetailRow
                label="Đã trả"
                value={<Typography component="span" variant="body2" sx={{ fontWeight: 600, color: batch.returnedQuantity ? 'inherit' : 'text.secondary' }}>{String(batch.returnedQuantity ?? 0)}</Typography>}
            />
            <DetailRow
                label="Đã bán"
                value={<Typography component="span" variant="body2" sx={{ fontWeight: 600, color: batch.soldQuantity ? 'inherit' : 'text.secondary' }}>{String(batch.soldQuantity ?? 0)}</Typography>}
            />
            {(batch.agentSettlementId != null || batch.dailySalesReportId != null) && (
                <>
                    <DetailRow
                        label="Settlement ID"
                        value={batch.agentSettlementId != null ? String(batch.agentSettlementId) : "—"}
                    />
                    <DetailRow
                        label="Daily report ID"
                        value={
                            batch.dailySalesReportId != null
                                ? String(batch.dailySalesReportId)
                                : "—"
                        }
                    />
                </>
            )}
        </Stack>
    );
};

export const VendorBatchDepositSnapshotSection = ({
    batch,
}: {
    batch: VendorAllocationBatch;
}) => (
    <Stack spacing={1}>
        <Typography variant="subtitle2">Cọc & tài chính</Typography>
        <DetailRow label="Cọc cần thu" value={formatCurrency(batch.depositRequiredAmount)} />
        <DetailRow label="Cọc thực nhận" value={formatCurrency(batch.depositReceivedAmount)} />
        {batch.depositReceivedAt && (
            <DetailRow label="Nhận cọc lúc" value={formatDateTime(batch.depositReceivedAt)} />
        )}
        {batch.settledAt && (
            <DetailRow label="Quyết toán lúc" value={formatDateTime(batch.settledAt)} />
        )}

        <Accordion elevation={0} disableGutters sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mt: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 32, '& .MuiAccordionSummary-content': { my: 0 } }}>
                <Typography variant="body2" color="text.secondary">Xem chi tiết snapshot cấu hình</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 1, pb: 0 }}>
                <Stack spacing={1}>
                    <DetailRow label="Mệnh giá snapshot" value={formatCurrency(batch.faceValueSnapshot)} />
                    <DetailRow
                        label="Giá vendor snapshot"
                        value={formatCurrency(batch.vendorUnitPriceSnapshot)}
                    />
                    <DetailRow
                        label="Tỷ lệ cọc snapshot"
                        value={formatCommission(batch.depositRateSnapshot)}
                    />
                    <DetailRow label="Số dư cọc trước" value={formatCurrency(batch.depositBalanceBefore)} />
                    <DetailRow label="Số dư cọc sau" value={formatCurrency(batch.depositBalanceAfter)} />
                    <DetailRow
                        label="Hạn trả vendor"
                        value={batch.returnCutoffSnapshot || "—"}
                        description="(Hạn chót vendor cần trả vé sau khi trừ thời gian đệm chuẩn bị)"
                    />
                    <DetailRow label="Policy trả trễ" value={latePolicyLabel(batch.latePolicySnapshot)} />
                    {batch.reservationExpiresAt && batch.status === "DRAFT" && (
                        <DetailRow
                            label="Hết hạn giữ"
                            value={formatDateTime(batch.reservationExpiresAt)}
                        />
                    )}
                </Stack>
            </AccordionDetails>
        </Accordion>
    </Stack>
);

export const VendorSettlementBreakdown = ({
    allocatedQuantity,
    returnedQuantity,
    soldQuantity,
    grossCashRemitted,
    commissionPayable,
    agencyNetSalesAmount,
    depositRefundAmount,
    depositForfeitedAmount,
    depositAppliedAmount,
    depositExcessRefundAmount,
    forcedPurchaseAmount,
    additionalAmountDue,
    late,
    latePolicySnapshot,
}: {
    allocatedQuantity?: number | null;
    returnedQuantity?: number | null;
    soldQuantity?: number | null;
    grossCashRemitted?: number | null;
    commissionPayable?: number | null;
    agencyNetSalesAmount?: number | null;
    depositRefundAmount?: number | null;
    depositForfeitedAmount?: number | null;
    depositAppliedAmount?: number | null;
    depositExcessRefundAmount?: number | null;
    forcedPurchaseAmount?: number | null;
    additionalAmountDue?: number | null;
    late?: boolean | null;
    latePolicySnapshot?: string | null;
}) => (
    <Stack spacing={1}>
        <DetailRow label="Tổng vé giao" value={String(allocatedQuantity ?? "—")} />
        <DetailRow label="Vé đã trả" value={String(returnedQuantity ?? "—")} />
        <DetailRow label="Vé được tính đã bán" value={String(soldQuantity ?? "—")} />
        <DetailRow label="Tiền vendor giao lại" value={formatCurrency(grossCashRemitted)} />
        <DetailRow label="Hoa hồng vendor" value={formatCurrency(commissionPayable)} />
        <DetailRow label="Tiền đại lý thực thu" value={formatCurrency(agencyNetSalesAmount)} />
        <DetailRow label="Cọc được hoàn" value={formatCurrency(depositRefundAmount)} />
        <DetailRow label="Cọc bị giữ" value={formatCurrency(depositForfeitedAmount)} />
        <DetailRow label="Cọc cấn trừ" value={formatCurrency(depositAppliedAmount)} />
        <DetailRow label="Cọc dư hoàn lại" value={formatCurrency(depositExcessRefundAmount)} />
        <DetailRow label="Giá trị force purchase" value={formatCurrency(forcedPurchaseAmount)} />
        <DetailRow label="Khoản phải thu thêm" value={formatCurrency(additionalAmountDue)} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
                Đúng hạn / trễ
            </Typography>
            {late == null ? (
                <Typography variant="body2">—</Typography>
            ) : (
                <Chip
                    size="small"
                    color={late ? "warning" : "success"}
                    label={late ? "Trễ hạn" : "Đúng hạn"}
                />
            )}
        </Stack>
        <DetailRow label="Policy nếu trả trễ" value={latePolicyLabel(latePolicySnapshot)} />
    </Stack>
);

export const mapPreviewToBreakdown = (preview: VendorSettlementPreview) => ({
    allocatedQuantity: preview.allocatedQuantity,
    returnedQuantity: preview.returnedQuantity,
    soldQuantity: preview.soldQuantity,
    grossCashRemitted: preview.grossCashRemitted,
    commissionPayable: preview.commissionPayable,
    agencyNetSalesAmount: preview.agencyNetSalesAmount,
    depositRefundAmount: preview.depositRefundAmount,
    depositForfeitedAmount: preview.depositForfeitedAmount,
    depositAppliedAmount: preview.depositAppliedAmount,
    depositExcessRefundAmount: preview.depositExcessRefundAmount,
    forcedPurchaseAmount: preview.forcedPurchaseAmount,
    additionalAmountDue: preview.additionalAmountDue,
    late: preview.late,
    latePolicySnapshot: preview.latePolicySnapshot,
});

export const VendorBatchSerialReturnSection = ({
    batch,
    canEdit,
    scanInput,
    setScanInput,
    selectedSerialIds,
    setSelectedSerialIds,
    isOpeningReturn,
    isSubmittingReturns,
    onOpenReturnSession,
    onScanSubmit,
    onSubmitReturns,
    onSelectAllReturnable,
}: {
    batch: VendorAllocationBatch;
    canEdit: boolean;
    scanInput: string;
    setScanInput: (value: string) => void;
    selectedSerialIds: number[];
    setSelectedSerialIds: (ids: number[] | ((prev: number[]) => number[])) => void;
    isOpeningReturn: boolean;
    isSubmittingReturns: boolean;
    onOpenReturnSession: (id: number) => void;
    onScanSubmit: () => void;
    onSubmitReturns: () => void;
    onSelectAllReturnable: () => void;
}) => {
    const [searchFilter, setSearchFilter] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const groupedSerials = useMemo(() => {
        const query = searchFilter.toLowerCase().trim();
        const groups = new Map<string, VendorAllocationAllocatedSerial[]>();

        (batch.serials || []).forEach((s) => {
            const matches =
                !query ||
                s.ticketNumbers.toLowerCase().includes(query) ||
                s.serialNumber.toLowerCase().includes(query) ||
                String(s.serialId).includes(query) ||
                (s.allocationStatus && s.allocationStatus.toLowerCase().includes(query));

            if (!matches) return;

            const key = `${s.stationId}-${s.ticketNumbers}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(s);
        });

        return Array.from(groups.entries()).map(([key, serials]) => {
            const first = serials[0];
            return {
                key,
                stationId: first.stationId,
                stationName: first.stationName,
                ticketNumbers: first.ticketNumbers,
                faceValue: first.faceValue,
                isLucky: first.lucky,
                luckyBadges: first.luckyBadges,
                serials,
            };
        });
    }, [batch.serials, searchFilter]);

    const toggleSerial = (serial: VendorAllocationAllocatedSerial) => {
        if (serial.allocationStatus !== "HANDED_OVER") return;
        setSelectedSerialIds((prev) =>
            prev.includes(serial.serialId)
                ? prev.filter((id) => id !== serial.serialId)
                : [...prev, serial.serialId]
        );
    };

    const pendingInspectionCount = (batch.serials || []).filter(
        (serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION"
    ).length;

    return (
        <Stack spacing={1.5}>
            {batch.status === "CONFIRMED" && canEdit && (
                <>
                    <Divider />
                    <Button
                        loading={isOpeningReturn}
                        label="Mở phiên trả vé"
                        loadingLabel="Đang mở..."
                        onClick={() => onOpenReturnSession(batch.id)}
                    />
                </>
            )}

            {batch.status === "RETURN_OPEN" && (
                <>
                    <Divider />
                    <Typography variant="subtitle2">Quét / chọn serial trả</Typography>
                    {!canEdit ? (
                        <Alert severity="info" sx={{ py: 0.5 }}>
                            Bạn chỉ có quyền xem — không thể gửi trả vé.
                        </Alert>
                    ) : (
                        <>
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                Tick checkbox chỉ chọn tạm. Phải bấm <strong>Gửi trả</strong> để
                                tạo phiếu nhận trả chờ kiểm nhận. Vé chỉ được ghi nhận trả sau khi
                                nhân viên kiểm thực tế.
                            </Alert>
                            <TextField
                                label="Nhập / quét serial"
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        onScanSubmit();
                                    }
                                }}
                                helperText="Nhập serialNumber hoặc serialId rồi Enter. Chỉ chọn được serial đang HANDED_OVER."
                                sx={fieldSx}
                                fullWidth
                                size="small"
                            />
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={onSelectAllReturnable}
                                    disabled={
                                        !(batch.serials || []).some(
                                            (s) => s.allocationStatus === "HANDED_OVER"
                                        )
                                    }
                                >
                                    Chọn tất cả còn giữ
                                </Button>
                                <Button
                                    loading={isSubmittingReturns}
                                    variant="contained"
                                    label={`Gửi trả (${selectedSerialIds.length})`}
                                    loadingLabel="Đang gửi..."
                                    disabled={selectedSerialIds.length === 0}
                                    onClick={onSubmitReturns}
                                    sx={{ flex: 1, minWidth: 140 }}
                                />
                                <Button
                                    variant="outlined"
                                    disabled={selectedSerialIds.length === 0}
                                    onClick={() => setSelectedSerialIds([])}
                                >
                                    Bỏ chọn
                                </Button>
                            </Stack>
                            {selectedSerialIds.length > 0 && (
                                <Alert severity="warning" sx={{ py: 0.5 }}>
                                    Đã chọn {selectedSerialIds.length} vé chưa gửi. Bấm{" "}
                                    <strong>Gửi trả</strong> trước khi xem preview / quyết toán.
                                </Alert>
                            )}
                        </>
                    )}
                    {pendingInspectionCount > 0 && (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                            Có {pendingInspectionCount} vé đang chờ kiểm nhận thực tế. Chưa thể
                            preview hoặc quyết toán cho tới khi hoàn tất kiểm nhận.
                        </Alert>
                    )}
                </>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1 }}>
                <Typography variant="subtitle2">
                    Serial ({batch.serials?.length || 0})
                </Typography>
            </Stack>
            <TextField
                size="small"
                fullWidth
                placeholder="Lọc số vé, serial, trạng thái..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                sx={fieldSx}
            />
            <Stack spacing={2} sx={{ mt: 2 }}>
                {groupedSerials.map((group) => {
                    const isExpanded = expandedGroups[group.key];
                    const pendingCount = group.serials.filter((s) => s.allocationStatus === "RETURN_PENDING_INSPECTION").length;
                    const returnedCount = group.serials.filter((s) => s.allocationStatus === "RETURNED").length;
                    const handedOverCount = group.serials.filter((s) => s.allocationStatus === "HANDED_OVER").length;
                    const soldCount = group.serials.filter((s) => s.allocationStatus === "SOLD").length;
                    const rejectedCount = group.serials.filter((s) => s.allocationStatus === "RETURN_REJECTED").length;

                    return (
                        <Box key={group.key} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="flex-start">
                                <AdminTicketCard
                                    ticketNumbers={group.ticketNumbers}
                                    stationName={group.stationName}
                                    faceValue={group.faceValue}
                                    quantity={group.serials.length}
                                    isLucky={group.isLucky}
                                    luckyBadges={group.luckyBadges}
                                    onClickAction={() => toggleGroup(group.key)}
                                    actionLabel={isExpanded ? "Ẩn serial" : "Xem serial"}
                                />

                                <Stack spacing={1} sx={{ pt: 1, flex: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Trạng thái vé trong nhóm:</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {handedOverCount > 0 && <Chip label={`${handedOverCount} đang giữ`} size="small" color="default" />}
                                        {pendingCount > 0 && <Chip label={`${pendingCount} chờ kiểm`} size="small" color="warning" />}
                                        {returnedCount > 0 && <Chip label={`${returnedCount} đã trả`} size="small" color="success" />}
                                        {soldCount > 0 && <Chip label={`${soldCount} đã bán`} size="small" color="info" variant="outlined" />}
                                        {rejectedCount > 0 && <Chip label={`${rejectedCount} bị từ chối`} size="small" color="error" variant="outlined" />}
                                        {handedOverCount === 0 && pendingCount === 0 && returnedCount === 0 && soldCount === 0 && rejectedCount === 0 && (
                                            <Chip label="Không có serial hoạt động" size="small" color="default" variant="outlined" />
                                        )}
                                    </Stack>
                                </Stack>
                            </Stack>

                            {isExpanded && (
                                <Box sx={{ mt: 3, mx: -2, borderTop: "1px solid", borderColor: "divider" }}>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    {batch.status === "RETURN_OPEN" && canEdit && (
                                                        <TableCell padding="checkbox" />
                                                    )}
                                                    <TableCell>Serial</TableCell>
                                                    <TableCell>Trạng thái</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {group.serials.map((s) => {
                                                    const selectable = s.allocationStatus === "HANDED_OVER";
                                                    const pendingSelected = selectedSerialIds.includes(s.serialId);
                                                    const returned = s.allocationStatus === "RETURNED";
                                                    const pendingInspection = s.allocationStatus === "RETURN_PENDING_INSPECTION";
                                                    const rejected = s.allocationStatus === "RETURN_REJECTED";

                                                    return (
                                                        <TableRow
                                                            key={s.serialId}
                                                            hover={batch.status === "RETURN_OPEN" && canEdit && selectable}
                                                            selected={pendingSelected}
                                                            onClick={() => batch.status === "RETURN_OPEN" && canEdit && toggleSerial(s)}
                                                            sx={{
                                                                cursor: batch.status === "RETURN_OPEN" && canEdit && selectable ? "pointer" : "default",
                                                                opacity: batch.status === "RETURN_OPEN" && !selectable && !returned && !pendingInspection && !rejected ? 0.55 : 1,
                                                            }}
                                                        >
                                                            {batch.status === "RETURN_OPEN" && canEdit && (
                                                                <TableCell padding="checkbox" sx={{ pl: 3 }}>
                                                                    <Checkbox
                                                                        size="small"
                                                                        checked={pendingSelected || returned}
                                                                        disabled={!selectable}
                                                                        onChange={() => toggleSerial(s)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </TableCell>
                                                            )}
                                                            <TableCell sx={{ pl: batch.status === "RETURN_OPEN" && canEdit ? undefined : 3, fontFamily: "monospace" }}>
                                                                {s.serialNumber}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Stack spacing={0.25}>
                                                                    <Chip
                                                                        size="small"
                                                                        label={
                                                                            returned ? "Đã trả"
                                                                                : pendingInspection ? "Chờ kiểm nhận"
                                                                                : rejected ? "Từ chối nhận"
                                                                                : pendingSelected ? "Chờ gửi trả"
                                                                                : s.allocationStatus
                                                                        }
                                                                        color={
                                                                            returned ? "success"
                                                                                : rejected ? "error"
                                                                                : pendingSelected ? "warning"
                                                                                : "default"
                                                                        }
                                                                        variant="outlined"
                                                                        sx={{ width: 'fit-content' }}
                                                                    />
                                                                    {s.returnedAt && (
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {formatDateTime(s.returnedAt)}
                                                                        </Typography>
                                                                    )}
                                                                    {rejected && s.returnRejectionReason && (
                                                                        <Typography variant="caption" color="error.main">
                                                                            {s.returnRejectionReason}
                                                                        </Typography>
                                                                    )}
                                                                </Stack>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </Box>
                    );
                })}
                {groupedSerials.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        Không tìm thấy serial phù hợp.
                    </Typography>
                )}
            </Stack>
        </Stack>
    );
};

export const VendorBatchSettlementSection = ({
    batch,
    canEdit,
    previewEnabled,
    settlementPreview,
    isLoadingPreview,
    isFetchingPreview,
    previewErrorMessage,
    selectedSerialIdsCount,
    pendingInspectionCount,
    isSettling,
    onEnablePreview,
    onSettle,
}: {
    batch: VendorAllocationBatch;
    canEdit: boolean;
    previewEnabled: boolean;
    settlementPreview?: VendorSettlementPreview | null;
    isLoadingPreview: boolean;
    isFetchingPreview: boolean;
    previewErrorMessage?: string | null;
    selectedSerialIdsCount: number;
    pendingInspectionCount: number;
    isSettling: boolean;
    onEnablePreview: () => void;
    onSettle: () => void;
}) => {
    const settledReadonly =
        batch.status === "SETTLED" || batch.status === "LATE_SETTLED";

    if (batch.status !== "RETURN_OPEN" && !settledReadonly) {
        return null;
    }

    return (
        <Stack spacing={1.5}>
            <Divider />
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
            >
                <Typography variant="subtitle2">Quyết toán</Typography>
                {batch.status === "RETURN_OPEN" && (
                    <Button
                        size="small"
                        onClick={onEnablePreview}
                        disabled={isLoadingPreview || isFetchingPreview}
                    >
                        {previewEnabled ? "Tải lại preview" : "Xem trước quyết toán"}
                    </Button>
                )}
            </Stack>

            {batch.status === "RETURN_OPEN" && previewErrorMessage && (
                <Alert severity="error">{previewErrorMessage}</Alert>
            )}

            {batch.status === "RETURN_OPEN" && pendingInspectionCount > 0 && (
                <Alert severity="warning">
                    Cần kiểm nhận {pendingInspectionCount} vé đã gửi trả trước khi xem preview hoặc quyết toán.
                </Alert>
            )}

            {batch.status === "RETURN_OPEN" &&
                previewEnabled &&
                (isLoadingPreview || isFetchingPreview) && (
                    <Typography color="text.secondary">Đang tải preview...</Typography>
                )}

            {batch.status === "RETURN_OPEN" &&
                settlementPreview &&
                !(isLoadingPreview || isFetchingPreview) && (
                    <VendorSettlementBreakdown {...mapPreviewToBreakdown(settlementPreview)} />
                )}

            {settledReadonly && (
                <VendorSettlementBreakdown
                    allocatedQuantity={batch.allocatedQuantity}
                    returnedQuantity={batch.returnedQuantity}
                    soldQuantity={batch.soldQuantity}
                    grossCashRemitted={batch.grossCashRemitted}
                    commissionPayable={batch.commissionPayable}
                    agencyNetSalesAmount={batch.agencyNetSalesAmount}
                    depositRefundAmount={batch.depositRefundAmount}
                    depositForfeitedAmount={batch.depositForfeitedAmount}
                    forcedPurchaseAmount={batch.forcedPurchaseAmount}
                    additionalAmountDue={batch.additionalAmountDue}
                    late={batch.status === "LATE_SETTLED"}
                    latePolicySnapshot={batch.latePolicySnapshot}
                />
            )}

            {batch.status === "RETURN_OPEN" && canEdit && (
                <Button
                    loading={isSettling}
                    label="Quyết toán"
                    loadingLabel="Đang quyết toán..."
                    disabled={
                        !settlementPreview ||
                        isLoadingPreview ||
                        selectedSerialIdsCount > 0 ||
                        pendingInspectionCount > 0
                    }
                    onClick={onSettle}
                />
            )}
            {batch.status === "RETURN_OPEN" && selectedSerialIdsCount > 0 && (
                <Typography variant="caption" color="warning.main">
                    Gửi trả {selectedSerialIdsCount} vé đã chọn trước khi quyết toán.
                </Typography>
            )}
        </Stack>
    );
};

export const VendorBatchDrawerBody = ({
    batch,
    profile,
    canEdit,
    scanInput,
    setScanInput,
    selectedSerialIds,
    setSelectedSerialIds,
    isOpeningReturn,
    isSubmittingReturns,
    isSettling,
    previewEnabled,
    settlementPreview,
    isLoadingPreview,
    isFetchingPreview,
    previewErrorMessage,
    onOpenReturnSession,
    onScanSubmit,
    onSubmitReturns,
    onSelectAllReturnable,
    onEnablePreview,
    onSettle,
}: {
    batch: VendorAllocationBatch;
    profile?: StreetAgentProfile | null;
    canEdit: boolean;
    scanInput: string;
    setScanInput: (value: string) => void;
    selectedSerialIds: number[];
    setSelectedSerialIds: (ids: number[] | ((prev: number[]) => number[])) => void;
    isOpeningReturn: boolean;
    isSubmittingReturns: boolean;
    isSettling: boolean;
    previewEnabled: boolean;
    settlementPreview?: VendorSettlementPreview | null;
    isLoadingPreview: boolean;
    isFetchingPreview: boolean;
    previewErrorMessage?: string | null;
    onOpenReturnSession: (id: number) => void;
    onScanSubmit: () => void;
    onSubmitReturns: () => void;
    onSelectAllReturnable: () => void;
    onEnablePreview: () => void;
    onSettle: () => void;
}) => (
    <Stack spacing={2}>
        <VendorBatchInfoSection batch={batch} profile={profile} />
        <Divider />
        <VendorBatchDepositSnapshotSection batch={batch} />
        <VendorBatchSerialReturnSection
            batch={batch}
            canEdit={canEdit}
            scanInput={scanInput}
            setScanInput={setScanInput}
            selectedSerialIds={selectedSerialIds}
            setSelectedSerialIds={setSelectedSerialIds}
            isOpeningReturn={isOpeningReturn}
            isSubmittingReturns={isSubmittingReturns}
            onOpenReturnSession={onOpenReturnSession}
            onScanSubmit={onScanSubmit}
            onSubmitReturns={onSubmitReturns}
            onSelectAllReturnable={onSelectAllReturnable}
        />
        <VendorBatchSettlementSection
            batch={batch}
            canEdit={canEdit}
            previewEnabled={previewEnabled}
            settlementPreview={settlementPreview}
            isLoadingPreview={isLoadingPreview}
            isFetchingPreview={isFetchingPreview}
            previewErrorMessage={previewErrorMessage}
            selectedSerialIdsCount={selectedSerialIds.length}
            pendingInspectionCount={(batch.serials || []).filter(
                (serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION"
            ).length}
            isSettling={isSettling}
            onEnablePreview={onEnablePreview}
            onSettle={onSettle}
        />
    </Stack>
);
