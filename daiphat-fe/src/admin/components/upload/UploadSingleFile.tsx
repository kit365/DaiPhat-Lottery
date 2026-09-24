"use client";

import {
    Box,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    FormHelperText,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { UploadFileIcon, UploadIcon } from "../../assets/icons";
import { useDropzone, type Accept } from "react-dropzone";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadAdminImage } from "@/admin/shared/services/upload.service";
import { AppToast } from "../../../utils/toast.util";

import RotateRightIcon from '@mui/icons-material/RotateRight';

interface CustomFile extends File {
    preview: string;
}

const rotateImageFile = async (file: File, angle: number = 90): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Failed to get canvas context"));

            if (angle === 90 || angle === 270) {
                canvas.width = image.height;
                canvas.height = image.width;
            } else {
                canvas.width = image.width;
                canvas.height = image.height;
            }

            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((angle * Math.PI) / 180);
            ctx.drawImage(image, -image.width / 2, -image.height / 2);

            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error("Canvas toBlob failed"));
                const rotatedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                });
                resolve(rotatedFile);
            }, file.type);
        };
        image.onerror = reject;
        image.src = URL.createObjectURL(file);
    });
};

export type UploadFileCategory = "image" | "pdf" | "excel" | "csv" | "docx" | "document" | "other";

interface UploadSingleFileProps {
    value?: string | File | null;
    onChange: (value: any) => void;
    disabled?: boolean;
    error?: string;
    useRawFile?: boolean;
    customUpload?: (file: File) => Promise<string>;
    /** When true, upload starts immediately after file selection. */
    autoUpload?: boolean;
    onUploadingChange?: (uploading: boolean) => void;
    compact?: boolean;
    compactThumbSize?: number;
    label?: string;
    required?: boolean;
    maxFileSizeMb?: number;
    accept?: Accept;
    onPreview?: () => void;
    helperText?: string;
}

export const getUploadFileCategory = (fileOrUrl: File | string | null | undefined): UploadFileCategory => {
    if (!fileOrUrl) return "other";

    if (fileOrUrl instanceof File) {
        const mime = (fileOrUrl.type || "").toLowerCase();
        const name = (fileOrUrl.name || "").toLowerCase();
        if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|avif|tiff|tif)$/i.test(name)) {
            return "image";
        }
        if (mime === "application/pdf" || /\.pdf$/i.test(name)) {
            return "pdf";
        }
        if (
            mime.includes("excel") ||
            mime.includes("spreadsheetml") ||
            /\.(xlsx|xls|xlsm)$/i.test(name)
        ) {
            return "excel";
        }
        if (mime === "text/csv" || mime.includes("csv") || /\.csv$/i.test(name)) {
            return "csv";
        }
        if (
            mime.includes("word") ||
            mime.includes("wordprocessingml") ||
            mime.includes("officedocument.word") ||
            /\.(docx|doc|rtf|odt)$/i.test(name)
        ) {
            return "docx";
        }
        if (mime.startsWith("text/") || /\.(txt|json|xml|log)$/i.test(name)) {
            return "document";
        }
        return "other";
    }

    if (typeof fileOrUrl === "string" && fileOrUrl.trim()) {
        const rawUrl = fileOrUrl.trim();
        const cleanUrl = rawUrl.split("?")[0].split("#")[0].toLowerCase();
        if (rawUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|avif|tiff|tif)$/i.test(cleanUrl)) {
            return "image";
        }
        if (rawUrl.startsWith("data:application/pdf") || /\.pdf$/i.test(cleanUrl) || cleanUrl.includes(".pdf/")) {
            return "pdf";
        }
        if (/\.(xlsx|xls|xlsm)$/i.test(cleanUrl) || cleanUrl.includes(".xlsx/") || cleanUrl.includes(".xls/")) {
            return "excel";
        }
        if (/\.csv$/i.test(cleanUrl) || cleanUrl.includes(".csv/")) {
            return "csv";
        }
        if (/\.(docx|doc|rtf|odt)$/i.test(cleanUrl) || cleanUrl.includes(".docx/") || cleanUrl.includes(".doc/")) {
            return "docx";
        }
        if (/\.(txt|json|xml|log)$/i.test(cleanUrl)) {
            return "document";
        }
        return "other";
    }

    return "other";
};

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extractFileName = (fileOrUrl: File | string | null | undefined, fallback = "Tệp đã chọn"): string => {
    if (!fileOrUrl) return fallback;
    if (fileOrUrl instanceof File) {
        return fileOrUrl.name;
    }
    if (typeof fileOrUrl === "string" && fileOrUrl.trim()) {
        try {
            const clean = fileOrUrl.split("?")[0].split("#")[0];
            const segment = clean.substring(clean.lastIndexOf("/") + 1);
            if (segment && segment.length > 0) {
                return decodeURIComponent(segment);
            }
        } catch {
            // fallback
        }
    }
    return fallback;
};

