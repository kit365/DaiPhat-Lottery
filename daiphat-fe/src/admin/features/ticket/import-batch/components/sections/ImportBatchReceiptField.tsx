"use client";

import { Box, ButtonBase, CircularProgress, Stack, Typography } from '@mui/material';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useCallback, useState } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { AppToast } from '../../../../../../utils/toast.util';
import { ImagePreview } from '../../../../../components/ui/ImagePreview';
import { uploadImportBatchInvoiceEvidence } from '../../services/importBatchService';
import { getUploadFileCategory } from '../../../../../components/upload/UploadSingleFile';

interface ImportBatchReceiptFieldProps {
    value?: string | null;
    onChange: (url: string) => void;
    /** When true, keep file local (blob preview) — do not upload until parent confirms. */
    deferUpload?: boolean;
    onLocalFileChange?: (file: File | null) => void;
    localFile?: File | null;
    disabled?: boolean;
    compact?: boolean;
    required?: boolean;
    maxSizeMb?: number;
    error?: string | null;
    customUpload?: (file: File) => Promise<string>;
    onUploadingChange?: (uploading: boolean) => void;
    onErrorChange?: (error: string | null) => void;
    accept?: Accept;
}

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

export const ImportBatchReceiptField = ({
    value,
    onChange,
    deferUpload = false,
    onLocalFileChange,
    localFile,
    disabled,
    compact,
    required,
    maxSizeMb = 10,
    error,
    customUpload,
    onUploadingChange,
    onErrorChange,
    accept,
}: ImportBatchReceiptFieldProps) => {
    const url = value || '';
    const file = localFile || null;
    const hasFile = Boolean(deferUpload ? file : url.trim());
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (!acceptedFiles.length || disabled || hasFile) {
                return;
            }

            const targetFile = acceptedFiles[0];
            const maxBytes = maxSizeMb * 1024 * 1024;
            if (targetFile.size > maxBytes) {
                AppToast.error(`Tệp vượt quá ${maxSizeMb}MB. Vui lòng chọn tệp nhỏ hơn.`);
                return;
            }

            if (deferUpload) {
                const previewUrl = URL.createObjectURL(targetFile);
                onLocalFileChange?.(targetFile);
                onChange(previewUrl);
                onErrorChange?.(null);
                return;
            }

            setIsUploading(true);
            onUploadingChange?.(true);
            try {
                let uploadedUrl: string;
                if (customUpload) {
                    uploadedUrl = await customUpload(targetFile);
                } else {
                    uploadedUrl = await uploadImportBatchInvoiceEvidence(targetFile);
                }
                onChange(uploadedUrl);
                onErrorChange?.(null);
            } catch (err: unknown) {
                const message =
                    (err as { response?: { data?: { message?: string } }; message?: string })
                        ?.response?.data?.message ||
                    (err as { message?: string })?.message ||
                    'Tải tệp biên lai thất bại.';
                AppToast.error(message);
                onErrorChange?.(message);
            } finally {
                setIsUploading(false);
                onUploadingChange?.(false);
            }
        },
        [customUpload, deferUpload, disabled, hasFile, maxSizeMb, onChange, onErrorChange, onLocalFileChange, onUploadingChange]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: accept ?? {
            'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
            'application/pdf': ['.pdf'],
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
        },
        multiple: false,
        disabled: disabled || isUploading || hasFile,
        onDrop,
    });

    const handleRemove = () => {
        if (deferUpload && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
        onLocalFileChange?.(null);
        onChange('');
        onErrorChange?.(null);
    };

    const category = getUploadFileCategory(file || url);
    const fileName = getFileLabel(url, file);

    return (
        <Stack spacing={1.5}>
            <Box
                {...getRootProps()}
                sx={{
                    minHeight: compact ? 120 : 160,
                    border: '1px dashed',
                    borderColor: isDragActive ? '#94a3b8' : error ? '#fca5a5' : '#cbd5e1',
                    bgcolor: isDragActive ? '#eff6ff' : '#f8fafc',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: disabled || hasFile ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.55 : 1,
                    px: 2,
                    py: 2.5,
                    outline: 'none',
                    '&:hover': disabled || hasFile ? undefined : { opacity: 0.85 },
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
                        {required ? 'Bắt buộc.' : 'Tùy chọn.'} Ảnh, PDF, Excel hoặc CSV — tối đa 1 tệp, mỗi tệp không quá {maxSizeMb}MB.
                        {hasFile ? ' Đã đạt số tệp tối đa.' : ' Còn 1 tệp.'}
                    </Typography>
                </Stack>
            </Box>

            {hasFile ? (
                <Box component="ul" sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', m: 0, p: 0, listStyle: 'none' }}>
                    <Box component="li" sx={{ position: 'relative' }}>
                        {category === 'image' ? (
                            <ImagePreview
                                src={url}
                                alt="Ảnh biên lai phiếu nhập"
                                dialogTitle="Ảnh biên lai phiếu nhập"
                                thumbnailSx={{
                                    width: 96,
                                    height: 96,
                                    maxWidth: 96,
                                    maxHeight: 96,
                                    borderRadius: '10px',
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
                                    borderRadius: '10px',
                                    border: '1px solid',
                                    borderColor:
                                        category === 'pdf'
                                            ? '#fecaca'
                                            : category === 'excel'
                                              ? '#a7f3d0'
                                              : category === 'csv'
                                                ? '#99f6e4'
                                                : category === 'docx'
                                                  ? '#bfdbfe'
                                                  : '#e2e8f0',
                                    bgcolor:
                                        category === 'pdf'
                                            ? '#fef2f2'
                                            : category === 'excel'
                                              ? '#ecfdf5'
                                              : category === 'csv'
                                                ? '#f0fdfa'
                                                : category === 'docx'
                                                  ? '#eff6ff'
                                                  : '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                    px: 0.75,
                                    textAlign: 'center',
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                    },
                                }}
                                title={`Mở ${fileName}`}
                            >
                                {category === 'pdf' ? (
                                    <PictureAsPdfIcon sx={{ color: '#ef4444', fontSize: '1.75rem' }} />
                                ) : category === 'excel' ? (
                                    <TableChartOutlinedIcon sx={{ color: '#10b981', fontSize: '1.75rem' }} />
                                ) : category === 'csv' ? (
                                    <TableChartOutlinedIcon sx={{ color: '#0d9488', fontSize: '1.75rem' }} />
                                ) : category === 'docx' ? (
                                    <DescriptionOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.75rem' }} />
                                ) : (
                                    <InsertDriveFileOutlinedIcon sx={{ color: '#64748b', fontSize: '1.75rem' }} />
                                )}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        color:
                                            category === 'pdf'
                                                ? '#b91c1c'
                                                : category === 'excel'
                                                  ? '#047857'
                                                  : category === 'csv'
                                                    ? '#0f766e'
                                                    : category === 'docx'
                                                      ? '#1d4ed8'
                                                      : '#334155',
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    {category === 'pdf'
                                        ? 'PDF'
                                        : category === 'excel'
                                          ? 'EXCEL'
                                          : category === 'csv'
                                            ? 'CSV'
                                            : category === 'docx'
                                              ? 'DOCX'
                                              : 'TỆP'}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '0.58rem',
                                        fontWeight: 600,
                                        color: '#64748b',
                                        wordBreak: 'break-all',
                                        lineHeight: 1.1,
                                        maxHeight: 24,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {fileName}
                                </Typography>
                            </ButtonBase>
                        )}
                        {!disabled ? (
                            <ButtonBase
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleRemove();
                                }}
                                sx={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    color: '#fff',
                                    bgcolor: 'rgba(15, 23, 42, 0.65)',
                                    borderRadius: '50%',
                                    padding: '3px',
                                    zIndex: 2,
                                    '&:hover': { bgcolor: '#ef4444' },
                                }}
                            >
                                <svg width="0.7rem" height="0.7rem" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="m12 13.414l5.657 5.657a1 1 0 0 0 1.414-1.414L13.414 12l5.657-5.657a1 1 0 0 0-1.414-1.414L12 10.586L6.343 4.929A1 1 0 0 0 4.93 6.343L10.586 12l-5.657 5.657a1 1 0 1 0 1.414 1.414z"
                                    />
                                </svg>
                            </ButtonBase>
                        ) : null}
                    </Box>
                </Box>
            ) : null}

            {error ? (
                <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                    {error}
                </Typography>
            ) : null}
        </Stack>
    );
};
