"use client";

import { Box, Button, ButtonBase, FormHelperText, Stack, Typography } from "@mui/material";
import { UploadFileIcon, UploadIcon } from "../../assets/icons";
import { useDropzone } from "react-dropzone";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { uploadImagesToCloudinary } from "../../api/uploadCloudinary.api";
import { AppToast } from "../../../utils/toast.util";

interface CustomFile extends File {
    preview: string;
}

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
    label?: string;
    required?: boolean;
    maxFileSizeMb?: number;
}

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
        label = "Hình ảnh",
        required,
        maxFileSizeMb = 10,
    }: UploadSingleFileProps) => {
        const [localFile, setLocalFile] = useState<CustomFile | null>(null);
        const [isUploading, setIsUploading] = useState(false);
        const [previewUrl, setPreviewUrl] = useState<string>("");

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

        const uploadFile = useCallback(async (file: CustomFile) => {
            try {
                setIsUploading(true);
                let url: string;
                if (customUpload) {
                    url = await customUpload(file);
                } else {
                    const urls = await uploadImagesToCloudinary([file]);
                    url = urls[0];
                }
                const persistable = typeof url === "string" ? url.trim() : "";
                if (
                    !persistable ||
                    persistable.startsWith("blob:") ||
                    persistable.startsWith("data:")
                ) {
                    throw new Error(
                        "URL ảnh tạm thời không thể lưu. Kiểm tra cấu hình Cloudinary hoặc dùng upload qua server."
                    );
                }
                onChange(persistable);
                if (file.preview) {
                    URL.revokeObjectURL(file.preview);
                }
                setLocalFile(null);
                AppToast.success("Tải ảnh lên thành công!");
            } catch (err: any) {
                AppToast.error(err?.message || "Tải ảnh lên thất bại!");
            } finally {
                setIsUploading(false);
            }
        }, [customUpload, onChange]);

        const onDrop = useCallback((acceptedFiles: File[]) => {
            if (!acceptedFiles.length) return;

            const file = acceptedFiles[0];
            const maxBytes = maxFileSizeMb * 1024 * 1024;
            if (file.size > maxBytes) {
                AppToast.error(`Ảnh vượt quá ${maxFileSizeMb}MB. Vui lòng chọn ảnh nhỏ hơn.`);
                return;
            }
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
        }, [useRawFile, onChange, autoUpload, uploadFile, maxFileSizeMb]);

        const { getRootProps, getInputProps, isDragActive } = useDropzone({
            accept: { "image/*": [] },
            multiple: false,
            onDrop,
            disabled: disabled || isUploading,
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
        }, [localFile, onChange, useRawFile]);

        const handleUpload = async () => {
            if (!localFile) return;
            await uploadFile(localFile);
        };

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

        const renderThumb = () => {
            let src = "";
            let isUploaded = false;

            if (useRawFile) {
                if (value instanceof File) {
                    src = previewUrl;
                } else if (typeof value === "string") {
                    src = value;
                    isUploaded = true;
                }
            } else {
                src = localFile?.preview || (value as string);
                isUploaded = Boolean(value && !localFile);
            }

            if (!src) return null;

            return (
                <li className="inline-flex">
                    <span className="inline-flex relative items-center justify-center rounded-[10px] w-[80px] h-[80px] border border-[#919eab29]">
                        <Box
                            component="img"
                            src={src}
                            sx={{ width: 1, height: 1, objectFit: "cover", borderRadius: "10px" }}
                        />

                        <ButtonBase
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove();
                            }}
                            sx={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                color: "#fff",
                                bgcolor: "#141a217a",
                                borderRadius: "50%",
                                padding: "4px",
                                "&:hover": { bgcolor: "#FF5630" },
                            }}
                        >
                            <svg width="0.75rem" height="0.75rem" viewBox="0 0 24 24">
                                <path fill="currentColor" d="m12 13.414l5.657 5.657a1 1 0 0 0 1.414-1.414L13.414 12l5.657-5.657a1 1 0 0 0-1.414-1.414L12 10.586L6.343 4.929A1 1 0 0 0 4.93 6.343L10.586 12l-5.657 5.657a1 1 0 1 0 1.414 1.414z" />
                            </svg>
                        </ButtonBase>

                        {isUploaded && (
                            <Box sx={{
                                position: 'absolute', bottom: 2, right: 2,
                                bgcolor: '#00A76F', borderRadius: '50%',
                                width: 14, height: 14, border: '2px solid #fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <svg width="8" height="8" viewBox="0 0 24 24">
                                    <path fill="#fff" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                            </Box>
                        )}
                    </span>
                </li>
            );
        };

        const getErrorMessage = () => {
            if (!useRawFile && localFile && !value && !isUploading) {
                return "Bạn chưa nhấn 'Tải lên' để hoàn tất chọn ảnh";
            }
            return error;
        };

        const hasMedia = useRawFile ? Boolean(value) : Boolean(localFile || value);

        if (compact) {
            const compactSrc = useRawFile
                ? (value instanceof File ? previewUrl : typeof value === "string" ? value : "")
                : localFile?.preview || (typeof value === "string" ? value : "");

            return (
                <Stack spacing={1}>
                    <Box
                        {...getRootProps()}
                        sx={{
                            width: "100%",
                            aspectRatio: "1 / 1",
                            maxWidth: 168,
                            borderRadius: "12px",
                            border: "1px dashed",
                            borderColor: isDragActive ? "#00A76F" : error ? "error.main" : "#919eab52",
                            bgcolor: isDragActive ? "rgba(0, 167, 111, 0.08)" : "#919eab14",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            overflow: "hidden",
                            cursor: disabled || isUploading ? "default" : "pointer",
                            opacity: disabled || isUploading ? 0.6 : 1,
                            transition: "border-color 160ms ease, background-color 160ms ease",
                            "&:hover": disabled || isUploading ? undefined : { opacity: 0.88 },
                        }}
                    >
                        <input {...getInputProps()} />
                        {compactSrc ? (
                            <>
                                <Box
                                    component="img"
                                    src={compactSrc}
                                    alt={label}
                                    sx={{ width: 1, height: 1, objectFit: "cover" }}
                                />
                                <ButtonBase
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove();
                                    }}
                                    sx={{
                                        position: "absolute",
                                        top: 6,
                                        right: 6,
                                        color: "#fff",
                                        bgcolor: "#141a217a",
                                        borderRadius: "50%",
                                        p: "4px",
                                        "&:hover": { bgcolor: "#FF5630" },
                                    }}
                                >
                                    <svg width="0.75rem" height="0.75rem" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="m12 13.414l5.657 5.657a1 1 0 0 0 1.414-1.414L13.414 12l5.657-5.657a1 1 0 0 0-1.414-1.414L12 10.586L6.343 4.929A1 1 0 0 0 4.93 6.343L10.586 12l-5.657 5.657a1 1 0 1 0 1.414 1.414z" />
                                    </svg>
                                </ButtonBase>
                                {!useRawFile && localFile && !autoUpload && (
                                    <Button
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void handleUpload();
                                        }}
                                        disabled={isUploading}
                                        sx={{
                                            position: "absolute",
                                            bottom: 8,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            textTransform: "none",
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            bgcolor: "#1C252E",
                                            color: "#fff",
                                            px: 1.5,
                                            minHeight: 28,
                                            "&:hover": { bgcolor: "#454F5B" },
                                        }}
                                    >
                                        {isUploading ? "Đang tải..." : "Tải lên"}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <Stack alignItems="center" spacing={0.75} sx={{ px: 1.5, textAlign: "center" }}>
                                <UploadIcon sx={{ fontSize: 28, color: "#637381" }} />
                                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1C252E" }}>
                                    {isUploading ? "Đang tải..." : "Kéo thả / chọn"}
                                </Typography>
                                <Typography sx={{ fontSize: "0.7rem", color: "#637381", lineHeight: 1.4 }}>
                                    PNG, JPG · tối đa {maxFileSizeMb}MB
                                </Typography>
                            </Stack>
                        )}
                    </Box>
                    {(error || (!useRawFile && localFile && !value && !isUploading && !autoUpload)) && (
                        <FormHelperText error sx={{ m: 0 }}>
                            {getErrorMessage()}
                        </FormHelperText>
                    )}
                </Stack>
            );
        }

        return (
            <Stack>
                {label ? (
                    <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: 600, mb: "12px" }}>
                        {label}
                        {required ? <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>*</Box> : null}
                    </Typography>
                ) : null}

                <div
                    {...getRootProps()}
                    className={`min-h-[280px] border border-[#919eab33] bg-[#919eab14] flex items-center justify-center cursor-pointer relative outline-none overflow-hidden p-[24px] rounded-[8px] hover:opacity-[0.72] transition-opacity duration-300 ease-linear ${isDragActive && "opacity-[0.72]"
                        } ${disabled || isUploading ? "pointer-events-none opacity-60" : ""}`}
                >
                    <input {...getInputProps()} />

                    <div className="w-full flex items-center justify-center flex-col">
                        <UploadFileIcon />
                        <div className="flex flex-col gap-[8px] text-center">
                            <div className="text-[1.125rem] font-[600]">
                                {isUploading ? "Đang tải ảnh lên..." : "Kéo thả hoặc chọn tệp"}
                            </div>
                            <div className="text-[0.875rem] text-[#637381]">
                                Kéo tệp vào đây, hoặc <span className="underline text-[#00A76F]">chọn tệp</span>
                            </div>
                        </div>
                    </div>
                </div>

                {(error || (!useRawFile && localFile && !value && !isUploading && !autoUpload)) && (
                    <FormHelperText error>
                        {getErrorMessage()}
                    </FormHelperText>
                )}

                {hasMedia && (
                    <>
                        <Box sx={{ my: 3 }}>
                            <ul className="flex gap-[12px] flex-wrap">{renderThumb()}</ul>
                        </Box>

                        {!useRawFile && localFile && !autoUpload && (
                            <Box sx={{ gap: "12px", display: "flex", justifyContent: "flex-end" }}>
                                <Button
                                    size="small"
                                    onClick={handleRemove}
                                    sx={{
                                        p: "0px 8px",
                                        minHeight: "30px",
                                        minWidth: "64px",
                                        fontSize: "0.75rem",
                                        fontWeight: "700",
                                        textTransform: "none",
                                        border: "1px solid #919eab52",
                                        borderRadius: "8px",
                                        color: "#1C252E",

                                        '&:hover': {
                                            bgcolor: "#919eab14",
                                            borderColor: "currentColor",
                                            boxShadow: "currentColor 0px 0px 0px 0.75px"
                                        }
                                    }}>
                                    Xóa tất cả
                                </Button>
                                <Button
                                    size="small"
                                    onClick={handleUpload}
                                    startIcon={<UploadIcon />}
                                    disabled={isUploading}
                                    sx={{
                                        p: "4px 8px",
                                        minHeight: "30px",
                                        minWidth: "64px",
                                        fontSize: "0.75rem",
                                        fontWeight: "700",
                                        textTransform: "none",
                                        border: "1px solid #919eab52",
                                        borderRadius: "8px",
                                        color: "#fff",
                                        bgcolor: "#1C252E",

                                        '&:hover': {
                                            bgcolor: "#454F5B",
                                            boxShadow: "0 8px 16px 0 rgba(145 158 171 / 16%)"
                                        }
                                    }}>
                                    {isUploading ? "Đang tải..." : "Tải lên"}
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Stack>
        );
    }
);
