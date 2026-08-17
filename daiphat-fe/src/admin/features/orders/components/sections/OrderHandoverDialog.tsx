"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminConfirmDialog";
import { Icon } from "@/admin/components/ui/AdminIcon";
import type { OrderDetailResponse } from "@/types/order.type";
import type {
    ConfirmOrderHandoverRequest,
    OrderHandoverDecision,
} from "../../types/order.type";

interface OrderHandoverDialogProps {
    open: boolean;
    orderDetails: OrderDetailResponse[];
    existingEvidenceUrl?: string | null;
    loading?: boolean;
    onClose: () => void;
    onUploadEvidence: (file: File) => Promise<string>;
    onConfirm: (payload: ConfirmOrderHandoverRequest) => void;
}

type HandoverDraft = {
    decision: OrderHandoverDecision;
    reason: string;
};

const editableStatuses = new Set(["HANDOVER_IN_PROGRESS", "PROXY_HOLDING"]);

const ticketLabel = (detail: OrderDetailResponse) =>
    detail.numbers || detail.ticketId?.toString() || `Vé #${detail.id}`;

/**
 * Staff's final handover workspace. It deliberately keeps all line decisions
 * in local state until the single confirmation request is submitted.
 */
export const OrderHandoverDialog = ({
    open,
    orderDetails,
    existingEvidenceUrl,
    loading = false,
    onClose,
    onUploadEvidence,
    onConfirm,
}: OrderHandoverDialogProps) => {
    const [drafts, setDrafts] = useState<Record<number, HandoverDraft>>({});
    const [evidenceUrl, setEvidenceUrl] = useState(existingEvidenceUrl || "");
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const pendingDetails = useMemo(
        () => orderDetails.filter((detail) => editableStatuses.has(String(detail.status))),
        [orderDetails],
    );

    useEffect(() => {
        if (!open) return;
        const next: Record<number, HandoverDraft> = {};
        pendingDetails.forEach((detail) => {
            next[detail.id] = { decision: "HANDED_OVER", reason: "" };
        });
        setDrafts(next);
        setEvidenceUrl(existingEvidenceUrl || "");
        setUploadError(null);
    }, [open, pendingDetails, existingEvidenceUrl]);

    const rejectedCount = Object.values(drafts).filter(
        (draft) => draft.decision === "REJECTED_BY_CUSTOMER",
    ).length;
    const handedOverCount = Object.values(drafts).filter(
        (draft) => draft.decision === "HANDED_OVER",
    ).length;
    const hasInvalidReason = Object.values(drafts).some(
        (draft) => draft.decision === "REJECTED_BY_CUSTOMER" && !draft.reason.trim(),
    );
    const needsEvidence = handedOverCount > 0;
    const canSubmit =
        pendingDetails.length > 0 &&
        !hasInvalidReason &&
        (!needsEvidence || Boolean(evidenceUrl.trim())) &&
        !uploading &&
        !loading;

    const updateDraft = (detailId: number, update: Partial<HandoverDraft>) => {
        setDrafts((current) => ({
            ...current,
            [detailId]: { ...current[detailId], ...update },
        }));
    };

    const handleFileChange = async (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setUploadError("Vui lòng chọn file ảnh để lưu bằng chứng bàn giao.");
            return;
        }
        setUploadError(null);
        setUploading(true);
        try {
            setEvidenceUrl(await onUploadEvidence(file));
        } catch (error: any) {
            setUploadError(error?.response?.data?.message || error?.message || "Không tải được ảnh bàn giao.");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const submit = () => {
        if (!canSubmit) return;
        onConfirm({
            items: pendingDetails.map((detail) => ({
                orderDetailId: detail.id,
                decision: drafts[detail.id].decision,
                ...(drafts[detail.id].decision === "REJECTED_BY_CUSTOMER"
                    ? { reason: drafts[detail.id].reason.trim() }
                    : {}),
            })),
            ...(evidenceUrl.trim() ? { handoverEvidenceUrl: evidenceUrl.trim() } : {}),
        });
    };

    return (
        <AdminConfirmDialog
            open={open}
            title="Xác nhận bàn giao vé"
            maxWidth="md"
            cancelLabel="Quay lại"
            confirmLabel="Chốt bàn giao"
            confirmLoadingLabel="Đang lưu..."
            loading={loading}
            confirmDisabled={!canSubmit}
            onClose={onClose}
            onConfirm={submit}
        >
            <Stack spacing={2}>
                <Alert severity="info" icon={<Icon icon="solar:camera-add-bold-duotone" />}>
                    Chụp hoặc tải ảnh xác nhận khi khách nhận vé. Mỗi vé cần được xác nhận một lần.
                </Alert>

                {pendingDetails.length === 0 ? (
                    <Alert severity="warning">Không còn vé đang chờ bàn giao để chốt.</Alert>
                ) : (
                    <Stack spacing={1.25} sx={{ maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
                        {pendingDetails.map((detail) => {
                            const draft = drafts[detail.id] || {
                                decision: "HANDED_OVER" as const,
                                reason: "",
                            };
                            const rejected = draft.decision === "REJECTED_BY_CUSTOMER";
                            return (
                                <Box
                                    key={detail.id}
                                    sx={{
                                        p: 1.5,
                                        border: "1px solid var(--palette-divider)",
                                        borderRadius: 1.5,
                                        bgcolor: "var(--palette-background-neutral)",
                                    }}
                                >
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 700 }}>{ticketLabel(detail)}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {detail.stationName || "Vé số"} · {Number(detail.price || 0).toLocaleString("vi-VN")}đ
                                            </Typography>
                                        </Box>
                                        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
                                            <InputLabel>Trạng thái bàn giao</InputLabel>
                                            <Select
                                                label="Trạng thái bàn giao"
                                                value={draft.decision}
                                                onChange={(event) => updateDraft(detail.id, {
                                                    decision: event.target.value as OrderHandoverDecision,
                                                    reason: event.target.value === "HANDED_OVER" ? "" : draft.reason,
                                                })}
                                            >
                                                <MenuItem value="HANDED_OVER">Đã bàn giao</MenuItem>
                                                <MenuItem value="REJECTED_BY_CUSTOMER">Khách từ chối nhận</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Stack>
                                    {rejected && (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            required
                                            multiline
                                            minRows={2}
                                            label="Lý do khách từ chối nhận"
                                            value={draft.reason}
                                            onChange={(event) => updateDraft(detail.id, { reason: event.target.value })}
                                            error={!draft.reason.trim()}
                                            helperText={!draft.reason.trim() ? "Bắt buộc nhập lý do." : ""}
                                            sx={{ mt: 1.25 }}
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>
                )}

                <Divider />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`Bàn giao: ${handedOverCount}`} color="success" variant="outlined" />
                    <Chip label={`Từ chối: ${rejectedCount}`} color={rejectedCount ? "error" : "default"} variant="outlined" />
                </Stack>

                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                        Ảnh xác nhận bàn giao {needsEvidence ? "*" : "(khuyến nghị)"}
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                        <input
                            ref={inputRef}
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleFileChange(event.target.files?.[0])}
                        />
                        <Box
                            component="button"
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading || loading}
                            sx={{
                                border: "1px dashed var(--palette-divider)",
                                borderRadius: 1.5,
                                bgcolor: "transparent",
                                px: 2,
                                py: 1,
                                cursor: "pointer",
                                fontWeight: 700,
                                color: "var(--palette-text-primary)",
                            }}
                        >
                            {uploading ? "Đang tải ảnh..." : evidenceUrl ? "Đổi ảnh bàn giao" : "Chụp / tải ảnh"}
                        </Box>
                        {evidenceUrl && (
                            <Typography variant="body2" color="success.main" sx={{ wordBreak: "break-all" }}>
                                Đã lưu ảnh xác nhận
                            </Typography>
                        )}
                    </Stack>
                    {uploadError && <Typography color="error" variant="caption">{uploadError}</Typography>}
                </Box>
            </Stack>
        </AdminConfirmDialog>
    );
};
