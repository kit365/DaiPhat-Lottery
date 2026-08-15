"use client";

import { Box, ButtonBase, CircularProgress, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { AppToast } from '../../../../../../utils/toast.util';
import { ImagePreview } from '../../../../../components/ui/ImagePreview';
import { uploadImportBatchTicketListImage } from '../../services/importBatchService';
import { useImportBatchTicketListImageLimits } from '../../hooks/useImportBatchTicketListImageLimits';

interface ImportBatchTicketListImagesFieldProps {
    value?: string[];
    onChange: (urls: string[]) => void;
    disabled?: boolean;
    compact?: boolean;
    required?: boolean;
}

export const ImportBatchTicketListImagesField = ({
    value,
    onChange,
    disabled,
    compact,
    required,
}: ImportBatchTicketListImagesFieldProps) => {
    const urls = value ?? [];
    const { maxCount, maxSizeMb } = useImportBatchTicketListImageLimits();
    const [uploadingCount, setUploadingCount] = useState(0);
    const isUploading = uploadingCount > 0;
    const remaining = Math.max(0, maxCount - urls.length);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (!acceptedFiles.length || disabled) {
                return;
            }

            const maxBytes = maxSizeMb * 1024 * 1024;
            const sized = acceptedFiles.filter((file) => {
                if (file.size > maxBytes) {
                    AppToast.error(`Ảnh vượt quá ${maxSizeMb}MB. Vui lòng chọn ảnh nhỏ hơn.`);
                    return false;
                }
                return true;
            });
            if (!sized.length) {
                return;
            }

            const slots = Math.max(0, maxCount - urls.length);
            if (slots <= 0) {
                AppToast.error(`Chỉ được tải tối đa ${maxCount} ảnh danh sách vé nhập.`);
                return;
            }

            const toUpload = sized.slice(0, slots);
            if (sized.length > slots) {
                AppToast.error(`Chỉ được tải tối đa ${maxCount} ảnh danh sách vé nhập.`);
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
                            'Tải ảnh danh sách vé nhập thất bại.';
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
        [disabled, maxCount, maxSizeMb, onChange, urls]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'image/*': [] },
        multiple: true,
        disabled: disabled || isUploading || remaining <= 0,
        onDrop,
    });

    const handleRemove = (urlToRemove: string) => {
        onChange(urls.filter((url) => url !== urlToRemove));
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
                        {isUploading ? 'Đang tải ảnh lên...' : 'Kéo thả hoặc chọn ảnh'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        {required ? 'Bắt buộc tối thiểu 1 ảnh.' : 'Tùy chọn.'} Tối đa {maxCount} ảnh, mỗi ảnh không quá {maxSizeMb}MB.
                        {remaining <= 0 ? ' Đã đạt số ảnh tối đa.' : ` Còn ${remaining} ảnh.`}
                    </Typography>
                </Stack>
            </Box>

            {urls.length > 0 ? (
                <Box component="ul" sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', m: 0, p: 0, listStyle: 'none' }}>
                    {urls.map((url) => (
                        <Box component="li" key={url} sx={{ position: 'relative' }}>
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
                    ))}
                </Box>
            ) : null}
        </Stack>
    );
};
