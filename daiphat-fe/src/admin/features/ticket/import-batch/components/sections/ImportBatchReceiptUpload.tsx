"use client";

import { useEffect, useMemo, useRef } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import type { InvoiceEvidenceValue } from '../../utils/invoiceEvidence';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

interface ImportBatchReceiptUploadProps {
    value?: InvoiceEvidenceValue;
    onChange: (value: InvoiceEvidenceValue) => void;
    error?: string;
    disabled?: boolean;
}

export const ImportBatchReceiptUpload = ({
    value,
    onChange,
    error,
    disabled = false,
}: ImportBatchReceiptUploadProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const previewUrl = useMemo(() => {
        if (value instanceof File) {
            return URL.createObjectURL(value);
        }
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
        return '';
    }, [value]);

    useEffect(() => {
        if (!(value instanceof File) || !previewUrl) {
            return;
        }
        return () => URL.revokeObjectURL(previewUrl);
    }, [value, previewUrl]);

    const handleSelect = (file?: File | null) => {
        if (!file || !file.type.startsWith('image/')) {
            return;
        }
        onChange(file);
    };

    const handleClear = (event: React.MouseEvent) => {
        event.stopPropagation();
        onChange('');
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const openPicker = () => {
        if (!disabled) {
            inputRef.current?.click();
        }
    };

    const hasPreview = !!previewUrl;

    return (
        <Box>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                hidden
                disabled={disabled}
                onChange={(event) => {
                    handleSelect(event.target.files?.[0]);
                    event.target.value = '';
                }}
            />

            <Box
                onClick={openPicker}
                sx={{
                    position: 'relative',
                    borderRadius: '12px',
                    border: `1px dashed ${error ? 'var(--palette-error-main)' : 'rgba(145, 158, 171, 0.36)'}`,
                    bgcolor: hasPreview ? '#F8FAFC' : 'var(--palette-background-neutral)',
                    overflow: 'hidden',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.65 : 1,
                    minHeight: 120,
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': disabled
                        ? {}
                        : {
                              borderColor: 'var(--palette-primary-main)',
                              boxShadow: '0 0 0 3px rgba(255, 48, 48, 0.1)',
                          },
                    '&:hover .receipt-change-overlay': {
                        opacity: 1,
                    },
                }}
            >
                {hasPreview ? (
                    <>
                        <Box
                            component="img"
                            src={previewUrl}
                            alt="Ảnh biên lai"
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                        <Box
                            className="receipt-change-overlay"
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(15, 23, 42, 0.45)',
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                            }}
                        >
                            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>
                                Đổi ảnh
                            </Typography>
                        </Box>
                        {!disabled && (
                            <IconButton
                                size="small"
                                onClick={handleClear}
                                aria-label="Xóa ảnh biên lai"
                                sx={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    width: 28,
                                    height: 28,
                                    bgcolor: 'rgba(15, 23, 42, 0.72)',
                                    color: '#fff',
                                    '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.9)' },
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        )}
                    </>
                ) : (
                    <Box sx={{ textAlign: 'center', px: 1.5 }}>
                        <AddPhotoAlternateOutlinedIcon
                            sx={{ fontSize: 30, color: 'var(--palette-primary-main)', mb: 0.25 }}
                        />
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                            Ảnh biên lai
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            Nhấn để tải ảnh
                        </Typography>
                    </Box>
                )}
            </Box>

            {error ? (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {error}
                </Typography>
            ) : null}
        </Box>
    );
};
