"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Chip,
    Typography,
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    IconButton,
    Stack,
    Grid,
    InputAdornment,
    Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LinkIcon from '@mui/icons-material/Link';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LayersIcon from '@mui/icons-material/Layers';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import {
    buildReportSerialFaultPayload,
    reportTicketSerialFault,
} from '../../../inventory/services/ticketService';
import { AppToast } from '../../../../../../utils/toast.util';
import { isAlreadyFaultReportedSerial } from '../../utils/serialIncidentWorkflow';

const QUICK_REASON_SUGGESTIONS = [
    'Rách nát trong phân loại',
    'Bị dính nước / ướt',
    'Mờ số, lỗi mực in',
    'Nhăn nheo hư hỏng',
    'Thất lạc khi đếm kho',
];

interface SerialItem {
    id: number | string;
    serialNumber: string;
    status: string;
    ticketCondition?: string | null;
    returnBatchLineId?: number | string | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    serials: SerialItem[];
    ticketNumbers?: string;
    defaultFaultedBy?: 'INTERNAL_FAULT' | 'ISSUER_FAULT' | 'DATA_ENTRY_FAULT';
    hideFaultedBySelect?: boolean;
}

interface FormState {
    selected: boolean;
    status: 'DAMAGED' | 'LOST' | 'VOIDED';
    faultedBy: 'INTERNAL_FAULT' | 'ISSUER_FAULT' | 'DATA_ENTRY_FAULT';
    damagedReason: string;
    damagedEvidenceUrl: string;
    errors: {
        damagedReason?: string;
        damagedEvidenceUrl?: string;
    };
}