export const UploadSingleFile = memo(
    ({
        value,
        onChange,
        disabled,
        error,
        useRawFile,
        customUpload,
        autoUpload,
        onUploadingChange,
        compact,
        compactThumbSize,
        label,
        required,
        maxFileSizeMb = 10,
        accept = { "image/*": [] },
        onPreview,
        helperText,
    }: UploadSingleFileProps) => {
        const [localFile, setLocalFile] = useState<CustomFile | null>(null);
        const [isUploading, setIsUploading] = useState(false);
        const [previewUrl, setPreviewUrl] = useState<string>("");
        const [imageError, setImageError] = useState(false);
        const [isViewerOpen, setIsViewerOpen] = useState(false);

        const fileRef = useRef<CustomFile | null>(null);

        useEffect(() => {
            fileRef.current = localFile;
        }, [localFile]);

        useEffect(() => {
            onUploadingChange?.(isUploading);
        }, [isUploading, onUploadingChange]);

        useEffect(() => {
            if (useRawFile && value instanceof File) {
                const objectUrl = URL.createObjectURL(value);
                setPreviewUrl(objectUrl);
                return () => URL.revokeObjectURL(objectUrl);
            } else {
                setPreviewUrl("");
            }
        }, [value, useRawFile]);

        useEffect(() => {
            setImageError(false);
        }, [value, localFile]);

        const uploadFile = useCallback(
            async (file: CustomFile) => {
                try {
                    setIsUploading(true);
                    let url: string;
                    if (customUpload) {
                        url = await customUpload(file);
                    } else {
                        url = await uploadAdminImage(file);
                    }
                    onChange(url);
                    setLocalFile(null);
                } catch (err: any) {
                    AppToast.error(err?.message || "Tải tệp lên thất bại!");
                } finally {
                    setIsUploading(false);
                }
            },
            [customUpload, onChange]
        );

        const onDrop = useCallback(
            (acceptedFiles: File[]) => {
                if (!acceptedFiles.length) return;

                const file = acceptedFiles[0];
                const maxBytes = maxFileSizeMb * 1024 * 1024;
                if (file.size > maxBytes) {
                    AppToast.error(`Tệp vượt quá ${maxFileSizeMb}MB. Vui lòng chọn tệp nhỏ hơn.`);
                    return;
                }
                setImageError(false);
                if (useRawFile) {
                    onChange(file);
                } else {
                    const customFile = file as CustomFile;
                    customFile.preview = URL.createObjectURL(file);
                    setLocalFile(customFile);
                    if (autoUpload) {
                        void uploadFile(customFile);
                    }
                }
            },
            [useRawFile, onChange, autoUpload, uploadFile, maxFileSizeMb]
        );

        const { getRootProps, getInputProps, isDragActive } = useDropzone({
            accept,
            multiple: false,
            onDrop,
            disabled: disabled || isUploading,
            noClick: false,
        });

        const handleRemove = useCallback(() => {
            if (useRawFile) {
                onChange(null);
            } else {
                if (localFile?.preview) {
                    URL.revokeObjectURL(localFile.preview);
                }
                setLocalFile(null);
                onChange("");
            }
            setImageError(false);
        }, [localFile, onChange, useRawFile]);

        const handleUpload = async () => {
            if (!localFile) return;
            await uploadFile(localFile);
        };

        const handleRotate = useCallback(async () => {
            if (isUploading) return;
            const targetFile = useRawFile ? (value instanceof File ? value : null) : (localFile ? localFile : null);
            if (!targetFile) return;

            try {
                setIsUploading(true);
                const rotatedFile = await rotateImageFile(targetFile, 90);
                
                if (useRawFile) {
                    onChange(rotatedFile);
                } else {
                    const customFile = rotatedFile as CustomFile;
                    customFile.preview = URL.createObjectURL(rotatedFile);
                    setLocalFile(customFile);
                    if (autoUpload) {
                        void uploadFile(customFile);
                    }
                }
            } catch (err: any) {
                AppToast.error("Không thể xoay ảnh");
            } finally {
                setIsUploading(false);
            }
        }, [isUploading, useRawFile, value, localFile, onChange, autoUpload, uploadFile]);

        useEffect(() => {
            return () => {
                if (fileRef.current?.preview) {
                    URL.revokeObjectURL(fileRef.current.preview);
                }
            };
        }, []);

        useEffect(() => {
            if (!value) {
                setLocalFile(null);
            }
        }, [value]);

        const activeFileObj = useRawFile && value instanceof File ? value : localFile;
        const activeFileOrUrl = activeFileObj || (typeof value === "string" ? value : null);
        const category = useMemo(() => getUploadFileCategory(activeFileOrUrl), [activeFileOrUrl]);
        const fileName = useMemo(() => extractFileName(activeFileOrUrl), [activeFileOrUrl]);
        const fileSizeText = useMemo(() => formatFileSize(activeFileObj?.size), [activeFileObj]);

        const previewSrc = useMemo(() => {
            if (useRawFile && value instanceof File) {
                return previewUrl;
            }
            if (localFile?.preview) {
                return localFile.preview;
            }
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
            return "";
        }, [useRawFile, value, previewUrl, localFile]);

        const isUploaded = Boolean(value && !localFile && typeof value === "string");
        const hasMedia = useRawFile ? Boolean(value) : Boolean(localFile || value);
        const canRotate =
            category === "image" &&
            !imageError &&
            (useRawFile ? value instanceof File : Boolean(localFile));


        const handleOpenPreview = useCallback(() => {
            if (onPreview) {
                onPreview();
                return;
            }
            if (!previewSrc) return;

            if (category === "image" || category === "pdf") {
                setIsViewerOpen(true);
            } else if (typeof value === "string" && value.trim()) {
                window.open(value.trim(), "_blank", "noopener,noreferrer");
            }
        }, [onPreview, previewSrc, category, value]);

        const getErrorMessage = () => {
            if (!useRawFile && localFile && !value && !isUploading && !autoUpload) {
                return "Bạn chưa nhấn 'Tải lên' để hoàn tất.";
            }
            return error;
        };

        // Render thumb for compact mode
        const renderCompactThumb = (size = 44) => {
            return (
                <Box
                    sx={{
                        position: "relative",
                        width: size,
                        height: size,
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid rgba(145, 158, 171, 0.24)",
                        flexShrink: 0,
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {category === "image" && previewSrc && !imageError ? (
                        <Box
                            component="img"
                            src={previewSrc}
                            alt={fileName}
                            onError={() => setImageError(true)}
                            sx={{ width: 1, height: 1, objectFit: "cover", display: "block" }}
                        />
                    ) : category === "pdf" ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1, bgcolor: "#fef2f2" }}>
                            <PictureAsPdfIcon sx={{ color: "#ef4444", fontSize: Math.max(18, Math.round(size * 0.48)) }} />
                            {size >= 44 && (
                                <Typography variant="caption" sx={{ fontSize: "0.55rem", fontWeight: 800, color: "#dc2626", lineHeight: 1, mt: 0.25 }}>
                                    PDF
                                </Typography>
                            )}
                        </Stack>
                    ) : category === "excel" ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1, bgcolor: "#ecfdf5" }}>
                            <TableChartOutlinedIcon sx={{ color: "#10b981", fontSize: Math.max(18, Math.round(size * 0.48)) }} />
                            {size >= 44 && (
                                <Typography variant="caption" sx={{ fontSize: "0.55rem", fontWeight: 800, color: "#059669", lineHeight: 1, mt: 0.25 }}>
                                    XLSX
                                </Typography>
                            )}
                        </Stack>
                    ) : category === "csv" ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1, bgcolor: "#f0fdfa" }}>
                            <TableChartOutlinedIcon sx={{ color: "#0d9488", fontSize: Math.max(18, Math.round(size * 0.48)) }} />
                            {size >= 44 && (
                                <Typography variant="caption" sx={{ fontSize: "0.55rem", fontWeight: 800, color: "#0f766e", lineHeight: 1, mt: 0.25 }}>
                                    CSV
                                </Typography>
                            )}
                        </Stack>
                    ) : category === "docx" ? (
                        <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1, bgcolor: "#eff6ff" }}>
                            <DescriptionOutlinedIcon sx={{ color: "#2563eb", fontSize: Math.max(18, Math.round(size * 0.48)) }} />
                            {size >= 44 && (
                                <Typography variant="caption" sx={{ fontSize: "0.55rem", fontWeight: 800, color: "#1d4ed8", lineHeight: 1, mt: 0.25 }}>
                                    DOCX
                                </Typography>
                            )}
                        </Stack>
                    ) : (
                        <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1, bgcolor: "#f8fafc" }}>
                            <InsertDriveFileOutlinedIcon sx={{ color: "#64748b", fontSize: Math.max(18, Math.round(size * 0.48)) }} />
                            {size >= 44 && (
                                <Typography variant="caption" sx={{ fontSize: "0.55rem", fontWeight: 800, color: "#475569", lineHeight: 1, mt: 0.25 }}>
                                    TỆP
                                </Typography>
                            )}
                        </Stack>
                    )}


                    {canRotate && (
                        <ButtonBase
                            onClick={(e) => {
                                e.stopPropagation();
                                void handleRotate();
                            }}
                            disabled={isUploading}
                            sx={{
                                position: "absolute",
                                top: 1,
                                right: 18,
                                color: "#fff",
                                bgcolor: "rgba(15, 23, 42, 0.65)",
                                borderRadius: "50%",
                                p: "2px",
                                "&:hover": { bgcolor: "#FF5630" },
                            }}
                        >
                            <RotateRightIcon sx={{ fontSize: "0.65rem" }} />
                        </ButtonBase>
                    )}

                    <ButtonBase
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemove();
                        }}
                        sx={{
                            position: "absolute",
                            top: 1,
                            right: 1,
                            color: "#fff",
                            bgcolor: "rgba(15, 23, 42, 0.65)",
                            borderRadius: "50%",
                            p: "2px",
                            "&:hover": { bgcolor: "#ef4444" },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: "0.65rem" }} />
                    </ButtonBase>

                    {isUploaded && (
                        <Box
                            sx={{
                                position: "absolute",
                                bottom: 1,
                                right: 1,
                                bgcolor: "#16a34a",
                                borderRadius: "50%",
                                width: 12,
                                height: 12,
                                border: "1.5px solid #fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <svg width="7" height="7" viewBox="0 0 24 24">
                                <path fill="#fff" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                        </Box>
                    )}
                </Box>
            );
        };

        // Render card thumbnail preview for standard mode
        const renderCardMediaBadge = () => {
            if (category === "image" && previewSrc && !imageError) {
                return (
                    <Box
                        onClick={handleOpenPreview}
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: "10px",
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            position: "relative",
                            flexShrink: 0,
                            cursor: "pointer",
                            bgcolor: "#f8fafc",
                            "&:hover .zoom-overlay": { opacity: 1 },
                        }}
                    >
                        <Box
                            component="img"
                            src={previewSrc}
                            alt={fileName}
                            onError={() => setImageError(true)}
                            sx={{ width: 1, height: 1, objectFit: "cover", display: "block" }}
                        />
                        <Box
                            className="zoom-overlay"
                            sx={{
                                position: "absolute",
                                inset: 0,
                                bgcolor: "rgba(15, 23, 42, 0.45)",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: 0,
                                transition: "opacity 0.2s ease",
                            }}
                        >
                            <ZoomInIcon sx={{ fontSize: 24 }} />
                        </Box>
                        {canRotate && (
                            <ButtonBase
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleRotate();
                                }}
                                disabled={isUploading}
                                sx={{
                                    position: "absolute",
                                    top: 4,
                                    right: 4,
                                    color: "#fff",
                                    bgcolor: "rgba(15, 23, 42, 0.65)",
                                    borderRadius: "50%",
                                    p: "4px",
                                    "&:hover": { bgcolor: "#FF5630" },
                                }}
                            >
                                <RotateRightIcon sx={{ fontSize: "14px" }} />
                            </ButtonBase>
                        )}
                    </Box>
                );
            }

            if (category === "pdf") {
                return (
                    <Box
                        onClick={handleOpenPreview}
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: "10px",
                            border: "1.5px solid #fecaca",
                            bgcolor: "#fef2f2",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.25,
                            flexShrink: 0,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            "&:hover": {
                                bgcolor: "#fee2e2",
                                borderColor: "#f87171",
                                transform: "translateY(-1px)",
                            },
                        }}
                    >
                        <PictureAsPdfIcon sx={{ color: "#ef4444", fontSize: 32 }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#b91c1c", fontSize: "0.7rem", letterSpacing: "0.02em" }}>
                            PDF
                        </Typography>
                    </Box>
                );
            }

            if (category === "excel") {
                return (
                    <Box
                        onClick={handleOpenPreview}
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: "10px",
                            border: "1px solid #a7f3d0",
                            bgcolor: "#ecfdf5",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.25,
                            flexShrink: 0,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            "&:hover": {
                                bgcolor: "#d1fae5",
                                borderColor: "#34d399",
                                transform: "translateY(-1px)",
                            },
                        }}
                    >
                        <TableChartOutlinedIcon sx={{ color: "#10b981", fontSize: 32 }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#047857", fontSize: "0.7rem", letterSpacing: "0.02em" }}>
                            EXCEL
                        </Typography>
                    </Box>
                );
            }

            if (category === "csv") {
                return (
                    <Box
                        onClick={handleOpenPreview}
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: "10px",
                            border: "1px solid #99f6e4",
                            bgcolor: "#f0fdfa",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.25,
                            flexShrink: 0,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            "&:hover": {
                                bgcolor: "#ccfbf1",
                                borderColor: "#2dd4bf",
                                transform: "translateY(-1px)",
                            },
                        }}
                    >
                        <TableChartOutlinedIcon sx={{ color: "#0d9488", fontSize: 32 }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#0f766e", fontSize: "0.7rem", letterSpacing: "0.02em" }}>
                            CSV
                        </Typography>
                    </Box>
                );
            }

            if (category === "docx") {
                return (
                    <Box
                        onClick={handleOpenPreview}
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: "10px",
                            border: "1px solid #bfdbfe",
                            bgcolor: "#eff6ff",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.25,
                            flexShrink: 0,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            "&:hover": {
                                bgcolor: "#dbeafe",
                                borderColor: "#60a5fa",
                                transform: "translateY(-1px)",
                            },
                        }}
                    >
                        <DescriptionOutlinedIcon sx={{ color: "#2563eb", fontSize: 32 }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#1d4ed8", fontSize: "0.7rem", letterSpacing: "0.02em" }}>
                            DOCX
                        </Typography>
                    </Box>
                );
            }

            return (
                <Box
                    onClick={handleOpenPreview}
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.25,
                        flexShrink: 0,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        "&:hover": {
                            bgcolor: "#f1f5f9",
                            borderColor: "#cbd5e1",
                            transform: "translateY(-1px)",
                        },
                    }}
                >
                    {category === "image" ? (
                        <ImageOutlinedIcon sx={{ color: "#0284c7", fontSize: 32 }} />
                    ) : (
                        <DescriptionOutlinedIcon sx={{ color: "#64748b", fontSize: 32 }} />
                    )}
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "#475569", fontSize: "0.7rem" }}>
                        {category === "image" ? "ẢNH" : "TỆP"}
                    </Typography>
                </Box>
            );
        };

        if (compact) {
            const thumbSize = compactThumbSize ?? 44;
            return (
                <Stack spacing={0.5} alignItems="flex-end">
                    <Box
                        component="div"
                        {...getRootProps()}
                        sx={{
                            width: thumbSize,
                            height: thumbSize,
                            borderRadius: "6px",
                            border: "1px dashed",
                            borderColor: error ? "error.main" : "divider",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            cursor: disabled || isUploading ? "not-allowed" : "pointer",
                            opacity: disabled || isUploading ? 0.55 : 1,
                            bgcolor: "var(--palette-grey-100, #f8fafc)",
                            position: "relative",
                            flexShrink: 0,
                            transition: "border-color 0.2s, background-color 0.2s",
                            ...(!(disabled || isUploading) && {
                                "&:hover": {
                                    borderColor: "primary.main",
                                    bgcolor: "var(--palette-grey-200, #f1f5f9)",
                                },
                            }),
                        }}
                    >
                        <input {...getInputProps()} />
                        {hasMedia ? (
                            <>
                                {renderCompactThumb(thumbSize)}
                                {isUploading && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            inset: 0,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            bgcolor: "rgba(0, 0, 0, 0.45)",
                                        }}
                                    >
                                        <CircularProgress size={16} sx={{ color: "#fff" }} />
                                    </Box>
                                )}
                            </>
                        ) : (
                            <Typography
                                sx={{
                                    fontSize: "0.625rem",
                                    color: "text.secondary",
                                    textAlign: "center",
                                    lineHeight: 1.15,
                                    px: 0.25,
                                    userSelect: "none",
                                }}
                            >
                                Chọn tệp
                            </Typography>
                        )}
                    </Box>
                    {getErrorMessage() && (
                        <FormHelperText error sx={{ m: 0, textAlign: "right" }}>
                            {getErrorMessage()}
                        </FormHelperText>
                    )}
                </Stack>
            );
        }

        return (
            <Stack spacing={1}>
                {label ? (
                    <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#334155" }}>
                        {label}
                        {required ? (
                            <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>
                                *
                            </Box>
                        ) : null}
                    </Typography>
                ) : null}

                {!hasMedia ? (
                    <Box
                        {...getRootProps()}
                        sx={{
                            minHeight: 120,
                            border: "1px dashed",
                            borderColor: isDragActive ? "#94a3b8" : (error ? "#fca5a5" : "#cbd5e1"),
                            bgcolor: isDragActive ? "#eff6ff" : "#f8fafc",
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: disabled || isUploading ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.55 : 1,
                            px: 2,
                            py: 2.5,
                            outline: "none",
                            transition: "all 0.2s ease",
                            "&:hover": disabled || isUploading ? undefined : { opacity: 0.85, borderColor: "primary.main" },
                        }}
                    >
                        <input {...getInputProps()} />
                        <Stack alignItems="center" spacing={0.75} textAlign="center">
                            {isUploading ? (
                                <CircularProgress size={22} />
                            ) : null}
                            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                                {isUploading ? "Đang tải tệp lên..." : "Kéo thả hoặc chọn ảnh / tệp"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                {helperText || `${required ? "Bắt buộc." : "Tùy chọn."} Ảnh, PDF, Excel hoặc CSV — tối đa 1 tệp, mỗi tệp không quá ${maxFileSizeMb}MB.`}
                            </Typography>
                        </Stack>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            p: 1.5,
                            bgcolor: "#ffffff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1.5,
                        }}
                    >
                        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ flex: 1, minWidth: 200 }}>
                            {renderCardMediaBadge()}

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Tooltip title={fileName} placement="top-start">
                                    <Typography
                                        variant="subtitle2"
                                        fontWeight={700}
                                        color="#1e293b"
                                        noWrap
                                        sx={{ fontSize: "0.875rem", mb: 0.5 }}
                                    >
                                        {fileName}
                                    </Typography>
                                </Tooltip>

                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                                    {fileSizeText && (
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            {fileSizeText}
                                        </Typography>
                                    )}

                                    {isUploading ? (
                                        <Chip
                                            size="small"
                                            icon={<CircularProgress size={12} color="inherit" />}
                                            label="Đang tải lên..."
                                            sx={{
                                                height: 22,
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                bgcolor: "#dbeafe",
                                                color: "#1d4ed8",
                                            }}
                                        />
                                    ) : isUploaded ? (
                                        <Chip
                                            size="small"
                                            icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important", color: "#15803d !important" }} />}
                                            label="Đã đính kèm"
                                            sx={{
                                                height: 22,
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                bgcolor: "#dcfce7",
                                                color: "#15803d",
                                                border: "1px solid #bbf7d0",
                                            }}
                                        />
                                    ) : !autoUpload && localFile ? (
                                        <Chip
                                            size="small"
                                            label="Chờ tải lên"
                                            sx={{
                                                height: 22,
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                bgcolor: "#fef3c7",
                                                color: "#b45309",
                                            }}
                                        />
                                    ) : null}
                                </Stack>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                            {previewSrc && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<VisibilityOutlinedIcon sx={{ fontSize: "1rem !important" }} />}
                                    onClick={handleOpenPreview}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "0.775rem",
                                        borderRadius: "8px",
                                        borderColor: "#cbd5e1",
                                        color: "#334155",
                                        py: 0.5,
                                        px: 1.25,
                                        "&:hover": { borderColor: "primary.main", bgcolor: "#f8fafc" },
                                    }}
                                >
                                    Xem
                                </Button>
                            )}

                            {/* Re-pick / Replace button */}
                            <Box {...getRootProps()} sx={{ display: "inline-block" }}>
                                <input {...getInputProps()} />
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<CloudUploadOutlinedIcon sx={{ fontSize: "1rem !important" }} />}
                                    disabled={disabled || isUploading}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "0.775rem",
                                        borderRadius: "8px",
                                        borderColor: "#cbd5e1",
                                        color: "#334155",
                                        py: 0.5,
                                        px: 1.25,
                                        "&:hover": { borderColor: "primary.main", bgcolor: "#f8fafc" },
                                    }}
                                >
                                    Thay tệp
                                </Button>
                            </Box>

                            {!autoUpload && !useRawFile && localFile && !value && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<UploadIcon />}
                                    onClick={handleUpload}
                                    disabled={isUploading}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 700,
                                        fontSize: "0.775rem",
                                        borderRadius: "8px",
                                        py: 0.5,
                                        px: 1.5,
                                    }}
                                >
                                    {isUploading ? "Đang tải..." : "Tải lên"}
                                </Button>
                            )}

                            <Tooltip title="Xóa tệp này">
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={handleRemove}
                                    disabled={disabled || isUploading}
                                    sx={{
                                        p: 0.75,
                                        borderRadius: "8px",
                                        "&:hover": { bgcolor: "#fee2e2" },
                                    }}
                                >
                                    <DeleteOutlineIcon sx={{ fontSize: "1.15rem" }} />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Box>
                )}

                {getErrorMessage() && (
                    <FormHelperText error sx={{ mx: 0, fontWeight: 500 }}>
                        {getErrorMessage()}
                    </FormHelperText>
                )}

                {/* Built-in Preview Dialog (Lightbox for Image / PDF) */}
                <Dialog
                    open={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    maxWidth="md"
                    fullWidth
                    sx={{
                        "& .MuiDialog-paper": {
                            borderRadius: "14px",
                            overflow: "hidden",
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            py: 1.5,
                            px: 2.5,
                            bgcolor: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ maxWidth: "80%" }}>
                            {category === "pdf" ? (
                                <PictureAsPdfIcon sx={{ color: "#ef4444", fontSize: 20 }} />
                            ) : (
                                <ImageOutlinedIcon sx={{ color: "primary.main", fontSize: 20 }} />
                            )}
                            <Typography variant="subtitle2" fontWeight={700} color="#0f172a" noWrap>
                                {fileName}
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {previewSrc && (
                                <IconButton
                                    size="small"
                                    component="a"
                                    href={previewSrc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Mở trong tab mới"
                                    sx={{ color: "text.secondary" }}
                                >
                                    <OpenInNewIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            )}
                            <IconButton
                                size="small"
                                onClick={() => setIsViewerOpen(false)}
                                sx={{ color: "text.secondary" }}
                            >
                                <CloseIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                        </Stack>
                    </DialogTitle>
                    <DialogContent
                        sx={{
                            p: 2,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            bgcolor: "#0f172a08",
                            minHeight: 320,
                        }}
                    >
                        {category === "image" && previewSrc && (
                            <Box
                                component="img"
                                src={previewSrc}
                                alt={fileName}
                                sx={{
                                    maxWidth: "100%",
                                    maxHeight: "75vh",
                                    objectFit: "contain",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                }}
                            />
                        )}
                        {category === "pdf" && previewSrc && (
                            <Box
                                component="iframe"
                                src={`${previewSrc}#page=1`}
                                title={fileName}
                                sx={{
                                    width: "100%",
                                    height: "75vh",
                                    border: 0,
                                    borderRadius: "8px",
                                    bgcolor: "#fff",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                }}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </Stack>
        );
    }
);
