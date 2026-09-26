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
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
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
import { AdminLuckyDisplay } from '@/shared/lucky-number';
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

    const [serialProcessingMode, setSerialProcessingMode] = useState<'EACH' | 'ALL'>(
        defaultCancelMode === 'SERIAL' ? 'EACH' : 'ALL'
    );
    // 'TICKET' only when the user explicitly picks whole-ticket digit replacement for a data-entry fault.
    const [cancelMode, setCancelMode] = useState<'TICKET' | 'SERIAL'>('SERIAL');
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
        setWorkflowStep('FORM');
        setCancelMode('SERIAL');
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
        eligibleCurrentSerials.length > 0
        && eligibleCurrentSerials.every((s) => forms[s.id]?.selected)
        && selectedOutsideCurrentGroup === 0;
    const canChooseWholeTicketDigits =
        isFullTicketScope
        && serialProcessingMode === 'ALL'
        && ticketForm.faultedBy === 'DATA_ENTRY_FAULT'
        && Boolean(currentTicketId);

    useEffect(() => {
        if (!canChooseWholeTicketDigits && cancelMode === 'TICKET') {
            setCancelMode('SERIAL');
        }
    }, [canChooseWholeTicketDigits, cancelMode]);

    const isPhysicalFaultStatus = (status?: string) => status === 'DAMAGED' || status === 'LOST';
    const allSelectedSerialsPhysicalFault =
        isFullTicketScope
        && (
            serialProcessingMode === 'ALL'
                ? isPhysicalFaultStatus(ticketForm.status)
                : currentGroupSelectedSerials.every((s) => isPhysicalFaultStatus(forms[s.id]?.status))
        );

    const isTicketBatchFaultFlow =
        serialProcessingMode === 'ALL' &&
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
            const serialForm = forms[sItem.id];
            const formState = serialProcessingMode === 'ALL' ? ticketForm : serialForm;
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
                // Replacement serial inputs are always per serial, even when the incident reason is shared.
                replacementSerial: serialForm?.replacementSerial ?? '',
                replacementTicketImg: serialForm?.replacementTicketImg ?? '',
                damagedEvidenceUrl,
            };
        });

    const getTargetSerialsForSubmit = (): SerialItem[] =>
        serialProcessingMode === 'ALL'
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

    const canSubmit = serialProcessingMode === 'ALL'
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
        : currentGroupSelectedSerials.length > 0 && currentGroupSelectedSerials.every((s) => {
            const form = forms[s.id];
            if (!form?.selected) return true;
            if (form.status === 'VOIDED') {
                if (replacementType === 'DIGITS') {
                    return !!replacementDigits && replacementDigits.length === 6;
                }
                return !!form.replacementSerial?.trim() && !form.errors.replacementSerial;
            }
            return true;
        });

    const confirmButtonVisible = true;
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

        if (serialProcessingMode === 'ALL') {
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
            serials.filter((s) => forms[s.id]?.selected);

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
                ) : (
                <>
                {/* 1. Thanh tóm tắt phạm vi xử lý vé & sê-ri */}
                <Paper
                    variant="outlined"
                    sx={{
                        mb: 1.5,
                        p: 1.25,
                        borderRadius: '12px',
                        borderColor: isFullTicketScope ? '#86efac' : currentGroupSelectedSerials.length > 0 ? '#93c5fd' : '#fde68a',
                        bgcolor: isFullTicketScope ? '#f0fdf4' : currentGroupSelectedSerials.length > 0 ? '#eff6ff' : '#fffbeb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        boxShadow: isFullTicketScope ? '0 1px 3px rgba(22, 163, 74, 0.08)' : 'none',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: isFullTicketScope ? '#dcfce7' : currentGroupSelectedSerials.length > 0 ? '#dbeafe' : '#fef3c7',
                                color: isFullTicketScope ? '#16a34a' : currentGroupSelectedSerials.length > 0 ? '#1d4ed8' : '#d97706',
                                flexShrink: 0,
                            }}
                        >
                            {isFullTicketScope ? (
                                <CheckCircleRoundedIcon sx={{ fontSize: '22px' }} />
                            ) : currentGroupSelectedSerials.length > 0 ? (
                                <StyleOutlinedIcon sx={{ fontSize: '22px' }} />
                            ) : (
                                <WarningAmberRoundedIcon sx={{ fontSize: '22px' }} />
                            )}
                        </Box>
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Typography
                                    variant="body2"
                                    fontWeight={800}
                                    sx={{
                                        color: isFullTicketScope ? '#15803d' : currentGroupSelectedSerials.length > 0 ? '#1d4ed8' : '#b45309',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    {isFullTicketScope
                                        ? `Báo sự cố toàn bộ vé '${currentTicketNumbers}'`
                                        : currentGroupSelectedSerials.length > 0
                                        ? `Báo sự cố theo từng sê-ri của vé '${currentTicketNumbers}'`
                                        : `Chưa chọn sê-ri nào của vé '${currentTicketNumbers}'`}
                                </Typography>
                                <Chip
                                    label={`${currentGroupSelectedSerials.length}/${eligibleCurrentSerials.length} sê-ri`}
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        bgcolor: isFullTicketScope ? '#dcfce7' : currentGroupSelectedSerials.length > 0 ? '#dbeafe' : '#fef3c7',
                                        color: isFullTicketScope ? '#15803d' : currentGroupSelectedSerials.length > 0 ? '#1d4ed8' : '#b45309',
                                        border: `1px solid ${isFullTicketScope ? '#86efac' : currentGroupSelectedSerials.length > 0 ? '#93c5fd' : '#fde68a'}`,
                                    }}
                                />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.73rem' }}>
                                {isFullTicketScope
                                    ? `Đang áp dụng báo sự cố cho toàn bộ ${eligibleCurrentSerials.length} sê-ri của vé số. Vé này sẽ bị hủy toàn bộ dãy.`
                                    : currentGroupSelectedSerials.length > 0
                                    ? `Đang áp dụng báo sự cố cho ${currentGroupSelectedSerials.length} sê-ri đã chọn trong tổng số ${eligibleCurrentSerials.length} sê-ri đủ điều kiện của dãy.`
                                    : `Vui lòng tích chọn ít nhất một sê-ri bên dưới để thực hiện báo sự cố.`}
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            size="small"
                            variant="outlined"
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
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                borderRadius: '8px',
                                py: 0.4,
                                px: 1.25,
                                borderColor: isFullTicketScope ? '#86efac' : '#bfdbfe',
                                color: isFullTicketScope ? '#15803d' : '#1d4ed8',
                                bgcolor: '#ffffff',
                                '&:hover': {
                                    bgcolor: isFullTicketScope ? '#f0fdf4' : '#eff6ff',
                                    borderColor: isFullTicketScope ? '#16a34a' : '#2563eb',
                                },
                            }}
                        >
                            Chọn hết dãy
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
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
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                borderRadius: '8px',
                                py: 0.4,
                                px: 1.25,
                                borderColor: '#e2e8f0',
                                color: '#64748b',
                                bgcolor: '#ffffff',
                                '&:hover': {
                                    bgcolor: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    color: '#334155',
                                },
                            }}
                        >
                            Bỏ chọn
                        </Button>
                    </Stack>
                </Paper>

                {/* Cảnh báo khi báo sự cố toàn bộ vé */}
                {isFullTicketScope && (
                    <Alert
                        severity="warning"
                        icon={<WarningAmberRoundedIcon sx={{ color: '#d97706', fontSize: '20px' }} />}
                        sx={{
                            mb: 2,
                            borderRadius: '12px',
                            bgcolor: '#fffbeb',
                            border: '1px solid #fde68a',
                            color: '#92400e',
                            py: 1,
                            px: 1.75,
                            '& .MuiAlert-message': { fontSize: '0.825rem', lineHeight: 1.5 },
                        }}
                    >
                        <Typography variant="body2" fontWeight={800} color="#b45309" sx={{ mb: 0.25, fontSize: '0.85rem' }}>
                            Lưu ý khi báo sự cố toàn bộ vé:
                        </Typography>
                        {`Vì toàn bộ ${eligibleCurrentSerials.length}/${eligibleCurrentSerials.length} sê-ri của vé số đều được chọn, vé này sẽ bị hủy toàn bộ. Các đơn hàng có chứa vé này sẽ được hoàn tiền.`}
                    </Alert>
                )}

                {/* 2. Nút chuyển đổi: Báo cáo lý do chung cho các vé hoặc Lý do cụ thể cho từng vé */}
                <Box sx={{ mb: 2 }}>
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
                            border: '1px solid #e2e8f0',
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
                                fontSize: '0.825rem',
                                py: 0.9,
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.75,
                                '&.Mui-selected': {
                                    bgcolor: '#ffffff',
                                    color: '#0f172a',
                                    fontWeight: 800,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                                }
                            }}
                        >
                            <BoltOutlinedIcon sx={{ fontSize: '18px', color: serialProcessingMode === 'ALL' ? '#f59e0b' : '#94a3b8' }} />
                            Báo cáo lý do chung cho các vé ({currentGroupSelectedSerials.length} sê-ri)
                        </ToggleButton>
                        <ToggleButton
                            value="EACH"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'none',
                                fontSize: '0.825rem',
                                py: 0.9,
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.75,
                                '&.Mui-selected': {
                                    bgcolor: '#ffffff',
                                    color: '#0f172a',
                                    fontWeight: 800,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                                }
                            }}
                        >
                            <BorderColorOutlinedIcon sx={{ fontSize: '16px', color: serialProcessingMode === 'EACH' ? '#2563eb' : '#94a3b8' }} />
                            Lý do cụ thể cho từng vé
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {allSelectedSerialsPhysicalFault && (
                        <Alert
                            severity="warning"
                            sx={{
                                mt: 1.5,
                                borderRadius: '10px',
                                '& .MuiAlert-message': { fontWeight: 600, fontSize: '0.8rem' },
                            }}
                        >
                            Dãy số {currentTicketNumbers} đồng thời sẽ bị hủy vì toàn bộ {eligibleCurrentSerials.length} sê-ri đều được báo sự cố vật lý. Lý do hủy dãy sẽ được ghi nhận theo lý do của các sê-ri.
                        </Alert>
                    )}
                </Box>

                {/* Group (Ticket Numbers) Switcher Header - Shown for multiple ticket groups */}
                {groups.length > 1 && (
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
                )}

                {/* ── 3. Form Khai báo sự cố chung (Khi chọn 'Báo cáo lý do chung cho các vé') ── */}
                {serialProcessingMode === 'ALL' && (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                            mb: 2,
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.75, pb: 1.25, borderBottom: '1px solid #f1f5f9' }}>
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: '#fff1f2',
                                        color: '#e11d48',
                                        border: '1px solid #ffe4e6',
                                    }}
                                >
                                    <ReportProblemOutlinedIcon sx={{ fontSize: '18px' }} />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.875rem' }}>
                                        Thông tin sự cố (Áp dụng chung)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                        {`Áp dụng chung cho ${currentGroupSelectedSerials.length} sê-ri đã chọn của vé ${currentTicketNumbers}`}
                                    </Typography>
                                </Box>
                            </Stack>
                            <Chip
                                label={`${currentGroupSelectedSerials.length} sê-ri`}
                                size="small"
                                sx={{ fontWeight: 800, height: 22, color: '#0369a1', bgcolor: '#e0f2fe', borderColor: '#bae6fd', fontSize: '0.7rem' }}
                                variant="outlined"
                            />
                        </Stack>

                        <Stack spacing={1.5}>
                            {/* Row 1: Nguyên nhân sự cố & Trạng thái báo hủy (Chỉ hiện Trạng thái khi KHÔNG phải lỗi nhập liệu) */}
                            <Grid container spacing={1.5}>
                                {!hideFaultedBySelector && (
                                    <Grid size={{ xs: 12, sm: ticketForm.faultedBy === 'DATA_ENTRY_FAULT' ? 6 : 6 }}>
                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                            Nguyên nhân sự cố *
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={ticketForm.faultedBy}
                                            exclusive
                                            onChange={(e, val) => { if (val) handleTicketFormFieldChange('faultedBy', val); }}
                                            size="small"
                                            fullWidth
                                            sx={{
                                                bgcolor: '#f8fafc',
                                                p: 0.35,
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                '& .MuiToggleButtonGroup-grouped': {
                                                    border: 'none',
                                                    borderRadius: '6px !important',
                                                }
                                            }}
                                        >
                                            <ToggleButton
                                                value="INTERNAL_FAULT"
                                                sx={{
                                                    fontWeight: 700,
                                                    textTransform: 'none',
                                                    fontSize: '0.78rem',
                                                    py: 0.65,
                                                    color: '#64748b',
                                                    '&.Mui-selected': { bgcolor: '#ffffff', color: '#dc2626', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                                }}
                                            >
                                                <HandymanOutlinedIcon sx={{ fontSize: '16px', mr: 0.75 }} />
                                                Sự cố vật lý
                                            </ToggleButton>
                                            <ToggleButton
                                                value="DATA_ENTRY_FAULT"
                                                sx={{
                                                    fontWeight: 700,
                                                    textTransform: 'none',
                                                    fontSize: '0.78rem',
                                                    py: 0.65,
                                                    color: '#64748b',
                                                    '&.Mui-selected': { bgcolor: '#ffffff', color: '#2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                                }}
                                            >
                                                <KeyboardAltOutlinedIcon sx={{ fontSize: '16px', mr: 0.75 }} />
                                                Lỗi thao tác nhập liệu
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </Grid>
                                )}

                                {ticketForm.faultedBy !== 'DATA_ENTRY_FAULT' && (
                                    <Grid size={{ xs: 12, sm: hideFaultedBySelector ? 12 : 6 }}>
                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                            Trạng thái báo hủy *
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={ticketForm.status}
                                            exclusive
                                            onChange={(e, val) => { if (val) handleTicketFormFieldChange('status', val); }}
                                            size="small"
                                            fullWidth
                                            sx={{
                                                bgcolor: '#f8fafc',
                                                p: 0.35,
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                '& .MuiToggleButtonGroup-grouped': {
                                                    border: 'none',
                                                    borderRadius: '6px !important',
                                                }
                                            }}
                                        >
                                            <ToggleButton
                                                value="DAMAGED"
                                                sx={{
                                                    fontWeight: 700,
                                                    textTransform: 'none',
                                                    fontSize: '0.78rem',
                                                    py: 0.65,
                                                    color: '#64748b',
                                                    '&.Mui-selected': { bgcolor: '#ffffff', color: '#dc2626', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                                }}
                                            >
                                                <ContentCutOutlinedIcon sx={{ fontSize: '16px', mr: 0.75 }} />
                                                Bị hư hỏng / rách
                                            </ToggleButton>
                                            <ToggleButton
                                                value="LOST"
                                                sx={{
                                                    fontWeight: 700,
                                                    textTransform: 'none',
                                                    fontSize: '0.78rem',
                                                    py: 0.65,
                                                    color: '#64748b',
                                                    '&.Mui-selected': { bgcolor: '#ffffff', color: '#d97706', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                                }}
                                            >
                                                <SearchOffOutlinedIcon sx={{ fontSize: '16px', mr: 0.75 }} />
                                                Thất lạc / Mất
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </Grid>
                                )}
                            </Grid>

                            {/* Row 2: Lý do chi tiết & gợi ý nhanh */}
                            <Box>
                                <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                    Lý do chi tiết *
                                </Typography>
                                <TextField
                                    placeholder={
                                        ticketForm.faultedBy === 'DATA_ENTRY_FAULT'
                                            ? "Nhập lý do lỗi nhập liệu hoặc chọn gợi ý bên dưới..."
                                            : "Nhập lý do chi tiết hoặc chọn gợi ý bên dưới..."
                                    }
                                    fullWidth
                                    size="small"
                                    required={ticketForm.status === 'LOST' || ticketForm.status === 'VOIDED' || (ticketForm.faultedBy === 'INTERNAL_FAULT' && ticketForm.status === 'DAMAGED')}
                                    value={ticketForm.damagedReason}
                                    onChange={(e) => handleTicketFormFieldChange('damagedReason', e.target.value)}
                                    error={!!ticketForm.errors.damagedReason}
                                    helperText={ticketForm.errors.damagedReason}
                                    InputProps={{ 
                                        sx: { 
                                            borderRadius: '8px', 
                                            fontSize: '0.85rem',
                                            bgcolor: '#ffffff',
                                        } 
                                    }}
                                />
                                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.75 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                        Gợi ý nhanh:
                                    </Typography>
                                    {(ticketForm.faultedBy === 'INTERNAL_FAULT'
                                        ? ['Lỡ tay làm rách vé', 'Vé bị dính nước/bẩn', 'Mất vé khi kiểm kho', 'Vé bị nhòe số/mờ mực']
                                        : ['Nhập sai số vé', 'Nhập nhầm đài/ngày', 'Nhập sai số sê-ri']
                                    ).map((sug) => {
                                        const isSelected = ticketForm.damagedReason === sug;
                                        return (
                                            <Chip
                                                key={sug}
                                                label={sug}
                                                size="small"
                                                onClick={() => handleTicketFormFieldChange('damagedReason', sug)}
                                                sx={{
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    height: 24,
                                                    fontSize: '0.72rem',
                                                    bgcolor: isSelected ? (ticketForm.faultedBy === 'DATA_ENTRY_FAULT' ? '#eff6ff' : '#fee2e2') : '#f8fafc',
                                                    borderColor: isSelected ? (ticketForm.faultedBy === 'DATA_ENTRY_FAULT' ? '#93c5fd' : '#fca5a5') : '#e2e8f0',
                                                    color: isSelected ? (ticketForm.faultedBy === 'DATA_ENTRY_FAULT' ? '#1d4ed8' : '#b91c1c') : '#475569',
                                                    border: '1px solid',
                                                    fontWeight: isSelected ? 700 : 500,
                                                    transition: 'all 0.15s ease',
                                                    '&:hover': { 
                                                        bgcolor: isSelected ? undefined : '#f1f5f9', 
                                                        borderColor: '#cbd5e1' 
                                                    }
                                                }}
                                            />
                                        );
                                    })}
                                </Stack>
                            </Box>

                            {canChooseWholeTicketDigits && (
                                <Box sx={{ pt: 0.25 }}>
                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                        Cách xử lý vé thay thế *
                                    </Typography>
                                    <ToggleButtonGroup
                                        value={cancelMode}
                                        exclusive
                                        size="small"
                                        fullWidth
                                        onChange={(e, val) => { if (val) setCancelMode(val); }}
                                        sx={{
                                            bgcolor: '#f8fafc',
                                            p: 0.35,
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            '& .MuiToggleButtonGroup-grouped': {
                                                border: 'none',
                                                borderRadius: '6px !important',
                                            },
                                            '& .MuiToggleButton-root': {
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                fontSize: '0.78rem',
                                                py: 0.65,
                                                color: '#64748b',
                                            },
                                            '& .MuiToggleButton-root.Mui-selected': {
                                                bgcolor: '#ffffff',
                                                color: '#0f172a',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                            },
                                        }}
                                    >
                                        <ToggleButton value="SERIAL">Cấp sê-ri thay thế cho từng sê-ri</ToggleButton>
                                        <ToggleButton value="TICKET">Thay dãy số mới cho toàn bộ vé</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                            )}

                            {/* Dãy số vé thay thế và ảnh vé thay thế khi người dùng chọn thay dãy số cho toàn bộ vé */}
                            {cancelMode === 'TICKET' && ticketForm.faultedBy === 'DATA_ENTRY_FAULT' && (
                                <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                        <ConfirmationNumberOutlinedIcon sx={{ fontSize: '18px', color: '#2563eb' }} />
                                        <Typography variant="caption" fontWeight={800} color="#1e293b" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.72rem' }}>
                                            Thông tin dãy số thay thế *
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            (Chuyển toàn bộ sê-ri sang dãy mới, dãy cũ chuyển lưu trữ)
                                        </Typography>
                                    </Stack>
                                    <Grid container spacing={1.5} alignItems="flex-start">
                                        <Grid size={{ xs: 12, sm: 6 }}>
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
                                                inputProps={{ maxLength: 6, style: { fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 700 } }}
                                                InputProps={{ sx: { bgcolor: '#ffffff', borderRadius: '8px' } }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Box>
                                                <Typography variant="caption" fontWeight={600} color="#64748b" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
                                                    Ảnh vé thay thế
                                                </Typography>
                                                <UploadSingleFile
                                                    value={replacementDigitsImg}
                                                    onChange={(url) => setReplacementDigitsImg(url)}
                                                    autoUpload={true}
                                                    compact={true}
                                                />
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* Ảnh minh chứng (cho DAMAGED) */}
                            {ticketForm.status === 'DAMAGED' && (
                                <Box sx={{ pt: 0.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                            Ảnh minh chứng sự cố
                                        </Typography>
                                        {ticketForm.faultedBy === 'INTERNAL_FAULT' && (
                                            <Chip label="Bắt buộc" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#fee2e2', color: '#b91c1c' }} />
                                        )}
                                    </Stack>
                                    {isTicketBatchFaultFlow && ticketBatchEvidenceMode === 'EACH' ? (
                                        <Typography variant="body2" color="#64748b" sx={{ fontSize: '0.78rem', bgcolor: '#f8fafc', p: 1, borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                            Đang áp dụng tải ảnh riêng lẻ. Vui lòng tải ảnh minh chứng cho từng sê-ri bên dưới danh sách.
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

                {/* ── 4. Danh sách sê-ri ── */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        borderRadius: '14px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                    }}
                >
                    <Stack 
                        direction="row" 
                        alignItems="center" 
                        justifyContent="space-between" 
                        flexWrap="wrap" 
                        gap={1} 
                        sx={{ 
                            mb: 1.5, 
                            pb: 1.25, 
                            borderBottom: '1px solid #f1f5f9',
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={eligibleCurrentSerials.length > 0 && currentGroupSelectedSerials.length === eligibleCurrentSerials.length}
                                    indeterminate={currentGroupSelectedSerials.length > 0 && currentGroupSelectedSerials.length < eligibleCurrentSerials.length}
                                    onChange={() => {
                                        const isAllSelected = eligibleCurrentSerials.length > 0 && currentGroupSelectedSerials.length === eligibleCurrentSerials.length;
                                        const shouldSelectAll = !isAllSelected;
                                        setForms((prev) => {
                                            const next = { ...prev };
                                            serials.forEach((s) => {
                                                if (!next[s.id]) return;
                                                const numKey = s.ticketNumbers || ticketNumbers || 'Vé số';
                                                const inCurrent = numKey === currentTicketNumbers;
                                                if (inCurrent) {
                                                    next[s.id] = {
                                                        ...next[s.id],
                                                        selected: shouldSelectAll && isSerialIncidentEligible(s),
                                                    };
                                                }
                                            });
                                            return next;
                                        });
                                    }}
                                    disabled={eligibleCurrentSerials.length === 0}
                                    size="small"
                                    sx={{
                                        p: 0.5,
                                        mr: 0.75,
                                        color: '#94a3b8',
                                        '&.Mui-checked': { color: '#2563eb' },
                                        '&.MuiCheckbox-indeterminate': { color: '#2563eb' },
                                    }}
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="caption" fontWeight={850} color="#0f172a" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.78rem' }}>
                                        Chọn toàn bộ sê-ri — Dãy {currentTicketNumbers}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                        {serialProcessingMode === 'ALL'
                                            ? 'Các sê-ri được chọn sẽ áp dụng chung thông tin sự cố ở trên'
                                            : 'Khai báo thông tin sự cố riêng biệt cho từng sê-ri bên dưới'}
                                    </Typography>
                                </Box>
                            }
                            sx={{ m: 0, alignItems: 'center' }}
                        />

                        <Stack direction="row" spacing={1} alignItems="center">
                            {serialProcessingMode === 'EACH' && currentGroupSelectedSerials.length > 1 && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        const firstSelected = currentGroupSelectedSerials[0];
                                        const firstForm = forms[firstSelected.id];
                                        if (!firstForm) return;
                                        setForms((prev) => {
                                            const next = { ...prev };
                                            currentGroupSelectedSerials.forEach((s) => {
                                                if (s.id !== firstSelected.id && next[s.id]) {
                                                    next[s.id] = {
                                                        ...next[s.id],
                                                        faultedBy: firstForm.faultedBy,
                                                        status: firstForm.status,
                                                        damagedReason: firstForm.damagedReason,
                                                        damagedEvidenceUrl: firstForm.damagedEvidenceUrl,
                                                    };
                                                }
                                            });
                                            return next;
                                        });
                                        AppToast.success('Đã sao chép lý do sự cố từ sê-ri đầu tiên cho các sê-ri còn lại');
                                    }}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        py: 0.3,
                                        px: 1,
                                        borderColor: '#cbd5e1',
                                        color: '#334155',
                                        '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
                                    }}
                                >
                                    Sao chép sê-ri #1 sang các sê-ri còn lại
                                </Button>
                            )}
                            <Chip
                                label={`${currentGroupSelectedSerials.length} / ${eligibleCurrentSerials.length} đã chọn`}
                                size="small"
                                sx={{
                                    fontWeight: 800,
                                    height: 24,
                                    fontSize: '0.72rem',
                                    bgcolor: currentGroupSelectedSerials.length === eligibleCurrentSerials.length ? '#dcfce7' : currentGroupSelectedSerials.length > 0 ? '#eff6ff' : '#f1f5f9',
                                    color: currentGroupSelectedSerials.length === eligibleCurrentSerials.length ? '#15803d' : currentGroupSelectedSerials.length > 0 ? '#1d4ed8' : '#64748b',
                                    border: `1px solid ${currentGroupSelectedSerials.length === eligibleCurrentSerials.length ? '#86efac' : currentGroupSelectedSerials.length > 0 ? '#bfdbfe' : '#e2e8f0'}`,
                                }}
                            />
                        </Stack>
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
                                        p: 1.5, 
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
                                                    disabled={!incidentEligible}
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
                                        
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <SerialStatusChip status={s.status} ticketCondition={s.ticketCondition} />
                                            {s.reservedByOrderId && (
                                                <Chip
                                                    label={`Đơn #${s.reservedByOrderId}`}
                                                    size="small"
                                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e' }}
                                                />
                                            )}
                                            {isSelected && serialProcessingMode === 'ALL' && (
                                                <Chip
                                                    label="Áp dụng lý do chung"
                                                    size="small"
                                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
                                                />
                                            )}
                                        </Stack>
                                    </Stack>

                                    {/* Evidence upload per serial in ALL mode */}
                                    {form.selected && incidentEligible && serialProcessingMode === 'ALL' && isTicketBatchFaultFlow && ticketForm.status === 'DAMAGED' && ticketBatchEvidenceMode === 'EACH' && (
                                        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: '1px solid #f1f5f9' }}>
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

                                    {/* Inline Replacement Serial in ALL mode when DATA_ENTRY_FAULT */}
                                    {form.selected && incidentEligible && serialProcessingMode === 'ALL' && ticketForm.faultedBy === 'DATA_ENTRY_FAULT' && cancelMode !== 'TICKET' && (
                                        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: '1px solid #e2e8f0' }}>
                                            <Stack spacing={1.25}>
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
                                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
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

                                    {/* EACH Mode Form inside individual serial item - Compact 2-column layout */}
                                    {form.selected && serialProcessingMode === 'EACH' && incidentEligible && (
                                        <Box sx={{ mt: 1.25, pt: 1.25, borderTop: '1px solid #e2e8f0' }}>
                                            <Stack spacing={1.5}>
                                                {/* 2 cột: Nguyên nhân sự cố & Trạng thái báo hủy */}
                                                <Grid container spacing={1.5}>
                                                    {!hideFaultedBySelector && (
                                                        <Grid size={{ xs: 12, sm: 6 }}>
                                                            <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.68rem' }}>
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
                                                                    p: 0.3,
                                                                    borderRadius: '8px',
                                                                    border: 'none',
                                                                    '& .MuiToggleButtonGroup-grouped': {
                                                                        border: 'none',
                                                                        borderRadius: '6px !important',
                                                                    }
                                                                }}
                                                            >
                                                                <ToggleButton 
                                                                    value="INTERNAL_FAULT" 
                                                                    sx={{ 
                                                                        fontWeight: 700, 
                                                                        textTransform: 'none', 
                                                                        fontSize: '0.75rem', 
                                                                        py: 0.5, 
                                                                        color: '#64748b', 
                                                                        '&.Mui-selected': { bgcolor: '#fff', color: '#b91c1c', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } 
                                                                    }}
                                                                >
                                                                    <HandymanOutlinedIcon sx={{ fontSize: '15px', mr: 0.5 }} />
                                                                    Sự cố vật lý
                                                                </ToggleButton>
                                                                <ToggleButton 
                                                                    value="DATA_ENTRY_FAULT" 
                                                                    sx={{ 
                                                                        fontWeight: 700, 
                                                                        textTransform: 'none', 
                                                                        fontSize: '0.75rem', 
                                                                        py: 0.5, 
                                                                        color: '#64748b', 
                                                                        '&.Mui-selected': { bgcolor: '#fff', color: '#2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } 
                                                                    }}
                                                                >
                                                                    <KeyboardAltOutlinedIcon sx={{ fontSize: '15px', mr: 0.5 }} />
                                                                    Lỗi nhập liệu
                                                                </ToggleButton>
                                                            </ToggleButtonGroup>
                                                        </Grid>
                                                    )}

                                                    {form.faultedBy !== 'DATA_ENTRY_FAULT' && (
                                                        <Grid size={{ xs: 12, sm: hideFaultedBySelector ? 12 : 6 }}>
                                                            <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.68rem' }}>
                                                                Trạng thái báo hủy
                                                            </Typography>
                                                            <ToggleButtonGroup
                                                                value={form.status}
                                                                exclusive
                                                                onChange={(e, val) => { if (val) handleFieldChange(s.id, 'status', val); }}
                                                                size="small"
                                                                fullWidth
                                                                sx={{
                                                                    bgcolor: '#f1f5f9',
                                                                    p: 0.3,
                                                                    borderRadius: '8px',
                                                                    border: 'none',
                                                                    '& .MuiToggleButtonGroup-grouped': {
                                                                        border: 'none',
                                                                        borderRadius: '6px !important',
                                                                    }
                                                                }}
                                                            >
                                                                <ToggleButton 
                                                                    value="DAMAGED" 
                                                                    sx={{ 
                                                                        fontWeight: 700, 
                                                                        textTransform: 'none', 
                                                                        fontSize: '0.75rem', 
                                                                        py: 0.5, 
                                                                        color: '#64748b', 
                                                                        '&.Mui-selected': { bgcolor: '#fff', color: '#b91c1c', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } 
                                                                    }}
                                                                >
                                                                    <ContentCutOutlinedIcon sx={{ fontSize: '15px', mr: 0.5 }} />
                                                                    Bị hư hỏng / rách
                                                                </ToggleButton>
                                                                <ToggleButton 
                                                                    value="LOST" 
                                                                    sx={{ 
                                                                        fontWeight: 700, 
                                                                        textTransform: 'none', 
                                                                        fontSize: '0.75rem', 
                                                                        py: 0.5, 
                                                                        color: '#64748b', 
                                                                        '&.Mui-selected': { bgcolor: '#fff', color: '#d97706', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } 
                                                                    }}
                                                                >
                                                                    <SearchOffOutlinedIcon sx={{ fontSize: '15px', mr: 0.5 }} />
                                                                    Thất lạc / Mất
                                                                </ToggleButton>
                                                            </ToggleButtonGroup>
                                                        </Grid>
                                                    )}
                                                </Grid>

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
                                                            sx: { borderRadius: '8px', fontSize: '0.825rem' }
                                                        }}
                                                    />
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
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
                                                                sx={{ borderRadius: '6px', cursor: 'pointer', fontSize: '0.68rem', height: 22, bgcolor: '#f8fafc', '&:hover': { bgcolor: '#f1f5f9' } }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </Box>

                                                {/* Link ảnh minh chứng */}
                                                {form.status === 'DAMAGED' && (
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.68rem' }}>
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
                                                        InputProps={{ sx: { borderRadius: '8px' } }}
                                                    />
                                                )}

                                                {/* Ảnh vé thay thế khi VOIDED */}
                                                {form.status === 'VOIDED' && (
                                                    <Box>
                                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.68rem' }}>
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
                            disabled={confirmButtonDisabled || currentGroupSelectedSerials.length === 0} 
                            variant="contained" 
                            fullWidth
                            sx={{ 
                                borderRadius: '10px',
                                py: 1.1,
                                fontWeight: 800,
                                textTransform: 'none',
                                fontSize: '0.875rem',
                                bgcolor: '#ef4444',
                                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                                '&:hover': {
                                    bgcolor: '#dc2626',
                                    boxShadow: '0 4px 10px rgba(220, 38, 38, 0.35)',
                                },
                                '&.Mui-disabled': {
                                    bgcolor: '#f1f5f9',
                                    color: '#94a3b8',
                                }
                            }}
                        >
                            {submitting
                                ? 'Đang xử lý...'
                                : currentGroupSelectedSerials.length === 0
                                ? 'Vui lòng chọn ít nhất 1 sê-ri'
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

            {/* Confirmation Modal */}
            {(() => {
                const targetSerialsList = getTargetSerialsForSubmit();
                const isReplacingWholeTicket = cancelMode === 'TICKET' && ticketForm.faultedBy === 'DATA_ENTRY_FAULT' && replacementType === 'DIGITS' && Boolean(replacementDigits);
                const serialsWithReplacement = targetSerialsList.filter(s => Boolean(forms[s.id]?.replacementSerial?.trim()));
                const isReplacingIndividualSerials = replacementType === 'SERIALS' && serialsWithReplacement.length > 0;
                const hasAnyReplacement = isReplacingWholeTicket || isReplacingIndividualSerials;

                return (
                    <Dialog 
                        open={confirmOpen} 
                        onClose={() => setConfirmOpen(false)}
                        maxWidth="lg"
                        fullWidth
                        PaperProps={{
                            sx: { 
                                borderRadius: '18px', 
                                p: 1.5, 
                                maxWidth: hasAnyReplacement ? '860px' : '580px', 
                                width: hasAnyReplacement ? '860px' : '100%',
                                transition: 'all 0.2s ease',
                            }
                        }}
                    >
                        <DialogTitle sx={{ pb: 1, pt: 1, px: 2 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box sx={{ bgcolor: '#fee2e2', borderRadius: '50%', p: 1, display: 'flex', color: '#ef4444' }}>
                                        <ReportProblemIcon sx={{ fontSize: '1.35rem' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={850} color="#0f172a" sx={{ fontSize: '1.05rem', lineHeight: 1.25 }}>
                                            {hasAnyReplacement ? 'Xác nhận báo cáo sự cố & thay thế vé số' : 'Xác nhận báo cáo sự cố vé số'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                            Vui lòng kiểm tra kỹ các thông tin trước khi xác nhận xử lý
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
                            <Box sx={{ display: 'grid', gridTemplateColumns: hasAnyReplacement ? '1fr 1fr' : '1fr', gap: 2 }}>
                                {/* Cột 1: Thông tin vé / sê-ri báo sự cố */}
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', borderColor: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                        <Chip label="Vé báo sự cố" size="small" sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }} />
                                        <Typography variant="subtitle1" fontWeight={900} color="#0f172a" sx={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.5px' }}>
                                            #{currentTicketNumbers}
                                        </Typography>
                                    </Stack>

                                    <Divider />

                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                            Phạm vi áp dụng
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} color="#1e293b">
                                            {cancelMode === 'TICKET' || isFullTicketScope
                                                ? `Báo sự cố toàn bộ vé (${targetSerialsList.length} sê-ri)`
                                                : `Báo sự cố ${targetSerialsList.length} sê-ri đã chọn`}
                                        </Typography>
                                    </Box>

                                    {/* Danh sách các sê-ri được chọn nếu chọn một vài sê-ri */}
                                    {(!isFullTicketScope && targetSerialsList.length > 0 && targetSerialsList.length <= 10) && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.5 }}>
                                                Các sê-ri áp dụng (${targetSerialsList.length}):
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {targetSerialsList.map(s => (
                                                    <Chip
                                                        key={s.id}
                                                        label={s.serialNumber}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            fontSize: '0.68rem',
                                                            fontFamily: 'monospace',
                                                            fontWeight: 700,
                                                            bgcolor: '#ffffff',
                                                            border: '1px solid #cbd5e1',
                                                            color: '#334155',
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    )}

                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                            Nguyên nhân sự cố
                                        </Typography>
                                        <Chip 
                                            label={(ticketForm.faultedBy === 'DATA_ENTRY_FAULT') ? 'Lỗi thao tác nhập liệu' : 'Sự cố vật lý'} 
                                            size="small" 
                                            sx={{ 
                                                fontWeight: 800, 
                                                fontSize: '0.72rem',
                                                bgcolor: (ticketForm.faultedBy === 'DATA_ENTRY_FAULT') ? '#eff6ff' : '#fef2f2',
                                                color: (ticketForm.faultedBy === 'DATA_ENTRY_FAULT') ? '#1d4ed8' : '#b91c1c',
                                                border: '1px solid',
                                                borderColor: (ticketForm.faultedBy === 'DATA_ENTRY_FAULT') ? '#bfdbfe' : '#fecaca'
                                            }} 
                                        />
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                            Lý do chi tiết
                                        </Typography>
                                        <Typography variant="body2" color="#334155" sx={{ fontStyle: 'italic', bgcolor: '#ffffff', p: 1, borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                                            "{serialProcessingMode === 'ALL' ? (ticketForm.damagedReason || 'Chưa nhập lý do') : 'Khai báo theo từng sê-ri riêng lẻ'}"
                                        </Typography>
                                    </Box>

                                    {/* Ảnh minh chứng đính kèm (nếu có) */}
                                    {ticketForm.damagedEvidenceUrl && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                                Ảnh minh chứng
                                            </Typography>
                                            <Typography variant="caption" color="#16a34a" fontWeight={700}>
                                                ✓ Đã tải lên ảnh minh chứng sự cố
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Hệ quả xử lý - Ngôn ngữ nghiệp vụ thân thiện */}
                                    <Box sx={{ mt: 'auto', pt: 0.75 }}>
                                        <Box sx={{ bgcolor: '#ffffff', p: 1.25, borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <Typography variant="caption" color="#64748b" fontWeight={750} sx={{ display: 'block', mb: 0.25, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                                                Hệ quả xử lý:
                                            </Typography>
                                            <Typography variant="caption" color="#334155" sx={{ fontSize: '0.73rem', display: 'block', lineHeight: 1.45 }}>
                                                {isReplacingWholeTicket ? (
                                                    <>Dãy số cũ sẽ được chuyển sang trạng thái lưu trữ đối soát; toàn bộ các vé sê-ri được tự động chuyển sang dãy số mới.</>
                                                ) : allSelectedSerialsPhysicalFault || isFullTicketScope ? (
                                                    <>Toàn bộ <strong>${eligibleCurrentSerials.length} sê-ri</strong> của dãy số sẽ bị hủy bỏ và ngừng phát hành. Các đơn hàng có liên quan sẽ được tự động xử lý hoàn tiền.</>
                                                ) : (
                                                    <>Chỉ <strong>${targetSerialsList.length} sê-ri</strong> đã chọn bị ghi nhận sự cố và hủy bỏ. Các sê-ri còn lại trong dãy vẫn có thể phát hành bình thường.</>
                                                )}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>

                                {/* Cột 2: Chỉ hiển thị khi CÓ vé / sê-ri thay thế mới */}
                                {hasAnyReplacement && (
                                    <Paper 
                                        variant="outlined" 
                                        sx={{ 
                                            p: 2, 
                                            borderRadius: '12px', 
                                            bgcolor: '#f0fdf4', 
                                            borderColor: '#bbf7d0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1.5,
                                        }}
                                    >
                                        {isReplacingWholeTicket ? (
                                            <>
                                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                    <Chip label="Dãy số thay thế mới" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                                    <Typography variant="subtitle2" fontWeight={800} color="#15803d">
                                                        Tạo mới dãy vé
                                                    </Typography>
                                                </Stack>

                                                <Divider sx={{ borderColor: '#bbf7d0' }} />

                                                <Box>
                                                    <Typography variant="caption" color="#166534" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                                        Dãy số vé mới sẽ tạo
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight={900} color="#16a34a" sx={{ letterSpacing: '2px', fontFamily: 'monospace' }}>
                                                        {replacementDigits || 'Chưa nhập'}
                                                    </Typography>
                                                </Box>

                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                                        Số lượng sê-ri chuyển mới
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={800} color="#1e293b">
                                                        {currentSerials.length} sê-ri vật lý
                                                    </Typography>
                                                </Box>

                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.25 }}>
                                                        Ảnh minh chứng vé mới
                                                    </Typography>
                                                    <Typography variant="body2" color="#475569">
                                                        {replacementDigitsImg ? 'Đã tải lên ảnh vé mới' : 'Không có ảnh đính kèm'}
                                                    </Typography>
                                                </Box>

                                                <Box sx={{ mt: 'auto', bgcolor: '#ffffff', p: 1.25, borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                                    <Typography variant="caption" color="#166534" fontWeight={750} sx={{ display: 'block', mb: 0.25, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                                        Lưu vết đối soát hệ thống:
                                                    </Typography>
                                                    <Typography variant="caption" color="#475569" sx={{ fontSize: '0.7rem', display: 'block', lineHeight: 1.35 }}>
                                                        Hệ thống tự động liên kết đối soát giữa dãy cũ và dãy mới, đảm bảo tính minh bạch kế toán.
                                                    </Typography>
                                                </Box>
                                            </>
                                        ) : isReplacingIndividualSerials ? (
                                            <>
                                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                    <Chip label="Sê-ri thay thế cấp mới" size="small" color="success" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                                                    <Typography variant="subtitle2" fontWeight={800} color="#15803d">
                                                        {serialsWithReplacement.length} sê-ri cấp bù
                                                    </Typography>
                                                </Stack>

                                                <Divider sx={{ borderColor: '#bbf7d0' }} />

                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', fontSize: '0.68rem', mb: 0.75 }}>
                                                        Danh sách sê-ri thay thế:
                                                    </Typography>
                                                    <Stack spacing={0.75} sx={{ maxHeight: '200px', overflowY: 'auto', pr: 0.5 }}>
                                                        {serialsWithReplacement.map((s) => (
                                                            <Box
                                                                key={s.id}
                                                                sx={{
                                                                    p: 1,
                                                                    borderRadius: '8px',
                                                                    bgcolor: '#ffffff',
                                                                    border: '1px solid #bbf7d0',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: 1,
                                                                }}
                                                            >
                                                                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>
                                                                    {s.serialNumber}
                                                                </Typography>
                                                                <Typography variant="caption" color="#16a34a" fontWeight={800}>
                                                                    ➔
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#15803d' }}>
                                                                    {forms[s.id]?.replacementSerial}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                </Box>

                                                <Box sx={{ mt: 'auto', bgcolor: '#ffffff', p: 1.25, borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                                    <Typography variant="caption" color="#166534" fontWeight={750} sx={{ display: 'block', mb: 0.25, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                                        Lưu vết đối soát hệ thống:
                                                    </Typography>
                                                    <Typography variant="caption" color="#475569" sx={{ fontSize: '0.7rem', display: 'block', lineHeight: 1.35 }}>
                                                        Các sê-ri mới sẽ thay thế trực tiếp vào vị trí sê-ri cũ trong hệ thống để tiếp tục phát hành.
                                                    </Typography>
                                                </Box>
                                            </>
                                        ) : null}
                                    </Paper>
                                )}
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
                                sx={{ 
                                    borderRadius: '10px',
                                    py: 0.85,
                                    px: 2.5,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: '#475569',
                                    borderColor: '#cbd5e1',
                                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' }
                                }}
                            >
                                Quay lại chỉnh sửa
                            </Button>
                            <Button 
                                onClick={handleConfirmSubmit} 
                                disabled={submitting} 
                                variant="contained" 
                                sx={{ 
                                    borderRadius: '10px',
                                    py: 0.85,
                                    px: 3,
                                    fontWeight: 800,
                                    textTransform: 'none',
                                    bgcolor: '#ef4444',
                                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                                    '&:hover': {
                                        bgcolor: '#dc2626',
                                    }
                                }}
                            >
                                {submitting ? 'Đang xử lý...' : 'Đồng ý & Tiến hành báo hủy'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
            })()}
        </Paper>
    );
};
