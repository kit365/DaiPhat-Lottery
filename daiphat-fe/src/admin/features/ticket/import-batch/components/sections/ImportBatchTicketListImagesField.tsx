"use client";

import { Box, ButtonBase, CircularProgress, Stack, Typography } from '@mui/material';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AppToast } from '../../../../../../utils/toast.util';
import { ImagePreview } from '../../../../../components/ui/ImagePreview';
import { uploadImportBatchTicketListImage } from '../../services/importBatchService';
import { useImportBatchTicketListImageLimits } from '../../hooks/useImportBatchTicketListImageLimits';

interface ImportBatchTicketListImagesFieldProps {
    value?: string[];
    onChange: (urls: string[]) => void;
    /** When true, keep files local (blob preview) — do not upload until parent confirms. */
    deferUpload?: boolean;
    /** Full local File list when deferUpload is enabled. */
    onLocalFilesChange?: (files: File[]) => void;
    localFiles?: File[];
    disabled?: boolean;
    compact?: boolean;
    required?: boolean;
}

const isLikelyImageUrl = (url?: string | null, file?: File | null): boolean => {
    if (file) {
        return (file.type || '').toLowerCase().startsWith('image/');
    }
    if (!url) return false;
    const path = url.split('?')[0].toLowerCase();
    if (path.startsWith('blob:')) return false;
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(path);
};

const getFileLabel = (url?: string | null, file?: File | null): string => {
    if (file?.name) return file.name;
    if (!url) return 'Tệp';
    try {
        const path = decodeURIComponent(url.split('?')[0]);
        return path.split('/').pop() || 'Tệp';
    } catch {
        return 'Tệp';
    }
};

