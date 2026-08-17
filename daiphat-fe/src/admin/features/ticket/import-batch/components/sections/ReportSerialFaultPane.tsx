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
    Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import LinkIcon from '@mui/icons-material/Link';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LayersIcon from '@mui/icons-material/Layers';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import KeyboardAltOutlinedIcon from '@mui/icons-material/KeyboardAltOutlined';
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import BorderColorOutlinedIcon from '@mui/icons-material/BorderColorOutlined';
import {
    buildReportSerialFaultPayload,
    reportTicketSerialFault,
    replaceTicketDigits,
} from '../../../inventory/services/ticketService';
import {
    applyReplacementSerialDuplicateErrors,
    DUPLICATE_REPLACEMENT_SERIAL_MESSAGE,
    getActiveTransactionSerials,
    getReplacementSerialConflictToastMessage,
    groupSerialsByOrderId,
    hasDuplicateReplacementSerialErrors,
    isActiveTransactionSerialStatus,
    isSerialIncidentEligible,
    needsRefundPrepStep,
    SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE,
} from '../../utils/serialIncidentWorkflow';
import { AppToast } from '../../../../../../utils/toast.util';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import {
    TicketIncidentRefundStep,
    type RefundOrderDraft,
} from './TicketIncidentRefundStep';
import { createPartialRefund } from '../../../../orders/services/orderService';
import { refundAdminApi } from '@/admin/features/refund/services/refundService';
import { OrderStatusBadge } from '@/shared/components/StatusBadge';
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
    /** TICKET starts shared form (ALL); SERIAL starts per-serial (EACH). Kept for caller compatibility. */
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
            return { label: 'Trong kho', color: '#15803d', bgcolor: '#dcfce7', borderColor: '#bbf7d0' };
        case 'RESERVED':
            return { label: 'Tạm giữ', color: '#a16207', bgcolor: '#fef9c3', borderColor: '#fef08a' };
        case 'SOLD_OUT':
            return { label: 'Hết hàng', color: '#b91c1c', bgcolor: '#fee2e2', borderColor: '#fecaca' };
        case 'SOLD':
            return { label: 'Đã bán', color: '#0369a1', bgcolor: '#e0f2fe', borderColor: '#bae6fd' };
        case 'EXPIRED':
            return { label: 'Hết hạn', color: '#64748b', bgcolor: '#f1f5f9', borderColor: '#e2e8f0' };
        case 'CANCELLED':
            return { label: 'Đã hủy', color: '#b91c1c', bgcolor: '#fee2e2', borderColor: '#fecaca' };
        default:
            return { label: status || 'Chưa xác định', color: '#334155', bgcolor: '#f1f5f9', borderColor: '#cbd5e1' };
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
        return { label: 'Bị hư hỏng / rách', bgcolor: '#fee2e2', textColor: '#b91c1c', borderColor: '#fca5a5' };
    }
    if (condition === 'LOST') {
        return { label: 'Thất lạc / Mất', bgcolor: '#fee2e2', textColor: '#b91c1c', borderColor: '#fca5a5' };
    }
    if (condition === 'VOIDED') {
        return { label: 'Đã hủy', bgcolor: '#fee2e2', textColor: '#b91c1c', borderColor: '#fca5a5' };
    }
    const s = (status || '').toUpperCase().replace(/-/g, '_');
    switch (s) {
        case 'IN_STOCK':
            return { label: 'Trong kho', bgcolor: '#dcfce7', textColor: '#15803d', borderColor: '#86efac' };
        case 'RESERVED':
            return { label: 'Tạm giữ', bgcolor: '#fef9c3', textColor: '#a16207', borderColor: '#fde047' };
        case 'PROXY_HOLDING':
            return { label: 'Đại lý giữ hộ', bgcolor: '#fef9c3', textColor: '#a16207', borderColor: '#fde047' };
        case 'SOLD':
            return { label: 'Đã bán', bgcolor: '#e0f2fe', textColor: '#0369a1', borderColor: '#7dd3fc' };
        case 'EXPIRED':
            return { label: 'Hết hạn', bgcolor: '#f1f5f9', textColor: '#64748b', borderColor: '#cbd5e1' };
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
    const [workflowStep, setWorkflowStep] = useState<'SCOPE' | 'FORM' | 'REFUND'>('SCOPE');
    const [scopeMode, setScopeMode] = useState<'TICKET' | 'SERIAL'>('TICKET');
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

    const [serialProcessingMode, setSerialProcessingMode] = useState<'EACH' | 'ALL'>(
        defaultCancelMode === 'SERIAL' ? 'EACH' : 'ALL'
    );
    const [cancelMode, setCancelMode] = useState<'TICKET' | 'SERIAL'>(defaultCancelMode);
    const [ticketForm, setTicketForm] = useState<FormState>({
        selected: true,
        status: 'DAMAGED',
        faultedBy: 'INTERNAL_FAULT',
        damagedReason: '',
        damagedEvidenceUrl: '',
        errors: {}
    });

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
        setWorkflowStep('SCOPE');
        setScopeMode(defaultCancelMode || 'TICKET');
        setCancelMode(defaultCancelMode || 'TICKET');
        setSerialProcessingMode(defaultCancelMode === 'SERIAL' ? 'EACH' : 'ALL');
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

    const currentGroup = groups[activeGroupIndex] || groups[0];
    const currentSerials = currentGroup?.serials || [];
    const currentTicketNumbers = currentGroup?.ticketNumbers || ticketNumbers;
    const currentTicketId = currentGroup?.ticketId || ticketId;
    const currentTicketStatus = currentGroup?.ticketStatus || (currentSerials[0] as any)?.ticketStatus;
    const currentGroupSelectedSerials = currentSerials.filter(
        (s) => forms[s.id]?.selected && isSerialIncidentEligible(s)
    );
    const eligibleCurrentSerials = currentSerials.filter((s) => isSerialIncidentEligible(s));
    const selectedOutsideCurrentGroup = serials.filter((s) => {
        const numKey = s.ticketNumbers || ticketNumbers || 'Vé số';
        return Boolean(forms[s.id]?.selected) && numKey !== currentTicketNumbers;
    }).length;
    const isFullTicketScope =
        cancelMode === 'TICKET'
        || (
            eligibleCurrentSerials.length > 0
            && eligibleCurrentSerials.every((s) => forms[s.id]?.selected)
            && selectedOutsideCurrentGroup === 0
        );
    const allSelectedSerialsInternalFault =
        cancelMode === 'SERIAL'
        && eligibleCurrentSerials.length > 0
        && eligibleCurrentSerials.every((s) => forms[s.id]?.selected)
        && selectedOutsideCurrentGroup === 0
        && (
            serialProcessingMode === 'ALL'
                ? ticketForm.faultedBy === 'INTERNAL_FAULT'
                : currentGroupSelectedSerials.length > 0
                    && currentGroupSelectedSerials.every((s) => forms[s.id]?.faultedBy === 'INTERNAL_FAULT')
        );

    const isTicketBatchFaultFlow =
        cancelMode === 'TICKET' &&
        ticketForm.faultedBy === 'INTERNAL_FAULT' &&
        (ticketForm.status === 'DAMAGED' || ticketForm.status === 'LOST');

    const ticketBatchFaultProgressCount = React.useMemo(() => {
        if (!isTicketBatchFaultFlow || !ticketForm.damagedReason?.trim()) return 0;
        if (ticketForm.status === 'LOST') return currentGroupSelectedSerials.length;
        if (ticketForm.status === 'DAMAGED') {
            if (ticketBatchEvidenceMode === 'ALL') {
                return ticketForm.damagedEvidenceUrl?.trim() ? currentGroupSelectedSerials.length : 0;
            }
            if (ticketBatchEvidenceMode === 'EACH') {
                return currentGroupSelectedSerials.filter((serial) => serialEvidenceUrls[String(serial.id)]?.trim()).length;
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
        currentGroupSelectedSerials,
    ]);

    const isTicketBatchFaultFormComplete = React.useMemo(() => {
        return currentGroupSelectedSerials.length > 0
            && ticketBatchFaultProgressCount === currentGroupSelectedSerials.length;
    }, [currentGroupSelectedSerials.length, ticketBatchFaultProgressCount]);

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
        currentGroupSelectedSerials.forEach((serial) => {
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
            const formState = serialProcessingMode === 'ALL' ? ticketForm : forms[sItem.id];
            let damagedEvidenceUrl = formState.damagedEvidenceUrl;
            if (
                serialProcessingMode === 'ALL' &&
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
            ? eligibleCurrentSerials
            : serialProcessingMode === 'ALL'
            ? currentGroupSelectedSerials
            : serials.filter((s) => forms[s.id]?.selected && isSerialIncidentEligible(s));

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
            ticketForm.faultedBy === 'DATA_ENTRY_FAULT' &&
            ticketForm.status === 'VOIDED' &&
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
        ticketForm.faultedBy === 'DATA_ENTRY_FAULT' &&
        ticketForm.status === 'VOIDED' &&
        replacementType === 'SERIALS';

    useEffect(() => {
        if (cancelMode === 'SERIAL' || !currentTicketId) {
            setReplacementType('SERIALS');
        } else {
            setReplacementType('DIGITS');
        }
    }, [cancelMode, currentTicketId]);

    const applyScopeMode = (mode: 'TICKET' | 'SERIAL') => {
        setCancelMode(mode);
        if (mode === 'TICKET') {
            setSerialProcessingMode('ALL');
            setForms((prev) => {
                const next = { ...prev };
                serials.forEach((s) => {
                    if (!next[s.id]) return;
                    const numKey = s.ticketNumbers || ticketNumbers || 'Vé số';
                    next[s.id] = {
                        ...next[s.id],
                        selected: numKey === currentTicketNumbers && isSerialIncidentEligible(s),
                    };
                });
                return next;
            });
            return;
        }

        setSerialProcessingMode('EACH');
    };

    const handleScopeContinue = () => {
        if (!scopeMode) {
            AppToast.error('Vui lòng chọn một phạm vi báo sự cố.');
            return;
        }
        applyScopeMode(scopeMode);
        setWorkflowStep('FORM');
    };

    const goBackToScope = () => {
        setScopeMode(cancelMode);
        setWorkflowStep('SCOPE');
    };

    const handleTicketFormFieldChange = (field: keyof FormState, value: any) => {
        const updatedValue = field === 'replacementNumbers' ? value.replace(/\D/g, '') : value;
        setTicketForm((prev) => {
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
            const targets = cancelMode === 'TICKET' ? eligibleCurrentSerials : currentGroupSelectedSerials;
            targets.forEach((s) => {
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
            return applyReplacementSerialDuplicateErrors(next, scopeIds, serials);
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
                next = applyReplacementSerialDuplicateErrors(next, scopeIds, serials);
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
            ? resolveReplacementSerialScopeIds(forms, currentGroupSelectedSerials).every((scopeId) => {
                const form = forms[scopeId];
                return !!form?.replacementSerial?.trim() && !form?.errors.replacementSerial;
            })
            : currentGroupSelectedSerials.length > 0)
        : serialProcessingMode === 'ALL'
        ? currentGroupSelectedSerials.length > 0 && (
            isBulkVoidedReplacementScope
                ? resolveReplacementSerialScopeIds(forms).every((scopeId) => {
                    const form = forms[scopeId];
                    return !!form?.replacementSerial?.trim() && !form?.errors?.replacementSerial;
                })
                : true
        )
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
        if (serialProcessingMode === 'ALL') {
            if (groupIndex !== activeGroupIndex) return true;
            if (ticketForm.status === 'DAMAGED' || ticketForm.status === 'LOST' || ticketForm.status === 'VOIDED') {
                if (!ticketForm.damagedReason?.trim()) return false;
                if (ticketForm.status === 'DAMAGED' && ticketForm.faultedBy === 'INTERNAL_FAULT') {
                    if (isTicketBatchFaultFlow && ticketBatchEvidenceMode === 'EACH') {
                        return currentGroupSelectedSerials.every((serial) => serialEvidenceUrls[String(serial.id)]?.trim());
                    }
                    if (!ticketForm.damagedEvidenceUrl?.trim()) return false;
                }
            }
            return currentGroupSelectedSerials.length > 0;
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
        if (serialProcessingMode === 'ALL') {
            if (!currentGroup || !isTicketGroupFormFilled(currentGroup, activeGroupIndex)) {
                return [];
            }
            return currentGroupSelectedSerials;
        }
        return serials.filter((s) => isSerialIncidentEligible(s) && isSerialFormFilled(forms[s.id]));
    };

    const validateForms = (overrideTargets?: SerialItem[]): boolean => {
        let isValid = true;

        if (serialProcessingMode === 'ALL' && isFullTicketScope) {
            const ticketErrors: FormState['errors'] = {};
            if (ticketForm.status === 'DAMAGED' || ticketForm.status === 'LOST' || ticketForm.status === 'VOIDED') {
                if (!ticketForm.damagedReason?.trim()) {
                    ticketErrors.damagedReason = 'Vui lòng chọn hoặc nhập lý do chi tiết.';
                    isValid = false;
                }
                if (ticketForm.status === 'DAMAGED' && ticketForm.faultedBy === 'INTERNAL_FAULT') {
                    if (isTicketBatchFaultFlow && ticketBatchEvidenceMode === 'EACH') {
                        const missingEvidence = currentGroupSelectedSerials.some(
                            (serial) => !serialEvidenceUrls[String(serial.id)]?.trim()
                        );
                        if (missingEvidence) {
                            ticketErrors.damagedEvidenceUrl = 'Vui lòng tải ảnh minh chứng cho tất cả sê-ri đã chọn.';
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
                const scopeIds = resolveReplacementSerialScopeIds(newForms, currentGroupSelectedSerials);

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

                const formsWithDuplicateCheck = applyReplacementSerialDuplicateErrors(
                    newForms,
                    scopeIds,
                    currentGroupSelectedSerials
                );
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
            if (ticketForm.status === 'DAMAGED' || ticketForm.status === 'LOST' || ticketForm.status === 'VOIDED') {
                if (!ticketForm.damagedReason?.trim()) {
                    bulkErrors.damagedReason = 'Vui lòng chọn hoặc nhập lý do chi tiết.';
                    isValid = false;
                }
                if (ticketForm.status === 'DAMAGED' && ticketForm.faultedBy === 'INTERNAL_FAULT' && !ticketForm.damagedEvidenceUrl?.trim()) {
                    bulkErrors.damagedEvidenceUrl = 'Ảnh minh chứng sự cố không được để trống.';
                    isValid = false;
                }
            }
            setTicketForm(prev => ({ ...prev, errors: bulkErrors }));

            if (!isValid) return false;
        }

        const newForms = { ...forms };

        targetSerials.forEach((s) => {
            const id = s.id;
            const form = newForms[id];
            if (!form || !form.selected) return;

            const errors: FormState['errors'] = {};

            if (serialProcessingMode !== 'ALL') {
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
        const formsWithDuplicateCheck = applyReplacementSerialDuplicateErrors(
            newForms,
            voidedScopeIds,
            targetSerials
        );

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
            const sameAsCurrent = targetSerials.some((serial) => {
                const form = forms[serial.id];
                const replacement = (form?.replacementSerial ?? '').trim().toLowerCase();
                const current = (serial.serialNumber ?? '').trim().toLowerCase();
                return !!form?.selected && !!replacement && replacement === current;
            });
            AppToast.error(
                sameAsCurrent
                    ? SAME_CURRENT_REPLACEMENT_SERIAL_MESSAGE
                    : hasDuplicateReplacementSerialErrors(forms)
                    ? DUPLICATE_REPLACEMENT_SERIAL_MESSAGE
                    : getReplacementSerialConflictToastMessage(forms)
                        ?? 'Vui lòng kiểm tra lại thông tin nhập liệu.'
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
                        width: 44, 
                        height: 44, 
                        borderRadius: '12px', 
                        bgcolor: '#fff1f2',
                        color: '#e11d48',
                        border: '1px solid #ffe4e6',
                        flexShrink: 0,
                    }}
                >
                    <ReportProblemIcon sx={{ fontSize: '24px' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={850} color="#0f172a" sx={{ fontSize: '1.15rem', lineHeight: 1.2 }}>
                        Báo cáo hủy & xử lý sự cố thông tin vé
                    </Typography>
                    {currentTicketNumbers && (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    bgcolor: '#f8fafc',
                                    px: 1,
                                    py: 0.35,
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                }}
                            >
                                <LayersIcon sx={{ fontSize: '14px', color: '#64748b' }} />
                                <Typography variant="caption" color="#475569" fontWeight={600}>
                                    Dãy số:
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="#0f172a"
                                    fontWeight={900}
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    {currentTicketNumbers}
                                </Typography>
                            </Box>
                            <TicketStatusChip status={currentTicketStatus} />
                            {groups.length > 1 && (
                                <Chip 
                                    label={`${activeGroupIndex + 1}/${groups.length} dãy số`} 
                                    size="small" 
                                    sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }} 
                                />
                            )}
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
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        '&:hover': { bgcolor: '#f1f5f9', color: '#64748b' }
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
                ) : workflowStep === 'SCOPE' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%', py: 1 }}>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 0.5 }}>
                        Chọn phạm vi báo sự cố
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        Chỉ chọn một cách xử lý. Sau đó tiếp tục để nhập thông tin sự cố.
                    </Typography>
                    <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper
                                variant="outlined"
                                onClick={() => setScopeMode('TICKET')}
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    bgcolor: scopeMode === 'TICKET' ? '#f0fdf4' : '#ffffff',
                                    borderColor: scopeMode === 'TICKET' ? '#16a34a' : '#e2e8f0',
                                    borderWidth: scopeMode === 'TICKET' ? '1.5px' : '1px',
                                    boxShadow: scopeMode === 'TICKET' ? '0 2px 8px rgba(22, 163, 74, 0.08)' : 'none',
                                    '&:hover': {
                                        borderColor: scopeMode === 'TICKET' ? '#16a34a' : '#cbd5e1',
                                        bgcolor: scopeMode === 'TICKET' ? '#f0fdf4' : '#f8fafc',
                                    }
                                }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{
                                        width: 38, height: 38, borderRadius: '10px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        bgcolor: scopeMode === 'TICKET' ? '#dcfce7' : '#f1f5f9',
                                        color: scopeMode === 'TICKET' ? '#16a34a' : '#64748b',
                                    }}>
                                        <ConfirmationNumberOutlinedIcon sx={{ fontSize: '20px' }} />
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="body2" fontWeight={800} color={scopeMode === 'TICKET' ? '#15803d' : '#0f172a'}>
                                            Báo sự cố toàn bộ dãy
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                                            Áp dụng đồng thời cho tất cả sê-ri của dãy số
                                        </Typography>
                                    </Box>
                                    {scopeMode === 'TICKET' && (
                                        <CheckCircleRoundedIcon sx={{ fontSize: '20px', color: '#16a34a' }} />
                                    )}
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper
                                variant="outlined"
                                onClick={() => setScopeMode('SERIAL')}
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    bgcolor: scopeMode === 'SERIAL' ? '#eff6ff' : '#ffffff',
                                    borderColor: scopeMode === 'SERIAL' ? '#2563eb' : '#e2e8f0',
                                    borderWidth: scopeMode === 'SERIAL' ? '1.5px' : '1px',
                                    boxShadow: scopeMode === 'SERIAL' ? '0 2px 8px rgba(37, 99, 235, 0.08)' : 'none',
                                    '&:hover': {
                                        borderColor: scopeMode === 'SERIAL' ? '#2563eb' : '#cbd5e1',
                                        bgcolor: scopeMode === 'SERIAL' ? '#eff6ff' : '#f8fafc',
                                    }
                                }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{
                                        width: 38, height: 38, borderRadius: '10px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        bgcolor: scopeMode === 'SERIAL' ? '#dbeafe' : '#f1f5f9',
                                        color: scopeMode === 'SERIAL' ? '#2563eb' : '#64748b',
                                    }}>
                                        <StyleOutlinedIcon sx={{ fontSize: '20px' }} />
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="body2" fontWeight={800} color={scopeMode === 'SERIAL' ? '#1d4ed8' : '#0f172a'}>
                                            Báo sự cố theo sê-ri
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                                            Tùy chọn các sê-ri cụ thể bị sự cố trong dãy
                                        </Typography>
                                    </Box>
                                    {scopeMode === 'SERIAL' && (
                                        <CheckCircleRoundedIcon sx={{ fontSize: '20px', color: '#2563eb' }} />
                                    )}
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
                ) : (
                <>
                <Paper
                    variant="outlined"
                    sx={{
                        mb: 2,
                        px: 2,
                        py: 1.25,
                        borderRadius: '12px',
                        borderColor: cancelMode === 'TICKET' ? '#bbf7d0' : '#bfdbfe',
                        bgcolor: cancelMode === 'TICKET' ? '#f0fdf4' : '#f8fbff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                    }}
                >
                    <Box>
                        <Typography variant="caption" fontWeight={800} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                            Phạm vi đã chọn
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                            {cancelMode === 'TICKET' ? 'Báo sự cố toàn bộ dãy' : 'Báo sự cố theo sê-ri'}
                        </Typography>
                    </Box>
                    <Button
                        size="small"
                        variant="text"
                        onClick={goBackToScope}
                        sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                        Đổi phạm vi
                    </Button>
                </Paper>

                {/* Scope Quick Bar & Segmented Mode Toggle (When SERIAL mode) */}
                {cancelMode === 'SERIAL' && (
                <Box sx={{ mb: 2 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            px: 2,
                            py: 1.25,
                            borderRadius: '12px',
                            borderColor: isFullTicketScope ? '#bfdbfe' : '#e2e8f0',
                            bgcolor: isFullTicketScope ? '#f0f9ff' : '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1.5,
                            mb: 1.5,
                        }}
                    >
                        <Box>
                            <Typography variant="caption" fontWeight={800} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                                Phạm vi xử lý
                            </Typography>
                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                                Đã chọn {currentGroupSelectedSerials.length}/{eligibleCurrentSerials.length} sê-ri đủ điều kiện của dãy {currentTicketNumbers}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {allSelectedSerialsInternalFault
                                    ? 'Toàn bộ sê-ri đều báo sự cố vật lý — dãy số sẽ bị hủy theo.'
                                    : isFullTicketScope
                                    ? 'Đang xử lý toàn bộ sê-ri đủ điều kiện của dãy.'
                                    : 'Đang xử lý một phần sê-ri — bỏ chọn hoặc chọn thêm để đổi phạm vi.'}
                            </Typography>
                            {selectedOutsideCurrentGroup > 0 && (
                                <Typography variant="caption" color="#b91c1c" sx={{ display: 'block' }}>
                                    Đang có {selectedOutsideCurrentGroup} sê-ri thuộc dãy khác được chọn — chỉ dãy hiện tại được gửi khi áp dụng chung.
                                </Typography>
                            )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => {
                                    setForms((prev) => {
                                        const next = { ...prev };
                                        serials.forEach((s) => {
                                            if (!next[s.id]) return;
                                            const numKey = s.ticketNumbers || ticketNumbers || 'Vé số';
                                            const inCurrent = numKey === currentTicketNumbers;
                                            next[s.id] = {
                                                ...next[s.id],
                                                selected: inCurrent && isSerialIncidentEligible(s),
                                            };
                                        });
                                        return next;
                                    });
                                }}
                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8125rem' }}
                            >
                                Chọn hết dãy này
                            </Button>
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => {
                                    setForms((prev) => {
                                        const next = { ...prev };
                                        currentGroupSelectedSerials.forEach((s) => {
                                            if (next[s.id]) {
                                                next[s.id] = { ...next[s.id], selected: false };
                                            }
                                        });
                                        return next;
                                    });
                                }}
                                sx={{ textTransform: 'none', fontWeight: 700, color: '#64748b', fontSize: '0.8125rem' }}
                            >
                                Bỏ chọn
                            </Button>
                        </Stack>
                    </Paper>

                    <ToggleButtonGroup
                        value={serialProcessingMode}
                        exclusive
                        onChange={(e, val) => { if (val) setSerialProcessingMode(val); }}
                        size="small"
                        fullWidth
                        sx={{
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
                            value="ALL"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'none',
                                fontSize: '0.8125rem',
                                py: 0.85,
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&.Mui-selected': {
                                    bgcolor: '#ffffff',
                                    color: '#0f172a',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                }
                            }}
                        >
                            <BoltOutlinedIcon sx={{ fontSize: '18px', mr: 0.75, color: '#eab308' }} />
                            Áp dụng chung cho {currentGroupSelectedSerials.length} sê-ri đã chọn
                        </ToggleButton>
                        <ToggleButton
                            value="EACH"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'none',
                                fontSize: '0.8125rem',
                                py: 0.85,
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&.Mui-selected': {
                                    bgcolor: '#ffffff',
                                    color: '#0f172a',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                }
                            }}
                        >
                            <BorderColorOutlinedIcon sx={{ fontSize: '16px', mr: 0.75, color: '#3b82f6' }} />
                            Điền thông tin riêng từng sê-ri
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {allSelectedSerialsInternalFault && (
                        <Alert
                            severity="warning"
                            sx={{
                                mt: 1.5,
                                borderRadius: '12px',
                                '& .MuiAlert-message': { fontWeight: 600 },
                            }}
                        >
                            Dãy số {currentTicketNumbers} đồng thời sẽ bị hủy vì toàn bộ {eligibleCurrentSerials.length} sê-ri đều được báo sự cố vật lý.
                        </Alert>
                    )}
                </Box>
                )}

                {/* Group (Ticket Numbers) Switcher Header - Shown for multiple ticket groups */}
                {groups.length > 1 ? (
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 1.5, py: 1, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <Button 
                            size="small" 
                            disabled={activeGroupIndex === 0} 
                            onClick={() => { setActiveGroupIndex(i => i - 1); setPage(1); setRepPage(1); }}
                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}
                        >
                            ‹ Dãy trước
                        </Button>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ overflowX: 'auto', py: 0.5, maxWidth: '65%' }}>
                            {groups.map((g, idx) => (
                                <Chip
                                    key={g.ticketNumbers}
                                    label={`Dãy ${g.ticketNumbers}${g.ticketId ? ` (${g.serials.length})` : ''}`}
                                    color={idx === activeGroupIndex ? "primary" : "default"}
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
                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}
                        >
                            Dãy sau ›
                        </Button>
                    </Stack>
                ) : (
                    <Box sx={{ mb: 2, px: 1.5, py: 1, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            Hiển thị sê-ri cho dãy số {currentTicketNumbers}{currentTicketId ? ` (Vé #${currentTicketId})` : ''} ({currentSerials.length} sê-ri vật lý)
                        </Typography>
                    </Box>
                )}

                {/* ── 2. Form Khai báo sự cố chung ── */}
                {(cancelMode === 'TICKET' || serialProcessingMode === 'ALL') && (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: '14px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                            mb: 2.5,
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                    Thông tin sự cố
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {cancelMode === 'TICKET'
                                        ? `Khai báo sự cố cho toàn bộ dãy ${currentTicketNumbers}`
                                        : `Áp dụng chung cho ${currentGroupSelectedSerials.length} sê-ri đã chọn của dãy ${currentTicketNumbers}`}
                                </Typography>
                            </Box>
                            <Chip
                                label={cancelMode === 'TICKET' ? 'Toàn bộ dãy' : `${currentGroupSelectedSerials.length} sê-ri`}
                                size="small"
                                sx={{ fontWeight: 700, height: 22, color: '#0369a1', bgcolor: '#e0f2fe', borderColor: '#bae6fd' }}
                                variant="outlined"
                            />
                        </Stack>

                        <Stack spacing={2.5}>
                            {/* Nguyên nhân sự cố */}
                            {!hideFaultedBySelector && (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                        Nguyên nhân sự cố *
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
                                        <ToggleButton
                                            value="INTERNAL_FAULT"
                                            sx={{
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                fontSize: '0.8125rem',
                                                py: 0.75,
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                '&.Mui-selected': { bgcolor: '#ffffff', color: '#b91c1c', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                            }}
                                        >
                                            <HandymanOutlinedIcon sx={{ fontSize: '18px', mr: 0.75 }} />
                                            Sự cố vật lý
                                        </ToggleButton>
                                        <ToggleButton
                                            value="DATA_ENTRY_FAULT"
                                            sx={{
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                fontSize: '0.8125rem',
                                                py: 0.75,
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                '&.Mui-selected': { bgcolor: '#ffffff', color: '#b91c1c', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                            }}
                                        >
                                            <KeyboardAltOutlinedIcon sx={{ fontSize: '18px', mr: 0.75 }} />
                                            Lỗi thao tác nhập liệu
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                            )}

                            {/* Trạng thái báo hủy */}
                            <Box>
                                <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                    Trạng thái báo hủy *
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
                                        <ToggleButton value="VOIDED" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8125rem', py: 0.75, color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', '&.Mui-selected': { bgcolor: '#ffffff', color: '#b91c1c', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } }}>
                                            <CancelOutlinedIcon sx={{ fontSize: '18px', mr: 0.75 }} />
                                            Hủy do lỗi nhập liệu
                                        </ToggleButton>
                                    ) : (
                                        [
                                            <ToggleButton key="DAMAGED" value="DAMAGED" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8125rem', py: 0.75, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', '&.Mui-selected': { bgcolor: '#ffffff', color: '#b91c1c', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } }}>
                                                <ContentCutOutlinedIcon sx={{ fontSize: '18px', mr: 0.75 }} />
                                                Bị hư hỏng / rách
                                            </ToggleButton>,
                                            <ToggleButton key="LOST" value="LOST" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8125rem', py: 0.75, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', '&.Mui-selected': { bgcolor: '#ffffff', color: '#b91c1c', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } }}>
                                                <SearchOffOutlinedIcon sx={{ fontSize: '18px', mr: 0.75 }} />
                                                Thất lạc / Mất
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
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                                    {ticketForm.faultedBy === 'INTERNAL_FAULT' ? (
                                        ['Lỡ tay làm rách vé', 'Vé bị dính nước/bẩn', 'Mất vé khi kiểm kho'].map((sug) => (
                                            <Chip
                                                key={sug}
                                                label={sug}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleTicketFormFieldChange('damagedReason', sug)}
                                                sx={{
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.72rem',
                                                    bgcolor: '#f8fafc',
                                                    '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                                                }}
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
                                                sx={{
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.72rem',
                                                    bgcolor: '#f8fafc',
                                                    '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
                                                }}
                                            />
                                        ))
                                    )}
                                </Box>
                            </Box>

                            {/* Dãy số vé thay thế và ảnh vé thay thế khi cấp dãy số (cancelMode === 'TICKET') */}
                            {cancelMode === 'TICKET' && ticketForm.faultedBy === 'DATA_ENTRY_FAULT' && (
                                <Box sx={{ mt: 1.5, pt: 2, borderTop: '1px dashed #fecaca', bgcolor: '#fff5f5', p: 2, borderRadius: '10px', border: '1px solid #fee2e2' }}>
                                    <Typography variant="caption" fontWeight={800} color="#b91c1c" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.72rem' }}>
                                        Thông tin vé số thay thế *
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ display: 'block', mb: 1.5, fontSize: '0.72rem', lineHeight: 1.4 }}>
                                        (*) Tạo dãy số mới và chuyển toàn bộ sê-ri sang dãy đó (giữ nguyên số sê-ri, đổi ticketId). Dãy cũ được ẩn để đối soát.
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
                                            sx={{ bgcolor: '#ffffff', borderRadius: '10px' }}
                                        />
                                        <Box>
                                            <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
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

                            {/* Ảnh minh chứng (cho DAMAGED) */}
                            {ticketForm.status === 'DAMAGED' && (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                        Ảnh minh chứng sự cố {ticketForm.faultedBy === 'INTERNAL_FAULT' && <strong style={{ color: '#ef4444' }}>*</strong>}
                                    </Typography>
                                    {isTicketBatchFaultFlow && ticketBatchEvidenceMode === 'EACH' ? (
                                        <Typography variant="body2" color="#64748b" sx={{ fontSize: '0.8rem' }}>
                                            Vui lòng tải ảnh minh chứng cho từng sê-ri đã chọn bên dưới.
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
                        </Stack>
                    </Paper>
                )}

                {/* ── 3. Danh sách sê-ri ── */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: '14px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                        <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                            Danh sách sê-ri — Dãy {currentTicketNumbers}
                        </Typography>
                        <Chip
                            label={`${currentGroupSelectedSerials.length} / ${eligibleCurrentSerials.length} đã chọn`}
                            size="small"
                            sx={{ fontWeight: 700, height: 20, fontSize: '0.675rem', bgcolor: '#f1f5f9', color: '#475569' }}
                        />
                    </Stack>

                    {/* Sub-pagination if single ticket group has > 10 serials */}
                    {totalPages > 1 && (
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 1, bgcolor: '#f8fafc', p: 0.75, borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
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

                    <Stack spacing={1.25}>
                        {paginatedSerials.map((s) => {
                            const form = forms[s.id];
                            if (!form) return null;

                            const incidentEligible = isSerialIncidentEligible(s);
                            const isSelected = form.selected;

                            // Card Styling
                            let cardBg = '#ffffff';
                            let cardBorder = '1px solid #e2e8f0';
                            let cardShadow = 'none';

                            if (isSelected) {
                                cardBorder = '1.5px solid #3b82f6';
                                cardBg = '#f8faff';
                                cardShadow = '0 1px 4px rgba(59, 130, 246, 0.08)';
                            } else if (!incidentEligible) {
                                cardBg = '#f8fafc';
                                cardBorder = '1px dashed #cbd5e1';
                            }

                            return (
                                <Box 
                                    key={s.id} 
                                    sx={{ 
                                        p: 1.75, 
                                        border: cardBorder, 
                                        borderRadius: '12px', 
                                        bgcolor: cardBg,
                                        boxShadow: cardShadow,
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={form.selected}
                                                    onChange={(e) => handleFieldChange(s.id, 'selected', e.target.checked)}
                                                    disabled={!incidentEligible || cancelMode === 'TICKET'}
                                                    size="small"
                                                    sx={{
                                                        color: '#cbd5e1',
                                                        '&.Mui-checked': {
                                                            color: '#2563eb',
                                                        },
                                                    }}
                                                />
                                            }
                                            label={
                                                <Typography 
                                                    variant="body2" 
                                                    fontWeight={800} 
                                                    color={form.selected ? '#1d4ed8' : '#334155'}
                                                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
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

                                    {/* Evidence upload per serial in ALL mode */}
                                    {form.selected && incidentEligible && serialProcessingMode === 'ALL' && isTicketBatchFaultFlow && ticketForm.status === 'DAMAGED' && ticketBatchEvidenceMode === 'EACH' && (
                                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                                            <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                                Ảnh minh chứng <strong style={{ color: '#ef4444' }}>*</strong>
                                            </Typography>
                                            <UploadSingleFile
                                                value={serialEvidenceUrls[String(s.id)] || ''}
                                                onChange={(url) => handleSerialEvidenceChange(s.id, url)}
                                                autoUpload={true}
                                                compact={true}
                                            />
                                        </Box>
                                    )}

                                    {/* Inline Replacement Serial in ALL mode when DATA_ENTRY_FAULT and cancelMode is SERIAL */}
                                    {cancelMode === 'SERIAL' && form.selected && incidentEligible && serialProcessingMode === 'ALL' && ticketForm.faultedBy === 'DATA_ENTRY_FAULT' && (
                                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
                                            <Stack spacing={1.5}>
                                                <TextField
                                                    label="Số sê-ri thay thế"
                                                    variant="outlined"
                                                    fullWidth
                                                    size="small"
                                                    required
                                                    value={forms[s.id]?.replacementSerial || ''}
                                                    onChange={(e) => handleFieldChange(s.id, 'replacementSerial', e.target.value)}
                                                    placeholder="Ví dụ: IBSEED-..."
                                                    error={!!forms[s.id]?.errors.replacementSerial}
                                                    helperText={forms[s.id]?.errors.replacementSerial}
                                                    InputProps={{ sx: { borderRadius: '10px' } }}
                                                />
                                                <Box>
                                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
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
                                    )}

                                    {/* EACH Mode Form inside individual serial item */}
                                    {form.selected && serialProcessingMode === 'EACH' && incidentEligible && (
                                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
                                            <Stack spacing={2}>
                                                {/* Nguyên nhân sự cố - Toggle pills */}
                                                {!hideFaultedBySelector && (
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
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
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    '&.Mui-selected': {
                                                                        bgcolor: '#fff', 
                                                                        color: '#b91c1c', 
                                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                                                                    }
                                                                }}
                                                            >
                                                                <HandymanOutlinedIcon sx={{ fontSize: '16px', mr: 0.5 }} />
                                                                Sự cố vật lý
                                                            </ToggleButton>
                                                            <ToggleButton 
                                                                value="DATA_ENTRY_FAULT" 
                                                                sx={{ 
                                                                    fontWeight: 700, 
                                                                    textTransform: 'none', 
                                                                    fontSize: '0.8rem', 
                                                                    py: 0.75, 
                                                                    color: '#64748b', 
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    '&.Mui-selected': {
                                                                        bgcolor: '#fff', 
                                                                        color: '#b91c1c', 
                                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                                                                    }
                                                                }}
                                                            >
                                                                <KeyboardAltOutlinedIcon sx={{ fontSize: '16px', mr: 0.5 }} />
                                                                Lỗi thao tác nhập liệu
                                                            </ToggleButton>
                                                        </ToggleButtonGroup>
                                                    </Box>
                                                )}

                                                {/* Trạng thái báo hủy - Toggle pills */}
                                                <Box>
                                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
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
                                                                    color: '#b91c1c', 
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    '&.Mui-selected': {
                                                                        bgcolor: '#fff', 
                                                                        color: '#b91c1c', 
                                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                                                                    }
                                                                }}
                                                            >
                                                                <CancelOutlinedIcon sx={{ fontSize: '16px', mr: 0.5 }} />
                                                                Hủy do lỗi nhập liệu
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
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        '&.Mui-selected': {
                                                                            bgcolor: '#fff', 
                                                                            color: '#b91c1c', 
                                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                                                                        }
                                                                    }}
                                                                >
                                                                    <ContentCutOutlinedIcon sx={{ fontSize: '16px', mr: 0.5 }} />
                                                                    Bị hư hỏng / rách
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
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        '&.Mui-selected': {
                                                                            bgcolor: '#fff', 
                                                                            color: '#b91c1c', 
                                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                                                                        }
                                                                    }}
                                                                >
                                                                    <SearchOffOutlinedIcon sx={{ fontSize: '16px', mr: 0.5 }} />
                                                                    Thất lạc / Mất
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
                                                        {(form.faultedBy === 'INTERNAL_FAULT'
                                                            ? ['Lỡ tay làm rách vé', 'Vé bị dính nước/bẩn', 'Mất vé khi kiểm kho']
                                                            : ['Nhập sai số vé', 'Nhập nhầm đài/ngày', 'Nhập sai số sê-ri']
                                                        ).map((sug) => (
                                                            <Chip
                                                                key={sug}
                                                                label={sug}
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => handleFieldChange(s.id, 'damagedReason', sug)}
                                                                sx={{ borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', bgcolor: '#f8fafc', '&:hover': { bgcolor: '#f1f5f9' } }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </Box>

                                                {/* Link ảnh minh chứng */}
                                                {form.status === 'DAMAGED' && (
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
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

                                                {/* Số sê-ri thay thế khi VOIDED */}
                                                {form.status === 'VOIDED' && (
                                                    <TextField
                                                        label="Số sê-ri thay thế"
                                                        variant="outlined"
                                                        fullWidth
                                                        size="small"
                                                        required
                                                        value={form.replacementSerial || ''}
                                                        onChange={(e) => handleFieldChange(s.id, 'replacementSerial', e.target.value)}
                                                        placeholder="Ví dụ: IBSEED-..."
                                                        error={!!form.errors.replacementSerial}
                                                        helperText={form.errors.replacementSerial}
                                                        InputProps={{ sx: { borderRadius: '10px' } }}
                                                    />
                                                )}

                                                {/* Ảnh vé thay thế khi VOIDED */}
                                                {form.status === 'VOIDED' && (
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
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
                                                )}
                                            </Stack>
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>
                </Paper>
                </>
                )}
            </Box>

            {/* Action buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #e2e8f0' }}>
                <Button 
                    onClick={
                        workflowStep === 'REFUND'
                            ? () => setWorkflowStep('FORM')
                            : workflowStep === 'FORM'
                            ? goBackToScope
                            : onCancel
                    } 
                    disabled={submitting} 
                    variant="outlined" 
                    sx={{ 
                        borderRadius: '10px',
                        py: 1,
                        px: 3,
                        fontWeight: 700,
                        textTransform: 'none',
                        color: '#475569',
                        borderColor: '#cbd5e1',
                        '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                        minWidth: 120,
                    }}
                >
                    {workflowStep === 'SCOPE' ? (cancelButtonText || 'Hủy bỏ') : 'Quay lại'}
                </Button>
                {workflowStep === 'SCOPE' ? (
                    <Button
                        onClick={handleScopeContinue}
                        disabled={!scopeMode}
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
                ) : workflowStep === 'REFUND' ? (
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
                                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                                '&:hover': {
                                    bgcolor: '#dc2626',
                                }
                            }}
                        >
                            {submitting
                                ? 'Đang xử lý...'
                                : `Xác nhận báo sự cố (${cancelMode === 'TICKET' ? eligibleCurrentSerials.length : currentGroupSelectedSerials.length} sê-ri)`}
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
                                        {cancelMode === 'TICKET'
                                            ? `Hủy / xử lý sự cố toàn bộ dãy (#${currentTicketNumbers})`
                                            : `Hủy / xử lý sự cố ${getTargetSerialsForSubmit().length} sê-ri đã chọn`}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                        Nguyên nhân sự cố
                                    </Typography>
                                    <Chip 
                                        label={(cancelMode === 'TICKET' ? ticketForm.faultedBy : (serialProcessingMode === 'ALL' ? ticketForm.faultedBy : 'Đã chọn')) === 'DATA_ENTRY_FAULT' ? 'Lỗi thao tác nhập liệu' : 'Sự cố vật lý'} 
                                        size="small" 
                                        sx={{ 
                                            fontWeight: 800, 
                                            fontSize: '0.72rem',
                                            bgcolor: (cancelMode === 'TICKET' ? ticketForm.faultedBy : (serialProcessingMode === 'ALL' ? ticketForm.faultedBy : '')) === 'DATA_ENTRY_FAULT' ? '#fef2f2' : '#fff7ed',
                                            color: (cancelMode === 'TICKET' ? ticketForm.faultedBy : (serialProcessingMode === 'ALL' ? ticketForm.faultedBy : '')) === 'DATA_ENTRY_FAULT' ? '#ef4444' : '#c2410c',
                                            border: '1px solid',
                                            borderColor: (cancelMode === 'TICKET' ? ticketForm.faultedBy : (serialProcessingMode === 'ALL' ? ticketForm.faultedBy : '')) === 'DATA_ENTRY_FAULT' ? '#fecaca' : '#ffedd5'
                                        }} 
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                        Lý do chi tiết
                                    </Typography>
                                    <Typography variant="body2" color="#475569" sx={{ fontStyle: 'italic', bgcolor: '#ffffff', p: 1, borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                        "{serialProcessingMode === 'ALL' ? (ticketForm.damagedReason || 'Chưa nhập lý do') : 'Báo hủy theo từng thẻ vé riêng biệt'}"
                                    </Typography>
                                </Box>

                                <Box sx={{ pt: 0.5 }}>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.72rem', display: 'block', lineHeight: 1.3 }}>
                                        Trạng thái dãy số cũ: {cancelMode === 'TICKET' && ticketForm.faultedBy === 'DATA_ENTRY_FAULT'
                                            ? <>Dãy cũ bị ẩn (soft-delete). Toàn bộ sê-ri giữ nguyên số, chỉ đổi <strong style={{ color: '#ef4444' }}>ticketId</strong> sang dãy mới.</>
                                            : cancelMode === 'TICKET'
                                            ? <>Toàn bộ sê-ri của dãy chuyển <strong style={{ color: '#ef4444' }}>DAMAGED/LOST</strong>; dãy không còn bán được.</>
                                            : <>Sê-ri cũ <strong style={{ color: '#ef4444' }}>ticketCondition = VOIDED</strong> (status giữ IN_STOCK). Sê-ri mới giữ cùng ticketId, khác số sê-ri.</>}
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
                                            <OrderStatusBadge status={draft.orderStatus} />
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
