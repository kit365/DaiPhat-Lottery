"use client";

import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { Button } from "../../../components/ui/Button";

interface SignedContractSaveDialogProps {
    open: boolean;
    file: File | null;
    saving?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(2)} MB`;
};

/** Final confirmation for the only action that persists a signed contract. */
export const SignedContractSaveDialog = ({
    open,
    file,
    saving = false,
    onClose,
    onConfirm,
}: SignedContractSaveDialogProps) => (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>Lưu bản hợp đồng đã ký?</DialogTitle>
        <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                    {file?.name || "Chưa chọn file"}
                </Typography>
                {file ? (
                    <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                    </Typography>
                ) : null}
                <Typography variant="body2" color="text.secondary">
                    Chỉ sau khi xác nhận bước này, bản ký mới được lưu chính thức vào hồ sơ người bán vé số.
                </Typography>
            </Stack>
        </DialogContent>
        <DialogActions>
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
