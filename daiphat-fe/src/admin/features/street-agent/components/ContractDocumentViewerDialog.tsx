"use client";

import { useEffect, useState } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from "@mui/material";

interface ContractDocumentViewerDialogProps {
    open: boolean;
    /** Remote HTTPS URL (signed contract on storage) or local object URL. */
    url?: string | null;
    title?: string;
    fileName?: string | null;
    onClose: () => void;
}

const looksLikePdf = (url: string, contentType: string, fileName?: string | null) => {
    const lowerUrl = url.toLowerCase();
    const lowerName = (fileName || "").toLowerCase();
    return (
        contentType.includes("pdf") ||
        lowerUrl.includes(".pdf") ||
        lowerName.endsWith(".pdf")
    );
};

/**
 * Opens a stored signed-contract document inline in a dialog.
 * Fetches as blob first so Cloudinary/raw URLs don't force a download.
 */
export const ContractDocumentViewerDialog = ({
    open,
    url,
    title = "Bản hợp đồng đã ký",
    fileName,
    onClose,
}: ContractDocumentViewerDialogProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPdf, setIsPdf] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !url) {
            setPreviewUrl(null);
            setError(null);
            setLoading(false);
            return;
        }

        let objectUrl: string | null = null;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            setPreviewUrl(null);
            try {
                // Already a local blob/data URL — use directly.
                if (url.startsWith("blob:") || url.startsWith("data:")) {
                    if (cancelled) return;
                    setIsPdf(looksLikePdf(url, "", fileName));
                    setPreviewUrl(url);
                    return;
                }

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error("Không tải được tài liệu từ kho lưu trữ.");
                }
                const rawBlob = await response.blob();
                const contentType = (rawBlob.type || response.headers.get("content-type") || "").toLowerCase();
                const pdf = looksLikePdf(url, contentType, fileName);
                const blob = pdf
                    ? new Blob([rawBlob], { type: "application/pdf" })
                    : rawBlob;
                objectUrl = URL.createObjectURL(blob);
                if (cancelled) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }
                setIsPdf(pdf);
                setPreviewUrl(objectUrl);
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message || "Không mở được bản hợp đồng đã ký.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [open, url, fileName]);

    const iframeSrc =
        previewUrl && isPdf ? `${previewUrl}#zoom=page-width` : previewUrl;

    return (
        <Dialog
            open={open}
            onClose={onClose}
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
            <DialogTitle>{title}</DialogTitle>
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
                {fileName ? (
                    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {fileName}
                    </Typography>
                ) : null}

                <Box
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        overflow: "hidden",
                        bgcolor: "grey.50",
                        flex: 1,
                        minHeight: { xs: "60vh", md: 0 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {loading ? (
                        <CircularProgress />
                    ) : error ? (
                        <Typography sx={{ p: 3 }} color="error">
                            {error}
                        </Typography>
                    ) : iframeSrc && isPdf ? (
                        <Box
                            component="iframe"
                            src={iframeSrc}
                            title={title}
                            sx={{ width: "100%", height: "100%", minHeight: "70vh", border: 0 }}
                        />
                    ) : previewUrl ? (
                        <Box
                            component="img"
                            src={previewUrl}
                            alt={title}
                            sx={{
                                display: "block",
                                width: "100%",
                                height: "100%",
                                maxHeight: "75vh",
                                objectFit: "contain",
                            }}
                        />
                    ) : (
                        <Typography sx={{ p: 3 }} color="text.secondary">
                            Không có tài liệu để xem.
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                {previewUrl ? (
                    <Button
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={fileName || undefined}
                    >
                        Tải xuống
                    </Button>
                ) : null}
                <Button onClick={onClose} variant="contained">
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
