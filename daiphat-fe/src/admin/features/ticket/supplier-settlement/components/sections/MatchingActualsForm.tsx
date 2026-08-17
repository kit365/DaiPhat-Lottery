"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    InputAdornment,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    LinearProgress,
} from '@mui/material';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingFlatOutlinedIcon from '@mui/icons-material/TrendingFlatOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import dayjs from 'dayjs';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { useSupplierDetail } from '@/admin/features/supplier';
import { useStationsByDrawDate } from '@/admin/features/station/hooks/useStation';
import { ROUTES } from '../../../../../constants/routes';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { AppToast } from '../../../../../../utils/toast.util';
import {
    attachImportBatchInvoiceEvidence,
    attachTicketListImages,
    uploadImportBatchInvoiceEvidence,
} from '../../../import-batch/services/importBatchService';
import { ImportBatchTicketListImagesField } from '../../../import-batch/components/sections/ImportBatchTicketListImagesField';
import { updateSupplierSettlementReceiptUrl } from '../../services/supplierSettlementService';
import { deleteStoredFileByUrl } from '../../services/storageService';
import {
    readMatchingActualsDraft,
    writeMatchingActualsDraft,
} from '../../utils/matchingActualsDraftStorage';
import { clearAllPendingMatchingDraftFiles } from '../../utils/matchingActualsDraftFiles';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import type {
    SettlementAdjustmentReasonCode,
    SettlementDiscrepancyItem,
    SettlementMatchingAdditionalCost,
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SettlementStationPricing,
    SupplierSettlement,
    SupplierSettlementAdjustment,
    SupplierSettlementDiscrepancyType,
} from '../../types/supplierSettlement.type';
import { computeImportCostFromStation, formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { MatchingStationPricingTable } from './MatchingStationPricingTable';
import {
    buildLiveDiscrepancyItems,
    getDiscrepancyItemLabel,
    getDiscrepancyItemBadgeModifier,
    getDiscrepancyTypeLabel,
    getQtyDiffBadgeModifier,
    getReturnBatchCutOffDisplay,
    getReturnMatchingLockDetails,
    isReturnBatchHandedOver,
    isReturnMatchingForfeitedToAgent,
    isReturnMatchingOverdueUnhanded,
    isReturnReconciliationLocked,
    resolveLiveSystemImportQuantity,
    resolveLiveSystemReturnQuantity,
    SUPPLIER_SETTLEMENT_DISCREPANCY_TYPES,
} from '../../utils/settlementLabels';
import { formatSettlementMoney, scaleSettlementMoney } from '../../utils/settlementCashflow';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import type { ReturnBatchStatus } from '../../../return-batch/types/returnBatch.type';
import {
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusLabel,
} from '../../../return-batch/utils/returnBatchLabels';

/** Matching evidence: images + PDF / Excel / CSV (same as import-batch). */
const MATCHING_EVIDENCE_ACCEPT =
    'image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf,.csv,.xls,.xlsx,.xlsm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MATCHING_EVIDENCE_HINT = 'Ảnh, PDF, Excel, CSV (tối đa 10MB) · Bắt buộc';

const isPersistableMatchingEvidenceUrl = (url?: string | null): boolean => {
    const trimmed = (url || '').trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return false;
    return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/');
};

const deleteMatchingCloudinaryUrl = async (url?: string | null): Promise<void> => {
    if (!isPersistableMatchingEvidenceUrl(url)) {
        return;
    }
    await deleteStoredFileByUrl(url!.trim());
};

const isAllowedMatchingEvidenceFile = (file: File): boolean => {
    const type = (file.type || '').toLowerCase();
    if (type.startsWith('image/')) return true;
    if (
        type === 'application/pdf'
        || type === 'text/csv'
        || type === 'application/csv'
        || type === 'application/vnd.ms-excel'
        || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        || type === 'application/vnd.ms-excel.sheet.macroenabled.12'
    ) {
        return true;
    }
    const name = file.name.toLowerCase();
    return (
        name.endsWith('.pdf')
        || name.endsWith('.csv')
        || name.endsWith('.xls')
        || name.endsWith('.xlsx')
        || name.endsWith('.xlsm')
        || name.endsWith('.png')
        || name.endsWith('.jpg')
        || name.endsWith('.jpeg')
        || name.endsWith('.webp')
        || name.endsWith('.gif')
    );
};

const isLikelyImageEvidenceUrl = (url?: string | null, file?: File | null): boolean => {
    if (file) {
        return (file.type || '').toLowerCase().startsWith('image/');
    }
    if (!url) return false;
    const path = url.split('?')[0].toLowerCase();
    // Blob URLs without a File cannot be typed safely — treat as non-image.
    if (path.startsWith('blob:')) {
        return false;
    }
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(path);
};

const getEvidenceFileLabel = (url?: string | null, file?: File | null): string => {
    if (file?.name) return file.name;
    if (!url) return 'Tệp đính kèm';
    try {
        const path = decodeURIComponent(url.split('?')[0]);
        const name = path.split('/').pop() || '';
        return name || 'Tệp đính kèm';
    } catch {
        return 'Tệp đính kèm';
    }
};

const MONETARY_COST_TYPES: Array<{ value: SettlementAdjustmentReasonCode; label: string }> = [
    { value: 'SHIPPING_FEE', label: 'Phí vận chuyển (+)' },
    { value: 'LATE_PENALTY', label: 'Phạt chậm (+)' },
    { value: 'DISCOUNT', label: 'Chiết khấu / giảm trừ (−)' },
    { value: 'OTHER', label: 'Khác (±)' },
];

const AUTO_PAYMENT_DIFF_REASON = 'Chênh lệch thanh toán so với biên lai (phát sinh ngoài kỳ)';

interface AdditionalCostRow {
    key: string;
    additionalCost: string;
    additionalCostType: SettlementAdjustmentReasonCode;
    additionalCostReason: string;
    additionalCostCustomName: string;
    additionalCostSign?: '+' | '-';
    isAutoPaymentDifference?: boolean;
}

const getDefaultSignForType = (type: SettlementAdjustmentReasonCode): '+' | '-' => {
    if (type === 'DISCOUNT') return '-';
    return '+';
};

const isSignFixedForType = (type: SettlementAdjustmentReasonCode): boolean => {
    return type === 'SHIPPING_FEE' || type === 'LATE_PENALTY' || type === 'DISCOUNT';
};

const parseCostRowAmount = (row: AdditionalCostRow): number => {
    const rawVal = (row.additionalCost || '').replace(/\D/g, '');
    if (!rawVal) return 0;
    const num = parseInt(rawVal, 10);
    if (!Number.isFinite(num) || num === 0) return 0;
    const sign = row.additionalCostSign || getDefaultSignForType(row.additionalCostType);
    return sign === '-' ? -num : num;
};

interface MatchingActualsFormProps {
    settlement: SupplierSettlement;
    importBatches?: SettlementOverviewImportBatch[];
    returnBatches?: SettlementOverviewReturnBatch[];
    adjustments?: SupplierSettlementAdjustment[];
    stationPricing?: SettlementStationPricing[];
    inventoryByStation?: SettlementStationInventory[];
    isSubmitting?: boolean;
    onCancelEdit?: () => void;
    onZoomImage?: (payload: { url: string; title: string }) => void;
    onReceiptUploaded?: () => void;
    onStationsUpdated?: () => void;
    onConfirm: (payload: {
        actualTicketImportQuantity: number;
        actualTicketImportValue: number;
        actualReturnTicketQuantity: number;
        actualReturnTicketValue: number;
        reconciledTicketUnitPrice?: number;
        reconciliationNote?: string;
        actualPaidAmount: number;
        additionalCosts?: SettlementMatchingAdditionalCost[];
        actualTicketImportPrice: number;
        stationCommissions?: Array<{ lotteryStationId: number; actualCommissionRate: number }>;
    }) => void | Promise<void>;
}

/** Formats whole-number inputs (ticket quantities and receipt amounts). */
const formatWholeNumberInput = (val?: number | string | null): string => {
    if (val === '' || val === null || val === undefined) return '';
    if (typeof val === 'number') {
        return Number.isFinite(val) ? Math.round(val).toLocaleString('vi-VN') : '';
    }
    const digits = String(val).replace(/\D/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toLocaleString('vi-VN');
};

/** Formats signed money inputs with dots (e.g. +20.000 or -50.000). */
const formatSignedWithDots = (val?: number | string | null): string => {
    if (val === '' || val === null || val === undefined) return '';
    if (typeof val === 'number') {
        if (!Number.isFinite(val) || val === 0) return '0';
        const formatted = Math.abs(Math.round(val)).toLocaleString('vi-VN');
        return val < 0 ? `-${formatted}` : formatted;
    }
    const str = String(val).trim();
    const isNegative = str.startsWith('-');
    const digits = str.replace(/\D/g, '');
    if (!digits) return isNegative ? '-' : '';
    const formatted = parseInt(digits, 10).toLocaleString('vi-VN');
    return isNegative ? `-${formatted}` : formatted;
};

const parseSignedFromDots = (val?: string | null): number => {
    if (!val) return 0;
    const str = String(val).trim();
    const isNegative = str.startsWith('-');
    const digits = str.replace(/\D/g, '');
    if (!digits) return 0;
    const num = parseInt(digits, 10);
    return isNegative ? -num : num;
};

const parseWholeNumberInput = (val?: string | null): number => {
    if (!val) return 0;
    const digits = String(val).replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
};

/** Caps a whole-number field so actual return qty cannot exceed the system return qty. */
const capFormattedWholeNumber = (value: string, max: number): string => {
    if (!value.trim()) return '';
    return formatWholeNumberInput(Math.min(parseWholeNumberInput(value), Math.max(0, max)));
};

const isImageUrl = (url?: string): boolean => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return /\.(jpg|jpeg|png|webp|gif)$/.test(cleanUrl);
};

const asStringUrlList = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim());
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return asStringUrlList(parsed);
        } catch {
            return [value];
        }
        return [value];
    }
    return [];
};

const mapSettlementAdjustmentsToRows = (adjustments?: SupplierSettlementAdjustment[]): AdditionalCostRow[] =>
    (adjustments || [])
        .filter((row) => row.groupType === 'SETTLEMENT')
        .map((row) => {
            const reasonType = MONETARY_COST_TYPES.some((type) => type.value === row.reasonCode)
                ? row.reasonCode
                : 'OTHER';
            const sign = row.amount < 0 ? '-' : '+';
            return {
                key: `adj-${row.id}`,
                additionalCost: formatWholeNumberInput(Math.abs(row.amount)),
                additionalCostType: reasonType,
                additionalCostSign: sign,
                additionalCostReason: row.note || '',
                additionalCostCustomName: row.reasonCode === 'OTHER' ? (row.customName || '') : '',
                isAutoPaymentDifference: Boolean(row.autoGenerated) || row.note === AUTO_PAYMENT_DIFF_REASON,
            };
        });

const createAdditionalCostRow = (type: SettlementAdjustmentReasonCode = 'SHIPPING_FEE'): AdditionalCostRow => ({
    key: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    additionalCost: '',
    additionalCostType: type,
    additionalCostSign: getDefaultSignForType(type),
    additionalCostReason: '',
    additionalCostCustomName: '',
    isAutoPaymentDifference: false,
});

