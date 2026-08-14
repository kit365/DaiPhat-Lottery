import React, { useEffect, useState } from "react";
import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Alert,
    Box,
    Chip,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { AdminConfirmDialog } from "../../../../components/ui/AdminConfirmDialog";
import { Button } from "../../../../components/ui/Button";
import { Title } from "../../../../components/ui/Title";
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { usePermissions } from "../../../../hooks/usePermission";
import { BADGE_COLOR_PALETTE, type BadgeColorVariant } from "@/admin/utils/badge";
import { formatDate, formatDateTime } from "../../utils/format";
import { ALLOCATION_BATCH_STATUS_LABELS, getVendorAllocationBatchStatusBadgeClass } from "../configs/constants";
import { AdminStatusBadge } from "../../../../components/ui/AdminStatusBadge";
import {
    useConfirmVendorReturnInspection,
    useConfirmVendorNoReturn,
    useOpenVendorAllocationReturnSession,
    useReplaceVendorAllocationReturns,
    useReopenVendorReturnInspection,
    useSettleVendorAllocation,
    useVendorAllocationBatch,
    useVendorSettlementPreview,
} from "../../hooks/useVendorAllocation";
import { useVendorReturnSelectionDraft } from "../../hooks/useVendorReturnSelectionDraft";
import { useStreetAgentProfiles } from "../../hooks/useStreetAgent";
import {
    mapPreviewToBreakdown,
    VendorBatchDepositSnapshotSection,
    VendorBatchInspectionSection,
    VendorBatchReturnEntrySection,
    VendorBatchSettlementSection,
    VendorSettlementBreakdown,
    VendorSettlementConfirmationSummary,
} from "../sections/VendorBatchDrawerSections";

const CURRENT_DOT = "#FF3030";
const PAST_DOT = "#919EAB";
const LINE_COLOR = "#DFE3E8";

const getApiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

const MilestoneRow = ({ label, value }: { label: string; value: string }) => (
    <Stack direction="row" justifyContent="space-between" gap={2} alignItems="baseline">
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={600} textAlign="right">{value}</Typography>
    </Stack>
);

const QuantityBadge = ({
    count,
    variant,
}: {
    count: number;
    variant: Extract<BadgeColorVariant, "success" | "error" | "warning" | "neutral">;
}) => {
    const colors = BADGE_COLOR_PALETTE[variant].unselected;
    return (
        <Chip
            size="small"
            label={`${count} vé`}
            sx={{
                height: 26,
                fontWeight: 700,
                fontSize: "0.75rem",
                bgcolor: colors.bg,
                color: colors.text,
                border: "none",
            }}
        />
    );
};

const ConfirmStatRow = ({
    label,
    count,
    variant,
}: {
    label: string;
    count: number;
    variant: Extract<BadgeColorVariant, "success" | "error" | "warning" | "neutral">;
}) => (
    <Stack direction="row" justifyContent="space-between" gap={2} alignItems="center">
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <QuantityBadge count={count} variant={variant} />
    </Stack>
);

const fallbackStage = (status?: string, pendingInspectionQuantity = 0) => {
    if (status === "SETTLED" || status === "LATE_SETTLED") return "SETTLED";
    if (status === "RETURN_OPEN") {
        return pendingInspectionQuantity > 0 ? "INSPECTION" : "RETURN_ENTRY";
    }
    return "RETURN_ENTRY";
};

