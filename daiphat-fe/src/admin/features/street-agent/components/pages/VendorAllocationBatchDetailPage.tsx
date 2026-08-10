import React, { useEffect, useState } from "react";
import { useRouteParams } from "@/hooks/useRouteParams";
import { Box, Stack, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Typography, Accordion, AccordionSummary, AccordionDetails, Chip } from "@mui/material";
import { toast } from "react-toastify";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import { Button } from "../../../../components/ui/Button";
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { usePermissions } from "../../../../hooks/usePermission";
const getApiErrorMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback;
import { formatCurrency, formatDate } from "../../utils/format";
import { ALLOCATION_BATCH_STATUS_LABELS } from "../configs/constants";
import {
    useOpenVendorAllocationReturnSession,
    useReturnVendorAllocationSerials,
    useConfirmVendorReturnInspection,
    useSettleVendorAllocation,
    useVendorAllocationBatch,
    useVendorSettlementPreview,
} from "../../hooks/useVendorAllocation";
import { useStreetAgentProfiles } from "../../hooks/useStreetAgent";
import { VendorBatchDepositSnapshotSection, VendorBatchSerialReturnSection, VendorBatchSettlementSection, mapPreviewToBreakdown, VendorSettlementBreakdown } from "../sections/VendorBatchDrawerSections";

