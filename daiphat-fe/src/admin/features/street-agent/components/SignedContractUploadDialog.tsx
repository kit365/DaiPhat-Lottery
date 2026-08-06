"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from "@mui/material";
import { LoadingButton } from "../../../components/ui/LoadingButton";

interface SignedContractUploadDialogProps {
    open: boolean;
    file: File | null;
    uploading?: boolean;
    onClose: () => void;
    onConfirm: (file: File) => void;
}

export const SignedContractUploadDialog = ({
    open,
    file,
    uploading = false,
    onClose,
    onConfirm,
}: SignedContractUploadDialogProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !file) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [open, file]);

    const isPdf = useMemo(() => {
        if (!file) return false;
        return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    }, [file]);

    const sizeLabel = useMemo(() => {
        if (!file) return "";
        const kb = file.size / 1024;
        if (kb < 1024) return `${kb.toFixed(0)} KB`;
        return `${(kb / 1024).toFixed(2)} MB`;
    }, [file]);

    // Chrome PDF viewer: fit page width so text isn't stuck at ~67% mini zoom.
    const pdfPreviewSrc = previewUrl ? `${previewUrl}#zoom=page-width` : null;

    return (
        <Dialog
            open={open}
            onClose={uploading ? undefined : onClose}
            fullWidth
            maxWidth="xl"
            PaperProps={{
                sx: {
                    height: { xs: "100%", md: "92vh" },
                    maxHeight: { xs: "100%", md: "92vh" },
                    m: { xs: 0, md: 2 },
                },
            }}
        >
            <DialogTitle>Xem trước bản hợp đồng đã ký</DialogTitle>
            <DialogContent
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    pt: 1,
                    pb: 1,
                    overflow: "hidden",
                }}
            >
                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {file
                        ? `${file.name} · ${sizeLabel} · kiểm tra nội dung trước khi đính kèm.`
                        : "Chưa chọn file."}
                </Typography>

                <Box
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        overflow: "hidden",
                        bgcolor: "grey.50",
                        flex: 1,
                        minHeight: { xs: "60vh", md: 0 },
                    }}
                >
                    {pdfPreviewSrc && isPdf ? (
                        <Box
                            component="iframe"
                            src={pdfPreviewSrc}
                            title="Preview PDF"
                            sx={{ width: "100%", height: "100%", minHeight: "70vh", border: 0 }}
                        />
                    ) : previewUrl ? (
                        <Box
                            component="img"
                            src={previewUrl}
                            alt="Preview bản ký"
                            sx={{
                                display: "block",
                                width: "100%",
                                height: "100%",
                                maxHeight: "75vh",
                                mx: "auto",
                                objectFit: "contain",
                            }}
                        />
                    ) : (
                        <Typography sx={{ p: 3 }} color="text.secondary">
                            Không có bản xem trước.
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={uploading}>
                    Hủy
                </Button>
                <LoadingButton
                    loading={uploading}
                    variant="contained"
                    disabled={!file}
                    onClick={() => file && onConfirm(file)}
                    label="Xác nhận đính kèm"
                    loadingLabel="Đang tải lên..."
                />
            </DialogActions>
        </Dialog>
    );
};
