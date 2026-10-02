"use client";
import React, { useState, useMemo, useEffect, useRef, useId } from "react";

import {
    Alert,
    Box,
    Checkbox,
    Chip,
    Divider,
    Grid,
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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    FormControlLabel,
    Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Button } from "../../../../components/ui/Button";
import { AdminDialog } from "../../../../components/ui/AdminDialog";
import { AdminStatusBadge } from "../../../../components/ui/AdminStatusBadge";
import {
    StreetAgentProfile,
    VendorAllocationAllocatedSerial,
    VendorAllocationBatch,
    VendorSettlementPreview,
} from "../../types/street-agent.type";
import { LuckyTicketNumber } from "../LuckyTicketNumber";
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
import { ALLOCATION_BATCH_STATUS_LABELS } from "../configs/constants";
import { BADGE_COLOR_PALETTE } from "@/admin/utils/badge";

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



export const DetailRow = ({
    label,
    value,
    description,
    valueColor = "text.primary",
    labelWeight = 400,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    description?: React.ReactNode;
    valueColor?: string;
    labelWeight?: number;
}) => (
    <Stack spacing={0.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: labelWeight }}>
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

const ReceiptRow = ({
    label,
    value,
    deduct = false,
    total = false,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    deduct?: boolean;
    total?: boolean;
}) => (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2} sx={{ pt: total ? 1.5 : 0 }}>
        <Typography
            variant="body2"
            color={total ? "text.primary" : "text.secondary"}
            sx={{ fontWeight: total ? 700 : 400 }}
        >
            {label}
        </Typography>
        <Typography
            variant="body2"
            textAlign="right"
            sx={{
                fontWeight: total ? 700 : 500,
                fontSize: total ? "1rem" : "0.875rem",
                color: deduct ? "error.main" : "text.primary",
                fontVariantNumeric: "tabular-nums",
            }}
        >
            {value}
        </Typography>
    </Stack>
);

