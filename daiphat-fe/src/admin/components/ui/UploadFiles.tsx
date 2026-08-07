"use client";

import { Box, Button, ButtonBase, FormHelperText, Stack, Typography } from "@mui/material"
import { UploadFileIcon, UploadIcon } from "../../assets/icons"
import { useDropzone } from 'react-dropzone';
import { useEffect, memo, useState, useCallback, useRef, useMemo } from "react";
import { uploadImagesToCloudinary } from "../../api/uploadCloudinary.api";
import { AppToast } from '../../../utils/toast.util';

interface CustomFile extends File {
    preview: string;
}

interface UploadFilesProps {
    files: CustomFile[];
    onFilesChange: (files: CustomFile[]) => void;
    compact?: boolean;
}

export const UploadFiles = memo(({ files, onFilesChange, compact }: UploadFilesProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isTouched, setIsTouched] = useState(false);

    const filesRef = useRef(files);
    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setIsTouched(true);

        const newFiles = acceptedFiles.map(file => {
            const customFile = file as CustomFile;
            customFile.preview = URL.createObjectURL(file);
            return customFile;
        });

        onFilesChange([...files, ...newFiles]);
    }, [files, onFilesChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'image/*': [] },
        onDrop,
        onFileDialogOpen: useCallback(() => setIsTouched(true), [])
    });

    const handleRemoveFile = useCallback((fileToRemove: any) => {
        // Nếu là file local thì mới cần thu hồi URL preview để giải phóng bộ nhớ
        if (typeof fileToRemove !== 'string' && fileToRemove.preview) {
            URL.revokeObjectURL(fileToRemove.preview);
        }

        // Lọc bỏ file khỏi mảng hiện tại
        onFilesChange(files.filter(file => file !== fileToRemove));
    }, [files, onFilesChange]);

    const handleRemoveAll = useCallback(() => {
        files.forEach(file => URL.revokeObjectURL(file.preview));
        onFilesChange([]);
    }, [files, onFilesChange]);

    const handleUpload = async () => {
        const filesToUpload = files.filter(file => file instanceof File);
        if (filesToUpload.length === 0) return;

        try {
            setIsUploading(true);
            const uploadedUrls = await uploadImagesToCloudinary(filesToUpload);

            // Giữ lại các ảnh đã là URL, thay thế các File object bằng URL mới nhận được
            const currentLinks = files.filter(f => typeof f === 'string');
            onFilesChange([...currentLinks, ...uploadedUrls] as any);

            onFilesChange([...currentLinks, ...uploadedUrls] as any);
            AppToast.success('Tải ảnh lên thành công!');
        } catch (error) {
            AppToast.error('Tải ảnh lên thất bại!');
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        return () => {
            filesRef.current.forEach(file => URL.revokeObjectURL(file.preview));
        };
    }, []);

    const renderThumbs = useMemo(() => files.map((file, index) => {
        // Kiểm tra xem file là URL (string) hay là File Object
        const isServerImage = typeof file === 'string';
        const imgId = isServerImage ? file : `${(file as any).name}-${index}`;
        const imgSrc = isServerImage ? file : (file as any).preview;

        return (
            <li className="inline-flex" key={imgId}>
                <span className="inline-flex relative items-center justify-center rounded-[10px] w-[80px] h-[80px] border border-[#919eab29]">
                    <Box
                        component="img"
                        src={imgSrc}
                        sx={{ width: 1, height: 1, objectFit: 'contain', borderRadius: '10px', bgcolor: 'rgba(0,0,0,0.02)' }}
                    />

                    {/* Nút xóa ảnh */}
                    <ButtonBase
                        onClick={(e) => { e.stopPropagation(); handleRemoveFile(file); }}
                        sx={{
                            position: 'absolute', top: 4, right: 4, color: "#fff",
                            bgcolor: "#141a217a", borderRadius: "50%", padding: "4px",
                            '&:hover': { bgcolor: "#FF5630" } // Đổi sang màu đỏ khi hover nút xóa
                        }}
                    >
                        <svg width="0.75rem" height="0.75rem" viewBox="0 0 24 24">
                            <path fill="currentColor" d="m12 13.414l5.657 5.657a1 1 0 0 0 1.414-1.414L13.414 12l5.657-5.657a1 1 0 0 0-1.414-1.414L12 10.586L6.343 4.929A1 1 0 0 0 4.93 6.343L10.586 12l-5.657 5.657a1 1 0 1 0 1.414 1.414z" />
                        </svg>
                    </ButtonBase>

                    {/* Badge tích xanh nếu đã upload thành công */}
                    {isServerImage && (
                        <Box sx={{
                            position: 'absolute', bottom: 2, right: 2,
                            bgcolor: '#FF3030', borderRadius: '50%',
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
    }), [files, handleRemoveFile]);

    const hasError = false;

    return (
        <Stack>
            {!compact && <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: "600", mb: "12px" }}>Hình ảnh</Typography>}
            <div
                {...getRootProps()}
                className=
                {`${compact ? 'min-h-[140px]' : 'min-h-[280px]'} border border-[#919eab33] bg-[#919eab14] flex items-center justify-center cursor-pointer relative outline-none overflow-hidden p-[24px] rounded-[8px] hover:opacity-[0.72] transition-opacity duration-300 ease-linear ${isDragActive && "opacity-[0.72]"}`}
            >
                <input {...getInputProps()} />

                <div className="w-full flex items-center justify-center flex-col">
                    <UploadFileIcon />
                    <div className="flex flex-col gap-[8px] text-center mt-2">
                        <div className="text-[1.125rem] font-[600]">Kéo thả hoặc chọn tệp</div>
                        {!compact && (
                            <div className="text-[0.875rem] text-[#637381]">
                                Kéo tệp vào đây, hoặc <span className="underline text-[#FF3030]">chọn tệp</span> từ thiết bị của bạn
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {files.length > 0 && (
                <>
                    <Box sx={{ my: 3 }}>
                        <ul className="flex gap-[12px] flex-wrap">{renderThumbs}</ul>
                    </Box>
                    <Box sx={{ gap: "12px", display: "flex", justifyContent: "flex-end" }}>
                        <Button
                            size="small"
                            onClick={handleRemoveAll}
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
                        {files.some(file => file instanceof File) && (
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
                                {isUploading ? 'Đang tải...' : 'Tải lên'}
                            </Button>
                        )}
                    </Box>
                </>
            )}
        </Stack>
    )
})