export const VendorAllocationBatchDetailPage = () => {
    const { id: rawId } = useRouteParams();
    const detailId = Number(rawId);

    const { can } = usePermissions();
    const canEdit = can(PERMISSIONS.STREET_AGENT.MANAGE);

    const [scanInput, setScanInput] = useState("");
    const [selectedSerialIds, setSelectedSerialIds] = useState<number[]>([]);

    const [previewEnabled, setPreviewEnabled] = useState(false);
    const [returnSessionConfirmOpen, setReturnSessionConfirmOpen] = useState(false);
    const [inspectionConfirmOpen, setInspectionConfirmOpen] = useState(false);
    const [rejectedInspectionSerialIds, setRejectedInspectionSerialIds] = useState<number[]>([]);
    const [inspectionNote, setInspectionNote] = useState("");

    const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
    const [cashReceivedFromVendor, setCashReceivedFromVendor] = useState("");
    const [cashPaidToVendor, setCashPaidToVendor] = useState("");

    const { data: detailBatch, isLoading: isLoadingDetail, refetch: refetchDetail } = useVendorAllocationBatch(detailId || undefined);

    const { data: profilesRes } = useStreetAgentProfiles({ page: 1, limit: 100 });
    const profile = profilesRes?.data?.recordList?.find(p => p.id === detailBatch?.streetAgentProfileId);

    const {
        data: settlementPreview,
        isLoading: isLoadingPreview,
        isFetching: isFetchingPreview,
        error: previewError,
        refetch: refetchPreview,
    } = useVendorSettlementPreview(
        detailId || undefined,
        previewEnabled && detailBatch?.status === "RETURN_OPEN"
    );

    const { mutate: openReturnSession, isPending: isOpeningReturn } = useOpenVendorAllocationReturnSession();
    const { mutate: submitReturns, isPending: isSubmittingReturns } = useReturnVendorAllocationSerials();
    const { mutate: confirmReturnInspection, isPending: isConfirmingInspection } = useConfirmVendorReturnInspection();
    const { mutate: settleBatch, isPending: isSettling } = useSettleVendorAllocation();

    const expectedCashReceived = settlementPreview
        ? (settlementPreview.forcedPurchaseAmount > 0
            ? settlementPreview.additionalAmountDue
            : settlementPreview.grossCashRemitted)
        : 0;
    const expectedCashPaid = settlementPreview
        ? settlementPreview.commissionPayable
            + settlementPreview.depositRefundAmount
            + (settlementPreview.depositExcessRefundAmount || 0)
        : 0;

    useEffect(() => {
        if (!settleConfirmOpen || !settlementPreview) return;
        setCashReceivedFromVendor(String(expectedCashReceived));
        setCashPaidToVendor(String(expectedCashPaid));
    }, [settleConfirmOpen, settlementPreview, expectedCashReceived, expectedCashPaid]);

    const handleOpenReturnSession = () => {
        if (!detailId) return;
        openReturnSession(detailId, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã mở phiên nhận vé trả.");
                setReturnSessionConfirmOpen(false);
                refetchDetail();
            },
            onError: (error: any) => toast.error(getApiErrorMessage(error, "Mở phiên trả thất bại")),
        });
    };

    const handleScanSubmit = () => {
        if (!detailBatch?.serials || !scanInput.trim()) return;
        const query = scanInput.trim().toLowerCase();
        const found = detailBatch.serials.find(
            (s) =>
                s.serialNumber.toLowerCase() === query ||
                String(s.serialId) === query
        );

        if (!found) {
            toast.error("Không tìm thấy serial trong phiếu bàn giao này");
            return;
        }
        if (found.allocationStatus !== "HANDED_OVER") {
            toast.error(`Serial đang ở trạng thái ${found.allocationStatus}, không thể chọn để trả.`);
            return;
        }

        setSelectedSerialIds((prev) => {
            if (prev.includes(found.serialId)) {
                toast.warning("Serial này đã được chọn");
                return prev;
            }
            return [...prev, found.serialId];
        });
        setScanInput("");
    };

    const handleSubmitReturns = () => {
        if (!detailId || selectedSerialIds.length === 0) return;
        submitReturns(
            { id: detailId, data: { serialIds: selectedSerialIds } },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã gửi danh sách vé trả về đại lý.");
                    setSelectedSerialIds([]);
                    refetchDetail();
                    if (previewEnabled) refetchPreview();
                },
                onError: (error: any) => toast.error(getApiErrorMessage(error, "Gửi vé trả thất bại")),
            }
        );
    };

    const handleConfirmInspection = () => {
        if (!detailId) return;
        confirmReturnInspection(
            {
                id: detailId,
                data: {
                    rejectedSerialIds: rejectedInspectionSerialIds,
                    note: inspectionNote.trim() || undefined,
                },
            },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Kiểm nhận hoàn tất.");
                    setInspectionConfirmOpen(false);
                    setRejectedInspectionSerialIds([]);
                    setInspectionNote("");
                    refetchDetail();
                    if (previewEnabled) refetchPreview();
                },
                onError: (error: any) => toast.error(getApiErrorMessage(error, "Xác nhận kiểm nhận thất bại")),
            }
        );
    };

    const handleSettle = () => {
        if (!detailId) return;
        const received = Number(cashReceivedFromVendor);
        const paid = Number(cashPaidToVendor);
        if (!Number.isFinite(received) || !Number.isFinite(paid) || received < 0 || paid < 0) {
            toast.error("Số tiền thu/chi không hợp lệ");
            return;
        }
        settleBatch(
            {
                id: detailId,
                data: {
                    cashReceivedFromVendor: received,
                    cashPaidToVendor: paid,
                },
            },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã quyết toán phiếu.");
                    setSettleConfirmOpen(false);
                    refetchDetail();
                },
                onError: (error: any) => toast.error(getApiErrorMessage(error, "Quyết toán thất bại")),
            }
        );
    };

    const breadcrumbItems = [
        { label: "Đại lý bán dạo" },
        { label: "Phiếu bàn giao vé", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES },
        { label: `Chi tiết ${detailBatch?.batchCode || detailId}` },
    ];

    if (!detailBatch && !isLoadingDetail) {
        return (
            <Box>
                <Breadcrumb items={breadcrumbItems} />
                <Alert severity="error">Không tìm thấy phiếu bàn giao (ID: {detailId})</Alert>
            </Box>
        );
    }

    return (
        <Box>
            <Breadcrumb items={breadcrumbItems} />
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 3 }}>
                <Title title={`Chi tiết phiếu bàn giao vé ${detailBatch?.batchCode}`} />
            </Stack>

            {isLoadingDetail ? (
                <Typography color="text.secondary">Đang tải chi tiết...</Typography>
            ) : detailBatch && (
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
                    <Box>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            {/* Compact Header */}
                            <Stack spacing={1} sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    Thông tin phiếu
                                </Typography>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Typography variant="body2"><strong>Mã:</strong> {detailBatch.batchCode}</Typography>
                                    <Typography variant="body2"><strong>Ngày:</strong> {formatDate(detailBatch.businessDate)}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Typography variant="body2">
                                        <strong>Đại lý:</strong> {profile ? `${profile.lastName || ""} ${profile.firstName || ""}`.trim() : "—"}
                                    </Typography>
                                    <Chip
                                        label={ALLOCATION_BATCH_STATUS_LABELS[detailBatch.status] || detailBatch.status}
                                        size="small"
                                        color={detailBatch.status === 'SETTLED' ? 'success' : 'default'}
                                    />
                                </Stack>
                            </Stack>

                            {/* KPI Row */}
                            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} sx={{ mb: 3 }}>
                                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">Đã giao</Typography>
                                    <Typography variant="h6">{detailBatch.allocatedQuantity}</Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">Đã trả</Typography>
                                    <Typography variant="h6">{detailBatch.returnedQuantity ?? 0}</Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">Đã bán</Typography>
                                    <Typography variant="h6">{detailBatch.soldQuantity ?? 0}</Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">Còn lại</Typography>
                                    <Typography variant="h6">{Math.max(0, (detailBatch.allocatedQuantity || 0) - (detailBatch.returnedQuantity || 0) - (detailBatch.soldQuantity || 0))}</Typography>
                                </Paper>
                            </Box>

                            <Accordion variant="outlined" elevation={0} sx={{ '&:before': { display: 'none' } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle2">Chi tiết đối soát</Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 0 }}>
                                    <VendorBatchDepositSnapshotSection batch={detailBatch} />
                                </AccordionDetails>
                            </Accordion>

                            <Box sx={{ mt: 2 }} />
                            <VendorBatchSettlementSection
                                batch={detailBatch}
                                canEdit={canEdit}
                                previewEnabled={previewEnabled}
                                settlementPreview={settlementPreview}
                                isLoadingPreview={isLoadingPreview}
                                isFetchingPreview={isFetchingPreview}
                                previewErrorMessage={previewError ? getApiErrorMessage(previewError, "Lỗi preview") : null}
                                selectedSerialIdsCount={selectedSerialIds.length}
                                pendingInspectionCount={detailBatch.serials?.filter((s) => s.allocationStatus === "RETURN_PENDING_INSPECTION").length || 0}
                                isSettling={isSettling}
                                onEnablePreview={() => setPreviewEnabled(true)}
                                onSettle={() => setSettleConfirmOpen(true)}
                            />
                        </Paper>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <VendorBatchSerialReturnSection
                                batch={detailBatch}
                                canEdit={canEdit}
                                scanInput={scanInput}
                                setScanInput={setScanInput}
                                selectedSerialIds={selectedSerialIds}
                                setSelectedSerialIds={setSelectedSerialIds}
                                isOpeningReturn={isOpeningReturn}
                                isSubmittingReturns={isSubmittingReturns}
                                onOpenReturnSession={() => setReturnSessionConfirmOpen(true)}
                                onScanSubmit={handleScanSubmit}
                                onSubmitReturns={handleSubmitReturns}
                                onSelectAllReturnable={() => {
                                    const ids = (detailBatch.serials || [])
                                        .filter((s) => s.allocationStatus === "HANDED_OVER")
                                        .map((s) => s.serialId);
                                    setSelectedSerialIds(ids);
                                }}
                            />
                        </Paper>
                    </Box>
                </Box>
            )}

            <Dialog open={returnSessionConfirmOpen} onClose={() => setReturnSessionConfirmOpen(false)}>
                <DialogTitle>Mở phiên trả vé?</DialogTitle>
                <DialogContent>
                    Phiếu sẽ chuyển sang trạng thái đang trả vé để quét serial trả về.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReturnSessionConfirmOpen(false)}>Đóng</Button>
                    <Button
                        loading={isOpeningReturn}
                        variant="contained"
                        onClick={handleOpenReturnSession}
                        label="Mở phiên trả"
                        loadingLabel="Đang mở..."
                    />
                </DialogActions>
            </Dialog>

            <Dialog open={settleConfirmOpen} onClose={() => setSettleConfirmOpen(false)}>
                <DialogTitle>Xác nhận quyết toán?</DialogTitle>
                <DialogContent>
                    {settlementPreview ? (
                        <Stack spacing={2.5} sx={{ pt: 1 }}>
                            <VendorSettlementBreakdown {...mapPreviewToBreakdown(settlementPreview)} />
                            <Alert severity="info">
                                Nhập lại số tiền thực tế nhân viên đã thu/chi. Hệ thống chỉ chốt khi khớp preview.
                            </Alert>
                            <TextField
                                autoFocus
                                type="number"
                                label="Tiền thực nhận từ vendor (VNĐ)"
                                value={cashReceivedFromVendor}
                                onChange={(event) => setCashReceivedFromVendor(event.target.value)}
                                inputProps={{ min: 0, step: 1 }}
                                helperText={`Theo preview: ${formatCurrency(expectedCashReceived)}`}
                                fullWidth
                            />
                            <TextField
                                type="number"
                                label="Tiền thực chi cho vendor (VNĐ)"
                                value={cashPaidToVendor}
                                onChange={(event) => setCashPaidToVendor(event.target.value)}
                                inputProps={{ min: 0, step: 1 }}
                                helperText={`Theo preview: ${formatCurrency(expectedCashPaid)}`}
                                fullWidth
                            />
                        </Stack>
                    ) : (
                        <Typography>
                            Hệ thống sẽ chốt số vé bán/trả và cập nhật số dư cọc theo snapshot của phiếu.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettleConfirmOpen(false)}>Đóng</Button>
                    <Button
                        loading={isSettling}
                        variant="contained"
                        onClick={handleSettle}
                        disabled={detailBatch?.status !== "RETURN_OPEN"}
                        label="Quyết toán"
                        loadingLabel="Đang quyết toán..."
                    />
                </DialogActions>
            </Dialog>
        </Box>
    );
};
