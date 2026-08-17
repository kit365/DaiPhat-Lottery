"use client";

import { Typography } from "@mui/material";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminConfirmDialog";

interface SignedContractSaveDialogProps {
    open: boolean;
    file: File | null;
    saving?: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
}

/** Final confirmation for the only action that persists a signed contract. */
export const SignedContractSaveDialog = ({
    open,
    file,
    saving = false,
    onClose,
    onConfirm,
    title = "Lưu bản hợp đồng đã ký?",
    description = "Chỉ sau khi xác nhận bước này, bản ký mới được lưu chính thức vào hồ sơ.",
    confirmLabel = "Lưu bản ký",
}: SignedContractSaveDialogProps) => (
    <AdminConfirmDialog
        open={open}
        title={title}
        maxWidth="sm"
        loading={saving}
        confirmDisabled={!file}
        cancelLabel="Quay lại"
        confirmLabel={confirmLabel}
        confirmLoadingLabel="Đang lưu bản ký..."
        onClose={onClose}
        onConfirm={onConfirm}
    >
        <Typography variant="body2" color="text.secondary">
            {description}
        </Typography>
    </AdminConfirmDialog>
);