export const VendorSettlementBreakdown = ({
    allocatedQuantity,
    returnedQuantity,
    rejectedQuantity,
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
    faceValue,
    vendorUnitPrice,
    commissionRate,
    depositRate,
    depositHeld,
}: {
    allocatedQuantity?: number | null;
    returnedQuantity?: number | null;
    rejectedQuantity?: number | null;
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
    faceValue?: number | null;
    vendorUnitPrice?: number | null;
    commissionRate?: number | null;
    depositRate?: number | null;
    depositHeld?: number | null;
}) => {
    const [helpOpen, setHelpOpen] = useState(false);
    const netCashDue = netCashDueFromVendor ?? 0;
    const netCashToVendor = netCashPayableToVendor ?? 0;
    const sold = soldQuantity ?? 0;
    const allocated = allocatedQuantity ?? 0;
    const returned = returnedQuantity ?? 0;
    const rejected = rejectedQuantity ?? 0;
    const unreturned = Math.max(0, allocated - returned - rejected);
    const unit = vendorUnitPrice ?? 0;
    const isForcePurchase = (forcedPurchaseAmount ?? 0) > 0;
    const soldQtyForLine = isForcePurchase ? allocated : sold;
    const vendorSoldAmount = isForcePurchase ? (forcedPurchaseAmount ?? 0) : unit * sold;
    const isDepositRefundOnly =
        netCashToVendor > 0
        && sold === 0
        && (commissionPayable ?? 0) === 0
        && (depositRefundAmount ?? 0) > 0;

    const headline = netCashDue > 0
        ? { label: "Người bán còn phải nộp thêm", amount: netCashDue, type: "due" as const }
        : isDepositRefundOnly
            ? { label: "Hoàn cọc cho người bán", amount: netCashToVendor, type: "payable" as const }
            : netCashToVendor > 0
                ? { label: "Cần hoàn trả cho người bán", amount: netCashToVendor, type: "payable" as const }
                : { label: "Đã quyết toán hòa tiền cọc", amount: 0, type: "zero" as const };

    const cọcHoàn = (depositRefundAmount ?? 0) > 0 ? (depositRefundAmount ?? 0) : 0;
    const cọcTrừ = (depositAppliedAmount ?? 0) > 0 ? (depositAppliedAmount ?? 0) : 0;
    const cọcHiện = cọcHoàn || cọcTrừ;

    return (
        <Stack spacing={2}>
            {/* Header: Trạng thái & Cấu hình đơn giá */}
            <Paper elevation={0} sx={{ p: 2, border: "1px solid #E5E8EB", borderRadius: 2, bgcolor: "#FAFBFC" }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Chi tiết các khoản quyết toán
                        </Typography>
                        {late == null ? null : (
                            <AdminStatusBadge 
                                label={late ? "Trễ hạn" : "Đúng hạn"} 
                                modifier={late ? "admin-status-badge--pending" : "admin-status-badge--success"} 
                            />
                        )}
                    </Stack>
                    <Tooltip title="Xem giải thích công thức chi tiết">
                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<HelpOutlineIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setHelpOpen(true)}
                            label="Công thức tính"
                        />
                    </Tooltip>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 2, mt: 1, pt: 1.5, borderTop: "1px dashed #E5E8EB" }}>
                    {faceValue != null && (
                        <Box>
                            <Typography variant="caption" color="text.secondary">Mệnh giá vé</Typography>
                            <Typography variant="body2" fontWeight={600}>{formatCurrency(faceValue)}/tờ</Typography>
                        </Box>
                    )}
                    {vendorUnitPrice != null && (
                        <Box>
                            <Typography variant="caption" color="text.secondary">Giá người bán</Typography>
                            <Typography variant="body2" fontWeight={600} color="primary.main">{formatCurrency(vendorUnitPrice)}/tờ</Typography>
                        </Box>
                    )}
                    {commissionRate != null && (
                        <Box>
                            <Typography variant="caption" color="text.secondary">Hoa hồng</Typography>
                            <Typography variant="body2" fontWeight={600}>{formatCommission(commissionRate)}</Typography>
                        </Box>
                    )}
                    {depositRate != null && (
                        <Box>
                            <Typography variant="caption" color="text.secondary">Tỷ lệ cọc</Typography>
                            <Typography variant="body2" fontWeight={600}>{formatCommission(depositRate)}</Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Bảng chi tiết các khoản - KHÔNG BỊ ẨN */}
            <TableContainer sx={{ border: "1px solid #E5E8EB", borderRadius: 2, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 540 }}>
                    <TableHead sx={{ bgcolor: "#F4F6F8" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, py: 1.25, minWidth: 160 }}>Khoản mục</TableCell>
                            <TableCell sx={{ fontWeight: 700, py: 1.25, minWidth: 280 }}>Diễn giải công thức</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, py: 1.25, minWidth: 130, whiteSpace: "nowrap" }}>Số tiền</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>
                                {isForcePurchase ? "Tiền vé tính ép mua (Do trễ hạn)" : "Tiền vé tính đã bán"}
                            </TableCell>
                            <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
                                <Box sx={{ fontWeight: 700, color: "text.primary", mb: 0.75, fontSize: "0.875rem" }}>
                                    {soldQtyForLine} tờ × {formatCurrency(unit)}/tờ
                                </Box>
                                {allocated > 0 && (
                                    <Box sx={{ bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", p: 1.25, borderRadius: 2, mt: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", display: "block", mb: 0.5 }}>
                                            📊 Nguồn gốc số lượng {allocated} tờ bàn giao:
                                        </Typography>
                                        <Stack spacing={0.35} sx={{ fontSize: "0.75rem" }}>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="caption" color="text.secondary">• Vé không trả (bán trực tiếp):</Typography>
                                                <Typography variant="caption" fontWeight={600}>{unreturned} tờ</Typography>
                                            </Stack>
                                            {rejected > 0 && (
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="caption" color="error.main">• Vé bị từ chối trả (tính đã bán):</Typography>
                                                    <Typography variant="caption" fontWeight={600} color="error.main">+ {rejected} tờ</Typography>
                                                </Stack>
                                            )}
                                            <Divider sx={{ my: 0.35, borderStyle: "dashed" }} />
                                            <Stack direction="row" justifyContent="space-between" sx={{ bgcolor: "rgba(255, 171, 0, 0.12)", px: 0.75, py: 0.25, borderRadius: 1 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: "#B76E00" }}>
                                                    👉 Vé tính đã bán (tính tiền):
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: "#B76E00" }}>
                                                    = {soldQtyForLine} tờ
                                                </Typography>
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.35 }}>
                                                <Typography variant="caption" color="success.main">• Vé nhận trả chấp nhận (hoàn vé):</Typography>
                                                <Typography variant="caption" fontWeight={600} color="success.main">+ {returned} tờ</Typography>
                                            </Stack>
                                            <Divider sx={{ my: 0.35 }} />
                                            <Stack direction="row" justifyContent="space-between" sx={{ px: 0.75, py: 0.15 }}>
                                                <Typography variant="caption" fontWeight={700} color="text.primary">
                                                    ✅ Tổng khớp vé giao:
                                                </Typography>
                                                <Typography variant="caption" fontWeight={800} color="text.primary">
                                                    {soldQtyForLine} + {returned} = {allocated} tờ
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                    </Box>
                                )}
                                {isForcePurchase && (
                                    <Typography component="span" variant="caption" color="error.main" sx={{ display: "block", fontWeight: 600, mt: 0.75 }}>
                                        ⚠️ Phạt trễ hạn theo policy: {latePolicyLabel(latePolicySnapshot)}
                                    </Typography>
                                )}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                                {formatCurrency(vendorSoldAmount)}
                            </TableCell>
                        </TableRow>

                        {(depositHeld ?? 0) > 0 && (
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Tiền cọc đã thu khi giao</TableCell>
                                <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
                                    Cọc {depositRate != null ? formatCommission(depositRate) : ""} đã thu từ phiếu bàn giao
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap" }}>
                                    {formatCurrency(depositHeld)}
                                </TableCell>
                            </TableRow>
                        )}

                        {cọcHiện > 0 && (
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: "success.main" }}>
                                    Cọc được khấu trừ / hoàn
                                </TableCell>
                                <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
                                    Trừ tiền cọc đã nộp vào tiền vé đã bán
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: "success.main", whiteSpace: "nowrap" }}>
                                    −{formatCurrency(cọcHiện)}
                                </TableCell>
                            </TableRow>
                        )}

                        {(depositForfeitedAmount ?? 0) > 0 && (
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: "error.main" }}>
                                    Tiền cọc bị giữ (tịch thu)
                                </TableCell>
                                <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
                                    Do quyết toán trễ hạn theo quy định
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: "error.main", whiteSpace: "nowrap" }}>
                                    {formatCurrency(depositForfeitedAmount)}
                                </TableCell>
                            </TableRow>
                        )}

                        {(depositExcessRefundAmount ?? 0) > 0 && (
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: "success.main" }}>
                                    Tiền cọc dư hoàn trả
                                </TableCell>
                                <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
                                    Số tiền cọc còn thừa sau khi trừ tiền bán vé
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: "success.main", whiteSpace: "nowrap" }}>
                                    {formatCurrency(depositExcessRefundAmount)}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

                {/* Khung tổng kết thanh toán */}
                <Box
                    sx={{
                        p: 2,
                        bgcolor: headline.type === "due"
                            ? "rgba(255, 56, 56, 0.08)"
                            : headline.type === "payable"
                                ? "rgba(34, 197, 94, 0.08)"
                                : "#F4F6F8",
                        borderTop: "2px solid",
                        borderColor: headline.type === "due"
                            ? "#FF3030"
                            : headline.type === "payable"
                                ? "#22C55E"
                                : "#DFE3E8",
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    fontWeight: 700,
                                    color: headline.type === "due"
                                        ? "#B71D18"
                                        : headline.type === "payable"
                                            ? "#118D57"
                                            : "text.primary",
                                }}
                            >
                                {headline.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {headline.type === "due"
                                    ? "Số tiền thu ngân cần thu bổ sung từ người bán vé số."
                                    : headline.type === "payable"
                                        ? "Số tiền thu ngân cần chi trả hoàn lại cho người bán vé số."
                                        : "Không có chênh lệch dòng tiền phát sinh."}
                            </Typography>
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                fontVariantNumeric: "tabular-nums",
                                color: headline.type === "due"
                                    ? "#B71D18"
                                    : headline.type === "payable"
                                        ? "#118D57"
                                        : "text.primary",
                            }}
                        >
                            {formatCurrency(headline.amount)}
                        </Typography>
                    </Stack>
                </Box>

            <AdminDialog
                open={helpOpen}
                title="Chi tiết cách tính"
                onClose={() => setHelpOpen(false)}
                actions={<Button variant="outlined" color="inherit" onClick={() => setHelpOpen(false)} label="Đóng" />}
            >
                <Stack spacing={1.25}>
                    <DetailRow
                        labelWeight={700}
                        label="Vé giao / nhận trả / tính bán"
                        value={`${allocated} / ${returned} / ${sold}`}
                        description="Vé từ chối nhận trả hoặc không mang về được tính đã bán."
                    />
                    {unit > 0 ? (
                        <DetailRow
                            labelWeight={700}
                            label="Giá bán cho người bán vé số"
                            value={`${formatCurrency(unit)}/tờ`}
                            description={[
                                faceValue != null ? `Mệnh giá ${formatCurrency(faceValue)}/tờ` : null,
                                commissionRate != null ? `hoa hồng ${formatCommission(commissionRate)}` : null,
                                "chốt lúc bàn giao (cấu hình Giá bán cho người bán vé số / Tỷ lệ hoa hồng).",
                            ].filter(Boolean).join(" · ")}
                        />
                    ) : null}
                    {vendorSoldAmount > 0 ? (
                        <DetailRow
                            labelWeight={700}
                            label={soldQtyForLine > 0 && unit > 0 ? `${soldQtyForLine} × ${formatCurrency(unit)}` : "Tiền theo giá người bán"}
                            value={formatCurrency(vendorSoldAmount)}
                            description={isForcePurchase
                                ? `Policy trả trễ: ${latePolicyLabel(latePolicySnapshot)}. Tính mua toàn bộ tờ đã giao.`
                                : "Người bán chịu theo giá vendor, không phải giá bán lẻ."}
                        />
                    ) : null}
                    {(depositRefundAmount ?? 0) > 0 || (depositAppliedAmount ?? 0) > 0 ? (
                        <DetailRow
                            labelWeight={700}
                            label="Tiền cọc đã thu khi giao"
                            value={formatCurrency(depositHeld ?? depositRefundAmount ?? depositAppliedAmount)}
                            description={[
                                depositRate != null ? `Tỷ lệ cọc ${formatCommission(depositRate)}` : null,
                                "cấu hình Tỷ lệ tiền cọc.",
                                late ? "Trễ hạn nên không hoàn." : "Đúng hạn nên trừ vào số phải nộp.",
                            ].filter(Boolean).join(" ")}
                        />
                    ) : null}
                    {(depositForfeitedAmount ?? 0) > 0 ? (
                        <DetailRow
                            labelWeight={700}
                            label="Cọc bị giữ"
                            value={formatCurrency(depositForfeitedAmount)}
                            description={`Policy trả trễ: ${latePolicyLabel(latePolicySnapshot)}.`}
                        />
                    ) : null}
                    <Divider />
                    <DetailRow labelWeight={700} label={headline.label} value={formatCurrency(headline.amount)} />
                </Stack>
            </AdminDialog>
        </Stack>
    );
};

