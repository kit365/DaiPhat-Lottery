"use client";

import { Typography } from "@mui/material";
import { AdminConfirmDialog } from "../../../components/ui/AdminConfirmDialog";

interface SignedContractSaveDialogProps {
    open: boolean;
    file: File | null;
    saving?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/** Final confirmation for the only action that persists a signed contract. */
export const SignedContractSaveDialog = ({
    open,
    file,
    saving = false,
    onClose,
    onConfirm,
}: SignedContractSaveDialogProps) => (
    <AdminConfirmDialog
        open={open}
        title="Lưu bản hợp đồng đã ký?"
        maxWidth="sm"
        loading={saving}
        confirmDisabled={!file}
        cancelLabel="Quay lại"
        confirmLabel="Lưu bản ký"
        confirmLoadingLabel="Đang lưu bản ký..."
        onClose={onClose}
        onConfirm={onConfirm}
    >
        <Typography variant="body2" color="text.secondary">
            Chỉ sau khi xác nhận bước này, bản ký mới được lưu chính thức vào hồ sơ người bán vé số.
        </Typography>
    </AdminConfirmDialog>
);
