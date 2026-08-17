"use client";

import { useEffect, useState } from "react";
import {
    Box,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { Button } from "@/admin/components/ui/Button";

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
            scroll="paper"
            PaperProps={{
                className: "admin-theme",
                sx: {
                    borderRadius: { xs: 0, md: "16px" },
                    boxShadow: "var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))",
                    bgcolor: "#FFFFFF",
                    overflow: "hidden",
                    height: { xs: "100%", md: "92vh" },
                    maxHeight: { xs: "100%", md: "92vh" },
                    m: { xs: 0, md: 2 },
                    display: "flex",
                    flexDirection: "column",
                },
            }}
        >
            <DialogTitle
                sx={{
                    m: 0,
                    px: 3,
                    py: 2.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--palette-divider)",
                    bgcolor: "#FFFFFF",
                    flexShrink: 0,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "rgba(28, 37, 46, 0.08)",
                            color: "var(--palette-text-primary)",
                            flexShrink: 0,
                        }}
                    >
                        <PictureAsPdfIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            component="span"
                            sx={{
                                fontWeight: 700,
                                fontSize: "1.125rem",
                                display: "block",
                                lineHeight: 1.3,
                            }}
                        >
                            {title}
                        </Typography>
                        {fileName ? (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mt: 0.25 }}
                                noWrap
                            >
                                {fileName}
                            </Typography>
                        ) : null}
                    </Box>
                </Stack>
                <IconButton onClick={onClose} size="small" aria-label="Đóng">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    px: 3,
                    py: 2.5,
                    bgcolor: "#FFFFFF",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        border: "1px solid var(--palette-divider)",
                        borderRadius: "var(--shape-borderRadius-lg)",
                        overflow: "hidden",
                        bgcolor: "var(--palette-background-neutral)",
                        flex: 1,
                        minHeight: { xs: "60vh", md: 0 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {loading ? (
                        <CircularProgress size={32} />
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

            <DialogActions
                sx={{
                    px: 3,
                    py: 2.5,
                    gap: 1.5,
                    borderTop: "1px solid var(--palette-divider)",
                    bgcolor: "#FFFFFF",
                    flexShrink: 0,
                }}
            >
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onClose}
                    label="Đóng"
                    sx={{ fontWeight: 700, borderRadius: "8px", minWidth: 100 }}
                />
                {previewUrl ? (
                    <Button
                        component="a"
                        href={previewUrl}
                        download={fileName || "hop-dong-da-ky.pdf"}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        startIcon={<DownloadOutlinedIcon />}
                        label="Tải xuống"
                        sx={{ fontWeight: 700, borderRadius: "8px", minWidth: 140 }}
                    />
                ) : null}
            </DialogActions>
        </Dialog>
    );
};