export const mapPreviewToBreakdown = (preview: VendorSettlementPreview, batch?: VendorAllocationBatch) => ({
    allocatedQuantity: preview.allocatedQuantity,
    returnedQuantity: preview.returnedQuantity,
    rejectedQuantity: batch?.returnWorkflow?.rejectedReturnQuantity ?? (batch?.serials || []).filter((s) => s.allocationStatus === "RETURN_REJECTED").length,
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
    faceValue: batch?.faceValueSnapshot,
    vendorUnitPrice: batch?.vendorUnitPriceSnapshot,
    commissionRate: preview.commissionRateSnapshot ?? batch?.commissionRateSnapshot,
    depositRate: batch?.depositRateSnapshot,
    depositHeld: batch?.depositReceivedAmount,
});

export const VendorSettlementConfirmationSummary = ({
    preview,
    batch,
}: {
    preview: VendorSettlementPreview;
    batch?: VendorAllocationBatch;
}) => <VendorSettlementBreakdown {...mapPreviewToBreakdown(preview, batch)} />;

const isReturnableSerial = (status?: string) =>
    status === "HANDED_OVER" || status === "RETURN_PENDING_INSPECTION";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const ACTIVE_ROW_BG = "rgba(255, 48, 48, 0.06)";
const ACTIVE_ROW_HOVER_BG = "rgba(255, 48, 48, 0.1)";
const LUCKY_ROW_BG = "rgba(255, 171, 0, 0.08)";
const checkboxSx = { p: 0.5, color: "#919EAB", "&.Mui-checked": { color: "#FF3030" } };
const headCellSx = {
    bgcolor: "#F4F6F8",
    color: "text.secondary",
    fontWeight: 700,
    fontSize: "0.75rem",
    whiteSpace: "nowrap" as const,
    borderBottom: "1px solid #F4F6F8",
};

const UncontrolledSearchField = ({
    placeholder,
    onSearch,
}: {
    placeholder: string;
    onSearch: (query: string) => void;
}) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    return (
        <TextField
            size="small"
            fullWidth
            defaultValue=""
            placeholder={placeholder}
            sx={fieldSx}
            onChange={(e) => {
                const value = e.target.value;
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => onSearch(value), 200);
            }}
        />
    );
};

