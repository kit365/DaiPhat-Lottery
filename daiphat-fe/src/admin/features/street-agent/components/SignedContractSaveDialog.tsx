"use client";

import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Button } from "../../../components/ui/Button";

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
    <Dialog
        open={open}
        onClose={saving ? undefined : onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: "admin-theme", sx: { bgcolor: "#FFFFFF" } }}
    >
        <DialogTitle>Lưu bản hợp đồng đã ký?</DialogTitle>
        <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                Chỉ sau khi xác nhận bước này, bản ký mới được lưu chính thức vào hồ sơ người bán vé số.
            </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
            <Button variant="outlined" color="inherit" onClick={onClose} disabled={saving} label="Hủy" />
            <Button
                variant="contained"
                onClick={onConfirm}
                loading={saving}
                label="Lưu bản ký"
                loadingLabel="Đang lưu bản ký..."
                disabled={!file}
            />
        </DialogActions>
    </Dialog>
);
