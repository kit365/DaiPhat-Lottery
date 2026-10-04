"use client";

import React, { useEffect, useMemo, useState, Fragment } from 'react';
import dayjs from 'dayjs';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';
import { AppToast } from '../../../../../../utils/toast.util';
import type {
    SettlementAdjustmentReasonCode,
    SettlementOverviewImportBatch,
    SettlementResolvableSerial,
} from '../../types/supplierSettlement.type';
import { formatSettlementMoney } from '../../utils/settlementCashflow';
import { getReturnBatchCutOffDisplay, isReturnBatchOverdue } from '../../utils/settlementLabels';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import {
    MissingTicketSourceDialog,
    type MissingTicketCandidate,
} from './MissingTicketSourceDialog';

interface ImportDiscrepancyPanelProps {
    serials: SettlementResolvableSerial[];
    inventoryByStation?: Array<{ lotteryStationId: number; lotteryStationName?: string | null; remainingQuantity?: number; importedQuantity?: number }>;
    importBatches?: SettlementOverviewImportBatch[];
    supplierId: number;
    settlementReceiptUrl?: string | null;
    drawDate?: string | null;
    returnCutOffContext?: {
        drawDate?: string | null;
        returnCutOffTime?: string | null;
        returnCutOffAt?: string | null;
        inspectionExpired?: boolean | null;
    } | null;
    reconciliationWindowStartAt?: string | null;
    inReconciliationWindow?: boolean | null;
    loading?: boolean;
    submitting?: boolean;
    direction: 'POSITIVE' | 'NEGATIVE';
    difference?: number;
    onDirtyChange?: (isDirty: boolean) => void;
    collapsed?: boolean;
    onBackToEdit?: () => void;
    onResolve: (payload: {
        serialIds?: number[];
        ticketCondition?: 'DAMAGED' | 'LOST' | 'VOIDED' | 'UNDER_IMPORTED' | null;
        reasonCode: SettlementAdjustmentReasonCode;
        adjustmentAmount?: number;
        note?: string;
        markResolved: boolean;
        missingPlaceholders?: Array<{
            lotteryStationId: number | null;
            quantity: number;
            ticketCondition?: 'DAMAGED' | 'LOST' | 'VOIDED' | 'UNDER_IMPORTED';
            numbers?: string;
            serialNumber?: string;
            evidenceUrl?: string;
        }>;
        excessTickets?: Array<{ lotteryStationId: number; numbers: string; serialNumber: string }>;
        damagedEvidenceUrl?: string | null;
    }) => void;
}

type TicketSerialInput = {
    serialNumber: string;
    evidenceUrl: string;
    condition: 'UNDER_IMPORTED' | 'DAMAGED';
};

type TicketGroup = { 
    numbers: string; 
    serials: TicketSerialInput[]; 
};

type LostTicketEntry = {
    id: string;
    lotteryStationId: number | null;
    quantity: number;
};

type MissingTicketCondition = 'UNDER_IMPORTED' | 'DAMAGED' | 'LOST';
type AllocationStation = {
    lotteryStationId: number;
    lotteryStationName?: string | null;
    remainingQuantity?: number;
    importedQuantity?: number;
    extra?: boolean;
};


const formatNumberWithDots = (val?: number | string | null): string => {
    if (val === '' || val === null || val === undefined) return '';
    const digits = String(val).replace(/\D/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toLocaleString('vi-VN');
};

const isLikelyImageUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const path = url.split('?')[0].toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(path);
};

const importBatchReceiptUrl = (batch: SettlementOverviewImportBatch) =>
    batch.invoiceEvidenceUrl || batch.receiptImageUrl || batch.evidenceUrl || '';

const isValidTicketNumbers = (value: string) => /^\d{6}$/.test(value.trim());
const isValidTicketSerial = (value: string) => /^(?:[A-Za-z]\d+|\d+[A-Za-z])$/.test(value.trim());