export const ImportBatchTicketListImagesField = ({
    value,
    onChange,
    deferUpload = false,
    onLocalFilesChange,
    localFiles,
    disabled,
    compact,
    required,
}: ImportBatchTicketListImagesFieldProps) => {
    const urls = value ?? [];
    const files = localFiles ?? [];
    const { maxCount, maxSizeMb } = useImportBatchTicketListImageLimits();
    const [uploadingCount, setUploadingCount] = useState(0);
    const isUploading = uploadingCount > 0;
    const remaining = Math.max(0, maxCount - (deferUpload ? files.length : urls.length));

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (!acceptedFiles.length || disabled) {
                return;
            }

            const maxBytes = maxSizeMb * 1024 * 1024;
            const sized = acceptedFiles.filter((file) => {
                if (file.size > maxBytes) {
                    AppToast.error(`Tệp vượt quá ${maxSizeMb}MB. Vui lòng chọn tệp nhỏ hơn.`);
                    return false;
                }
                return true;
            });
            if (!sized.length) {
                return;
            }

            const currentCount = deferUpload ? files.length : urls.length;
            const slots = Math.max(0, maxCount - currentCount);
            if (slots <= 0) {
                AppToast.error(`Chỉ được tải tối đa ${maxCount} tệp danh sách vé nhập.`);
                return;
            }

            const toUpload = sized.slice(0, slots);
            if (sized.length > slots) {
                AppToast.error(`Chỉ được tải tối đa ${maxCount} tệp danh sách vé nhập.`);
            }

            if (deferUpload) {
                const nextFiles = [...files, ...toUpload];
                const nextPreviews = [
                    ...urls,
                    ...toUpload.map((file) => URL.createObjectURL(file)),
                ];
                onLocalFilesChange?.(nextFiles);
                onChange(nextPreviews);
                return;
            }

            setUploadingCount((count) => count + toUpload.length);
            const uploaded: string[] = [];
            try {
                for (const file of toUpload) {
                    try {
                        uploaded.push(await uploadImportBatchTicketListImage(file));
                    } catch (err: unknown) {
                        const message =
                            (err as { response?: { data?: { message?: string } }; message?: string })
                                ?.response?.data?.message ||
                            (err as { message?: string })?.message ||
                            'Tải tệp danh sách vé nhập thất bại.';
                        AppToast.error(message);
                    }
                }
                if (uploaded.length > 0) {
                    onChange([...urls, ...uploaded]);
                }
            } finally {
                setUploadingCount((count) => Math.max(0, count - toUpload.length));
            }
        },
        [deferUpload, disabled, files, maxCount, maxSizeMb, onChange, onLocalFilesChange, urls]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
            'application/pdf': ['.pdf'],
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
        },
        multiple: true,
        disabled: disabled || isUploading || remaining <= 0,
        onDrop,
    });

    const handleRemove = (urlToRemove: string) => {
        const idx = urls.indexOf(urlToRemove);
        const nextUrls = urls.filter((url) => url !== urlToRemove);
        onChange(nextUrls);
        if (deferUpload && idx >= 0) {
            if (urlToRemove.startsWith('blob:')) {
                URL.revokeObjectURL(urlToRemove);
            }
            onLocalFilesChange?.(files.filter((_, i) => i !== idx));
        }
    };

    return (
        <Stack spacing={1.5}>
            <Box
                {...getRootProps()}
                sx={{
                    minHeight: compact ? 120 : 160,
                    border: '1px dashed',
                    borderColor: isDragActive ? '#94a3b8' : '#cbd5e1',
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: disabled || remaining <= 0 ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.55 : 1,
                    px: 2,
                    py: 2.5,
                    outline: 'none',
                    '&:hover': disabled || remaining <= 0 ? undefined : { opacity: 0.85 },
                }}
            >
                <input {...getInputProps()} />
                <Stack alignItems="center" spacing={0.75}>
                    {isUploading ? (
                        <CircularProgress size={22} />
                    ) : null}
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                        {isUploading ? 'Đang tải tệp lên...' : 'Kéo thả hoặc chọn ảnh / tệp'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        {required ? 'Bắt buộc tối thiểu 1 tệp.' : 'Tùy chọn.'} Ảnh, PDF, Excel hoặc CSV — tối đa {maxCount} tệp, mỗi tệp không quá {maxSizeMb}MB.
                        {remaining <= 0 ? ' Đã đạt số tệp tối đa.' : ` Còn ${remaining} tệp.`}
                    </Typography>
                </Stack>
            </Box>

            {urls.length > 0 ? (
                <Box component="ul" sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', m: 0, p: 0, listStyle: 'none' }}>
                    {urls.map((url, idx) => {
                        const file = files[idx];
                        const isImage = isLikelyImageUrl(url, file);
                        return (
                            <Box component="li" key={url} sx={{ position: 'relative' }}>
                                {isImage ? (
                                    <ImagePreview
                                        src={url}
                                        alt="Ảnh danh sách vé nhập"
                                        dialogTitle="Ảnh danh sách vé nhập"
                                        thumbnailSx={{
                                            width: 96,
                                            height: 96,
                                            maxWidth: 96,
                                            maxHeight: 96,
                                            borderRadius: 1,
                                            objectFit: 'cover',
                                            border: '1px solid #e2e8f0',
                                            bgcolor: '#f8fafc',
                                        }}
                                    />
                                ) : (
                                    <ButtonBase
                                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                        sx={{
                                            width: 96,
                                            height: 96,
                                            borderRadius: 1,
                                            border: '1px solid #e2e8f0',
                                            bgcolor: '#f8fafc',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 0.5,
                                            px: 0.75,
                                            textAlign: 'center',
                                        }}
                                        title="Mở tệp"
                                    >
                                        <InsertDriveFileOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.5rem' }} />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: '0.62rem',
                                                fontWeight: 700,
                                                color: '#0f172a',
                                                wordBreak: 'break-all',
                                                lineHeight: 1.2,
                                                maxHeight: 36,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {getFileLabel(url, file)}
                                        </Typography>
                                    </ButtonBase>
                                )}
                                {!disabled ? (
                                    <ButtonBase
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleRemove(url);
                                        }}
                                        sx={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            color: '#fff',
                                            bgcolor: '#141a217a',
                                            borderRadius: '50%',
                                            padding: '4px',
                                            zIndex: 1,
                                            '&:hover': { bgcolor: '#FF5630' },
                                        }}
                                    >
                                        <svg width="0.75rem" height="0.75rem" viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="m12 13.414l5.657 5.657a1 1 0 0 0 1.414-1.414L13.414 12l5.657-5.657a1 1 0 0 0-1.414-1.414L12 10.586L6.343 4.929A1 1 0 0 0 4.93 6.343L10.586 12l-5.657 5.657a1 1 0 1 0 1.414 1.414z"
                                            />
                                        </svg>
                                    </ButtonBase>
                                ) : null}
                            </Box>
                        );
                    })}
                </Box>
            ) : null}
        </Stack>
    );
};
