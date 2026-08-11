"use client";

'use client';

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
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LinkIcon from '@mui/icons-material/Link';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LayersIcon from '@mui/icons-material/Layers';
import {
    buildReportSerialFaultPayload,
    reportTicketSerialFault,
    replaceTicketDigits,
} from '../../../inventory/services/ticketService';
import {
    applyReplacementSerialDuplicateErrors,
    DUPLICATE_REPLACEMENT_SERIAL_MESSAGE,
    getActiveTransactionSerials,
    groupSerialsByOrderId,
    hasDuplicateReplacementSerialErrors,
    isActiveTransactionSerialStatus,
    isSerialIncidentEligible,
    needsRefundPrepStep,
} from '../../utils/serialIncidentWorkflow';
import { AppToast } from '../../../../../../utils/toast.util';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import {
    TicketIncidentRefundStep,
    type RefundOrderDraft,
} from './TicketIncidentRefundStep';
import { createPartialRefund } from '../../../../orders/services/orderService';
import { refundAdminApi } from '@/admin/features/refund/services/refundService';
import { getOrderStatusBadge } from '@/admin/features/orders/utils/orderStatusBadge';
import { OrderStatus } from '../../../../../../types/order.type';
import {
    formatRefundCurrency,
    ORDER_CANCEL_REASON_DEFAULTS,
} from '../../../../../../types/refund.type';
import {
    dedupeIncidentsByOrderDetailId,
    ORDER_TYPE_LABELS,
} from '../../utils/orderIncidentRefund.utils';
import dayjs from 'dayjs';

interface SerialItem {
    id: number | string;
    serialNumber: string;
    status: string;
    ticketCondition?: string | null;
    returnBatchLineId?: number | string | null;
    ticketId?: number | string;
    ticketNumbers?: string;
    ticketStatus?: string;
    reservedByOrderId?: string;
}

type MappedSubmitItem = FormState & {
    id: number;
    ticketId?: number | string;
    ticketNumbers?: string;
    originalStatus: string;
    reservedByOrderId?: string;
    serialNumber?: string;
};

interface TicketGroup {
    ticketNumbers: string;
    ticketId?: number | string;
    ticketStatus?: string;
    serials: SerialItem[];
}

