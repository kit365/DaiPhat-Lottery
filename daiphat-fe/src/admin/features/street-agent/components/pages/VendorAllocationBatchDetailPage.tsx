import React, { useEffect, useState } from "react";
import { useRouteParams } from "@/hooks/useRouteParams";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { toast } from "react-toastify";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Button } from "../../../../components/ui/Button";
import { Title } from "../../../../components/ui/Title";
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { usePermissions } from "../../../../hooks/usePermission";
import { formatDate } from "../../utils/format";
import { ALLOCATION_BATCH_STATUS_LABELS } from "../configs/constants";
import {
    useConfirmVendorReturnInspection,
    useConfirmVendorNoReturn,
    useOpenVendorAllocationReturnSession,
    useRemoveVendorAllocationReturnSerial,
    useReturnVendorAllocationSerials,
    useSettleVendorAllocation,
    useVendorAllocationBatch,
    useVendorSettlementPreview,
} from "../../hooks/useVendorAllocation";
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

const getApiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

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
    const [selectedSerialIds, setSelectedSerialIds] = useState<number[]>([]);
    const [rejectedSerialIds, setRejectedSerialIds] = useState<number[]>([]);
    const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
    const [inspectionConfirmOpen, setInspectionConfirmOpen] = useState(false);
    const [noReturnConfirmOpen, setNoReturnConfirmOpen] = useState(false);
    const [settleConfirmOpen, setSettleConfirmOpen] = useState(false);
    const [previewEnabled, setPreviewEnabled] = useState(false);

    const { data: batch, isLoading, refetch: refetchBatch } = useVendorAllocationBatch(detailId || undefined);
    const { data: profilesRes } = useStreetAgentProfiles({ page: 1, limit: 100 });
    const profile = profilesRes?.data?.recordList?.find((item) => item.id === batch?.streetAgentProfileId);

    const pendingInspectionCount = batch?.returnWorkflow?.pendingInspectionQuantity
        ?? (batch?.serials || []).filter((serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION").length;
    const stage = batch?.returnWorkflow?.stage ?? fallbackStage(batch?.status, pendingInspectionCount);
    const isSettled = stage === "SETTLED";
    const isReadyForSettlement = stage === "READY_FOR_SETTLEMENT";
    const isInspection = stage === "INSPECTION";
    const isReturnEntry = stage === "RETURN_ENTRY" && batch?.status === "RETURN_OPEN";
    const needsReturnSession = batch?.status === "CONFIRMED";

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
    const { mutate: submitReturns, isPending: isSubmittingReturns } = useReturnVendorAllocationSerials();
    const { mutate: removeReturn, isPending: isRemovingReturn } = useRemoveVendorAllocationReturnSerial();
    const { mutate: confirmInspection, isPending: isConfirmingInspection } = useConfirmVendorReturnInspection();
    const { mutate: confirmNoReturn, isPending: isConfirmingNoReturn } = useConfirmVendorNoReturn();
    const { mutate: settleBatch, isPending: isSettling } = useSettleVendorAllocation();

    useEffect(() => {
        if (isReadyForSettlement) setPreviewEnabled(true);
    }, [isReadyForSettlement]);

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
        if (found.allocationStatus !== "HANDED_OVER") {
            toast.error("Serial này không còn ở trạng thái người bán vé số đang giữ.");
            return;
        }
        setSelectedSerialIds((current) => current.includes(found.serialId) ? current : [...current, found.serialId]);
        setScanInput("");
    };

    const handleSubmitReturns = () => {
        if (!detailId || selectedSerialIds.length === 0) return;
        submitReturns({ id: detailId, data: { serialIds: selectedSerialIds } }, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã gửi vé vào phiên kiểm nhận.");
                setSelectedSerialIds([]);
                refetchBatch();
            },
            onError: (error: any) => toast.error(getApiErrorMessage(error, "Gửi vé trả thất bại")),
        });
    };

    const handleRemoveReturn = (serialId: number) => {
        if (!detailId) return;
        removeReturn({ id: detailId, serialId }, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã đưa serial trở lại bước nhập vé trả.");
                setRejectedSerialIds((current) => current.filter((id) => id !== serialId));
                setRejectionReasons((current) => {
                    const next = { ...current };
                    delete next[serialId];
                    return next;
                });
                refetchBatch();
            },
            onError: (error: any) => toast.error(getApiErrorMessage(error, "Không thể bỏ serial khỏi phiên kiểm nhận")),
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
                    setSettleConfirmOpen(false);
                    refetchBatch();
                },
                onError: (error: any) => {
                    if (error?.response?.status === 409) {
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
                                <Chip size="small" label={ALLOCATION_BATCH_STATUS_LABELS[batch.status] || batch.status} color={isSettled ? "success" : "default"} />
                            </Stack>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                                {["Nhập vé trả", "Kiểm nhận", "Quyết toán"].map((label, index) => {
                                    const activeIndex = isSettled || isReadyForSettlement ? 2 : isInspection ? 1 : 0;
                                    return <Chip key={label} size="small" label={`${index + 1}. ${label}`} color={index === activeIndex ? "primary" : index < activeIndex ? "success" : "default"} variant={index === activeIndex ? "filled" : "outlined"} />;
                                })}
                            </Stack>
                            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                                <Typography variant="body2" color="text.secondary">Đã giao: <strong>{batch.allocatedQuantity}</strong></Typography>
                                <Typography variant="body2" color="text.secondary">Đã nhận: <strong>{batch.returnWorkflow?.acceptedReturnQuantity ?? batch.returnedQuantity ?? 0}</strong></Typography>
                                <Typography variant="body2" color="text.secondary">Tính đã bán: <strong>{batch.soldQuantity ?? 0}</strong></Typography>
                            </Stack>
                        </Stack>
                    </Paper>

                    <Stepper activeStep={isSettled || isReadyForSettlement ? 2 : isInspection ? 1 : 0} orientation="vertical" sx={{ px: 2 }}>
                        {/* Step 1: Nhập vé trả */}
                        <Step>
                            <StepLabel>Nhập vé trả</StepLabel>
                            <StepContent>
                                {needsReturnSession ? (
                                    <Stack spacing={2} sx={{ mt: 1 }}>
                                        <Typography color="text.secondary">Mở phiên khi người bán vé số mang vé ế đến; sau đó nhân viên mới quét hoặc chọn serial để kiểm nhận.</Typography>
                                        <Button loading={isOpeningReturn} disabled={!canEdit} label="Mở phiên nhận vé trả" loadingLabel="Đang mở..." onClick={handleOpenReturnSession} />
                                    </Stack>
                                ) : (
                                    <Box sx={{ mt: 1 }}>
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
                                            onSelectAllReturnable={() => setSelectedSerialIds((batch.serials || []).filter((serial) => serial.allocationStatus === "HANDED_OVER").map((serial) => serial.serialId))}
                                            canConfirmNoReturn={Boolean(batch.returnWorkflow?.canConfirmNoReturn)}
                                            onConfirmNoReturn={() => setNoReturnConfirmOpen(true)}
                                        />
                                    </Box>
                                )}
                            </StepContent>
                        </Step>

                        {/* Step 2: Kiểm nhận */}
                        <Step>
                            <StepLabel>Kiểm nhận và chốt kết quả</StepLabel>
                            <StepContent>
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Có thể bỏ một serial khỏi phiên để quay lại bước nhập trước khi chốt.</Typography>
                                    <VendorBatchInspectionSection
                                        batch={batch}
                                        rejectedInspectionSerialIds={rejectedSerialIds}
                                        setRejectedInspectionSerialIds={setRejectedSerialIds}
                                        inspectionNotes={rejectionReasons}
                                        setInspectionNotes={setRejectionReasons}
                                        isConfirmingInspection={isConfirmingInspection || isRemovingReturn}
                                        onConfirmInspection={openInspectionConfirmation}
                                        onRemoveReturn={handleRemoveReturn}
                                    />
                                </Box>
                            </StepContent>
                        </Step>

                        {/* Step 3: Quyết toán */}
                        <Step>
                            <StepLabel>{isSettled ? "Kết quả quyết toán" : "Quyết toán"}</StepLabel>
                            <StepContent>
                                <Box sx={{ mt: 1 }}>
                                    {(isSettled || isReadyForSettlement) && (
                                        <VendorBatchSettlementSection
                                            batch={batch}
                                            previewEnabled={previewEnabled}
                                            settlementPreview={settlementPreview}
                                            isLoadingPreview={isLoadingPreview}
                                            isFetchingPreview={isFetchingPreview}
                                            previewErrorMessage={previewError ? getApiErrorMessage(previewError, "Không thể tính quyết toán") : null}
                                            isSettling={isSettling}
                                            onEnablePreview={() => previewEnabled ? refetchPreview() : setPreviewEnabled(true)}
                                            onSettle={() => setSettleConfirmOpen(true)}
                                        />
                                    )}
                                </Box>
                            </StepContent>
                        </Step>
                    </Stepper>
                </Stack>
            )}

            <Dialog open={inspectionConfirmOpen} onClose={() => !isConfirmingInspection && setInspectionConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Chốt kết quả nhận trả?</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 1 }}>
                        <Typography>Đã nhận lại: <strong>{pendingInspectionCount - rejectedSerialIds.length}</strong> vé</Typography>
                        <Typography>Bị từ chối: <strong>{rejectedSerialIds.length}</strong> vé</Typography>
                        <Typography color="text.secondary">Vé từ chối hoặc không mang trả sẽ được tính là người bán vé số đã bán khi quyết toán.</Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setInspectionConfirmOpen(false)}>Quay lại</Button>
                    <Button loading={isConfirmingInspection} label="Chốt kết quả" loadingLabel="Đang chốt..." onClick={handleConfirmInspection} />
                </DialogActions>
            </Dialog>

            <Dialog open={noReturnConfirmOpen} onClose={() => !isConfirmingNoReturn && setNoReturnConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Xác nhận không có vé trả?</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 1 }}>
                        <Typography>Đã nhận lại: <strong>0</strong> vé</Typography>
                        <Typography>Chưa trả, tính là đã bán: <strong>{batch?.returnWorkflow?.unreturnedQuantity ?? batch?.allocatedQuantity ?? 0}</strong> vé</Typography>
                        <Typography color="text.secondary">
                            Chỉ xác nhận khi người bán vé số đã bán hết hoặc không mang bất kỳ vé nào về. Sau khi chốt, phiên trả không thể chỉnh sửa.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setNoReturnConfirmOpen(false)}>Quay lại</Button>
                    <Button loading={isConfirmingNoReturn} label="Xác nhận không có vé trả" loadingLabel="Đang xác nhận..." onClick={handleConfirmNoReturn} />
                </DialogActions>
            </Dialog>

            <Dialog open={settleConfirmOpen} onClose={() => !isSettling && setSettleConfirmOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Xác nhận quyết toán</DialogTitle>
                <DialogContent>
                    {settlementPreview && <VendorSettlementConfirmationSummary preview={settlementPreview} />}
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setSettleConfirmOpen(false)}>Hủy</Button>
                    <Button loading={isSettling} label="Xác nhận quyết toán" loadingLabel="Đang quyết toán..." onClick={handleSettle} />
                </DialogActions>
            </Dialog>
        </Box>
    );
};