export const MatchingActualsForm = ({
    settlement,
    importBatches = [],
    returnBatches = [],
    adjustments = [],
    stationPricing = [],
    inventoryByStation = [],
    isSubmitting = false,
    onCancelEdit,
    onZoomImage,
    onReceiptUploaded,
    onStationsUpdated,
    onConfirm,
}: MatchingActualsFormProps) => {
    const router = useAdminRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingImportReceipt, setIsDraggingImportReceipt] = useState(false);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [isUploadingImportReceipt, setIsUploadingImportReceipt] = useState(false);
    const [isFlushingDraft, setIsFlushingDraft] = useState(false);
    /** Chưa xác nhận đối chiếu → form chỉ là nháp, không lấy actual* / ảnh đã lưu từ BE. */
    const isMatchingDraft = !settlement.matchingConfirmedAt;
    const [receiptUrl, setReceiptUrl] = useState(() =>
        settlement.matchingConfirmedAt ? (settlement.supplierSettlementReceiptUrl || '') : ''
    );
    const [pendingNccReceiptFile, setPendingNccReceiptFile] = useState<File | null>(null);
    const [previewZoom, setPreviewZoom] = useState<{ url: string; title: string } | null>(null);
    const [compareModalOpen, setCompareModalOpen] = useState(false);
    const [compareLeftTab, setCompareLeftTab] = useState<'receipt' | 'ticketList'>('receipt');
    const [returnBatchesDialogOpen, setReturnBatchesDialogOpen] = useState(false);
    const [returnHandoverConfirmOpen, setReturnHandoverConfirmOpen] = useState(false);
    const [localImportReceiptById, setLocalImportReceiptById] = useState<Record<number, string>>({});
    const [localTicketListImagesById, setLocalTicketListImagesById] = useState<Record<number, string[]>>({});
    const [pendingImportReceiptFileById, setPendingImportReceiptFileById] = useState<Record<number, File | null>>({});
    const [pendingTicketListFilesById, setPendingTicketListFilesById] = useState<Record<number, File[]>>({});
    const [pendingStationPricing, setPendingStationPricing] = useState<
        Array<{ lotteryStationId: number; importCost: number; commissionRate: number }>
    >([]);
    const [actualImportPrice, setActualImportPrice] = useState(() =>
        Math.round(Number(
            settlement.actualTicketImportPrice
            || settlement.systemTicketImportPrice
            || 10000
        ))
    );
    const [stationCommissions, setStationCommissions] = useState<
        Array<{ lotteryStationId: number; actualCommissionRate: number }>
    >([]);
    const [isUploadingTicketListImages, setIsUploadingTicketListImages] = useState(false);
    const [importEvidenceTab, setImportEvidenceTab] = useState<'receipt' | 'ticketList'>('receipt');
    const [draftReady, setDraftReady] = useState(false);
    const [stationPricingHydrateKey, setStationPricingHydrateKey] = useState(0);

    const [selectedImportId, setSelectedImportId] = useState<number | null>(importBatches[0]?.id ?? null);

    const { data: supplier } = useSupplierDetail(settlement.lotterySupplierId);
    const drawDate = settlement.periodFrom ? String(settlement.periodFrom).slice(0, 10) : undefined;
    const { data: stationsByDrawDate } = useStationsByDrawDate(drawDate);
    const stationsForDrawDate = Array.isArray(stationsByDrawDate) ? stationsByDrawDate : [];

    const pricingRows = useMemo<SettlementStationPricing[]>(() => {
        const liveSystemFace = Math.round(Number(supplier?.defaultImportCost || 10000));
        const storedSystemFace = Math.round(Number(
            settlement.systemTicketImportPrice
            || liveSystemFace
            || 10000
        ));
        const systemFace = isMatchingDraft ? liveSystemFace : storedSystemFace;
        const stationById = new Map(
            (stationsForDrawDate || []).map((station) => [Number(station.id ?? station._id), station])
        );
        if (stationPricing.length > 0) {
            return stationPricing.map((row) => {
                const liveStation = stationById.get(Number(row.lotteryStationId));
                const commissionRate = isMatchingDraft && liveStation?.commissionRate != null
                    ? Number(liveStation.commissionRate)
                    : Number(row.commissionRate || 0);
                const importCost = systemFace;
                const net = computeImportCostFromStation(importCost, commissionRate)
                    ?? importCost * (1 - commissionRate);
                return {
                    ...row,
                    importCost,
                    commissionRate,
                    netUnitPrice: Math.round(Number(net || 0)),
                };
            });
        }
        return (inventoryByStation || [])
            .filter((row) => Number(row.importedQuantity || 0) > 0 && row.lotteryStationId != null)
            .map((row) => {
                const station = stationById.get(Number(row.lotteryStationId));
                const importCost = systemFace;
                const commissionRate = Number(station?.commissionRate ?? 0);
                const net = computeImportCostFromStation(importCost, commissionRate) ?? importCost * (1 - commissionRate);
                return {
                    lotteryStationId: row.lotteryStationId,
                    lotteryStationName: row.lotteryStationName || station?.name || `Đài #${row.lotteryStationId}`,
                    importedQuantity: row.importedQuantity,
                    importCost,
                    commissionRate,
                    netUnitPrice: Math.round(net),
                    actualCommissionRate: commissionRate,
                };
            });
    }, [
        stationPricing,
        inventoryByStation,
        stationsForDrawDate,
        settlement.systemTicketImportPrice,
        supplier?.defaultImportCost,
        isMatchingDraft,
    ]);

    const displayPricingRows = pricingRows;

    useEffect(() => {
        if (settlement.matchingConfirmedAt && settlement.actualTicketImportPrice) {
            setActualImportPrice(Math.round(Number(settlement.actualTicketImportPrice)));
            return;
        }
        const face = Math.round(Number(
            isMatchingDraft
                ? (supplier?.defaultImportCost || pricingRows[0]?.importCost || 0)
                : (settlement.systemTicketImportPrice || pricingRows[0]?.importCost || supplier?.defaultImportCost || 0)
        ));
        if (face > 0) {
            setActualImportPrice((prev) => (prev === 10000 || prev === face ? face : prev));
        }
    }, [
        settlement.matchingConfirmedAt,
        settlement.actualTicketImportPrice,
        settlement.systemTicketImportPrice,
        pricingRows,
        supplier?.defaultImportCost,
        isMatchingDraft,
    ]);

    const [stationNets, setStationNets] = useState({
        systemNet: 0,
        actualNet: 0,
        complete: false,
        priceMismatchStations: [] as Array<{
            lotteryStationId: number;
            lotteryStationName: string;
            systemImportCost: number;
            actualImportCost: number;
        }>,
        commissionMismatchStations: [] as Array<{
            lotteryStationId: number;
            lotteryStationName: string;
            systemCommissionRate: number;
            actualCommissionRate: number;
        }>,
    });
    const handleStationWeightedChange = useCallback((payload: {
        systemNet: number;
        actualNet: number;
        complete: boolean;
        priceMismatchStations: Array<{
            lotteryStationId: number;
            lotteryStationName: string;
            systemImportCost: number;
            actualImportCost: number;
        }>;
        commissionMismatchStations: Array<{
            lotteryStationId: number;
            lotteryStationName: string;
            systemCommissionRate: number;
            actualCommissionRate: number;
        }>;
        stationCommissions: Array<{ lotteryStationId: number; actualCommissionRate: number }>;
    }) => {
        setStationCommissions(payload.stationCommissions);
        setStationNets((prev) => {
            const samePrice =
                prev.priceMismatchStations.length === payload.priceMismatchStations.length
                && prev.priceMismatchStations.every((row, idx) => {
                    const next = payload.priceMismatchStations[idx];
                    return (
                        row.lotteryStationId === next.lotteryStationId
                        && row.systemImportCost === next.systemImportCost
                        && row.actualImportCost === next.actualImportCost
                    );
                });
            const sameCommission =
                prev.commissionMismatchStations.length === payload.commissionMismatchStations.length
                && prev.commissionMismatchStations.every((row, idx) => {
                    const next = payload.commissionMismatchStations[idx];
                    return (
                        row.lotteryStationId === next.lotteryStationId
                        && row.systemCommissionRate === next.systemCommissionRate
                        && row.actualCommissionRate === next.actualCommissionRate
                    );
                });
            if (
                prev.systemNet === payload.systemNet
                && prev.actualNet === payload.actualNet
                && prev.complete === payload.complete
                && samePrice
                && sameCommission
            ) {
                return prev;
            }
            return {
                systemNet: Number.isFinite(payload.systemNet) ? payload.systemNet : 0,
                actualNet: Number.isFinite(payload.actualNet) ? payload.actualNet : 0,
                complete: payload.complete,
                priceMismatchStations: payload.priceMismatchStations,
                commissionMismatchStations: payload.commissionMismatchStations,
            };
        });
    }, []);

    const originalUnitPrice = useMemo(() => {
        if (pricingRows.length > 0) {
            const totalQty = pricingRows.reduce((sum, row) => sum + (row.importedQuantity || 0), 0);
            const weightedNet = pricingRows.reduce(
                (sum, row) => sum + Number(row.netUnitPrice || 0) * (row.importedQuantity || 0),
                0
            );
            if (totalQty > 0 && weightedNet > 0) {
                return scaleSettlementMoney(weightedNet / totalQty);
            }
        }
        if (settlement.originalTicketUnitPrice && settlement.originalTicketUnitPrice > 0) {
            return scaleSettlementMoney(Number(settlement.originalTicketUnitPrice));
        }
        if (settlement.systemImportQuantity && settlement.systemImportQuantity > 0 && settlement.systemImportValue) {
            return scaleSettlementMoney(Number(settlement.systemImportValue) / settlement.systemImportQuantity);
        }
        return 10000;
    }, [settlement, pricingRows]);

    const initialUnitPrice = useMemo(() => {
        if (settlement.reconciledTicketUnitPrice && settlement.reconciledTicketUnitPrice > 0) {
            return scaleSettlementMoney(Number(settlement.reconciledTicketUnitPrice));
        }
        if (settlement.actualTicketPrice && settlement.actualTicketPrice > 0) {
            return scaleSettlementMoney(Number(settlement.actualTicketPrice));
        }
        return originalUnitPrice;
    }, [settlement, originalUnitPrice]);

    const isReturnLocked = useMemo(
        () => isReturnReconciliationLocked(returnBatches),
        [returnBatches]
    );

    const firstActiveReturnBatch = useMemo(
        () => (returnBatches || []).find((b) => b.status && b.status !== 'CANCELLED') || returnBatches[0] || null,
        [returnBatches]
    );

    const isReturnOverdue = useMemo(
        () =>
            isReturnMatchingOverdueUnhanded(
                {
                    isReturnExpired: settlement.isReturnExpired,
                    periodTo: settlement.periodTo,
                    periodFrom: settlement.periodFrom,
                    supplierReturnCutOffTime: supplier?.returnCutOffTime,
                },
                returnBatches
            ),
        [settlement.isReturnExpired, settlement.periodTo, settlement.periodFrom, supplier?.returnCutOffTime, returnBatches]
    );

    /** Status-only forfeit (no handover yet) OR overdue + unhanded → agent bears remaining inventory. */
    const isReturnForfeited = useMemo(
        () => isReturnMatchingForfeitedToAgent(returnBatches) || isReturnOverdue,
        [returnBatches, isReturnOverdue]
    );

    const cutOffTimeDisplay = useMemo(() => {
        return getReturnBatchCutOffDisplay(
            firstActiveReturnBatch,
            supplier?.returnCutOffTime,
            settlement.periodTo || settlement.periodFrom
        );
    }, [firstActiveReturnBatch, supplier?.returnCutOffTime, settlement.periodTo, settlement.periodFrom]);

    const returnLockDetails = useMemo(
        () =>
            getReturnMatchingLockDetails(
                returnBatches,
                {
                    isReturnExpired: settlement.isReturnExpired,
                    periodTo: settlement.periodTo,
                    periodFrom: settlement.periodFrom,
                    supplierReturnCutOffTime: supplier?.returnCutOffTime,
                },
                cutOffTimeDisplay
            ),
        [
            returnBatches,
            settlement.isReturnExpired,
            settlement.periodTo,
            settlement.periodFrom,
            supplier?.returnCutOffTime,
            cutOffTimeDisplay,
        ]
    );

    /** Lock return inputs when pending handling, all CANCELLED, or period expired. */
    const isReturnInputsLocked = returnLockDetails.inputsLocked;

    const returnHandoverSummary = useMemo(() => {
        const activeBatches = returnBatches.filter((b) => b.status && b.status !== 'CANCELLED');
        const pendingBatches = activeBatches.filter((b) => !isReturnBatchHandedOver(b.status));
        const forfeitedBatches = activeBatches.filter((b) => b.status === 'REJECTED' || b.status === 'OVERDUE_LOCKED');
        return {
            hasReturn: returnBatches.length > 0,
            forfeitedToAgent: isReturnForfeited,
            forfeitedBatchCodes: forfeitedBatches.map((b) => b.batchCode || `#${b.id}`),
            allHandedOver: pendingBatches.length === 0,
            pendingBatches,
        };
    }, [returnBatches, isReturnForfeited]);

    const liveSystemImportQty = useMemo(
        () => resolveLiveSystemImportQuantity(settlement, importBatches, inventoryByStation),
        [settlement, importBatches, inventoryByStation]
    );
    const liveSystemReturnQty = useMemo(
        () => resolveLiveSystemReturnQuantity(settlement, returnBatches),
        [settlement, returnBatches]
    );

    const [unitPrice, setUnitPrice] = useState(() => formatWholeNumberInput(initialUnitPrice));
    const [importQty, setImportQty] = useState(() =>
        formatWholeNumberInput(
            settlement.matchingConfirmedAt && settlement.actualTicketImportQuantity != null
                ? settlement.actualTicketImportQuantity
                : resolveLiveSystemImportQuantity(settlement, importBatches, inventoryByStation)
        )
    );
    const [returnQty, setReturnQty] = useState(() => {
        const overdueOrForfeit =
            isReturnMatchingForfeitedToAgent(returnBatches)
            || isReturnMatchingOverdueUnhanded(
                {
                    isReturnExpired: settlement.isReturnExpired,
                    periodTo: settlement.periodTo,
                    periodFrom: settlement.periodFrom,
                },
                returnBatches
            );
        const systemQty = resolveLiveSystemReturnQuantity(settlement, returnBatches);
        if (overdueOrForfeit || !settlement.matchingConfirmedAt) {
            return formatWholeNumberInput(systemQty);
        }
        return formatWholeNumberInput(
            Math.min(settlement.actualReturnTicketQuantity ?? systemQty, systemQty)
        );
    });
    const [note, setNote] = useState(() =>
        settlement.matchingConfirmedAt ? (settlement.reconciliationNote || '') : ''
    );
    const [actualPaidAmount, setActualPaidAmount] = useState(() =>
        settlement.matchingConfirmedAt ? formatSignedWithDots(settlement.actualPaidAmount) : ''
    );
    const [additionalCostRows, setAdditionalCostRows] = useState<AdditionalCostRow[]>(() =>
        settlement.matchingConfirmedAt ? mapSettlementAdjustmentsToRows(adjustments) : []
    );

    /** True after the user edits SL nhập — blocks background refetch from overwriting the field. */
    const importQtyDirtyRef = useRef(false);
    const returnQtyDirtyRef = useRef(false);
    const importQtyRef = useRef(importQty);
    importQtyRef.current = importQty;
    const returnQtyRef = useRef(returnQty);
    returnQtyRef.current = returnQty;
    const noteRef = useRef(note);
    noteRef.current = note;
    const actualPaidAmountRef = useRef(actualPaidAmount);
    actualPaidAmountRef.current = actualPaidAmount;
    const additionalCostRowsRef = useRef(additionalCostRows);
    additionalCostRowsRef.current = additionalCostRows;

    const initialSettlementIdRef = useRef<number | null>(settlement.id);

    useEffect(() => {
        if (!importBatches.some((b) => b.id === selectedImportId)) {
            setSelectedImportId(importBatches[0]?.id ?? null);
        }
    }, [importBatches, selectedImportId]);

    // Only re-initialize form fields when the settlement ID changes (navigating to a different settlement)
    useEffect(() => {
        if (initialSettlementIdRef.current !== settlement.id) {
            initialSettlementIdRef.current = settlement.id;
            const draft = !settlement.matchingConfirmedAt;
            setReceiptUrl(draft ? '' : (settlement.supplierSettlementReceiptUrl || ''));
            setPendingNccReceiptFile(null);
            setLocalImportReceiptById({});
            setLocalTicketListImagesById({});
            setPendingImportReceiptFileById({});
            setPendingTicketListFilesById({});
            const derivedUnitPrice =
                !draft && settlement.reconciledTicketUnitPrice && settlement.reconciledTicketUnitPrice > 0
                    ? Number(settlement.reconciledTicketUnitPrice)
                    : !draft && settlement.actualTicketPrice && settlement.actualTicketPrice > 0
                    ? Number(settlement.actualTicketPrice)
                    : originalUnitPrice;

            setUnitPrice(formatWholeNumberInput(derivedUnitPrice));
            importQtyDirtyRef.current = false;
            returnQtyDirtyRef.current = false;
            setImportQty(
                formatWholeNumberInput(
                    !draft && settlement.actualTicketImportQuantity != null
                        ? settlement.actualTicketImportQuantity
                        : resolveLiveSystemImportQuantity(settlement, importBatches, inventoryByStation)
                )
            );
            const overdueOrForfeit =
                isReturnMatchingForfeitedToAgent(returnBatches)
                || isReturnMatchingOverdueUnhanded(
                    {
                        isReturnExpired: settlement.isReturnExpired,
                        periodTo: settlement.periodTo,
                        periodFrom: settlement.periodFrom,
                        supplierReturnCutOffTime: supplier?.returnCutOffTime,
                    },
                    returnBatches
                );
            const systemReturn = resolveLiveSystemReturnQuantity(settlement, returnBatches);
            setReturnQty(
                formatWholeNumberInput(
                    overdueOrForfeit || draft
                        ? systemReturn
                        : Math.min(settlement.actualReturnTicketQuantity ?? systemReturn, systemReturn)
                )
            );
            setNote(draft ? '' : (settlement.reconciliationNote || ''));
            setActualPaidAmount(draft ? '' : formatSignedWithDots(settlement.actualPaidAmount));
            setAdditionalCostRows(draft ? [] : mapSettlementAdjustmentsToRows(adjustments));
        } else if (!isMatchingDraft) {
            // Already confirmed: sync receipt from server if local empty
            if (!receiptUrl && settlement.supplierSettlementReceiptUrl) {
                setReceiptUrl(settlement.supplierSettlementReceiptUrl);
            }
        }
    }, [settlement, originalUnitPrice, returnBatches, adjustments, receiptUrl, importBatches, inventoryByStation, supplier?.returnCutOffTime, isMatchingDraft]);

    // Hydrate browser draft (localStorage Cloudinary URLs).
    useEffect(() => {
        let cancelled = false;
        const settlementId = settlement.id;
        if (settlementId == null) {
            setDraftReady(true);
            return;
        }

        (async () => {
            const draft = readMatchingActualsDraft(settlementId);
            if (cancelled) {
                return;
            }

            if (draft) {
                if (draft.importQty != null) {
                    importQtyDirtyRef.current = true;
                    setImportQty(draft.importQty);
                }
                if (draft.returnQty != null) {
                    returnQtyDirtyRef.current = true;
                    setReturnQty(
                        capFormattedWholeNumber(
                            draft.returnQty,
                            resolveLiveSystemReturnQuantity(settlement, returnBatches)
                        )
                    );
                }
                if (draft.unitPrice != null) {
                    setUnitPrice(draft.unitPrice);
                }
                if (draft.actualPaidAmount != null) {
                    setActualPaidAmount(draft.actualPaidAmount);
                }
                if (draft.note != null) {
                    setNote(draft.note);
                }
                if (Array.isArray(draft.additionalCostRows)) {
                    setAdditionalCostRows(draft.additionalCostRows);
                }
                if (Array.isArray(draft.pendingStationPricing)) {
                    setPendingStationPricing(draft.pendingStationPricing);
                    if (draft.pendingStationPricing[0]?.importCost) {
                        setActualImportPrice(Math.round(Number(draft.pendingStationPricing[0].importCost)));
                    }
                }
                if (draft.actualImportPrice != null && Number(draft.actualImportPrice) > 0) {
                    setActualImportPrice(Math.round(Number(draft.actualImportPrice)));
                }
                if (draft.selectedImportId != null) {
                    setSelectedImportId(draft.selectedImportId);
                }
                if (draft.importEvidenceTab === 'receipt' || draft.importEvidenceTab === 'ticketList') {
                    setImportEvidenceTab(draft.importEvidenceTab);
                }
                if (isPersistableMatchingEvidenceUrl(draft.nccReceiptUrl)) {
                    setReceiptUrl(draft.nccReceiptUrl!.trim());
                }
                if (draft.importReceiptUrlById && typeof draft.importReceiptUrlById === 'object') {
                    const nextReceipts: Record<number, string> = {};
                    Object.entries(draft.importReceiptUrlById).forEach(([batchIdRaw, url]) => {
                        if (isPersistableMatchingEvidenceUrl(url)) {
                            nextReceipts[Number(batchIdRaw)] = url.trim();
                        }
                    });
                    if (Object.keys(nextReceipts).length > 0) {
                        setLocalImportReceiptById(nextReceipts);
                    }
                }
                if (draft.ticketListUrlsById && typeof draft.ticketListUrlsById === 'object') {
                    const nextTickets: Record<number, string[]> = {};
                    Object.entries(draft.ticketListUrlsById).forEach(([batchIdRaw, urls]) => {
                        const persistable = (urls || []).filter((url) => isPersistableMatchingEvidenceUrl(url));
                        if (persistable.length > 0) {
                            nextTickets[Number(batchIdRaw)] = persistable;
                        }
                    });
                    if (Object.keys(nextTickets).length > 0) {
                        setLocalTicketListImagesById(nextTickets);
                    }
                }
            }

            if (draft?.pendingStationPricing?.length) {
                setStationPricingHydrateKey((key) => key + 1);
            }
            setDraftReady(true);
        })().catch(() => {
            if (!cancelled) {
                setDraftReady(true);
            }
        });

        return () => {
            cancelled = true;
        };
        // Only hydrate once per settlement mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settlement.id]);

    // Autosave matching draft to localStorage (Cloudinary URLs).
    useEffect(() => {
        if (!draftReady || settlement.id == null) {
            return;
        }
        const persistableImportReceipts = Object.fromEntries(
            Object.entries(localImportReceiptById)
                .filter(([, url]) => isPersistableMatchingEvidenceUrl(url))
                .map(([batchId, url]) => [String(batchId), url.trim()])
        );
        const persistableTicketLists = Object.fromEntries(
            Object.entries(localTicketListImagesById)
                .map(([batchId, urls]) => [
                    String(batchId),
                    (urls || []).filter((url) => isPersistableMatchingEvidenceUrl(url)),
                ])
                .filter(([, urls]) => (urls as string[]).length > 0)
        );
        const timer = window.setTimeout(() => {
            writeMatchingActualsDraft(settlement.id, {
                importQty,
                returnQty,
                unitPrice,
                actualPaidAmount,
                note,
                additionalCostRows,
                pendingStationPricing: stationCommissions.map((row) => ({
                    lotteryStationId: row.lotteryStationId,
                    importCost: actualImportPrice,
                    commissionRate: row.actualCommissionRate,
                })),
                actualImportPrice,
                selectedImportId,
                importEvidenceTab,
                nccReceiptUrl: isPersistableMatchingEvidenceUrl(receiptUrl) ? receiptUrl.trim() : '',
                importReceiptUrlById: persistableImportReceipts,
                ticketListUrlsById: persistableTicketLists,
                hasPendingNccReceipt: isPersistableMatchingEvidenceUrl(receiptUrl),
                pendingImportReceiptBatchIds: Object.keys(persistableImportReceipts).map(Number),
                pendingTicketListBatchIds: Object.keys(persistableTicketLists).map(Number),
            });
        }, 400);
        return () => window.clearTimeout(timer);
    }, [
        draftReady,
        settlement.id,
        importQty,
        returnQty,
        unitPrice,
        actualPaidAmount,
        note,
        additionalCostRows,
        actualImportPrice,
        stationCommissions,
        selectedImportId,
        importEvidenceTab,
        receiptUrl,
        localImportReceiptById,
        localTicketListImagesById,
    ]);

    const effectiveImportBatches = useMemo<SettlementOverviewImportBatch[]>(() => {
        if (importBatches && importBatches.length > 0) {
            return importBatches;
        }
        const defaultCode = settlement?.supplierSettlementCode
            ? `PN-${settlement.supplierSettlementCode}`
            : 'PN-CHUNG';
        return [
            {
                id: 0,
                batchCode: defaultCode,
                drawDate: settlement?.periodTo || settlement?.periodFrom || '',
                importedQuantity: Number(settlement?.systemImportQuantity || 0),
                ticketListImageUrls: [],
                invoiceEvidenceUrl: '',
                receiptImageUrl: '',
                evidenceUrl: '',
            } as SettlementOverviewImportBatch,
        ];
    }, [importBatches, settlement]);

    const selectedImport = useMemo(
        () => effectiveImportBatches.find((b) => b.id === selectedImportId) || effectiveImportBatches[0],
        [effectiveImportBatches, selectedImportId]
    );

    const importBatchReceiptUrl = (batch?: SettlementOverviewImportBatch | null) => {
        if (batch?.id != null && String(localImportReceiptById[batch.id] || '').trim()) {
            return localImportReceiptById[batch.id];
        }
        return batch?.invoiceEvidenceUrl || batch?.receiptImageUrl || batch?.evidenceUrl || '';
    };

    const importBatchHasReceipt = (batch?: SettlementOverviewImportBatch | null): boolean => {
        if (batch?.id == null) return false;
        return Boolean(String(importBatchReceiptUrl(batch)).trim());
    };

    const importBatchTicketListImages = (batch?: SettlementOverviewImportBatch | null): string[] => {
        if (batch?.id != null && localTicketListImagesById[batch.id]?.length) {
            return localTicketListImagesById[batch.id];
        }
        return asStringUrlList(batch?.ticketListImageUrls);
    };

    const importBatchHasTicketList = (batch?: SettlementOverviewImportBatch | null): boolean => {
        if (batch?.id == null) return false;
        return importBatchTicketListImages(batch).length > 0;
    };

    const isBatchCompleteEvidence = (batch?: SettlementOverviewImportBatch | null): boolean =>
        importBatchHasReceipt(batch) && importBatchHasTicketList(batch);

    const selectedImportReceiptUrl = importBatchReceiptUrl(selectedImport);
    const selectedImportTicketListImages = importBatchTicketListImages(selectedImport);
    const selectedImportPendingReceiptFile =
        selectedImport?.id != null ? (pendingImportReceiptFileById[selectedImport.id] ?? null) : null;
    const selectedImportReceiptIsImage = isLikelyImageEvidenceUrl(
        selectedImportReceiptUrl,
        selectedImportPendingReceiptFile
    );
    const nccReceiptIsImage = isLikelyImageEvidenceUrl(receiptUrl, pendingNccReceiptFile);
    const hasImportReceipt = importBatchHasReceipt(selectedImport);
    const hasSelectedImportTicketListImages = importBatchHasTicketList(selectedImport);
    const isSelectedImportComplete = hasImportReceipt && hasSelectedImportTicketListImages;

    const uploadedImportReceiptCount = useMemo(
        () => effectiveImportBatches.filter((batch) => importBatchHasReceipt(batch)).length,
        [effectiveImportBatches, localImportReceiptById, pendingImportReceiptFileById, isMatchingDraft]
    );

    const uploadedTicketListImagesCount = useMemo(
        () => effectiveImportBatches.filter((batch) => importBatchHasTicketList(batch)).length,
        [effectiveImportBatches, localTicketListImagesById, pendingTicketListFilesById, isMatchingDraft]
    );

    const completeImportBatchesCount = useMemo(
        () => effectiveImportBatches.filter((batch) => isBatchCompleteEvidence(batch)).length,
        [effectiveImportBatches, localImportReceiptById, localTicketListImagesById, pendingImportReceiptFileById, pendingTicketListFilesById, isMatchingDraft]
    );

    const missingImportBatches = useMemo(
        () => effectiveImportBatches.filter((batch) => !importBatchHasReceipt(batch)),
        [effectiveImportBatches, localImportReceiptById, pendingImportReceiptFileById, isMatchingDraft]
    );

    const missingTicketListBatches = useMemo(
        () => effectiveImportBatches.filter((batch) => !importBatchHasTicketList(batch)),
        [effectiveImportBatches, localTicketListImagesById, pendingTicketListFilesById, isMatchingDraft]
    );

    const hasAllImportReceipts =
        effectiveImportBatches.length > 0
        && effectiveImportBatches.every((batch) => importBatchHasReceipt(batch));

    const hasAllTicketListImages =
        effectiveImportBatches.length > 0
        && effectiveImportBatches.every((batch) => importBatchHasTicketList(batch));

    const hasAllImportEvidence = hasAllImportReceipts && hasAllTicketListImages;

    useEffect(() => {
        if (!effectiveImportBatches.some((b) => b.id === selectedImportId)) {
            setSelectedImportId(effectiveImportBatches[0]?.id ?? 0);
        }
    }, [effectiveImportBatches, selectedImportId]);

    const systemImportQty = liveSystemImportQty;
    const systemReturnQty = liveSystemReturnQty;
    // Payable uses giá vốn sau hoa hồng (bình quân bảng đài), not the pre-commission 10.000đ face value
    // that older import lines may still store.
    const systemImportVal = originalUnitPrice > 0
        ? scaleSettlementMoney(originalUnitPrice * systemImportQty)
        : scaleSettlementMoney(Number(settlement.systemImportValue ?? 0));
    const systemReturnVal = originalUnitPrice > 0
        ? scaleSettlementMoney(originalUnitPrice * systemReturnQty)
        : scaleSettlementMoney(Number(settlement.systemReturnValue ?? 0));

    // Pending / overdue / CANCELLED: pin actual return to system qty (read-only).
    useEffect(() => {
        if (!isReturnInputsLocked) {
            return;
        }
        const pinned = formatWholeNumberInput(systemReturnQty);
        setReturnQty((prev) => (prev === pinned ? prev : pinned));
    }, [isReturnInputsLocked, systemReturnQty]);

    // Cap actual return when system return qty shrinks (cannot exceed system).
    useEffect(() => {
        if (isReturnInputsLocked) {
            return;
        }
        setReturnQty((prev) => {
            const next = capFormattedWholeNumber(prev, systemReturnQty);
            if (next === prev) {
                return prev;
            }
            returnQtyRef.current = next;
            return next;
        });
    }, [systemReturnQty, isReturnInputsLocked]);

    // Keep actual import in sync with live system qty when drafting (chưa xác nhận).
    // After confirm: adopt server actual when cache catches up, unless user has edited.
    useEffect(() => {
        if (settlement.matchingConfirmedAt) {
            if (importQtyDirtyRef.current) {
                return;
            }
            if (settlement.actualTicketImportQuantity == null) {
                return;
            }
            const next = formatWholeNumberInput(settlement.actualTicketImportQuantity);
            setImportQty((prev) => (prev === next ? prev : next));
            return;
        }
        if (!isMatchingDraft) {
            return;
        }
        const next = formatWholeNumberInput(systemImportQty);
        setImportQty((prev) => {
            if (importQtyDirtyRef.current) {
                return prev;
            }
            const prevNum = parseWholeNumberInput(prev);
            if (prevNum === systemImportQty || prevNum === 0) {
                return next;
            }
            return prev;
        });
    }, [systemImportQty, isMatchingDraft, settlement.matchingConfirmedAt, settlement.actualTicketImportQuantity]);

    const isImportQtyEmpty = importQty.trim() === '';
    const isReturnQtyEmpty = returnQty.trim() === '';
    const isUnitPriceEmpty = pricingRows.length > 0
        ? !stationNets.complete
        : unitPrice.trim() === '';

    const hasAllRequiredInputs = !isImportQtyEmpty && !isReturnQtyEmpty && !isUnitPriceEmpty;

    // Parsed numerical values
    const parsedUnitPrice = pricingRows.length > 0
        ? (stationNets.complete ? scaleSettlementMoney(stationNets.actualNet) : 0)
        : parseWholeNumberInput(unitPrice);
    const parsedImportQty = parseWholeNumberInput(importQty);
    const parsedReturnQty = parseWholeNumberInput(returnQty);

    // Auto-calculated import/return values for confirm payload (qty × reconciled unit price)
    const calculatedImportVal = scaleSettlementMoney(parsedImportQty * parsedUnitPrice);
    const calculatedReturnVal = scaleSettlementMoney(parsedReturnQty * parsedUnitPrice);

    // Per-section discrepancy calculations
    const importQtyDiff = parsedImportQty - systemImportQty;
    const importValDiff = calculatedImportVal - systemImportVal;

    const returnQtyDiff = parsedReturnQty - systemReturnQty;
    const returnValDiff = calculatedReturnVal - systemReturnVal;

    const unitPriceDiff = parsedUnitPrice - originalUnitPrice;

    // Real-time discrepancy detection (SupplierSettlementDiscrepancyType)
    const liveDiscrepancyItems = useMemo(
        () =>
            buildLiveDiscrepancyItems({
                unitPriceDiff,
                importQtyDiff,
                returnQtyDiff,
                detectUnitPrice:
                    (parsedUnitPrice > 0 && originalUnitPrice > 0)
                    || stationNets.priceMismatchStations.length > 0
                    || stationNets.commissionMismatchStations.length > 0,
                detectImportQty: !isImportQtyEmpty,
                detectReturnQty: !isReturnQtyEmpty,
            }),
        [
            unitPriceDiff,
            importQtyDiff,
            returnQtyDiff,
            parsedUnitPrice,
            originalUnitPrice,
            isImportQtyEmpty,
            isReturnQtyEmpty,
            stationNets.priceMismatchStations.length,
            stationNets.commissionMismatchStations.length,
        ]
    );
    const liveDiscrepancyTypes = useMemo(
        () => liveDiscrepancyItems.map((item) => item.type),
        [liveDiscrepancyItems]
    );
    const liveDiscrepancyByType = useMemo(() => {
        const map = new Map<SupplierSettlementDiscrepancyType, SettlementDiscrepancyItem>();
        liveDiscrepancyItems.forEach((item) => map.set(item.type, item));
        return map;
    }, [liveDiscrepancyItems]);
    const hasStationPricingMismatch =
        stationNets.priceMismatchStations.length > 0
        || stationNets.commissionMismatchStations.length > 0;
    const displayedDiscrepancyCount = useMemo(() => {
        const types = new Set(liveDiscrepancyTypes);
        if (hasStationPricingMismatch) {
            types.add('IMPORT_UNIT_PRICE');
        }
        return types.size;
    }, [liveDiscrepancyTypes, hasStationPricingMismatch]);

    // Settlement amounts use the same after-commission unit price as the station table.
    const initialEstimatedVal = scaleSettlementMoney(
        originalUnitPrice * (systemImportQty - systemReturnQty)
    );

    const manualAdditionalCostTotal = additionalCostRows.reduce(
        (sum, row) => sum + parseCostRowAmount(row),
        0
    );

    const hasDuplicateCostTypes = useMemo(() => {
        // Chỉ các loại cố định không được trùng nhau. Loại 'OTHER' cho phép tạo nhiều dòng tùy ý.
        const fixedTypes = additionalCostRows
            .map((r) => r.additionalCostType)
            .filter((t) => t && t !== 'OTHER');
        return new Set(fixedTypes).size !== fixedTypes.length;
    }, [additionalCostRows]);

    const hasIncompleteAdditionalCost =
        hasDuplicateCostTypes
        || additionalCostRows.some((row) => {
            const amount = Math.abs(parseCostRowAmount(row));
            const hasAnyValue =
                row.additionalCost.replace(/\D/g, '').length > 0
                || row.additionalCostReason.trim().length > 0
                || row.additionalCostCustomName.trim().length > 0;
            if (!hasAnyValue) {
                return false;
            }
            const missingOtherName = row.additionalCostType === 'OTHER' && !row.additionalCostCustomName.trim();
            return amount === 0 || !row.additionalCostType || !row.additionalCostReason.trim() || missingOtherName;
        });

    // Đối soát chưa gồm chi phí phát sinh — dùng làm mốc để user bổ sung chi phí khớp biên lai.
    const baseFinalVal = hasAllRequiredInputs
        ? scaleSettlementMoney(parsedUnitPrice * (parsedImportQty - parsedReturnQty))
        : null;

    const liveFinalVal = scaleSettlementMoney(
        (baseFinalVal ?? 0) + manualAdditionalCostTotal
    );
    const finalVal = hasAllRequiredInputs ? liveFinalVal : null;
    const differenceAmount = hasAllRequiredInputs
        ? scaleSettlementMoney(liveFinalVal - initialEstimatedVal)
        : 0;
    const parsedActualPaidAmount = parseSignedFromDots(actualPaidAmount);
    const isActualPaidEmpty = actualPaidAmount.trim() === '' || actualPaidAmount.trim() === '-';
    const paymentRemainingDiff =
        !isActualPaidEmpty && finalVal != null
            ? scaleSettlementMoney(parsedActualPaidAmount - finalVal)
            : null;
    const isPaidMatching = paymentRemainingDiff != null && Math.abs(paymentRemainingDiff) < 0.5;
    const paidDiff = paymentRemainingDiff ?? 0;

    /** Khoản cần giải thích bằng chi phí phát sinh = thực trả − đối soát (chưa chi phí). */
    const paymentCoverageTarget =
        !isActualPaidEmpty && baseFinalVal != null
            ? scaleSettlementMoney(parsedActualPaidAmount - baseFinalVal)
            : null;
    const paymentCoverageCovered = scaleSettlementMoney(manualAdditionalCostTotal);
    const paymentCoverageRemaining =
        paymentCoverageTarget != null
            ? scaleSettlementMoney(paymentCoverageTarget - paymentCoverageCovered)
            : null;
    const needsPaymentCoverageCosts =
        paymentCoverageTarget != null && Math.abs(paymentCoverageTarget) >= 0.5;
    const isPaymentCoverageMatched =
        paymentCoverageTarget == null
        || Math.abs(paymentCoverageTarget) < 0.5
        || (paymentCoverageRemaining != null && Math.abs(paymentCoverageRemaining) < 0.5);
    const paymentCoverageProgressPct = (() => {
        if (paymentCoverageTarget == null || Math.abs(paymentCoverageTarget) < 0.5) {
            return 100;
        }
        const sameDirection =
            paymentCoverageCovered === 0
            || (paymentCoverageTarget > 0) === (paymentCoverageCovered > 0);
        if (!sameDirection) {
            return 0;
        }
        return Math.min(100, Math.round((Math.abs(paymentCoverageCovered) / Math.abs(paymentCoverageTarget)) * 100));
    })();

    // Bỏ khóa dòng auto cũ — user tự chọn loại / nhập đủ.
    useEffect(() => {
        setAdditionalCostRows((prev) => {
            if (!prev.some((row) => row.isAutoPaymentDifference)) {
                return prev;
            }
            return prev.map((row) =>
                row.isAutoPaymentDifference
                    ? {
                        ...row,
                        isAutoPaymentDifference: false,
                        additionalCostReason:
                            row.additionalCostReason === AUTO_PAYMENT_DIFF_REASON
                                ? ''
                                : row.additionalCostReason,
                    }
                    : row
            );
        });
    }, []);

    const handleAddAdditionalCostRow = () => {
        const usedTypes = new Set(additionalCostRows.map((r) => r.additionalCostType));
        const nextUnusedType =
            MONETARY_COST_TYPES.find((t) => t.value !== 'OTHER' && !usedTypes.has(t.value))?.value || 'OTHER';
        setAdditionalCostRows((prev) => [
            ...prev,
            createAdditionalCostRow(nextUnusedType),
        ]);
    };

    const handleUpdateAdditionalCostRow = (
        key: string,
        field: keyof AdditionalCostRow,
        value: any
    ) => {
        setAdditionalCostRows((prev) =>
            prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
        );
    };

    const handleDeleteAdditionalCostRow = (key: string) => {
        setAdditionalCostRows((prev) => prev.filter((row) => row.key !== key));
    };

    const ticketValDiff = hasAllRequiredInputs && baseFinalVal != null
        ? scaleSettlementMoney(baseFinalVal - initialEstimatedVal)
        : 0;
    const stationPriceDiffVal = hasAllRequiredInputs
        ? scaleSettlementMoney((parsedUnitPrice - originalUnitPrice) * (parsedImportQty - parsedReturnQty))
        : 0;

    const ticketVarianceTone =
        !hasAllRequiredInputs || Math.abs(ticketValDiff) < 0.5
            ? { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Khớp vé', badgeModifier: 'admin-status-badge--success', icon: <TrendingFlatOutlinedIcon sx={{ fontSize: '1rem' }} /> }
            : ticketValDiff > 0
                ? { bg: '#fff1f2', border: '#fecdd3', color: '#be123c', label: 'Tăng phải trả', badgeModifier: 'admin-status-badge--inactive', icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1rem' }} /> }
                : { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'Giảm phải trả', badgeModifier: 'admin-status-badge--success', icon: <TrendingDownOutlinedIcon sx={{ fontSize: '1rem' }} /> };

    const additionalCostTone =
        manualAdditionalCostTotal === 0
            ? { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', label: '0 khoản', badgeModifier: 'admin-status-badge--draft' }
            : manualAdditionalCostTotal > 0
                ? { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c', label: `+${additionalCostRows.length} khoản`, badgeModifier: 'admin-status-badge--pending' }
                : { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: `−${additionalCostRows.length} khoản`, badgeModifier: 'admin-status-badge--active' };

    const differenceTone =
        !hasAllRequiredInputs || Math.abs(differenceAmount) < 0.5
            ? { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Không đổi', icon: <TrendingFlatOutlinedIcon sx={{ fontSize: '1rem' }} /> }
            : differenceAmount > 0
                ? { bg: '#fff1f2', border: '#fecdd3', color: '#be123c', label: 'Tăng phải trả', icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1rem' }} /> }
                : { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'Giảm phải trả', icon: <TrendingDownOutlinedIcon sx={{ fontSize: '1rem' }} /> };

    const paidDiffTone =
        paymentRemainingDiff == null
            ? { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Chưa nhập', badgeModifier: 'admin-status-badge--draft' }
            : isPaidMatching
                ? { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'Khớp 100%', badgeModifier: 'admin-status-badge--success' }
                : paidDiff > 0
                    ? { bg: '#fff1f2', border: '#fecdd3', color: '#be123c', label: 'Đại lý tính thiếu', badgeModifier: 'admin-status-badge--inactive' }
                    : { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'Đại lý tính thừa', badgeModifier: 'admin-status-badge--active' };

    // Quantity-only match for Nhập/Trả cards — unit-price variance is handled in pricing / tổng kết.
    const isImportMatching = !isImportQtyEmpty && parsedImportQty === systemImportQty;
    const isReturnMatching = !isReturnQtyEmpty && parsedReturnQty === systemReturnQty;
    const hasReceipt = isPersistableMatchingEvidenceUrl(receiptUrl);

    const submitBlockers = useMemo(() => {
        const items: string[] = [];
        if (!hasAllRequiredInputs) {
            items.push('Nhập đủ số lượng nhập / trả và giá vé thực tế');
        }
        if (isActualPaidEmpty) {
            items.push('Nhập Số tiền cần trả thực tế từ biên lai');
        }
        if (!hasAllImportReceipts) {
            items.push('Tải tệp biên lai phiếu nhập lô');
        }
        if (!hasAllTicketListImages) {
            items.push('Tải ảnh danh sách vé phiếu nhập lô');
        }
        if (!hasReceipt) {
            items.push('Tải tệp biên lai đối soát NCC');
        }
        if (hasIncompleteAdditionalCost) {
            items.push('Hoàn tất hoặc xóa các dòng chi phí phát sinh còn thiếu (loại, số tiền, lý do' + (additionalCostRows.some((r) => r.additionalCostType === 'OTHER') ? ', tên nếu Khác' : '') + ')');
        }
        if (hasDuplicateCostTypes) {
            items.push('Không được chọn trùng loại chi phí phát sinh giữa các dòng');
        }
        if (needsPaymentCoverageCosts && !isPaymentCoverageMatched) {
            items.push(
                paymentCoverageRemaining != null
                    ? `Bổ sung chi phí phát sinh khớp chênh lệch thực trả / đối soát (còn ${paymentCoverageRemaining > 0 ? '+' : ''}${formatSettlementMoney(paymentCoverageRemaining)} VNĐ)`
                    : 'Bổ sung chi phí phát sinh khớp chênh lệch thực trả / đối soát'
            );
        }
        if (isUploadingReceipt || isUploadingImportReceipt || isUploadingTicketListImages) {
            items.push('Đợi tải ảnh chứng từ hoàn tất');
        }
        if (!isReturnQtyEmpty && parsedReturnQty > systemReturnQty) {
            items.push(
                `Số lượng trả thực tế không được vượt quá ${systemReturnQty.toLocaleString('vi-VN')} vé (số lượng hệ thống)`
            );
        }
        return items;
    }, [
        hasAllRequiredInputs,
        isActualPaidEmpty,
        hasAllImportReceipts,
        hasAllTicketListImages,
        hasReceipt,
        hasIncompleteAdditionalCost,
        additionalCostRows,
        needsPaymentCoverageCosts,
        isPaymentCoverageMatched,
        paymentCoverageRemaining,
        isUploadingReceipt,
        isUploadingImportReceipt,
        isUploadingTicketListImages,
        isReturnQtyEmpty,
        parsedReturnQty,
        systemReturnQty,
    ]);

    const highlightActualPaid = isActualPaidEmpty;
    const highlightImportEvidence = !hasAllImportEvidence;
    const highlightNccReceipt = !hasReceipt;
    const highlightPaymentCoverage = needsPaymentCoverageCosts && !isPaymentCoverageMatched;

    const canSubmit =
        submitBlockers.length === 0
        && !isSubmitting
        && !isFlushingDraft;

    const handleUploadFile = async (file: File): Promise<string> => {
        if (!settlement?.id) {
            AppToast.error('Không tìm thấy thông tin kỳ đối soát.');
            throw new Error('Không tìm thấy kỳ đối soát');
        }
        if (!isAllowedMatchingEvidenceFile(file)) {
            AppToast.warning('Vui lòng chọn ảnh, PDF, Excel hoặc CSV.');
            throw new Error('Sai định dạng tệp');
        }

        try {
            setIsUploadingReceipt(true);
            const previousUrl = receiptUrl;
            const uploadedUrl = await uploadImportBatchInvoiceEvidence(file);
            if (isMatchingDraft) {
                try {
                    await deleteMatchingCloudinaryUrl(previousUrl);
                } catch {
                    // Ignore delete of previous file so the new Cloudinary upload still sticks.
                }
                if (previousUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(previousUrl);
                }
                setPendingNccReceiptFile(null);
                setReceiptUrl(uploadedUrl);
                AppToast.success('Đã tải biên lai đối soát lên Cloudinary.');
                return uploadedUrl;
            }
            setReceiptUrl(uploadedUrl);
            const res = await updateSupplierSettlementReceiptUrl(settlement.id, uploadedUrl);
            if (res.success) {
                try {
                    await deleteMatchingCloudinaryUrl(previousUrl);
                } catch {
                    // ignore
                }
                AppToast.success('Đã tải lên và lưu biên lai đối soát NCC.');
                onReceiptUploaded?.();
                return uploadedUrl;
            } else {
                AppToast.error(res.message || 'Lưu biên lai thất bại.');
                throw new Error(res.message || 'Failed');
            }
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải tệp lên Cloudinary.'
            );
            throw err;
        } finally {
            setIsUploadingReceipt(false);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            void handleUploadFile(file);
        }
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && isAllowedMatchingEvidenceFile(file)) {
            void handleUploadFile(file);
        } else if (file) {
            AppToast.warning('Vui lòng chọn ảnh, PDF, Excel hoặc CSV.');
        }
    };

    const handleDeleteReceipt = async () => {
        if (!settlement?.id) return;
        const previousUrl = receiptUrl;
        if (isMatchingDraft) {
            try {
                setIsUploadingReceipt(true);
                try {
                    await deleteMatchingCloudinaryUrl(previousUrl);
                } catch (err: any) {
                    AppToast.error(err?.response?.data?.message || 'Không xóa được tệp trên Cloudinary.');
                    return;
                }
                if (previousUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(previousUrl);
                }
                setPendingNccReceiptFile(null);
                setReceiptUrl('');
                AppToast.success('Đã xóa biên lai đối soát trên Cloudinary.');
            } finally {
                setIsUploadingReceipt(false);
            }
            return;
        }
        try {
            setIsUploadingReceipt(true);
            const res = await updateSupplierSettlementReceiptUrl(settlement.id, '');
            if (res.success) {
                try {
                    await deleteMatchingCloudinaryUrl(previousUrl);
                } catch {
                    // BE already hard-deletes on clear; ignore duplicate FE delete errors.
                }
                setReceiptUrl('');
                AppToast.success('Đã gỡ tệp biên lai đối soát.');
                onReceiptUploaded?.();
            } else {
                AppToast.error(res.message || 'Gỡ tệp biên lai thất bại.');
            }
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi gỡ biên lai.');
        } finally {
            setIsUploadingReceipt(false);
        }
    };

    const handleUploadImportReceipt = async (file: File): Promise<string> => {
        if (selectedImport == null || selectedImport.id == null) {
            AppToast.error('Không tìm thấy phiếu nhập lô để đính kèm biên lai.');
            throw new Error('Không tìm thấy phiếu nhập lô');
        }
        if (!isAllowedMatchingEvidenceFile(file)) {
            AppToast.warning('Vui lòng chọn ảnh, PDF, Excel hoặc CSV.');
            throw new Error('Sai định dạng tệp');
        }

        try {
            setIsUploadingImportReceipt(true);
            const previousUrl = selectedImportReceiptUrl;
            const uploadedUrl = await uploadImportBatchInvoiceEvidence(file);
            const res = await attachImportBatchInvoiceEvidence(selectedImport.id, uploadedUrl);
            if (!res.success) {
                AppToast.error(res.message || 'Lưu tệp biên lai phiếu nhập thất bại.');
                throw new Error(res.message || 'Failed');
            }
            if (previousUrl && previousUrl !== uploadedUrl) {
                try {
                    await deleteMatchingCloudinaryUrl(previousUrl);
                } catch {
                    // ignore
                }
            }
            if (previousUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previousUrl);
            }
            setPendingImportReceiptFileById((prev) => ({ ...prev, [selectedImport.id]: null }));
            setLocalImportReceiptById((prev) => ({
                ...prev,
                [selectedImport.id]: uploadedUrl,
            }));
            AppToast.success(
                `Đã tải biên lai phiếu nhập ${selectedImport.batchCode || `#${selectedImport.id}`} lên Cloudinary.`
            );
            onReceiptUploaded?.();
            return uploadedUrl;
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải tệp biên lai phiếu nhập lên Cloudinary.'
            );
            throw err;
        } finally {
            setIsUploadingImportReceipt(false);
        }
    };

    const handleDeleteImportReceipt = async () => {
        if (selectedImport == null || selectedImport.id == null) return;
        const previousUrl = selectedImportReceiptUrl;
        try {
            setIsUploadingImportReceipt(true);
            const res = await attachImportBatchInvoiceEvidence(selectedImport.id, '');
            if (!res.success) {
                AppToast.error(res.message || 'Gỡ tệp biên lai phiếu nhập thất bại.');
                return;
            }
            try {
                await deleteMatchingCloudinaryUrl(previousUrl);
            } catch {
                // BE already hard-deletes on clear.
            }
            if (previousUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previousUrl);
            }
            setPendingImportReceiptFileById((prev) => ({ ...prev, [selectedImport.id]: null }));
            setLocalImportReceiptById((prev) => ({ ...prev, [selectedImport.id]: '' }));
            AppToast.success(
                `Đã xóa biên lai phiếu nhập ${selectedImport.batchCode || `#${selectedImport.id}`} trên Cloudinary.`
            );
            onReceiptUploaded?.();
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi gỡ tệp biên lai phiếu nhập.');
        } finally {
            setIsUploadingImportReceipt(false);
        }
    };

    const handleUpdateTicketListImages = async (newUrls: string[]) => {
        if (selectedImport == null || selectedImport.id == null) {
            AppToast.error('Không tìm thấy phiếu nhập lô.');
            return;
        }
        try {
            setIsUploadingTicketListImages(true);
            const previousUrls = selectedImportTicketListImages;
            const persistable = newUrls.filter((url) => isPersistableMatchingEvidenceUrl(url));
            const res = await attachTicketListImages(selectedImport.id, persistable);
            if (!res.success) {
                AppToast.error(res.message || 'Lưu ảnh danh sách vé thất bại.');
                return;
            }
            const removed = previousUrls.filter((url) => !persistable.includes(url));
            await Promise.all(
                removed.map(async (url) => {
                    try {
                        await deleteMatchingCloudinaryUrl(url);
                    } catch {
                        // BE already hard-deletes removed URLs.
                    }
                    if (url.startsWith('blob:')) {
                        URL.revokeObjectURL(url);
                    }
                })
            );
            setLocalTicketListImagesById((prev) => ({
                ...prev,
                [selectedImport.id]: persistable,
            }));
            AppToast.success(
                `Đã cập nhật ảnh danh sách vé cho phiếu nhập ${selectedImport.batchCode || `#${selectedImport.id}`}.`
            );
            onReceiptUploaded?.();
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu ảnh danh sách vé nhập.'
            );
        } finally {
            setIsUploadingTicketListImages(false);
        }
    };

    const handleZoom = (url: string, title?: string) => {
        const modalTitle = title || `Biên lai đối soát #${settlement.supplierSettlementCode || settlement.id}`;
        if (onZoomImage) {
            onZoomImage({ url, title: modalTitle });
        } else {
            setPreviewZoom({ url, title: modalTitle });
        }
    };

    const openMatchingEvidence = (url: string, title?: string, file?: File | null) => {
        if (!url) return;
        if (isLikelyImageEvidenceUrl(url, file)) {
            handleZoom(url, title);
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const flushDraftPersists = async () => {
        if (!isMatchingDraft || !settlement?.id) {
            return;
        }
        // NCC receipt — already on Cloudinary; attach URL to settlement
        if (isPersistableMatchingEvidenceUrl(receiptUrl)) {
            const res = await updateSupplierSettlementReceiptUrl(settlement.id, receiptUrl.trim());
            if (!res.success) {
                throw new Error(res.message || 'Lưu biên lai NCC thất bại.');
            }
        }
        // 3) Import batch evidence — already persisted on upload; attach leftover local URLs
        for (const batch of effectiveImportBatches) {
            if (batch.id == null) {
                continue;
            }
            const receiptUrlForBatch = localImportReceiptById[batch.id];
            if (isPersistableMatchingEvidenceUrl(receiptUrlForBatch)) {
                const res = await attachImportBatchInvoiceEvidence(batch.id, receiptUrlForBatch.trim());
                if (!res.success) {
                    throw new Error(res.message || `Lưu biên lai phiếu nhập #${batch.id} thất bại.`);
                }
            }
            const ticketUrls = (localTicketListImagesById[batch.id] || []).filter((url) =>
                isPersistableMatchingEvidenceUrl(url)
            );
            if (ticketUrls.length > 0) {
                const res = await attachTicketListImages(batch.id, ticketUrls);
                if (!res.success) {
                    throw new Error(res.message || `Lưu danh sách vé phiếu nhập #${batch.id} thất bại.`);
                }
            }
        }
        await clearAllPendingMatchingDraftFiles(settlement.id);
        setPendingNccReceiptFile(null);
        setPendingImportReceiptFileById({});
        setPendingTicketListFilesById({});
    };

    const submitMatching = async () => {
        const liveImportQty = parseWholeNumberInput(importQtyRef.current);
        const liveReturnQty = parseWholeNumberInput(returnQtyRef.current);
        if (liveReturnQty > systemReturnQty) {
            const capped = formatWholeNumberInput(systemReturnQty);
            returnQtyRef.current = capped;
            setReturnQty(capped);
            AppToast.warning(
                `Số lượng vé trả thực tế không được lớn hơn số lượng trả hệ thống (${systemReturnQty.toLocaleString('vi-VN')} vé).`
            );
            return;
        }
        const liveUnitPrice = parsedUnitPrice;
        const liveImportVal = scaleSettlementMoney(liveImportQty * liveUnitPrice);
        const liveReturnVal = scaleSettlementMoney(liveReturnQty * liveUnitPrice);
        const livePaid = parseSignedFromDots(actualPaidAmountRef.current);
        const additionalCosts = additionalCostRowsRef.current
            .map((row) => ({
                additionalCost: parseCostRowAmount(row),
                additionalCostType: row.additionalCostType,
                additionalCostReason: row.additionalCostReason.trim(),
                additionalCostCustomName:
                    row.additionalCostType === 'OTHER' ? row.additionalCostCustomName.trim() : undefined,
                autoGenerated: false,
            }))
            .filter((row) => row.additionalCost !== 0 && row.additionalCostReason.length > 0);

        try {
            setIsFlushingDraft(true);
            await flushDraftPersists();
            await onConfirm({
                actualTicketImportQuantity: Math.round(liveImportQty),
                actualTicketImportValue: liveImportVal,
                actualReturnTicketQuantity: Math.round(liveReturnQty),
                actualReturnTicketValue: liveReturnVal,
                reconciledTicketUnitPrice: liveUnitPrice,
                reconciliationNote: noteRef.current.trim() || undefined,
                actualPaidAmount: livePaid,
                additionalCosts,
                actualTicketImportPrice: actualImportPrice,
                stationCommissions,
            });
            importQtyDirtyRef.current = false;
            returnQtyDirtyRef.current = false;
            // Overview invalidate/refetch runs in the confirm mutation onSuccess — avoid racing mid-confirm.
        } catch (err: any) {
            // Parent already toasts confirm API failures.
            if (err?.config?.url?.includes('/reconciliation/matching')) {
                return;
            }
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Không lưu được chứng từ trước khi đối chiếu.'
            );
        } finally {
            setIsFlushingDraft(false);
        }
    };

    const handleSubmit = () => {
        if (!hasAllRequiredInputs) {
            AppToast.warning('Vui lòng nhập đầy đủ các trường số lượng và giá vé thực tế.');
            return;
        }
        if (!hasReceipt) {
            AppToast.warning('Vui lòng tải lên tệp biên lai đối soát của Nhà cung cấp trước khi xác nhận.');
            return;
        }
        if (!hasAllImportReceipts) {
            AppToast.warning('Vui lòng tải lên tệp biên lai phiếu nhập lô trước khi xác nhận đối chiếu.');
            return;
        }
        if (!hasAllTicketListImages) {
            AppToast.warning('Vui lòng tải lên ảnh danh sách vé nhập của phiếu nhập lô trước khi xác nhận đối chiếu.');
            return;
        }
        if (
            !Number.isFinite(parsedImportQty)
            || !Number.isFinite(parsedReturnQty)
            || !Number.isFinite(parsedUnitPrice)
            || !Number.isFinite(calculatedImportVal)
            || !Number.isFinite(calculatedReturnVal)
        ) {
            AppToast.warning('Số liệu thực tế không hợp lệ. Vui lòng nhập lại số lượng và giá vé.');
            return;
        }
        if (hasIncompleteAdditionalCost) {
            AppToast.warning('Vui lòng nhập đủ loại, số tiền, lý do (và tên nếu chọn Khác) cho mỗi chi phí phát sinh, hoặc xóa dòng trống dở.');
            return;
        }
        if (needsPaymentCoverageCosts && !isPaymentCoverageMatched) {
            AppToast.warning(
                paymentCoverageRemaining != null
                    ? `Tổng chi phí phát sinh chưa khớp chênh lệch thực trả / đối soát (còn ${paymentCoverageRemaining > 0 ? '+' : ''}${formatSettlementMoney(paymentCoverageRemaining)} VNĐ).`
                    : 'Tổng chi phí phát sinh chưa khớp chênh lệch thực trả / đối soát.'
            );
            return;
        }
        if (isActualPaidEmpty) {
            AppToast.warning('Vui lòng nhập Số tiền cần trả thực tế từ biên lai.');
            return;
        }
        // Past cutoff + unhanded: already pinned read-only — confirm without override dialog.
        if (isReturnOverdue) {
            submitMatching();
            return;
        }
        if (isReturnLocked) {
            setReturnHandoverConfirmOpen(true);
            return;
        }
        submitMatching();
    };

    return (
        <Box sx={{ width: '100%', pt: 0.5 }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2.5 }}>
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '12px',
                        bgcolor: '#fef2f2',
                        color: '#FF3030',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #fee2e2',
                    }}
                >
                    <CompareArrowsOutlinedIcon sx={{ fontSize: '1.5rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.1rem', lineHeight: 1.3 }}>
                        Đối chiếu số liệu hệ thống / thực tế
                    </Typography>
                    <Typography variant="body2" color="#64748b" sx={{ mt: 0.25, fontSize: '0.85rem' }}>
                        Đối chiếu giá nhập và hoa hồng <strong>từng nhà đài</strong> trên phiếu nhập của kỳ này.
                        Giá sau HH = giá nhập × (1 − tỉ lệ hoa hồng). Đơn giá cả kỳ lấy bình quân theo số lượng vé từng đài.
                    </Typography>
                </Box>
            </Stack>

            <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />

            {/* ═══ SINGLE-COLUMN REDESIGNED LAYOUT (6 SECTIONS) ═══ */}
            <Stack spacing={2.5}>
                {/* 1. Đối chiếu số lượng Nhập & Trả vé */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                bgcolor: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CompareArrowsOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.975rem', lineHeight: 1.2 }}>
                                1. Đối chiếu số lượng Nhập & Trả vé
                            </Typography>
                            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem' }}>
                                So sánh số lượng vé ghi nhận trên hệ thống và số lượng thực tế kiểm đếm / trên phiếu giao
                            </Typography>
                        </Box>
                    </Stack>

                    <Grid container spacing={2.5}>
                        {/* Column 1: Nhập vé */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    borderColor: isImportMatching ? '#e2e8f0' : importQtyDiff > 0 ? '#fde68a' : '#fecdd3',
                                    bgcolor: isImportMatching ? '#ffffff' : importQtyDiff > 0 ? '#fffdfa' : '#fffbfc',
                                    transition: 'all 0.2s ease',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: !isImportMatching ? '0 2px 8px rgba(0,0,0,0.02)' : 'none',
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                bgcolor: '#eff6ff',
                                                color: '#2563eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Inventory2OutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                            Số liệu Nhập vé
                                        </Typography>
                                    </Stack>
                                    {isImportQtyEmpty ? (
                                        <AdminStatusBadge
                                            label="Chưa nhập SL"
                                            modifier={getQtyDiffBadgeModifier(false, false, true)}
                                        />
                                    ) : isImportMatching ? (
                                        <AdminStatusBadge
                                            label="Khớp hệ thống"
                                            modifier={getQtyDiffBadgeModifier(true, false)}
                                        />
                                    ) : importQtyDiff > 0 ? (
                                        <AdminStatusBadge
                                            label={`Thiếu nhập (+${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                            modifier={getQtyDiffBadgeModifier(false, true)}
                                        />
                                    ) : (
                                        <AdminStatusBadge
                                            label={`Thừa nhập (${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                            modifier={getQtyDiffBadgeModifier(false, false)}
                                        />
                                    )}
                                </Stack>

                                {/* System stats box */}
                                <Box
                                    sx={{
                                        p: 1.75,
                                        borderRadius: '10px',
                                        bgcolor: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        mb: 2,
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 1 }}>
                                        Hệ thống ghi nhận:
                                    </Typography>
                                    <Grid container spacing={1.5}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="#64748b" display="block">
                                                Số lượng:
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                {systemImportQty.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>vé</span>
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="#64748b" display="block">
                                                Tổng giá trị nhập:
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} color="#166534">
                                                {formatImportCost(systemImportVal)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>VNĐ</span>
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Chênh lệch Nhập vé indicator */}
                                {(() => {
                                    const isMatching = isImportMatching;
                                    const isPositive = importQtyDiff > 0;
                                    const theme = isMatching
                                        ? {
                                            bg: '#f0fdf4',
                                            border: '#bbf7d0',
                                            textColor: '#15803d',
                                            subColor: '#166534',
                                            badgeBg: '#dcfce7',
                                            badgeColor: '#15803d',
                                            badgeBorder: '#86efac',
                                            badgeText: 'Khớp',
                                            badgeModifier: 'admin-status-badge--success',
                                            icon: <CheckCircleOutlinedIcon sx={{ fontSize: '1.15rem', color: '#16a34a' }} />,
                                        }
                                        : isPositive
                                        ? {
                                            bg: '#fef2f2',
                                            border: '#fecaca',
                                            textColor: '#dc2626',
                                            subColor: '#991b1b',
                                            badgeBg: '#fee2e2',
                                            badgeColor: '#dc2626',
                                            badgeBorder: '#fca5a5',
                                            badgeText: 'Thiếu nhập (+)',
                                            icon: <TrendingDownOutlinedIcon sx={{ fontSize: '1.2rem', color: '#dc2626' }} />,
                                        }
                                        : {
                                            bg: '#fffbeb',
                                            border: '#fde68a',
                                            textColor: '#b45309',
                                            subColor: '#92400e',
                                            badgeBg: '#fef3c7',
                                            badgeColor: '#b45309',
                                            badgeBorder: '#fde68a',
                                            badgeText: 'Thừa nhập (-)',
                                            icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1.2rem', color: '#b45309' }} />,
                                        };

                                    return (
                                        <Box
                                            sx={{
                                                p: 1.35,
                                                px: 1.75,
                                                borderRadius: '11px',
                                                bgcolor: theme.bg,
                                                border: `1px solid ${theme.border}`,
                                                mb: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: 1.2,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                {theme.icon}
                                                <Typography variant="caption" fontWeight={800} color={theme.subColor} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                    Chênh lệch nhập:
                                                </Typography>
                                                <AdminStatusBadge
                                                    label={theme.badgeText}
                                                    modifier={getQtyDiffBadgeModifier(isMatching, isPositive)}
                                                />
                                            </Stack>
                                            <Typography variant="body2" fontWeight={800} color={theme.textColor} sx={{ fontSize: '0.925rem' }}>
                                                {isMatching ? (
                                                    '0 vé'
                                                ) : (
                                                    <>
                                                        {importQtyDiff > 0 ? `+${importQtyDiff.toLocaleString('vi-VN')}` : `${importQtyDiff.toLocaleString('vi-VN')}`} vé
                                                        {importQtyDiff !== 0 && (
                                                            <>
                                                                {' ('}
                                                                {importValDiff > 0 ? `+${formatImportCost(importValDiff)}` : `${formatImportCost(importValDiff)}`} VNĐ
                                                                {')'}
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </Typography>
                                        </Box>
                                    );
                                })()}

                                {/* Actual inputs */}
                                <Grid container spacing={2} sx={{ mt: 'auto' }}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            label="Thực tế SL nhập *"
                                            fullWidth
                                            size="small"
                                            type="text"
                                            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                            value={importQty}
                                            error={isImportQtyEmpty}
                                            helperText={isImportQtyEmpty ? 'Bắt buộc nhập số lượng' : undefined}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, '');
                                                const formatted = raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '';
                                                importQtyDirtyRef.current = true;
                                                importQtyRef.current = formatted;
                                                setImportQty(formatted);
                                            }}
                                            InputProps={{
                                                endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight={600} color="#64748b">vé</Typography></InputAdornment>,
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '10px',
                                                    bgcolor: '#ffffff',
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            label="Thực tế GT nhập *"
                                            fullWidth
                                            size="small"
                                            type="text"
                                            value={formatImportCost(calculatedImportVal)}
                                            helperText="Tự động tính (= SL nhập × Giá vé)"
                                            InputProps={{
                                                readOnly: true,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <CalculateOutlinedIcon sx={{ color: '#0284c7', fontSize: '1.1rem' }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <Typography variant="caption" fontWeight={700} color="#166534">
                                                            VNĐ
                                                        </Typography>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '10px',
                                                    bgcolor: '#f8fafc',
                                                    fontWeight: 700,
                                                    color: '#166534',
                                                },
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Column 2: Trả vé */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    borderColor: isReturnInputsLocked
                                        ? '#e2e8f0'
                                        : isReturnMatching
                                          ? '#e2e8f0'
                                          : returnQtyDiff > 0
                                            ? '#bfdbfe'
                                            : '#fde68a',
                                    bgcolor: isReturnInputsLocked
                                        ? '#ffffff'
                                        : isReturnMatching
                                          ? '#ffffff'
                                          : returnQtyDiff > 0
                                            ? '#f8fbff'
                                            : '#fffdfa',
                                    transition: 'all 0.2s ease',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: !isReturnInputsLocked && !isReturnMatching ? '0 2px 8px rgba(0,0,0,0.02)' : 'none',
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                bgcolor: isReturnInputsLocked ? '#f1f5f9' : '#fff7ed',
                                                color: isReturnInputsLocked ? '#64748b' : '#ea580c',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {isReturnInputsLocked ? (
                                                <LockOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                            ) : (
                                                <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                            )}
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                            Số liệu Trả vé
                                        </Typography>
                                    </Stack>
                                    {isReturnInputsLocked ? (
                                        <AdminStatusBadge
                                            label={
                                                returnLockDetails.overdue || returnLockDetails.allCancelled
                                                    ? 'Quá hạn / Đã hủy'
                                                    : 'Chưa bàn giao'
                                            }
                                            modifier="admin-status-badge--pending"
                                        />
                                    ) : isReturnQtyEmpty ? (
                                        <AdminStatusBadge
                                            label="Chưa nhập SL"
                                            modifier={getQtyDiffBadgeModifier(false, false, true)}
                                        />
                                    ) : isReturnMatching ? (
                                        <AdminStatusBadge
                                            label="Khớp hệ thống"
                                            modifier={getQtyDiffBadgeModifier(true, false)}
                                        />
                                    ) : returnQtyDiff > 0 ? (
                                        <AdminStatusBadge
                                            label={`Thừa trả (+${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                            modifier="admin-status-badge--active"
                                        />
                                    ) : (
                                        <AdminStatusBadge
                                            label={`Thiếu trả (${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                            modifier={getQtyDiffBadgeModifier(false, false)}
                                        />
                                    )}
                                </Stack>

                                {/* System stats box */}
                                <Box
                                    sx={{
                                        p: 1.75,
                                        borderRadius: '10px',
                                        bgcolor: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        mb: 2,
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 1 }}>
                                        Hệ thống ghi nhận:
                                    </Typography>
                                    <Grid container spacing={1.5}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="#64748b" display="block">
                                                Số lượng:
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                {systemReturnQty.toLocaleString('vi-VN')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>vé</span>
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="#64748b" display="block">
                                                Tổng giá trị trả:
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} color="#166534">
                                                {formatImportCost(systemReturnVal)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>VNĐ</span>
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Chênh lệch Trả vé indicator (Ẩn hoàn toàn khi bị khóa) */}
                                {!isReturnInputsLocked && (() => {
                                    const isMatching = isReturnMatching;
                                    const isPositive = returnQtyDiff > 0;
                                    const theme = isMatching
                                        ? {
                                            bg: '#f0fdf4',
                                            border: '#bbf7d0',
                                            textColor: '#15803d',
                                            subColor: '#166534',
                                            badgeBg: '#dcfce7',
                                            badgeColor: '#15803d',
                                            badgeBorder: '#86efac',
                                            badgeText: 'Khớp',
                                            badgeModifier: 'admin-status-badge--success',
                                            icon: <CheckCircleOutlinedIcon sx={{ fontSize: '1.15rem', color: '#16a34a' }} />,
                                        }
                                        : isPositive
                                        ? {
                                            bg: '#eff6ff',
                                            border: '#bfdbfe',
                                            textColor: '#1d4ed8',
                                            subColor: '#1e40af',
                                            badgeBg: '#dbeafe',
                                            badgeColor: '#1d4ed8',
                                            badgeBorder: '#93c5fd',
                                            badgeText: 'Thừa trả (+)',
                                            icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1.2rem', color: '#2563eb' }} />,
                                        }
                                        : {
                                            bg: '#fffbeb',
                                            border: '#fde68a',
                                            textColor: '#b45309',
                                            subColor: '#92400e',
                                            badgeBg: '#fef3c7',
                                            badgeColor: '#b45309',
                                            badgeBorder: '#fde68a',
                                            badgeText: 'Thiếu trả (-)',
                                            icon: <TrendingDownOutlinedIcon sx={{ fontSize: '1.2rem', color: '#b45309' }} />,
                                        };

                                    return (
                                        <Box
                                            sx={{
                                                p: 1.35,
                                                px: 1.75,
                                                borderRadius: '11px',
                                                bgcolor: theme.bg,
                                                border: `1px solid ${theme.border}`,
                                                mb: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: 1.2,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                {theme.icon}
                                                <Typography variant="caption" fontWeight={800} color={theme.subColor} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                    Chênh lệch trả:
                                                </Typography>
                                                <AdminStatusBadge
                                                    label={theme.badgeText}
                                                    modifier={
                                                        isMatching
                                                            ? getQtyDiffBadgeModifier(true, false)
                                                            : isPositive
                                                              ? 'admin-status-badge--active'
                                                              : getQtyDiffBadgeModifier(false, false)
                                                    }
                                                />
                                            </Stack>
                                            <Typography variant="body2" fontWeight={800} color={theme.textColor} sx={{ fontSize: '0.925rem' }}>
                                                {isMatching ? (
                                                    '0 vé'
                                                ) : (
                                                    <>
                                                        {returnQtyDiff > 0 ? `+${returnQtyDiff.toLocaleString('vi-VN')}` : `${returnQtyDiff.toLocaleString('vi-VN')}`} vé
                                                        {returnQtyDiff !== 0 && (
                                                            <>
                                                                {' ('}
                                                                {returnValDiff > 0 ? `+${formatImportCost(returnValDiff)}` : `${formatImportCost(returnValDiff)}`} VNĐ
                                                                {')'}
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </Typography>
                                        </Box>
                                    );
                                })()}

                                {/* Actual inputs */}
                                <Grid container spacing={2} sx={{ mt: 'auto' }}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            label="Thực tế SL trả *"
                                            fullWidth
                                            size="small"
                                            type="text"
                                            disabled={isReturnInputsLocked}
                                            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                            value={returnQty}
                                            error={!isReturnInputsLocked && (isReturnQtyEmpty || parsedReturnQty > systemReturnQty)}
                                            helperText={
                                                isReturnInputsLocked
                                                    ? undefined
                                                    : isReturnQtyEmpty
                                                      ? 'Bắt buộc nhập số lượng'
                                                      : parsedReturnQty > systemReturnQty
                                                        ? `Không được nhập nhiều hơn ${systemReturnQty.toLocaleString('vi-VN')} vé (số lượng trả hệ thống)`
                                                        : `Tối đa ${systemReturnQty.toLocaleString('vi-VN')} vé (bằng hoặc ít hơn số lượng hệ thống)`
                                            }
                                            onChange={(e) => {
                                                if (isReturnInputsLocked) return;
                                                const raw = e.target.value.replace(/\D/g, '');
                                                const formatted = raw
                                                    ? capFormattedWholeNumber(raw, systemReturnQty)
                                                    : '';
                                                returnQtyDirtyRef.current = true;
                                                returnQtyRef.current = formatted;
                                                setReturnQty(formatted);
                                            }}
                                            InputProps={{
                                                endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight={600} color="#64748b">vé</Typography></InputAdornment>,
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '10px',
                                                    bgcolor: isReturnInputsLocked ? '#f1f5f9' : '#ffffff',
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            label="Thực tế GT trả *"
                                            fullWidth
                                            size="small"
                                            type="text"
                                            disabled={isReturnInputsLocked}
                                            value={formatImportCost(calculatedReturnVal)}
                                            helperText={isReturnInputsLocked ? undefined : 'Tự động tính (= SL trả × Giá vé)'}
                                            InputProps={{
                                                readOnly: true,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <CalculateOutlinedIcon sx={{ color: '#0284c7', fontSize: '1.1rem' }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <Typography variant="caption" fontWeight={700} color="#166534">
                                                            VNĐ
                                                        </Typography>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '10px',
                                                    bgcolor: '#f8fafc',
                                                    fontWeight: 700,
                                                    color: '#166534',
                                                },
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                {/* ═══ Centered Lock Overlay khi bị khóa ═══ */}
                                {isReturnInputsLocked && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            bgcolor: 'rgba(255, 255, 255, 0.88)',
                                            backdropFilter: 'blur(5px)',
                                            WebkitBackdropFilter: 'blur(5px)',
                                            zIndex: 10,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            p: { xs: 2.5, sm: 3 },
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 58,
                                                height: 58,
                                                borderRadius: '50%',
                                                bgcolor: returnLockDetails.overdue || returnLockDetails.allCancelled ? '#fef2f2' : '#fffbeb',
                                                border: `2px solid ${returnLockDetails.overdue || returnLockDetails.allCancelled ? '#fecaca' : '#fde68a'}`,
                                                color: returnLockDetails.overdue || returnLockDetails.allCancelled ? '#dc2626' : '#d97706',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mb: 1.5,
                                                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
                                            }}
                                        >
                                            <LockOutlinedIcon sx={{ fontSize: '2rem' }} />
                                        </Box>

                                        <Typography
                                            variant="subtitle2"
                                            fontWeight={800}
                                            color="#0f172a"
                                            sx={{ fontSize: '0.975rem', mb: 0.75 }}
                                        >
                                            {returnLockDetails.overdue || returnLockDetails.allCancelled
                                                ? 'Số liệu trả vé đã khóa (Quá hạn / Hủy)'
                                                : 'Số liệu trả vé đang bị khóa'}
                                        </Typography>

                                        <Box sx={{ maxWidth: 390 }}>
                                            <Typography
                                                variant="body2"
                                                color="#475569"
                                                sx={{ fontSize: '0.825rem', lineHeight: 1.5, fontWeight: 500 }}
                                            >
                                                {returnLockDetails.overdue || returnLockDetails.allCancelled ? (
                                                    <>
                                                        {returnLockDetails.summaryMessage || returnLockDetails.emptyStateMessage}
                                                        <Box component="span" sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: '#dc2626' }}>
                                                            Các vé còn tồn kho không được trả và đại lý phải chịu khoản này. Số liệu trả chỉ xem; không thể nhập điều chỉnh.
                                                        </Box>
                                                    </>
                                                ) : returnLockDetails.blockers.length === 1 ? (
                                                    returnLockDetails.blockers[0].message
                                                ) : returnLockDetails.blockers.length > 1 ? (
                                                    <Stack spacing={0.5} sx={{ textAlign: 'left' }}>
                                                        {returnLockDetails.blockers.map((b) => (
                                                            <Typography key={`${b.batchCode}-${b.status}`} variant="caption" color="#475569" sx={{ fontSize: '0.78rem' }}>
                                                                • {b.message}
                                                            </Typography>
                                                        ))}
                                                    </Stack>
                                                ) : (
                                                    'Số liệu trả chỉ xem theo hệ thống; không thể điều chỉnh.'
                                                )}
                                            </Typography>
                                        </Box>

                                        {returnBatches.length > 0 && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<AssignmentReturnOutlinedIcon sx={{ fontSize: '0.95rem' }} />}
                                                onClick={() => setReturnBatchesDialogOpen(true)}
                                                sx={{
                                                    mt: 1.75,
                                                    textTransform: 'none',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    borderRadius: '8px',
                                                    borderColor: '#cbd5e1',
                                                    color: '#334155',
                                                    bgcolor: '#ffffff',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                                                }}
                                            >
                                                Xem chi tiết đợt trả ({returnBatches.length})
                                            </Button>
                                        )}
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                {/* 2. Bảng giá vé theo từng nhà đài */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <MatchingStationPricingTable
                        key={`station-pricing-${stationPricingHydrateKey}`}
                        rows={displayPricingRows}
                        disabled={Boolean(isSubmitting)}
                        supplierId={settlement.lotterySupplierId}
                        supplierName={settlement.supplierName || supplier?.name}
                        actualImportPrice={actualImportPrice}
                        onActualImportPriceChange={setActualImportPrice}
                        onWeightedChange={handleStationWeightedChange}
                        onMasterDataUpdated={() => {
                            onStationsUpdated?.();
                        }}
                    />
                </Paper>

                {/* 3. Chi phí & Điều chỉnh ngoài kỳ */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: highlightPaymentCoverage ? '#fb7185' : '#e2e8f0',
                        bgcolor: highlightPaymentCoverage ? '#fff1f2' : '#ffffff',
                        boxShadow: highlightPaymentCoverage
                            ? '0 0 0 3px rgba(244, 63, 94, 0.12)'
                            : '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                        flexWrap="wrap"
                        gap={1.5}
                    >
                        <Stack direction="row" spacing={1.2} alignItems="center">
                            <Box
                                sx={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '10px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <ReceiptLongOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                                    3. Chi phí & Điều chỉnh ngoài kỳ
                                </Typography>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem' }}>
                                    Dương (+) = tăng phải trả · Âm (−) = giảm trừ. Tự chọn loại chi phí phát sinh nếu có.
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                            {manualAdditionalCostTotal !== 0 && (
                                <AdminStatusBadge
                                    label={`Tổng chi phí: ${manualAdditionalCostTotal > 0 ? '+' : ''}${formatSettlementMoney(manualAdditionalCostTotal)} VNĐ`}
                                    modifier={manualAdditionalCostTotal > 0 ? 'admin-status-badge--success' : 'admin-status-badge--active'}
                                />
                            )}
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={isSubmitting}
                                startIcon={<AddOutlinedIcon sx={{ fontSize: '0.95rem' }} />}
                                onClick={handleAddAdditionalCostRow}
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.775rem',
                                    borderColor: '#bfdbfe',
                                    color: '#2563eb',
                                    py: 0.4,
                                    px: 1.5,
                                    bgcolor: '#eff6ff',
                                    '&:hover': { bgcolor: '#dbeafe', borderColor: '#2563eb' },
                                }}
                            >
                                Thêm khoản chi
                            </Button>
                        </Stack>
                    </Stack>

                    {/* Coverage Box khi phát sinh chênh lệch cần bù chi phí */}
                    {needsPaymentCoverageCosts && paymentCoverageTarget != null && (
                        <Box
                            sx={{
                                mb: 2.25,
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: isPaymentCoverageMatched ? '#f0fdf4' : '#fffbeb',
                                border: `1.5px solid ${isPaymentCoverageMatched ? '#bbf7d0' : '#fde68a'}`,
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <WarningAmberOutlinedIcon sx={{ color: isPaymentCoverageMatched ? '#16a34a' : '#b45309', fontSize: '1.2rem' }} />
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            fontWeight={800}
                                            color={isPaymentCoverageMatched ? '#166534' : '#92400e'}
                                            sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', fontSize: '0.775rem' }}
                                        >
                                            Chi phí phát sinh cần giải trình / bổ sung
                                        </Typography>
                                        <Typography variant="caption" color={isPaymentCoverageMatched ? '#15803d' : '#b45309'} sx={{ fontSize: '0.725rem' }}>
                                            Chênh lệch giữa biên lai thực trả NCC và số liệu đối soát chưa gồm chi phí
                                        </Typography>
                                    </Box>
                                </Stack>
                                <AdminStatusBadge
                                    label={isPaymentCoverageMatched ? 'Đã bù đủ 100%' : `Đã giải trình ${paymentCoverageProgressPct}%`}
                                    modifier={isPaymentCoverageMatched ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                                />
                            </Stack>

                            {/* 3 mini stat cards */}
                            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Box sx={{ p: 1.25, borderRadius: '8px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                            Mục tiêu cần bù
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight={800} color={paymentCoverageTarget > 0 ? '#be123c' : '#15803d'} sx={{ fontSize: '0.95rem' }}>
                                            {paymentCoverageTarget > 0 ? '+' : ''}{formatSettlementMoney(paymentCoverageTarget)} VNĐ
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Box sx={{ p: 1.25, borderRadius: '8px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                            Đã tạo chi phí
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                            {paymentCoverageCovered > 0 ? '+' : ''}{formatSettlementMoney(paymentCoverageCovered)} VNĐ
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Box sx={{ p: 1.25, borderRadius: '8px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                            Còn thiếu
                                        </Typography>
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight={800}
                                            color={paymentCoverageRemaining != null && Math.abs(paymentCoverageRemaining) < 0.5 ? '#16a34a' : '#be123c'}
                                            sx={{ fontSize: '0.95rem' }}
                                        >
                                            {paymentCoverageRemaining != null ? `${paymentCoverageRemaining > 0 ? '+' : ''}${formatSettlementMoney(paymentCoverageRemaining)} VNĐ` : '—'}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <LinearProgress
                                variant="determinate"
                                value={paymentCoverageProgressPct}
                                sx={{
                                    height: 8,
                                    borderRadius: 999,
                                    bgcolor: '#e2e8f0',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 999,
                                        bgcolor: isPaymentCoverageMatched
                                            ? '#16a34a'
                                            : paymentCoverageProgressPct >= 100
                                              ? '#ea580c'
                                              : '#f59e0b',
                                    },
                                }}
                            />
                        </Box>
                    )}

                    {additionalCostRows.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', borderColor: '#e2e8f0', overflow: 'hidden' }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', py: 1.2, px: 2, width: '26%', minWidth: 200 }}>
                                            Loại chi phí
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', py: 1.2, px: 1.5, width: '28%', minWidth: 230 }}>
                                            Số tiền (+ / −)
                                        </TableCell>
                                        {additionalCostRows.some((r) => r.additionalCostType === 'OTHER') && (
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', py: 1.2, px: 1.5, width: '20%', minWidth: 160 }}>
                                                Tên chi phí
                                            </TableCell>
                                        )}
                                        <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', py: 1.2, px: 1.5 }}>
                                            Lý do / Giải thích
                                        </TableCell>
                                        <TableCell align="center" sx={{ width: 50, py: 1.2, px: 1 }} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {additionalCostRows.map((row) => {
                                        const amount = Math.abs(parseCostRowAmount(row));
                                        const rowIncomplete =
                                            (row.additionalCost.replace(/\D/g, '').length > 0
                                                || row.additionalCostReason.trim().length > 0
                                                || row.additionalCostCustomName.trim().length > 0)
                                            && (
                                                amount === 0
                                                || !row.additionalCostReason.trim()
                                                || (row.additionalCostType === 'OTHER' && !row.additionalCostCustomName.trim())
                                            );
                                        const isTypeDuplicate =
                                            row.additionalCostType !== 'OTHER'
                                            && additionalCostRows.filter((r) => r.additionalCostType === row.additionalCostType).length > 1;
                                        const isOther = row.additionalCostType === 'OTHER';
                                        const showNameColumn = additionalCostRows.some((r) => r.additionalCostType === 'OTHER');
                                        const effectiveSign = row.additionalCostSign || getDefaultSignForType(row.additionalCostType);
                                        const isFixedSign = isSignFixedForType(row.additionalCostType);

                                        return (
                                            <TableRow
                                                key={row.key}
                                                hover
                                                sx={{
                                                    bgcolor: rowIncomplete || isTypeDuplicate ? '#fff1f233' : 'inherit',
                                                    '&:hover': { bgcolor: '#f8fafc' },
                                                }}
                                            >
                                                {/* Cột 1: Loại chi phí */}
                                                <TableCell sx={{ py: 1.2, px: 2 }}>
                                                    <FormControl size="small" fullWidth error={isTypeDuplicate}>
                                                        <Select
                                                            value={
                                                                MONETARY_COST_TYPES.some((type) => type.value === row.additionalCostType)
                                                                    ? row.additionalCostType
                                                                    : 'OTHER'
                                                            }
                                                            onChange={(e) => {
                                                                const nextType = e.target.value as SettlementAdjustmentReasonCode;
                                                                handleUpdateAdditionalCostRow(row.key, 'additionalCostType', nextType);
                                                                if (isSignFixedForType(nextType)) {
                                                                    handleUpdateAdditionalCostRow(row.key, 'additionalCostSign', getDefaultSignForType(nextType));
                                                                }
                                                                if (nextType !== 'OTHER') {
                                                                    handleUpdateAdditionalCostRow(row.key, 'additionalCostCustomName', '');
                                                                }
                                                            }}
                                                            sx={{
                                                                borderRadius: '8px',
                                                                fontSize: '0.825rem',
                                                                bgcolor: '#ffffff',
                                                                fontWeight: 600,
                                                                height: 38,
                                                                ...(isTypeDuplicate
                                                                    ? { '& fieldset': { borderColor: '#ef4444 !important', borderWidth: '1.5px !important' } }
                                                                    : {}),
                                                            }}
                                                        >
                                                            {MONETARY_COST_TYPES.map((type) => {
                                                                const isUsedInOtherRow =
                                                                    type.value !== 'OTHER'
                                                                    && additionalCostRows.some(
                                                                        (other) => other.key !== row.key && other.additionalCostType === type.value
                                                                    );
                                                                return (
                                                                    <MenuItem
                                                                        key={type.value}
                                                                        value={type.value}
                                                                        disabled={isUsedInOtherRow}
                                                                        sx={{ fontSize: '0.825rem', fontWeight: 600 }}
                                                                    >
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                                            <span>{type.label}</span>
                                                                            {isUsedInOtherRow && (
                                                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', ml: 1 }}>
                                                                                    (Đã chọn)
                                                                                </Typography>
                                                                            )}
                                                                        </Box>
                                                                    </MenuItem>
                                                                );
                                                            })}
                                                        </Select>
                                                        {isTypeDuplicate && (
                                                            <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem', mt: 0.25, display: 'block', fontWeight: 600 }}>
                                                                Trùng loại chi phí
                                                            </Typography>
                                                        )}
                                                    </FormControl>
                                                </TableCell>

                                                {/* Cột 2: SỐ TIỀN có gắn liền bộ chọn Dấu (+ / -) */}
                                                <TableCell sx={{ py: 1.2, px: 1.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                        {isFixedSign ? (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    px: 1.25,
                                                                    height: 38,
                                                                    borderRadius: '8px 0 0 8px',
                                                                    bgcolor: effectiveSign === '+' ? '#fef2f2' : '#f0fdf4',
                                                                    color: effectiveSign === '+' ? '#dc2626' : '#16a34a',
                                                                    border: `1.5px solid ${effectiveSign === '+' ? '#fca5a5' : '#86efac'}`,
                                                                    borderRight: 'none',
                                                                    fontWeight: 800,
                                                                    fontSize: '0.8rem',
                                                                    whiteSpace: 'nowrap',
                                                                    userSelect: 'none',
                                                                }}
                                                            >
                                                                {effectiveSign === '+' ? '+ Cộng' : '− Trừ'}
                                                            </Box>
                                                        ) : (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    height: 38,
                                                                    borderRadius: '8px 0 0 8px',
                                                                    border: '1px solid #cbd5e1',
                                                                    borderRight: 'none',
                                                                    bgcolor: '#f1f5f9',
                                                                    p: '3px',
                                                                    gap: '3px',
                                                                }}
                                                            >
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => handleUpdateAdditionalCostRow(row.key, 'additionalCostSign', '+')}
                                                                    sx={{
                                                                        minWidth: 28,
                                                                        height: 30,
                                                                        p: 0,
                                                                        borderRadius: '6px',
                                                                        fontWeight: 900,
                                                                        fontSize: '0.9rem',
                                                                        bgcolor: effectiveSign === '+' ? '#dc2626' : 'transparent',
                                                                        color: effectiveSign === '+' ? '#ffffff' : '#64748b',
                                                                        boxShadow: effectiveSign === '+' ? '0 1px 3px rgba(220, 38, 38, 0.35)' : 'none',
                                                                        '&:hover': {
                                                                            bgcolor: effectiveSign === '+' ? '#b91c1c' : '#fee2e2',
                                                                            color: effectiveSign === '+' ? '#ffffff' : '#dc2626',
                                                                        },
                                                                    }}
                                                                >
                                                                    +
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => handleUpdateAdditionalCostRow(row.key, 'additionalCostSign', '-')}
                                                                    sx={{
                                                                        minWidth: 28,
                                                                        height: 30,
                                                                        p: 0,
                                                                        borderRadius: '6px',
                                                                        fontWeight: 900,
                                                                        fontSize: '0.9rem',
                                                                        bgcolor: effectiveSign === '-' ? '#16a34a' : 'transparent',
                                                                        color: effectiveSign === '-' ? '#ffffff' : '#64748b',
                                                                        boxShadow: effectiveSign === '-' ? '0 1px 3px rgba(220, 38, 38, 0.35)' : 'none',
                                                                        '&:hover': {
                                                                            bgcolor: effectiveSign === '-' ? '#15803d' : '#dcfce7',
                                                                            color: effectiveSign === '-' ? '#ffffff' : '#16a34a',
                                                                        },
                                                                    }}
                                                                >
                                                                    −
                                                                </Button>
                                                            </Box>
                                                        )}

                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            value={formatWholeNumberInput(row.additionalCost)}
                                                            onChange={(e) => handleUpdateAdditionalCostRow(row.key, 'additionalCost', formatWholeNumberInput(e.target.value))}
                                                            placeholder="0"
                                                            error={rowIncomplete && amount === 0}
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <InputAdornment position="end">
                                                                        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                                                            VNĐ
                                                                        </Typography>
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    borderRadius: '0 8px 8px 0',
                                                                    height: 38,
                                                                    fontSize: '0.875rem',
                                                                    bgcolor: '#ffffff',
                                                                    fontWeight: 800,
                                                                    color: effectiveSign === '+' ? '#dc2626' : '#16a34a',
                                                                },
                                                            }}
                                                        />
                                                    </Box>
                                                </TableCell>

                                                {/* Cột 3: Tên chi phí (nếu có loại Khác) */}
                                                {showNameColumn && (
                                                    <TableCell sx={{ py: 1.2, px: 1.5 }}>
                                                        {isOther ? (
                                                            <TextField
                                                                size="small"
                                                                fullWidth
                                                                required
                                                                error={rowIncomplete && !row.additionalCostCustomName.trim()}
                                                                value={row.additionalCostCustomName}
                                                                onChange={(e) => handleUpdateAdditionalCostRow(row.key, 'additionalCostCustomName', e.target.value)}
                                                                placeholder="Nhập tên chi phí..."
                                                                helperText={rowIncomplete && !row.additionalCostCustomName.trim() ? 'Bắt buộc khi chọn Khác' : undefined}
                                                                sx={{
                                                                    '& .MuiOutlinedInput-root': {
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.825rem',
                                                                        bgcolor: '#ffffff',
                                                                        height: 38,
                                                                    },
                                                                }}
                                                            />
                                                        ) : (
                                                            <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.85rem' }}>
                                                                —
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                )}

                                                {/* Cột 4: Lý do / Giải thích */}
                                                <TableCell sx={{ py: 1.2, px: 1.5 }}>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        error={rowIncomplete && !row.additionalCostReason.trim()}
                                                        value={row.additionalCostReason}
                                                        onChange={(e) => handleUpdateAdditionalCostRow(row.key, 'additionalCostReason', e.target.value)}
                                                        placeholder="Nhập lý do / giải thích chi tiết..."
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: '8px',
                                                                fontSize: '0.825rem',
                                                                bgcolor: '#ffffff',
                                                                height: 38,
                                                            },
                                                        }}
                                                    />
                                                </TableCell>

                                                {/* Cột 5: Nút xóa */}
                                                <TableCell align="center" sx={{ py: 1.2, px: 1 }}>
                                                    <Tooltip title="Xóa khoản chi này">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteAdditionalCostRow(row.key)}
                                                            sx={{
                                                                color: '#94a3b8',
                                                                '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' },
                                                            }}
                                                        >
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {/* Hàng tổng cộng chi phí điều chỉnh */}
                                    <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                        <TableCell sx={{ py: 1.2, px: 2, fontWeight: 800, color: '#334155', fontSize: '0.825rem' }}>
                                            Tổng cộng ({additionalCostRows.length} khoản)
                                        </TableCell>
                                        <TableCell sx={{ py: 1.2, px: 1.5, fontWeight: 800, fontSize: '0.9rem', color: manualAdditionalCostTotal > 0 ? '#166534' : manualAdditionalCostTotal < 0 ? '#1d4ed8' : '#334155' }}>
                                            {manualAdditionalCostTotal > 0 ? '+' : ''}{formatSettlementMoney(manualAdditionalCostTotal)} VNĐ
                                        </TableCell>
                                        <TableCell colSpan={additionalCostRows.some((r) => r.additionalCostType === 'OTHER') ? 3 : 2} sx={{ py: 1.2, px: 1.5, color: '#64748b', fontSize: '0.75rem' }}>
                                            {manualAdditionalCostTotal > 0
                                                ? '→ Sẽ cộng thêm vào số tiền quyết toán sau đối soát'
                                                : manualAdditionalCostTotal < 0
                                                  ? '→ Sẽ khấu trừ giảm bớt khỏi số tiền quyết toán sau đối soát'
                                                  : '—'}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box sx={{ minHeight: needsPaymentCoverageCosts ? 120 : 130, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', p: 3, textAlign: 'center' }}>
                            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, boxShadow: '0 2px 6px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                                <ReceiptLongOutlinedIcon sx={{ fontSize: 22, color: '#94a3b8' }} />
                            </Box>
                            <Typography variant="body2" fontWeight={700} color="#475569" sx={{ fontSize: '0.85rem' }}>
                                {needsPaymentCoverageCosts
                                    ? 'Chưa có khoản chi phí — bấm “Thêm khoản chi” để giải thích phần lệch'
                                    : 'Không có khoản chi phí phát sinh ngoài kỳ'}
                            </Typography>
                            <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.75rem', mt: 0.5, maxWidth: 450 }}>
                                {needsPaymentCoverageCosts
                                    ? 'Tự chọn loại (phí vận chuyển, phạt, chiết khấu, làm tròn, khác…) và điền đủ thông tin'
                                    : 'Bấm nút "Thêm khoản chi" nếu có các khoản phí vận chuyển, chiết khấu hoặc phụ phí phát sinh'}
                            </Typography>
                        </Box>
                    )}
                </Paper>

                {/* 4. Tổng kết quyết toán & Khớp thanh toán */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1.5}>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                            <Box
                                sx={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: '10px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <CalculateOutlinedIcon sx={{ fontSize: '1.2rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                                    4. Tổng kết quyết toán & Khớp thanh toán
                                </Typography>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem' }}>
                                    Bản đồ đối soát {additionalCostRows.length > 0 ? '4' : '3'} bước và xác nhận số tiền thanh toán thực tế
                                </Typography>
                            </Box>
                        </Stack>
                        <AdminStatusBadge
                            label={displayedDiscrepancyCount === 0 ? 'Đã khớp toàn bộ số liệu' : `Có ${displayedDiscrepancyCount} nguồn phát hiện sai lệch`}
                            modifier={displayedDiscrepancyCount === 0 ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                        />
                    </Stack>

                    {/* Loại chênh lệch — SupplierSettlementDiscrepancyType Banner */}
                    <Box
                        sx={{
                            mb: 2.5,
                            p: 1.75,
                            borderRadius: '12px',
                            bgcolor: displayedDiscrepancyCount > 0 ? '#fffbf5' : '#f0fdf4',
                            border: `1px solid ${displayedDiscrepancyCount > 0 ? '#fed7aa' : '#bbf7d0'}`,
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mb: displayedDiscrepancyCount > 0 ? 1.25 : 0 }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
                                {displayedDiscrepancyCount > 0 ? (
                                    <WarningAmberOutlinedIcon sx={{ color: '#c2410c', fontSize: '1.2rem' }} />
                                ) : (
                                    <CheckCircleOutlinedIcon sx={{ color: '#15803d', fontSize: '1.2rem' }} />
                                )}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        fontWeight={800}
                                        color={displayedDiscrepancyCount > 0 ? '#9a3412' : '#166534'}
                                        sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block' }}
                                    >
                                        {displayedDiscrepancyCount > 0 ? 'Chi tiết các nguồn chênh lệch phát hiện' : 'Số liệu đối soát hoàn toàn khớp'}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color={displayedDiscrepancyCount > 0 ? '#9a3412' : '#16a34a'}
                                        sx={{ fontSize: '0.75rem', opacity: 0.9 }}
                                    >
                                        {displayedDiscrepancyCount > 0
                                            ? 'Tự động tính toán lại giá trị thanh toán theo thực tế nhập/trả và đơn giá'
                                            : 'Không phát hiện sai lệch: Số lượng vé nhập, trả và đơn giá khớp hoàn toàn giữa hệ thống và thực tế'}
                                    </Typography>
                                </Box>
                            </Stack>
                            <AdminStatusBadge
                                label={
                                    displayedDiscrepancyCount === 0
                                        ? 'Khớp 100%'
                                        : `${displayedDiscrepancyCount}/${SUPPLIER_SETTLEMENT_DISCREPANCY_TYPES.length} loại lệch`
                                }
                                modifier={displayedDiscrepancyCount === 0 ? 'admin-status-badge--success' : 'admin-status-badge--pending'}
                            />
                        </Stack>

                        {displayedDiscrepancyCount > 0 && (
                            <Stack spacing={1} sx={{ mt: 1 }}>
                                {SUPPLIER_SETTLEMENT_DISCREPANCY_TYPES.map((type) => {
                                    const item = liveDiscrepancyByType.get(type);
                                    const stationOnlyUnitPrice =
                                        type === 'IMPORT_UNIT_PRICE' && !item && hasStationPricingMismatch;
                                    const isDetected = Boolean(item) || stationOnlyUnitPrice;
                                    if (!isDetected) {
                                        return null;
                                    }
                                    const isPositive = item?.direction === 'POSITIVE';
                                    const isExcessReturn = type === 'RETURN_QUANTITY' && isPositive;
                                    return (
                                        <Stack
                                            key={type}
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1.25}
                                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                                            justifyContent="space-between"
                                            sx={{
                                                p: 1.25,
                                                borderRadius: '10px',
                                                bgcolor: '#ffffff',
                                                border: '1px solid',
                                                borderColor: isExcessReturn ? '#bfdbfe' : isPositive ? '#fecdd3' : '#fed7aa',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                            }}
                                        >
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.85rem', mb: 0.25 }}>
                                                    {getDiscrepancyTypeLabel(type)}
                                                </Typography>
                                                {type === 'IMPORT_QUANTITY' && (
                                                    <Typography variant="caption" color="#475569" sx={{ fontSize: '0.775rem', display: 'block' }}>
                                                        Hệ thống {systemImportQty.toLocaleString('vi-VN')} vé → Thực tế {parsedImportQty.toLocaleString('vi-VN')} vé
                                                        {' · '}Lệch <strong>{importQtyDiff > 0 ? '+' : ''}{importQtyDiff.toLocaleString('vi-VN')} vé</strong>
                                                        {' '}({importValDiff > 0 ? '+' : ''}{formatSettlementMoney(importValDiff)} VNĐ)
                                                    </Typography>
                                                )}
                                                {type === 'RETURN_QUANTITY' && (
                                                    <Typography variant="caption" color="#475569" sx={{ fontSize: '0.775rem', display: 'block' }}>
                                                        Hệ thống {systemReturnQty.toLocaleString('vi-VN')} vé → Thực tế {parsedReturnQty.toLocaleString('vi-VN')} vé
                                                        {' · '}Lệch <strong>{returnQtyDiff > 0 ? '+' : ''}{returnQtyDiff.toLocaleString('vi-VN')} vé</strong>
                                                        {' '}({returnValDiff > 0 ? '+' : ''}{formatSettlementMoney(returnValDiff)} VNĐ)
                                                    </Typography>
                                                )}
                                                {type === 'IMPORT_UNIT_PRICE' && (
                                                    <Stack spacing={0.35} sx={{ mt: 0.15 }}>
                                                        {unitPriceDiff !== 0 && parsedUnitPrice > 0 && (
                                                            <Typography variant="caption" color="#475569" sx={{ fontSize: '0.775rem' }}>
                                                                Bình quân kỳ này (sau HH): {formatSettlementMoney(originalUnitPrice)} → <strong>{formatSettlementMoney(parsedUnitPrice)} VNĐ/vé</strong>
                                                                {' '}({unitPriceDiff > 0 ? '+' : ''}{formatSettlementMoney(unitPriceDiff)})
                                                            </Typography>
                                                        )}
                                                        {stationNets.priceMismatchStations.length > 0 && (
                                                            <Typography variant="caption" color="#9a3412" sx={{ fontSize: '0.725rem' }}>
                                                                Đài lệch giá nhập: {stationNets.priceMismatchStations.map((s) =>
                                                                    `${s.lotteryStationName} (${formatSettlementMoney(s.systemImportCost)}→${formatSettlementMoney(s.actualImportCost)})`
                                                                ).join('; ')}
                                                            </Typography>
                                                        )}
                                                        {stationNets.commissionMismatchStations.length > 0 && (
                                                            <Typography variant="caption" color="#1d4ed8" sx={{ fontSize: '0.725rem' }}>
                                                                Đài lệch hoa hồng: {stationNets.commissionMismatchStations.map((s) =>
                                                                    `${s.lotteryStationName} (${(s.systemCommissionRate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%→${(s.actualCommissionRate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%)`
                                                                ).join('; ')}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                )}
                                            </Box>
                                            {item ? (
                                                <AdminStatusBadge
                                                    label={getDiscrepancyItemLabel(item)}
                                                    modifier={
                                                        isExcessReturn
                                                            ? 'admin-status-badge--active'
                                                            : getDiscrepancyItemBadgeModifier(false, item.direction)
                                                    }
                                                />
                                            ) : (
                                                <AdminStatusBadge
                                                    label="Lệch giá nhập / hoa hồng theo đài"
                                                    modifier="admin-status-badge--pending"
                                                />
                                            )}
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        )}
                    </Box>

                    <Box
                        sx={{
                            mb: 2,
                            p: 1.75,
                            borderRadius: '12px',
                            bgcolor: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <InfoOutlinedIcon sx={{ fontSize: '1.1rem', color: '#64748b', mt: 0.2, flexShrink: 0 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="caption"
                                    fontWeight={800}
                                    color="#334155"
                                    sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.3px' }}
                                >
                                    Số tiền cần trả (hệ thống tạm tính)
                                </Typography>
                                <Typography variant="caption" color="#475569" sx={{ fontSize: '0.8rem', display: 'block', lineHeight: 1.55, mb: 1.25 }}>
                                    (Giá nhập sau hoa hồng × tổng vé nhập HT) − tiền vé ế hoàn HT
                                </Typography>
                                <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    spacing={1}
                                    alignItems={{ xs: 'stretch', md: 'center' }}
                                    divider={
                                        <Typography
                                            variant="caption"
                                            fontWeight={800}
                                            color="#64748b"
                                            sx={{ px: { md: 0.25 }, textAlign: 'center' }}
                                        >
                                            −
                                        </Typography>
                                    }
                                >
                                    <Box sx={{ flex: 1, minWidth: 0, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', px: 1.25, py: 1 }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ display: 'block', mb: 0.25 }}>
                                            Tiền nhập HT (sau HH)
                                        </Typography>
                                        <Typography variant="caption" color="#0f172a" fontWeight={800} sx={{ display: 'block' }}>
                                            {formatSettlementMoney(originalUnitPrice)} × {systemImportQty.toLocaleString('vi-VN')} vé
                                            {' = '}
                                            {formatSettlementMoney(systemImportVal)} VNĐ
                                        </Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', px: 1.25, py: 1 }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ display: 'block', mb: 0.25 }}>
                                            Tiền vé ế hoàn HT
                                        </Typography>
                                        <Typography variant="caption" color="#0f172a" fontWeight={800} sx={{ display: 'block' }}>
                                            {formatSettlementMoney(originalUnitPrice)} × {systemReturnQty.toLocaleString('vi-VN')} vé
                                            {' = '}
                                            {formatSettlementMoney(systemReturnVal)} VNĐ
                                        </Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', px: 1.25, py: 1 }}>
                                        <Typography variant="caption" color="#1d4ed8" fontWeight={700} sx={{ display: 'block', mb: 0.25 }}>
                                            = Số tiền cần trả (tạm tính)
                                        </Typography>
                                        <Typography variant="caption" color="#1e3a8a" fontWeight={900} sx={{ display: 'block', fontSize: '0.85rem' }}>
                                            {formatSettlementMoney(initialEstimatedVal)} VNĐ
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>

                    {/* Financial Flow: 3-Step or 4-Step Interactive Reconciliation Map */}
                    <Grid container spacing={2}>
                        {/* Bước 1: Tạm tính ban đầu */}
                        <Grid size={additionalCostRows.length > 0 ? { xs: 12, sm: 6, lg: 3 } : { xs: 12, sm: 4, md: 4 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                        <Typography variant="caption" color="#475569" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.75rem' }}>
                                            1. Tạm tính ban đầu
                                        </Typography>
                                        <AdminStatusBadge
                                            label="Dữ liệu gốc"
                                            modifier="admin-status-badge--draft"
                                        />
                                    </Stack>
                                    <Typography variant="h5" fontWeight={900} color="#0f172a" sx={{ fontSize: '1.35rem', mb: 1.5 }}>
                                        {initialEstimatedVal != null
                                            ? <>{formatSettlementMoney(initialEstimatedVal)} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>VNĐ</span></>
                                            : '—'}
                                    </Typography>
                                </Box>

                                <Stack spacing={0.75} sx={{ pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffffff', px: 1.25, py: 0.6, borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                                            Tiền nhập HT:
                                        </Typography>
                                        <Typography variant="caption" color="#0f172a" fontWeight={800} sx={{ fontSize: '0.8rem' }}>
                                            {formatSettlementMoney(systemImportVal)} VNĐ
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffffff', px: 1.25, py: 0.6, borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                                            Vé ế hoàn HT:
                                        </Typography>
                                        <Typography variant="caption" color="#0f172a" fontWeight={800} sx={{ fontSize: '0.8rem' }}>
                                            {formatSettlementMoney(systemReturnVal)} VNĐ
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        </Grid>

                        {/* Bước 2: Biến động số liệu vé */}
                        <Grid size={additionalCostRows.length > 0 ? { xs: 12, sm: 6, lg: 3 } : { xs: 12, sm: 4, md: 4 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    bgcolor: ticketVarianceTone.bg,
                                    border: `1.5px solid ${ticketVarianceTone.border}`,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                        <Typography variant="caption" fontWeight={800} color={ticketVarianceTone.color} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.75rem' }}>
                                            2. Biến động vé (Δ)
                                        </Typography>
                                        <AdminStatusBadge
                                            label={ticketVarianceTone.label}
                                            modifier={ticketVarianceTone.badgeModifier}
                                        />
                                    </Stack>
                                    <Typography variant="h5" fontWeight={900} color={ticketVarianceTone.color} sx={{ fontSize: '1.35rem', mb: 1.5 }}>
                                        {hasAllRequiredInputs
                                            ? <>{ticketValDiff > 0 ? `+${formatSettlementMoney(ticketValDiff)}` : formatSettlementMoney(ticketValDiff)} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VNĐ</span></>
                                            : <>{formatSettlementMoney(0)} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VNĐ</span></>}
                                    </Typography>
                                </Box>

                                {/* Structured Key-Value Details */}
                                <Stack spacing={0.75} sx={{ pt: 1.5, borderTop: `1px solid ${ticketVarianceTone.border}` }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffffff', px: 1.25, py: 0.6, borderRadius: '8px', border: `1px solid ${ticketVarianceTone.border}` }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                                            Lệch SL nhập & trả:
                                        </Typography>
                                        <Typography variant="caption" color={ticketVarianceTone.color} fontWeight={800} sx={{ fontSize: '0.8rem' }}>
                                            {(importValDiff + returnValDiff) !== 0 ? `${(importValDiff + returnValDiff) > 0 ? '+' : ''}${formatSettlementMoney(importValDiff + returnValDiff)} VNĐ` : '0 VNĐ'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffffff', px: 1.25, py: 0.6, borderRadius: '8px', border: `1px solid ${ticketVarianceTone.border}` }}>
                                        <Typography variant="caption" color="#64748b" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                                            Lệch đơn giá / HH:
                                        </Typography>
                                        <Typography variant="caption" color={ticketVarianceTone.color} fontWeight={800} sx={{ fontSize: '0.8rem' }}>
                                            {stationPriceDiffVal !== 0 ? `${stationPriceDiffVal > 0 ? '+' : ''}${formatSettlementMoney(stationPriceDiffVal)} VNĐ` : '0 VNĐ'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        </Grid>

                        {/* Bước 3: Ô RIÊNG BIỆT - Chi phí & Điều chỉnh ngoài kỳ (chỉ xuất hiện khi có chi phí phát sinh) */}
                        {additionalCostRows.length > 0 && (
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: '14px',
                                        bgcolor: additionalCostTone.bg,
                                        border: `1.5px solid ${additionalCostTone.border}`,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Box>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                            <Typography variant="caption" color={additionalCostTone.color} fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.75rem' }}>
                                                3. Chi phí ngoài kỳ (±)
                                            </Typography>
                                            <AdminStatusBadge
                                                label={additionalCostTone.label}
                                                modifier={additionalCostTone.badgeModifier}
                                            />
                                        </Stack>
                                        <Typography variant="h5" fontWeight={900} color={additionalCostTone.color} sx={{ fontSize: '1.35rem', mb: 1.5 }}>
                                            {manualAdditionalCostTotal === 0
                                                ? <>0 <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VNĐ</span></>
                                                : <>{manualAdditionalCostTotal > 0 ? `+${formatSettlementMoney(manualAdditionalCostTotal)}` : formatSettlementMoney(manualAdditionalCostTotal)} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VNĐ</span></>}
                                        </Typography>
                                    </Box>

                                    {/* Structured Details / List of Cost Items */}
                                    <Stack spacing={0.75} sx={{ pt: 1.5, borderTop: `1px solid ${additionalCostTone.border}` }}>
                                        <Box sx={{ bgcolor: '#ffffff', p: 1, borderRadius: '8px', border: `1px solid ${additionalCostTone.border}`, maxHeight: 95, overflowY: 'auto' }}>
                                            <Stack spacing={0.5}>
                                                {additionalCostRows.map((costRow) => {
                                                    const rowAmt = parseCostRowAmount(costRow);
                                                    if (rowAmt === 0 && !costRow.additionalCostReason.trim()) return null;
                                                    const typeObj = MONETARY_COST_TYPES.find((t) => t.value === costRow.additionalCostType);
                                                    const rawLabel = typeObj ? typeObj.label.replace(/\s*\([+−±\-]\)/g, '') : (costRow.additionalCostCustomName || 'Khác');
                                                    return (
                                                        <Box key={costRow.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem' }}>
                                                            <Typography variant="caption" color="#475569" sx={{ fontSize: '0.725rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                                                                • {rawLabel}{costRow.additionalCostReason.trim() ? ` (${costRow.additionalCostReason.trim()})` : ''}:
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 800, color: rowAmt > 0 ? '#166534' : '#1d4ed8', fontSize: '0.725rem' }}>
                                                                {rowAmt > 0 ? '+' : ''}{formatSettlementMoney(rowAmt)} VNĐ
                                                            </Typography>
                                                        </Box>
                                                    );
                                                })}
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </Box>
                            </Grid>
                        )}

                        {/* Bước cuối: Quyết toán sau đối soát */}
                        <Grid size={additionalCostRows.length > 0 ? { xs: 12, sm: 6, lg: 3 } : { xs: 12, sm: 4, md: 4 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    bgcolor: '#eff6ff',
                                    border: '1.5px solid #93c5fd',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                                        <Typography variant="caption" color="#1e40af" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '0.75rem' }}>
                                            {additionalCostRows.length > 0 ? '4. Quyết toán sau đối soát' : '3. Quyết toán sau đối soát'}
                                        </Typography>
                                        <AdminStatusBadge
                                            label="Số tiền chốt"
                                            modifier="admin-status-badge--active"
                                        />
                                    </Stack>
                                    <Typography variant="h5" fontWeight={900} color="#1d4ed8" sx={{ fontSize: '1.45rem', mb: 1.5 }}>
                                        {finalVal != null
                                            ? <>{formatSettlementMoney(finalVal)} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>VNĐ</span></>
                                            : '—'}
                                    </Typography>
                                </Box>

                                {/* Structured Key-Value Details */}
                                <Stack spacing={0.75} sx={{ pt: 1.5, borderTop: '1px solid #bfdbfe' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffffff', px: 1.25, py: 0.6, borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                        <Typography variant="caption" color="#1e40af" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                                            Giá vốn TT:
                                        </Typography>
                                        <Typography variant="caption" color="#1d4ed8" fontWeight={800} sx={{ fontSize: '0.8rem' }}>
                                            {parsedUnitPrice > 0 ? formatSettlementMoney(parsedUnitPrice) : '—'} VNĐ/vé
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#ffffff', px: 1.25, py: 0.6, borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                        <Typography variant="caption" color="#1e40af" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                                            SL thanh toán TT:
                                        </Typography>
                                        <Typography variant="caption" color="#1d4ed8" fontWeight={800} sx={{ fontSize: '0.8rem' }}>
                                            {(parsedImportQty - parsedReturnQty).toLocaleString('vi-VN')} vé
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        </Grid>

                        {/* Thanh toán & Đối chiếu thực trả (Payment Reconciliation Card) */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box
                                sx={{
                                    p: 2.25,
                                    borderRadius: '14px',
                                    bgcolor: highlightActualPaid ? '#fff1f2' : '#f8fafc',
                                    border: `1.5px solid ${highlightActualPaid ? '#fb7185' : '#e2e8f0'}`,
                                    boxShadow: highlightActualPaid ? '0 0 0 3px rgba(244, 63, 94, 0.12)' : 'none',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }} gap={1} flexWrap="wrap">
                                    <Typography variant="caption" color="#0f172a" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', fontSize: '0.775rem' }}>
                                        Số tiền cần trả thực tế (biên lai NCC) <Box component="span" sx={{ color: '#ef4444' }}>*</Box>
                                    </Typography>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        disabled={finalVal == null || isSubmitting}
                                        startIcon={<AutoFixHighOutlinedIcon sx={{ fontSize: '0.9rem !important' }} />}
                                        onClick={() => {
                                            if (finalVal == null) return;
                                            setActualPaidAmount(formatSignedWithDots(finalVal));
                                        }}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.725rem',
                                            borderRadius: '8px',
                                            py: 0.3,
                                            px: 1.25,
                                            borderColor: '#bfdbfe',
                                            color: '#2563eb',
                                            bgcolor: '#eff6ff',
                                            '&:hover': { bgcolor: '#dbeafe', borderColor: '#2563eb' },
                                        }}
                                    >
                                        Điền theo đối soát
                                    </Button>
                                </Stack>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={actualPaidAmount}
                                    placeholder="Nhập số tiền trên biên lai NCC..."
                                    error={highlightActualPaid}
                                    helperText={
                                        highlightActualPaid
                                            ? 'Bắt buộc nhập số tiền cần trả thực tế từ biên lai'
                                            : 'Có thể nhập số âm nếu NCC hoàn / ghi có'
                                    }
                                    onChange={(e) => setActualPaidAmount(formatSignedWithDots(e.target.value))}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Typography variant="caption" fontWeight={800} color="#0f172a">
                                                    VNĐ
                                                </Typography>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            bgcolor: '#ffffff',
                                            fontWeight: 800,
                                            fontSize: '1.05rem',
                                            ...(highlightActualPaid
                                                ? { '& fieldset': { borderColor: '#f43f5e', borderWidth: 1.5 } }
                                                : {}),
                                        },
                                        '& input': { fontWeight: 800, fontSize: '1.05rem', py: 1.1 },
                                    }}
                                />
                            </Box>
                        </Grid>

                        {/* Metric 5: So sánh thực trả vs đối soát */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box
                                sx={{
                                    p: 2.25,
                                    borderRadius: '14px',
                                    bgcolor: paidDiffTone.bg,
                                    border: `1.5px solid ${paidDiffTone.border}`,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography
                                        variant="caption"
                                        fontWeight={800}
                                        color={paidDiffTone.color}
                                        sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', fontSize: '0.775rem' }}
                                    >
                                        Chênh lệch Thực trả / Đối soát
                                    </Typography>
                                    <AdminStatusBadge
                                        label={paidDiffTone.label}
                                        modifier={paidDiffTone.badgeModifier}
                                    />
                                </Stack>
                                <Typography variant="h5" fontWeight={900} color={paidDiffTone.color} sx={{ fontSize: '1.45rem', my: 'auto' }}>
                                    {paymentRemainingDiff != null
                                        ? <>
                                            {paymentRemainingDiff > 0
                                                ? `+${formatSettlementMoney(paymentRemainingDiff)}`
                                                : formatSettlementMoney(paymentRemainingDiff)}{' '}
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VNĐ</span>
                                          </>
                                        : '—'}
                                </Typography>
                                <Typography variant="caption" color={paidDiffTone.color} sx={{ fontSize: '0.75rem', opacity: 0.9, mt: 1 }}>
                                    {paidDiff > 0
                                        ? `= Thực trả > Đối soát (Đại lý đang tính thiếu ${formatSettlementMoney(paidDiff)} VNĐ so với biên lai NCC → cần thêm chi phí)`
                                        : paidDiff < 0
                                          ? `= Thực trả < Đối soát (Đại lý đang tính thừa ${formatSettlementMoney(Math.abs(paidDiff))} VNĐ so với biên lai NCC → cần thêm chiết khấu)`
                                          : '= Số tiền cần trả thực tế khớp hoàn toàn với quyết toán sau đối soát (0 VNĐ)'}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* 5. Chứng từ & Biên lai đối soát */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '8px',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <ReceiptLongOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                5. Chứng từ & Biên lai đối soát
                            </Typography>
                        </Stack>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CompareArrowsOutlinedIcon />}
                            onClick={() => setCompareModalOpen(true)}
                            sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                color: '#2563eb',
                                borderColor: '#bfdbfe',
                                bgcolor: '#eff6ff',
                                '&:hover': { bgcolor: '#dbeafe', borderColor: '#2563eb' },
                            }}
                        >
                            Đối chiếu chứng từ 2 cột
                        </Button>
                    </Box>

                    <Grid container spacing={2.5}>
                        {/* Column 1: Biên lai phiếu nhập lô (Bắt buộc) */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: { xs: 2, md: 2.25 },
                                    borderRadius: '14px',
                                    borderColor: highlightImportEvidence ? '#fb7185' : '#e2e8f0',
                                    bgcolor: '#ffffff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.2s ease',
                                    boxShadow: highlightImportEvidence ? '0 0 0 3px rgba(244, 63, 94, 0.12)' : 'none',
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }} flexWrap="wrap" gap={1}>
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                bgcolor: hasAllImportEvidence ? '#eff6ff' : '#fff7ed',
                                                color: hasAllImportEvidence ? '#2563eb' : '#ea580c',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <ReceiptLongOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                            Chứng từ phiếu nhập lô ({effectiveImportBatches.length}) <Box component="span" sx={{ color: '#ef4444' }}>*</Box>
                                        </Typography>
                                    </Stack>
                                    {hasAllImportEvidence ? (
                                        <AdminStatusBadge
                                            label={
                                                effectiveImportBatches.length > 1
                                                    ? `Đủ chứng từ (${completeImportBatchesCount}/${effectiveImportBatches.length})`
                                                    : 'Đã đủ chứng từ'
                                            }
                                            modifier="admin-status-badge--success"
                                        />
                                    ) : (
                                        <AdminStatusBadge
                                            label="Thiếu biên lai hoặc danh sách vé"
                                            modifier="admin-status-badge--inactive"
                                        />
                                    )}
                                </Stack>

                                <Typography variant="caption" color="#64748b" sx={{ mb: 1.5, display: 'block', fontSize: '0.75rem' }}>
                                    Mỗi phiếu nhập cần biên lai + ảnh danh sách vé (tải lên server, giống biên lai NCC).
                                </Typography>

                                {/* Batch toggle if more than 1 import batch */}
                                {effectiveImportBatches.length > 1 && (
                                    <Box sx={{ mb: 1.5 }}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                                            <Typography variant="caption" color="#475569" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                                                Danh sách phiếu nhập lô ({effectiveImportBatches.filter((b) => isBatchCompleteEvidence(b)).length}/{effectiveImportBatches.length} đủ chứng từ):
                                            </Typography>
                                        </Stack>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                p: '4px',
                                                bgcolor: '#f8fafc',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                                overflowX: 'auto',
                                                scrollbarWidth: 'none',
                                                '&::-webkit-scrollbar': { display: 'none' },
                                            }}
                                        >
                                            {effectiveImportBatches.map((batch, index) => {
                                                const isSel = batch.id === selectedImportId;
                                                const batchHasImg = isBatchCompleteEvidence(batch);
                                                const shortCode = batch.batchCode
                                                    ? batch.batchCode.length > 18
                                                        ? `${batch.batchCode.slice(0, 10)}...${batch.batchCode.slice(-6)}`
                                                        : batch.batchCode
                                                    : `#${batch.id}`;

                                                return (
                                                    <Tooltip
                                                        key={batch.id}
                                                        title={
                                                            <Box sx={{ p: 0.5 }}>
                                                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                                                                    Phiếu #{index + 1}: {batch.batchCode || `#${batch.id}`}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
                                                                    {batch.drawDate ? `Ngày quay: ${dayjs(batch.drawDate).format('DD/MM/YYYY')} · ` : ''}
                                                                    {batchHasImg ? '✓ Đủ biên lai + danh sách vé' : '⚠️ Thiếu chứng từ'}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                        arrow
                                                    >
                                                        <ButtonBase
                                                            onClick={() => setSelectedImportId(batch.id)}
                                                            sx={{
                                                                px: 1.5,
                                                                py: 0.65,
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.75,
                                                                flexShrink: 0,
                                                                transition: 'all 0.15s ease',
                                                                bgcolor: isSel
                                                                    ? '#2563eb'
                                                                    : batchHasImg
                                                                    ? '#ffffff'
                                                                    : '#fff1f2',
                                                                color: isSel
                                                                    ? '#ffffff'
                                                                    : batchHasImg
                                                                    ? '#334155'
                                                                    : '#be123c',
                                                                border: `1px solid ${
                                                                    isSel
                                                                        ? '#2563eb'
                                                                        : batchHasImg
                                                                        ? '#e2e8f0'
                                                                        : '#fecdd3'
                                                                }`,
                                                                boxShadow: isSel ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none',
                                                                '&:hover': {
                                                                    bgcolor: isSel
                                                                        ? '#1d4ed8'
                                                                        : batchHasImg
                                                                        ? '#f8fafc'
                                                                        : '#ffe4e6',
                                                                },
                                                            }}
                                                        >
                                                            {batchHasImg ? (
                                                                <CheckCircleOutlinedIcon
                                                                    sx={{
                                                                        fontSize: '0.85rem',
                                                                        color: isSel ? '#93c5fd' : '#16a34a',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <WarningAmberOutlinedIcon
                                                                    sx={{
                                                                        fontSize: '0.85rem',
                                                                        color: isSel ? '#fecaca' : '#dc2626',
                                                                    }}
                                                                />
                                                            )}
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    fontWeight: isSel ? 700 : 600,
                                                                    fontSize: '0.75rem',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                Phiếu {index + 1}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    fontSize: '0.7rem',
                                                                    opacity: isSel ? 0.85 : 0.65,
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                ({shortCode})
                                                            </Typography>
                                                        </ButtonBase>
                                                    </Tooltip>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}

                                {/* Selected Batch Details Subtitle Strip */}
                                {selectedImport && (
                                    <Box
                                                sx={{
                                                    p: 1.25,
                                                    mb: 1.5,
                                                    borderRadius: '10px',
                                                    bgcolor: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    flexWrap: 'wrap',
                                                    gap: 1,
                                                }}
                                            >
                                                <Stack direction="row" spacing={0.75} alignItems="center">
                                                    <Box
                                                        sx={{
                                                            width: 22,
                                                            height: 22,
                                                            borderRadius: '6px',
                                                            bgcolor: '#eff6ff',
                                                            color: '#2563eb',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <ReceiptLongOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                                                    </Box>
                                                    <Typography variant="caption" color="#475569" sx={{ fontSize: '0.75rem' }}>
                                                        Mã phiếu: <strong style={{ color: '#0f172a' }}>{selectedImport.batchCode || `#${selectedImport.id}`}</strong>
                                                        {selectedImport.drawDate ? ` · Ngày quay: ${dayjs(selectedImport.drawDate).format('DD/MM/YYYY')}` : ''}
                                                    </Typography>
                                                </Stack>

                                                {isBatchCompleteEvidence(selectedImport) ? (
                                                    <AdminStatusBadge
                                                        label="Đủ chứng từ"
                                                        modifier="admin-status-badge--success"
                                                    />
                                                ) : (
                                                    <AdminStatusBadge
                                                        label={!hasImportReceipt ? 'Thiếu biên lai' : 'Thiếu danh sách vé'}
                                                        modifier="admin-status-badge--inactive"
                                                    />
                                                )}
                                            </Box>
                                        )}

                                        {/* Tabs: Biên lai | Danh sách vé */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 0.5,
                                                p: '4px',
                                                mb: 1.5,
                                                bgcolor: '#f1f5f9',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                            }}
                                        >
                                            <ButtonBase
                                                onClick={() => setImportEvidenceTab('receipt')}
                                                sx={{
                                                    flex: 1,
                                                    py: 0.6,
                                                    px: 1.25,
                                                    borderRadius: '7px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: importEvidenceTab === 'receipt' ? 800 : 600,
                                                    bgcolor: importEvidenceTab === 'receipt' ? '#ffffff' : 'transparent',
                                                    color: importEvidenceTab === 'receipt' ? '#0f172a' : '#64748b',
                                                    boxShadow: importEvidenceTab === 'receipt' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                    transition: 'all 0.15s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 0.75,
                                                }}
                                            >
                                                <ReceiptLongOutlinedIcon sx={{ fontSize: '0.9rem', color: hasImportReceipt ? '#16a34a' : '#dc2626' }} />
                                                Biên lai phiếu nhập
                                                {hasImportReceipt ? (
                                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16a34a' }} />
                                                ) : (
                                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#dc2626' }} />
                                                )}
                                            </ButtonBase>
                                            <ButtonBase
                                                onClick={() => setImportEvidenceTab('ticketList')}
                                                sx={{
                                                    flex: 1,
                                                    py: 0.6,
                                                    px: 1.25,
                                                    borderRadius: '7px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: importEvidenceTab === 'ticketList' ? 800 : 600,
                                                    bgcolor: importEvidenceTab === 'ticketList' ? '#ffffff' : 'transparent',
                                                    color: importEvidenceTab === 'ticketList' ? '#0f172a' : '#64748b',
                                                    boxShadow: importEvidenceTab === 'ticketList' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                                    transition: 'all 0.15s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 0.75,
                                                }}
                                            >
                                                <PhotoLibraryOutlinedIcon sx={{ fontSize: '0.9rem', color: hasSelectedImportTicketListImages ? '#16a34a' : '#dc2626' }} />
                                                Danh sách vé ({selectedImportTicketListImages.length})
                                                {hasSelectedImportTicketListImages ? (
                                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16a34a' }} />
                                                ) : (
                                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#dc2626' }} />
                                                )}
                                            </ButtonBase>
                                        </Box>

                                        {importEvidenceTab === 'receipt' ? (
                                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                {hasImportReceipt ? (
                                                    <Box
                                                        sx={{
                                                            position: 'relative',
                                                            width: '100%',
                                                            flex: 1,
                                                            minHeight: 180,
                                                            borderRadius: '12px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #cbd5e1',
                                                            bgcolor: '#f8fafc',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        {selectedImportReceiptIsImage ? (
                                                            <Box
                                                                component="img"
                                                                src={selectedImportReceiptUrl}
                                                                alt="Biên lai phiếu nhập"
                                                                sx={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'contain',
                                                                    cursor: 'pointer',
                                                                }}
                                                                onClick={() =>
                                                                    openMatchingEvidence(
                                                                        selectedImportReceiptUrl,
                                                                        `Biên lai phiếu nhập: ${selectedImport?.batchCode || `#${selectedImport?.id}`}`,
                                                                        selectedImportPendingReceiptFile
                                                                    )
                                                                }
                                                            />
                                                        ) : (
                                                            <Stack
                                                                spacing={1}
                                                                alignItems="center"
                                                                justifyContent="center"
                                                                sx={{ px: 2, textAlign: 'center', cursor: 'pointer' }}
                                                                onClick={() =>
                                                                    openMatchingEvidence(
                                                                        selectedImportReceiptUrl,
                                                                        `Biên lai phiếu nhập: ${selectedImport?.batchCode || `#${selectedImport?.id}`}`,
                                                                        selectedImportPendingReceiptFile
                                                                    )
                                                                }
                                                            >
                                                                <InsertDriveFileOutlinedIcon sx={{ fontSize: '2.25rem', color: '#2563eb' }} />
                                                                <Typography variant="caption" fontWeight={700} color="#0f172a" sx={{ wordBreak: 'break-all' }}>
                                                                    {getEvidenceFileLabel(selectedImportReceiptUrl, selectedImportPendingReceiptFile)}
                                                                </Typography>
                                                                <Typography variant="caption" color="#64748b" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <OpenInNewOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                                                                    Mở tệp
                                                                </Typography>
                                                            </Stack>
                                                        )}
                                                        <Stack
                                                            direction="row"
                                                            spacing={0.5}
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 8,
                                                                right: 8,
                                                                bgcolor: 'rgba(15, 23, 42, 0.75)',
                                                                borderRadius: '8px',
                                                                p: 0.5,
                                                            }}
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    openMatchingEvidence(
                                                                        selectedImportReceiptUrl,
                                                                        `Biên lai phiếu nhập: ${selectedImport?.batchCode || `#${selectedImport?.id}`}`,
                                                                        selectedImportPendingReceiptFile
                                                                    )
                                                                }
                                                                sx={{ color: '#ffffff', p: 0.5 }}
                                                                title={selectedImportReceiptIsImage ? 'Xem ảnh lớn' : 'Mở tệp'}
                                                            >
                                                                {selectedImportReceiptIsImage ? (
                                                                    <ZoomInIcon fontSize="small" />
                                                                ) : (
                                                                    <OpenInNewOutlinedIcon fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                disabled={isUploadingImportReceipt}
                                                                component="label"
                                                                sx={{ color: '#ffffff', p: 0.5 }}
                                                                title="Thay tệp khác"
                                                            >
                                                                <CloudUploadIcon fontSize="small" />
                                                                <input
                                                                    type="file"
                                                                    accept={MATCHING_EVIDENCE_ACCEPT}
                                                                    hidden
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file && selectedImport) {
                                                                            void handleUploadImportReceipt(file);
                                                                        }
                                                                        e.target.value = '';
                                                                    }}
                                                                />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                disabled={isUploadingImportReceipt}
                                                                onClick={handleDeleteImportReceipt}
                                                                sx={{ color: '#f87171', p: 0.5 }}
                                                                title="Gỡ tệp này"
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                    </Box>
                                                ) : (
                                                    <Box
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setIsDraggingImportReceipt(true);
                                                        }}
                                                        onDragLeave={() => setIsDraggingImportReceipt(false)}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            setIsDraggingImportReceipt(false);
                                                            const file = e.dataTransfer.files?.[0];
                                                            if (file && isAllowedMatchingEvidenceFile(file) && selectedImport) {
                                                                void handleUploadImportReceipt(file);
                                                            } else if (file) {
                                                                AppToast.warning('Vui lòng chọn ảnh, PDF, Excel hoặc CSV.');
                                                            }
                                                        }}
                                                        onClick={() => {
                                                            if (!isUploadingImportReceipt) {
                                                                document.getElementById('matching-import-receipt-input')?.click();
                                                            }
                                                        }}
                                                        sx={{
                                                            width: '100%',
                                                            flex: 1,
                                                            minHeight: 180,
                                                            borderRadius: '12px',
                                                            border: '2px dashed',
                                                            borderColor: isDraggingImportReceipt ? '#2563eb' : '#cbd5e1',
                                                            bgcolor: isDraggingImportReceipt ? '#eff6ff' : '#f8fafc',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            textAlign: 'center',
                                                            cursor: isUploadingImportReceipt ? 'default' : 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            p: 2,
                                                            '&:hover': {
                                                                borderColor: '#2563eb',
                                                                bgcolor: '#eff6ff26',
                                                            },
                                                        }}
                                                    >
                                                        <input
                                                            id="matching-import-receipt-input"
                                                            type="file"
                                                            accept={MATCHING_EVIDENCE_ACCEPT}
                                                            hidden
                                                            disabled={isUploadingImportReceipt}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file && selectedImport) {
                                                                    void handleUploadImportReceipt(file);
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                        {isUploadingImportReceipt ? (
                                                            <Stack spacing={1} alignItems="center" justifyContent="center">
                                                                <CircularProgress size={28} sx={{ color: '#2563eb' }} />
                                                                <Typography variant="caption" fontWeight={700} color="#0f172a">
                                                                    Đang tải biên lai phiếu nhập...
                                                                </Typography>
                                                            </Stack>
                                                        ) : (
                                                            <Stack spacing={1} alignItems="center" justifyContent="center">
                                                                <Box
                                                                    sx={{
                                                                        width: 44,
                                                                        height: 44,
                                                                        borderRadius: '50%',
                                                                        bgcolor: '#ffffff',
                                                                        border: '1px solid #e2e8f0',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                                                        color: '#2563eb',
                                                                    }}
                                                                >
                                                                    <CloudUploadIcon sx={{ fontSize: '1.4rem' }} />
                                                                </Box>
                                                                <Typography variant="caption" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.8rem' }}>
                                                                    Kéo thả tệp vào đây hoặc{' '}
                                                                    <Box component="span" sx={{ color: '#2563eb', textDecoration: 'underline' }}>
                                                                        chọn từ thiết bị
                                                                    </Box>
                                                                </Typography>
                                                                <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem' }}>
                                                                    Ảnh JPG, PNG, PDF, Excel, CSV (tối đa 10MB) · Bắt buộc
                                                                </Typography>
                                                            </Stack>
                                                        )}
                                                    </Box>
                                                )}
                                            </Box>
                                        ) : (
                                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <ImportBatchTicketListImagesField
                                                    key={`ticket-list-field-${selectedImport?.id ?? 'none'}`}
                                                    value={selectedImportTicketListImages}
                                                    disabled={isUploadingTicketListImages}
                                                    onChange={(nextUrls) => {
                                                        void handleUpdateTicketListImages(nextUrls);
                                                    }}
                                                    compact
                                                />
                                            </Box>
                                        )}
                            </Paper>
                        </Grid>

                        {/* Column 2: Biên lai đối soát từ NCC (Bắt buộc) */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: { xs: 2, md: 2.25 },
                                    borderRadius: '14px',
                                    borderColor: highlightNccReceipt ? '#fb7185' : '#e2e8f0',
                                    bgcolor: '#ffffff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.2s ease',
                                    boxShadow: highlightNccReceipt ? '0 0 0 3px rgba(244, 63, 94, 0.12)' : 'none',
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }} flexWrap="wrap" gap={1}>
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                bgcolor: hasReceipt ? '#eff6ff' : '#fff7ed',
                                                color: hasReceipt ? '#2563eb' : '#ea580c',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <CloudUploadIcon sx={{ fontSize: '1.15rem' }} />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                            Biên lai đối soát từ NCC <Box component="span" sx={{ color: '#ef4444' }}>*</Box>
                                        </Typography>
                                    </Stack>
                                    {hasReceipt ? (
                                        <AdminStatusBadge
                                            label="Đã đính kèm"
                                            modifier="admin-status-badge--success"
                                        />
                                    ) : (
                                        <AdminStatusBadge
                                            label="Chưa có (Bắt buộc)"
                                            modifier="admin-status-badge--inactive"
                                        />
                                    )}
                                </Stack>

                                <Typography variant="caption" color="#64748b" sx={{ mb: 1.5, display: 'block', fontSize: '0.75rem' }}>
                                    Tải lên ảnh hoặc tệp biên lai / bảng kê NCC để đối chiếu chéo số liệu
                                </Typography>

                                {/* Hidden File Input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={MATCHING_EVIDENCE_ACCEPT}
                                    style={{ display: 'none' }}
                                    onChange={handleFileInputChange}
                                />

                                {hasReceipt ? (
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            flex: 1,
                                            minHeight: 180,
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            border: '1px solid #cbd5e1',
                                            bgcolor: '#f8fafc',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {nccReceiptIsImage ? (
                                            <Box
                                                component="img"
                                                src={receiptUrl}
                                                alt="Biên lai đối soát"
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() =>
                                                    openMatchingEvidence(
                                                        receiptUrl,
                                                        `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`,
                                                        pendingNccReceiptFile
                                                    )
                                                }
                                            />
                                        ) : (
                                            <Stack
                                                spacing={1}
                                                alignItems="center"
                                                justifyContent="center"
                                                sx={{ px: 2, textAlign: 'center', cursor: 'pointer' }}
                                                onClick={() =>
                                                    openMatchingEvidence(
                                                        receiptUrl,
                                                        `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`,
                                                        pendingNccReceiptFile
                                                    )
                                                }
                                            >
                                                <InsertDriveFileOutlinedIcon sx={{ fontSize: '2.25rem', color: '#ea580c' }} />
                                                <Typography variant="caption" fontWeight={700} color="#0f172a" sx={{ wordBreak: 'break-all' }}>
                                                    {getEvidenceFileLabel(receiptUrl, pendingNccReceiptFile)}
                                                </Typography>
                                                <Typography variant="caption" color="#64748b" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                    <OpenInNewOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                                                    Mở tệp
                                                </Typography>
                                            </Stack>
                                        )}
                                        <Stack
                                            direction="row"
                                            spacing={0.5}
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                bgcolor: 'rgba(15, 23, 42, 0.75)',
                                                borderRadius: '8px',
                                                p: 0.5,
                                            }}
                                        >
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    openMatchingEvidence(
                                                        receiptUrl,
                                                        `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`,
                                                        pendingNccReceiptFile
                                                    )
                                                }
                                                sx={{ color: '#ffffff', p: 0.5 }}
                                                title={nccReceiptIsImage ? 'Xem ảnh lớn' : 'Mở tệp'}
                                            >
                                                {nccReceiptIsImage ? (
                                                    <ZoomInIcon fontSize="small" />
                                                ) : (
                                                    <OpenInNewOutlinedIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                disabled={isUploadingReceipt}
                                                onClick={() => fileInputRef.current?.click()}
                                                sx={{ color: '#ffffff', p: 0.5 }}
                                                title="Thay tệp khác"
                                            >
                                                <CloudUploadIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                disabled={isUploadingReceipt}
                                                onClick={handleDeleteReceipt}
                                                sx={{ color: '#f87171', p: 0.5 }}
                                                title="Gỡ tệp này"
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Box>
                                ) : (
                                    <Box
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => !isUploadingReceipt && fileInputRef.current?.click()}
                                        sx={{
                                            width: '100%',
                                            flex: 1,
                                            minHeight: 180,
                                            borderRadius: '12px',
                                            border: '2px dashed',
                                            borderColor: isDragging ? '#FF3030' : '#cbd5e1',
                                            bgcolor: isDragging ? '#fff5f5' : '#f8fafc',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            cursor: isUploadingReceipt ? 'default' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            p: 2,
                                            '&:hover': {
                                                borderColor: isUploadingReceipt ? '#cbd5e1' : '#FF3030',
                                                bgcolor: isUploadingReceipt ? '#f8fafc' : '#fff5f5',
                                            },
                                        }}
                                    >
                                        {isUploadingReceipt ? (
                                            <Stack spacing={1} alignItems="center" justifyContent="center">
                                                <CircularProgress size={28} sx={{ color: '#FF3030' }} />
                                                <Typography variant="caption" fontWeight={700} color="#0f172a">
                                                    Đang lưu tệp biên lai...
                                                </Typography>
                                            </Stack>
                                        ) : (
                                            <Stack spacing={1} alignItems="center" justifyContent="center">
                                                <Box
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: '50%',
                                                        bgcolor: '#ffffff',
                                                        border: '1px solid #e2e8f0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                                        color: '#FF3030',
                                                    }}
                                                >
                                                    <CloudUploadIcon sx={{ fontSize: '1.4rem' }} />
                                                </Box>
                                                <Typography variant="caption" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.8rem' }}>
                                                    Kéo thả hoặc{' '}
                                                    <Box component="span" sx={{ color: '#FF3030', textDecoration: 'underline' }}>
                                                        chọn tệp biên lai
                                                    </Box>
                                                </Typography>
                                                <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem' }}>
                                                    Ảnh JPG, PNG, PDF, Excel, CSV (tối đa 10MB) · Bắt buộc
                                                </Typography>
                                            </Stack>
                                        )}
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                {/* 6. Ghi chú đối chiếu & Thanh tác vụ hành động */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        borderRadius: '16px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                >
                    <Box sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                            <Box
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '7px',
                                    bgcolor: '#f1f5f9',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <EditNoteOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                            </Box>
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.9rem' }}>
                                Ghi chú đối chiếu
                            </Typography>
                        </Stack>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={3}
                            size="small"
                            value={note}
                            placeholder="Nhập ghi chú hoặc diễn giải thêm cho kỳ đối soát này (nếu có)..."
                            onChange={(e) => setNote(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    bgcolor: '#f8fafc',
                                },
                            }}
                        />
                    </Box>

                    {/* Blockers Alert: Thiết kế lại sang dạng checklist tags hiện đại */}
                    {submitBlockers.length > 0 && (
                        <Box
                            sx={{
                                p: 1.75,
                                borderRadius: '12px',
                                bgcolor: '#fffbeb',
                                border: '1px solid #fde68a',
                                mb: 2,
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <WarningAmberOutlinedIcon sx={{ fontSize: '1.15rem', color: '#b45309' }} />
                                    <Typography variant="subtitle2" fontWeight={800} color="#92400e" sx={{ fontSize: '0.85rem' }}>
                                        Chưa thể xác nhận đối chiếu
                                    </Typography>
                                </Stack>
                                <AdminStatusBadge
                                    label={`Còn ${submitBlockers.length} điều kiện chưa hoàn tất`}
                                    modifier="admin-status-badge--pending"
                                />
                            </Stack>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.85 }}>
                                {submitBlockers.map((item, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                            bgcolor: '#ffffff',
                                            px: 1.25,
                                            py: 0.5,
                                            borderRadius: '8px',
                                            border: '1px solid #fed7aa',
                                            fontSize: '0.775rem',
                                            fontWeight: 600,
                                            color: '#9a3412',
                                        }}
                                    >
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ea580c', flexShrink: 0 }} />
                                        {item}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Unified Bottom Action Bar */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="flex-end"
                        spacing={1.5}
                        sx={{
                            pt: 2,
                            borderTop: '1px solid #f1f5f9',
                        }}
                    >
                        {onCancelEdit && (
                            <Button
                                variant="outlined"
                                disabled={isSubmitting}
                                onClick={onCancelEdit}
                                startIcon={<CloseIcon sx={{ fontSize: '1rem' }} />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    borderRadius: '10px',
                                    py: 0.9,
                                    px: 2.5,
                                    borderColor: '#cbd5e1',
                                    color: '#475569',
                                    bgcolor: '#ffffff',
                                    '&:hover': {
                                        bgcolor: '#f8fafc',
                                        borderColor: '#94a3b8',
                                        color: '#1e293b',
                                    },
                                }}
                            >
                                Hủy chỉnh sửa
                            </Button>
                        )}

                        <Tooltip
                            title={submitBlockers.length > 0 ? submitBlockers.join(' · ') : ''}
                        >
                            <span>
                                <Button
                                    variant="contained"
                                    disabled={!canSubmit || isSubmitting}
                                    onClick={handleSubmit}
                                    startIcon={
                                        isSubmitting ? (
                                            <CircularProgress size={18} color="inherit" />
                                        ) : (
                                            <CheckCircleOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                                        )
                                    }
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        fontSize: '0.875rem',
                                        borderRadius: '10px',
                                        py: 0.9,
                                        px: 3.5,
                                        bgcolor: '#FF3030',
                                        color: '#ffffff',
                                        boxShadow: '0 4px 14px rgba(255, 48, 48, 0.3)',
                                        '&:hover': {
                                            bgcolor: '#e02828',
                                            boxShadow: '0 6px 18px rgba(255, 48, 48, 0.4)',
                                        },
                                        '&.Mui-disabled': {
                                            bgcolor: 'rgba(145, 158, 171, 0.24) !important',
                                            color: 'rgba(145, 158, 171, 0.8) !important',
                                            boxShadow: 'none !important',
                                            cursor: 'not-allowed !important',
                                            opacity: 0.55,
                                        },
                                    }}
                                >
                                    {isFlushingDraft
                                        ? 'Đang lưu chứng từ...'
                                        : isSubmitting
                                          ? 'Đang đối chiếu...'
                                          : 'Xác nhận đối chiếu'}
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                </Paper>
            </Stack>


            {/* Redesigned Return Batch Handover Confirmation Modal */}
            <Dialog
                open={returnHandoverConfirmOpen}
                onClose={() => setReturnHandoverConfirmOpen(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: '20px',
                            overflow: 'hidden',
                            boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)',
                        },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        p: 3,
                        pb: 2,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                            sx={{
                                width: 46,
                                height: 46,
                                borderRadius: '14px',
                                bgcolor: 'rgba(245, 158, 11, 0.12)',
                                color: '#d97706',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                            }}
                        >
                            <WarningAmberOutlinedIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={800} color="#0f172a">
                                Phiếu trả chưa hoàn tất bàn giao
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                <AdminStatusBadge
                                    label="Chưa bàn giao (PENDING)"
                                    modifier="admin-status-badge--pending"
                                />
                            </Stack>
                        </Box>
                    </Stack>
                    <IconButton
                        size="small"
                        onClick={() => setReturnHandoverConfirmOpen(false)}
                        sx={{
                            color: '#94a3b8',
                            bgcolor: '#f1f5f9',
                            '&:hover': { bgcolor: '#e2e8f0', color: '#334155' },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ px: 3, py: 1.5 }}>
                    <Stack spacing={2}>
                        {/* Notice Card */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: '#fffbeb',
                                border: '1px solid #fde68a',
                            }}
                        >
                            <Typography variant="body2" fontWeight={700} color="#92400e" sx={{ mb: 0.5 }}>
                                Phiếu trả vé chưa ở trạng thái ĐÃ BÀN GIAO hoặc chưa hoàn tất kiểm tra.
                            </Typography>
                            <Typography variant="caption" color="#b45309">
                                Phiếu trả có thể đang trong quá trình chuyển phát hoặc chưa được ký biên nhận thực tế với nhà cung cấp.
                            </Typography>
                        </Paper>

                        {/* Informational Guidance Box */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                            }}
                        >
                            <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 1, display: 'block' }}>
                                Điều gì sẽ xảy ra khi bạn xác nhận?
                            </Typography>
                            <Stack spacing={1}>
                                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                                    <Box component="span" sx={{ color: '#2563eb', fontWeight: 800, fontSize: '0.85rem' }}>
                                        •
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                        <strong>Số liệu đối soát:</strong> Hệ thống sẽ tạm dùng số lượng vé trả hiện có trên phiếu để tính toán công nợ và quyết toán.
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                                    <Box component="span" sx={{ color: '#d97706', fontWeight: 800, fontSize: '0.85rem' }}>
                                        •
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                        <strong>Khuyến nghị:</strong> Bạn vẫn nên hoàn tất quy trình bàn giao phiếu trả thực tế khi có thể để lưu đầy đủ chứng từ.
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Paper>
                    </Stack>
                </DialogContent>

                <DialogActions
                    sx={{
                        p: 2.5,
                        px: 3,
                        bgcolor: '#f8fafc',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1.5,
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={() => setReturnHandoverConfirmOpen(false)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            color: '#475569',
                            borderColor: '#cbd5e1',
                            borderRadius: '10px',
                            px: 2.5,
                            py: 1,
                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                        }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setReturnHandoverConfirmOpen(false);
                            submitMatching();
                        }}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 800,
                            borderRadius: '10px',
                            bgcolor: '#FF3030',
                            color: '#ffffff',
                            px: 3,
                            py: 1,
                            boxShadow: '0 4px 14px rgba(255, 48, 48, 0.3)',
                            '&:hover': { bgcolor: '#e02828' },
                        }}
                    >
                        Vẫn xác nhận đối chiếu
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Local Image Zoom Dialog fallback */}
            <Dialog
                open={Boolean(previewZoom)}
                onClose={() => setPreviewZoom(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                    <Typography fontWeight={800} variant="subtitle1">
                        {previewZoom?.title || `Biên lai đối soát #${settlement.supplierSettlementCode || settlement.id}`}
                    </Typography>
                    <IconButton size="small" onClick={() => setPreviewZoom(null)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc' }}>
                    {previewZoom?.url && (
                        <Box
                            component="img"
                            src={previewZoom.url}
                            alt="Biên lai đối soát"
                            sx={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Side-by-Side Dual Receipt Comparison Modal */}
            <Dialog
                open={compareModalOpen}
                onClose={() => setCompareModalOpen(false)}
                maxWidth="xl"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: '18px',
                            overflow: 'hidden',
                            maxHeight: '94vh',
                        },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 2,
                        px: 3,
                        borderBottom: '1px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '10px',
                                bgcolor: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CompareArrowsOutlinedIcon sx={{ fontSize: '1.3rem' }} />
                        </Box>
                        <Box>
                            <Typography fontWeight={800} variant="subtitle1" color="#0f172a">
                                So sánh biên lai phiếu nhập & biên lai đối soát NCC
                            </Typography>
                            <Typography variant="caption" color="#64748b">
                                {settlement.supplierName} · #{settlement.supplierSettlementCode || settlement.id}
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton size="small" onClick={() => setCompareModalOpen(false)} sx={{ color: '#64748b' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 3, bgcolor: '#f1f5f9' }}>
                    <Grid container spacing={3}>
                        {/* Left: Biên lai phiếu nhập lô */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    border: '1px solid #cbd5e1',
                                    bgcolor: '#ffffff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    minHeight: { xs: 360, md: 540 },
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ReceiptLongOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.15rem' }} />
                                        1. Chứng từ phiếu nhập lô ({effectiveImportBatches.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', p: '2px', bgcolor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '3px' }}>
                                        <ButtonBase
                                            onClick={() => setCompareLeftTab('receipt')}
                                            sx={{
                                                px: 1.25,
                                                py: 0.4,
                                                borderRadius: '6px',
                                                bgcolor: compareLeftTab === 'receipt' ? '#ffffff' : 'transparent',
                                                color: compareLeftTab === 'receipt' ? '#2563eb' : '#475569',
                                                boxShadow: compareLeftTab === 'receipt' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                                fontSize: '0.75rem',
                                                fontWeight: compareLeftTab === 'receipt' ? 800 : 600,
                                            }}
                                        >
                                            Ảnh biên lai
                                        </ButtonBase>
                                        <ButtonBase
                                            onClick={() => setCompareLeftTab('ticketList')}
                                            sx={{
                                                px: 1.25,
                                                py: 0.4,
                                                borderRadius: '6px',
                                                bgcolor: compareLeftTab === 'ticketList' ? '#ffffff' : 'transparent',
                                                color: compareLeftTab === 'ticketList' ? '#2563eb' : '#475569',
                                                boxShadow: compareLeftTab === 'ticketList' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                                fontSize: '0.75rem',
                                                fontWeight: compareLeftTab === 'ticketList' ? 800 : 600,
                                            }}
                                        >
                                            Danh sách vé ({selectedImportTicketListImages.length})
                                        </ButtonBase>
                                    </Box>
                                </Stack>

                                {/* Batch switcher if multiple */}
                                {effectiveImportBatches.length > 1 && (
                                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
                                        {effectiveImportBatches.map((batch) => {
                                            const isSel = batch.id === selectedImportId;
                                            return (
                                                <Chip
                                                    key={batch.id}
                                                    label={batch.batchCode || `#${batch.id}`}
                                                    onClick={() => setSelectedImportId(batch.id)}
                                                    color={isSel ? 'primary' : 'default'}
                                                    variant={isSel ? 'filled' : 'outlined'}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: isSel ? 700 : 500,
                                                        cursor: 'pointer',
                                                        borderRadius: '8px',
                                                        bgcolor: isSel ? '#2563eb' : '#ffffff',
                                                        color: isSel ? '#ffffff' : '#475569',
                                                    }}
                                                />
                                            );
                                        })}
                                    </Stack>
                                )}

                                {selectedImport && (
                                    <Typography variant="caption" color="#64748b" sx={{ mb: 1.5, display: 'block' }}>
                                        Mã phiếu: <strong>{selectedImport.batchCode || `#${selectedImport.id}`}</strong>
                                        {selectedImport.drawDate ? ` · Ngày quay: ${dayjs(selectedImport.drawDate).format('DD/MM/YYYY')}` : ''}
                                    </Typography>
                                )}

                                <Box
                                    sx={{
                                        flex: 1,
                                        width: '100%',
                                        minHeight: 420,
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        bgcolor: '#f8fafc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'auto',
                                        position: 'relative',
                                        p: compareLeftTab === 'ticketList' ? 2 : 0,
                                    }}
                                >
                                    {compareLeftTab === 'receipt' ? (
                                        selectedImportReceiptUrl ? (
                                            selectedImportReceiptIsImage ? (
                                            <>
                                                <Box
                                                    component="img"
                                                    src={selectedImportReceiptUrl}
                                                    alt="Biên lai nhập"
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        maxHeight: '65vh',
                                                        objectFit: 'contain',
                                                        cursor: 'zoom-in',
                                                    }}
                                                    onClick={() =>
                                                        openMatchingEvidence(
                                                            selectedImportReceiptUrl,
                                                            `Biên lai nhập · ${selectedImport?.batchCode || selectedImport?.id}`,
                                                            selectedImportPendingReceiptFile
                                                        )
                                                    }
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        openMatchingEvidence(
                                                            selectedImportReceiptUrl,
                                                            `Biên lai nhập · ${selectedImport?.batchCode || selectedImport?.id}`,
                                                            selectedImportPendingReceiptFile
                                                        )
                                                    }
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 10,
                                                        right: 10,
                                                        bgcolor: 'rgba(15, 23, 42, 0.8)',
                                                        color: '#ffffff',
                                                        '&:hover': { bgcolor: '#0f172a' },
                                                    }}
                                                    title="Phóng to ảnh"
                                                >
                                                    <ZoomInIcon fontSize="small" />
                                                </IconButton>
                                            </>
                                            ) : (
                                                <Stack spacing={1.25} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                                                    <InsertDriveFileOutlinedIcon sx={{ fontSize: '2.75rem', color: '#2563eb' }} />
                                                    <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ wordBreak: 'break-all' }}>
                                                        {getEvidenceFileLabel(selectedImportReceiptUrl, selectedImportPendingReceiptFile)}
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<OpenInNewOutlinedIcon />}
                                                        onClick={() =>
                                                            openMatchingEvidence(
                                                                selectedImportReceiptUrl,
                                                                `Biên lai nhập · ${selectedImport?.batchCode || selectedImport?.id}`,
                                                                selectedImportPendingReceiptFile
                                                            )
                                                        }
                                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                                    >
                                                        Mở tệp biên lai
                                                    </Button>
                                                </Stack>
                                            )
                                        ) : (
                                            <Stack spacing={1} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                                                <ImageNotSupportedOutlinedIcon sx={{ fontSize: '2.5rem', color: '#94a3b8' }} />
                                                <Typography variant="body2" color="#64748b" fontWeight={600}>
                                                    Chưa có tệp biên lai cho phiếu nhập này
                                                </Typography>
                                            </Stack>
                                        )
                                    ) : (
                                        selectedImportTicketListImages.length > 0 ? (
                                            <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                                                {selectedImportTicketListImages.map((imgUrl, idx) => {
                                                    const pendingFile =
                                                        selectedImport?.id != null
                                                            ? (pendingTicketListFilesById[selectedImport.id] || [])[idx]
                                                            : undefined;
                                                    const isImage = isLikelyImageEvidenceUrl(imgUrl, pendingFile);
                                                    return (
                                                    <Box
                                                        key={imgUrl}
                                                        sx={{
                                                            position: 'relative',
                                                            borderRadius: '10px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #cbd5e1',
                                                            bgcolor: '#ffffff',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.15s ease' },
                                                        }}
                                                        onClick={() =>
                                                            openMatchingEvidence(
                                                                imgUrl,
                                                                `Danh sách vé #${idx + 1} · ${selectedImport?.batchCode || selectedImport?.id}`,
                                                                pendingFile
                                                            )
                                                        }
                                                    >
                                                        {isImage ? (
                                                            <Box
                                                                component="img"
                                                                src={imgUrl}
                                                                alt={`Danh sách vé ${idx + 1}`}
                                                                sx={{ width: 140, height: 140, objectFit: 'cover', display: 'block' }}
                                                            />
                                                        ) : (
                                                            <Stack
                                                                alignItems="center"
                                                                justifyContent="center"
                                                                spacing={0.75}
                                                                sx={{ width: 140, height: 140, p: 1.5, textAlign: 'center' }}
                                                            >
                                                                <InsertDriveFileOutlinedIcon sx={{ color: '#2563eb' }} />
                                                                <Typography variant="caption" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.65rem', wordBreak: 'break-all' }}>
                                                                    {getEvidenceFileLabel(imgUrl, pendingFile)}
                                                                </Typography>
                                                            </Stack>
                                                        )}
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                bottom: 0,
                                                                left: 0,
                                                                right: 0,
                                                                py: 0.5,
                                                                bgcolor: 'rgba(15, 23, 42, 0.75)',
                                                                color: '#ffffff',
                                                                textAlign: 'center',
                                                            }}
                                                        >
                                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700 }}>
                                                                Tệp #{idx + 1}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    );
                                                })}
                                            </Box>
                                        ) : (
                                            <Stack spacing={1} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                                                <ImageNotSupportedOutlinedIcon sx={{ fontSize: '2.5rem', color: '#94a3b8' }} />
                                                <Typography variant="body2" color="#64748b" fontWeight={600}>
                                                    Chưa có tệp danh sách vé cho phiếu nhập này
                                                </Typography>
                                            </Stack>
                                        )
                                    )}
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Right: Biên lai đối soát từ NCC */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    border: '1px solid #cbd5e1',
                                    bgcolor: '#ffffff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    minHeight: { xs: 360, md: 540 },
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CloudUploadIcon sx={{ color: '#ea580c', fontSize: '1.15rem' }} />
                                        2. Biên lai đối soát từ NCC <Box component="span" sx={{ color: '#ef4444' }}>*</Box>
                                    </Typography>
                                    {hasReceipt ? (
                                        <AdminStatusBadge label="Đã đính kèm" modifier="admin-status-badge--success" />
                                    ) : (
                                        <AdminStatusBadge label="Chưa có (Bắt buộc)" modifier="admin-status-badge--inactive" />
                                    )}
                                </Stack>

                                <Typography variant="caption" color="#64748b" sx={{ mb: 1.5, display: 'block' }}>
                                    Ảnh hoặc tệp biên lai / bảng kê NCC làm căn cứ đối soát
                                </Typography>

                                <Box
                                    sx={{
                                        flex: 1,
                                        width: '100%',
                                        minHeight: 420,
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        bgcolor: '#f8fafc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}
                                >
                                    {hasReceipt ? (
                                        nccReceiptIsImage ? (
                                        <>
                                            <Box
                                                component="img"
                                                src={receiptUrl}
                                                alt="Biên lai đối soát NCC"
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    maxHeight: '65vh',
                                                    objectFit: 'contain',
                                                    cursor: 'zoom-in',
                                                }}
                                                onClick={() =>
                                                    openMatchingEvidence(
                                                        receiptUrl,
                                                        `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`,
                                                        pendingNccReceiptFile
                                                    )
                                                }
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    openMatchingEvidence(
                                                        receiptUrl,
                                                        `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`,
                                                        pendingNccReceiptFile
                                                    )
                                                }
                                                sx={{
                                                    position: 'absolute',
                                                    top: 10,
                                                    right: 10,
                                                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                                                    color: '#ffffff',
                                                    '&:hover': { bgcolor: '#0f172a' },
                                                }}
                                                title="Phóng to ảnh"
                                            >
                                                <ZoomInIcon fontSize="small" />
                                            </IconButton>
                                        </>
                                        ) : (
                                            <Stack spacing={1.25} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                                                <InsertDriveFileOutlinedIcon sx={{ fontSize: '2.75rem', color: '#ea580c' }} />
                                                <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ wordBreak: 'break-all' }}>
                                                    {getEvidenceFileLabel(receiptUrl, pendingNccReceiptFile)}
                                                </Typography>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<OpenInNewOutlinedIcon />}
                                                    onClick={() =>
                                                        openMatchingEvidence(
                                                            receiptUrl,
                                                            `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`,
                                                            pendingNccReceiptFile
                                                        )
                                                    }
                                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                                >
                                                    Mở tệp biên lai
                                                </Button>
                                            </Stack>
                                        )
                                    ) : (
                                        <Stack spacing={1} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                                            <CloudUploadIcon sx={{ fontSize: '2.5rem', color: '#94a3b8' }} />
                                            <Typography variant="body2" color="#64748b" fontWeight={600}>
                                                Chưa tải lên tệp biên lai đối soát từ NCC
                                            </Typography>
                                        </Stack>
                                    )}
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
            </Dialog>

            {/* Modal: Danh sách phiếu trả vé trong kỳ đối soát */}
            <Dialog
                open={returnBatchesDialogOpen}
                onClose={() => setReturnBatchesDialogOpen(false)}
                maxWidth="md"
                fullWidth
                slotProps={{
                    paper: {
                        sx: { borderRadius: '16px', overflow: 'hidden' },
                    },
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, px: 3, borderBottom: '1px solid #e2e8f0' }}>
                    <Box>
                        <Typography variant="h6" fontWeight={800} color="#0f172a">
                            Danh sách phiếu trả vé trong kỳ đối soát
                        </Typography>
                        <Typography variant="caption" color="#64748b">
                            Nhà cung cấp: <strong>{settlement.supplierName || '—'}</strong> · Giờ chốt trả vé: <strong>{cutOffTimeDisplay}</strong>
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setReturnBatchesDialogOpen(false)} sx={{ color: '#64748b' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    {returnBatches.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center', bgcolor: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <Typography variant="body2" color="#64748b" fontWeight={600}>
                                Không có phiếu trả vé nào được ghi nhận trong kỳ đối soát này.
                            </Typography>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    setReturnBatchesDialogOpen(false);
                                    router.push(ROUTES.ADMIN.RETURN_BATCH.LIST);
                                }}
                                sx={{ mt: 2, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                            >
                                Đi đến trang Trả vé NCC
                            </Button>
                        </Box>
                    ) : (
                        <TableContainer sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Mã phiếu</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Ngày quay</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Số lượng trả</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Giá trị trả</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {returnBatches.map((rb) => {
                                        return (
                                            <TableRow key={rb.id} hover>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                                                    {rb.batchCode || `#${rb.id}`}
                                                </TableCell>
                                                <TableCell>
                                                    {rb.drawDate ? dayjs(rb.drawDate).format('DD/MM/YYYY') : '—'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                    {(rb.totalQuantity ?? 0).toLocaleString('vi-VN')} vé
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>
                                                    {formatSettlementMoney(rb.totalReturnValue ?? 0)} VNĐ
                                                </TableCell>
                                                <TableCell>
                                                    <AdminStatusBadge
                                                        label={getReturnBatchStatusLabel(rb.status as ReturnBatchStatus | null, rb.statusLabel)}
                                                        modifier={getReturnBatchStatusBadgeClass(rb.status as ReturnBatchStatus | null)}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<VisibilityOutlinedIcon />}
                                                        onClick={() => {
                                                            setReturnBatchesDialogOpen(false);
                                                            router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(rb.id));
                                                        }}
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontWeight: 700,
                                                            fontSize: '0.75rem',
                                                            borderRadius: '8px',
                                                        }}
                                                    >
                                                        Xem chi tiết
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};