interface Props {
    serials: SerialItem[];
    ticketNumbers: string;
    ticketId?: number | string;
    importBatchLineId: number | string;
    stationId?: number | string;
    drawDate?: string;
    defaultCancelMode?: 'TICKET' | 'SERIAL';
    cancelButtonText?: string;
    hideFaultedBySelector?: boolean;
    /** Return false to abort opening the confirm dialog / submitting (e.g. inspection expired). */
    beforeConfirm?: () => boolean;
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

const getTicketStatusConfig = (status?: string) => {
    const s = (status || 'IN_STOCK').toUpperCase();
    switch (s) {
        case 'IN_STOCK':
            return { label: 'Trong kho (IN_STOCK)', color: '#15803d', bgcolor: '#dcfce7', borderColor: '#bbf7d0' };
        case 'RESERVED':
            return { label: 'Tạm giữ (RESERVED)', color: '#a16207', bgcolor: '#fef9c3', borderColor: '#fef08a' };
        case 'SOLD_OUT':
            return { label: 'Hết hàng (SOLD_OUT)', color: '#b91c1c', bgcolor: '#fee2e2', borderColor: '#fecaca' };
        case 'SOLD':
            return { label: 'Đã bán (SOLD)', color: '#0369a1', bgcolor: '#e0f2fe', borderColor: '#bae6fd' };
        case 'EXPIRED':
            return { label: 'Hết hạn (EXPIRED)', color: '#64748b', bgcolor: '#f1f5f9', borderColor: '#e2e8f0' };
        case 'CANCELLED':
            return { label: 'Đã hủy', color: '#b91c1c', bgcolor: '#fee2e2', borderColor: '#fecaca' };
        default:
            return { label: `Vé (${s})`, color: '#334155', bgcolor: '#f1f5f9', borderColor: '#cbd5e1' };
    }
};

const TicketStatusChip: React.FC<{ status?: string }> = ({ status }) => {
    const cfg = getTicketStatusConfig(status);
    return (
        <Chip
            label={cfg.label}
            size="small"
            variant="outlined"
            sx={{
                ml: 1,
                fontWeight: 700,
                fontSize: '0.75rem',
                height: 22,
                color: cfg.color,
                bgcolor: cfg.bgcolor,
                borderColor: cfg.borderColor
            }}
        />
    );
};

const getSerialStatusConfig = (status?: string, ticketCondition?: string | null) => {
    const condition = (ticketCondition || '').toUpperCase();
    if (condition === 'DAMAGED') {
        return { label: 'Hỏng (DAMAGED)', bgcolor: '#fee2e2', textColor: '#b91c1c', borderColor: '#fca5a5' };
    }
    if (condition === 'LOST') {
        return { label: 'Mất (LOST)', bgcolor: '#fee2e2', textColor: '#b91c1c', borderColor: '#fca5a5' };
    }
    if (condition === 'VOIDED') {
        return { label: 'Hủy (VOIDED)', bgcolor: '#fee2e2', textColor: '#b91c1c', borderColor: '#fca5a5' };
    }
    const s = (status || '').toUpperCase().replace(/-/g, '_');
    switch (s) {
        case 'IN_STOCK':
            return { label: 'Trong kho (IN_STOCK)', bgcolor: '#dcfce7', textColor: '#15803d', borderColor: '#86efac' };
        case 'RESERVED':
            return { label: 'Tạm giữ (RESERVED)', bgcolor: '#fef9c3', textColor: '#a16207', borderColor: '#fde047' };
        case 'PROXY_HOLDING':
            return { label: 'Đại lý giữ hộ (PROXY_HOLDING)', bgcolor: '#fef9c3', textColor: '#a16207', borderColor: '#fde047' };
        case 'SOLD':
            return { label: 'Đã bán (SOLD)', bgcolor: '#e0f2fe', textColor: '#0369a1', borderColor: '#7dd3fc' };
        case 'EXPIRED':
            return { label: 'Hết hạn (EXPIRED)', bgcolor: '#f1f5f9', textColor: '#64748b', borderColor: '#cbd5e1' };
        default:
            return { label: status || 'Chưa xác định', bgcolor: '#f1f5f9', textColor: '#64748b', borderColor: '#cbd5e1' };
    }
};

const SerialStatusChip: React.FC<{ status?: string; ticketCondition?: string | null }> = ({ status, ticketCondition }) => {
    const config = getSerialStatusConfig(status, ticketCondition);
    return (
        <Chip 
            label={config.label} 
            size="small" 
            sx={{ 
                height: 20, 
                fontSize: '0.68rem', 
                fontWeight: 700, 
                bgcolor: config.bgcolor, 
                color: config.textColor, 
                border: `1px solid ${config.borderColor}` 
            }} 
        />
    );
};

export const ReportSerialFaultPane: React.FC<Props> = ({
    serials,
    ticketNumbers,
    ticketId,
    importBatchLineId,
    stationId,
    drawDate,
    defaultCancelMode = 'SERIAL',
    cancelButtonText,
    hideFaultedBySelector = false,
    beforeConfirm,
    onCancel,
    onSuccess
}) => {
    const [forms, setForms] = useState<Record<string | number, FormState>>({});
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [incompleteGroupsOpen, setIncompleteGroupsOpen] = useState(false);
    const [incompleteGroupNumbers, setIncompleteGroupNumbers] = useState<string[]>([]);
    const [ticketBatchEvidenceMode, setTicketBatchEvidenceMode] = useState<'ALL' | 'EACH' | null>(null);
    const [pendingEvidenceUrl, setPendingEvidenceUrl] = useState('');
    const [evidenceApplyDialogOpen, setEvidenceApplyDialogOpen] = useState(false);
    const [serialEvidenceUrls, setSerialEvidenceUrls] = useState<Record<string, string>>({});
    const [workflowStep, setWorkflowStep] = useState<'FORM' | 'REFUND'>('FORM');
    const [refundDraftByOrderId, setRefundDraftByOrderId] = useState<Record<string, RefundOrderDraft>>({});
    const [pendingSelectedItems, setPendingSelectedItems] = useState<MappedSubmitItem[]>([]);

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
                    ticketStatus: s.ticketStatus,
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
        setCancelMode(defaultCancelMode);
        const timer = setTimeout(() => {
            setIsPreparing(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [serials, defaultCancelMode]);

    useEffect(() => {
        if (activeGroupIndex >= groups.length && groups.length > 0) {
            setActiveGroupIndex(groups.length - 1);
        }
    }, [groups.length, activeGroupIndex]);

    const [cancelMode, setCancelMode] = useState<'TICKET' | 'SERIAL'>(defaultCancelMode);
    const [serialProcessingMode, setSerialProcessingMode] = useState<'EACH' | 'ALL'>('EACH');
    const [bulkForm, setBulkForm] = useState<FormState>({
        selected: true,
        status: 'DAMAGED',
        faultedBy: 'INTERNAL_FAULT',
        damagedReason: '',
        damagedEvidenceUrl: '',
        errors: {}
    });
    const [ticketForm, setTicketForm] = useState<FormState>({
        selected: true,
        status: 'DAMAGED',
        faultedBy: 'INTERNAL_FAULT',
        damagedReason: '',
        damagedEvidenceUrl: '',
        errors: {}
    });

    const handleTicketFormFieldChange = (field: keyof FormState, value: any) => {
        setTicketForm((prev) => {
            const updated = { ...prev, [field]: value };
            if (field === 'faultedBy' && value === 'DATA_ENTRY_FAULT') {
                updated.status = 'VOIDED';
            } else if (field === 'faultedBy' && value !== 'DATA_ENTRY_FAULT' && updated.status === 'VOIDED') {
                updated.status = 'DAMAGED';
            }
            if (field === 'status' || field === 'faultedBy' || field === 'damagedReason' || field === 'damagedEvidenceUrl') {
                if (updated.errors) {
                    delete updated.errors[field as keyof typeof updated.errors];
                }
            }
            return updated;
        });
    };

    const currentGroup = groups[activeGroupIndex] || groups[0];
    const currentSerials = currentGroup?.serials || [];
    const currentTicketNumbers = currentGroup?.ticketNumbers || ticketNumbers;
    const currentTicketId = currentGroup?.ticketId || ticketId;
    const currentTicketStatus = currentGroup?.ticketStatus || (currentSerials[0] as any)?.ticketStatus;
    const currentGroupSelectedSerials = currentSerials.filter(s => forms[s.id]?.selected);

    const isTicketBatchFaultFlow =
        cancelMode === 'TICKET' &&
        ticketForm.faultedBy === 'INTERNAL_FAULT' &&
        (ticketForm.status === 'DAMAGED' || ticketForm.status === 'LOST');

    const ticketBatchFaultProgressCount = React.useMemo(() => {
        if (!isTicketBatchFaultFlow || !ticketForm.damagedReason?.trim()) return 0;
        if (ticketForm.status === 'LOST') return currentSerials.length;
        if (ticketForm.status === 'DAMAGED') {
            if (ticketBatchEvidenceMode === 'ALL') {
                return ticketForm.damagedEvidenceUrl?.trim() ? currentSerials.length : 0;
            }
            if (ticketBatchEvidenceMode === 'EACH') {
                return currentSerials.filter((serial) => serialEvidenceUrls[String(serial.id)]?.trim()).length;
            }
            return 0;
        }
        return 0;
    }, [
        isTicketBatchFaultFlow,
        ticketForm.damagedReason,
        ticketForm.status,
        ticketForm.damagedEvidenceUrl,
        ticketBatchEvidenceMode,
        serialEvidenceUrls,
        currentSerials,
    ]);

    const isTicketBatchFaultFormComplete = React.useMemo(() => {
        return currentSerials.length > 0 && ticketBatchFaultProgressCount === currentSerials.length;
    }, [currentSerials.length, ticketBatchFaultProgressCount]);

    const ticketBatchFaultedByLabel =
        ticketForm.faultedBy === 'INTERNAL_FAULT'
            ? 'Nhân viên làm hỏng'
            : ticketForm.faultedBy === 'DATA_ENTRY_FAULT'
            ? 'Lỗi thao tác nhập liệu'
            : '—';

    const ticketBatchStatusLabel =
        ticketForm.status === 'DAMAGED'
            ? 'Hỏng vật lý (DAMAGED)'
            : ticketForm.status === 'LOST'
            ? 'Thất lạc / Mất (LOST)'
            : '—';

    const getTicketBatchSerialEvidenceUrl = (serialId: string | number): string => {
        if (ticketBatchEvidenceMode === 'ALL') return ticketForm.damagedEvidenceUrl || '';
        return serialEvidenceUrls[String(serialId)] || '';
    };

    const ticketEvidenceUploadValue =
        isTicketBatchFaultFlow && ticketForm.status === 'DAMAGED'
            ? ticketBatchEvidenceMode === 'ALL'
                ? ticketForm.damagedEvidenceUrl
                : evidenceApplyDialogOpen
                ? pendingEvidenceUrl
                : ''
            : ticketForm.damagedEvidenceUrl;

    useEffect(() => {
        setTicketBatchEvidenceMode(null);
        setSerialEvidenceUrls({});
        setPendingEvidenceUrl('');
        setEvidenceApplyDialogOpen(false);
        setWorkflowStep('FORM');
        setRefundDraftByOrderId({});
        setPendingSelectedItems([]);
    }, [currentTicketId, activeGroupIndex, serials]);

    useEffect(() => {
        if (!isTicketBatchFaultFlow || ticketForm.status !== 'DAMAGED') {
            setTicketBatchEvidenceMode(null);
            setSerialEvidenceUrls({});
            setPendingEvidenceUrl('');
            setEvidenceApplyDialogOpen(false);
        }
    }, [isTicketBatchFaultFlow, ticketForm.status]);

    const handleTicketEvidenceUpload = (url: string) => {
        if (isTicketBatchFaultFlow && ticketForm.status === 'DAMAGED') {
            if (!url) {
                if (ticketBatchEvidenceMode === 'ALL') {
                    handleTicketFormFieldChange('damagedEvidenceUrl', '');
                    setSerialEvidenceUrls({});
                }
                setTicketBatchEvidenceMode(null);
                setPendingEvidenceUrl('');
                return;
            }
            setPendingEvidenceUrl(url);
            setEvidenceApplyDialogOpen(true);
            return;
        }
        handleTicketFormFieldChange('damagedEvidenceUrl', url);
    };

    const handleEvidenceApplyYes = () => {
        const url = pendingEvidenceUrl;
        setTicketBatchEvidenceMode('ALL');
        handleTicketFormFieldChange('damagedEvidenceUrl', url);
        const nextUrls: Record<string, string> = {};
        currentSerials.forEach((serial) => {
            nextUrls[String(serial.id)] = url;
        });
        setSerialEvidenceUrls(nextUrls);
        setPendingEvidenceUrl('');
        setEvidenceApplyDialogOpen(false);
    };

    const handleEvidenceApplyNo = () => {
        setTicketBatchEvidenceMode('EACH');
        handleTicketFormFieldChange('damagedEvidenceUrl', '');
        setSerialEvidenceUrls({});
        setPendingEvidenceUrl('');
        setEvidenceApplyDialogOpen(false);
    };

    const handleSerialEvidenceChange = (serialId: string | number, url: string) => {
        setSerialEvidenceUrls((prev) => ({
            ...prev,
            [String(serialId)]: url,
        }));
    };

    const mapSerialsToSelectedItems = (targetSerials: SerialItem[]): MappedSubmitItem[] =>
        targetSerials.map((sItem) => {
            const formState = cancelMode === 'TICKET' ? ticketForm : forms[sItem.id];
            let damagedEvidenceUrl = formState.damagedEvidenceUrl;
            if (
                cancelMode === 'TICKET' &&
                isTicketBatchFaultFlow &&
                ticketForm.status === 'DAMAGED'
            ) {
                damagedEvidenceUrl =
                    ticketBatchEvidenceMode === 'EACH'
                        ? serialEvidenceUrls[String(sItem.id)] || ''
                        : ticketForm.damagedEvidenceUrl;
            }
            return {
                id: Number(sItem.id),
                ticketId: sItem.ticketId || ticketId,
                ticketNumbers: sItem.ticketNumbers || ticketNumbers,
                originalStatus: sItem.status || '',
                reservedByOrderId: sItem.reservedByOrderId,
                serialNumber: sItem.serialNumber,
                ...formState,
                damagedEvidenceUrl,
            };
        });

    const getTargetSerialsForSubmit = (): SerialItem[] =>
        cancelMode === 'TICKET'
            ? currentSerials
            : serialProcessingMode === 'ALL'
            ? currentGroupSelectedSerials
            : serials.filter((s) => forms[s.id]?.selected);

    const initializeRefundDrafts = (activeSerials: SerialItem[], selectedItems: MappedSubmitItem[]) => {
        const grouped = groupSerialsByOrderId(activeSerials);
        const drafts: Record<string, RefundOrderDraft> = {};
        Object.entries(grouped).forEach(([orderId, orderSerials]) => {
            const incidents = orderSerials.map((serial) => {
                const item = selectedItems.find((entry) => entry.id === Number(serial.id));
                const reason = item?.status === 'LOST' ? 'LOST' : 'DAMAGED';
                return {
                    orderDetailId: 0,
                    serialId: Number(serial.id),
                    serialNumber: serial.serialNumber,
                    ticketNumbers: serial.ticketNumbers,
                    reason: reason as 'DAMAGED' | 'LOST',
                    damagedReason: item?.damagedReason,
                    damagedEvidenceUrl: item?.damagedEvidenceUrl || undefined,
                };
            });
            drafts[orderId] = {
                cancelReason: ORDER_CANCEL_REASON_DEFAULTS.OUT_OF_STOCK_INCIDENT,
                incidents,
            };
        });
        setRefundDraftByOrderId(drafts);
    };

    const resolveReplacementSerialScopeIds = (
        formsState: Record<string | number, FormState>,
        scopeSerials: SerialItem[] = currentSerials
    ): Array<string | number> => {
        const isTicketSerialReplacement =
            cancelMode === 'TICKET' &&
            replacementType === 'SERIALS' &&
            (ticketForm.status === 'VOIDED' || ticketForm.faultedBy === 'DATA_ENTRY_FAULT');

        if (isTicketSerialReplacement) {
            return scopeSerials.filter((s) => formsState[s.id]?.selected).map((s) => s.id);
        }

        if (
            serialProcessingMode === 'ALL' &&
            bulkForm.faultedBy === 'DATA_ENTRY_FAULT' &&
            bulkForm.status === 'VOIDED' &&
            replacementType === 'SERIALS'
        ) {
            return scopeSerials.filter((s) => formsState[s.id]?.selected).map((s) => s.id);
        }

        return scopeSerials
            .filter((s) => formsState[s.id]?.selected && formsState[s.id]?.status === 'VOIDED')
            .map((s) => s.id);
    };

    const isBulkVoidedReplacementScope =
        serialProcessingMode === 'ALL' &&
        bulkForm.faultedBy === 'DATA_ENTRY_FAULT' &&
        bulkForm.status === 'VOIDED' &&
        replacementType === 'SERIALS';

    useEffect(() => {
        if (cancelMode === 'SERIAL' || !currentTicketId) {
            setReplacementType('SERIALS');
        } else {
            setReplacementType('DIGITS');
        }
    }, [cancelMode, currentTicketId]);

    const handleBulkFieldChange = (field: keyof FormState, value: any) => {
        const updatedValue = field === 'replacementNumbers' ? value.replace(/\D/g, '') : value;
        setBulkForm((prev) => {
            const updated = { ...prev, [field]: updatedValue };
            if (field === 'faultedBy' && value === 'DATA_ENTRY_FAULT') {
                updated.status = 'VOIDED';
            } else if (field === 'faultedBy' && value !== 'DATA_ENTRY_FAULT' && updated.status === 'VOIDED') {
                updated.status = 'DAMAGED';
            }
            if (field === 'status' || field === 'faultedBy' || field === 'damagedReason' || field === 'damagedEvidenceUrl') {
                if (updated.errors) {
                    delete updated.errors[field as keyof typeof updated.errors];
                }
            }
            return updated;
        });

        setForms((prev) => {
            const next = { ...prev };
            currentGroupSelectedSerials.forEach((s) => {
                if (next[s.id]) {
                    const itemUpdated = {
                        ...next[s.id],
                        [field]: updatedValue
                    };
                    if (field === 'faultedBy' && value === 'DATA_ENTRY_FAULT') {
                        itemUpdated.status = 'VOIDED';
                    } else if (field === 'faultedBy' && value !== 'DATA_ENTRY_FAULT' && itemUpdated.status === 'VOIDED') {
                        itemUpdated.status = 'DAMAGED';
                    }
                    if (field === 'status' || field === 'faultedBy' || field === 'damagedReason' || field === 'damagedEvidenceUrl') {
                        if (itemUpdated.errors) {
                            delete itemUpdated.errors[field as keyof typeof itemUpdated.errors];
                        }
                    }
                    next[s.id] = itemUpdated;
                }
            });
            const scopeIds = resolveReplacementSerialScopeIds(next);
            return applyReplacementSerialDuplicateErrors(next, scopeIds);
        });
    };

    const selectedCount = Object.keys(forms).filter(id => forms[id].selected).length;
    const hasVoided = cancelMode === 'TICKET'
        ? (ticketForm.status === 'VOIDED' || ticketForm.faultedBy === 'DATA_ENTRY_FAULT')
        : isBulkVoidedReplacementScope
        ? currentGroupSelectedSerials.length > 0
        : Object.keys(forms).some(id => forms[id].selected && forms[id].status === 'VOIDED');



    useEffect(() => {
        if (serials) {
            const initialForms: Record<string | number, FormState> = {};
            serials.forEach((s) => {
                const incidentEligible = isSerialIncidentEligible(s);
                initialForms[s.id] = {
                    selected: incidentEligible,
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
                [field]: field === 'replacementNumbers'
                    ? value.replace(/\D/g, '')
                    : field === 'replacementSerial'
                    ? String(value).trim()
                    : value
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

            if (field === 'replacementSerial' && updatedForm.errors?.replacementSerial) {
                delete updatedForm.errors.replacementSerial;
            }

            let next = {
                ...prev,
                [id]: updatedForm
            };

            if (field === 'replacementSerial' || field === 'status' || field === 'faultedBy' || field === 'selected') {
                const scopeIds = resolveReplacementSerialScopeIds(next);
                next = applyReplacementSerialDuplicateErrors(next, scopeIds);
            }

            return next;
        });
    };

    const canSubmit = cancelMode === 'TICKET'
        ? (isTicketBatchFaultFlow
            ? isTicketBatchFaultFormComplete
            : ticketForm.status === 'VOIDED' && replacementType === 'DIGITS'
            ? !!replacementDigits && replacementDigits.length === 6
            : ticketForm.status === 'VOIDED' && replacementType === 'SERIALS'
            ? resolveReplacementSerialScopeIds(forms, currentSerials).every((scopeId) => {
                const form = forms[scopeId];
                return !!form?.replacementSerial?.trim() && !form?.errors.replacementSerial;
            })
            : true)
        : isBulkVoidedReplacementScope
        ? resolveReplacementSerialScopeIds(forms).every((scopeId) => {
            const form = forms[scopeId];
            return !!form?.replacementSerial?.trim() && !form?.errors?.replacementSerial;
        })
        : selectedCount > 0 && Object.keys(forms).every(id => {
            const form = forms[id];
            if (!form.selected) return true;
            if (form.status === 'VOIDED') {
                if (replacementType === 'DIGITS') {
                    return !!replacementDigits && replacementDigits.length === 6;
                }
                return !!form.replacementSerial?.trim() && !form.errors.replacementSerial;
            }
            return true;
        });

    const confirmButtonVisible =
        cancelMode !== 'TICKET' || isTicketBatchFaultFlow || canSubmit;
    const confirmButtonDisabled = submitting || !canSubmit;

    const isSerialFormFilled = (form: FormState | undefined): boolean => {
        if (!form?.selected) return false;
        if (form.status === 'DAMAGED' || form.status === 'LOST' || form.status === 'VOIDED') {
            if (!form.damagedReason?.trim()) return false;
            if (
                form.status === 'DAMAGED' &&
                form.faultedBy === 'INTERNAL_FAULT' &&
                !form.damagedEvidenceUrl?.trim()
            ) {
                return false;
            }
        }
        if ((form.status === 'VOIDED' || isBulkVoidedReplacementScope) && replacementType === 'SERIALS') {
            if (!form.replacementSerial?.trim()) return false;
        }
        return true;
    };

    const isTicketGroupFormFilled = (group: TicketGroup, groupIndex: number): boolean => {
        if (cancelMode === 'TICKET') {
            if (groupIndex !== activeGroupIndex) return false;
            if (ticketForm.status === 'DAMAGED' || ticketForm.status === 'LOST' || ticketForm.status === 'VOIDED') {
                if (!ticketForm.damagedReason?.trim()) return false;
                if (ticketForm.status === 'DAMAGED' && ticketForm.faultedBy === 'INTERNAL_FAULT') {
                    if (isTicketBatchFaultFlow && ticketBatchEvidenceMode === 'EACH') {
                        return group.serials.every((serial) => serialEvidenceUrls[String(serial.id)]?.trim());
                    }
                    if (!ticketForm.damagedEvidenceUrl?.trim()) return false;
                }
            }
            return true;
        }

        const selected = group.serials.filter((s) => forms[s.id]?.selected);
        if (selected.length === 0) return true;
        return selected.every((s) => isSerialFormFilled(forms[s.id]));
    };

    const getIncompleteTicketGroups = (): TicketGroup[] => {
        if (groups.length <= 1) return [];
        return groups.filter((group, index) => !isTicketGroupFormFilled(group, index));
    };

    const getCompleteSelectedSerials = (): SerialItem[] => {
        if (cancelMode === 'TICKET') {
            if (!currentGroup || !isTicketGroupFormFilled(currentGroup, activeGroupIndex)) {
                return [];
            }
            return currentSerials;
        }
        return serials.filter((s) => isSerialFormFilled(forms[s.id]));
    };

    const validateForms = (overrideTargets?: SerialItem[]): boolean => {
        let isValid = true;

        if (cancelMode === 'TICKET') {
            const ticketErrors: FormState['errors'] = {};
            if (ticketForm.status === 'DAMAGED' || ticketForm.status === 'LOST' || ticketForm.status === 'VOIDED') {
                if (!ticketForm.damagedReason?.trim()) {
                    ticketErrors.damagedReason = 'Vui lòng chọn hoặc nhập lý do chi tiết.';
                    isValid = false;
                }
                if (ticketForm.status === 'DAMAGED' && ticketForm.faultedBy === 'INTERNAL_FAULT') {
                    if (isTicketBatchFaultFlow && ticketBatchEvidenceMode === 'EACH') {
                        const missingEvidence = currentSerials.some(
                            (serial) => !serialEvidenceUrls[String(serial.id)]?.trim()
                        );
                        if (missingEvidence) {
                            ticketErrors.damagedEvidenceUrl = 'Vui lòng tải ảnh minh chứng cho tất cả sê-ri.';
                            isValid = false;
                        }
                    } else if (!ticketForm.damagedEvidenceUrl?.trim()) {
                        ticketErrors.damagedEvidenceUrl = 'Ảnh minh chứng sự cố không được để trống.';
                        isValid = false;
                    }
                }
            }
            setTicketForm(prev => ({ ...prev, errors: ticketErrors }));

            if (!isValid) return false;

            if (ticketForm.status === 'VOIDED' && replacementType === 'SERIALS') {
                const newForms = { ...forms };
                const scopeIds = resolveReplacementSerialScopeIds(newForms, currentSerials);

                scopeIds.forEach((scopeId) => {
                    const form = newForms[scopeId];
                    if (!form) return;

                    const errors = { ...form.errors };
                    if (!form.replacementSerial?.trim()) {
                        errors.replacementSerial = 'Số sê-ri thay thế không được để trống.';
                        isValid = false;
                    }

                    newForms[scopeId] = { ...form, errors };
                });

                const formsWithDuplicateCheck = applyReplacementSerialDuplicateErrors(newForms, scopeIds);
                scopeIds.forEach((scopeId) => {
                    if (formsWithDuplicateCheck[scopeId]?.errors?.replacementSerial) {
                        isValid = false;
                    }
                });
                setForms(formsWithDuplicateCheck);
            }

            return isValid;
        }

        const targetSerials =
            overrideTargets ??
            (serialProcessingMode === 'ALL'
                ? currentGroupSelectedSerials
                : serials.filter((s) => forms[s.id]?.selected));

        if (serialProcessingMode === 'ALL' && !overrideTargets) {
            const bulkErrors: FormState['errors'] = {};
            if (bulkForm.status === 'DAMAGED' || bulkForm.status === 'LOST' || bulkForm.status === 'VOIDED') {
                if (!bulkForm.damagedReason?.trim()) {
                    bulkErrors.damagedReason = 'Vui lòng chọn hoặc nhập lý do chi tiết.';
                    isValid = false;
                }
                if (bulkForm.status === 'DAMAGED' && bulkForm.faultedBy === 'INTERNAL_FAULT' && !bulkForm.damagedEvidenceUrl?.trim()) {
                    bulkErrors.damagedEvidenceUrl = 'Ảnh minh chứng sự cố không được để trống.';
                    isValid = false;
                }
            }
            setBulkForm(prev => ({ ...prev, errors: bulkErrors }));

            if (!isValid) return false;
        }

        const newForms = { ...forms };

        targetSerials.forEach((s) => {
            const id = s.id;
            const form = newForms[id];
            if (!form || !form.selected) return;

            const errors: FormState['errors'] = {};

            if (form.status === 'DAMAGED' || form.status === 'LOST' || form.status === 'VOIDED') {
                if (!form.damagedReason?.trim()) {
                    errors.damagedReason = 'Vui lòng chọn hoặc nhập lý do chi tiết.';
                    isValid = false;
                }
                if (form.status === 'DAMAGED' && form.faultedBy === 'INTERNAL_FAULT' && !form.damagedEvidenceUrl?.trim()) {
                    errors.damagedEvidenceUrl = 'Ảnh minh chứng sự cố không được để trống.';
                    isValid = false;
                }
            }

            if ((form.status === 'VOIDED' || isBulkVoidedReplacementScope) && replacementType === 'SERIALS') {
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

        const voidedScopeIds = resolveReplacementSerialScopeIds(newForms, targetSerials);
        const formsWithDuplicateCheck = applyReplacementSerialDuplicateErrors(newForms, voidedScopeIds);

        voidedScopeIds.forEach((scopeId) => {
            if (formsWithDuplicateCheck[scopeId]?.errors?.replacementSerial === DUPLICATE_REPLACEMENT_SERIAL_MESSAGE) {
                isValid = false;
            }
        });

        setForms(formsWithDuplicateCheck);
        return isValid;
    };

    const proceedPreSubmit = (targetSerials: SerialItem[]) => {
        const selectedItems = mapSerialsToSelectedItems(targetSerials);

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

        if (!validateForms(targetSerials)) {
            AppToast.error(
                hasDuplicateReplacementSerialErrors(forms)
                    ? DUPLICATE_REPLACEMENT_SERIAL_MESSAGE
                    : 'Vui lòng kiểm tra lại thông tin nhập liệu.'
            );
            return;
        }

        setPendingSelectedItems(selectedItems);

        if (
            needsRefundPrepStep(cancelMode, targetSerials, ticketForm.faultedBy) &&
            !selectedItems.some((item) => item.status === 'VOIDED')
        ) {
            const activeSerials = getActiveTransactionSerials(targetSerials);
            const missingOrderLink = activeSerials.filter((serial) => !serial.reservedByOrderId);
            if (missingOrderLink.length > 0) {
                AppToast.error('Không tìm thấy đơn hàng liên kết với một số sê-ri đang giao dịch.');
                return;
            }
            initializeRefundDrafts(activeSerials, selectedItems);
            setWorkflowStep('REFUND');
            return;
        }

        setRefundDraftByOrderId({});
        if (beforeConfirm && !beforeConfirm()) {
            return;
        }
        setConfirmOpen(true);
    };

    const handlePreSubmit = () => {
        const incompleteGroups = getIncompleteTicketGroups();
        if (incompleteGroups.length > 0) {
            setIncompleteGroupNumbers(incompleteGroups.map((group) => group.ticketNumbers));
            setIncompleteGroupsOpen(true);
            return;
        }

        proceedPreSubmit(getTargetSerialsForSubmit());
    };

    const handleIncompleteGroupsConfirm = () => {
        setIncompleteGroupsOpen(false);
        const completeSerials = getCompleteSelectedSerials();
        if (completeSerials.length === 0) {
            AppToast.error('Chưa có dãy nào được nhập đủ thông tin để xác nhận.');
            return;
        }
        proceedPreSubmit(completeSerials);
    };

    const handleRefundStepContinue = () => {
        const invalidOrder = Object.entries(refundDraftByOrderId).find(([, draft]) => {
            if (draft.incidents.length === 0) return true;
            if (draft.incidents.some((inc) => !inc.orderDetailId)) return true;
            const needsRefundReason =
                !!draft.canFullOrderCancel || Number(draft.refundAmount || 0) > 0;
            if (needsRefundReason && !draft.cancelReason?.trim()) return true;
            return false;
        });
        if (invalidOrder) {
            const draft = invalidOrder[1];
            AppToast.error(
                draft?.canFullOrderCancel
                    ? 'Vui lòng nhập lý do hủy/hoàn tiền và đảm bảo tất cả sê-ri đã map với đơn hàng.'
                    : Number(draft?.refundAmount || 0) > 0
                      ? 'Vui lòng nhập lý do hoàn tiền cho các vé sự cố và đảm bảo tất cả sê-ri đã map với đơn hàng.'
                      : 'Vui lòng đảm bảo tất cả sê-ri sự cố đã map với đơn hàng.'
            );
            return;
        }
        if (beforeConfirm && !beforeConfirm()) {
            return;
        }
        setConfirmOpen(true);
    };

    const reportSerialFaultItem = async (item: MappedSubmitItem) => {
        await reportTicketSerialFault(
            item.id,
            buildReportSerialFaultPayload({
                faultKind: item.status,
                faultedBy: item.faultedBy,
                damagedReason: item.damagedReason,
                damagedEvidenceUrl: item.damagedEvidenceUrl || undefined,
                replacementSerialNumber:
                    item.status === 'VOIDED' && replacementType === 'SERIALS'
                        ? item.replacementSerial?.trim() || undefined
                        : undefined,
                replacementTicketImg:
                    item.status === 'VOIDED' && replacementType === 'SERIALS'
                        ? item.replacementTicketImg || undefined
                        : undefined,
            })
        );
    };

    const handleConfirmSubmit = async () => {
        if (beforeConfirm && !beforeConfirm()) {
            setConfirmOpen(false);
            return;
        }
        setConfirmOpen(false);
        const selectedItems = pendingSelectedItems.length > 0
            ? pendingSelectedItems
            : mapSerialsToSelectedItems(getTargetSerialsForSubmit());

        setSubmitting(true);
        try {
            const hasVoidedItems = selectedItems.some(item => item.status === 'VOIDED');
            if (hasVoidedItems && replacementType === 'DIGITS') {
                const targetTicketId = currentTicketId || ticketId;
                if (targetTicketId) {
                    await replaceTicketDigits(targetTicketId, {
                        newNumbers: replacementDigits.trim(),
                        newTicketImg: replacementDigitsImg || undefined
                    });
                }

                const nonDigitVoidedItems = selectedItems.filter(item => item.status !== 'VOIDED');
                for (const item of nonDigitVoidedItems) {
                    await reportSerialFaultItem(item);
                }
            } else {
                const activeItems = selectedItems.filter((item) =>
                    isActiveTransactionSerialStatus(item.originalStatus)
                );
                const inventoryItems = selectedItems.filter(
                    (item) => !isActiveTransactionSerialStatus(item.originalStatus)
                );

                const handledOrderIds = new Set<string>();

                for (const [orderId, draft] of Object.entries(refundDraftByOrderId)) {
                    const itemsForOrder = activeItems.filter(
                        (item) => String(item.reservedByOrderId) === orderId
                    );
                    if (itemsForOrder.length === 0) continue;

                    const orderStatus = draft.orderStatus;
                    const isRefundableStatus =
                        orderStatus === OrderStatus.PREPARING ||
                        orderStatus === 'PREPARING' ||
                        orderStatus === OrderStatus.PENDING_PICKUP ||
                        orderStatus === 'PENDING_PICKUP';

                    const mappedIncidents = dedupeIncidentsByOrderDetailId(draft.incidents).map((inc) => ({
                        orderDetailId: inc.orderDetailId,
                        reason: inc.reason,
                        damagedReason: inc.damagedReason,
                        damagedEvidenceUrl: inc.damagedEvidenceUrl,
                    }));

                    if (draft.canFullOrderCancel && isRefundableStatus) {
                        await refundAdminApi.cancelOrderWithRefund(orderId, {
                            cancelType: 'OUT_OF_STOCK_INCIDENT',
                            cancelReason: draft.cancelReason.trim(),
                            incidents: mappedIncidents,
                        });
                        handledOrderIds.add(orderId);
                        continue;
                    }

                    // Partial path: create ORDER_DETAIL refund for faulted tickets only — do not cancel order.
                    if (
                        isRefundableStatus &&
                        Number(draft.refundAmount || 0) > 0 &&
                        mappedIncidents.length > 0
                    ) {
                        await createPartialRefund(orderId, {
                            incidents: mappedIncidents,
                            refundReason:
                                draft.cancelReason?.trim() ||
                                ORDER_CANCEL_REASON_DEFAULTS.OUT_OF_STOCK_INCIDENT,
                        });
                        handledOrderIds.add(orderId);
                    }
                }

                const remainingActive = activeItems.filter(
                    (item) => !handledOrderIds.has(String(item.reservedByOrderId || ''))
                );

                // Unpaid / inventory-only / already-handled leftovers: report serial fault only.
                // Backend cancels the order only when the serial is the last active one.
                for (const item of remainingActive) {
                    await reportSerialFaultItem(item);
                }

                for (const item of inventoryItems) {
                    await reportSerialFaultItem(item);
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

    const voidedSerialScopeIds = resolveReplacementSerialScopeIds(forms, currentSerials);
    const voidedSerials = currentSerials.filter((s) => voidedSerialScopeIds.includes(s.id));
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
                                <TicketStatusChip status={currentTicketStatus} />
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
                {workflowStep === 'REFUND' ? (
                    <TicketIncidentRefundStep
                        incidentItems={getActiveTransactionSerials(getTargetSerialsForSubmit()).map((serial) => {
                            const item = pendingSelectedItems.find((entry) => entry.id === Number(serial.id));
                            return {
                                id: Number(serial.id),
                                serialNumber: serial.serialNumber,
                                ticketNumbers: serial.ticketNumbers,
                                status: (item?.status === 'LOST' ? 'LOST' : 'DAMAGED') as 'DAMAGED' | 'LOST',
                                damagedReason: item?.damagedReason,
                                damagedEvidenceUrl: item?.damagedEvidenceUrl,
                                reservedByOrderId: serial.reservedByOrderId,
                            };
                        })}
                        refundDraftByOrderId={refundDraftByOrderId}
                        onRefundDraftChange={(orderId, patch) =>
                            setRefundDraftByOrderId((prev) => ({
                                ...prev,
                                [orderId]: { ...prev[orderId], ...patch },
                            }))
                        }
                        onSyncOrderDrafts={(drafts) => setRefundDraftByOrderId(drafts)}
                    />
                ) : (
                <>
                {/* Top Cancel Mode Toggle: Hủy dãy số vé vs Hủy số serial vé */}
                <ToggleButtonGroup
                    value={cancelMode}
                    exclusive
                    onChange={(e, val) => { if (val) setCancelMode(val); }}
                    size="small"
                    fullWidth
                    sx={{
                        mb: 2.5,
                        bgcolor: '#f1f5f9',
                        p: 0.5,
                        borderRadius: '12px',
                        border: 'none',
                        '& .MuiToggleButtonGroup-grouped': {
                            border: 'none',
                            borderRadius: '10px !important',
                        }
                    }}
                >
                    <ToggleButton 
                        value="TICKET" 
                        sx={{ 
                            fontWeight: 700, 
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            py: 1,
                            color: '#64748b',
                            '&.Mui-selected': {
                                bgcolor: '#fff',
                                color: '#ef4444',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }
                        }}
                    >
                        Hủy dãy số vé
                    </ToggleButton>
                    <ToggleButton 
                        value="SERIAL" 
                        sx={{ 
                            fontWeight: 700, 
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            py: 1,
                            color: '#64748b',
                            '&.Mui-selected': {
                                bgcolor: '#ef4444',
                                color: '#fff',
                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                            }
                        }}
                    >
                        Hủy số serial vé
                    </ToggleButton>
                </ToggleButtonGroup>

                {/* Group (Ticket Numbers) Switcher Header - Shown for both modes */}
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
                                    label={`Dãy ${g.ticketNumbers}${g.ticketId ? ` (${g.serials.length})` : ''}`}
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
                            Hiển thị sê-ri cho dãy số {currentTicketNumbers}{currentTicketId ? ` (Vé #${currentTicketId})` : ''} ({currentSerials.length} sê-ri vật lý)
                        </Typography>
                    </Stack>
                )}

                {cancelMode === 'TICKET' ? (
                    <Box sx={{ p: 2.5, border: '2px solid #ef4444', borderRadius: '14px', bgcolor: '#fff', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.05)', mb: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={850} color="#ef4444" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LayersIcon sx={{ fontSize: '18px' }} />
                                Báo cáo hủy cho toàn bộ vé số {currentTicketNumbers} <TicketStatusChip status={currentTicketStatus} />
                            </Typography>
                            <Chip 
                                label="Hủy vé số" 
                                size="small" 
                                sx={{ fontWeight: 800, height: 22, color: '#ef4444', borderColor: '#fecaca', bgcolor: '#fef2f2' }} 
                            />
                        </Stack>

                        <Stack spacing={2}>
                            {/* Nguyên nhân sự cố */}
                            {!hideFaultedBySelector && (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                        Nguyên nhân sự cố
                                    </Typography>
                                    <ToggleButtonGroup
                                        value={ticketForm.faultedBy}
                                        exclusive
                                        onChange={(e, val) => { if (val) handleTicketFormFieldChange('faultedBy', val); }}
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
                                        <ToggleButton value="INTERNAL_FAULT" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                                            Nhân viên làm hỏng
                                        </ToggleButton>
                                        <ToggleButton value="DATA_ENTRY_FAULT" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                                            Lỗi thao tác nhập liệu
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                            )}

                            {/* Trạng thái báo hủy */}
                            <Box>
                                <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                    Trạng thái báo hủy
                                </Typography>
                                <ToggleButtonGroup
                                    value={ticketForm.status}
                                    exclusive
                                    onChange={(e, val) => { if (val) handleTicketFormFieldChange('status', val); }}
                                    size="small"
                                    fullWidth
                                    disabled={ticketForm.faultedBy === 'DATA_ENTRY_FAULT'}
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
                                    {ticketForm.faultedBy === 'DATA_ENTRY_FAULT' ? (
                                        <ToggleButton value="VOIDED" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#ef4444', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                                            Hủy do lỗi nhập liệu (VOIDED)
                                        </ToggleButton>
                                    ) : (
                                        [
                                            <ToggleButton key="DAMAGED" value="DAMAGED" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                                                Hỏng vật lý (DAMAGED)
                                            </ToggleButton>,
                                            <ToggleButton key="LOST" value="LOST" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
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
                                    required={ticketForm.status === 'LOST' || ticketForm.status === 'VOIDED' || (ticketForm.faultedBy === 'INTERNAL_FAULT' && ticketForm.status === 'DAMAGED')}
                                    value={ticketForm.damagedReason}
                                    onChange={(e) => handleTicketFormFieldChange('damagedReason', e.target.value)}
                                    error={!!ticketForm.errors.damagedReason}
                                    helperText={ticketForm.errors.damagedReason}
                                    placeholder="Nhập lý do chi tiết..."
                                    InputProps={{ sx: { borderRadius: '10px' } }}
                                />
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                                    {ticketForm.faultedBy === 'INTERNAL_FAULT' ? (
                                        ['Lỡ tay làm rách vé', 'Vé bị dính nước/bẩn', 'Mất vé khi kiểm kho'].map((sug) => (
                                            <Chip
                                                key={sug}
                                                label={sug}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleTicketFormFieldChange('damagedReason', sug)}
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
                                                onClick={() => handleTicketFormFieldChange('damagedReason', sug)}
                                                sx={{ borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                            />
                                        ))
                                    )}
                                </Box>
                            </Box>
                            {/* Link ảnh minh chứng */}
                            {ticketForm.status === 'DAMAGED' && (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                        Ảnh minh chứng {ticketForm.faultedBy === 'INTERNAL_FAULT' && <strong style={{ color: '#ef4444' }}>*</strong>}
                                    </Typography>
                                    {isTicketBatchFaultFlow && ticketBatchEvidenceMode === 'EACH' ? (
                                        <Typography variant="body2" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                            Vui lòng tải ảnh minh chứng cho từng sê-ri trong bảng bên dưới.
                                        </Typography>
                                    ) : (
                                        <UploadSingleFile
                                            value={ticketEvidenceUploadValue}
                                            onChange={handleTicketEvidenceUpload}
                                            autoUpload={true}
                                            compact={true}
                                            error={ticketForm.errors.damagedEvidenceUrl}
                                        />
                                    )}
                                </Box>
                            )}
                            {isTicketBatchFaultFlow && (
                                <Box sx={{ mt: 1, p: 1.5, border: '1px solid #fee2e2', borderRadius: '10px', bgcolor: 'rgba(239, 68, 68, 0.03)' }}>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                        Tiến độ báo sự cố sê-ri ({ticketBatchFaultProgressCount}/{currentSerials.length})
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                                        Sê-ri sẽ được báo sự cố khi xác nhận:
                                    </Typography>
                                    <TableContainer sx={{ bgcolor: '#fff', borderRadius: '8px', border: '1px solid #fecaca', maxHeight: 280 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1, bgcolor: '#fef2f2' }}>Sê-ri</TableCell>
                                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1, bgcolor: '#fef2f2' }}>Nguyên nhân sự cố</TableCell>
                                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1, bgcolor: '#fef2f2' }}>Trạng thái báo hủy</TableCell>
                                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1, bgcolor: '#fef2f2' }}>Lý do chi tiết</TableCell>
                                                    {ticketForm.status === 'DAMAGED' && (
                                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1, bgcolor: '#fef2f2' }}>Ảnh minh chứng</TableCell>
                                                    )}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {currentSerials.map((serial) => (
                                                    <TableRow key={serial.id} hover>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 0.75, whiteSpace: 'nowrap' }}>
                                                            {serial.serialNumber}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', py: 0.75, color: ticketForm.faultedBy ? '#334155' : '#94a3b8' }}>
                                                            {ticketForm.faultedBy ? ticketBatchFaultedByLabel : '—'}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', py: 0.75, color: ticketForm.status ? '#334155' : '#94a3b8' }}>
                                                            {ticketForm.status ? ticketBatchStatusLabel : '—'}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', py: 0.75, color: ticketForm.damagedReason?.trim() ? '#334155' : '#94a3b8', maxWidth: 160 }}>
                                                            {ticketForm.damagedReason?.trim() || '—'}
                                                        </TableCell>
                                                        {ticketForm.status === 'DAMAGED' && (
                                                            <TableCell sx={{ py: 0.75, minWidth: 120 }}>
                                                                {ticketBatchEvidenceMode === 'EACH' ? (
                                                                    <UploadSingleFile
                                                                        value={serialEvidenceUrls[String(serial.id)] || ''}
                                                                        onChange={(url) => handleSerialEvidenceChange(serial.id, url)}
                                                                        autoUpload={true}
                                                                        compact={true}
                                                                    />
                                                                ) : getTicketBatchSerialEvidenceUrl(serial.id) ? (
                                                                    <Box
                                                                        component="img"
                                                                        src={getTicketBatchSerialEvidenceUrl(serial.id)}
                                                                        alt="Ảnh minh chứng"
                                                                        sx={{ width: 40, height: 40, borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                                                    />
                                                                ) : (
                                                                    <Typography variant="caption" color="#94a3b8">—</Typography>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                            {/* Inline replacement inputs for VOIDED status in TICKET mode */}
                            {ticketForm.status === 'VOIDED' && (
                                <Box sx={{ mt: 1, p: 1.5, border: '1px solid #fee2e2', borderRadius: '10px', bgcolor: 'rgba(239, 68, 68, 0.02)' }}>
                                    <Typography variant="caption" fontWeight={700} color="#ef4444" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                        Vé số thay thế
                                    </Typography>
                                    <Stack spacing={1.5}>
                                        <TextField
                                            label="Dãy số vé thay thế (6 chữ số)"
                                            variant="outlined"
                                            fullWidth
                                            size="small"
                                            required
                                            value={replacementDigits}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                setReplacementDigits(val);
                                                if (digitsError) setDigitsError('');
                                            }}
                                            placeholder="Ví dụ: 123457"
                                            error={!!digitsError}
                                            helperText={digitsError || 'Nhập đúng 6 chữ số cho dãy số vé thay thế'}
                                            InputProps={{ sx: { borderRadius: '8px' } }}
                                        />
                                        <Box>
                                            <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
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
                                </Box>
                            )}
                        </Stack>
                    </Box>
                ) : (
                    <>
                {/* Processing Mode Switcher Buttons */}
                <ToggleButtonGroup
                    value={serialProcessingMode}
                    exclusive
                    onChange={(e, val) => { if (val) setSerialProcessingMode(val); }}
                    size="small"
                    fullWidth
                    sx={{
                        mb: 2,
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
                        value="EACH" 
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
                        Báo cáo hủy cho từng vé
                    </ToggleButton>
                    <ToggleButton 
                        value="ALL" 
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
                        Báo cáo hủy cho tất cả vé
                    </ToggleButton>
                </ToggleButtonGroup>

                {/* Bulk Form for ALL mode - Only targets current tab/group serials */}
                {serialProcessingMode === 'ALL' && (
                    <Box sx={{ p: 2.5, border: '2px solid #ef4444', borderRadius: '14px', bgcolor: '#fff', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.05)', mb: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={850} color="#ef4444" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LayersIcon sx={{ fontSize: '18px' }} />
                                Xử lý báo cáo cho tất cả ({currentGroupSelectedSerials.length}) vé sê-ri đã chọn
                            </Typography>
                            <Chip 
                                label={`${currentGroupSelectedSerials.length} vé sê-ri`} 
                                size="small" 
                                sx={{ fontWeight: 800, height: 22, color: '#ef4444', borderColor: '#fecaca', bgcolor: '#fef2f2' }} 
                            />
                        </Stack>

                        <Stack spacing={2}>
                            {/* Nguyên nhân sự cố */}
                            {!hideFaultedBySelector && (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                        Nguyên nhân sự cố
                                    </Typography>
                                    <ToggleButtonGroup
                                        value={bulkForm.faultedBy}
                                        exclusive
                                        onChange={(e, val) => { if (val) handleBulkFieldChange('faultedBy', val); }}
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
                                        <ToggleButton value="INTERNAL_FAULT" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                                            Nhân viên làm hỏng
                                        </ToggleButton>
                                        <ToggleButton value="DATA_ENTRY_FAULT" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                                            Lỗi thao tác nhập liệu
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                            )}

                            {/* Trạng thái báo hủy */}
                            <Box>
                                <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                    Trạng thái báo hủy
                                </Typography>
                                <ToggleButtonGroup
                                    value={bulkForm.status}
                                    exclusive
                                    onChange={(e, val) => { if (val) handleBulkFieldChange('status', val); }}
                                    size="small"
                                    fullWidth
                                    disabled={bulkForm.faultedBy === 'DATA_ENTRY_FAULT'}
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
                                    {bulkForm.faultedBy === 'DATA_ENTRY_FAULT' ? (
                                        <ToggleButton value="VOIDED" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#ef4444', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                                            Hủy do lỗi nhập liệu (VOIDED)
                                        </ToggleButton>
                                    ) : (
                                        [
                                            <ToggleButton key="DAMAGED" value="DAMAGED" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
                                                Hỏng vật lý (DAMAGED)
                                            </ToggleButton>,
                                            <ToggleButton key="LOST" value="LOST" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', py: 0.75, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } }}>
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
                                    required={bulkForm.status === 'LOST' || bulkForm.status === 'VOIDED' || (bulkForm.faultedBy === 'INTERNAL_FAULT' && bulkForm.status === 'DAMAGED')}
                                    value={bulkForm.damagedReason}
                                    onChange={(e) => handleBulkFieldChange('damagedReason', e.target.value)}
                                    error={!!bulkForm.errors.damagedReason}
                                    helperText={bulkForm.errors.damagedReason}
                                    placeholder="Nhập lý do chi tiết..."
                                    InputProps={{ sx: { borderRadius: '10px' } }}
                                />
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                                    {bulkForm.faultedBy === 'INTERNAL_FAULT' ? (
                                        ['Lỡ tay làm rách vé', 'Vé bị dính nước/bẩn', 'Mất vé khi kiểm kho'].map((sug) => (
                                            <Chip
                                                key={sug}
                                                label={sug}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleBulkFieldChange('damagedReason', sug)}
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
                                                onClick={() => handleBulkFieldChange('damagedReason', sug)}
                                                sx={{ borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                            />
                                        ))
                                    )}
                                </Box>
                            </Box>

                            {/* Link ảnh minh chứng */}
                            {bulkForm.status === 'DAMAGED' && (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                        Ảnh minh chứng {bulkForm.faultedBy === 'INTERNAL_FAULT' && <strong style={{ color: '#ef4444' }}>*</strong>}
                                    </Typography>
                                    <UploadSingleFile
                                        value={bulkForm.damagedEvidenceUrl}
                                        onChange={(url) => handleBulkFieldChange('damagedEvidenceUrl', url)}
                                        autoUpload={true}
                                        compact={true}
                                        error={bulkForm.errors.damagedEvidenceUrl}
                                    />
                                </Box>
                            )}
                        </Stack>
                    </Box>
                )}

                {/* Replacement form for voided items (Shown in TICKET mode or SERIAL ALL mode) */}
                {hasVoided && ((cancelMode as string) === 'TICKET' || serialProcessingMode === 'ALL') && (
                    <Box sx={{ mb: 2, p: 2, border: '1px solid #fee2e2', borderRadius: '12px', bgcolor: 'rgba(239, 68, 68, 0.01)' }}>
                        <Typography variant="caption" fontWeight={800} color="#ef4444" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                            Vé số thay thế
                        </Typography>
                        
                        {(cancelMode as string) === 'TICKET' && (
                            <>
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
                            </>
                        )}

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

                {/* Section Title matching user screenshot */}
                <Typography variant="caption" fontWeight={800} color="#64748b" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.72rem' }}>
                    DANH SÁCH VÉ SÊ-RI ĐÃ CHỌN - DÃY {currentTicketNumbers} ({currentSerials.length} VÉ)
                </Typography>

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

                        const incidentEligible = isSerialIncidentEligible(s);
                        const isSelected = form.selected;

                        // Card Styling
                        let cardBg = '#fff';
                        let cardBorder = '1px solid #e2e8f0';
                        let cardShadow = 'none';

                        if (isSelected) {
                            cardBorder = '2px solid #ef4444';
                            cardShadow = '0 4px 6px -1px rgba(239, 68, 68, 0.05)';
                        } else if (!incidentEligible) {
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
                                                disabled={!incidentEligible}
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
                                    
                                    <SerialStatusChip status={s.status} ticketCondition={s.ticketCondition} />
                                    {!incidentEligible && (
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontStyle: 'italic' }}>
                                            Chỉ tra cứu — không thể báo sự cố
                                        </Typography>
                                    )}
                                </Stack>

                                {form.selected && serialProcessingMode === 'EACH' && incidentEligible && (
                                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                                        <Stack spacing={2}>
                                            {/* Nguyên nhân sự cố - Toggle pills */}
                                            {!hideFaultedBySelector && (
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
                                            )}

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
                                                    {['Lỡ tay làm rách vé', 'Vé bị dính nước/bẩn', 'Mất vé khi kiểm kho'].map((sug) => (
                                                        <Chip
                                                            key={sug}
                                                            label={sug}
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleFieldChange(s.id, 'damagedReason', sug)}
                                                            sx={{ borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                        />
                                                    ))}
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

                                            {/* Inline replacement inputs for VOIDED status in EACH mode */}
                                            {form.status === 'VOIDED' && (
                                                <Box sx={{ mt: 1, p: 1.5, border: '1px solid #fee2e2', borderRadius: '10px', bgcolor: 'rgba(239, 68, 68, 0.02)' }}>
                                                    <Typography variant="caption" fontWeight={700} color="#ef4444" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                                        Vé sê-ri thay thế
                                                    </Typography>
                                                    <Stack spacing={1.5}>
                                                        <TextField
                                                            label="Số sê-ri thay thế"
                                                            variant="outlined"
                                                            fullWidth
                                                            size="small"
                                                            value={form.replacementSerial || ''}
                                                            onChange={(e) => handleFieldChange(s.id, 'replacementSerial', e.target.value)}
                                                            placeholder="Ví dụ: IBSEED-..."
                                                            error={!!form.errors.replacementSerial}
                                                            helperText={form.errors.replacementSerial}
                                                            InputProps={{ sx: { borderRadius: '8px' } }}
                                                        />
                                                        <Box>
                                                            <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
                                                                Ảnh vé thay thế
                                                            </Typography>
                                                            <UploadSingleFile
                                                                value={form.replacementTicketImg || ''}
                                                                onChange={(url) => handleFieldChange(s.id, 'replacementTicketImg', url)}
                                                                autoUpload={true}
                                                                compact={true}
                                                                error={form.errors.replacementTicketImg}
                                                            />
                                                        </Box>
                                                    </Stack>
                                                </Box>
                                            )}
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
                </>
            )}
                </>
                )}
            </Box>

            {/* Action buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #cbd5e1' }}>
                <Button 
                    onClick={workflowStep === 'REFUND' ? () => setWorkflowStep('FORM') : onCancel} 
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
                    {workflowStep === 'REFUND' ? 'Quay lại' : (cancelButtonText || 'Hủy bỏ')}
                </Button>
                {workflowStep === 'REFUND' ? (
                    <Button
                        onClick={handleRefundStepContinue}
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
                            '&:hover': { bgcolor: '#dc2626' },
                        }}
                    >
                        Tiếp tục
                    </Button>
                ) : (
                    confirmButtonVisible && (
                        <Button 
                            onClick={handlePreSubmit} 
                            disabled={confirmButtonDisabled} 
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
                    )
                )}
            </Stack>

            <Dialog
                open={incompleteGroupsOpen}
                onClose={() => setIncompleteGroupsOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', pb: 0.5 }}>
                    Chưa nhập đủ dãy số
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Chưa xác nhận được do còn dãy{' '}
                        <Box component="span" sx={{ fontWeight: 700, color: '#b91c1c' }}>
                            {incompleteGroupNumbers.join(', ')}
                        </Box>{' '}
                        chưa được nhập. Bạn có muốn xác nhận?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={() => setIncompleteGroupsOpen(false)}
                        variant="outlined"
                        color="inherit"
                        sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}
                    >
                        Quay lại
                    </Button>
                    <Button
                        onClick={handleIncompleteGroupsConfirm}
                        variant="contained"
                        sx={{
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            bgcolor: '#ef4444',
                            '&:hover': { bgcolor: '#dc2626' },
                        }}
                    >
                        Vẫn xác nhận
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={evidenceApplyDialogOpen}
                onClose={() => {
                    setEvidenceApplyDialogOpen(false);
                    setPendingEvidenceUrl('');
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', pb: 0.5 }}>
                    Áp dụng ảnh minh chứng
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Bạn muốn set ảnh minh chứng cho toàn bộ số serial vé của dãy số trên chứ?
                    </Typography>
                    {pendingEvidenceUrl && (
                        <Box
                            component="img"
                            src={pendingEvidenceUrl}
                            alt="Ảnh minh chứng"
                            sx={{ mt: 1.5, width: 72, height: 72, borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        onClick={handleEvidenceApplyNo}
                        variant="outlined"
                        color="inherit"
                    >
                        Không
                    </Button>
                    <Button
                        onClick={handleEvidenceApplyYes}
                        variant="contained"
                        sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
                    >
                        Có, áp dụng cho tất cả
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Modal - Horizontal Rectangle Layout */}
            <Dialog 
                open={confirmOpen} 
                onClose={() => setConfirmOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: '20px', p: 1.5, maxWidth: '880px', width: '880px' }
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 1.5, px: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box sx={{ bgcolor: '#fee2e2', borderRadius: '50%', p: 1, display: 'flex' }}>
                                <ReportProblemIcon sx={{ color: '#ef4444', fontSize: '1.4rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="#1e293b" sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                                    Xác nhận báo cáo sự cố & thay thế vé số
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Vui lòng kiểm tra kỹ các thông tin trước khi tiến hành cập nhật hệ thống
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton size="small" onClick={() => setConfirmOpen(false)} sx={{ color: '#94a3b8' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <Divider sx={{ my: 1 }} />
                <DialogContent sx={{ py: 1.5, px: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        {/* Cột 1: Thông tin hủy vé cũ */}
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', borderColor: '#e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <Stack spacing={1.5}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Chip label="Vé bị lỗi / hủy" size="small" color="error" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                    <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                                        #{currentTicketNumbers}
                                    </Typography>
                                </Stack>

                                <Divider />

                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                        Hình thức báo hủy
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} color="#334155">
                                        {cancelMode === 'TICKET' ? `Hủy toàn bộ dãy số vé (#${currentTicketNumbers})` : `Hủy theo từng số sê-ri vé vật lý`}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                        Nguyên nhân sự cố
                                    </Typography>
                                    <Chip 
                                        label={(cancelMode === 'TICKET' ? ticketForm.faultedBy : (serialProcessingMode === 'ALL' ? bulkForm.faultedBy : 'Đã chọn')) === 'DATA_ENTRY_FAULT' ? 'Lỗi thao tác nhập liệu' : 'Nhân viên làm hỏng'} 
                                        size="small" 
                                        sx={{ 
                                            fontWeight: 800, 
                                            fontSize: '0.72rem',
                                            bgcolor: (cancelMode === 'TICKET' ? ticketForm.faultedBy : (serialProcessingMode === 'ALL' ? bulkForm.faultedBy : '')) === 'DATA_ENTRY_FAULT' ? '#fef2f2' : '#fff7ed',
                                            color: (cancelMode === 'TICKET' ? ticketForm.faultedBy : (serialProcessingMode === 'ALL' ? bulkForm.faultedBy : '')) === 'DATA_ENTRY_FAULT' ? '#ef4444' : '#c2410c',
                                            border: '1px solid',
                                            borderColor: (cancelMode === 'TICKET' ? ticketForm.faultedBy : (serialProcessingMode === 'ALL' ? bulkForm.faultedBy : '')) === 'DATA_ENTRY_FAULT' ? '#fecaca' : '#ffedd5'
                                        }} 
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                        Lý do chi tiết
                                    </Typography>
                                    <Typography variant="body2" color="#475569" sx={{ fontStyle: 'italic', bgcolor: '#ffffff', p: 1, borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                        "{cancelMode === 'TICKET' ? (ticketForm.damagedReason || 'Chưa nhập lý do') : (serialProcessingMode === 'ALL' ? (bulkForm.damagedReason || 'Chưa nhập lý do') : 'Báo hủy theo từng thẻ vé riêng biệt')}"
                                    </Typography>
                                </Box>

                                <Box sx={{ pt: 0.5 }}>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.72rem', display: 'block', lineHeight: 1.3 }}>
                                        Trạng thái dãy số cũ: Các sê-ri sẽ chuyển <strong style={{ color: '#ef4444' }}>ticketCondition = VOIDED</strong> (status giữ IN_STOCK) và dãy số bị soft-delete (ẩn khỏi kho), giữ lại để đối soát.
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>

                        {/* Cột 2: Thông tin vé số thay thế mới */}
                        <Paper 
                            variant="outlined" 
                            sx={{ 
                                p: 2, 
                                borderRadius: '12px', 
                                bgcolor: hasVoided && replacementType === 'DIGITS' ? '#fef2f2' : '#f8fafc', 
                                borderColor: hasVoided && replacementType === 'DIGITS' ? '#fecaca' : '#e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}
                        >
                            {hasVoided && replacementType === 'DIGITS' ? (
                                <Stack spacing={1.5}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                        <Chip label="Vé thay thế mới" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                        <Typography variant="subtitle2" fontWeight={800} color="#15803d">
                                            Tạo mới thành công
                                        </Typography>
                                    </Stack>

                                    <Divider />

                                    <Box>
                                        <Typography variant="caption" color="#b91c1c" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                            Dãy số vé mới sẽ sinh
                                        </Typography>
                                        <Typography variant="h4" fontWeight={900} color="#ef4444" sx={{ letterSpacing: '2px' }}>
                                            {replacementDigits || 'Chưa nhập'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                            Số lượng sê-ri sinh mới
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} color="#1e293b">
                                            {currentSerials.length} sê-ri vật lý trong kho
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                            Ảnh minh chứng vé mới
                                        </Typography>
                                        <Typography variant="body2" color="#475569">
                                            {replacementDigitsImg ? 'Đã tải lên 1 ảnh vé mới' : 'Không có ảnh đính kèm'}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ pt: 0.5, bgcolor: '#ffffff', p: 1, borderRadius: '8px', border: '1px solid #fca5a5' }}>
                                        <Typography variant="caption" color="#991b1b" fontWeight={700} sx={{ display: 'block', mb: 0.25 }}>
                                            Lưu vết kế toán (Audit Trail):
                                        </Typography>
                                        <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.7rem', display: 'block', lineHeight: 1.3 }}>
                                            Hệ thống tự động nối thông tin {currentSerials.length} sê-ri mới trỏ về đúng {currentSerials.length} sê-ri cũ để phục vụ kiểm toán đối soát.
                                        </Typography>
                                    </Box>
                                </Stack>
                            ) : (
                                <Stack spacing={1.5} justifyContent="center" alignItems="center" sx={{ height: '100%', py: 3, textAlign: 'center' }}>
                                    <Box sx={{ bgcolor: '#e2e8f0', borderRadius: '50%', p: 1.5, display: 'flex' }}>
                                        <LayersIcon sx={{ color: '#64748b', fontSize: '1.8rem' }} />
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#475569">
                                        Không tạo vé thay thế hàng loạt
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '240px' }}>
                                        Sự cố này chỉ ghi nhận báo hỏng/hủy theo từng sê-ri riêng lẻ mà không tạo mới toàn bộ dãy số thay thế.
                                    </Typography>
                                </Stack>
                            )}
                        </Paper>
                    </Box>

                    {Object.keys(refundDraftByOrderId).length > 0 && (
                        <Paper
                            variant="outlined"
                            sx={{
                                mt: 2,
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: '#fffbeb',
                                borderColor: '#fde68a',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={800} color="#92400e" sx={{ mb: 1.5 }}>
                                Hoàn tiền đơn hàng liên kết
                            </Typography>
                            <Stack spacing={1.5}>
                                {Object.entries(refundDraftByOrderId).map(([orderId, draft]) => {
                                    const statusBadge = getOrderStatusBadge(draft.orderStatus);
                                    const orderTypeLabel =
                                        ORDER_TYPE_LABELS[draft.orderType || ''] || draft.orderType || '—';

                                    return (
                                    <Box
                                        key={orderId}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: '8px',
                                            bgcolor: '#fff',
                                            border: '1px solid #fde68a',
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                            <Typography variant="body2" fontWeight={800}>
                                                {draft.orderCode || orderId}
                                            </Typography>
                                            <Chip
                                                label={statusBadge.label}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: '0.65rem',
                                                    color: statusBadge.color,
                                                    bgcolor: statusBadge.bg,
                                                    height: 22,
                                                }}
                                            />
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                            {draft.customerName || '—'}
                                            {draft.customerPhone ? ` · ${draft.customerPhone}` : ''}
                                            {draft.createdAt
                                                ? ` · ${dayjs(draft.createdAt).format('DD/MM/YYYY HH:mm')}`
                                                : ''}
                                            {orderTypeLabel !== '—' ? ` · ${orderTypeLabel}` : ''}
                                        </Typography>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {draft.canFullOrderCancel
                                                    ? 'Hủy đơn + hoàn các vé sự cố (vé cuối)'
                                                    : Number(draft.refundAmount || 0) > 0
                                                      ? 'Tạo đơn hoàn tiền từng phần — không hủy đơn'
                                                      : 'Không hủy đơn — chỉ báo sự cố sê-ri'}
                                                · {draft.incidents.length} sê-ri
                                                {draft.ticketLineCount != null
                                                    ? ` · ${draft.ticketLineCount} dòng vé`
                                                    : ''}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={800} color="#b45309">
                                                {formatRefundCurrency(draft.refundAmount ?? 0)}
                                            </Typography>
                                        </Stack>
                                        {(draft.canFullOrderCancel || Number(draft.refundAmount || 0) > 0) && (
                                            <Typography variant="caption" color="#475569" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                                {draft.canFullOrderCancel ? 'Lý do hủy: ' : 'Lý do hoàn: '}
                                                {draft.cancelReason || '—'}
                                            </Typography>
                                        )}
                                    </Box>
                                    );
                                })}
                            </Stack>

                            {pendingSelectedItems.some(
                                (item) => !isActiveTransactionSerialStatus(item.originalStatus)
                            ) && (
                                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #fde68a' }}>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ display: 'block', mb: 0.5 }}>
                                        Sê-ri chỉ cập nhật kho (IN_STOCK) — không hoàn tiền:
                                    </Typography>
                                    <Typography variant="caption" color="#475569">
                                        {pendingSelectedItems
                                            .filter((item) => !isActiveTransactionSerialStatus(item.originalStatus))
                                            .map((item) => item.serialNumber || item.id)
                                            .join(', ')}
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    )}
                </DialogContent>
                <Divider sx={{ my: 1 }} />
                <DialogActions sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
                    <Button 
                        onClick={() => setConfirmOpen(false)} 
                        variant="outlined" 
                        color="inherit"
                        sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', px: 2.5 }}
                    >
                        Quay lại chỉnh sửa
                    </Button>
                    <Button 
                        onClick={handleConfirmSubmit} 
                        variant="contained" 
                        sx={{ 
                            borderRadius: '8px', 
                            fontWeight: 700, 
                            textTransform: 'none', 
                            bgcolor: '#ef4444', 
                            px: 3,
                            '&:hover': { bgcolor: '#dc2626' } 
                        }}
                    >
                        Đồng ý & Tiến hành báo hủy
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
