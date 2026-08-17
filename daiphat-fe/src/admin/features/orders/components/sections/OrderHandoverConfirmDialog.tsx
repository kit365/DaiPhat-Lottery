"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Typography, FormControlLabel, Checkbox, Box, Stack } from "@mui/material";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminConfirmDialog";
import { Icon } from "@/admin/components/ui/AdminIcon";

interface OrderHandoverConfirmDialogProps {
    open: boolean;
    existingEvidenceUrl?: string | null;
    loading?: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onUploadEvidence: (file: File) => Promise<string>;
}

/**
 * Confirmation before PENDING_PICKUP → COMPLETED.
 * Confirm stays disabled until staff acknowledges the customer inspection checklist.
 */
export const OrderHandoverConfirmDialog = ({
    open,
    existingEvidenceUrl,
    loading = false,
    onClose,
    onConfirm,
    onUploadEvidence,
}: OrderHandoverConfirmDialogProps) => {
    const [acknowledged, setAcknowledged] = useState(false);
    const [evidenceUrl, setEvidenceUrl] = useState(existingEvidenceUrl || "");
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (open) {
            setAcknowledged(false);
            setEvidenceUrl(existingEvidenceUrl || "");
            setUploadError(null);
        }
    }, [open, existingEvidenceUrl]);

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

    const canConfirm = acknowledged && Boolean(evidenceUrl.trim()) && !uploading && !loading;

    return (
        <AdminConfirmDialog
            open={open}
            title="Xác nhận bàn giao"
            maxWidth="sm"
            cancelLabel="Quay lại"
            confirmLabel="Xác nhận bàn giao"
            confirmLoadingLabel="Đang lưu..."
            loading={loading}
            confirmDisabled={!canConfirm}
            onClose={onClose}
            onConfirm={() => {
                if (!canConfirm) return;
                onConfirm();
            }}
        >
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Yêu cầu khách hàng kiểm tra số lượng và tình trạng vé trước khi staff chốt bàn giao.
                </Typography>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: "12px",
                        border: "1px solid var(--palette-divider)",
                        bgcolor: "var(--palette-background-neutral)",
                    }}
                >
                    <FormControlLabel
                        sx={{
                            alignItems: "flex-start",
                            m: 0,
                            gap: 0.5,
                            "& .MuiFormControlLabel-label": { pt: 0.25 },
                        }}
                        control={
                            <Checkbox
                                checked={acknowledged}
                                onChange={(e) => setAcknowledged(e.target.checked)}
                                color="warning"
                                sx={{ pt: 0 }}
                            />
                        }
                        label={
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.5 }}>
                                Tôi xác nhận khách hàng đã kiểm tra và đã nhận đủ vé.
                            </Typography>
                        }
                    />
                </Box>

                <Alert severity="info" icon={<Icon icon="solar:camera-add-bold-duotone" />}>
                    Ảnh bàn giao là bằng chứng đối soát bắt buộc. Có thể chụp hoặc chọn ảnh từ thiết bị.
                </Alert>
                <input
                    ref={inputRef}
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileChange(event.target.files?.[0])}
                />
                <Stack direction="row" spacing={1.5} alignItems="center">
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
                        <Typography variant="body2" color="success.main">
                            Đã lưu ảnh xác nhận
                        </Typography>
                    )}
                </Stack>
                {uploadError && <Typography color="error" variant="caption">{uploadError}</Typography>}
            </Stack>
        </AdminConfirmDialog>
    );
};