export const ImportDiscrepancyPanel = ({
    serials: rawSerials,
    inventoryByStation = [],
    importBatches = [],
    supplierId,
    settlementReceiptUrl,
    drawDate,
    returnCutOffContext,
    reconciliationWindowStartAt,
    inReconciliationWindow,
    loading,
    submitting,
    direction,
    difference,
    onResolve,
    onDirtyChange,
    collapsed = false,
    onBackToEdit,
}: ImportDiscrepancyPanelProps) => {
    // The difference is actual − system. A negative value means the system has
    // recorded more imported tickets than were actually received.
    const isShortage = direction === 'NEGATIVE';
    const canActOnSerials = isShortage;
    // Keep stale/client-cached responses from presenting tickets that the API no
    // longer considers eligible. The API repeats these checks on confirmation.
    const serials = useMemo(
        () => rawSerials.filter((serial) => (
            (serial.status === 'IN_STOCK' || serial.status === 'EXPIRED')
            && serial.ticketCondition === 'GOOD'
        )),
        [rawSerials]
    );
    const totalDiff = Math.abs(Number(difference ?? serials.length));

    const [mode, setMode] = useState<'EXISTING' | 'MISSING' | 'EXCESS'>(isShortage ? 'EXISTING' : 'MISSING');
    const [selected, setSelected] = useState<number[]>([]);
    const [condition, setCondition] = useState<'LOST' | 'DAMAGED' | 'VOIDED' | ''>('LOST');
    const [reasonCode, setReasonCode] = useState<SettlementAdjustmentReasonCode>(
        isShortage ? 'MISSING_IMPORT' : 'INSUFFICIENT_IMPORT'
    );
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const otherReasonRequiresNote = reasonCode === 'OTHER' && note.trim().length === 0;

    // Missing placeholders: per-station qty split by condition
    const [lostTickets, setLostTickets] = useState<LostTicketEntry[]>([]);
    const [ticketDetails, setTicketDetails] = useState<Record<number, TicketGroup[]>>({});
    const [expandedStations, setExpandedStations] = useState<number[]>([]);
    const [expandedRanges, setExpandedRanges] = useState<string[]>([]);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);
    const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
    const allocationStations = useMemo<AllocationStation[]>(() => {
        const seen = new Set<number>();
        const rows: AllocationStation[] = [];
        inventoryByStation.forEach((s) => {
            seen.add(s.lotteryStationId);
            rows.push({ ...s, extra: false });
        });
        return rows;
    }, [inventoryByStation]);

    // Excess state
    const [excessStationId, setExcessStationId] = useState<number | ''>(() => {
        return inventoryByStation[0]?.lotteryStationId || '';
    });
    const [excessNumbers, setExcessNumbers] = useState('');
    const [excessSerial, setExcessSerial] = useState('');
    const [excessRows, setExcessRows] = useState<
        Array<{ lotteryStationId: number; numbers: string; serialNumber: string }>
    >([]);

    // Filter & Search states for EXISTING mode
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBatchKey, setSelectedBatchKey] = useState<string>('ALL');
    const [selectedStation, setSelectedStation] = useState<string>('ALL');
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [receiptPreview, setReceiptPreview] = useState<{ url: string; title: string } | null>(null);
    const [receiptListOpen, setReceiptListOpen] = useState(false);
    const [ticketImageToDelete, setTicketImageToDelete] = useState<{ stationId: number; groupIdx: number; serialIdx: number; serialNumber: string } | null>(null);
    const [expandedImportedRanges, setExpandedImportedRanges] = useState<string[]>([]);
    const [cutoffTick, setCutoffTick] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => setCutoffTick((value) => value + 1), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const isReturnCutOffReached = useMemo(
        () => isReturnBatchOverdue(returnCutOffContext, undefined, drawDate),
        [returnCutOffContext, drawDate, cutoffTick]
    );
    const isPaymentWindowReached = useMemo(() => {
        if (reconciliationWindowStartAt) {
            const startAt = dayjs(reconciliationWindowStartAt);
            return startAt.isValid() && !dayjs().isBefore(startAt);
        }
        return inReconciliationWindow === true;
    }, [reconciliationWindowStartAt, inReconciliationWindow, cutoffTick]);
    const isImportedTicketListUnlocked = isReturnCutOffReached && isPaymentWindowReached;
    const importedTicketCutOffDisplay = useMemo(
        () => getReturnBatchCutOffDisplay(returnCutOffContext, undefined, drawDate),
        [returnCutOffContext, drawDate]
    );
    const isImportedTicketListLocked = !isImportedTicketListUnlocked;
    const paymentWindowDisplay = reconciliationWindowStartAt
        ? dayjs(reconciliationWindowStartAt).format('HH:mm DD/MM/YYYY')
        : 'chưa xác định';

    const importReceiptItems = useMemo(
        () =>
            importBatches
                .map((batch) => ({
                    id: batch.id,
                    label: batch.batchCode || `Lô nhập #${batch.id}`,
                    url: importBatchReceiptUrl(batch),
                }))
                .filter((item): item is { id: number; label: string; url: string } => Boolean(item.url)),
        [importBatches]
    );
    const hasImportReceipt = importReceiptItems.length > 0;
    const hasSettlementReceipt = Boolean(settlementReceiptUrl?.trim());

    const openEvidence = (url: string, title: string) => {
        if (isLikelyImageUrl(url)) {
            setReceiptPreview({ url, title });
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const batchTabs = useMemo(() => {
        const countById = new Map<number, number>();
        const codeById = new Map<number, string>();
        serials.forEach((s) => {
            if (s.importBatchId == null) return;
            countById.set(s.importBatchId, (countById.get(s.importBatchId) || 0) + 1);
            if (s.importBatchCode) {
                codeById.set(s.importBatchId, s.importBatchCode);
            }
        });

        const fromSerials = Array.from(countById.entries())
            .map(([id, count]) => {
                const overview = importBatches.find((b) => b.id === id);
                const code = overview?.batchCode || codeById.get(id) || null;
                return { key: String(id), id, label: code || '', count };
            })
            .sort((a, b) => a.id - b.id)
            .map((item, index) => ({
                ...item,
                label: item.label || `Lô nhập ${index + 1}`,
            }));

        if (fromSerials.length > 0) {
            return fromSerials;
        }

        return importBatches.map((batch, index) => ({
            key: String(batch.id),
            id: batch.id,
            label: batch.batchCode || `Lô nhập ${index + 1}`,
            count: 0,
        }));
    }, [serials, importBatches]);

    const serialsInSelectedBatch = useMemo(() => {
        if (selectedBatchKey === 'ALL') return serials;
        const batchId = Number(selectedBatchKey);
        return serials.filter((s) => Number(s.importBatchId) === batchId);
    }, [serials, selectedBatchKey]);

    const stationList = useMemo(() => {
        const map = new Map<string, number>();
        serialsInSelectedBatch.forEach((s) => {
            const name = s.stationName || 'Chưa phân đài';
            map.set(name, (map.get(name) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    }, [serialsInSelectedBatch]);

    useEffect(() => {
        if (selectedStation === 'ALL') return;
        const stillExists = stationList.some((s) => s.name === selectedStation);
        if (!stillExists) {
            setSelectedStation('ALL');
        }
    }, [stationList, selectedStation]);

    useEffect(() => {
        if (selected.length === 0 && showOnlySelected) {
            setShowOnlySelected(false);
        }
    }, [selected.length, showOnlySelected]);

    useEffect(() => {
        setPage(0);
    }, [searchQuery, selectedStation, selectedBatchKey, showOnlySelected]);

    const filteredSerials = useMemo(() => {
        return serialsInSelectedBatch.filter((s) => {
            if (showOnlySelected && !selected.includes(s.serialId)) {
                return false;
            }

            const matchSearch =
                !searchQuery.trim() ||
                s.serialNumber.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                (s.numbers && s.numbers.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
                (s.stationName && s.stationName.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
                (s.importBatchCode && s.importBatchCode.toLowerCase().includes(searchQuery.trim().toLowerCase()));

            const matchStation =
                selectedStation === 'ALL' ||
                (s.stationName ? s.stationName === selectedStation : selectedStation === 'Chưa phân đài');

            return matchSearch && matchStation;
        });
    }, [serialsInSelectedBatch, searchQuery, selectedStation, showOnlySelected, selected]);

    const groupedFilteredSerials = useMemo(() => {
        const groups = new Map<string, { key: string; numbers: string; stationName: string; batchLabel: string; importCost: number; serials: SettlementResolvableSerial[] }>();
        filteredSerials.forEach((serial) => {
            const numbers = serial.numbers?.trim() || 'Chưa có dãy số';
            const batchLabel = serial.importBatchCode
                || (serial.importBatchId != null ? `Lô #${serial.importBatchId}` : '—');
            const stationName = serial.stationName || 'Chưa phân đài';
            const key = `${numbers}::${stationName}::${batchLabel}`;
            const existing = groups.get(key);
            if (existing) {
                existing.serials.push(serial);
                return;
            }
            groups.set(key, {
                key,
                numbers,
                stationName,
                batchLabel,
                importCost: Number(serial.importCost || 0),
                serials: [serial],
            });
        });
        return Array.from(groups.values());
    }, [filteredSerials]);

    const paginatedGroups = useMemo(() => {
        const start = page * rowsPerPage;
        return groupedFilteredSerials.slice(start, start + rowsPerPage);
    }, [groupedFilteredSerials, page, rowsPerPage]);

    const filteredIds = useMemo(() => filteredSerials.map((s) => s.serialId), [filteredSerials]);

    const isAllFilteredSelected =
        canActOnSerials && filteredIds.length > 0 && filteredIds.every((id) => selected.includes(id));
    const isSomeFilteredSelected =
        canActOnSerials && filteredIds.some((id) => selected.includes(id)) && !isAllFilteredSelected;

    const toggleSelectAllFiltered = () => {
        if (!canActOnSerials) return;
        if (isAllFilteredSelected) {
            setSelected((prev) => prev.filter((id) => !filteredIds.includes(id)));
        } else {
            const unselectedFiltered = filteredIds.filter((id) => !selected.includes(id));
            const availableSlots = totalDiff > 0 ? totalDiff - selected.length : Infinity;
            if (unselectedFiltered.length > availableSlots) {
                AppToast.warning(
                    `Không thể chọn tất cả (${unselectedFiltered.length} vé) vì vượt quá số lượng cần xử lý (${totalDiff.toLocaleString('vi-VN')} vé).`
                );
                return;
            }
            setSelected((prev) => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const toggle = (id: number) => {
        if (!canActOnSerials) return;
        setSelected((prev) => {
            if (prev.includes(id)) {
                return prev.filter((x) => x !== id);
            }
            if (totalDiff > 0 && prev.length >= totalDiff) {
                AppToast.warning(`Chỉ được chọn tối đa ${totalDiff.toLocaleString('vi-VN')} vé cần xử lý chênh lệch.`);
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleToggleGroup = (ids: number[]) => {
        if (!canActOnSerials) return;
        const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
        if (allSelected) {
            setSelected((current) => current.filter((id) => !ids.includes(id)));
        } else {
            const unselectedInGroup = ids.filter((id) => !selected.includes(id));
            const availableSlots = totalDiff > 0 ? totalDiff - selected.length : Infinity;
            if (unselectedInGroup.length > availableSlots) {
                AppToast.warning(
                    `Không thể chọn cả nhóm (${unselectedInGroup.length} vé) vì vượt quá số lượng cần xử lý (${totalDiff.toLocaleString('vi-VN')} vé). Vui lòng mở rộng nhóm để chọn từng vé lẻ.`
                );
                return;
            }
            setSelected((current) => Array.from(new Set([...current, ...ids])));
        }
    };

    // Calculate sum of import costs for all selected tickets
    const selectedCostSum = useMemo(() => {
        return serials
            .filter((s) => selected.includes(s.serialId))
            .reduce((sum, s) => sum + Number(s.importCost || 0), 0);
    }, [serials, selected]);
    const isSelectedQtyExact = selected.length === totalDiff;

    const handleApplySelectedCost = () => {
        if (selectedCostSum > 0) {
            setAmount(formatNumberWithDots(selectedCostSum));
        }
    };

    const missingPlaceholders = useMemo(() => {
        const rows: Array<{ lotteryStationId: number | null; quantity: number; ticketCondition: MissingTicketCondition; numbers?: string; serialNumber?: string; evidenceUrl?: string }> = [];
        allocationStations.forEach((s) => {
            const groups = ticketDetails[s.lotteryStationId] || [];
            if (groups.length > 0) {
                groups.forEach((group) => {
                    group.serials.forEach((serial) => {
                        rows.push({
                            lotteryStationId: s.lotteryStationId,
                            quantity: 1,
                            ticketCondition: serial.condition,
                            numbers: group.numbers,
                            serialNumber: serial.serialNumber,
                            evidenceUrl: serial.evidenceUrl,
                        });
                    });
                });
            }
        });

        lostTickets.forEach((entry) => {
            if (entry.quantity > 0) rows.push({
                lotteryStationId: entry.lotteryStationId,
                quantity: entry.quantity,
                ticketCondition: 'LOST',
            });
        });

        return rows;
    }, [allocationStations, ticketDetails, lostTickets]);

    const missingQtyByCondition = useMemo(() => {
        const totals = { underImported: 0, damaged: 0, lost: 0 };
        missingPlaceholders.forEach((row) => {
            if (row.ticketCondition === 'UNDER_IMPORTED') totals.underImported += row.quantity;
            if (row.ticketCondition === 'DAMAGED') totals.damaged += row.quantity;
            if (row.ticketCondition === 'LOST') totals.lost += row.quantity;
        });
        return totals;
    }, [missingPlaceholders]);

    const missingQtyEntered = useMemo(
        () => missingPlaceholders.reduce((sum, row) => sum + row.quantity, 0),
        [missingPlaceholders]
    );

    useEffect(() => {
        onDirtyChange?.(missingQtyEntered > 0);
    }, [missingQtyEntered, onDirtyChange]);

    const missingQtyRemaining = totalDiff - missingQtyEntered;
    const isMissingQtyExact = totalDiff > 0 && missingQtyEntered === totalDiff;
    const hasInvalidTicketDetails = Object.values(ticketDetails).some((groups) => groups.some((group) =>
        !isValidTicketNumbers(group.numbers)
        || group.serials.some((serial) => !isValidTicketSerial(serial.serialNumber))
    ));
    
    const isValidMissing = useMemo(() => {
        if (!isMissingQtyExact || missingPlaceholders.length === 0) return false;
        for (const stationId of Object.keys(ticketDetails)) {
            const groups = ticketDetails[Number(stationId)];
            if (!groups) continue;
                for (const group of groups) {
                if (!isValidTicketNumbers(group.numbers)) return false;
                for (const serial of group.serials) {
                    if (!isValidTicketSerial(serial.serialNumber)) return false;
                    if (serial.condition === 'DAMAGED' && !serial.evidenceUrl.trim()) return false;
                }
            }
        }
        return true;
    }, [isMissingQtyExact, missingPlaceholders.length, ticketDetails]);

    const handleLostTickets = ({ quantity, lotteryStationId }: { quantity: number; lotteryStationId: number | null }) => {
        if (quantity <= 0 || quantity > missingQtyRemaining) {
            AppToast.error(`Chỉ còn được bổ sung tối đa ${Math.max(0, missingQtyRemaining)} vé.`);
            return;
        }
        setLostTickets((current) => [
            ...current,
            { id: `lost-${Date.now()}-${current.length}`, lotteryStationId, quantity },
        ]);
        if (lotteryStationId != null) {
            setExpandedStations((current) => current.includes(lotteryStationId) ? current : [...current, lotteryStationId]);
        }
        AppToast.success(`Đã thêm ${quantity} vé thất thoát vào chi tiết vé.`);
    };

    const handleSourceTickets = (tickets: MissingTicketCandidate[]) => {
        if (tickets.length === 0) return;
        const invalidTicket = tickets.find((ticket) => !isValidTicketNumbers(ticket.numbers) || !isValidTicketSerial(ticket.serialNumber));
        if (invalidTicket) {
            AppToast.error(`${invalidTicket.stationName}: dãy số phải đủ 6 chữ số; sê-ri phải gồm dãy số và đúng 1 chữ cái ở đầu hoặc cuối.`);
            return;
        }
        const requestedByStation = new Map<number, number>();
        tickets.forEach((ticket) => requestedByStation.set(
            ticket.lotteryStationId,
            (requestedByStation.get(ticket.lotteryStationId) || 0) + 1
        ));
        const validationErrors: string[] = [];
        requestedByStation.forEach((requested, stationId) => {
            const allocation = allocationStations.find((row) => row.lotteryStationId === stationId);
            if (!allocation) {
                validationErrors.push(`Nhà đài #${stationId} không có trong danh sách phân bổ.`);
                return;
            }
            const current = (ticketDetails[stationId] || []).reduce((sum, group) => sum + group.serials.length, 0);
            const limit = Math.max(0, Number(allocation.importedQuantity || 0));
            if (current + requested > limit) {
                validationErrors.push(`${allocation.lotteryStationName || `Đài #${stationId}`}: chỉ còn có thể bổ sung ${Math.max(0, limit - current)} vé.`);
            }
        });
        if (tickets.length > missingQtyRemaining) {
            validationErrors.push(`Chỉ còn được bổ sung ${Math.max(0, missingQtyRemaining)} vé cho phiên đối soát.`);
        }
        if (validationErrors.length > 0) {
            AppToast.error(validationErrors.join(' '));
            return;
        }
        setTicketDetails((prev) => {
            const next: Record<number, TicketGroup[]> = JSON.parse(JSON.stringify(prev));
            tickets.forEach((ticket) => {
                const groups = next[ticket.lotteryStationId] || [];
                const existingSerials = new Set(groups.flatMap((group) => group.serials.map((serial) => serial.serialNumber)));
                if (existingSerials.has(ticket.serialNumber)) return;
                let group = groups.find((item) => item.numbers === ticket.numbers);
                if (!group) {
                    group = { numbers: ticket.numbers, serials: [] };
                    groups.push(group);
                }
                group.serials.push({
                    serialNumber: ticket.serialNumber,
                    evidenceUrl: ticket.evidenceUrl || '',
                    condition: 'UNDER_IMPORTED',
                });
                next[ticket.lotteryStationId] = groups;
            });
            return next;
        });
        setExpandedStations((current) => Array.from(new Set([
            ...current,
            ...tickets.map((ticket) => ticket.lotteryStationId),
        ])));
        AppToast.success(`Đã đưa ${tickets.length} vé vào danh sách phân bổ.`);
    };

    const tabSx = {
        minHeight: 40,
        '& .MuiTab-root': {
            minHeight: 40,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: '#64748b',
            py: 0.75,
            px: 2,
            '&.Mui-selected': {
                color: '#2563eb',
                fontWeight: 800,
            },
        },
        '& .MuiTabs-indicator': {
            backgroundColor: '#2563eb',
            height: 3,
            borderRadius: '3px 3px 0 0',
        },
    } as const;

    if (collapsed) {
        return (
            <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: '12px', borderColor: '#bbf7d0', bgcolor: '#f0fdf4' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <CheckCircleOutlinedIcon sx={{ color: '#16a34a' }} />
                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#166534">
                                Đã xác nhận tạm xử lý chênh lệch vé nhập
                            </Typography>
                            <Typography variant="caption" color="#15803d">
                                Dữ liệu đang được giữ trên màn hình và chưa lưu lên hệ thống.
                            </Typography>
                        </Box>
                    </Stack>
                    <Button variant="outlined" startIcon={<ArrowBackOutlinedIcon />} onClick={onBackToEdit} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}>
                        Quay lại
                    </Button>
                </Stack>
            </Paper>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
            }}
        >
            {/* Header */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
            >
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: '10px',
                            bgcolor: isShortage ? '#fffbeb' : '#fef2f2',
                            color: isShortage ? '#d97706' : '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: `1px solid ${isShortage ? '#fde68a' : '#fecaca'}`,
                        }}
                    >
                        <Inventory2OutlinedIcon sx={{ fontSize: '1.3rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                            {isShortage ? 'Xử lý hệ thống ghi thừa vé nhập' : 'Xử lý hệ thống ghi thiếu vé nhập'}
                        </Typography>
                        <Typography variant="caption" color="#64748b" sx={{ mt: 0.25, display: 'block', maxWidth: 720 }}>
                            {isShortage
                                ? 'Chọn đúng số sê-ri hệ thống ghi thừa, sau đó ghi tình trạng và lý do xử lý.'
                                : 'Phân bổ vé còn thiếu theo nhà đài; có thể lấy nhanh từ OCR, tệp hoặc nhập tay.'}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Tooltip
                        title={
                            hasImportReceipt
                                ? 'Xem ảnh / file biên lai nhập'
                                : 'Chưa có ảnh / file biên lai nhập'
                        }
                    >
                        <span>
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={!hasImportReceipt}
                                startIcon={<ReceiptLongOutlinedIcon />}
                                onClick={() => {
                                    if (importReceiptItems.length === 1) {
                                        openEvidence(
                                            importReceiptItems[0].url,
                                            `Biên lai nhập — ${importReceiptItems[0].label}`
                                        );
                                        return;
                                    }
                                    setReceiptListOpen(true);
                                }}
                                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px', bgcolor: '#ffffff' }}
                            >
                                Xem ảnh / file biên lai nhập
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip
                        title={
                            hasSettlementReceipt
                                ? 'Xem ảnh / file biên lai đối soát'
                                : 'Chưa có ảnh / file biên lai đối soát'
                        }
                    >
                        <span>
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={!hasSettlementReceipt}
                                startIcon={<DescriptionOutlinedIcon />}
                                onClick={() => {
                                    const url = settlementReceiptUrl?.trim();
                                    if (!url) return;
                                    openEvidence(url, 'Biên lai đối soát');
                                }}
                                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px', bgcolor: '#ffffff' }}
                            >
                                Xem ảnh / file biên lai đối soát
                            </Button>
                        </span>
                    </Tooltip>
                    <AdminStatusBadge
                        label={`${isShortage ? 'Hệ thống ghi thừa' : 'Hệ thống ghi thiếu'} ${totalDiff.toLocaleString('vi-VN')} vé`}
                        modifier={isShortage ? 'admin-status-badge--pending' : 'admin-status-badge--inactive'}
                    />
                </Stack>
            </Stack>

            <Divider sx={{ mb: 2, borderColor: '#f1f5f9' }} />

            {/* Mode Switch Tabs (Segmented Control Pill Bar) */}
            {isShortage ? (
                <Box
                    sx={{
                        display: 'none',
                        bgcolor: '#f1f5f9',
                        p: 0.5,
                        borderRadius: '12px',
                        gap: 0.75,
                        mb: 2.5,
                        flexDirection: { xs: 'column', sm: 'row' },
                    }}
                >
                    <ButtonBase
                        onClick={() => setMode('MISSING')}
                        sx={{
                            flex: 1,
                            py: 1.25,
                            px: 2,
                            borderRadius: '9px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            bgcolor: mode === 'MISSING' ? '#ffffff' : 'transparent',
                            color: mode === 'MISSING' ? '#ea580c' : '#64748b',
                            boxShadow: mode === 'MISSING' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                            '&:hover': {
                                bgcolor: mode === 'MISSING' ? '#ffffff' : '#e2e8f0',
                            },
                        }}
                    >
                        <PostAddOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                        <span>Ghi nhận vé hệ thống ghi thừa theo nhà đài</span>
                        <Chip
                            size="small"
                            label="Khuyên dùng"
                            sx={{
                                height: 20,
                                fontSize: '0.675rem',
                                fontWeight: 800,
                                bgcolor: mode === 'MISSING' ? '#ffedd5' : '#e2e8f0',
                                color: mode === 'MISSING' ? '#c2410c' : '#64748b',
                            }}
                        />
                    </ButtonBase>

                    <ButtonBase
                        onClick={() => setMode('EXISTING')}
                        sx={{
                            flex: 1,
                            py: 1.25,
                            px: 2,
                            borderRadius: '9px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            bgcolor: mode === 'EXISTING' ? '#ffffff' : 'transparent',
                            color: mode === 'EXISTING' ? '#2563eb' : '#64748b',
                            boxShadow: mode === 'EXISTING' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                            '&:hover': {
                                bgcolor: mode === 'EXISTING' ? '#ffffff' : '#e2e8f0',
                            },
                        }}
                    >
                        <FormatListBulletedOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                        <span>Xem sê-ri hiện có trong kho</span>
                        {serials.length > 0 && (
                            <Chip
                                size="small"
                                label={`${serials.length} vé`}
                                sx={{
                                    height: 20,
                                    fontSize: '0.675rem',
                                    fontWeight: 800,
                                    bgcolor: mode === 'EXISTING' ? '#dbeafe' : '#e2e8f0',
                                    color: mode === 'EXISTING' ? '#1d4ed8' : '#64748b',
                                }}
                            />
                        )}
                    </ButtonBase>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'none',
                        bgcolor: '#f1f5f9',
                        p: 0.5,
                        borderRadius: '12px',
                        gap: 0.75,
                        mb: 2.5,
                        flexDirection: { xs: 'column', sm: 'row' },
                    }}
                >
                    <ButtonBase
                        onClick={() => setMode('EXCESS')}
                        sx={{
                            flex: 1,
                            py: 1.25,
                            px: 2,
                            borderRadius: '9px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            bgcolor: mode === 'EXCESS' ? '#ffffff' : 'transparent',
                            color: mode === 'EXCESS' ? '#16a34a' : '#64748b',
                            boxShadow: mode === 'EXCESS' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                            '&:hover': {
                                bgcolor: mode === 'EXCESS' ? '#ffffff' : '#e2e8f0',
                            },
                        }}
                    >
                        <AddCircleOutlineIcon sx={{ fontSize: '1.15rem' }} />
                        <span>Ghi nhận vé hệ thống chưa ghi nhận vào kho</span>
                        <Chip
                            size="small"
                            label="Khuyên dùng"
                            sx={{
                                height: 20,
                                fontSize: '0.675rem',
                                fontWeight: 800,
                                bgcolor: mode === 'EXCESS' ? '#dcfce7' : '#e2e8f0',
                                color: mode === 'EXCESS' ? '#15803d' : '#64748b',
                            }}
                        />
                    </ButtonBase>

                    <ButtonBase
                        onClick={() => setMode('EXISTING')}
                        sx={{
                            flex: 1,
                            py: 1.25,
                            px: 2,
                            borderRadius: '9px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            bgcolor: mode === 'EXISTING' ? '#ffffff' : 'transparent',
                            color: mode === 'EXISTING' ? '#2563eb' : '#64748b',
                            boxShadow: mode === 'EXISTING' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                            '&:hover': {
                                bgcolor: mode === 'EXISTING' ? '#ffffff' : '#e2e8f0',
                            },
                        }}
                    >
                        <FormatListBulletedOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                        <span>Chọn sê-ri để báo lỗi / hủy</span>
                        {serials.length > 0 && (
                            <Chip
                                size="small"
                                label={`${serials.length} vé`}
                                sx={{
                                    height: 20,
                                    fontSize: '0.675rem',
                                    fontWeight: 800,
                                    bgcolor: mode === 'EXISTING' ? '#dbeafe' : '#e2e8f0',
                                    color: mode === 'EXISTING' ? '#1d4ed8' : '#64748b',
                                }}
                            />
                        )}
                    </ButtonBase>
                </Box>
            )}

            {/* Actual import is higher: add the tickets missing from the system by station. */}
            {!isShortage && mode === 'MISSING' && (
                <Stack spacing={2} sx={{ mb: 1 }}>

                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 1.5, md: 2 },
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#f8fafc',
                        }}
                    >
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', md: 'center' }}
                            spacing={1}
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Danh sách phân bổ theo nhà đài
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddCircleOutlineIcon />}
                                    disabled={missingQtyRemaining <= 0 || !!submitting}
                                    onClick={() => setSourceDialogOpen(true)}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '9px' }}
                                >
                                    Bổ sung vé thiếu
                                </Button>
                                <AdminStatusBadge
                                    label={`Đã nhập ${missingQtyEntered.toLocaleString('vi-VN')} / ${totalDiff.toLocaleString('vi-VN')} vé${
                                        missingQtyRemaining === 0
                                            ? ' · Đã đủ'
                                            : missingQtyRemaining > 0
                                              ? ` · Còn thiếu ${missingQtyRemaining.toLocaleString('vi-VN')} vé`
                                              : ` · Vượt quá ${Math.abs(missingQtyRemaining).toLocaleString('vi-VN')} vé`
                                    }`}
                                    modifier={
                                        isMissingQtyExact
                                            ? 'admin-status-badge--success'
                                            : missingQtyEntered > totalDiff
                                              ? 'admin-status-badge--inactive'
                                              : 'admin-status-badge--pending'
                                    }
                                />
                            </Stack>
                        </Stack>

                        {allocationStations.length === 0 ? (
                            <Alert severity="warning" sx={{ borderRadius: '10px', mb: 2 }}>
                                Không có danh sách nhà đài / dòng nhập để phân bổ.
                            </Alert>
                        ) : (
                            <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'auto', borderColor: '#e2e8f0', mb: 2, bgcolor: '#ffffff' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
                                            <TableCell sx={{ width: 44 }} />
                                            <TableCell>NHÀ ĐÀI</TableCell>
                                            <TableCell align="right">SL HỆ THỐNG</TableCell>
                                            <TableCell align="right">SL VÉ THIẾU</TableCell>
                                            <TableCell align="right">SL VÉ THẤT THOÁT</TableCell>
                                            <TableCell align="right">TỔNG BỔ SUNG</TableCell>
                                            <TableCell align="right">THAO TÁC</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {allocationStations.map((s) => {
                                            const groups = ticketDetails[s.lotteryStationId] || [];
                                            const totalSerials = groups.reduce((acc, g) => acc + g.serials.length, 0);
                                            const missingQuantity = totalSerials;
                                            const stationLostEntries = lostTickets.filter((entry) => entry.lotteryStationId === s.lotteryStationId);
                                            const lostQuantity = stationLostEntries.reduce((sum, entry) => sum + entry.quantity, 0);
                                            const rowTotal = totalSerials + lostQuantity;
                                            const hasVal = rowTotal > 0;
                                            const canAddMore = missingQtyEntered < totalDiff;
                                            const expanded = expandedStations.includes(s.lotteryStationId);
                                            
                                            return (
                                                <React.Fragment key={s.lotteryStationId}>
                                                    <TableRow hover sx={{ bgcolor: hasVal ? '#fffbf5' : 'inherit' }}>
                                                        <TableCell>
                                                            <IconButton
                                                                size="small"
                                                                disabled={!hasVal}
                                                                aria-label={expanded ? 'Thu gọn chi tiết vé' : 'Mở chi tiết vé'}
                                                                onClick={() => setExpandedStations((current) => expanded
                                                                    ? current.filter((id) => id !== s.lotteryStationId)
                                                                    : [...current, s.lotteryStationId])}
                                                            >
                                                                {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                                            </IconButton>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                                {s.lotteryStationName || `Đài #${s.lotteryStationId}`}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight={600} color="#334155">
                                                                {(s.importedQuantity ?? 0).toLocaleString('vi-VN')}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight={800} color={missingQuantity > 0 ? '#2563eb' : '#94a3b8'}>
                                                                {missingQuantity.toLocaleString('vi-VN')}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight={800} color={lostQuantity > 0 ? '#d97706' : '#94a3b8'}>
                                                                {lostQuantity.toLocaleString('vi-VN')}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight={800} color={hasVal ? '#dc2626' : '#64748b'}>
                                                                {rowTotal.toLocaleString('vi-VN')}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {!hasVal && (
                                                                <Button
                                                                    variant="outlined"
                                                                    size="small"
                                                                    disabled={!canAddMore}
                                                                    onClick={() => {
                                                                        setTicketDetails((prev) => {
                                                                            const next = JSON.parse(JSON.stringify(prev));
                                                                            if (!next[s.lotteryStationId]) next[s.lotteryStationId] = [];
                                                                            next[s.lotteryStationId].push({
                                                                                numbers: '',
                                                                                serials: [{ serialNumber: '', evidenceUrl: '', condition: 'UNDER_IMPORTED' }],
                                                                            });
                                                                            return next;
                                                                        });
                                                                        setExpandedStations((current) => current.includes(s.lotteryStationId)
                                                                            ? current
                                                                            : [...current, s.lotteryStationId]);
                                                                        setExpandedRanges((current) => [...current, `${s.lotteryStationId}-${(ticketDetails[s.lotteryStationId] || []).length}`]);
                                                                    }}
                                                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                                                >
                                                                    Thêm
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    
                                                    {hasVal && expanded && (
                                                        <TableRow>
                                                            <TableCell colSpan={7} sx={{ py: 2, px: 3, bgcolor: '#f8fafc' }}>
                                                                <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid #e2e8f0`, bgcolor: '#ffffff' }}>
                                                                    <Typography variant="subtitle2" sx={{ color: '#0f172a', mb: 2, fontWeight: 700 }}>
                                                                        Chi tiết vé (Tổng {rowTotal} vé)
                                                                    </Typography>
                                                                    <Box sx={{ display: 'grid', gridTemplateColumns: '44px 130px minmax(180px, 1fr) 110px 48px', gap: 1, px: 1.5, py: 1, mb: 1, borderRadius: '8px', bgcolor: '#f1f5f9', color: '#475569' }}>
                                                                        <span />
                                                                        <Typography variant="caption" fontWeight={800}>LOẠI VÉ</Typography>
                                                                        <Typography variant="caption" fontWeight={800}>DÃY SỐ / NHÀ ĐÀI</Typography>
                                                                        <Typography variant="caption" fontWeight={800} textAlign="right">SỐ LƯỢNG</Typography>
                                                                        <span />
                                                                    </Box>
                                                                    
                                                                    {groups.map((group, groupIdx) => (
                                                                        <Paper key={groupIdx} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '8px', borderColor: '#e2e8f0' }}>
                                                                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                                                                <IconButton
                                                                                    size="small"
                                                                                    aria-label={expandedRanges.includes(`${s.lotteryStationId}-${groupIdx}`) ? 'Thu gọn sê-ri' : 'Mở danh sách sê-ri'}
                                                                                    onClick={() => setExpandedRanges((current) => current.includes(`${s.lotteryStationId}-${groupIdx}`)
                                                                                        ? current.filter((key) => key !== `${s.lotteryStationId}-${groupIdx}`)
                                                                                        : [...current, `${s.lotteryStationId}-${groupIdx}`])}
                                                                                >
                                                                                    {expandedRanges.includes(`${s.lotteryStationId}-${groupIdx}`) ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                                                                </IconButton>
                                                                                <Chip size="small" color="success" variant="outlined" label="Hiện có" sx={{ minWidth: 92, fontWeight: 800 }} />
                                                                                <TextField
                                                                                    size="small"
                                                                                    label="Dãy số"
                                                                                    value={group.numbers}
                                                                                    error={Boolean(group.numbers) && !isValidTicketNumbers(group.numbers)}
                                                                                    helperText={Boolean(group.numbers) && !isValidTicketNumbers(group.numbers) ? 'Dãy số phải có đúng 6 chữ số.' : ' '}
                                                                                    onChange={(e) => {
                                                                                        setTicketDetails((prev) => {
                                                                                            const next = JSON.parse(JSON.stringify(prev));
                                                                                            next[s.lotteryStationId][groupIdx].numbers = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                    inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                                                                                    sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                                                                />
                                                                                <Typography variant="body2" fontWeight={800} sx={{ minWidth: 74, textAlign: 'right' }}>
                                                                                    {group.serials.length} vé
                                                                                </Typography>
                                                                                <IconButton
                                                                                    color="error"
                                                                                    onClick={() => {
                                                                                        setTicketDetails((prev) => {
                                                                                            const next = JSON.parse(JSON.stringify(prev));
                                                                                            next[s.lotteryStationId].splice(groupIdx, 1);
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    <CloseIcon />
                                                                                </IconButton>
                                                                            </Stack>
                                                                            {expandedRanges.includes(`${s.lotteryStationId}-${groupIdx}`) && (<>
                                                                            {group.serials.map((serial, serialIdx) => (
                                                                                <Stack key={serialIdx} direction="row" spacing={2} alignItems="center" sx={{ pl: { xs: 0, sm: 4 }, mb: 1.5 }}>
                                                                                    <TextField
                                                                                        size="small"
                                                                                        label="Sê-ri"
                                                                                        value={serial.serialNumber}
                                                                                        error={Boolean(serial.serialNumber) && !isValidTicketSerial(serial.serialNumber)}
                                                                                        helperText={Boolean(serial.serialNumber) && !isValidTicketSerial(serial.serialNumber) ? 'Một chữ cái ở đầu hoặc cuối, các ký tự còn lại là số.' : ' '}
                                                                                        onChange={(e) => {
                                                                                            setTicketDetails((prev) => {
                                                                                                const next = JSON.parse(JSON.stringify(prev));
                                                                                                next[s.lotteryStationId][groupIdx].serials[serialIdx].serialNumber = e.target.value.replace(/[^A-Za-z0-9]/g, '');
                                                                                                return next;
                                                                                            });
                                                                                        }}
                                                                                        inputProps={{ inputMode: 'text' }}
                                                                                        sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                                                                    />
                                                                                    <FormControl size="small" sx={{ flex: 1 }}>
                                                                                        <InputLabel>Tình trạng vé</InputLabel>
                                                                                        <Select
                                                                                            label="Tình trạng vé"
                                                                                            value={serial.condition}
                                                                                            onChange={(e) => {
                                                                                                setTicketDetails((prev) => {
                                                                                                    const next = JSON.parse(JSON.stringify(prev));
                                                                                                    next[s.lotteryStationId][groupIdx].serials[serialIdx].condition = e.target.value;
                                                                                                    return next;
                                                                                                });
                                                                                            }}
                                                                                            sx={{ borderRadius: '8px', bgcolor: '#ffffff' }}
                                                                                        >
                                                                                            <MenuItem value="UNDER_IMPORTED">Nhập thiếu</MenuItem>
                                                                                            <MenuItem value="DAMAGED">Hư hỏng / rách</MenuItem>
                                                                                        </Select>
                                                                                    </FormControl>
                                                                                    {serial.evidenceUrl ? (
                                                                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flex: 1 }}>
                                                                                            <Button
                                                                                                variant="outlined"
                                                                                                color="success"
                                                                                                startIcon={<VisibilityOutlinedIcon />}
                                                                                                onClick={() => setReceiptPreview({
                                                                                                    url: serial.evidenceUrl,
                                                                                                    title: `Ảnh vé ${serial.serialNumber || 'chưa có sê-ri'}`,
                                                                                                })}
                                                                                                sx={{ flex: 1, minHeight: 40, borderRadius: '8px', textTransform: 'none' }}
                                                                                            >
                                                                                                Xem ảnh
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="outlined"
                                                                                                color="error"
                                                                                                startIcon={<CloseIcon />}
                                                                                                onClick={() => setTicketImageToDelete({
                                                                                                    stationId: s.lotteryStationId,
                                                                                                    groupIdx,
                                                                                                    serialIdx,
                                                                                                    serialNumber: serial.serialNumber,
                                                                                                })}
                                                                                                sx={{ minHeight: 40, borderRadius: '8px', textTransform: 'none' }}
                                                                                            >
                                                                                                Xóa ảnh
                                                                                            </Button>
                                                                                        </Stack>
                                                                                    ) : (
                                                                                        <Button
                                                                                            variant="contained"
                                                                                            color="primary"
                                                                                            component="label"
                                                                                            disabled={uploadingEvidence}
                                                                                            sx={{ flex: 1, minHeight: 40, borderRadius: '8px', textTransform: 'none', boxShadow: 'none' }}
                                                                                        >
                                                                                            {serial.condition === 'DAMAGED' ? 'Tải ảnh minh chứng' : 'Ảnh (tùy chọn)'}
                                                                                            <input
                                                                                                type="file"
                                                                                                hidden
                                                                                                accept="image/*"
                                                                                                capture="environment"
                                                                                                onChange={async (e) => {
                                                                                                    const file = e.target.files?.[0];
                                                                                                    if (!file) return;
                                                                                                    try {
                                                                                                        setUploadingEvidence(true);
                                                                                                        const url = await uploadAdminImage(file);
                                                                                                        setTicketDetails((prev) => {
                                                                                                            const next = JSON.parse(JSON.stringify(prev));
                                                                                                            next[s.lotteryStationId][groupIdx].serials[serialIdx].evidenceUrl = url;
                                                                                                            return next;
                                                                                                        });
                                                                                                        AppToast.success('Đã tải ảnh minh chứng.');
                                                                                                    } catch (err: any) {
                                                                                                        AppToast.error(err?.message || 'Tải ảnh thất bại.');
                                                                                                    } finally {
                                                                                                        setUploadingEvidence(false);
                                                                                                        e.target.value = '';
                                                                                                    }
                                                                                                }}
                                                                                            />
                                                                                        </Button>
                                                                                    )}
                                                                                    <IconButton
                                                                                        color="error"
                                                                                        disabled={group.serials.length <= 1}
                                                                                        onClick={() => {
                                                                                            setTicketDetails((prev) => {
                                                                                                const next = JSON.parse(JSON.stringify(prev));
                                                                                                next[s.lotteryStationId][groupIdx].serials.splice(serialIdx, 1);
                                                                                                return next;
                                                                                            });
                                                                                        }}
                                                                                    >
                                                                                        <CloseIcon />
                                                                                    </IconButton>
                                                                                </Stack>
                                                                            ))}
                                                                            
                                                                            <Box sx={{ pl: { xs: 0, sm: 4 } }}>
                                                                                <Button
                                                                                    size="small"
                                                                                    disabled={!canAddMore}
                                                                                    startIcon={<AddCircleOutlineIcon />}
                                                                                    onClick={() => {
                                                                                        setTicketDetails((prev) => {
                                                                                            const next = JSON.parse(JSON.stringify(prev));
                                                                                            next[s.lotteryStationId][groupIdx].serials.push({ serialNumber: '', evidenceUrl: '', condition: 'UNDER_IMPORTED' });
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                                                                                >
                                                                                    Thêm sê-ri
                                                                                </Button>
                                                                            </Box>
                                                                            </>)}
                                                                        </Paper>
                                                                    ))}
                                                                    {stationLostEntries.map((entry) => (
                                                                        <Paper key={entry.id} variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: '8px', borderColor: '#fde68a', bgcolor: '#fffbeb' }}>
                                                                            <Box sx={{ display: 'grid', gridTemplateColumns: '44px 130px minmax(180px, 1fr) 110px 48px', gap: 1, alignItems: 'center' }}>
                                                                                <span />
                                                                                <Chip size="small" color="warning" variant="outlined" label="Thất thoát" sx={{ minWidth: 92, fontWeight: 800 }} />
                                                                                <Typography variant="body2" fontWeight={700}>{s.lotteryStationName || `Đài #${s.lotteryStationId}`}</Typography>
                                                                                <Typography variant="body2" fontWeight={800} textAlign="right">{entry.quantity} vé</Typography>
                                                                                <IconButton color="error" size="small" aria-label="Xóa vé thất thoát" onClick={() => setLostTickets((current) => current.filter((item) => item.id !== entry.id))}>
                                                                                    <CloseIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Box>
                                                                        </Paper>
                                                                    ))}
                                                                    
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        disabled={!canAddMore}
                                                                        startIcon={<AddCircleOutlineIcon />}
                                                                        onClick={() => {
                                                                            setTicketDetails((prev) => {
                                                                                const next = JSON.parse(JSON.stringify(prev));
                                                                                if (!next[s.lotteryStationId]) next[s.lotteryStationId] = [];
                                                                                next[s.lotteryStationId].push({ numbers: '', serials: [{ serialNumber: '', evidenceUrl: '', condition: 'UNDER_IMPORTED' }] });
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                                                                    >
                                                                        Thêm dãy số
                                                                    </Button>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableBody>
                                    <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                        <TableRow>
                                            <TableCell />
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#334155' }}>
                                                TỔNG CỘNG ({allocationStations.length} nhà đài)
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                                {allocationStations.reduce((acc, s) => acc + (s.importedQuantity ?? 0), 0).toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#2563eb' }}>
                                                {(missingQtyByCondition.underImported + missingQtyByCondition.damaged).toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#d97706' }}>
                                                {missingQtyByCondition.lost.toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    fontWeight: 800,
                                                    fontSize: '0.85rem',
                                                    color: isMissingQtyExact ? '#16a34a' : missingQtyEntered > totalDiff ? '#dc2626' : '#d97706',
                                                }}
                                            >
                                                {missingQtyEntered.toLocaleString('vi-VN')} / {totalDiff.toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </Paper>
                        )}

                        {lostTickets.some((entry) => entry.lotteryStationId == null) && (
                            <Paper variant="outlined" sx={{ borderRadius: '12px', p: 2, mb: 2, borderColor: '#fde68a', bgcolor: '#fffbeb' }}>
                                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Chi tiết vé — Chưa xác nhận nhà đài</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '130px minmax(180px, 1fr) 110px 48px', gap: 1, px: 1.5, py: 1, mb: 1, borderRadius: '8px', bgcolor: '#fef3c7', color: '#92400e' }}>
                                    <Typography variant="caption" fontWeight={800}>LOẠI VÉ</Typography>
                                    <Typography variant="caption" fontWeight={800}>NHÀ ĐÀI</Typography>
                                    <Typography variant="caption" fontWeight={800} textAlign="right">SỐ LƯỢNG</Typography>
                                    <span />
                                </Box>
                                {lostTickets.filter((entry) => entry.lotteryStationId == null).map((entry) => (
                                    <Box key={entry.id} sx={{ display: 'grid', gridTemplateColumns: '130px minmax(180px, 1fr) 110px 48px', gap: 1, alignItems: 'center', px: 1.5, py: 1 }}>
                                        <Chip size="small" color="warning" variant="outlined" label="Thất thoát" sx={{ minWidth: 92, fontWeight: 800 }} />
                                        <Typography variant="body2" fontWeight={700}>Chưa xác nhận nhà đài</Typography>
                                        <Typography variant="body2" fontWeight={800} textAlign="right">{entry.quantity} vé</Typography>
                                        <IconButton color="error" size="small" aria-label="Xóa vé thất thoát" onClick={() => setLostTickets((current) => current.filter((item) => item.id !== entry.id))}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Paper>
                        )}

                        {hasInvalidTicketDetails && (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
                                Dãy số phải có đúng 6 chữ số. Sê-ri phải có đúng một chữ cái ở đầu hoặc cuối và các ký tự còn lại phải là số.
                            </Alert>
                        )}

                        <TextField
                            label="Ghi chú"
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Nhập ghi chú hoặc biên bản đối soát (nếu có)..."
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    bgcolor: '#ffffff',
                                },
                            }}
                        />
                    </Paper>

                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: isValidMissing ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${isValidMissing ? '#bbf7d0' : '#e2e8f0'}`,
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between',
                            gap: 2,
                        }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '8px',
                                    bgcolor: isValidMissing ? '#dcfce7' : '#f1f5f9',
                                    color: isValidMissing ? '#16a34a' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <CheckCircleOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color={isValidMissing ? '#15803d' : '#475569'}>
                                    {isValidMissing
                                        ? `Đã phân bổ đủ ${missingQtyEntered.toLocaleString('vi-VN')} vé (${missingQtyByCondition.underImported} nhập thiếu, ${missingQtyByCondition.damaged} hư hỏng, ${missingQtyByCondition.lost} thất thoát)`
                                        : !isMissingQtyExact
                                          ? `Cần phân bổ đúng ${totalDiff.toLocaleString('vi-VN')} vé (hiện đã nhập ${missingQtyEntered.toLocaleString('vi-VN')} vé)`
                                          : hasInvalidTicketDetails
                                            ? 'Vui lòng kiểm tra lại dãy số và sê-ri'
                                            : 'Vui lòng kiểm tra lại thông tin vé'}
                                </Typography>
                                <Typography variant="caption" color={isValidMissing ? '#166534' : '#64748b'}>
                                    Lô điều chỉnh ghi đủ số lượng. Vé-ma chỉ tạo cho nhập thiếu / hư hỏng; thất thoát chỉ cộng số lượng theo đài.
                                </Typography>
                            </Box>
                        </Stack>

                        <Button
                            variant="contained"
                            disabled={!isValidMissing || !!submitting || uploadingEvidence}
                            onClick={() =>
                                onResolve({
                                    reasonCode:
                                        reasonCode === 'OTHER' ? 'OTHER' : 'INSUFFICIENT_IMPORT',
                                    note: note || `Bổ sung ${missingQtyEntered} vé hệ thống ghi thiếu (nhập thiếu ${missingQtyByCondition.underImported}, hư hỏng ${missingQtyByCondition.damaged}, thất thoát ${missingQtyByCondition.lost})`,
                                    markResolved: true,
                                    missingPlaceholders,
                                })
                            }
                            sx={{
                                textTransform: 'none',
                                fontWeight: 800,
                                borderRadius: '10px',
                                px: 3,
                                py: 1.1,
                                bgcolor: '#dc2626',
                                '&:hover': { bgcolor: '#b91c1c' },
                                whiteSpace: 'nowrap',
                                minWidth: 220,
                            }}
                        >
                            {submitting
                                ? 'Đang xử lý...'
                                : `Xác nhận bổ sung ${missingQtyEntered.toLocaleString('vi-VN')} vé`}
                        </Button>
                    </Paper>
                </Stack>
            )}

            {/* Content for Excess - EXCESS Mode */}
            {!isShortage && mode === 'EXCESS' && (
                <Stack spacing={2} sx={{ mb: 1 }}>
                    <Alert severity="info" sx={{ borderRadius: '12px' }}>
                        Xác nhận vé hệ thống ghi thiếu: Tạo phiếu điều chỉnh và ghi nhận các sê-ri vé hợp lệ đưa vào kho bán hàng.
                    </Alert>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#f8fafc',
                        }}
                    >
                        <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 2 }}>
                            Nhập thông tin vé hệ thống chưa ghi nhận
                        </Typography>

                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, md: 4 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Nhà đài</InputLabel>
                                    <Select
                                        label="Nhà đài"
                                        value={excessStationId}
                                        onChange={(e) => setExcessStationId(e.target.value as number)}
                                        sx={{ borderRadius: '10px', bgcolor: '#ffffff' }}
                                    >
                                        {inventoryByStation.map((s) => (
                                            <MenuItem key={s.lotteryStationId} value={s.lotteryStationId}>
                                                {s.lotteryStationName || `#${s.lotteryStationId}`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    label="Dãy số"
                                    size="small"
                                    value={excessNumbers}
                                    onChange={(e) => setExcessNumbers(e.target.value)}
                                    placeholder="Ví dụ: 123456"
                                    fullWidth
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#ffffff' } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    label="Số sê-ri"
                                    size="small"
                                    value={excessSerial}
                                    onChange={(e) => setExcessSerial(e.target.value)}
                                    placeholder="Ví dụ: AA-123456"
                                    fullWidth
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#ffffff' } }}
                                />
                            </Grid>
                        </Grid>

                        <Button
                            variant="outlined"
                            disabled={!excessStationId || !excessNumbers.trim() || !excessSerial.trim()}
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => {
                                setExcessRows((prev) => [
                                    ...prev,
                                    {
                                        lotteryStationId: Number(excessStationId),
                                        numbers: excessNumbers.trim(),
                                        serialNumber: excessSerial.trim(),
                                    },
                                ]);
                                setExcessNumbers('');
                                setExcessSerial('');
                            }}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', mt: 2 }}
                        >
                            Thêm vé vào danh sách ({excessRows.length})
                        </Button>
                    </Paper>

                    {excessRows.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1 }}>
                                Danh sách {excessRows.length} vé chưa được hệ thống ghi nhận đã thêm:
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {excessRows.map((r, idx) => (
                                    <Chip
                                        key={idx}
                                        size="small"
                                        label={
                                            <>
                                                <AdminLuckyDisplay value={r.numbers} ticket component="span" />
                                                {` / ${r.serialNumber}`}
                                            </>
                                        }
                                        onDelete={() => setExcessRows((rows) => rows.filter((_, i) => i !== idx))}
                                        sx={{ fontWeight: 700 }}
                                    />
                                ))}
                            </Stack>
                        </Paper>
                    )}

                    <Button
                        variant="contained"
                        disabled={excessRows.length === 0 || !!submitting}
                        startIcon={<CheckCircleOutlinedIcon />}
                        onClick={() =>
                            onResolve({
                                reasonCode: 'EXCESS_IMPORT',
                                note: note || 'Excess import inventory',
                                markResolved: true,
                                excessTickets: excessRows,
                            })
                        }
                        sx={{
                            textTransform: 'none',
                            fontWeight: 800,
                            borderRadius: '10px',
                            px: 3,
                            py: 1,
                            alignSelf: 'flex-start',
                            bgcolor: '#16a34a',
                            '&:hover': { bgcolor: '#15803d' },
                        }}
                    >
                        {submitting ? 'Đang xác nhận...' : `Xác nhận ${excessRows.length} vé hệ thống ghi thiếu`}
                    </Button>
                </Stack>
            )}

            {/* EXISTING Mode: shortage = view-only inventory; surplus = select + report/void */}
            {mode === 'EXISTING' && (
                <>
                    {isShortage && (
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1.25 }}>
                            Danh sách vé được nhập trong ngày đối soát
                        </Typography>
                    )}

                    {/* Batch tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1, display: isImportedTicketListLocked ? 'none' : undefined }}>
                        <Tabs
                            value={selectedBatchKey}
                            onChange={(_, val) => {
                                setSelectedBatchKey(val);
                                setSelectedStation('ALL');
                            }}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={tabSx}
                        >
                            <Tab
                                value="ALL"
                                label={
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>Tất cả</span>
                                        <Chip
                                            size="small"
                                            label={serials.length}
                                            sx={{
                                                height: 20,
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                bgcolor: selectedBatchKey === 'ALL' ? '#dbeafe' : '#f1f5f9',
                                                color: selectedBatchKey === 'ALL' ? '#1d4ed8' : '#64748b',
                                            }}
                                        />
                                    </Stack>
                                }
                            />
                            {batchTabs.map((batch) => (
                                <Tab
                                    key={batch.key}
                                    value={batch.key}
                                    label={
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <span>{batch.label}</span>
                                            <Chip
                                                size="small"
                                                label={batch.count}
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    bgcolor: selectedBatchKey === batch.key ? '#dbeafe' : '#f1f5f9',
                                                    color: selectedBatchKey === batch.key ? '#1d4ed8' : '#64748b',
                                                }}
                                            />
                                        </Stack>
                                    }
                                />
                            ))}
                        </Tabs>
                    </Box>

                    {/* Search & Selection Summary Bar */}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: 2, display: isImportedTicketListLocked ? 'none' : undefined }}
                    >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ flex: 1, maxWidth: { xs: '100%', md: 620 } }}>
                            <TextField
                                size="small"
                                placeholder="Tìm kiếm theo mã sê-ri, nhà đài hoặc mã lô..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: '#94a3b8', fontSize: '1.2rem' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchQuery ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchQuery('')}>
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                }}
                                sx={{
                                    flex: 1,
                                    width: { xs: '100%', sm: 'auto' },
                                    minWidth: { xs: '100%', sm: 260 },
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                        bgcolor: '#f8fafc',
                                    },
                                }}
                            />

                            <FormControl size="small" sx={{ minWidth: 170, width: { xs: '100%', sm: 'auto' } }}>
                                <Select
                                    value={selectedStation}
                                    onChange={(e) => setSelectedStation(e.target.value)}
                                    displayEmpty
                                    sx={{
                                        borderRadius: '10px',
                                        bgcolor: '#f8fafc',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    <MenuItem value="ALL">
                                        <em>Tất cả nhà đài ({serialsInSelectedBatch.length})</em>
                                    </MenuItem>
                                    {stationList.map((station) => (
                                        <MenuItem key={station.name} value={station.name} sx={{ fontSize: '0.85rem' }}>
                                            {station.name} ({station.count})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                            {canActOnSerials && selected.length > 0 && (
                                <>
                                    <Button
                                        size="small"
                                        variant={showOnlySelected ? 'contained' : 'outlined'}
                                        color={showOnlySelected ? 'primary' : 'inherit'}
                                        startIcon={showOnlySelected ? <FilterAltOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                                        onClick={() => setShowOnlySelected((prev) => !prev)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            borderRadius: '8px',
                                            py: 0.6,
                                            px: 1.5,
                                            borderColor: '#cbd5e1',
                                            bgcolor: showOnlySelected ? '#2563eb' : '#ffffff',
                                            color: showOnlySelected ? '#ffffff' : '#334155',
                                            '&:hover': {
                                                bgcolor: showOnlySelected ? '#1d4ed8' : '#f8fafc',
                                                borderColor: showOnlySelected ? '#1d4ed8' : '#94a3b8',
                                            },
                                        }}
                                    >
                                        {showOnlySelected ? 'Hiển thị tất cả vé' : 'Hiển thị các vé đã chọn'}
                                    </Button>

                                    <Chip
                                        size="small"
                                        color="primary"
                                        label={`Đã chọn ${selected.length}/${totalDiff} vé (${formatSettlementMoney(selectedCostSum)} VNĐ)`}
                                        onDelete={() => setSelected([])}
                                        sx={{ fontWeight: 700 }}
                                    />
                                </>
                            )}
                        </Stack>
                    </Stack>

                    {isImportedTicketListLocked ? (
                        <Paper
                            variant="outlined"
                            sx={{ p: { xs: 3, md: 5 }, mb: 2.5, borderRadius: '12px', borderColor: '#fecaca', bgcolor: '#fff7f7', textAlign: 'center' }}
                        >
                            <LockOutlinedIcon sx={{ fontSize: 42, color: '#ef4444', mb: 1 }} />
                            <Typography variant="h6" fontWeight={800} color="#7f1d1d" sx={{ mb: 0.75 }}>
                                Danh sách vé nhập đang bị khóa
                            </Typography>
                            <Typography variant="body2" color="#991b1b" sx={{ maxWidth: 620, mx: 'auto' }}>
                                Danh sách chỉ được mở khi đã qua giờ chốt trả vé ({importedTicketCutOffDisplay}) và
                                đã đến cửa sổ đối soát NCC ({paymentWindowDisplay}).
                                {!isReturnCutOffReached && ' Hiện chưa qua giờ chốt trả vé.'}
                                {!isPaymentWindowReached && ' Hiện chưa đến cửa sổ đối soát.'}
                            </Typography>
                        </Paper>
                    ) : (
                        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', borderColor: '#e2e8f0', mb: 2.5 }}>
                            <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.8rem', py: 1.2 } }}>
                                            {canActOnSerials && <TableCell padding="checkbox" />}
                                            <TableCell>DÃY SỐ</TableCell>
                                            <TableCell>NHÀ ĐÀI</TableCell>
                                            <TableCell>LÔ NHẬP</TableCell>
                                            <TableCell align="right">SỐ LƯỢNG</TableCell>
                                            <TableCell align="right">GIÁ VỐN</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedGroups.flatMap((group) => {
                                            const ids = group.serials.map((item) => item.serialId);
                                            const allSelected = canActOnSerials && ids.length > 0 && ids.every((id) => selected.includes(id));
                                            const expanded = expandedImportedRanges.includes(group.key);
                                            const rows: React.ReactNode[] = [
                                                <TableRow key={`range-${group.key}`} hover sx={{ cursor: 'pointer', bgcolor: expanded ? '#eff6ff' : 'inherit' }} onClick={() => setExpandedImportedRanges((current) => expanded ? current.filter((key) => key !== group.key) : [...current, group.key])}>
                                                    {canActOnSerials && <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}><Checkbox checked={allSelected} indeterminate={!allSelected && ids.some((id) => selected.includes(id))} onChange={() => handleToggleGroup(ids)} size="small" /></TableCell>}
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                                            {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                                                            <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace' }}>{group.numbers}</Typography>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell><Chip size="small" label={group.stationName} sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600, border: '1px solid #bfdbfe' }} /></TableCell>
                                                    <TableCell><Typography variant="caption" fontWeight={700} color="#475569">{group.batchLabel}</Typography></TableCell>
                                                    <TableCell align="right"><Typography variant="body2" fontWeight={800}>{group.serials.length}</Typography></TableCell>
                                                    <TableCell align="right"><Typography variant="body2" fontWeight={700} color="#166534">{formatSettlementMoney(group.importCost)} VNĐ</Typography></TableCell>
                                                </TableRow>,
                                            ];
                                            if (expanded) {
                                                group.serials.forEach((item) => {
                                                    const isRowSelected = selected.includes(item.serialId);
                                                    rows.push(
                                                        <TableRow key={`serial-${item.serialId}`} hover selected={canActOnSerials && isRowSelected}>
                                                            {canActOnSerials && <TableCell padding="checkbox"><Checkbox checked={isRowSelected} onChange={() => toggle(item.serialId)} size="small" /></TableCell>}
                                                            <TableCell sx={{ pl: canActOnSerials ? 5 : 3 }}><Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{item.serialNumber}</Typography></TableCell>
                                                            <TableCell><Typography variant="caption" color="#64748b">{item.stationName || group.stationName}</Typography></TableCell>
                                                            <TableCell><Typography variant="caption" color="#64748b">{item.importBatchCode || group.batchLabel}</Typography></TableCell>
                                                            <TableCell align="right"><Typography variant="caption" color="#64748b">1 vé</Typography></TableCell>
                                                            <TableCell align="right"><Typography variant="caption" color="#166534">{formatSettlementMoney(Number(item.importCost || 0))} VNĐ</Typography></TableCell>
                                                        </TableRow>
                                                    );
                                                });
                                            }
                                            return rows;
                                        })}
                                        {groupedFilteredSerials.length === 0 && (
                                            <TableRow><TableCell colSpan={canActOnSerials ? 6 : 5} sx={{ py: 4, textAlign: 'center' }}><Typography variant="body2" color="#64748b" fontWeight={600}>{loading ? 'Đang tải danh sách vé trong lô...' : 'Không có dãy số phù hợp với bộ lọc hiện tại.'}</Typography></TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                            {groupedFilteredSerials.length > 0 && (
                                <TablePagination
                                    rowsPerPageOptions={[10, 20, 50, 100]}
                                    component="div"
                                    count={groupedFilteredSerials.length}
                                    rowsPerPage={rowsPerPage}
                                    page={Math.min(page, Math.max(0, Math.ceil(groupedFilteredSerials.length / rowsPerPage) - 1))}
                                    onPageChange={(_, newPage) => setPage(newPage)}
                                    onRowsPerPageChange={(e) => {
                                        setRowsPerPage(parseInt(e.target.value, 10));
                                        setPage(0);
                                    }}
                                    labelRowsPerPage="Dòng/trang:"
                                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} trên ${count}`}
                                    sx={{
                                        borderTop: '1px solid #f1f5f9',
                                        '& .MuiTablePagination-toolbar': { minHeight: 44, px: 2 },
                                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: '#64748b',
                                        },
                                    }}
                                />
                            )}
                        </Paper>
                    )}

                    {/* Legacy serial table retained for the adjustment workflow; the grouped list above is the visible view. */}
                    {loading ? (
                        <Box sx={{ display: 'none', p: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="#64748b">
                                Đang tải danh sách vé trong lô...
                            </Typography>
                        </Box>
                    ) : (
                        <Paper
                            variant="outlined"
                                sx={{
                                display: 'none',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                borderColor: '#e2e8f0',
                                mb: 2.5,
                            }}
                        >
                            <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.8rem', py: 1.2 } }}>
                                            {canActOnSerials && (
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={isAllFilteredSelected}
                                                        indeterminate={isSomeFilteredSelected}
                                                        onChange={toggleSelectAllFiltered}
                                                        size="small"
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell>MÃ SÊ-RI</TableCell>
                                            <TableCell>LÔ NHẬP</TableCell>
                                            <TableCell>NHÀ ĐÀI</TableCell>
                                            <TableCell align="right">GIÁ VỐN</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredSerials.map((s) => {
                                            const isRowSelected = selected.includes(s.serialId);
                                            const batchLabel = s.importBatchCode
                                                || batchTabs.find((b) => b.id === Number(s.importBatchId))?.label
                                                || (s.importBatchId != null ? `Lô #${s.importBatchId}` : '—');
                                            return (
                                                <TableRow key={s.serialId} hover selected={canActOnSerials && isRowSelected} onClick={canActOnSerials ? () => toggle(s.serialId) : undefined}>
                                                    {canActOnSerials && (
                                                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox checked={isRowSelected} onChange={() => toggle(s.serialId)} size="small" color="primary" />
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: '#0f172a' }}>{s.serialNumber}</Typography>
                                                    </TableCell>
                                                    <TableCell><Typography variant="caption" fontWeight={700} color="#475569">{batchLabel}</Typography></TableCell>
                                                    <TableCell>
                                                        <Chip size="small" icon={<LocationOnOutlinedIcon style={{ fontSize: '0.85rem' }} />} label={s.stationName || 'Chưa rõ'} sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.75rem', border: '1px solid #bfdbfe' }} />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" fontWeight={700} color="#166534">{formatSettlementMoney(Number(s.importCost || 0))}{' '}<span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>VNĐ</span></Typography>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}

                                        {filteredSerials.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={canActOnSerials ? 5 : 4} sx={{ py: 4, textAlign: 'center' }}>
                                                    <Typography variant="body2" color="#64748b" fontWeight={600}>
                                                        {searchQuery
                                                            ? 'Không tìm thấy vé sê-ri nào khớp với từ khóa tìm kiếm.'
                                                            : isShortage
                                                              ? 'Không có sê-ri tồn kho trong phạm vi lọc hiện tại.'
                                                              : 'Không có sê-ri tồn kho để báo lỗi / hủy. Hãy dùng tab ghi nhận vé hệ thống chưa ghi nhận nếu cần bổ sung sê-ri mới.'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>
                    )}

                    {canActOnSerials && !isImportedTicketListLocked && (
                        <>
                    {/* Adjustment Form Box */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: '14px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#f8fafc',
                            mb: 2.5,
                        }}
                    >
                        <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 2 }}>
                            Tình trạng & lý do ghi nhận ({selected.length}/{totalDiff} vé đã chọn)
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Tình trạng vé</InputLabel>
                                    <Select
                                        label="Tình trạng vé"
                                        value={condition}
                                        onChange={(e) => setCondition(e.target.value as any)}
                                        sx={{ borderRadius: '10px', bgcolor: '#ffffff' }}
                                    >
                                        <MenuItem value="LOST">Thất lạc / Mất vé</MenuItem>
                                        <MenuItem value="DAMAGED">Vé bị rách / hỏng</MenuItem>
                                        <MenuItem value="VOIDED">Hủy vé thừa trên hệ thống</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Lý do điều chỉnh</InputLabel>
                                    <Select
                                        label="Lý do điều chỉnh"
                                        value={reasonCode}
                                        onChange={(e) => setReasonCode(e.target.value as SettlementAdjustmentReasonCode)}
                                        sx={{ borderRadius: '10px', bgcolor: '#ffffff' }}
                                    >
                                        <MenuItem value="MISSING_IMPORT">Hệ thống ghi thừa vé khi nhập</MenuItem>
                                        <MenuItem value="INSUFFICIENT_IMPORT">Số thực tế ít hơn hệ thống ghi nhận</MenuItem>
                                        <MenuItem value="OTHER">Lý do khác</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: isShortage ? 'none' : undefined }}>
                                <TextField
                                    size="small"
                                    label="Số tiền điều chỉnh"
                                    fullWidth
                                    type="text"
                                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                    value={amount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        setAmount(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '');
                                    }}
                                    helperText={
                                        selected.length > 0 && selectedCostSum > 0 ? (
                                            <Box
                                                component="span"
                                                onClick={handleApplySelectedCost}
                                                sx={{ color: '#2563eb', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                                            >
                                                Gợi ý: Điền tổng {formatSettlementMoney(selectedCostSum)} đ ({selected.length} vé)
                                            </Box>
                                        ) : undefined
                                    }
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Typography variant="caption" fontWeight={700} color="#64748b">
                                                    VNĐ
                                                </Typography>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            bgcolor: '#ffffff',
                                        },
                                    }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <TextField
                                    size="small"
                                    label="Ghi chú điều chỉnh"
                                    required={reasonCode === 'OTHER'}
                                    fullWidth
                                    placeholder="Diễn giải chi tiết lý do..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    error={otherReasonRequiresNote}
                                    helperText={otherReasonRequiresNote
                                        ? 'Vui lòng nhập ghi chú điều chỉnh khi chọn Lý do khác.'
                                        : undefined}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            bgcolor: '#ffffff',
                                        },
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Audit Warning */}
                    <Alert
                        icon={<WarningAmberOutlinedIcon sx={{ color: '#2563eb' }} />}
                        severity="info"
                        sx={{
                            mb: 2.5,
                            borderRadius: '12px',
                            bgcolor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1e40af',
                            fontSize: '0.85rem',
                        }}
                    >
                        Chỉ có thể xác nhận khi chọn đúng {totalDiff.toLocaleString('vi-VN')} vé hệ thống đã ghi thừa. Dữ liệu sẽ được giữ tạm cho đến bước Hoàn tất xử lý.
                    </Alert>

                    {/* Actions */}
                    <Stack direction="row" spacing={1.5} justifyContent="flex-end" alignItems="center">
                        <Button
                            variant="outlined"
                            disabled={submitting || selected.length === 0 || (isShortage && !isSelectedQtyExact) || otherReasonRequiresNote}
                            startIcon={<SaveOutlinedIcon />}
                            onClick={() => {
                                const parsedAmount = amount ? parseInt(amount.replace(/\D/g, ''), 10) : undefined;
                                onResolve({
                                    serialIds: selected,
                                    ticketCondition: condition || null,
                                    reasonCode,
                                    adjustmentAmount: parsedAmount,
                                    note: note.trim() || undefined,
                                    markResolved: false,
                                });
                            }}
                            sx={{
                                display: isShortage ? 'none' : 'inline-flex',
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '10px',
                                px: 2.5,
                                py: 0.9,
                            }}
                        >
                            Lưu xử lý tạm
                        </Button>
                        <Button
                            variant="contained"
                            disabled={submitting || selected.length === 0 || (isShortage && !isSelectedQtyExact) || otherReasonRequiresNote}
                            startIcon={<CheckCircleOutlinedIcon />}
                            onClick={() => {
                                const parsedAmount = amount ? parseInt(amount.replace(/\D/g, ''), 10) : undefined;
                                onResolve({
                                    serialIds: selected,
                                    ticketCondition: condition || null,
                                    reasonCode,
                                    adjustmentAmount: parsedAmount,
                                    note: note.trim() || undefined,
                                    markResolved: true,
                                });
                            }}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 800,
                                borderRadius: '10px',
                                px: 3,
                                py: 0.9,
                                bgcolor: '#2563eb',
                                '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                        >
                            {submitting
                                ? 'Đang xác nhận...'
                                : isShortage
                                  ? `Xác nhận xử lý (${selected.length}/${totalDiff} vé)`
                                  : `Xác nhận xử lý (${selected.length} vé)`}
                        </Button>
                    </Stack>
                        </>
                    )}
                </>
            )}
            <Dialog
                open={Boolean(receiptPreview)}
                onClose={() => setReceiptPreview(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
                    {receiptPreview?.title || 'Biên lai'}
                    <IconButton
                        aria-label="Đóng"
                        onClick={() => setReceiptPreview(null)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {receiptPreview?.url && (
                        <Box
                            component="img"
                            src={receiptPreview.url}
                            alt={receiptPreview.title}
                            sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={Boolean(ticketImageToDelete)}
                onClose={() => setTicketImageToDelete(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Xóa ảnh vé?</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary">
                        Ảnh đã tải lên cho sê-ri {ticketImageToDelete?.serialNumber || 'này'} sẽ bị xóa khỏi dòng vé. Bạn có chắc muốn tiếp tục không?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setTicketImageToDelete(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                        Hủy
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => {
                            const target = ticketImageToDelete;
                            if (!target) return;
                            setTicketDetails((prev) => {
                                const next = JSON.parse(JSON.stringify(prev));
                                const serial = next[target.stationId]?.[target.groupIdx]?.serials?.[target.serialIdx];
                                if (serial) serial.evidenceUrl = '';
                                return next;
                            });
                            setTicketImageToDelete(null);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 800 }}
                    >
                        Xóa ảnh
                    </Button>
                </DialogActions>
            </Dialog>
            <MissingTicketSourceDialog
                open={sourceDialogOpen}
                supplierId={supplierId}
                drawDate={drawDate}
                maxSelectable={Math.max(0, missingQtyRemaining)}
                stationAllocations={allocationStations.map((station) => ({
                    lotteryStationId: station.lotteryStationId,
                    stationName: station.lotteryStationName || `Đài #${station.lotteryStationId}`,
                    allocatedQuantity: Math.max(0, Number(station.importedQuantity || 0)),
                    currentQuantity: (ticketDetails[station.lotteryStationId] || []).reduce((sum, group) => sum + group.serials.length, 0),
                }))}
                onClose={() => setSourceDialogOpen(false)}
                onConfirm={handleSourceTickets}
                onConfirmLost={handleLostTickets}
            />
            <Dialog
                open={receiptListOpen}
                onClose={() => setReceiptListOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
                    Biên lai nhập vé
                    <IconButton
                        aria-label="Đóng"
                        onClick={() => setReceiptListOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.25}>
                        {importReceiptItems.map((item) => (
                            <Button
                                key={item.id}
                                variant="outlined"
                                onClick={() => {
                                    setReceiptListOpen(false);
                                    openEvidence(item.url, `Biên lai nhập — ${item.label}`);
                                }}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
            </Dialog>
        </Paper>
    );
};