export const VendorAllocationBatchDetailPage = () => {
    const { id: rawId } = useRouteParams();
    const detailId = Number(rawId);
    const { can } = usePermissions();
    const canEdit = can(PERMISSIONS.STREET_AGENT.EDIT);

    const [scanInput, setScanInput] = useState("");
    const [rejectedSerialIds, setRejectedSerialIds] = useState<number[]>([]);
    const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
    const [inspectionConfirmOpen, setInspectionConfirmOpen] = useState(false);
    const [noReturnConfirmOpen, setNoReturnConfirmOpen] = useState(false);
    const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
    const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);
    const [previewEnabled, setPreviewEnabled] = useState(false);
    const [inspectionView, setInspectionView] = useState<"selection" | "inspection">("inspection");

    const { data: batch, isLoading, refetch: refetchBatch } = useVendorAllocationBatch(detailId || undefined);
    const { selectedSerialIds, setSelectedSerialIds } = useVendorReturnSelectionDraft(batch);
    const { data: profilesRes } = useStreetAgentProfiles({ page: 1, limit: 100 });
    const profile = profilesRes?.data?.recordList?.find((item) => item.id === batch?.streetAgentProfileId);

    const pendingInspectionCount = batch?.returnWorkflow?.pendingInspectionQuantity
        ?? (batch?.serials || []).filter((serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION").length;
    const stage = batch?.returnWorkflow?.stage ?? fallbackStage(batch?.status, pendingInspectionCount);
    const isSettled = stage === "SETTLED";
    const isReadyForSettlement = stage === "READY_FOR_SETTLEMENT";
    const isInspection = stage === "INSPECTION";
    const needsReturnSession = batch?.status === "CONFIRMED";
    const activeStep = isSettled || isReadyForSettlement
        ? 2
        : isInspection && inspectionView === "inspection"
            ? 1
            : 0;

    const {
        data: settlementPreview,
        isLoading: isLoadingPreview,
        isFetching: isFetchingPreview,
        error: previewError,
        refetch: refetchPreview,
    } = useVendorSettlementPreview(
        detailId || undefined,
        previewEnabled && isReadyForSettlement,
    );

    const { mutate: openReturnSession, isPending: isOpeningReturn } = useOpenVendorAllocationReturnSession();
    const { mutate: replaceReturns, isPending: isSubmittingReturns } = useReplaceVendorAllocationReturns();
    const { mutate: reopenInspection, isPending: isReopeningInspection } = useReopenVendorReturnInspection();
    const { mutate: confirmInspection, isPending: isConfirmingInspection } = useConfirmVendorReturnInspection();
    const { mutate: confirmNoReturn, isPending: isConfirmingNoReturn } = useConfirmVendorNoReturn();
    const { mutate: settleBatch, isPending: isSettling } = useSettleVendorAllocation();

    useEffect(() => {
        if (isSettled) {
            setPreviewEnabled(false);
            return;
        }
        if (isReadyForSettlement) setPreviewEnabled(true);
    }, [isReadyForSettlement, isSettled]);

    const handleOpenReturnSession = () => {
        if (!detailId) return;
        openReturnSession(detailId, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã mở phiên nhận vé trả.");
                refetchBatch();
            },
            onError: (error: any) => toast.error(getApiErrorMessage(error, "Mở phiên trả thất bại")),
        });
    };

    const handleConfirmNoReturn = () => {
        if (!detailId) return;
        confirmNoReturn({
            id: detailId,
            data: { note: "Người bán vé số không trả vé; toàn bộ vé còn giữ tính là đã bán." },
        }, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã xác nhận không có vé trả.");
                setNoReturnConfirmOpen(false);
                refetchBatch();
            },
            onError: (error: any) => toast.error(getApiErrorMessage(error, "Không thể xác nhận không có vé trả")),
        });
    };

    const handleScanSubmit = () => {
        if (!batch?.serials || !scanInput.trim()) return;
        const query = scanInput.trim().toLowerCase();
        const found = batch.serials.find((serial) =>
            serial.serialNumber.toLowerCase() === query || String(serial.serialId) === query,
        );
        if (!found) {
            toast.error("Không tìm thấy serial trong phiếu bàn giao này.");
            return;
        }
        if (found.allocationStatus !== "HANDED_OVER" && found.allocationStatus !== "RETURN_PENDING_INSPECTION") {
            toast.error("Serial này không thể thay đổi ở bước chọn vé trả.");
            return;
        }
        setSelectedSerialIds((current) => current.includes(found.serialId) ? current : [...current, found.serialId]);
        setScanInput("");
    };

    const handleSubmitReturns = () => {
        if (!detailId) return;
        replaceReturns({ id: detailId, data: { serialIds: selectedSerialIds } }, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã lưu danh sách vé chờ kiểm nhận.");
                setInspectionView("inspection");
                refetchBatch();
            },
            onError: (error: any) => toast.error(getApiErrorMessage(error, "Cập nhật danh sách vé trả thất bại")),
        });
    };

    const handleReopenInspection = () => {
        if (!detailId) return;
        reopenInspection(detailId, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã mở lại bước kiểm nhận.");
                setReopenConfirmOpen(false);
                setPreviewEnabled(false);
                setRejectedSerialIds([]);
                setRejectionReasons({});
                setInspectionView("selection");
                refetchBatch();
            },
            onError: (error: any) => toast.error(getApiErrorMessage(error, "Không thể mở lại kiểm nhận")),
        });
    };

    const openInspectionConfirmation = () => {
        const missingReason = rejectedSerialIds.some((id) => !rejectionReasons[id]?.trim());
        if (missingReason) {
            toast.error("Mỗi vé từ chối cần có lý do.");
            return;
        }
        setInspectionConfirmOpen(true);
    };

    const handleConfirmInspection = () => {
        if (!detailId) return;
        confirmInspection({
            id: detailId,
            data: {
                rejectedSerials: rejectedSerialIds.map((serialId) => ({
                    serialId,
                    reason: rejectionReasons[serialId].trim(),
                })),
            },
        }, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã chốt kết quả kiểm nhận.");
                setInspectionConfirmOpen(false);
                setRejectedSerialIds([]);
                setRejectionReasons({});
                refetchBatch();
            },
            onError: (error: any) => toast.error(getApiErrorMessage(error, "Chốt kiểm nhận thất bại")),
        });
    };

    const handleSettle = () => {
        if (!detailId || !settlementPreview) return;
        settleBatch(
            {
                id: detailId,
                data: {
                    settlementFingerprint: settlementPreview.settlementFingerprint,
                    confirmed: true,
                },
            },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã quyết toán phiếu.");
                    setPreviewEnabled(false);
                    setSettleConfirmOpen(false);
                    refetchBatch();
                },
                onError: (error: any) => {
                    const code = error?.response?.data?.code ?? error?.response?.data?.errorCode;
                    if (error?.response?.status === 409 && code === "SAG_029") {
                        toast.error("Dữ liệu đã thay đổi, hệ thống đang tính lại...");
                        setSettleConfirmOpen(false);
                        refetchPreview();
                    } else {
                        toast.error(getApiErrorMessage(error, "Quyết toán thất bại"));
                    }
                },
            }
        );
    };

    const breadcrumbItems = [
        { label: "Người bán vé số", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
        { label: "Phiếu bàn giao vé", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES },
        { label: `Chi tiết ${batch?.batchCode || detailId}` },
    ];

    if (!batch && !isLoading) {
        return <Box><Breadcrumb items={breadcrumbItems} /><Alert severity="error">Không tìm thấy phiếu bàn giao.</Alert></Box>;
    }

    return (
        <Box>
            <Breadcrumb items={breadcrumbItems} />
            <Title title={`Chi tiết phiếu bàn giao vé ${batch?.batchCode || ""}`} />
            {isLoading ? <Typography color="text.secondary">Đang tải chi tiết...</Typography> : batch && (
                <Stack spacing={3} sx={{ mt: 3 }}>
                    <Paper sx={{ p: 2.5 }}>
                        <Stack spacing={1.5}>
                            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                    <Typography variant="body2"><strong>Mã:</strong> {batch.batchCode}</Typography>
                                    <Typography variant="body2"><strong>Ngày KD:</strong> {formatDate(batch.businessDate)}</Typography>
                                    <Typography variant="body2"><strong>Người bán vé số:</strong> {profile ? `${profile.lastName || ""} ${profile.firstName || ""}`.trim() : "—"}</Typography>
                                </Stack>
                                <AdminStatusBadge
                                    label={ALLOCATION_BATCH_STATUS_LABELS[batch.status] || batch.status}
                                    modifier={getVendorAllocationBatchStatusBadgeClass(batch.status)}
                                />
                            </Stack>
                            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                                <Typography variant="body2" color="text.secondary">Đã giao: <strong>{batch.allocatedQuantity}</strong></Typography>
                                <Typography variant="body2" color="text.secondary">Đã nhận: <strong>{batch.returnWorkflow?.acceptedReturnQuantity ?? batch.returnedQuantity ?? 0}</strong></Typography>
                                <Typography variant="body2" color="text.secondary">Tính đã bán: <strong>{batch.soldQuantity ?? 0}</strong></Typography>
                            </Stack>
                        </Stack>
                    </Paper>

                    <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "flex-start" }}>
                        <Box flex={1.4} minWidth={0}>
                            {([
                                {
                                    title: "Nhập vé trả",
                                    caption: needsReturnSession
                                        ? "Chưa mở phiên"
                                        : activeStep === 0
                                            ? "Đang thực hiện"
                                            : "Đã xong",
                                },
                                {
                                    title: "Kiểm nhận",
                                    caption: activeStep < 1
                                        ? "Chưa tới bước này"
                                        : activeStep === 1
                                            ? "Đang thực hiện"
                                            : "Đã chốt kết quả",
                                },
                                {
                                    title: isSettled ? "Kết quả quyết toán" : "Quyết toán",
                                    caption: isSettled
                                        ? formatDateTime(batch.settledAt)
                                        : activeStep < 2
                                            ? "Chưa tới bước này"
                                            : "Đang thực hiện",
                                },
                            ] as const).map((item, index, list) => {
                                const isCurrent = index === activeStep;
                                const isPast = index < activeStep;
                                const canGoBackToReturn = index === 0 && activeStep === 1 && canEdit;
                                return (
                                    <Box
                                        key={item.title}
                                        sx={{
                                            display: "flex",
                                            gap: 1.5,
                                            cursor: canGoBackToReturn ? "pointer" : "default",
                                            borderRadius: 1,
                                            px: 0.5,
                                            "&:hover": canGoBackToReturn ? { bgcolor: "rgba(255,48,48,0.04)" } : undefined,
                                        }}
                                        onClick={canGoBackToReturn ? () => {
                                            setRejectedSerialIds([]);
                                            setRejectionReasons({});
                                            setInspectionView("selection");
                                        } : undefined}
                                    >
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    mt: 0.55,
                                                    borderRadius: "50%",
                                                    bgcolor: isCurrent ? CURRENT_DOT : isPast ? PAST_DOT : "transparent",
                                                    border: isCurrent || isPast ? "none" : `2px solid ${PAST_DOT}`,
                                                    boxShadow: isCurrent ? `0 0 0 4px rgba(255,48,48,0.16)` : "none",
                                                }}
                                            />
                                            {index < list.length - 1 && (
                                                <Box sx={{ flex: 1, width: "2px", bgcolor: LINE_COLOR, my: 0.75, minHeight: 28 }} />
                                            )}
                                        </Box>
                                        <Box sx={{ pb: index < list.length - 1 ? 2.5 : 0, minWidth: 0 }}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={isCurrent ? 700 : 500}
                                                color={isCurrent ? "text.primary" : isPast ? "text.primary" : "text.secondary"}
                                            >
                                                {item.title}
                                            </Typography>
                                            <Typography variant="caption" color={isCurrent ? CURRENT_DOT : "text.secondary"}>
                                                {item.caption}
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                        <Box
                            flex={1}
                            sx={{
                                border: `1px dashed ${LINE_COLOR}`,
                                borderRadius: 1.5,
                                p: 2.5,
                                minWidth: { md: 280 },
                            }}
                        >
                            <Stack spacing={1.5}>
                                <MilestoneRow label="Bàn giao lúc" value={formatDateTime(batch.depositReceivedAt)} />
                                <MilestoneRow
                                    label="Hạn cuối giao vé"
                                    value={batch.effectiveHandoverDeadlineAt ? formatDateTime(batch.effectiveHandoverDeadlineAt) : "—"}
                                />
                                <MilestoneRow label="Quyết toán lúc" value={formatDateTime(batch.settledAt)} />
                            </Stack>
                        </Box>
                    </Stack>

                    <Paper sx={{ p: 2.5 }}>
                        {activeStep === 0 && (
                            needsReturnSession ? (
                                <Stack spacing={2}>
                                    <Typography color="text.secondary">
                                        Mở phiên khi người bán vé số mang vé ế đến; sau đó nhân viên mới quét hoặc chọn serial để kiểm nhận.
                                    </Typography>
                                    <Button loading={isOpeningReturn} disabled={!canEdit} label="Mở phiên nhận vé trả" loadingLabel="Đang mở..." onClick={handleOpenReturnSession} />
                                </Stack>
                            ) : (
                                <VendorBatchReturnEntrySection
                                    batch={batch}
                                    canEdit={canEdit && Boolean(batch.returnWorkflow?.canEditReturns ?? true)}
                                    scanInput={scanInput}
                                    setScanInput={setScanInput}
                                    selectedSerialIds={selectedSerialIds}
                                    setSelectedSerialIds={setSelectedSerialIds}
                                    isSubmittingReturns={isSubmittingReturns}
                                    onScanSubmit={handleScanSubmit}
                                    onSubmitReturns={handleSubmitReturns}
                                    onSelectAllReturnable={() => setSelectedSerialIds((batch.serials || [])
                                        .filter((serial) => serial.allocationStatus === "HANDED_OVER" || serial.allocationStatus === "RETURN_PENDING_INSPECTION")
                                        .map((serial) => serial.serialId))}
                                    canConfirmNoReturn={Boolean(batch.returnWorkflow?.canConfirmNoReturn)}
                                    onConfirmNoReturn={() => setNoReturnConfirmOpen(true)}
                                />
                            )
                        )}

                        {activeStep === 1 && (
                            <Stack spacing={2}>
                                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
                                    <Typography variant="body2" color="text.secondary">
                                        Kiểm tra vé thực tế, chọn vé từ chối và nhập lý do trước khi chốt.
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        disabled={!canEdit}
                                        onClick={() => {
                                            setRejectedSerialIds([]);
                                            setRejectionReasons({});
                                            setInspectionView("selection");
                                        }}
                                    >
                                        Quay lại chọn vé trả
                                    </Button>
                                </Stack>
                                <VendorBatchInspectionSection
                                    batch={batch}
                                    rejectedInspectionSerialIds={rejectedSerialIds}
                                    setRejectedInspectionSerialIds={setRejectedSerialIds}
                                    inspectionNotes={rejectionReasons}
                                    setInspectionNotes={setRejectionReasons}
                                    isConfirmingInspection={isConfirmingInspection}
                                    onConfirmInspection={openInspectionConfirmation}
                                />
                            </Stack>
                        )}

                        {activeStep === 2 && (isSettled || isReadyForSettlement) && (
                            <Stack spacing={2}>
                                {!isSettled && batch.returnWorkflow?.canReopenInspection && (
                                    <Button variant="outlined" color="warning" disabled={!canEdit} onClick={() => setReopenConfirmOpen(true)}>
                                        Mở lại kiểm nhận
                                    </Button>
                                )}
                                <VendorBatchSettlementSection
                                    batch={batch}
                                    previewEnabled={previewEnabled}
                                    settlementPreview={settlementPreview}
                                    isLoadingPreview={isLoadingPreview}
                                    isFetchingPreview={isFetchingPreview}
                                    previewErrorMessage={
                                        previewError && isReadyForSettlement
                                            ? getApiErrorMessage(previewError, "Không thể tính quyết toán")
                                            : null
                                    }
                                    isSettling={isSettling}
                                    onEnablePreview={() => previewEnabled ? refetchPreview() : setPreviewEnabled(true)}
                                    onSettle={() => setSettleConfirmOpen(true)}
                                />
                            </Stack>
                        )}
                    </Paper>
                </Stack>
            )}

            <AdminConfirmDialog
                open={inspectionConfirmOpen}
                title="Chốt kết quả nhận trả?"
                loading={isConfirmingInspection}
                confirmLabel="Chốt kết quả"
                confirmLoadingLabel="Đang chốt..."
                onClose={() => setInspectionConfirmOpen(false)}
                onConfirm={handleConfirmInspection}
            >
                <Stack spacing={1.5}>
                    <ConfirmStatRow
                        label="Đã nhận lại"
                        count={pendingInspectionCount - rejectedSerialIds.length}
                        variant="success"
                    />
                    <ConfirmStatRow
                        label="Bị từ chối"
                        count={rejectedSerialIds.length}
                        variant="error"
                    />
                    <Typography variant="body2" color="text.secondary">
                        Vé từ chối hoặc không mang trả sẽ được tính là người bán vé số đã bán khi quyết toán.
                    </Typography>
                </Stack>
            </AdminConfirmDialog>

            <AdminConfirmDialog
                open={noReturnConfirmOpen}
                title="Xác nhận không có vé trả?"
                loading={isConfirmingNoReturn}
                confirmLabel="Xác nhận không có vé trả"
                confirmLoadingLabel="Đang xác nhận..."
                onClose={() => setNoReturnConfirmOpen(false)}
                onConfirm={handleConfirmNoReturn}
            >
                <Stack spacing={1.5}>
                    <ConfirmStatRow label="Đã nhận lại" count={0} variant="success" />
                    <ConfirmStatRow
                        label="Chưa trả, tính đã bán"
                        count={batch?.returnWorkflow?.unreturnedQuantity ?? batch?.allocatedQuantity ?? 0}
                        variant="warning"
                    />
                    <Typography variant="body2" color="text.secondary">
                        Chỉ xác nhận khi người bán vé số đã bán hết hoặc không mang bất kỳ vé nào về. Sau khi chốt, phiên trả không thể chỉnh sửa.
                    </Typography>
                </Stack>
            </AdminConfirmDialog>

            <AdminConfirmDialog
                open={settleConfirmOpen}
                title="Xác nhận quyết toán"
                maxWidth="sm"
                loading={isSettling}
                cancelLabel="Hủy"
                confirmLabel="Xác nhận quyết toán"
                confirmLoadingLabel="Đang quyết toán..."
                onClose={() => setSettleConfirmOpen(false)}
                onConfirm={handleSettle}
            >
                {settlementPreview && <VendorSettlementConfirmationSummary preview={settlementPreview} />}
            </AdminConfirmDialog>

            <AdminConfirmDialog
                open={reopenConfirmOpen}
                title="Mở lại kiểm nhận?"
                loading={isReopeningInspection}
                cancelLabel="Hủy"
                confirmLabel="Mở lại kiểm nhận"
                confirmLoadingLabel="Đang mở lại..."
                onClose={() => setReopenConfirmOpen(false)}
                onConfirm={handleReopenInspection}
            >
                <Typography variant="body2" color="text.secondary">
                    Kết quả kiểm nhận hiện tại sẽ được hủy để bạn chọn lại vé trả. Chưa có bút toán quyết toán nào được tạo.
                </Typography>
            </AdminConfirmDialog>
        </Box>
    );
};
