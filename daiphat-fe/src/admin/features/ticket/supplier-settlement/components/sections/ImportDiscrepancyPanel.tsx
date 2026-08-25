"use client";

import React, { useEffect, useMemo, useState, Fragment } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Checkbox,
    Chip,
    Dialog,
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
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';
import { useStationsByDrawDate } from '@/admin/features/station/hooks/useStation';
import { AppToast } from '../../../../../../utils/toast.util';
import type {
    SettlementAdjustmentReasonCode,
    SettlementOverviewImportBatch,
    SettlementResolvableSerial,
} from '../../types/supplierSettlement.type';
import { formatSettlementMoney } from '../../utils/settlementCashflow';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';

interface ImportDiscrepancyPanelProps {
    serials: SettlementResolvableSerial[];
    inventoryByStation?: Array<{ lotteryStationId: number; lotteryStationName?: string | null; remainingQuantity?: number; importedQuantity?: number }>;
    importBatches?: SettlementOverviewImportBatch[];
    settlementReceiptUrl?: string | null;
    drawDate?: string | null;
    loading?: boolean;
    submitting?: boolean;
    direction: 'POSITIVE' | 'NEGATIVE';
    difference?: number;
    onDirtyChange?: (isDirty: boolean) => void;
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

type MissingTicketCondition = 'UNDER_IMPORTED' | 'DAMAGED' | 'LOST';
type AllocationStation = {
    lotteryStationId: number;
    lotteryStationName?: string | null;
    remainingQuantity?: number;
    importedQuantity?: number;
    extra?: boolean;
};


const parseSplitQty = (raw?: string): number => {
    const n = Number(String(raw || '').replace(/\D/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
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

export const ImportDiscrepancyPanel = ({
    serials,
    inventoryByStation = [],
    importBatches = [],
    settlementReceiptUrl,
    drawDate,
    loading,
    submitting,
    direction,
    difference,
    onResolve,
    onDirtyChange,
}: ImportDiscrepancyPanelProps) => {
    // The difference is actual − system. A negative value means the system has
    // recorded more imported tickets than were actually received.
    const isShortage = direction === 'NEGATIVE';
    const canActOnSerials = isShortage;
    const totalDiff = Math.abs(Number(difference ?? serials.length));

    const [mode, setMode] = useState<'EXISTING' | 'MISSING' | 'EXCESS'>(isShortage ? 'EXISTING' : 'MISSING');
    const [selected, setSelected] = useState<number[]>([]);
    const [condition, setCondition] = useState<'LOST' | 'DAMAGED' | 'VOIDED' | ''>('LOST');
    const [reasonCode, setReasonCode] = useState<SettlementAdjustmentReasonCode>(
        isShortage ? 'MISSING_IMPORT' : 'INSUFFICIENT_IMPORT'
    );
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    // Missing placeholders: per-station qty split by condition
    const [globalLostQty, setGlobalLostQty] = useState<string>('');
    const [ticketDetails, setTicketDetails] = useState<Record<number, TicketGroup[]>>({});
    const [extraStations, setExtraStations] = useState<AllocationStation[]>([]);
    const [stationToAdd, setStationToAdd] = useState<number | ''>('');
    const [missingEvidenceUrl, setMissingEvidenceUrl] = useState('');
    const [uploadingEvidence, setUploadingEvidence] = useState(false);
    const drawDateKey = drawDate ? String(drawDate).slice(0, 10) : undefined;
    const { data: stationsByDrawDate } = useStationsByDrawDate(drawDateKey);
    const stationsForDrawDate = Array.isArray(stationsByDrawDate) ? stationsByDrawDate : [];

    const allocationStations = useMemo<AllocationStation[]>(() => {
        const seen = new Set<number>();
        const rows: AllocationStation[] = [];
        inventoryByStation.forEach((s) => {
            seen.add(s.lotteryStationId);
            rows.push({ ...s, extra: false });
        });
        extraStations.forEach((s) => {
            if (seen.has(s.lotteryStationId)) return;
            seen.add(s.lotteryStationId);
            rows.push({ ...s, extra: true });
        });
        return rows;
    }, [inventoryByStation, extraStations]);

    const addableStations = useMemo(
        () =>
            stationsForDrawDate.filter((station) => {
                const id = Number(station.id ?? station._id);
                return Number.isFinite(id) && !allocationStations.some((row) => row.lotteryStationId === id);
            }),
        [stationsForDrawDate, allocationStations]
    );



    useEffect(() => {
        setExtraStations((prev) => {
            const next = prev.filter(
                (s) => !inventoryByStation.some((row) => row.lotteryStationId === s.lotteryStationId)
            );
            return next.length === prev.length ? prev : next;
        });
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
    const [receiptPreview, setReceiptPreview] = useState<{ url: string; title: string } | null>(null);
    const [receiptListOpen, setReceiptListOpen] = useState(false);

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

    const filteredSerials = useMemo(() => {
        return serialsInSelectedBatch.filter((s) => {
            const matchSearch =
                !searchQuery.trim() ||
                s.serialNumber.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                (s.stationName && s.stationName.toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
                (s.importBatchCode && s.importBatchCode.toLowerCase().includes(searchQuery.trim().toLowerCase()));

            const matchStation =
                selectedStation === 'ALL' ||
                (s.stationName ? s.stationName === selectedStation : selectedStation === 'Chưa phân đài');

            return matchSearch && matchStation;
        });
    }, [serialsInSelectedBatch, searchQuery, selectedStation]);

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
            setSelected((prev) => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const toggle = (id: number) => {
        if (!canActOnSerials) return;
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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

        const globalLost = parseSplitQty(globalLostQty);
        if (globalLost > 0) {
            rows.push({ lotteryStationId: null, quantity: globalLost, ticketCondition: 'LOST' });
        }

        return rows;
    }, [allocationStations, ticketDetails, globalLostQty]);

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
    const needsMissingEvidence = missingQtyByCondition.damaged > 0;
    
    const isValidMissing = useMemo(() => {
        if (!isMissingQtyExact || missingPlaceholders.length === 0) return false;
        if (needsMissingEvidence && !missingEvidenceUrl.trim()) return false;
        
        for (const stationId of Object.keys(ticketDetails)) {
            const groups = ticketDetails[Number(stationId)];
            if (!groups) continue;
            for (const group of groups) {
                if (!group.numbers.trim()) return false;
                for (const serial of group.serials) {
                    if (!serial.serialNumber.trim()) return false;
                    if (!serial.evidenceUrl.trim()) return false;
                }
            }
        }
        return true;
    }, [isMissingQtyExact, missingPlaceholders.length, needsMissingEvidence, missingEvidenceUrl, ticketDetails]);

    const handleMissingEvidenceUpload = async (file?: File | null) => {
        if (!file) return;
        try {
            setUploadingEvidence(true);
            const url = await uploadAdminImage(file);
            setMissingEvidenceUrl(url);
            AppToast.success('Đã tải ảnh minh chứng.');
        } catch (err: any) {
            AppToast.error(err?.message || 'Tải ảnh thất bại.');
        } finally {
            setUploadingEvidence(false);
        }
    };



    const handleAddStation = () => {
        const id = Number(stationToAdd);
        if (!Number.isFinite(id) || id <= 0) return;
        if (allocationStations.some((row) => row.lotteryStationId === id)) {
            setStationToAdd('');
            return;
        }
        const station = stationsForDrawDate.find((item) => Number(item.id ?? item._id) === id);
        setExtraStations((prev) => [
            ...prev,
            {
                lotteryStationId: id,
                lotteryStationName: station?.name || `Đài #${id}`,
                importedQuantity: 0,
                remainingQuantity: 0,
                extra: true,
            },
        ]);
        setStationToAdd('');
    };

    const handleRemoveExtraStation = (stationId: number) => {
        setExtraStations((prev) => prev.filter((s) => s.lotteryStationId !== stationId));
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

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
            }}
        >
            {/* Header */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2.5 }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: isShortage ? '#fffbeb' : '#fef2f2',
                            color: isShortage ? '#d97706' : '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: `1px solid ${isShortage ? '#fde68a' : '#fecaca'}`,
                        }}
                    >
                        <Inventory2OutlinedIcon sx={{ fontSize: '1.5rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.15rem', lineHeight: 1.3 }}>
                            {isShortage ? 'Xử lý hệ thống ghi thừa vé nhập' : 'Xử lý hệ thống ghi thiếu vé nhập'}
                        </Typography>
                        <Typography variant="body2" color="#64748b" sx={{ mt: 0.25 }}>
                            {isShortage
                                ? 'Hệ thống đang ghi nhận nhiều hơn thực tế. Chọn trực tiếp các sê-ri thuộc lô nhập trong ngày để ghi tình trạng và lý do xử lý.'
                                : 'Thực tế nhận nhiều hơn hệ thống ghi nhận. Phân bổ số vé cần bổ sung theo nhà đài để tạo các vé còn thiếu trong import batch.'}
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

            <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />

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
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: '#fef2f2',
                            border: '1px solid #fee2e2',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                        }}
                    >
                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                bgcolor: '#fee2e2',
                                color: '#dc2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                mt: 0.25,
                            }}
                        >
                            <InfoOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#991b1b" sx={{ fontSize: '0.9rem' }}>
                                Phân bổ số lượng vé ghi thiếu theo từng nhà đài và tình trạng
                            </Typography>
                            <Typography variant="caption" color="#b91c1c" sx={{ fontSize: '0.8rem', display: 'block', mt: 0.25, lineHeight: 1.5 }}>
                                Nhập số lượng theo nhà đài, tách thành Nhập thiếu / Hư hỏng / Thất thoát sao cho tổng đúng{' '}
                                <strong>{totalDiff.toLocaleString('vi-VN')} vé</strong>. Vé thất thoát chỉ cộng số lượng lô điều chỉnh, không tạo vé-ma.
                            </Typography>
                        </Box>
                    </Box>

                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#f8fafc',
                        }}
                    >
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            spacing={1}
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Danh sách phân bổ theo nhà đài
                            </Typography>
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

                        {allocationStations.length === 0 ? (
                            <Alert severity="warning" sx={{ borderRadius: '10px', mb: 2 }}>
                                Không có danh sách nhà đài / dòng nhập để phân bổ. Thêm đài thuộc ngày quay bên dưới nếu cần.
                            </Alert>
                        ) : (
                            <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'auto', borderColor: '#e2e8f0', mb: 2, bgcolor: '#ffffff' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' } }}>
                                            <TableCell>NHÀ ĐÀI</TableCell>
                                            <TableCell align="right">SL HỆ THỐNG</TableCell>
                                            <TableCell align="right">TỒN KHO</TableCell>
                                            <TableCell align="right">CHI TIẾT VÉ</TableCell>
                                            <TableCell align="right">TỔNG BỔ SUNG</TableCell>
                                            <TableCell sx={{ width: 48 }} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {allocationStations.map((s) => {
                                            const groups = ticketDetails[s.lotteryStationId] || [];
                                            const totalSerials = groups.reduce((acc, g) => acc + g.serials.length, 0);
                                            const rowTotal = totalSerials;
                                            const hasVal = rowTotal > 0;
                                            const canAddMore = missingQtyEntered < totalDiff;
                                            
                                            return (
                                                <React.Fragment key={s.lotteryStationId}>
                                                    <TableRow hover sx={{ bgcolor: hasVal ? '#fffbf5' : 'inherit' }}>
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
                                                            <Typography variant="body2" fontWeight={600} color="#64748b">
                                                                {(s.remainingQuantity ?? 0).toLocaleString('vi-VN')}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                disabled={!canAddMore}
                                                                onClick={() => {
                                                                    setTicketDetails(prev => {
                                                                        const next = JSON.parse(JSON.stringify(prev));
                                                                        if (!next[s.lotteryStationId]) next[s.lotteryStationId] = [];
                                                                        next[s.lotteryStationId].push({ numbers: '', serials: [{ serialNumber: '', evidenceUrl: '', condition: 'UNDER_IMPORTED' }] });
                                                                        return next;
                                                                    });
                                                                }}
                                                                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                                                            >
                                                                + Thêm vé
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight={800} color={hasVal ? '#dc2626' : '#64748b'}>
                                                                {rowTotal.toLocaleString('vi-VN')}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            {s.extra ? (
                                                                <IconButton
                                                                    size="small"
                                                                    aria-label="Gỡ đài"
                                                                    onClick={() => handleRemoveExtraStation(s.lotteryStationId)}
                                                                >
                                                                    <CloseIcon fontSize="small" />
                                                                </IconButton>
                                                            ) : null}
                                                        </TableCell>
                                                    </TableRow>
                                                    
                                                    {groups.length > 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={6} sx={{ py: 2, px: 3, bgcolor: '#f8fafc' }}>
                                                                <Box sx={{ p: 2, borderRadius: '12px', border: `1px solid #e2e8f0`, bgcolor: '#ffffff' }}>
                                                                    <Typography variant="subtitle2" sx={{ color: '#0f172a', mb: 2, fontWeight: 700 }}>
                                                                        Chi tiết vé (Tổng {totalSerials} vé)
                                                                    </Typography>
                                                                    
                                                                    {groups.map((group, groupIdx) => (
                                                                        <Paper key={groupIdx} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '8px', borderColor: '#e2e8f0' }}>
                                                                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                                                                <TextField
                                                                                    size="small"
                                                                                    label="Dãy số"
                                                                                    value={group.numbers}
                                                                                    onChange={(e) => {
                                                                                        setTicketDetails((prev) => {
                                                                                            const next = JSON.parse(JSON.stringify(prev));
                                                                                            next[s.lotteryStationId][groupIdx].numbers = e.target.value;
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                    sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                                                                />
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
                                                                            
                                                                            {group.serials.map((serial, serialIdx) => (
                                                                                <Stack key={serialIdx} direction="row" spacing={2} alignItems="center" sx={{ pl: { xs: 0, sm: 4 }, mb: 1.5 }}>
                                                                                    <TextField
                                                                                        size="small"
                                                                                        label="Sê-ri"
                                                                                        value={serial.serialNumber}
                                                                                        onChange={(e) => {
                                                                                            setTicketDetails((prev) => {
                                                                                                const next = JSON.parse(JSON.stringify(prev));
                                                                                                next[s.lotteryStationId][groupIdx].serials[serialIdx].serialNumber = e.target.value;
                                                                                                return next;
                                                                                            });
                                                                                        }}
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
                                                                                    <Button
                                                                                        variant={serial.evidenceUrl ? 'outlined' : 'contained'}
                                                                                        color={serial.evidenceUrl ? 'success' : 'primary'}
                                                                                        component="label"
                                                                                        disabled={uploadingEvidence}
                                                                                        sx={{ flex: 1, minHeight: 40, borderRadius: '8px', textTransform: 'none', boxShadow: 'none' }}
                                                                                    >
                                                                                        {serial.evidenceUrl ? 'Đã tải ảnh' : 'Tải ảnh minh chứng'}
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
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#334155' }}>
                                                TỔNG CỘNG ({allocationStations.length} nhà đài)
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                                                {allocationStations.reduce((acc, s) => acc + (s.importedQuantity ?? 0), 0).toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#64748b' }}>
                                                {allocationStations.reduce((acc, s) => acc + (s.remainingQuantity ?? 0), 0).toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#2563eb' }}>
                                                {missingQtyByCondition.underImported.toLocaleString('vi-VN')} thiếu, {missingQtyByCondition.damaged.toLocaleString('vi-VN')} hỏng
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

                        <Paper variant="outlined" sx={{ borderRadius: '12px', p: 2, mb: 2, borderColor: '#e2e8f0', bgcolor: '#ffffff' }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Vé thất thoát (Không xác định đài)
                                    </Typography>
                                    <Typography variant="caption" color="#64748b">
                                        Ghi nhận số lượng vé bị thất thoát không thuộc đài cụ thể
                                    </Typography>
                                </Box>
                                <TextField
                                    size="small"
                                    value={globalLostQty}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        const num = digits ? parseInt(digits, 10) : 0;
                                        setGlobalLostQty(num > 0 ? String(num) : (digits === '' ? '' : '0'));
                                    }}
                                    placeholder="0"
                                    error={missingQtyEntered > totalDiff}
                                    helperText={missingQtyEntered > totalDiff ? 'Vượt quá số lượng cho phép' : ''}
                                    slotProps={{
                                        htmlInput: {
                                            inputMode: 'numeric',
                                            style: {
                                                textAlign: 'right',
                                                fontWeight: 800,
                                                color: parseSplitQty(globalLostQty) > 0 ? '#dc2626' : '#0f172a',
                                            },
                                        },
                                    }}
                                    sx={{
                                        width: 140,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '8px',
                                            bgcolor: '#f8fafc',
                                        },
                                    }}
                                />
                            </Stack>
                        </Paper>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2.5 }}>
                            <FormControl size="small" sx={{ minWidth: 240, flex: 1 }}>
                                <InputLabel>Thêm nhà đài thuộc ngày quay</InputLabel>
                                <Select
                                    label="Thêm nhà đài thuộc ngày quay"
                                    value={stationToAdd}
                                    onChange={(e) => setStationToAdd(e.target.value as number | '')}
                                    disabled={addableStations.length === 0}
                                    sx={{ borderRadius: '10px', bgcolor: '#ffffff' }}
                                >
                                    {addableStations.map((station) => {
                                        const id = Number(station.id ?? station._id);
                                        return (
                                            <MenuItem key={id} value={id}>
                                                {station.name || `Đài #${id}`}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                            <Button
                                variant="outlined"
                                startIcon={<AddCircleOutlineIcon />}
                                disabled={!stationToAdd}
                                onClick={handleAddStation}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', whiteSpace: 'nowrap' }}
                            >
                                Thêm đài
                            </Button>
                        </Stack>

                        <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 1.5 }}>
                            Lý do bổ sung
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Lý do ghi nhận</InputLabel>
                                    <Select
                                        label="Lý do ghi nhận"
                                        value={reasonCode}
                                        onChange={(e) => setReasonCode(e.target.value as SettlementAdjustmentReasonCode)}
                                        sx={{ borderRadius: '10px', bgcolor: '#ffffff' }}
                                    >
                                        <MenuItem value="INSUFFICIENT_IMPORT">Nhập thiếu</MenuItem>
                                        <MenuItem value="OTHER">Lý do khác</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    label="Ghi chú / Diễn giải"
                                    size="small"
                                    fullWidth
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
                            </Grid>

                            {needsMissingEvidence && (
                                <Grid size={{ xs: 12 }}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            borderRadius: '12px',
                                            border: '1px dashed #fca5a5',
                                            bgcolor: '#fff1f2',
                                        }}
                                    >
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                                                <PhotoCameraOutlinedIcon sx={{ color: '#be123c' }} />
                                                <Box>
                                                    <Typography variant="body2" fontWeight={800} color="#9f1239">
                                                        Ảnh minh chứng hư hỏng / rách (*)
                                                    </Typography>
                                                    <Typography variant="caption" color="#be123c">
                                                        Bắt buộc tải 1 ảnh biên bản / ảnh vé hỏng trước khi xác nhận.
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Button
                                                component="label"
                                                variant="outlined"
                                                disabled={uploadingEvidence || !!submitting}
                                                startIcon={<PhotoCameraOutlinedIcon />}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 700,
                                                    borderRadius: '10px',
                                                    borderColor: '#fb7185',
                                                    color: '#be123c',
                                                    bgcolor: '#ffffff',
                                                }}
                                            >
                                                {uploadingEvidence ? 'Đang tải...' : missingEvidenceUrl ? 'Đổi ảnh' : 'Chụp / tải ảnh'}
                                                <input
                                                    hidden
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        void handleMissingEvidenceUpload(file);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </Button>
                                        </Stack>
                                        {missingEvidenceUrl && (
                                            <Box
                                                component="img"
                                                src={missingEvidenceUrl}
                                                alt="Evidence"
                                                sx={{
                                                    mt: 1.5,
                                                    maxHeight: 160,
                                                    maxWidth: '100%',
                                                    borderRadius: '10px',
                                                    border: '1px solid #fecdd3',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                        )}
                                    </Paper>
                                </Grid>
                            )}
                        </Grid>
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
                                          : 'Vui lòng đính kèm ảnh minh chứng cho vé hư hỏng / rách'}
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
                                    damagedEvidenceUrl: needsMissingEvidence ? missingEvidenceUrl.trim() : undefined,
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
                                : `Xác nhận bổ sung ${missingQtyEntered.toLocaleString('vi-VN')} vé & Hoàn tất`}
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
                        {submitting ? 'Đang lưu...' : `Xác nhận ${excessRows.length} vé hệ thống ghi thiếu & Hoàn tất`}
                    </Button>
                </Stack>
            )}

            {/* EXISTING Mode: shortage = view-only inventory; surplus = select + report/void */}
            {mode === 'EXISTING' && (
                <>
                    {isShortage && (
                        <Alert
                            icon={<InfoOutlinedIcon />}
                            severity="info"
                            sx={{ mb: 2, borderRadius: '12px', bgcolor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }}
                        >
                            Chọn đúng {totalDiff.toLocaleString('vi-VN')} vé trong các lô nhập của ngày đối soát, sau đó ghi nhận tình trạng và lý do.
                        </Alert>
                    )}

                    {isShortage && (
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1.25 }}>
                            Danh sách vé được nhập trong ngày đối soát
                        </Typography>
                    )}

                    {/* Batch tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
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

                    {/* Station sub-tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs
                            value={selectedStation}
                            onChange={(_, val) => setSelectedStation(val)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={tabSx}
                        >
                            <Tab
                                value="ALL"
                                label={
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>Tất cả nhà đài</span>
                                        <Chip
                                            size="small"
                                            label={serialsInSelectedBatch.length}
                                            sx={{
                                                height: 20,
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                bgcolor: selectedStation === 'ALL' ? '#dbeafe' : '#f1f5f9',
                                                color: selectedStation === 'ALL' ? '#1d4ed8' : '#64748b',
                                            }}
                                        />
                                    </Stack>
                                }
                            />
                            {stationList.map((station) => (
                                <Tab
                                    key={station.name}
                                    value={station.name}
                                    label={
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <span>{station.name}</span>
                                            <Chip
                                                size="small"
                                                label={station.count}
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    bgcolor: selectedStation === station.name ? '#dbeafe' : '#f1f5f9',
                                                    color: selectedStation === station.name ? '#1d4ed8' : '#64748b',
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
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                    >
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
                                maxWidth: { xs: '100%', sm: 400 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    bgcolor: '#f8fafc',
                                },
                            }}
                        />

                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" fontWeight={600} color="#64748b">
                                Hiển thị: <strong>{filteredSerials.length}</strong> / {serialsInSelectedBatch.length} vé
                            </Typography>
                            {canActOnSerials && selected.length > 0 && (
                                <Chip
                                    size="small"
                                    color="primary"
                                    label={`Đã chọn ${selected.length} vé (${formatSettlementMoney(selectedCostSum)} VNĐ)`}
                                    onDelete={() => setSelected([])}
                                    sx={{ fontWeight: 700 }}
                                />
                            )}
                        </Stack>
                    </Stack>

                    {/* Serials Table */}
                    {loading ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="#64748b">
                                Đang tải danh sách vé trong lô...
                            </Typography>
                        </Box>
                    ) : (
                        <Paper
                            variant="outlined"
                            sx={{
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
                                            const batchLabel =
                                                s.importBatchCode
                                                || batchTabs.find((b) => b.id === Number(s.importBatchId))?.label
                                                || (s.importBatchId != null ? `Lô #${s.importBatchId}` : '—');
                                            return (
                                                <TableRow
                                                    key={s.serialId}
                                                    hover
                                                    selected={canActOnSerials && isRowSelected}
                                                    onClick={canActOnSerials ? () => toggle(s.serialId) : undefined}
                                                    sx={{
                                                        cursor: canActOnSerials ? 'pointer' : 'default',
                                                        '&.Mui-selected': { bgcolor: '#eff6ff !important' },
                                                        '&:hover': { bgcolor: '#f8fafc' },
                                                    }}
                                                >
                                                    {canActOnSerials && (
                                                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox
                                                                checked={isRowSelected}
                                                                onChange={() => toggle(s.serialId)}
                                                                size="small"
                                                                color="primary"
                                                            />
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: '#0f172a' }}>
                                                            {s.serialNumber}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" fontWeight={700} color="#475569">
                                                            {batchLabel}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            icon={<LocationOnOutlinedIcon style={{ fontSize: '0.85rem' }} />}
                                                            label={s.stationName || 'Chưa rõ'}
                                                            sx={{
                                                                bgcolor: '#eff6ff',
                                                                color: '#1d4ed8',
                                                                fontWeight: 600,
                                                                fontSize: '0.75rem',
                                                                border: '1px solid #bfdbfe',
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" fontWeight={700} color="#166534">
                                                            {formatSettlementMoney(Number(s.importCost || 0))}{' '}
                                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>VNĐ</span>
                                                        </Typography>
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

                    {canActOnSerials && (
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
                                    fullWidth
                                    placeholder="Diễn giải chi tiết lý do..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
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
                        Chỉ có thể hoàn tất khi chọn đúng {totalDiff.toLocaleString('vi-VN')} vé hệ thống đã ghi thừa. Hệ thống sẽ cập nhật tình trạng và lưu lịch sử kiểm toán.
                    </Alert>

                    {/* Actions */}
                    <Stack direction="row" spacing={1.5} justifyContent="flex-end" alignItems="center">
                        <Button
                            variant="outlined"
                            disabled={submitting || selected.length === 0 || (isShortage && !isSelectedQtyExact)}
                            startIcon={<SaveOutlinedIcon />}
                            onClick={() => {
                                const parsedAmount = amount ? parseInt(amount.replace(/\D/g, ''), 10) : undefined;
                                onResolve({
                                    serialIds: selected,
                                    ticketCondition: condition || null,
                                    reasonCode,
                                    adjustmentAmount: parsedAmount,
                                    note: note || undefined,
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
                            disabled={submitting || selected.length === 0 || (isShortage && !isSelectedQtyExact)}
                            startIcon={<CheckCircleOutlinedIcon />}
                            onClick={() => {
                                const parsedAmount = amount ? parseInt(amount.replace(/\D/g, ''), 10) : undefined;
                                onResolve({
                                    serialIds: selected,
                                    ticketCondition: condition || null,
                                    reasonCode,
                                    adjustmentAmount: parsedAmount,
                                    note: note || undefined,
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
                                ? 'Đang lưu...'
                                : isShortage
                                  ? `Xác nhận xử lý (${selected.length}/${totalDiff} vé)`
                                  : `Hoàn tất xử lý (${selected.length} vé)`}
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
