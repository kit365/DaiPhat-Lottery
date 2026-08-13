"use client";
import React, { useState, useMemo, useEffect } from "react";

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

export const DetailRow = ({ label, value, description, valueColor = "text.primary" }: { label: React.ReactNode; value: React.ReactNode; description?: React.ReactNode; valueColor?: string }) => (
    <Stack spacing={0.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} color={valueColor} textAlign="right">
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
                        Hạn cuối có thể giao vé: {batch.effectiveHandoverDeadlineAt ? formatDateTime(batch.effectiveHandoverDeadlineAt) : batch.returnCutoffSnapshot}
                    </Typography>
                    {batch.effectiveHandoverDeadlineAt && (
                        <Typography variant="caption" sx={{ color: "info.main", display: "block", mt: 0.25 }}>
                            Giờ chốt trả vé của người bán vé số: {batch.returnCutoffSnapshot}
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
                        label="Giá người bán vé số (snapshot)"
                        value={formatCurrency(batch.vendorUnitPriceSnapshot)}
                    />
                    <DetailRow
                        label="Tỷ lệ cọc snapshot"
                        value={formatCommission(batch.depositRateSnapshot)}
                    />
                    <DetailRow label="Số dư cọc trước" value={formatCurrency(batch.depositBalanceBefore)} />
                    <DetailRow label="Số dư cọc sau" value={formatCurrency(batch.depositBalanceAfter)} />
                    <DetailRow
                        label="Hạn cuối có thể giao vé"
                        value={batch.effectiveHandoverDeadlineAt ? formatDateTime(batch.effectiveHandoverDeadlineAt) : "—"}
                        description="Mốc này do hệ thống tính và đã chừa thời gian để Đại Phát nhận lại vé."
                    />
                    <DetailRow label="Giờ chốt trả vé của người bán vé số" value={batch.returnCutoffSnapshot || "—"} />
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
    netCashDueFromVendor,
    netCashPayableToVendor,
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
    netCashDueFromVendor?: number | null;
    netCashPayableToVendor?: number | null;
}) => {
    // Show the net cash movement as the primary operational amount. The
    // accounting accordion keeps the gross in/out values for reconciliation.
    const netCashDue = netCashDueFromVendor ?? 0;
    const netCashToVendor = netCashPayableToVendor ?? 0;
    // 0 sold + payable = deposit refund only — don't frame it as "paying the seller".
    const isDepositRefundOnly =
        netCashToVendor > 0
        && (soldQuantity ?? 0) === 0
        && (commissionPayable ?? 0) === 0
        && (depositRefundAmount ?? 0) > 0;

    return (
        <Stack spacing={1}>
            {netCashDue > 0 ? (
                <DetailRow
                    label="Người bán vé số cần nộp"
                    value={formatCurrency(netCashDue)}
                    valueColor="error.main"
                />
            ) : isDepositRefundOnly ? (
                <DetailRow
                    label="Hoàn lại tiền cọc"
                    value={formatCurrency(netCashToVendor)}
                    valueColor="success.main"
                />
            ) : netCashToVendor > 0 ? (
                <DetailRow
                    label="Cần trả người bán vé số"
                    value={formatCurrency(netCashToVendor)}
                    valueColor="success.main"
                />
            ) : (
                <DetailRow label="Tiền mặt phát sinh" value="Không phát sinh" valueColor="text.secondary" />
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
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

            <Accordion elevation={0} disableGutters variant="outlined" sx={{ '&:before': { display: 'none' }, mt: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 40, '& .MuiAccordionSummary-content': { my: 0 } }}>
                    <Typography variant="body2" fontWeight={600}>Chi tiết hạch toán (Dành cho đối soát)</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                    <Stack spacing={1}>
                        <DetailRow label="Tổng vé giao" value={String(allocatedQuantity ?? "—")} />
                        <DetailRow label="Vé đã trả" value={String(returnedQuantity ?? "—")} />
                        <DetailRow label="Vé được tính đã bán" value={String(soldQuantity ?? "—")} />

                        <DetailRow label="Tiền người bán vé số giao lại" value={formatCurrency(grossCashRemitted)} />
                        <DetailRow label="Hoa hồng người bán vé số" value={formatCurrency(commissionPayable)} />

                        <DetailRow
                            label="Tiền công ty thực thu"
                            value={formatCurrency(agencyNetSalesAmount)}
                            valueColor={(agencyNetSalesAmount ?? 0) > 0 ? "text.primary" : "text.secondary"}
                        />
                        <DetailRow label="Cọc được hoàn" value={formatCurrency(depositRefundAmount)} />

                        {(depositForfeitedAmount ?? 0) > 0 && (
                            <DetailRow
                                label="Cọc bị giữ"
                                value={formatCurrency(depositForfeitedAmount)}
                                valueColor="error.main"
                            />
                        )}
                        {(depositAppliedAmount ?? 0) > 0 && (
                            <DetailRow
                                label="Cọc cấn trừ"
                                value={formatCurrency(depositAppliedAmount)}
                                valueColor="text.primary"
                            />
                        )}
                        {(depositExcessRefundAmount ?? 0) > 0 && (
                            <DetailRow
                                label="Cọc dư hoàn lại"
                                value={formatCurrency(depositExcessRefundAmount)}
                                valueColor="text.primary"
                            />
                        )}
                        {(forcedPurchaseAmount ?? 0) > 0 && (
                            <DetailRow
                                label="Giá trị force purchase"
                                value={formatCurrency(forcedPurchaseAmount)}
                                valueColor="error.main"
                            />
                        )}

                        {(additionalAmountDue ?? 0) > 0 && (
                            <DetailRow
                                label="Khoản phải thu thêm"
                                value={formatCurrency(additionalAmountDue)}
                                valueColor="error.main"
                            />
                        )}

                        {latePolicySnapshot && (
                            <DetailRow label="Policy nếu trả trễ" value={latePolicyLabel(latePolicySnapshot)} />
                        )}
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Stack>
    );
};

export const mapPreviewToBreakdown = (preview: VendorSettlementPreview) => ({
    allocatedQuantity: preview.allocatedQuantity,
    returnedQuantity: preview.returnedQuantity,
    soldQuantity: preview.soldQuantity,
    grossCashRemitted: preview.grossCashRemitted,
    commissionPayable: preview.commissionPayable,
    commissionRateSnapshot: preview.commissionRateSnapshot,
    agencyNetSalesAmount: preview.agencyNetSalesAmount,
    depositRefundAmount: preview.depositRefundAmount,
    depositForfeitedAmount: preview.depositForfeitedAmount,
    depositAppliedAmount: preview.depositAppliedAmount,
    depositExcessRefundAmount: preview.depositExcessRefundAmount,
    forcedPurchaseAmount: preview.forcedPurchaseAmount,
    additionalAmountDue: preview.additionalAmountDue,
    late: preview.late,
    latePolicySnapshot: preview.latePolicySnapshot,
    netCashDueFromVendor: preview.netCashDueFromVendor,
    netCashPayableToVendor: preview.netCashPayableToVendor,
});

/**
 * Compact counter confirmation. The values are all server-calculated; this
 * component only explains the final movement in the order an operator checks
 * it, without duplicating the generic accounting breakdown.
 */
export const VendorSettlementConfirmationSummary = ({
    preview,
}: {
    preview: VendorSettlementPreview;
}) => {
    const isDue = preview.netCashDueFromVendor > 0;
    const isPayable = preview.netCashPayableToVendor > 0;
    const isDepositRefundOnly =
        isPayable
        && preview.soldQuantity === 0
        && preview.commissionPayable === 0
        && preview.depositRefundAmount > 0;
    const commissionRateLabel =
        preview.commissionRateSnapshot == null
            ? ""
            : ` (${(preview.commissionRateSnapshot * 100).toLocaleString("vi-VN", {
                  maximumFractionDigits: 2,
              })}%)`;
    const timingRow = (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
                Đúng hạn / trễ
            </Typography>
            <Chip
                size="small"
                color={preview.late ? "warning" : "success"}
                label={preview.late ? "Trễ hạn" : "Đúng hạn"}
            />
        </Stack>
    );

    return (
        <Stack spacing={1.25} sx={{ pt: 1 }}>
            {isDue ? (
                <>
                    <DetailRow
                        label="Tiền hàng người bán vé số giao lại"
                        value={formatCurrency(preview.grossCashRemitted)}
                    />
                    <DetailRow
                        label={`Hoa hồng người bán vé số${commissionRateLabel}`}
                        value={`−${formatCurrency(preview.commissionPayable)}`}
                        valueColor="success.main"
                    />
                    {preview.depositRefundAmount > 0 && (
                        <DetailRow
                            label="Trừ cọc được hoàn lại"
                            value={`−${formatCurrency(preview.depositRefundAmount)}`}
                            valueColor="success.main"
                        />
                    )}
                    {preview.depositForfeitedAmount > 0 && (
                        <DetailRow
                            label="Cọc bị giữ lại"
                            value={formatCurrency(preview.depositForfeitedAmount)}
                            valueColor="warning.main"
                        />
                    )}
                    {(preview.depositAppliedAmount ?? 0) > 0 && (
                        <DetailRow
                            label="Cọc cấn trừ vào tiền phải nộp"
                            value={`−${formatCurrency(preview.depositAppliedAmount)}`}
                            valueColor="success.main"
                        />
                    )}
                    {(preview.depositExcessRefundAmount ?? 0) > 0 && (
                        <DetailRow
                            label="Cọc dư hoàn lại"
                            value={formatCurrency(preview.depositExcessRefundAmount)}
                            valueColor="success.main"
                        />
                    )}
                    {timingRow}
                    <Divider />
                    <DetailRow
                        label="Tổng tiền cần nộp"
                        value={formatCurrency(preview.netCashDueFromVendor)}
                        valueColor="error.main"
                    />
                </>
            ) : isDepositRefundOnly ? (
                <>
                    <Typography variant="body2" color="text.secondary">
                        Đã trả đủ vé · không phát sinh bán — hoàn lại toàn bộ tiền cọc đã thu.
                    </Typography>
                    <DetailRow
                        label="Cọc được hoàn lại"
                        value={formatCurrency(preview.depositRefundAmount)}
                        valueColor="success.main"
                    />
                    {timingRow}
                    <Divider />
                    <DetailRow
                        label="Tổng hoàn lại tiền cọc"
                        value={formatCurrency(preview.netCashPayableToVendor)}
                        valueColor="success.main"
                    />
                </>
            ) : isPayable ? (
                <>
                    {preview.commissionPayable > 0 && (
                        <DetailRow
                            label={`Hoa hồng người bán vé số${commissionRateLabel}`}
                            value={formatCurrency(preview.commissionPayable)}
                            valueColor="success.main"
                        />
                    )}
                    {preview.depositRefundAmount > 0 && (
                        <DetailRow
                            label="Cọc được hoàn lại"
                            value={formatCurrency(preview.depositRefundAmount)}
                            valueColor="success.main"
                        />
                    )}
                    {(preview.depositExcessRefundAmount ?? 0) > 0 && (
                        <DetailRow
                            label="Cọc dư hoàn lại"
                            value={formatCurrency(preview.depositExcessRefundAmount)}
                            valueColor="success.main"
                        />
                    )}
                    {timingRow}
                    <Divider />
                    <DetailRow
                        label="Tổng tiền thực trả người bán vé số"
                        value={formatCurrency(preview.netCashPayableToVendor)}
                        valueColor="success.main"
                    />
                </>
            ) : (
                <>
                    <Typography variant="body2" color="text.secondary">
                        Không phát sinh tiền mặt.
                    </Typography>
                    {timingRow}
                </>
            )}
        </Stack>
    );
};

export const VendorBatchReturnEntrySection = ({
    batch,
    canEdit,
    scanInput,
    setScanInput,
    selectedSerialIds,
    setSelectedSerialIds,
    isSubmittingReturns,
    onScanSubmit,
    onSubmitReturns,
    onSelectAllReturnable,
    canConfirmNoReturn,
    onConfirmNoReturn,
}: {
    batch: VendorAllocationBatch;
    canEdit: boolean;
    scanInput: string;
    setScanInput: (value: string) => void;
    selectedSerialIds: number[];
    setSelectedSerialIds: (ids: number[] | ((prev: number[]) => number[])) => void;
    isSubmittingReturns: boolean;
    onScanSubmit: () => void;
    onSubmitReturns: () => void;
    onSelectAllReturnable: () => void;
    canConfirmNoReturn: boolean;
    onConfirmNoReturn: () => void;
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

    useEffect(() => {
        if (!searchFilter.trim()) return;
        setExpandedGroups(Object.fromEntries(groupedSerials.map((group) => [group.key, true])));
    }, [groupedSerials, searchFilter]);

    const toggleSerial = (serial: VendorAllocationAllocatedSerial) => {
        if (serial.allocationStatus !== "HANDED_OVER" && serial.allocationStatus !== "RETURN_PENDING_INSPECTION") return;
        setSelectedSerialIds((prev) =>
            prev.includes(serial.serialId)
                ? prev.filter((id) => id !== serial.serialId)
                : [...prev, serial.serialId]
        );
    };

    const handedOverCount = (batch.serials || []).filter(
        (serial) => serial.allocationStatus === "HANDED_OVER"
    ).length;
    const pendingInspectionCount = (batch.serials || []).filter(
        (serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION"
    ).length;
    const returnableCount = handedOverCount + pendingInspectionCount;

    return (
        <Stack spacing={1.5}>
            {canEdit ? (
                <>
                    <Alert severity="info" sx={{ py: 0.5 }}>
                        Chọn đầy đủ vé người bán trả. Bấm <strong>Tiếp tục kiểm nhận</strong> để lưu danh sách và sang bước chốt kết quả.
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
                        helperText="Nhập serialNumber hoặc mã vé rồi Enter. Có thể chọn hoặc bỏ chọn vé đang giữ và vé chờ kiểm nhận."
                        sx={fieldSx}
                        fullWidth
                        size="small"
                    />
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={onSelectAllReturnable}
                            disabled={!(batch.serials || []).some(s => s.allocationStatus === "HANDED_OVER" || s.allocationStatus === "RETURN_PENDING_INSPECTION")}
                        >
                            Chọn tất cả
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={selectedSerialIds.length === 0}
                            onClick={() => setSelectedSerialIds([])}
                        >
                            Bỏ chọn
                        </Button>
                    </Stack>
                </>
            ) : (
                <Alert severity="info" sx={{ py: 0.5 }}>
                    Bạn chỉ có quyền xem — không thể gửi trả vé.
                </Alert>
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
                                    actionLabel={isExpanded ? "Ẩn serial" : "Chọn serial"}
                                />

                                <Stack spacing={1} sx={{ pt: 1, flex: 1 }}>
                                    {canEdit && (
                                        <Typography variant="caption" color="text.secondary">
                                            Bấm “Chọn serial” để tick từng tờ; có thể lọc serial ở ô tìm kiếm bên dưới.
                                        </Typography>
                                    )}
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
                                                    {canEdit && (
                                                        <TableCell padding="checkbox" />
                                                    )}
                                                    <TableCell>Serial</TableCell>
                                                    <TableCell>Trạng thái</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {group.serials.map((s) => {
                                                    const selectable = s.allocationStatus === "HANDED_OVER" || s.allocationStatus === "RETURN_PENDING_INSPECTION";
                                                    const pendingSelected = selectedSerialIds.includes(s.serialId);
                                                    const returned = s.allocationStatus === "RETURNED";
                                                    const pendingInspection = s.allocationStatus === "RETURN_PENDING_INSPECTION";
                                                    const rejected = s.allocationStatus === "RETURN_REJECTED";

                                                    return (
                                                        <TableRow
                                                            key={s.serialId}
                                                            hover={canEdit && selectable}
                                                            selected={pendingSelected}
                                                            onClick={() => canEdit && toggleSerial(s)}
                                                            sx={{
                                                                cursor: canEdit && selectable ? "pointer" : "default",
                                                                opacity: !selectable && !returned && !pendingInspection && !rejected ? 0.55 : 1,
                                                            }}
                                                        >
                                                            {canEdit && (
                                                                <TableCell padding="checkbox" sx={{ pl: 3 }}>
                                                                    <Checkbox
                                                                        size="small"
                                                                        checked={pendingSelected}
                                                                        disabled={!selectable}
                                                                        inputProps={{
                                                                            "aria-label": `Chọn serial ${s.serialNumber}`,
                                                                        }}
                                                                        onChange={() => toggleSerial(s)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </TableCell>
                                                            )}
                                                            <TableCell sx={{ pl: canEdit ? undefined : 3, fontFamily: "monospace" }}>
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
                                                                                : s.allocationStatus === "HANDED_OVER" ? "Đang giữ"
                                                                                : s.allocationStatus === "SOLD" ? "Đã bán"
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

            {canEdit && (
                <Box
                    sx={(theme) => ({
                        position: "sticky",
                        bottom: { xs: 8, md: 16 },
                        zIndex: theme.zIndex.appBar - 1,
                        mx: { xs: -1, md: -2 },
                        mb: { xs: -1, md: -2 },
                        px: { xs: 1, md: 2 },
                        pt: 1,
                        pb: "calc(8px + env(safe-area-inset-bottom))",
                        backgroundColor: "rgba(255, 255, 255, 0.94)",
                        borderTop: "1px solid",
                        borderColor: "divider",
                        boxShadow: "0 -6px 16px rgba(15, 23, 42, 0.08)",
                        backdropFilter: "blur(8px)",
                    })}
                >
                    {returnableCount > 0 && (
                        <Button
                            fullWidth
                            loading={isSubmittingReturns}
                            label={`Tiếp tục kiểm nhận (${selectedSerialIds.length})`}
                            loadingLabel="Đang lưu..."
                            onClick={onSubmitReturns}
                        />
                    )}
                    {canConfirmNoReturn && (
                        <Button
                            fullWidth
                            variant="outlined"
                            color="warning"
                            loading={isSubmittingReturns}
                            label="Xác nhận không có vé trả"
                            onClick={onConfirmNoReturn}
                        />
                    )}
                </Box>
            )}
        </Stack>
    );
};

export const VendorBatchSettlementSection = ({
    batch,
    previewEnabled,
    settlementPreview,
    isLoadingPreview,
    isFetchingPreview,
    previewErrorMessage,
    isSettling,
    onEnablePreview,
    onSettle,
}: {
    batch: VendorAllocationBatch;
    previewEnabled: boolean;
    settlementPreview?: VendorSettlementPreview | null;
    isLoadingPreview: boolean;
    isFetchingPreview: boolean;
    previewErrorMessage?: string | null;
    isSettling: boolean;
    onEnablePreview: () => void;
    onSettle: () => void;
}) => {
    const workflow = batch.returnWorkflow;
    const isSettled = workflow?.stage === "SETTLED";
    const canSettle = workflow?.canSettle ?? false;

    const previewReady = Boolean(settlementPreview && !isLoadingPreview && !isFetchingPreview);
    const previewLoading = previewEnabled && !previewReady && (isLoadingPreview || isFetchingPreview);

    return (
        <Stack spacing={2}>
            {previewErrorMessage && <Alert severity="error">{previewErrorMessage}</Alert>}

            {previewLoading ? (
                <Typography color="text.secondary">Đang tải số liệu quyết toán...</Typography>
            ) : settlementPreview && !isSettled ? (
                <VendorSettlementBreakdown {...mapPreviewToBreakdown(settlementPreview)} />
            ) : isSettled ? (
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
            ) : (
                <Typography color="text.secondary">Chưa có dữ liệu quyết toán.</Typography>
            )}

            {!isSettled && (
                <Box
                    sx={(theme) => ({
                        position: "sticky",
                        bottom: { xs: 8, md: 16 },
                        zIndex: theme.zIndex.appBar - 1,
                        mx: { xs: -1, md: -2 },
                        mb: { xs: -1, md: -2 },
                        px: { xs: 1, md: 2 },
                        pt: 1,
                        pb: "calc(8px + env(safe-area-inset-bottom))",
                        backgroundColor: "rgba(255, 255, 255, 0.94)",
                        borderTop: "1px solid",
                        borderColor: "divider",
                        boxShadow: "0 -6px 16px rgba(15, 23, 42, 0.08)",
                        backdropFilter: "blur(8px)",
                    })}
                >
                    {canSettle && previewReady ? (
                        <Button
                            fullWidth
                            loading={isSettling}
                            label="Xác nhận quyết toán"
                            loadingLabel="Đang quyết toán..."
                            onClick={onSettle}
                        />
                    ) : (
                        <Button
                            fullWidth
                            loading={previewLoading}
                            label="Tính lại quyết toán"
                            loadingLabel="Đang tính..."
                            onClick={onEnablePreview}
                        />
                    )}
                </Box>
            )}
        </Stack>
    );
};


export const VendorBatchInspectionSection = ({
    batch,
    rejectedInspectionSerialIds,
    setRejectedInspectionSerialIds,
    inspectionNotes,
    setInspectionNotes,
    isConfirmingInspection,
    onConfirmInspection,
}: {
    batch: VendorAllocationBatch;
    rejectedInspectionSerialIds: number[];
    setRejectedInspectionSerialIds: (ids: number[] | ((prev: number[]) => number[])) => void;
    inspectionNotes: Record<number, string>;
    setInspectionNotes: (notes: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
    isConfirmingInspection: boolean;
    onConfirmInspection: () => void;
}) => {
    const stagedSerials = (batch.serials || []).filter(s => s.allocationStatus === "RETURN_PENDING_INSPECTION");
    const unreturnedCount = batch.returnWorkflow?.unreturnedQuantity || 0;
    const canConfirm = batch.returnWorkflow?.canConfirmInspection ?? false;

    const toggleReject = (id: number) => {
        setRejectedInspectionSerialIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <Stack spacing={2}>


            <Typography variant="body2" color="text.secondary">
                Tick chọn vé nếu muốn <strong>từ chối nhận trả</strong>. Vé không bị tick sẽ được ngầm hiểu là <strong>chấp nhận</strong>.
            </Typography>

            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {canConfirm && <TableCell padding="checkbox" />}
                            <TableCell>Serial</TableCell>
                            <TableCell>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stagedSerials.map(s => {
                            const isRejected = rejectedInspectionSerialIds.includes(s.serialId);
                            return (
                                <TableRow key={s.serialId} hover={canConfirm} selected={isRejected}>
                                    {canConfirm && (
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                color="error"
                                                checked={isRejected}
                                                onChange={() => toggleReject(s.serialId)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ fontFamily: "monospace", pl: canConfirm ? undefined : 2 }}>
                                        {s.serialNumber}
                                    </TableCell>
                                    <TableCell>
                                        {isRejected ? (
                                            <TextField
                                                size="small"
                                                placeholder="Lý do từ chối (Bắt buộc)..."
                                                fullWidth
                                                value={inspectionNotes[s.serialId] || ""}
                                                onChange={(e) => setInspectionNotes(prev => ({ ...prev, [s.serialId]: e.target.value }))}
                                                sx={fieldSx}
                                            />
                                        ) : (
                                            <Typography variant="body2" color="success.main">Chấp nhận trả</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {stagedSerials.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center">Không có vé nào chờ kiểm nhận.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ position: "sticky", bottom: 0, pt: 1, pb: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider", zIndex: 10, mx: -2, px: 2 }}>
                {canConfirm && (
                    <Button
                        fullWidth
                        variant="contained"
                        loading={isConfirmingInspection}
                        label="Chốt kết quả nhận trả"
                        loadingLabel="Đang chốt..."
                        onClick={onConfirmInspection}
                        disabled={stagedSerials.length === 0 || rejectedInspectionSerialIds.some(id => !(inspectionNotes[id] || "").trim())}
                    />
                )}
            </Box>
        </Stack>
    );
};
