import React, { useState, useEffect } from 'react';
import {
    Typography,
    Box,
    TextField,
    Checkbox,
    FormControlLabel,
    IconButton,
    Stack,
    Grid,
    InputAdornment,
    Tooltip,
    Button,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    Chip,
    CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LinkIcon from '@mui/icons-material/Link';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LayersIcon from '@mui/icons-material/Layers';
import { reportTicketSerialFault, createTicket, replaceTicketDigits } from '../../../inventory/services/ticketService';
import { AppToast } from '../../../../../../utils/toast.util';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';

interface SerialItem {
    id: number | string;
    serialNumber: string;
    status: string;
    ticketId?: number | string;
    ticketNumbers?: string;
}

interface TicketGroup {
    ticketNumbers: string;
    ticketId?: number | string;
    serials: SerialItem[];
}

interface Props {
    serials: SerialItem[];
    ticketNumbers: string;
    ticketId?: number | string;
    importBatchLineId: number | string;
    stationId?: number | string;
    drawDate?: string;
    onCancel: () => void;
    onSuccess: () => void;
}

interface FormState {
    selected: boolean;
    status: 'DAMAGED' | 'LOST' | 'VOIDED';
    faultedBy: 'INTERNAL_FAULT' | 'ISSUER_FAULT' | 'DATA_ENTRY_FAULT';
    damagedReason: string;
    damagedEvidenceUrl: string;
    replacementNumbers?: string;
    replacementSerial?: string;
    replacementTicketImg?: string;
    errors: {
        damagedReason?: string;
        damagedEvidenceUrl?: string;
        replacementNumbers?: string;
        replacementSerial?: string;
        replacementTicketImg?: string;
    };
}

export const ReportSerialFaultPane: React.FC<Props> = ({
    serials,
    ticketNumbers,
    ticketId,
    importBatchLineId,
    stationId,
    drawDate,
    onCancel,
    onSuccess
}) => {
    const [forms, setForms] = useState<Record<string | number, FormState>>({});
    const [submitting, setSubmitting] = useState(false);

    const [replacementType, setReplacementType] = useState<'DIGITS' | 'SERIALS'>('DIGITS');
    const [replacementDigits, setReplacementDigits] = useState('');
    const [replacementDigitsImg, setReplacementDigitsImg] = useState('');
    const [digitsError, setDigitsError] = useState('');

    const [isPreparing, setIsPreparing] = useState(true);
    const [page, setPage] = useState(1);
    const [repPage, setRepPage] = useState(1);
    const [activeGroupIndex, setActiveGroupIndex] = useState(0);
    const pageSize = 10;

    const groups: TicketGroup[] = React.useMemo(() => {
        const map = new Map<string, TicketGroup>();
        serials.forEach(s => {
            const numKey = s.ticketNumbers || ticketNumbers || 'Vé số';
            if (!map.has(numKey)) {
                map.set(numKey, {
                    ticketNumbers: numKey,
                    ticketId: s.ticketId || ticketId,
                    serials: []
                });
            }
            map.get(numKey)!.serials.push(s);
        });
        return Array.from(map.values());
    }, [serials, ticketNumbers, ticketId]);

    useEffect(() => {
        setIsPreparing(true);
        setPage(1);
        setRepPage(1);
        setActiveGroupIndex(0);
        const timer = setTimeout(() => {
            setIsPreparing(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [serials]);

    useEffect(() => {
        if (activeGroupIndex >= groups.length && groups.length > 0) {
            setActiveGroupIndex(groups.length - 1);
        }
    }, [groups.length, activeGroupIndex]);

    const currentGroup = groups[activeGroupIndex] || groups[0];
    const currentSerials = currentGroup?.serials || [];
    const currentTicketNumbers = currentGroup?.ticketNumbers || ticketNumbers;
    const currentTicketId = currentGroup?.ticketId || ticketId;

    useEffect(() => {
        if (!currentTicketId) {
            setReplacementType('SERIALS');
        } else {
            setReplacementType('DIGITS');
        }
    }, [currentTicketId]);

    const selectedCount = Object.keys(forms).filter(id => forms[id].selected).length;
    const hasVoided = Object.keys(forms).some(id => forms[id].selected && forms[id].status === 'VOIDED');
    const canSubmit = selectedCount > 0 && Object.keys(forms).every(id => {
        const form = forms[id];
        if (!form.selected) return true;
        if (form.status === 'VOIDED') {
            if (replacementType === 'DIGITS') {
                return !!replacementDigits && replacementDigits.length === 6;
            } else {
                return !!form.replacementSerial?.trim();
            }
        }
        return true;
    });

    useEffect(() => {
        if (serials) {
            const initialForms: Record<string | number, FormState> = {};
            serials.forEach((s) => {
                const isAlreadyFaulted = s.status === 'DAMAGED' || s.status === 'LOST' || s.status === 'VOIDED';
                const isSold = s.status === 'SOLD';
                initialForms[s.id] = {
                    selected: !isAlreadyFaulted && !isSold,
                    status: 'DAMAGED',
                    faultedBy: 'INTERNAL_FAULT',
                    damagedReason: '',
                    damagedEvidenceUrl: '',
                    replacementNumbers: '',
                    replacementSerial: '',
                    replacementTicketImg: '',
                    errors: {}
                };
            });
            setForms(initialForms);
        }
    }, [serials]);

    const handleFieldChange = (
        id: string | number,
        field: keyof FormState,
        value: any
    ) => {
        setForms((prev) => {
            const updatedForm = {
                ...prev[id],
                [field]: field === 'replacementNumbers' ? value.replace(/\D/g, '') : value
            };

            if (field === 'faultedBy' && value === 'DATA_ENTRY_FAULT') {
                updatedForm.status = 'VOIDED';
            } else if (field === 'faultedBy' && value !== 'DATA_ENTRY_FAULT' && updatedForm.status === 'VOIDED') {
                updatedForm.status = 'DAMAGED';
            }

            if (field === 'status' || field === 'faultedBy' || field === 'damagedReason' || field === 'damagedEvidenceUrl') {
                if (updatedForm.errors) {
                    delete updatedForm.errors[field as keyof typeof updatedForm.errors];
                }
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

            if (form.status === 'DAMAGED' || form.status === 'LOST' || form.status === 'VOIDED') {
                if (!form.damagedReason?.trim()) {
                    errors.damagedReason = 'Vui lòng chọn hoặc nhập lý do chi tiết.';
                    isValid = false;
                }
                if (!form.damagedEvidenceUrl?.trim()) {
                    errors.damagedEvidenceUrl = 'Ảnh minh chứng sự cố không được để trống.';
                    isValid = false;
                }
            }

            if (form.status === 'VOIDED' && replacementType === 'SERIALS') {
                if (!form.replacementSerial?.trim()) {
                    errors.replacementSerial = 'Số sê-ri thay thế không được để trống.';
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
        const selectedItems = Object.keys(forms)
            .filter((id) => forms[id].selected)
            .map((id) => {
                const sItem = serials.find(s => String(s.id) === String(id));
                return {
                    id: Number(id),
                    ticketId: sItem?.ticketId || ticketId,
                    ticketNumbers: sItem?.ticketNumbers || ticketNumbers,
                    ...forms[id]
                };
            });

        if (selectedItems.length === 0) {
            AppToast.error('Vui lòng chọn ít nhất một sê-ri để báo cáo.');
            return;
        }

        const hasVoidedItems = selectedItems.some(item => item.status === 'VOIDED');
        if (hasVoidedItems && replacementType === 'DIGITS') {
            if (!replacementDigits.trim()) {
                setDigitsError('Dãy số vé thay thế không được để trống.');
                AppToast.error('Vui lòng nhập dãy số vé thay thế.');
                return;
            }
            if (replacementDigits.trim().length !== 6) {
                setDigitsError('Dãy số vé thay thế phải có đúng 6 chữ số.');
                AppToast.error('Dãy số vé thay thế phải có đúng 6 chữ số.');
                return;
            }
        }

        if (!validateForms()) {
            AppToast.error('Vui lòng kiểm tra lại thông tin nhập liệu.');
            return;
        }

        setSubmitting(true);
        try {
            await Promise.all(
                selectedItems.map((item) =>
                    reportTicketSerialFault(item.id, {
                        status: item.status,
                        faultedBy: item.faultedBy,
                        damagedReason: item.damagedReason,
                        damagedEvidenceUrl: item.damagedEvidenceUrl || undefined
                    })
                )
            );

            const voidedItems = selectedItems.filter(item => item.status === 'VOIDED');
            if (voidedItems.length > 0) {
                if (replacementType === 'DIGITS') {
                    const targetTicketId = currentTicketId || ticketId;
                    if (targetTicketId) {
                        await replaceTicketDigits(targetTicketId, {
                            newNumbers: replacementDigits.trim(),
                            newTicketImg: replacementDigitsImg || undefined
                        });
                    }
                } else {
                    await Promise.all(
                        voidedItems.map((item) => {
                            if (item.replacementSerial?.trim()) {
                                return createTicket({
                                    stationId: Number(stationId),
                                    importBatchLineId: Number(importBatchLineId),
                                    numbers: item.ticketNumbers || ticketNumbers,
                                    drawDate: drawDate,
                                    serials: [
                                        {
                                            serialNumber: item.replacementSerial.trim(),
                                            ticketImg: item.replacementTicketImg || undefined,
                                            replacedForTicketId: item.id
                                        }
                                    ]
                                });
                            }
                            return Promise.resolve();
                        })
                    );
                }
            }

            AppToast.success('Báo cáo sự cố và cập nhật vé thay thế thành công!');
            onSuccess();
        } catch (error: any) {
            console.error('Submit serial fault failed:', error);
            AppToast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi báo cáo sự cố sê-ri.');
        } finally {
            setSubmitting(false);
        }
    };

    if (isPreparing) {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 4,
                    borderRadius: '20px',
                    borderColor: '#cbd5e1',
                    bgcolor: '#fff',
                    height: '100%',
                    maxHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    borderTop: '6px solid #ef4444'
                }}
            >
                <CircularProgress size={40} sx={{ color: '#ef4444', mb: 2 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={700}>
                    Đang thiết lập thông tin báo cáo...
                </Typography>
            </Paper>
        );
    }

    const totalPages = Math.ceil(currentSerials.length / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedSerials = currentSerials.slice(startIndex, startIndex + pageSize);

    const voidedSerials = currentSerials.filter(s => forms[s.id]?.selected && forms[s.id]?.status === 'VOIDED');
    const repTotalPages = Math.ceil(voidedSerials.length / pageSize);
    const repStartIndex = (repPage - 1) * pageSize;
    const paginatedVoidedSerials = voidedSerials.slice(repStartIndex, repStartIndex + pageSize);

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 3,
                borderRadius: '20px',
                borderColor: '#cbd5e1',
                bgcolor: '#fff',
                height: '100%',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                borderTop: '6px solid #ef4444'
            }}
        >
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
                <Box 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: 42, 
                        height: 42, 
                        borderRadius: '12px', 
                        bgcolor: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444'
                    }}
                >
                    <ReportProblemIcon sx={{ fontSize: '24px' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={850} color="#0f172a" sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                        Báo cáo hủy vé số vật lý
                    </Typography>
                    {currentTicketNumbers && (
                        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
                            <LayersIcon sx={{ fontSize: '15px', color: '#64748b' }} />
                            <Typography variant="body2" color="#64748b" fontWeight={600} sx={{ display: 'flex', alignItems: 'center' }}>
                                Dãy số: 
                                <span style={{ 
                                    color: '#ef4444', 
                                    fontFamily: 'monospace', 
                                    fontWeight: 900, 
                                    fontSize: '1rem', 
                                    letterSpacing: '1px', 
                                    marginLeft: '6px', 
                                    backgroundColor: '#fee2e2', 
                                    padding: '2px 8px', 
                                    borderRadius: '6px',
                                    border: '1px solid #fecaca'
                                }}>
                                    {currentTicketNumbers}
                                </span>
                                {groups.length > 1 && (
                                    <Chip 
                                        label={`${activeGroupIndex + 1}/${groups.length} dãy số`} 
                                        size="small" 
                                        sx={{ ml: 1.5, height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#fee2e2', color: '#ef4444' }} 
                                    />
                                )}
                            </Typography>
                        </Stack>
                    )}
                </Box>
                <IconButton
                    aria-label="close"
                    onClick={onCancel}
                    disabled={submitting}
                    size="small"
                    sx={{
                        color: '#94a3b8',
                        bgcolor: '#f1f5f9',
                        '&:hover': { bgcolor: '#e2e8f0', color: '#64748b' }
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            {/* Form scrollable container */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5, mb: 2.5, minHeight: 0 }}>
                {/* Group (Ticket Numbers) Switcher Header */}
                {groups.length > 1 ? (
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 1.5, py: 1, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <Button 
                            size="small" 
                            disabled={activeGroupIndex === 0} 
                            onClick={() => { setActiveGroupIndex(i => i - 1); setPage(1); setRepPage(1); }}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            ‹ Dãy trước
                        </Button>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ overflowX: 'auto', py: 0.5, maxWidth: '65%' }}>
                            {groups.map((g, idx) => (
                                <Chip
                                    key={g.ticketNumbers}
                                    label={`Dãy ${g.ticketNumbers} (${g.serials.length})`}
                                    color={idx === activeGroupIndex ? "error" : "default"}
                                    variant={idx === activeGroupIndex ? "filled" : "outlined"}
                                    onClick={() => { setActiveGroupIndex(idx); setPage(1); setRepPage(1); }}
                                    sx={{ fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                                />
                            ))}
                        </Stack>
                        <Button 
                            size="small" 
                            disabled={activeGroupIndex === groups.length - 1} 
                            onClick={() => { setActiveGroupIndex(i => i + 1); setPage(1); setRepPage(1); }}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Dãy sau ›
                        </Button>
                    </Stack>
                ) : (
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 1.5, py: 1, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            Hiển thị sê-ri cho dãy số {currentTicketNumbers} ({currentSerials.length} sê-ri vật lý)
                        </Typography>
                    </Stack>
                )}

                {/* Sub-pagination if single ticket group has > 10 serials */}
                {totalPages > 1 && (
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 1, bgcolor: '#fff', p: 0.75, borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <Button 
                            size="small" 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                        >
                            Trang trước
                        </Button>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Trang {page} / {totalPages} ({startIndex + 1} - {Math.min(startIndex + pageSize, currentSerials.length)})
                        </Typography>
                        <Button 
                            size="small" 
                            disabled={page === totalPages} 
                            onClick={() => setPage(p => p + 1)}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                        >
                            Trang sau
                        </Button>
                    </Stack>
                )}
                <Stack spacing={2}>
                    {paginatedSerials.map((s) => {
                        const form = forms[s.id];
                        if (!form) return null;

                        const isAlreadyFaulted = s.status === 'DAMAGED' || s.status === 'LOST' || s.status === 'VOIDED';
                        const isSold = s.status === 'SOLD';
                        const isSelected = form.selected;

                        // Card Styling
                        let cardBg = '#fff';
                        let cardBorder = '1px solid #e2e8f0';
                        let cardShadow = 'none';

                        if (isSelected) {
                            cardBorder = '2px solid #ef4444';
                            cardShadow = '0 4px 6px -1px rgba(239, 68, 68, 0.05)';
                        } else if (isAlreadyFaulted || isSold) {
                            cardBg = '#f8fafc';
                            cardBorder = '1px dashed #cbd5e1';
                        }

                        return (
                            <Box 
                                key={s.id} 
                                sx={{ 
                                    p: 2, 
                                    border: cardBorder, 
                                    borderRadius: '12px', 
                                    bgcolor: cardBg,
                                    boxShadow: cardShadow,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={form.selected}
                                                onChange={(e) => handleFieldChange(s.id, 'selected', e.target.checked)}
                                                disabled={isAlreadyFaulted || isSold}
                                                size="small"
                                                sx={{
                                                    color: '#cbd5e1',
                                                    '&.Mui-checked': {
                                                        color: '#ef4444',
                                                    },
                                                }}
                                            />
                                        }
                                        label={
                                            <Typography 
                                                variant="body2" 
                                                fontWeight={800} 
                                                color={form.selected ? '#ef4444' : '#64748b'}
                                                sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                            >
                                                {s.serialNumber}
                                            </Typography>
                                        }
                                    />
                                    
                                    {isAlreadyFaulted && (
                                        <Box 
                                            sx={{ 
                                                px: 1.5, 
                                                py: 0.5, 
                                                borderRadius: '30px', 
                                                bgcolor: s.status === 'DAMAGED' ? '#fef2f2' : s.status === 'LOST' ? '#fff7ed' : '#f8fafc', 
                                                color: s.status === 'DAMAGED' ? '#ef4444' : s.status === 'LOST' ? '#f97316' : '#64748b',
                                                border: s.status === 'DAMAGED' ? '1px solid #fee2e2' : s.status === 'LOST' ? '1px solid #ffedd5' : '1px solid #e2e8f0',
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {s.status === 'DAMAGED' ? 'Hỏng' : s.status === 'LOST' ? 'Mất' : 'Hủy nhập'}
                                        </Box>
                                    )}
                                    {isSold && (
                                        <Box 
                                            sx={{ 
                                                px: 1.5, 
                                                py: 0.5, 
                                                borderRadius: '30px', 
                                                bgcolor: '#f0fdf4', 
                                                color: '#16a34a',
                                                border: '1px solid #dcfce7',
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            Đã bán
                                        </Box>
                                    )}
                                </Stack>

                                {form.selected && (
                                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                                        <Stack spacing={2}>
                                            {/* Nguyên nhân sự cố - Toggle pills */}
                                            <Box>
                                                <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                                    Nguyên nhân sự cố
                                                </Typography>
                                                <ToggleButtonGroup
                                                    value={form.faultedBy}
                                                    exclusive
                                                    onChange={(e, val) => { if (val) handleFieldChange(s.id, 'faultedBy', val); }}
                                                    size="small"
                                                    fullWidth
                                                    sx={{
                                                        bgcolor: '#f1f5f9',
                                                        p: 0.5,
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        '& .MuiToggleButtonGroup-grouped': {
                                                            border: 'none',
                                                            borderRadius: '8px !important',
                                                        }
                                                    }}
                                                >
                                                    <ToggleButton 
                                                        value="INTERNAL_FAULT" 
                                                        sx={{ 
                                                            fontWeight: 700, 
                                                            textTransform: 'none',
                                                            fontSize: '0.8rem',
                                                            py: 0.75,
                                                            color: '#64748b',
                                                            '&.Mui-selected': {
                                                                bgcolor: '#fff',
                                                                color: '#ef4444',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                            }
                                                        }}
                                                    >
                                                        Nhân viên làm hỏng
                                                    </ToggleButton>
                                                    <ToggleButton 
                                                        value="DATA_ENTRY_FAULT" 
                                                        sx={{ 
                                                            fontWeight: 700, 
                                                            textTransform: 'none',
                                                            fontSize: '0.8rem',
                                                            py: 0.75,
                                                            color: '#64748b',
                                                            '&.Mui-selected': {
                                                                bgcolor: '#fff',
                                                                color: '#ef4444',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                            }
                                                        }}
                                                    >
                                                        Lỗi thao tác nhập liệu
                                                    </ToggleButton>
                                                </ToggleButtonGroup>
                                            </Box>

                                            {/* Trạng thái báo hủy - Toggle pills */}
                                            <Box>
                                                <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                                    Trạng thái báo hủy
                                                </Typography>
                                                <ToggleButtonGroup
                                                    value={form.status}
                                                    exclusive
                                                    onChange={(e, val) => { if (val) handleFieldChange(s.id, 'status', val); }}
                                                    size="small"
                                                    fullWidth
                                                    disabled={form.faultedBy === 'DATA_ENTRY_FAULT'}
                                                    sx={{
                                                        bgcolor: '#f1f5f9',
                                                        p: 0.5,
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        '& .MuiToggleButtonGroup-grouped': {
                                                            border: 'none',
                                                            borderRadius: '8px !important',
                                                        }
                                                    }}
                                                >
                                                    {form.faultedBy === 'DATA_ENTRY_FAULT' ? (
                                                        <ToggleButton 
                                                            value="VOIDED" 
                                                            sx={{ 
                                                                fontWeight: 700, 
                                                                textTransform: 'none',
                                                                fontSize: '0.8rem',
                                                                py: 0.75,
                                                                color: '#ef4444',
                                                                '&.Mui-selected': {
                                                                    bgcolor: '#fff',
                                                                    color: '#ef4444',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                                }
                                                            }}
                                                        >
                                                            Hủy do lỗi nhập liệu (VOIDED)
                                                        </ToggleButton>
                                                    ) : (
                                                        [
                                                            <ToggleButton 
                                                                key="DAMAGED"
                                                                value="DAMAGED" 
                                                                sx={{ 
                                                                    fontWeight: 700, 
                                                                    textTransform: 'none',
                                                                    fontSize: '0.8rem',
                                                                    py: 0.75,
                                                                    color: '#64748b',
                                                                    '&.Mui-selected': {
                                                                        bgcolor: '#fff',
                                                                        color: '#ef4444',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                                    }
                                                                }}
                                                            >
                                                                Hỏng vật lý (DAMAGED)
                                                            </ToggleButton>,
                                                            <ToggleButton 
                                                                key="LOST"
                                                                value="LOST" 
                                                                sx={{ 
                                                                    fontWeight: 700, 
                                                                    textTransform: 'none',
                                                                    fontSize: '0.8rem',
                                                                    py: 0.75,
                                                                    color: '#64748b',
                                                                    '&.Mui-selected': {
                                                                        bgcolor: '#fff',
                                                                        color: '#ef4444',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                                    }
                                                                }}
                                                            >
                                                                Thất lạc / Mất (LOST)
                                                            </ToggleButton>
                                                        ]
                                                    )}
                                                </ToggleButtonGroup>
                                            </Box>

                                            {/* Lý do chi tiết */}
                                            <Box>
                                                <TextField
                                                    label="Lý do chi tiết"
                                                    variant="outlined"
                                                    fullWidth
                                                    size="small"
                                                    required={form.status === 'LOST' || form.status === 'VOIDED' || (form.faultedBy === 'INTERNAL_FAULT' && form.status === 'DAMAGED')}
                                                    value={form.damagedReason}
                                                    onChange={(e) => handleFieldChange(s.id, 'damagedReason', e.target.value)}
                                                    error={!!form.errors.damagedReason}
                                                    helperText={form.errors.damagedReason}
                                                    placeholder="Nhập lý do chi tiết..."
                                                    InputProps={{
                                                        sx: { borderRadius: '10px' }
                                                    }}
                                                />
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                                                    {form.faultedBy === 'INTERNAL_FAULT' ? (
                                                        ['Lỡ tay làm rách vé', 'Vé bị dính nước/bẩn', 'Mất vé khi kiểm kho'].map((sug) => (
                                                            <Chip
                                                                key={sug}
                                                                label={sug}
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleFieldChange(s.id, 'damagedReason', sug)}
                                                                sx={{ borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                            />
                                                        ))
                                                    ) : (
                                                        ['Nhập sai số vé', 'Nhập nhầm đài/ngày', 'Nhập sai số sê-ri'].map((sug) => (
                                                            <Chip
                                                                key={sug}
                                                                label={sug}
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleFieldChange(s.id, 'damagedReason', sug)}
                                                                sx={{ borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                            />
                                                        ))
                                                    )}
                                                </Box>
                                            </Box>

                                            {/* Link ảnh minh chứng */}
                                            {form.status === 'DAMAGED' && (
                                                <Box>
                                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                                        Ảnh minh chứng {form.faultedBy === 'INTERNAL_FAULT' && <strong style={{ color: '#ef4444' }}>*</strong>}
                                                    </Typography>
                                                    <UploadSingleFile
                                                        value={form.damagedEvidenceUrl}
                                                        onChange={(url) => handleFieldChange(s.id, 'damagedEvidenceUrl', url)}
                                                        autoUpload={true}
                                                        compact={true}
                                                        error={form.errors.damagedEvidenceUrl}
                                                    />
                                                </Box>
                                            )}
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}

                            {hasVoided && (
                        <Box sx={{ mt: 1, p: 2, border: '1px solid #fee2e2', borderRadius: '12px', bgcolor: 'rgba(239, 68, 68, 0.01)' }}>
                            <Typography variant="caption" fontWeight={800} color="#ef4444" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                                Vé số thay thế
                            </Typography>
                            
                            <Box sx={{ mb: 2 }}>
                                <ToggleButtonGroup
                                    value={replacementType}
                                    exclusive
                                    onChange={(e, val) => { if (val) setReplacementType(val); }}
                                    size="small"
                                    fullWidth
                                    sx={{
                                        bgcolor: '#f1f5f9',
                                        p: 0.5,
                                        borderRadius: '10px',
                                        border: 'none',
                                        '& .MuiToggleButtonGroup-grouped': {
                                            border: 'none',
                                            borderRadius: '8px !important',
                                        }
                                    }}
                                >
                                    <ToggleButton 
                                        value="DIGITS" 
                                        disabled={!ticketId}
                                        sx={{ 
                                            fontWeight: 700, 
                                            textTransform: 'none',
                                            fontSize: '0.8rem',
                                            py: 0.75,
                                            color: '#64748b',
                                            '&.Mui-selected': {
                                                bgcolor: '#fff',
                                                color: '#ef4444',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                            }
                                        }}
                                    >
                                        Thay dãy số cho tờ vé
                                    </ToggleButton>
                                    <ToggleButton 
                                        value="SERIALS" 
                                        sx={{ 
                                            fontWeight: 700, 
                                            textTransform: 'none',
                                            fontSize: '0.8rem',
                                            py: 0.75,
                                            color: '#64748b',
                                            '&.Mui-selected': {
                                                bgcolor: '#fff',
                                                color: '#ef4444',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                            }
                                        }}
                                    >
                                        Thay số seri cho tờ vé
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            {/* Chú thích mô tả vai trò */}
                            <Typography 
                                variant="caption" 
                                color="#64748b" 
                                sx={{ 
                                    display: 'block', 
                                    mb: 2, 
                                    fontStyle: 'italic',
                                    lineHeight: 1.4,
                                    bgcolor: '#f8fafc',
                                    p: 1,
                                    borderRadius: '6px',
                                    borderLeft: '3px solid #ef4444'
                                }}
                            >
                                {!ticketId
                                    ? '(*) Đang chọn số sê-ri từ nhiều tờ vé khác nhau. Tính năng thay đổi dãy số bị vô hiệu hóa (chỉ hỗ trợ thay số sê-ri).'
                                    : replacementType === 'DIGITS' 
                                        ? '(*) Tiến hành thay đổi dãy số của vé nhưng vẫn giữ lại các số sê-ri cũ đã nhập trước đó.'
                                        : '(*) Giữ nguyên dãy số của vé và tiến hành thay đổi số sê-ri cho các tờ vé cụ thể.'
                                }
                            </Typography>

                            {replacementType === 'DIGITS' ? (
                                <Stack spacing={2}>
                                    <TextField
                                        label="Dãy số vé thay thế (6 chữ số)"
                                        variant="outlined"
                                        fullWidth
                                        size="small"
                                        value={replacementDigits}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setReplacementDigits(val);
                                            if (val && val.length !== 6) {
                                                setDigitsError('Dãy số vé thay thế phải có đúng 6 chữ số.');
                                            } else {
                                                setDigitsError('');
                                            }
                                        }}
                                        placeholder="Ví dụ: 800039"
                                        error={!!digitsError}
                                        helperText={digitsError}
                                        inputProps={{ maxLength: 6 }}
                                    />
                                    <Box>
                                        <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                            Ảnh vé thay thế
                                        </Typography>
                                        <UploadSingleFile
                                            value={replacementDigitsImg}
                                            onChange={(url) => setReplacementDigitsImg(url)}
                                            autoUpload={true}
                                            compact={true}
                                        />
                                    </Box>
                                </Stack>
                            ) : (
                                <Stack spacing={2}>
                                    {repTotalPages > 1 && (
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 1, bgcolor: '#f8fafc', p: 1, borderRadius: '8px', border: '1px solid #fee2e2' }}>
                                            <Button 
                                                size="small" 
                                                disabled={repPage === 1} 
                                                onClick={() => setRepPage(p => p - 1)}
                                                sx={{ textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Trang trước
                                            </Button>
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                Trang {repPage} / {repTotalPages} (Hiển thị {repStartIndex + 1} - {Math.min(repStartIndex + pageSize, voidedSerials.length)} / {voidedSerials.length})
                                            </Typography>
                                            <Button 
                                                size="small" 
                                                disabled={repPage === repTotalPages} 
                                                onClick={() => setRepPage(p => p + 1)}
                                                sx={{ textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Trang sau
                                            </Button>
                                        </Stack>
                                    )}
                                    {paginatedVoidedSerials.map((s) => (
                                        <Box key={s.id} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: '8px', bgcolor: '#fff' }}>
                                            <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 1, fontFamily: 'monospace' }}>
                                                Số sê-ri: {s.serialNumber}
                                            </Typography>
                                            <Stack spacing={1.5}>
                                                <TextField
                                                    label="Số sê-ri thay thế"
                                                    variant="outlined"
                                                    fullWidth
                                                    size="small"
                                                    value={forms[s.id]?.replacementSerial || ''}
                                                    onChange={(e) => handleFieldChange(s.id, 'replacementSerial', e.target.value)}
                                                    placeholder="Ví dụ: IBSEED-..."
                                                    error={!!forms[s.id]?.errors.replacementSerial}
                                                    helperText={forms[s.id]?.errors.replacementSerial}
                                                />
                                                <Box>
                                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
                                                        Ảnh vé thay thế
                                                    </Typography>
                                                    <UploadSingleFile
                                                        value={forms[s.id]?.replacementTicketImg || ''}
                                                        onChange={(url) => handleFieldChange(s.id, 'replacementTicketImg', url)}
                                                        autoUpload={true}
                                                        compact={true}
                                                        error={forms[s.id]?.errors.replacementTicketImg}
                                                    />
                                                </Box>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    )}
                </Stack>
            </Box>

            {/* Action buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #cbd5e1' }}>
                <Button 
                    onClick={onCancel} 
                    disabled={submitting} 
                    variant="outlined" 
                    color="inherit"
                    fullWidth
                    sx={{ 
                        borderRadius: '10px',
                        py: 1,
                        fontWeight: 700,
                        textTransform: 'none',
                        color: '#475569',
                        borderColor: '#cbd5e1'
                    }}
                >
                    Hủy bỏ
                </Button>
                {canSubmit && (
                    <Button 
                        onClick={handleSubmit} 
                        disabled={submitting} 
                        variant="contained" 
                        fullWidth
                        sx={{ 
                            borderRadius: '10px',
                            py: 1,
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: '#ef4444',
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: '#dc2626',
                            }
                        }}
                    >
                        {submitting ? 'Đang gửi...' : 'Xác nhận'}
                    </Button>
                )}
            </Stack>
        </Paper>
    );
};