const RejectReturnDialog = ({
    serial,
    initialReason,
    onClose,
    onConfirm,
}: {
    serial: VendorAllocationAllocatedSerial | null;
    initialReason: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}) => {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const [emptyError, setEmptyError] = useState(false);

    const handleClose = () => {
        setEmptyError(false);
        onClose();
    };

    const handleConfirm = () => {
        const reason = (inputRef.current?.value ?? "").trim();
        if (!reason) {
            setEmptyError(true);
            inputRef.current?.focus();
            return;
        }
        setEmptyError(false);
        onConfirm(reason);
    };

    return (
        <AdminDialog
            open={Boolean(serial)}
            title="Từ chối nhận trả"
            onClose={handleClose}
            actions={
                <>
                    <Button variant="outlined" color="inherit" onClick={handleClose} label="Hủy" />
                    <Button color="error" label="Xác nhận từ chối" onClick={handleConfirm} />
                </>
            }
        >
            <Stack spacing={2}>
                {serial ? (
                    <Box>
                        <LuckyTicketNumber value={serial.ticketNumbers} fontSize="1rem" fontWeight={700} letterSpacing="0.04em" />
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: MONO, fontSize: "0.75rem" }}>
                            {serial.serialNumber} · {serial.stationName}
                        </Typography>
                    </Box>
                ) : null}
                {serial ? (
                    <TextField
                        key={`${serial.serialId}-${initialReason}`}
                        autoFocus
                        fullWidth
                        multiline
                        minRows={3}
                        label="Lý do từ chối"
                        placeholder="Ví dụ: tờ rách, sai seri, không khớp số..."
                        defaultValue={initialReason}
                        inputRef={inputRef}
                        error={emptyError}
                        helperText={emptyError ? "Nhập lý do trước khi xác nhận." : undefined}
                        onInput={() => {
                            if (emptyError) setEmptyError(false);
                        }}
                        sx={fieldSx}
                    />
                ) : null}
            </Stack>
        </AdminDialog>
    );
};

