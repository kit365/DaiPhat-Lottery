"use client";

import { SignedContractSaveDialog as SharedSignedContractSaveDialog } from "@/admin/shared/contracts/SignedContractSaveDialog";

interface SignedContractSaveDialogProps {
    open: boolean;
    file: File | null;
    saving?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

/** Street-agent wrapper with profile-specific copy. */
export const SignedContractSaveDialog = ({
    open,
    file,
    saving = false,
    onClose,
    onConfirm,
}: SignedContractSaveDialogProps) => (
    <SharedSignedContractSaveDialog
        open={open}
        file={file}
        saving={saving}
        onClose={onClose}
        onConfirm={onConfirm}
        description="Chỉ sau khi xác nhận bước này, bản ký mới được lưu chính thức vào hồ sơ người bán vé số."
    />
);
