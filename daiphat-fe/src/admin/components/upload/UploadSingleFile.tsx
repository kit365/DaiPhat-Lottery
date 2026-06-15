import { Box, Button, ButtonBase, FormHelperText, Stack, Typography } from "@mui/material";
import { UploadFileIcon, UploadIcon } from "../../assets/icons";
import { useDropzone } from "react-dropzone";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { uploadImagesToCloudinary } from "../../api/uploadCloudinary.api";
import { toast } from "react-toastify";

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
}

export const UploadSingleFile = memo(
    ({ value, onChange, disabled, error, useRawFile, customUpload }: UploadSingleFileProps) => {
        const [localFile, setLocalFile] = useState<CustomFile | null>(null);
        const [isUploading, setIsUploading] = useState(false);
        const [previewUrl, setPreviewUrl] = useState<string>("");

        const fileRef = useRef<CustomFile | null>(null);

        useEffect(() => {
            fileRef.current = localFile;
        }, [localFile]);

        useEffect(() => {
            if (useRawFile && value instanceof File) {
                const objectUrl = URL.createObjectURL(value);
                setPreviewUrl(objectUrl);
                return () => URL.revokeObjectURL(objectUrl);
            } else {
                setPreviewUrl("");
            }
        }, [value, useRawFile]);

        const onDrop = useCallback((acceptedFiles: File[]) => {
            if (!acceptedFiles.length) return;

            const file = acceptedFiles[0];
            if (useRawFile) {
                onChange(file);
            } else {
                const customFile = file as CustomFile;
                customFile.preview = URL.createObjectURL(file);
                setLocalFile(customFile);
            }
        }, [useRawFile, onChange]);

        const { getRootProps, getInputProps, isDragActive } = useDropzone({
            accept: { "image/*": [] },
            multiple: false,
            onDrop,
            disabled,
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

            try {
                setIsUploading(true);
                let url;
                if (customUpload) {
                    url = await customUpload(localFile);
                } else {
                    const urls = await uploadImagesToCloudinary([localFile]);
                    url = urls[0];
                }
                onChange(url);
                setLocalFile(null);
                toast.success("Tải ảnh lên thành công!");
            } catch (err: any) {
                toast.error(err?.message || "Tải ảnh lên thất bại!");
            } finally {
                setIsUploading(false);
            }
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
            if (!useRawFile && localFile && !value) return "Bạn chưa nhấn 'Tải lên' để hoàn tất chọn ảnh";
            return error;
        };

        const hasMedia = useRawFile ? Boolean(value) : Boolean(localFile || value);

        return (
            <Stack>
                <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: 600, mb: "12px" }}>
                    Hình ảnh
                </Typography>

                <div
                    {...getRootProps()}
                    className={`min-h-[280px] border border-[#919eab33] bg-[#919eab14] flex items-center justify-center cursor-pointer relative outline-none overflow-hidden p-[24px] rounded-[8px] hover:opacity-[0.72] transition-opacity duration-300 ease-linear ${isDragActive && "opacity-[0.72]"
                        }`}
                >
                    <input {...getInputProps()} />

                    <div className="w-full flex items-center justify-center flex-col">
                        <UploadFileIcon />
                        <div className="flex flex-col gap-[8px] text-center">
                            <div className="text-[1.125rem] font-[600]">Kéo thả hoặc chọn tệp</div>
                            <div className="text-[0.875rem] text-[#637381]">
                                Kéo tệp vào đây, hoặc <span className="underline text-[#00A76F]">chọn tệp</span>
                            </div>
                        </div>
                    </div>
                </div>

                {(error || (!useRawFile && localFile && !value)) && (
                    <FormHelperText error>
                        {getErrorMessage()}
                    </FormHelperText>
                )}

                {hasMedia && (
                    <>
                        <Box sx={{ my: 3 }}>
                            <ul className="flex gap-[12px] flex-wrap">{renderThumb()}</ul>
                        </Box>

                        {!useRawFile && localFile && (
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