export const VendorBatchReturnEntrySection = ({
    batch,
    canEdit,
    selectedSerialIds,
    setSelectedSerialIds,
    isSubmittingReturns,
    onSubmitReturns,
    onSelectAllReturnable,
    canConfirmNoReturn,
    onConfirmNoReturn,
}: {
    batch: VendorAllocationBatch;
    canEdit: boolean;
    selectedSerialIds: number[];
    setSelectedSerialIds: (ids: number[] | ((prev: number[]) => number[])) => void;
    isSubmittingReturns: boolean;
    onSubmitReturns: () => void;
    onSelectAllReturnable: () => void;
    canConfirmNoReturn: boolean;
    onConfirmNoReturn: () => void;
}) => {
    const [searchFilter, setSearchFilter] = useState("");
    const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);

    const groupedSerials = useMemo(() => {
        const query = searchFilter.toLowerCase().trim();
        const groups = new Map<string, VendorAllocationAllocatedSerial[]>();

        (batch.serials || []).forEach((s) => {
            const matches =
                !query ||
                (s.ticketNumbers || "").toLowerCase().includes(query) ||
                (s.serialNumber || "").toLowerCase().includes(query) ||
                String(s.serialId).includes(query) ||
                (s.allocationStatus && s.allocationStatus.toLowerCase().includes(query));

            if (!matches) return;

            const key = `${s.stationId}-${s.ticketNumbers}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(s);
        });

        return Array.from(groups.entries()).map(([key, serials]) => {
            const first = serials[0];
            const returnable = serials.filter((s) => isReturnableSerial(s.allocationStatus));
            return {
                key,
                stationName: first.stationName,
                ticketNumbers: first.ticketNumbers,
                isLucky: first.lucky,
                serials,
                returnable,
            };
        });
    }, [batch.serials, searchFilter]);

    useEffect(() => {
        if (groupedSerials.length === 0) {
            setActiveGroupKey(null);
            return;
        }
        if (!activeGroupKey || !groupedSerials.some((g) => g.key === activeGroupKey)) {
            setActiveGroupKey(groupedSerials[0].key);
        }
    }, [groupedSerials, activeGroupKey]);

    const activeGroup = groupedSerials.find((g) => g.key === activeGroupKey) ?? groupedSerials[0] ?? null;

    const toggleSerial = (serial: VendorAllocationAllocatedSerial) => {
        if (!canEdit || !isReturnableSerial(serial.allocationStatus)) return;
        setSelectedSerialIds((prev) =>
            prev.includes(serial.serialId)
                ? prev.filter((id) => id !== serial.serialId)
                : [...prev, serial.serialId]
        );
    };

    const toggleGroup = (serials: VendorAllocationAllocatedSerial[]) => {
        const returnable = serials.filter((s) => isReturnableSerial(s.allocationStatus));
        if (returnable.length === 0) return;
        const allSelected = returnable.every((s) => selectedSerialIds.includes(s.serialId));
        setSelectedSerialIds((prev) => {
            if (allSelected) {
                const drop = new Set(returnable.map((s) => s.serialId));
                return prev.filter((id) => !drop.has(id));
            }
            const next = new Set(prev);
            returnable.forEach((s) => next.add(s.serialId));
            return Array.from(next);
        });
    };

    const handedOverCount = (batch.serials || []).filter((serial) => serial.allocationStatus === "HANDED_OVER").length;
    const pendingInspectionCount = (batch.serials || []).filter(
        (serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION"
    ).length;
    const returnableCount = handedOverCount + pendingInspectionCount;
    const selectedCount = selectedSerialIds.length;
    const activeReturnable = activeGroup?.returnable ?? [];
    const activeSelected = activeReturnable.filter((s) => selectedSerialIds.includes(s.serialId)).length;
    const allActiveChecked = activeReturnable.length > 0 && activeSelected === activeReturnable.length;
    const someActiveChecked = activeSelected > 0 && !allActiveChecked;

    return (
        <Stack spacing={2}>
            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ md: "center" }}
                justifyContent="space-between"
            >
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Chọn tờ người bán mang trả
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Chọn số vé bên trái, tick serial bên phải.
                    </Typography>
                </Box>
                {!canEdit ? (
                    <AdminStatusBadge
                        label={`Đã chọn ${selectedCount}/${returnableCount} tờ`}
                        modifier={selectedCount > 0 ? "admin-status-badge--pending" : "admin-status-badge--draft"}
                    />
                ) : null}
            </Stack>

            {canEdit ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                    <UncontrolledSearchField
                        placeholder="Tìm số vé hoặc serial..."
                        onSearch={setSearchFilter}
                    />
                    <Stack direction="row" spacing={1} flexShrink={0}>
                        <Button size="small" variant="outlined" onClick={onSelectAllReturnable} disabled={returnableCount === 0}>
                            Chọn hết
                        </Button>
                        <Button size="small" variant="outlined" disabled={selectedCount === 0} onClick={() => setSelectedSerialIds([])}>
                            Bỏ chọn
                        </Button>
                    </Stack>
                </Stack>
            ) : (
                <Alert severity="info" sx={{ py: 0.5 }}>
                    Bạn chỉ có quyền xem — không thể gửi trả vé.
                </Alert>
            )}

            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    border: "1px solid #F4F6F8",
                    borderRadius: "16px",
                    overflow: "hidden",
                    minHeight: { md: 420 },
                }}
            >
                <TableContainer sx={{ flex: 1, minWidth: 0, maxHeight: { md: 520 } }}>
                    <Table stickyHeader size="small" sx={{ "--TableCell-stickyHeader-background": "#F4F6F8" }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headCellSx}>Số vé</TableCell>
                                <TableCell sx={headCellSx}>Đài</TableCell>
                                <TableCell align="center" sx={headCellSx}>Đã chọn</TableCell>
                                <TableCell align="center" sx={headCellSx}>Có thể trả</TableCell>
                                <TableCell sx={{ ...headCellSx, width: 40 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groupedSerials.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                                        Không tìm thấy số vé khớp.
                                    </TableCell>
                                </TableRow>
                            )}
                            {groupedSerials.map((group, index) => {
                                const selectedInGroup = group.returnable.filter((s) =>
                                    selectedSerialIds.includes(s.serialId)
                                ).length;
                                const isActive = activeGroup?.key === group.key;

                                return (
                                    <TableRow
                                        key={group.key}
                                        onClick={() => setActiveGroupKey(group.key)}
                                        sx={{
                                            cursor: "pointer",
                                            bgcolor: isActive
                                                ? ACTIVE_ROW_BG
                                                : group.isLucky
                                                  ? LUCKY_ROW_BG
                                                  : index % 2 === 0
                                                    ? "#F9FAFB"
                                                    : "#FFFFFF",
                                            boxShadow: isActive ? "inset 3px 0 0 #FF3030" : "none",
                                            "&:hover": {
                                                bgcolor: isActive ? `${ACTIVE_ROW_HOVER_BG} !important` : "#F4F6F8 !important",
                                            },
                                            "& td": { borderBottom: "1px dashed #F4F6F8" },
                                        }}
                                    >
                                        <TableCell>
                                            <LuckyTicketNumber value={group.ticketNumbers} />
                                            {group.isLucky ? (
                                                <Typography variant="caption" sx={{ color: "#B76E00", fontWeight: 700 }}>
                                                    Số đẹp
                                                </Typography>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap title={group.stationName} sx={{ maxWidth: 140 }}>
                                                {group.stationName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                {selectedInGroup}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color="text.secondary">
                                                {group.returnable.length}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ pr: 1.5 }}>
                                            <ChevronRightIcon sx={{ fontSize: 20, color: isActive ? "#FF3030" : "#919EAB" }} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box
                    sx={{
                        width: { xs: "100%", md: 320 },
                        flexShrink: 0,
                        borderLeft: { md: "1px solid #F4F6F8" },
                        borderTop: { xs: "1px solid #F4F6F8", md: "none" },
                        display: "flex",
                        flexDirection: "column",
                        minHeight: { xs: 240, md: 0 },
                        bgcolor: "#FAFBFC",
                    }}
                >
                    {activeGroup ? (
                        <>
                            <Box sx={{ px: 2, py: 2, borderBottom: "1px solid #F4F6F8", flexShrink: 0 }}>
                                <LuckyTicketNumber value={activeGroup.ticketNumbers} fontSize="1rem" />
                                <Typography variant="caption" color="text.secondary">
                                    Đã chọn {activeSelected} / {activeReturnable.length} seri
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, overflow: "auto", px: 1.5, py: 1, maxHeight: { md: 440 } }}>
                                {canEdit && activeReturnable.length > 0 ? (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={allActiveChecked}
                                                indeterminate={someActiveChecked}
                                                onChange={() => toggleGroup(activeGroup.serials)}
                                                sx={checkboxSx}
                                            />
                                        }
                                        label={
                                            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                                                Chọn tất cả
                                            </Typography>
                                        }
                                        sx={{
                                            m: 0,
                                            mb: 0.75,
                                            width: "100%",
                                            px: 0.75,
                                            py: 0.5,
                                            borderRadius: 1,
                                            bgcolor: allActiveChecked ? ACTIVE_ROW_BG : "transparent",
                                        }}
                                    />
                                ) : null}
                                {activeGroup.serials.map((serial) => {
                                    const isPicked = selectedSerialIds.includes(serial.serialId);
                                    const selectable = canEdit && isReturnableSerial(serial.allocationStatus);

                                    return (
                                        <FormControlLabel
                                            key={serial.serialId}
                                            disabled={!selectable}
                                            control={
                                                <Checkbox
                                                    checked={isPicked}
                                                    onChange={() => toggleSerial(serial)}
                                                    sx={checkboxSx}
                                                />
                                            }
                                            label={
                                                <Typography
                                                    sx={{
                                                        fontFamily: MONO,
                                                        fontSize: "0.75rem",
                                                        fontWeight: 400,
                                                        lineHeight: 1.4,
                                                        wordBreak: "break-all",
                                                    }}
                                                >
                                                    {serial.serialNumber}
                                                </Typography>
                                            }
                                            sx={{
                                                m: 0,
                                                mb: 0.25,
                                                width: "100%",
                                                px: 0.75,
                                                py: 0.5,
                                                borderRadius: 1,
                                                opacity: selectable || isPicked ? 1 : 0.5,
                                                bgcolor: isPicked ? ACTIVE_ROW_BG : "transparent",
                                                alignItems: "center",
                                                "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0, mt: 0 },
                                                "&:hover": selectable
                                                    ? { bgcolor: isPicked ? ACTIVE_ROW_HOVER_BG : "rgba(145, 158, 171, 0.08)" }
                                                    : undefined,
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                            <Typography variant="body2">Chọn một số vé bên trái để xem seri.</Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {canEdit && (selectedCount > 0 || canConfirmNoReturn) ? (
                <Stack direction="row" justifyContent="flex-end">
                    {selectedCount > 0 ? (
                        <Button
                            loading={isSubmittingReturns}
                            label={`Tiếp tục kiểm nhận (${selectedCount})`}
                            loadingLabel="Đang lưu..."
                            onClick={onSubmitReturns}
                        />
                    ) : (
                        <Button
                            variant="outlined"
                            color="warning"
                            loading={isSubmittingReturns}
                            label="Không có vé trả"
                            onClick={onConfirmNoReturn}
                        />
                    )}
                </Stack>
            ) : null}
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
    canReopenInspection,
    onReopenInspection,
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
    canReopenInspection?: boolean;
    onReopenInspection?: () => void;
    onEnablePreview: () => void;
    onSettle: () => void;
}) => {
    const workflow = batch.returnWorkflow;
    const isSettled = workflow?.stage === "SETTLED";
    const canSettle = workflow?.canSettle ?? false;

    const previewReady = Boolean(settlementPreview && !isLoadingPreview && !isFetchingPreview);
    const previewLoading = previewEnabled && !previewReady && (isLoadingPreview || isFetchingPreview);

    const settledNet = (() => {
        const forced = batch.forcedPurchaseAmount ?? 0;
        if (forced > 0) {
            return {
                netCashDueFromVendor: batch.additionalAmountDue ?? 0,
                netCashPayableToVendor: batch.depositExcessRefundAmount ?? 0,
            };
        }
        const gross = batch.grossCashRemitted ?? 0;
        const commission = batch.commissionPayable ?? 0;
        const refund = batch.depositRefundAmount ?? 0;
        const excess = batch.depositExcessRefundAmount ?? 0;
        const net = gross - commission - refund - excess;
        return net >= 0
            ? { netCashDueFromVendor: net, netCashPayableToVendor: 0 }
            : { netCashDueFromVendor: 0, netCashPayableToVendor: Math.abs(net) };
    })();

    return (
        <Stack spacing={2}>
            {previewErrorMessage && <Alert severity="error">{previewErrorMessage}</Alert>}

            {previewLoading ? (
                <Typography color="text.secondary">Đang tải số liệu quyết toán...</Typography>
            ) : settlementPreview && !isSettled ? (
                <VendorSettlementBreakdown {...mapPreviewToBreakdown(settlementPreview, batch)} />
            ) : isSettled ? (
                <VendorSettlementBreakdown
                    allocatedQuantity={batch.allocatedQuantity}
                    returnedQuantity={batch.returnedQuantity}
                    rejectedQuantity={batch.returnWorkflow?.rejectedReturnQuantity ?? (batch.serials || []).filter((s) => s.allocationStatus === "RETURN_REJECTED").length}
                    soldQuantity={batch.soldQuantity}
                    grossCashRemitted={batch.grossCashRemitted}
                    commissionPayable={batch.commissionPayable}
                    agencyNetSalesAmount={batch.agencyNetSalesAmount}
                    depositRefundAmount={batch.depositRefundAmount}
                    depositForfeitedAmount={batch.depositForfeitedAmount}
                    depositAppliedAmount={batch.depositAppliedAmount}
                    depositExcessRefundAmount={batch.depositExcessRefundAmount}
                    forcedPurchaseAmount={batch.forcedPurchaseAmount}
                    additionalAmountDue={batch.additionalAmountDue}
                    late={batch.status === "LATE_SETTLED"}
                    latePolicySnapshot={batch.latePolicySnapshot}
                    faceValue={batch.faceValueSnapshot}
                    vendorUnitPrice={batch.vendorUnitPriceSnapshot}
                    commissionRate={batch.commissionRateSnapshot}
                    depositRate={batch.depositRateSnapshot}
                    depositHeld={batch.depositReceivedAmount}
                    {...settledNet}
                />
            ) : (
                <Typography color="text.secondary">Chưa có dữ liệu quyết toán.</Typography>
            )}

            {!isSettled && (
                <Stack direction="row" justifyContent="flex-end" spacing={1} flexWrap="wrap" useFlexGap>
                    {canReopenInspection ? (
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            label="Mở lại kiểm nhận"
                            onClick={onReopenInspection}
                        />
                    ) : null}
                    {canSettle && previewReady ? (
                        <Button
                            loading={isSettling}
                            label="Xác nhận quyết toán"
                            loadingLabel="Đang quyết toán..."
                            onClick={onSettle}
                        />
                    ) : (
                        <Button
                            loading={previewLoading}
                            label="Tính lại quyết toán"
                            loadingLabel="Đang tính..."
                            onClick={onEnablePreview}
                        />
                    )}
                </Stack>
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
    const stagedSerials = (batch.serials || []).filter((s) => s.allocationStatus === "RETURN_PENDING_INSPECTION");
    const canConfirm = batch.returnWorkflow?.canConfirmInspection ?? false;
    const rejectedCount = rejectedInspectionSerialIds.length;
    const acceptedCount = Math.max(0, stagedSerials.length - rejectedCount);

    const [rejectTarget, setRejectTarget] = useState<VendorAllocationAllocatedSerial | null>(null);

    const openRejectDialog = (serial: VendorAllocationAllocatedSerial) => {
        setRejectTarget(serial);
    };

    const closeRejectDialog = () => {
        setRejectTarget(null);
    };

    const confirmReject = (reason: string) => {
        if (!rejectTarget) return;
        setRejectedInspectionSerialIds((prev) =>
            prev.includes(rejectTarget.serialId) ? prev : [...prev, rejectTarget.serialId]
        );
        setInspectionNotes((prev) => ({ ...prev, [rejectTarget.serialId]: reason }));
        closeRejectDialog();
    };

    const acceptAgain = (serialId: number) => {
        setRejectedInspectionSerialIds((prev) => prev.filter((id) => id !== serialId));
        setInspectionNotes((prev) => {
            const next = { ...prev };
            delete next[serialId];
            return next;
        });
    };

    return (
        <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                    Mặc định mọi tờ đều <strong>chấp nhận trả</strong>. Chỉ bấm <strong>Từ chối trả</strong> khi tờ không nhận được.
                </Typography>
                <Stack direction="row" spacing={0.75}>
                    <AdminStatusBadge
                        label={`${acceptedCount} chấp nhận`}
                        modifier="admin-status-badge--success"
                    />
                    <AdminStatusBadge
                        label={`${rejectedCount} từ chối`}
                        modifier={rejectedCount > 0 ? "admin-status-badge--inactive" : "admin-status-badge--draft"}
                    />
                </Stack>
            </Stack>

            <TableContainer
                sx={{
                    border: "1px solid #F4F6F8",
                    borderRadius: "16px",
                    overflow: "hidden",
                }}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={headCellSx}>Số vé</TableCell>
                            <TableCell sx={headCellSx}>Seri</TableCell>
                            <TableCell sx={headCellSx}>Đài</TableCell>
                            <TableCell sx={headCellSx} align="center">Trạng thái</TableCell>
                            <TableCell sx={headCellSx}>Lý do</TableCell>
                            {canConfirm ? <TableCell sx={headCellSx} align="center">Thao tác</TableCell> : null}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stagedSerials.map((s, index) => {
                            const isRejected = rejectedInspectionSerialIds.includes(s.serialId);
                            const reason = (inspectionNotes[s.serialId] || "").trim();

                            return (
                                <TableRow
                                    key={s.serialId}
                                    sx={{
                                        bgcolor: isRejected
                                            ? "rgba(255, 86, 48, 0.04)"
                                            : index % 2 === 0
                                              ? "#F9FAFB"
                                              : "#FFFFFF",
                                        "& td": { borderBottom: "1px dashed #F4F6F8", py: 1.25 },
                                    }}
                                >
                                    <TableCell>
                                        <LuckyTicketNumber value={s.ticketNumbers} fontSize="0.875rem" fontWeight={700} letterSpacing="0.04em" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontFamily: MONO, fontSize: "0.75rem", fontWeight: 400 }}>
                                            {s.serialNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" noWrap title={s.stationName} sx={{ maxWidth: 140 }}>
                                            {s.stationName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        {isRejected ? (
                                            <AdminStatusBadge label="Từ chối" modifier="admin-status-badge--inactive" />
                                        ) : (
                                            <AdminStatusBadge label="Chấp nhận trả" modifier="admin-status-badge--success" />
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        <Typography variant="body2" color={reason ? "text.primary" : "text.secondary"} noWrap title={reason || undefined}>
                                            {reason || "—"}
                                        </Typography>
                                    </TableCell>
                                    {canConfirm ? (
                                        <TableCell align="center" sx={{ width: 88, px: 0.5 }}>
                                            <Stack direction="row" spacing={0.25} justifyContent="center">
                                                {isRejected ? (
                                                    <>
                                                        <Tooltip title="Sửa lý do">
                                                            <IconButton
                                                                size="small"
                                                                aria-label="Sửa lý do"
                                                                onClick={() => openRejectDialog(s)}
                                                                sx={{ color: "text.secondary" }}
                                                            >
                                                                <EditOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Chấp nhận lại">
                                                            <IconButton
                                                                size="small"
                                                                aria-label="Chấp nhận lại"
                                                                onClick={() => acceptAgain(s.serialId)}
                                                                sx={{ color: "#22C55E" }}
                                                            >
                                                                <CheckCircleOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                ) : (
                                                    <Tooltip title="Từ chối trả">
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Từ chối trả"
                                                            onClick={() => openRejectDialog(s)}
                                                            sx={{ color: "#FF5630" }}
                                                        >
                                                            <HighlightOffIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    ) : null}
                                </TableRow>
                            );
                        })}
                        {stagedSerials.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canConfirm ? 6 : 5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                    Không có vé nào chờ kiểm nhận.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {canConfirm ? (
                <Stack direction="row" justifyContent="flex-end">
                    <Button
                        loading={isConfirmingInspection}
                        label="Chốt kết quả nhận trả"
                        loadingLabel="Đang chốt..."
                        onClick={onConfirmInspection}
                        disabled={stagedSerials.length === 0}
                    />
                </Stack>
            ) : null}

            <RejectReturnDialog
                serial={rejectTarget}
                initialReason={rejectTarget ? inspectionNotes[rejectTarget.serialId] || "" : ""}
                onClose={closeRejectDialog}
                onConfirm={confirmReject}
            />
        </Stack>
    );
};

export const VendorBatchSerialListSection = ({
    batch,
    rejectedInspectionSerialIds = [],
    inspectionNotes = {},
}: {
    batch: VendorAllocationBatch;
    rejectedInspectionSerialIds?: number[];
    inspectionNotes?: Record<number, string>;
}) => {
    const [currentTab, setCurrentTab] = useState<"ALL" | "ACCEPTED" | "REJECTED" | "SOLD">("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const serialsWithStatus = useMemo(() => {
        return (batch.serials || []).map((s) => {
            const isLocalRejected = rejectedInspectionSerialIds.includes(s.serialId);
            const isApiRejected = s.allocationStatus === "RETURN_REJECTED";
            const isRejected = isLocalRejected || isApiRejected;

            const isApiAccepted = s.allocationStatus === "RETURNED" || s.allocationStatus === "RETURNED_ACCEPTED";
            const isPendingAccepted = s.allocationStatus === "RETURN_PENDING_INSPECTION" && !isLocalRejected;
            const isAccepted = isApiAccepted || isPendingAccepted;

            const isPending = s.allocationStatus === "RETURN_PENDING_INSPECTION" && !isLocalRejected;

            const rejectionReason = (inspectionNotes[s.serialId] || s.returnRejectionReason || "").trim();

            let statusCategory: "ACCEPTED" | "REJECTED" | "PENDING" | "SOLD" = "SOLD";
            if (isRejected) statusCategory = "REJECTED";
            else if (isApiAccepted) statusCategory = "ACCEPTED";
            else if (isPending) statusCategory = "PENDING";
            else statusCategory = "SOLD";

            return {
                ...s,
                isRejected,
                isAccepted,
                isPending,
                rejectionReason,
                statusCategory,
            };
        });
    }, [batch.serials, rejectedInspectionSerialIds, inspectionNotes]);

    const counts = useMemo(() => {
        let accepted = 0;
        let rejected = 0;
        let sold = 0;
        let pending = 0;

        serialsWithStatus.forEach((item) => {
            if (item.statusCategory === "REJECTED") rejected++;
            else if (item.statusCategory === "ACCEPTED") accepted++;
            else if (item.statusCategory === "PENDING") pending++;
            else sold++;
        });

        return {
            total: serialsWithStatus.length,
            accepted,
            rejected,
            sold: sold + pending,
        };
    }, [serialsWithStatus]);

    const filteredSerials = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return serialsWithStatus.filter((item) => {
            if (currentTab === "ACCEPTED" && item.statusCategory !== "ACCEPTED") return false;
            if (currentTab === "REJECTED" && item.statusCategory !== "REJECTED") return false;
            if (currentTab === "SOLD" && item.statusCategory !== "SOLD" && item.statusCategory !== "PENDING") return false;

            if (!query) return true;
            return (
                item.ticketNumbers.toLowerCase().includes(query) ||
                item.serialNumber.toLowerCase().includes(query) ||
                item.stationName.toLowerCase().includes(query) ||
                item.rejectionReason.toLowerCase().includes(query)
            );
        });
    }, [serialsWithStatus, currentTab, searchQuery]);

    return (
        <Stack spacing={2} sx={{ mt: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Danh sách chi tiết vé bàn giao & Kết quả kiểm nhận
                </Typography>
                <UncontrolledSearchField placeholder="Tìm theo số vé, seri, đài hoặc lý do từ chối..." onSearch={setSearchQuery} />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                    clickable
                    label={`Tất cả (${counts.total})`}
                    color={currentTab === "ALL" ? "primary" : "default"}
                    variant={currentTab === "ALL" ? "filled" : "outlined"}
                    onClick={() => setCurrentTab("ALL")}
                    sx={{ fontWeight: 600 }}
                />
                <Chip
                    clickable
                    label={`Chấp nhận trả (${counts.accepted})`}
                    color={currentTab === "ACCEPTED" ? "success" : "default"}
                    variant={currentTab === "ACCEPTED" ? "filled" : "outlined"}
                    onClick={() => setCurrentTab("ACCEPTED")}
                    sx={{ fontWeight: 600 }}
                />
                <Chip
                    clickable
                    label={`Bị từ chối (${counts.rejected})`}
                    color={currentTab === "REJECTED" ? "error" : counts.rejected > 0 ? "error" : "default"}
                    variant={currentTab === "REJECTED" ? "filled" : "outlined"}
                    onClick={() => setCurrentTab("REJECTED")}
                    sx={{
                        fontWeight: 700,
                        ...(counts.rejected > 0 && currentTab !== "REJECTED" ? { bgcolor: "rgba(255, 86, 48, 0.12)", color: "#C62828" } : {}),
                    }}
                />
                <Chip
                    clickable
                    label={`Tính đã bán / Không trả (${counts.sold})`}
                    color={currentTab === "SOLD" ? "warning" : "default"}
                    variant={currentTab === "SOLD" ? "filled" : "outlined"}
                    onClick={() => setCurrentTab("SOLD")}
                    sx={{ fontWeight: 600 }}
                />
            </Stack>

            <TableContainer sx={{ border: "1px solid #F4F6F8", borderRadius: "16px", overflow: "hidden" }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: "#F4F6F8" }}>
                        <TableRow>
                            <TableCell sx={headCellSx}>Số vé</TableCell>
                            <TableCell sx={headCellSx}>Số seri</TableCell>
                            <TableCell sx={headCellSx}>Đài phát hành</TableCell>
                            <TableCell align="center" sx={headCellSx}>Trạng thái vé</TableCell>
                            <TableCell sx={headCellSx}>Chi tiết / Lý do từ chối</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredSerials.map((s, index) => (
                            <TableRow
                                key={s.serialId}
                                sx={{
                                    bgcolor: s.isRejected
                                        ? "rgba(255, 86, 48, 0.06)"
                                        : index % 2 === 0
                                        ? "#F9FAFB"
                                        : "#FFFFFF",
                                    "& td": { borderBottom: "1px dashed #F4F6F8", py: 1.25 },
                                }}
                            >
                                <TableCell>
                                    <LuckyTicketNumber value={s.ticketNumbers} fontSize="0.875rem" fontWeight={700} letterSpacing="0.04em" />
                                    {s.lucky && (
                                        <Typography variant="caption" sx={{ color: "#B76E00", fontWeight: 700, display: "block" }}>
                                            Số đẹp
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography sx={{ fontFamily: MONO, fontSize: "0.75rem", fontWeight: 500 }}>
                                        {s.serialNumber}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{s.stationName}</Typography>
                                </TableCell>
                                <TableCell align="center">
                                    {s.isRejected ? (
                                        <AdminStatusBadge label="Từ chối" modifier="admin-status-badge--inactive" />
                                    ) : s.statusCategory === "ACCEPTED" ? (
                                        <AdminStatusBadge label="Chấp nhận trả" modifier="admin-status-badge--success" />
                                    ) : s.statusCategory === "PENDING" ? (
                                        <AdminStatusBadge label="Chờ kiểm nhận" modifier="admin-status-badge--pending" />
                                    ) : (
                                        <AdminStatusBadge label="Tính đã bán" modifier="admin-status-badge--draft" />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {s.isRejected ? (
                                        <Box
                                            sx={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 0.75,
                                                px: 1.25,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                bgcolor: "rgba(255, 86, 48, 0.12)",
                                                border: "1px solid rgba(255, 86, 48, 0.25)",
                                            }}
                                        >
                                            <HighlightOffIcon sx={{ fontSize: 16, color: "#C62828" }} />
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#C62828", fontSize: "0.8125rem" }}>
                                                {s.rejectionReason || "Không đủ điều kiện nhận trả"}
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">—</Typography>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredSerials.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 5, color: "text.secondary" }}>
                                    Không tìm thấy tờ vé số nào.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Stack>
    );
};