export const ReportSerialFaultModal: React.FC<Props> = ({
    open,
    onClose,
    onSuccess,
    serials,
    ticketNumbers,
    defaultFaultedBy,
    hideFaultedBySelect = false,
}) => {
    const [forms, setForms] = useState<Record<string | number, FormState>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open && serials) {
            const initialForms: Record<string | number, FormState> = {};
            serials.forEach((s) => {
                const isAlreadyFaulted = isAlreadyFaultReportedSerial(s);
                const isSold = s.status === 'SOLD';
                initialForms[s.id] = {
                    selected: !isAlreadyFaulted && !isSold,
                    status: 'DAMAGED',
                    faultedBy: defaultFaultedBy || 'INTERNAL_FAULT',
                    damagedReason: '',
                    damagedEvidenceUrl: '',
                    errors: {}
                };
            });
            setForms(initialForms);
        }
    }, [open, serials, defaultFaultedBy]);

    const handleFieldChange = (
        id: string | number,
        field: keyof FormState,
        value: any
    ) => {
        setForms((prev) => {
            const updatedForm = {
                ...prev[id],
                [field]: value
            };

            if (field === 'faultedBy' && value === 'DATA_ENTRY_FAULT') {
                updatedForm.status = 'VOIDED';
            } else if (field === 'faultedBy' && value !== 'DATA_ENTRY_FAULT' && updatedForm.status === 'VOIDED') {
                updatedForm.status = 'DAMAGED';
            }

            // Clear errors on change
            if (field === 'status' || field === 'faultedBy' || field === 'damagedReason' || field === 'damagedEvidenceUrl') {
                updatedForm.errors = {};
            }

            return {
                ...prev,
                [id]: updatedForm
            };
        });
    };

    const validateForms = (): boolean => {
        let isValid = true;
        const newForms = { ...forms };

        Object.keys(newForms).forEach((id) => {
            const form = newForms[id];
            if (!form.selected) return;

            const errors: FormState['errors'] = {};

            // 1. If status is LOST or VOIDED: damagedReason is required
            if (form.status === 'LOST' || form.status === 'VOIDED') {
                if (!form.damagedReason.trim()) {
                    errors.damagedReason = form.status === 'LOST' ? 'Lý do mất không được để trống.' : 'Lý do hủy không được để trống.';
                    isValid = false;
                }
            }

            // 2. If faultedBy is INTERNAL_FAULT and status is DAMAGED: both damagedReason and damagedEvidenceUrl are required
            if (form.faultedBy === 'INTERNAL_FAULT' && form.status === 'DAMAGED') {
                if (!form.damagedReason.trim()) {
                    errors.damagedReason = 'Lý do hỏng không được để trống.';
                    isValid = false;
                }
                if (!form.damagedEvidenceUrl.trim()) {
                    errors.damagedEvidenceUrl = 'Đường dẫn ảnh minh chứng không được để trống.';
                    isValid = false;
                }
            }

            newForms[id] = {
                ...form,
                errors
            };
        });

        setForms(newForms);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForms()) {
            AppToast.error('Vui lòng kiểm tra lại thông tin nhập liệu.');
            return;
        }

        const selectedItems = Object.keys(forms)
            .filter((id) => forms[id].selected)
            .map((id) => ({
                id: Number(id),
                ...forms[id]
            }));

        if (selectedItems.length === 0) {
            AppToast.error('Vui lòng chọn ít nhất một sê-ri để báo cáo.');
            return;
        }

        setSubmitting(true);
        try {
            await Promise.all(
                selectedItems.map((item) =>
                    reportTicketSerialFault(
                        item.id,
                        buildReportSerialFaultPayload({
                            faultKind: item.status,
                            faultedBy: item.faultedBy,
                            damagedReason: item.damagedReason,
                            damagedEvidenceUrl: item.damagedEvidenceUrl || undefined,
                        })
                    )
                )
            );
            AppToast.success('Báo cáo hủy vé thành công!');
            onSuccess();
        } catch (error: any) {
            console.error('Failed to report serial fault:', error);
            AppToast.error(
                error?.response?.data?.message ||
                error?.message ||
                'Có lỗi xảy ra khi báo cáo hủy vé.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                className: 'admin-theme',
                sx: { 
                    borderRadius: '24px', 
                    overflow: 'hidden',
                    borderTop: '6px solid #ef4444',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff' }}>
                <Box 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: 48, 
                        height: 48, 
                        borderRadius: '14px', 
                        bgcolor: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444'
                    }}
                >
                    <ReportProblemIcon sx={{ fontSize: '28px' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={800} color="#0f172a">
                        Báo cáo hủy vé số vật lý
                    </Typography>
                    {ticketNumbers && (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                            <LayersIcon sx={{ fontSize: '14px', color: '#64748b' }} />
                            <Typography variant="body2" color="#64748b">
                                Dãy số chính: <strong style={{ color: '#334155', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{ticketNumbers}</strong>
                            </Typography>
                        </Stack>
                    )}
                </Box>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    disabled={submitting}
                    sx={{
                        color: '#94a3b8',
                        bgcolor: '#f1f5f9',
                        '&:hover': { bgcolor: '#e2e8f0', color: '#64748b' }
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3, bgcolor: '#f8fafc' }}>
                <Stack spacing={2.5}>
                    {serials.map((s, index) => {
                        const form = forms[s.id];
                        if (!form) return null;

                        const isAlreadyFaulted = isAlreadyFaultReportedSerial(s);
                        const isSold = s.status === 'SOLD';
                        const isSelected = form.selected;

                        // Card Styling
                        let cardBg = '#fff';
                        let cardBorder = '1px solid #e2e8f0';
                        let cardShadow = 'none';

                        if (isSelected) {
                            cardBorder = '2px solid #ef4444';
                            cardShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.05), 0 4px 6px -2px rgba(239, 68, 68, 0.02)';
                        } else if (isAlreadyFaulted || isSold) {
                            cardBg = '#f1f5f9';
                            cardBorder = '1px dashed #cbd5e1';
                        }

                        return (
                            <Box 
                                key={s.id} 
                                sx={{ 
                                    p: 2.5, 
                                    border: cardBorder, 
                                    borderRadius: '16px', 
                                    bgcolor: cardBg,
                                    boxShadow: cardShadow,
                                    transition: 'all 0.25s ease'
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={form.selected}
                                                onChange={(e) => handleFieldChange(s.id, 'selected', e.target.checked)}
                                                disabled={isAlreadyFaulted || isSold}
                                                sx={{
                                                    color: '#cbd5e1',
                                                    '&.Mui-checked': {
                                                        color: '#ef4444',
                                                    },
                                                }}
                                            />
                                        }
                                        label={
                                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                                <Typography variant="body1" fontWeight={700} color={form.selected ? '#0f172a' : '#64748b'}>
                                                    Mã Sê-ri:
                                                </Typography>
                                                <Typography 
                                                    variant="body1" 
                                                    fontWeight={800} 
                                                    color={form.selected ? '#ef4444' : '#64748b'}
                                                    sx={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
                                                >
                                                    {s.serialNumber}
                                                </Typography>
                                            </Stack>
                                        }
                                    />
                                    
                                    {/* Status Badge */}
                                    {isAlreadyFaulted && (
                                        <Box 
                                            sx={{ 
                                                px: 2, 
                                                py: 0.75, 
                                                borderRadius: '30px', 
                                                bgcolor: (s.ticketCondition || '') === 'VOIDED' ? '#f1f5f9' : ((s.ticketCondition || s.status) === 'DAMAGED' ? '#fef2f2' : '#fff7ed'), 
                                                color: (s.ticketCondition || '') === 'VOIDED' ? '#64748b' : ((s.ticketCondition || s.status) === 'DAMAGED' ? '#ef4444' : '#f97316'),
                                                border: (s.ticketCondition || '') === 'VOIDED' ? '1px solid #e2e8f0' : ((s.ticketCondition || s.status) === 'DAMAGED' ? '1px solid #fee2e2' : '1px solid #ffedd5'),
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {(s.ticketCondition || '') === 'VOIDED'
                                                ? 'Đã hủy (VOIDED)'
                                                : `Đã báo ${(s.ticketCondition || s.status) === 'DAMAGED' ? 'Hỏng vật lý' : 'Thất lạc/Mất'}`}
                                        </Box>
                                    )}
                                    {isSold && (
                                        <Box 
                                            sx={{ 
                                                px: 2, 
                                                py: 0.75, 
                                                borderRadius: '30px', 
                                                bgcolor: '#f0fdf4', 
                                                color: '#16a34a',
                                                border: '1px solid #dcfce7',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            Đã bán lẻ
                                        </Box>
                                    )}
                                </Stack>

                                {form.selected && (
                                    <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid #f1f5f9' }}>
                                        <Grid container spacing={2.5}>
                                            {!hideFaultedBySelect && (
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <FormControl fullWidth size="medium">
                                                        <InputLabel id={`faulted-by-label-${s.id}`} sx={{ fontWeight: 500 }}>Nguyên nhân sự cố</InputLabel>
                                                        <Select
                                                            labelId={`faulted-by-label-${s.id}`}
                                                            value={form.faultedBy}
                                                            label="Nguyên nhân sự cố"
                                                            onChange={(e) => handleFieldChange(s.id, 'faultedBy', e.target.value)}
                                                            sx={{ borderRadius: '10px' }}
                                                        >
                                                            <MenuItem value="INTERNAL_FAULT" sx={{ fontWeight: 500 }}>Nhân viên làm hỏng vật lý</MenuItem>
                                                            <MenuItem value="ISSUER_FAULT" sx={{ fontWeight: 500 }}>Lỗi in ấn từ nhà cung cấp</MenuItem>
                                                            <MenuItem value="DATA_ENTRY_FAULT" sx={{ fontWeight: 500 }}>Lỗi thao tác nhập liệu</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                            )}

                                            <Grid size={hideFaultedBySelect ? 12 : { xs: 12, sm: 6 }}>
                                                <FormControl fullWidth size="medium">
                                                    <InputLabel id={`status-label-${s.id}`} sx={{ fontWeight: 500 }}>Trạng thái báo hủy</InputLabel>
                                                    <Select
                                                        labelId={`status-label-${s.id}`}
                                                        value={form.status}
                                                        label="Trạng thái báo hủy"
                                                        disabled={form.faultedBy === 'DATA_ENTRY_FAULT'}
                                                        onChange={(e) => handleFieldChange(s.id, 'status', e.target.value)}
                                                        sx={{ borderRadius: '10px' }}
                                                    >
                                                        {form.faultedBy === 'DATA_ENTRY_FAULT' ? (
                                                            <MenuItem value="VOIDED" sx={{ fontWeight: 500 }}>Hủy do lỗi nhập liệu (VOIDED)</MenuItem>
                                                        ) : (
                                                            [
                                                                <MenuItem key="DAMAGED" value="DAMAGED" sx={{ fontWeight: 500 }}>Hỏng vật lý (DAMAGED)</MenuItem>,
                                                                <MenuItem key="LOST" value="LOST" sx={{ fontWeight: 500 }}>Thất lạc / Mất (LOST)</MenuItem>
                                                            ]
                                                        )}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid size={12}>
                                                <TextField
                                                    label="Lý do hủy chi tiết"
                                                    variant="outlined"
                                                    fullWidth
                                                    multiline
                                                    rows={2}
                                                    required={form.status === 'LOST' || (form.faultedBy === 'INTERNAL_FAULT' && form.status === 'DAMAGED')}
                                                    value={form.damagedReason}
                                                    onChange={(e) => handleFieldChange(s.id, 'damagedReason', e.target.value)}
                                                    error={!!form.errors.damagedReason}
                                                    helperText={form.errors.damagedReason}
                                                    placeholder="Ví dụ: Rách nát trong quá trình phân loại, mất khi di chuyển..."
                                                    InputProps={{
                                                        sx: { borderRadius: '12px' }
                                                    }}
                                                />
                                                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                                                    {QUICK_REASON_SUGGESTIONS.map((text) => (
                                                        <Chip
                                                            key={text}
                                                            label={text}
                                                            size="small"
                                                            onClick={() => handleFieldChange(s.id, 'damagedReason', text)}
                                                            sx={{
                                                                borderRadius: '6px',
                                                                bgcolor: '#f1f5f9',
                                                                color: '#334155',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 500,
                                                                cursor: 'pointer',
                                                                border: '1px solid #e2e8f0',
                                                                '&:hover': {
                                                                    bgcolor: '#fee2e2',
                                                                    color: '#ef4444',
                                                                    borderColor: '#fca5a5',
                                                                },
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            </Grid>

                                            {form.status === 'DAMAGED' && (
                                                <Grid size={12}>
                                                    <UploadSingleFile
                                                        label="Ảnh minh chứng vé hỏng"
                                                        required={form.faultedBy === 'INTERNAL_FAULT'}
                                                        value={form.damagedEvidenceUrl}
                                                        onChange={(url) => handleFieldChange(s.id, 'damagedEvidenceUrl', url)}
                                                        error={form.errors.damagedEvidenceUrl}
                                                        autoUpload
                                                    />
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, display: 'flex', gap: 2, bgcolor: '#fff' }}>
                <Button 
                    onClick={onClose} 
                    disabled={submitting} 
                    variant="outlined" 
                    color="inherit"
                    sx={{ 
                        borderRadius: '12px',
                        px: 4,
                        py: 1.25,
                        fontWeight: 700,
                        textTransform: 'none',
                        color: '#475569',
                        borderColor: '#cbd5e1',
                        '&:hover': {
                            borderColor: '#94a3b8',
                            bgcolor: '#f8fafc'
                        }
                    }}
                >
                    Hủy bỏ
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    disabled={submitting} 
                    variant="contained" 
                    sx={{ 
                        borderRadius: '12px',
                        px: 4,
                        py: 1.25,
                        fontWeight: 700,
                        textTransform: 'none',
                        bgcolor: '#ef4444',
                        boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.4)',
                        '&:hover': {
                            bgcolor: '#dc2626',
                            boxShadow: '0 4px 12px -1px rgba(239, 68, 68, 0.5)',
                        }
                    }}
                >
                    {submitting ? 'Đang gửi...' : 'Xác nhận báo cáo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
