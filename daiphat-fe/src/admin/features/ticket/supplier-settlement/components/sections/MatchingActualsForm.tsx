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
import { uploadAdminImage } from '@/admin/shared/services/upload.service';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { AppToast } from '../../../../../../utils/toast.util';
import { attachImportBatchInvoiceEvidence, attachTicketListImages } from '../../../import-batch/services/importBatchService';
import { ImportBatchTicketListImagesField } from '../../../import-batch/components/sections/ImportBatchTicketListImagesField';
import { updateSupplierSettlementReceiptUrl } from '../../services/supplierSettlementService';
import type {
    SettlementAdjustmentReasonCode,
    SettlementMatchingAdditionalCost,
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SettlementStationPricing,
    SupplierSettlement,
    SupplierSettlementAdjustment,
} from '../../types/supplierSettlement.type';
import { computeImportCostFromStation, formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { MatchingStationPricingTable } from './MatchingStationPricingTable';
import {
    getDiscrepancyTypeLabel,
    getReturnBatchCutOffDisplay,
    isReturnBatchHandedOver,
    isReturnBatchOverdue,
    isReturnMatchingForfeitedToAgent,
    isReturnReconciliationLocked,
    resolveLiveSystemReturnQuantity,
} from '../../utils/settlementLabels';
import { formatSettlementMoney, scaleSettlementMoney } from '../../utils/settlementCashflow';

const MONETARY_COST_TYPES: Array<{ value: SettlementAdjustmentReasonCode; label: string }> = [
    { value: 'SHIPPING_FEE', label: 'Phí vận chuyển (+)' },
    { value: 'LATE_PENALTY', label: 'Phạt chậm (+)' },
    { value: 'DISCOUNT', label: 'Chiết khấu / giảm trừ (−)' },
    { value: 'ROUNDING', label: 'Làm tròn (±)' },
    { value: 'OTHER', label: 'Khác (±)' },
];

const AUTO_PAYMENT_DIFF_KEY = 'auto-payment-diff';
const AUTO_PAYMENT_DIFF_REASON = 'Chênh lệch thanh toán so với biên lai (phát sinh ngoài kỳ)';

interface AdditionalCostRow {
    key: string;
    additionalCost: string;
    additionalCostType: SettlementAdjustmentReasonCode;
    additionalCostReason: string;
    additionalCostCustomName: string;
    isAutoPaymentDifference?: boolean;
}

interface MatchingActualsFormProps {
    settlement: SupplierSettlement;
    importBatches?: SettlementOverviewImportBatch[];
    returnBatches?: SettlementOverviewReturnBatch[];
    adjustments?: SupplierSettlementAdjustment[];
    stationPricing?: SettlementStationPricing[];
    inventoryByStation?: SettlementStationInventory[];
    isSubmitting?: boolean;
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
    }) => void;
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

/** Parses whole-number inputs. Unit costs use their numeric value directly. */
const parseWholeNumberInput = (val?: string | number | null): number => {
    if (!val) return 0;
    const digits = String(val).replace(/\D/g, '');
    return parseInt(digits, 10) || 0;
};

const formatSignedWithDots = (val?: number | string | null): string => {
    if (val === '' || val === null || val === undefined) return '';
    const raw = String(val).trim();
    const negative = raw.startsWith('-');
    const digits = raw.replace(/\D/g, '');
    if (!digits) return negative ? '-' : '';
    return `${negative ? '-' : ''}${parseInt(digits, 10).toLocaleString('vi-VN')}`;
};

const parseSignedFromDots = (val?: string | number | null): number => {
    if (val === '' || val === null || val === undefined) return 0;
    const raw = String(val).trim();
    const negative = raw.startsWith('-');
    const digits = raw.replace(/\D/g, '');
    const amount = parseInt(digits, 10) || 0;
    return negative ? -amount : amount;
};

const asStringUrlList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
    }
    if (typeof value === 'string' && value.trim()) {
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
        .map((row) => ({
            key: `adj-${row.id}`,
            additionalCost: formatSignedWithDots(row.amount),
            additionalCostType: MONETARY_COST_TYPES.some((type) => type.value === row.reasonCode)
                ? row.reasonCode
                : 'OTHER',
            additionalCostReason: row.note || '',
            additionalCostCustomName: row.reasonCode === 'OTHER' ? (row.customName || '') : '',
            isAutoPaymentDifference: Boolean(row.autoGenerated) || row.note === AUTO_PAYMENT_DIFF_REASON,
        }));

const createAdditionalCostRow = (): AdditionalCostRow => ({
    key: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    additionalCost: '',
    additionalCostType: 'SHIPPING_FEE',
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
    isSubmitting,
    onZoomImage,
    onReceiptUploaded,
    onStationsUpdated,
    onConfirm,
}: MatchingActualsFormProps) => {
    const router = useAdminRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importReceiptInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingImportReceipt, setIsDraggingImportReceipt] = useState(false);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [isUploadingImportReceipt, setIsUploadingImportReceipt] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState(settlement.supplierSettlementReceiptUrl || '');
    const [previewZoom, setPreviewZoom] = useState<{ url: string; title: string } | null>(null);
    const [compareModalOpen, setCompareModalOpen] = useState(false);
    const [compareLeftTab, setCompareLeftTab] = useState<'receipt' | 'ticketList'>('receipt');
    const [returnBatchesDialogOpen, setReturnBatchesDialogOpen] = useState(false);
    const [returnHandoverConfirmOpen, setReturnHandoverConfirmOpen] = useState(false);
    const [localImportReceiptById, setLocalImportReceiptById] = useState<Record<number, string>>({});
    const [localTicketListImagesById, setLocalTicketListImagesById] = useState<Record<number, string[]>>({});
    const [isUploadingTicketListImages, setIsUploadingTicketListImages] = useState(false);
    const [importEvidenceTab, setImportEvidenceTab] = useState<'receipt' | 'ticketList'>('receipt');

    const [selectedImportId, setSelectedImportId] = useState<number | null>(importBatches[0]?.id ?? null);

    const { data: supplier } = useSupplierDetail(settlement.lotterySupplierId);
    const drawDate = settlement.periodFrom ? String(settlement.periodFrom).slice(0, 10) : undefined;
    const { data: stationsByDrawDate } = useStationsByDrawDate(drawDate);
    const stationsForDrawDate = Array.isArray(stationsByDrawDate) ? stationsByDrawDate : [];

    const pricingRows = useMemo<SettlementStationPricing[]>(() => {
        if (stationPricing.length > 0) {
            return stationPricing.map((row) => ({
                ...row,
                importCost: Math.round(Number(row.importCost || 0)),
                netUnitPrice: Math.round(Number(row.netUnitPrice || 0)),
            }));
        }
        const stationById = new Map(
            (stationsForDrawDate || []).map((station) => [Number(station.id ?? station._id), station])
        );
        return (inventoryByStation || [])
            .filter((row) => Number(row.importedQuantity || 0) > 0 && row.lotteryStationId != null)
            .map((row) => {
                const station = stationById.get(Number(row.lotteryStationId));
                const importCost = Math.round(Number(station?.price ?? 10000));
                const commissionRate = Number(station?.commissionRate ?? 0);
                const net = computeImportCostFromStation(importCost, commissionRate) ?? importCost * (1 - commissionRate);
                return {
                    lotteryStationId: row.lotteryStationId,
                    lotteryStationName: row.lotteryStationName || station?.name || `Đài #${row.lotteryStationId}`,
                    importedQuantity: row.importedQuantity,
                    importCost,
                    commissionRate,
                    netUnitPrice: Math.round(net),
                };
            });
    }, [stationPricing, inventoryByStation, stationsForDrawDate]);
    const [stationNets, setStationNets] = useState({ systemNet: 0, actualNet: 0, complete: false });
    const handleStationWeightedChange = useCallback((payload: {
        systemNet: number;
        actualNet: number;
        complete: boolean;
    }) => {
        setStationNets((prev) => {
            if (
                prev.systemNet === payload.systemNet
                && prev.actualNet === payload.actualNet
                && prev.complete === payload.complete
            ) {
                return prev;
            }
            return {
                systemNet: Number.isFinite(payload.systemNet) ? payload.systemNet : 0,
                actualNet: Number.isFinite(payload.actualNet) ? payload.actualNet : 0,
                complete: payload.complete,
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
    const isReturnForfeited = useMemo(
        () => isReturnMatchingForfeitedToAgent(returnBatches),
        [returnBatches]
    );

    const firstActiveReturnBatch = useMemo(
        () => (returnBatches || []).find((b) => b.status && b.status !== 'CANCELLED') || returnBatches[0] || null,
        [returnBatches]
    );

    const isReturnOverdue = useMemo(() => {
        if (!isReturnLocked) return false;
        if (settlement.isReturnExpired) return true;
        return isReturnBatchOverdue(
            firstActiveReturnBatch,
            supplier?.returnCutOffTime,
            settlement.periodTo || settlement.periodFrom
        );
    }, [isReturnLocked, settlement, firstActiveReturnBatch, supplier?.returnCutOffTime]);

    const cutOffTimeDisplay = useMemo(() => {
        return getReturnBatchCutOffDisplay(
            firstActiveReturnBatch,
            supplier?.returnCutOffTime,
            settlement.periodTo || settlement.periodFrom
        );
    }, [firstActiveReturnBatch, supplier?.returnCutOffTime, settlement.periodTo, settlement.periodFrom]);

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

    const [unitPrice, setUnitPrice] = useState(() => formatWholeNumberInput(initialUnitPrice));
    const [importQty, setImportQty] = useState(() =>
        formatWholeNumberInput(settlement.actualTicketImportQuantity ?? settlement.systemImportQuantity ?? 0)
    );
    const [returnQty, setReturnQty] = useState(() => {
        const forfeited = isReturnMatchingForfeitedToAgent(returnBatches);
        return formatWholeNumberInput(
            forfeited
                ? 0
                : (settlement.actualReturnTicketQuantity ?? settlement.systemReturnQuantity ?? 0)
        );
    });
    const [note, setNote] = useState(settlement.reconciliationNote || '');
    const [actualPaidAmount, setActualPaidAmount] = useState(() =>
        formatWholeNumberInput(settlement.actualPaidAmount)
    );
    const [additionalCostRows, setAdditionalCostRows] = useState<AdditionalCostRow[]>(() =>
        mapSettlementAdjustmentsToRows(adjustments)
    );

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
            setReceiptUrl(settlement.supplierSettlementReceiptUrl || '');
            const derivedUnitPrice =
                settlement.reconciledTicketUnitPrice && settlement.reconciledTicketUnitPrice > 0
                    ? Number(settlement.reconciledTicketUnitPrice)
                    : settlement.actualTicketPrice && settlement.actualTicketPrice > 0
                    ? Number(settlement.actualTicketPrice)
                    : originalUnitPrice;

            setUnitPrice(formatWholeNumberInput(derivedUnitPrice));
            setImportQty(formatWholeNumberInput(settlement.actualTicketImportQuantity ?? settlement.systemImportQuantity ?? 0));
            const forfeited = isReturnMatchingForfeitedToAgent(returnBatches);
            setReturnQty(
                formatWholeNumberInput(
                    forfeited
                        ? 0
                        : (settlement.actualReturnTicketQuantity ?? settlement.systemReturnQuantity ?? 0)
                )
            );
            setNote(settlement.reconciliationNote || '');
            setActualPaidAmount(formatWholeNumberInput(settlement.actualPaidAmount));
            setAdditionalCostRows(mapSettlementAdjustmentsToRows(adjustments));
        } else {
            // Same settlement: only sync receiptUrl if empty locally and present in server data
            if (!receiptUrl && settlement.supplierSettlementReceiptUrl) {
                setReceiptUrl(settlement.supplierSettlementReceiptUrl);
            }
        }
    }, [settlement, originalUnitPrice, returnBatches, adjustments, receiptUrl]);

    const selectedImport = useMemo(
        () => importBatches.find((b) => b.id === selectedImportId) || importBatches[0],
        [importBatches, selectedImportId]
    );

    const importBatchReceiptUrl = (batch?: SettlementOverviewImportBatch | null) =>
        (batch?.id != null ? localImportReceiptById[batch.id] : undefined)
        || batch?.invoiceEvidenceUrl
        || batch?.receiptImageUrl
        || batch?.evidenceUrl
        || '';

    const importBatchTicketListImages = (batch?: SettlementOverviewImportBatch | null): string[] =>
        (batch?.id != null ? localTicketListImagesById[batch.id] : undefined)
        || asStringUrlList(batch?.ticketListImageUrls);

    const isBatchCompleteEvidence = (batch?: SettlementOverviewImportBatch | null): boolean =>
        Boolean(String(importBatchReceiptUrl(batch)).trim()) && importBatchTicketListImages(batch).length > 0;

    const selectedImportReceiptUrl = importBatchReceiptUrl(selectedImport);
    const selectedImportTicketListImages = importBatchTicketListImages(selectedImport);
    const hasImportReceipt = Boolean(selectedImportReceiptUrl && selectedImportReceiptUrl.trim());
    const hasSelectedImportTicketListImages = selectedImportTicketListImages.length > 0;
    const isSelectedImportComplete = hasImportReceipt && hasSelectedImportTicketListImages;

    const uploadedImportReceiptCount = useMemo(
        () => importBatches.filter((batch) => Boolean(String(importBatchReceiptUrl(batch)).trim())).length,
        [importBatches, localImportReceiptById]
    );

    const uploadedTicketListImagesCount = useMemo(
        () => importBatches.filter((batch) => importBatchTicketListImages(batch).length > 0).length,
        [importBatches, localTicketListImagesById]
    );

    const completeImportBatchesCount = useMemo(
        () => importBatches.filter((batch) => isBatchCompleteEvidence(batch)).length,
        [importBatches, localImportReceiptById, localTicketListImagesById]
    );

    const missingImportBatches = useMemo(
        () => importBatches.filter((batch) => !String(importBatchReceiptUrl(batch)).trim()),
        [importBatches, localImportReceiptById]
    );

    const missingTicketListBatches = useMemo(
        () => importBatches.filter((batch) => importBatchTicketListImages(batch).length === 0),
        [importBatches, localTicketListImagesById]
    );

    const hasAllImportReceipts =
        importBatches.length === 0
        || importBatches.every((batch) => Boolean(String(importBatchReceiptUrl(batch)).trim()));

    const hasAllTicketListImages =
        importBatches.length === 0
        || importBatches.every((batch) => importBatchTicketListImages(batch).length > 0);

    const hasAllImportEvidence = hasAllImportReceipts && hasAllTicketListImages;

    useEffect(() => {
        if (!importBatches.some((b) => b.id === selectedImportId)) {
            setSelectedImportId(importBatches[0]?.id ?? null);
        }
    }, [importBatches, selectedImportId]);

    const systemImportQty = settlement.systemImportQuantity ?? 0;
    const systemReturnQty = resolveLiveSystemReturnQuantity(settlement, returnBatches);
    // Payable uses giá vốn sau hoa hồng (bình quân bảng đài), not the pre-commission 10.000đ face value
    // that older import lines may still store.
    const systemImportVal = originalUnitPrice > 0
        ? scaleSettlementMoney(originalUnitPrice * systemImportQty)
        : scaleSettlementMoney(Number(settlement.systemImportValue ?? 0));
    const systemReturnVal = originalUnitPrice > 0
        ? scaleSettlementMoney(originalUnitPrice * systemReturnQty)
        : scaleSettlementMoney(Number(settlement.systemReturnValue ?? 0));

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

    // Real-time discrepancy detection
    const liveDiscrepancyTypes = useMemo(() => {
        const types: Array<'IMPORT_UNIT_PRICE' | 'IMPORT_QUANTITY' | 'RETURN_QUANTITY'> = [];
        if (parsedUnitPrice > 0 && originalUnitPrice > 0 && parsedUnitPrice !== originalUnitPrice) {
            types.push('IMPORT_UNIT_PRICE');
        }
        if (!isImportQtyEmpty && parsedImportQty !== systemImportQty) {
            types.push('IMPORT_QUANTITY');
        }
        if (!isReturnQtyEmpty && parsedReturnQty !== systemReturnQty) {
            types.push('RETURN_QUANTITY');
        }
        return types;
    }, [
        parsedUnitPrice,
        originalUnitPrice,
        isImportQtyEmpty,
        parsedImportQty,
        systemImportQty,
        isReturnQtyEmpty,
        parsedReturnQty,
        systemReturnQty,
    ]);

    // Settlement amounts use the same after-commission unit price as the station table.
    const initialEstimatedVal = scaleSettlementMoney(
        originalUnitPrice * (systemImportQty - systemReturnQty)
    );

    const additionalCostTotal = additionalCostRows.reduce(
        (sum, row) => sum + parseSignedFromDots(row.additionalCost),
        0
    );
    const manualAdditionalCostTotal = additionalCostRows.reduce(
        (sum, row) => row.isAutoPaymentDifference ? sum : sum + parseSignedFromDots(row.additionalCost),
        0
    );
    const autoPaymentDiffRow = additionalCostRows.find((row) => row.isAutoPaymentDifference);
    const hasIncompleteAdditionalCost = additionalCostRows.some((row) => {
        const amount = parseSignedFromDots(row.additionalCost);
        const hasAnyValue =
            row.additionalCost.replace(/[^\d-]/g, '').replace(/-/g, '').length > 0
            || row.additionalCostReason.trim().length > 0
            || row.additionalCostCustomName.trim().length > 0;
        if (!hasAnyValue) {
            return false;
        }
        const missingOtherName = row.additionalCostType === 'OTHER' && !row.additionalCostCustomName.trim();
        return amount === 0 || !row.additionalCostType || !row.additionalCostReason.trim() || missingOtherName;
    });

    const liveFinalVal = scaleSettlementMoney(
        parsedUnitPrice * (parsedImportQty - parsedReturnQty) + manualAdditionalCostTotal
    );
    const finalVal = hasAllRequiredInputs ? liveFinalVal : null;
    const differenceAmount = hasAllRequiredInputs
        ? scaleSettlementMoney(liveFinalVal - initialEstimatedVal)
        : 0;
    const parsedActualPaidAmount = parseWholeNumberInput(actualPaidAmount);
    const isActualPaidEmpty = actualPaidAmount.trim() === '';
    const paymentRemainingDiff =
        !isActualPaidEmpty && finalVal != null
            ? scaleSettlementMoney(parsedActualPaidAmount - finalVal)
            : null;
    const isPaidMatching = paymentRemainingDiff != null && Math.abs(paymentRemainingDiff) < 0.5;
    const paidDiff = paymentRemainingDiff ?? 0;
    const paidDiffStatus = isPaidMatching
        ? { type: 'MATCHED' as const, label: 'Khớp 100% với số tiền sau chênh lệch' }
        : paidDiff > 0
        ? { type: 'OVERPAID' as const, label: 'Trả thừa so với số tiền cần thanh toán' }
        : { type: 'UNDERPAID' as const, label: 'Trả thiếu so với số tiền cần thanh toán' };

    const shouldAutoCreatePaymentDiffAdjustment =
        hasAllRequiredInputs
        && !isActualPaidEmpty
        && paymentRemainingDiff != null
        && paymentRemainingDiff !== 0;

    useEffect(() => {
        if (!shouldAutoCreatePaymentDiffAdjustment || paymentRemainingDiff == null) {
            setAdditionalCostRows((rows) => {
                if (!rows.some((row) => row.isAutoPaymentDifference)) {
                    return rows;
                }
                return rows.filter((row) => !row.isAutoPaymentDifference);
            });
            return;
        }
        const amountStr = formatSignedWithDots(paymentRemainingDiff);
        setAdditionalCostRows((rows) => {
            const existing = rows.find((row) => row.isAutoPaymentDifference);
            if (existing) {
                if (
                    existing.additionalCost === amountStr
                    && existing.additionalCostType === 'OTHER'
                ) {
                    return rows;
                }
                return rows.map((row) =>
                    row.isAutoPaymentDifference
                        ? {
                            ...row,
                            additionalCost: amountStr,
                            additionalCostType: 'OTHER',
                            additionalCostReason: row.additionalCostReason.trim() || AUTO_PAYMENT_DIFF_REASON,
                        }
                        : row
                );
            }
            return [
                ...rows,
                {
                    key: AUTO_PAYMENT_DIFF_KEY,
                    additionalCost: amountStr,
                    additionalCostType: 'OTHER',
                    additionalCostReason: AUTO_PAYMENT_DIFF_REASON,
                    additionalCostCustomName: '',
                    isAutoPaymentDifference: true,
                },
            ];
        });
    }, [shouldAutoCreatePaymentDiffAdjustment, paymentRemainingDiff]);

    const handleAddAdditionalCostRow = () => {
        setAdditionalCostRows((prev) => [...prev, createAdditionalCostRow()]);
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

    const differenceTone =
        !hasAllRequiredInputs || Math.abs(differenceAmount) < 0.5
            ? { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Không đổi', icon: <TrendingFlatOutlinedIcon sx={{ fontSize: '1rem' }} /> }
            : differenceAmount > 0
                ? { bg: '#fff1f2', border: '#fecdd3', color: '#be123c', label: 'Tăng phải trả', icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1rem' }} /> }
                : { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'Giảm phải trả', icon: <TrendingDownOutlinedIcon sx={{ fontSize: '1rem' }} /> };

    const isImportMatching =
        !isImportQtyEmpty && !isUnitPriceEmpty && parsedImportQty === systemImportQty && calculatedImportVal === systemImportVal;
    const isReturnMatching =
        !isReturnQtyEmpty && !isUnitPriceEmpty && parsedReturnQty === systemReturnQty && calculatedReturnVal === systemReturnVal;
    const hasReceipt = Boolean(receiptUrl && receiptUrl.trim());

    const canSubmit =
        hasAllRequiredInputs
        && !isActualPaidEmpty
        && hasReceipt
        && hasAllImportEvidence
        && !hasIncompleteAdditionalCost
        && !isUploadingReceipt
        && !isUploadingImportReceipt
        && !isUploadingTicketListImages
        && !isSubmitting;

    const handleUploadFile = async (file: File): Promise<string> => {
        if (!settlement?.id) {
            AppToast.error('Không tìm thấy thông tin kỳ đối soát.');
            throw new Error('Không tìm thấy kỳ đối soát');
        }

        try {
            setIsUploadingReceipt(true);
            const uploadedUrl = await uploadAdminImage(file);
            setReceiptUrl(uploadedUrl);
            const res = await updateSupplierSettlementReceiptUrl(settlement.id, uploadedUrl);
            if (res.success) {
                AppToast.success('Đã tải lên và lưu ảnh biên lai đối soát NCC.');
                onReceiptUploaded?.();
                return uploadedUrl;
            } else {
                AppToast.error(res.message || 'Lưu ảnh biên lai thất bại.');
                throw new Error(res.message || 'Failed');
            }
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải ảnh lên máy chủ.'
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
        if (file && file.type.startsWith('image/')) {
            void handleUploadFile(file);
        } else if (file) {
            AppToast.warning('Vui lòng chọn đúng định dạng hình ảnh (PNG, JPG, JPEG, WEBP).');
        }
    };

    const handleDeleteReceipt = async () => {
        if (!settlement?.id) return;
        try {
            setIsUploadingReceipt(true);
            const res = await updateSupplierSettlementReceiptUrl(settlement.id, '');
            if (res.success) {
                setReceiptUrl('');
                AppToast.success('Đã gỡ ảnh biên lai đối soát.');
                onReceiptUploaded?.();
            } else {
                AppToast.error(res.message || 'Gỡ ảnh biên lai thất bại.');
            }
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi gỡ biên lai.');
        } finally {
            setIsUploadingReceipt(false);
        }
    };

    const handleUploadImportReceipt = async (file: File): Promise<string> => {
        if (!selectedImport?.id) {
            AppToast.error('Không tìm thấy phiếu nhập lô để đính kèm biên lai.');
            throw new Error('Không tìm thấy phiếu nhập lô');
        }
        if (!file.type.startsWith('image/')) {
            AppToast.warning('Vui lòng chọn đúng định dạng hình ảnh (PNG, JPG, JPEG, WEBP).');
            throw new Error('Sai định dạng hình ảnh');
        }

        try {
            setIsUploadingImportReceipt(true);
            const uploadedUrl = await uploadAdminImage(file);
            const res = await attachImportBatchInvoiceEvidence(selectedImport.id, uploadedUrl);
            if (res.success) {
                setLocalImportReceiptById((prev) => ({
                    ...prev,
                    [selectedImport.id]: uploadedUrl,
                }));
                AppToast.success(
                    `Đã tải lên biên lai phiếu nhập ${selectedImport.batchCode || `#${selectedImport.id}`}.`
                );
                onReceiptUploaded?.();
                return uploadedUrl;
            } else {
                AppToast.error(res.message || 'Lưu ảnh biên lai phiếu nhập thất bại.');
                throw new Error(res.message || 'Failed');
            }
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải ảnh biên lai phiếu nhập.'
            );
            throw err;
        } finally {
            setIsUploadingImportReceipt(false);
        }
    };

    const handleImportReceiptInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            void handleUploadImportReceipt(file);
        }
        e.target.value = '';
    };

    const handleImportReceiptDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingImportReceipt(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            void handleUploadImportReceipt(file);
        }
    };

    const handleDeleteImportReceipt = async () => {
        if (!selectedImport?.id) return;
        try {
            setIsUploadingImportReceipt(true);
            const res = await attachImportBatchInvoiceEvidence(selectedImport.id, '');
            if (res.success) {
                setLocalImportReceiptById((prev) => ({
                    ...prev,
                    [selectedImport.id]: '',
                }));
                AppToast.success(
                    `Đã gỡ ảnh biên lai phiếu nhập ${selectedImport.batchCode || `#${selectedImport.id}`}.`
                );
                onReceiptUploaded?.();
            } else {
                AppToast.error(res.message || 'Gỡ ảnh biên lai phiếu nhập thất bại.');
            }
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi gỡ ảnh biên lai phiếu nhập.');
        } finally {
            setIsUploadingImportReceipt(false);
        }
    };

    const handleUpdateTicketListImages = async (newUrls: string[]) => {
        if (!selectedImport?.id) {
            AppToast.error('Không tìm thấy phiếu nhập lô.');
            return;
        }
        try {
            setIsUploadingTicketListImages(true);
            const res = await attachTicketListImages(selectedImport.id, newUrls);
            if (res.success) {
                setLocalTicketListImagesById((prev) => ({
                    ...prev,
                    [selectedImport.id]: newUrls,
                }));
                AppToast.success(
                    `Đã cập nhật ảnh danh sách vé cho phiếu nhập ${selectedImport.batchCode || `#${selectedImport.id}`}.`
                );
                onReceiptUploaded?.();
            } else {
                AppToast.error(res.message || 'Lưu ảnh danh sách vé thất bại.');
            }
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu ảnh danh sách vé nhập.'
            );
        } finally {
            setIsUploadingTicketListImages(false);
        }
    };

    const handleUploadTicketListFiles = async (files: File[]) => {
        if (!selectedImport?.id || files.length === 0) return;
        try {
            setIsUploadingTicketListImages(true);
            const uploadPromises = files.map((file) => uploadAdminImage(file));
            const newUploadedUrls = await Promise.all(uploadPromises);
            const currentList = selectedImportTicketListImages;
            await handleUpdateTicketListImages([...currentList, ...newUploadedUrls]);
        } catch (err: any) {
            AppToast.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải ảnh danh sách vé.');
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

    const submitMatching = () => {
        const additionalCosts = additionalCostRows
            .map((row) => ({
                additionalCost: parseSignedFromDots(row.additionalCost),
                additionalCostType: row.additionalCostType,
                additionalCostReason: row.additionalCostReason.trim(),
                additionalCostCustomName:
                    row.additionalCostType === 'OTHER' ? row.additionalCostCustomName.trim() : undefined,
                autoGenerated: Boolean(row.isAutoPaymentDifference),
            }))
            .filter((row) => row.additionalCost !== 0 && row.additionalCostReason.length > 0);
        onConfirm({
            actualTicketImportQuantity: Math.round(parsedImportQty),
            actualTicketImportValue: calculatedImportVal,
            actualReturnTicketQuantity: Math.round(parsedReturnQty),
            actualReturnTicketValue: calculatedReturnVal,
            reconciledTicketUnitPrice: parsedUnitPrice,
            reconciliationNote: note.trim() || undefined,
            actualPaidAmount: parsedActualPaidAmount,
            additionalCosts,
        });
    };

    const handleSubmit = () => {
        if (!hasAllRequiredInputs) {
            AppToast.warning('Vui lòng nhập đầy đủ các trường số lượng và giá vé thực tế.');
            return;
        }
        if (!hasReceipt) {
            AppToast.warning('Vui lòng tải lên ảnh biên lai đối soát của Nhà cung cấp trước khi xác nhận.');
            return;
        }
        if (!hasAllImportReceipts) {
            AppToast.warning('Vui lòng tải lên ảnh biên lai phiếu nhập lô trước khi xác nhận đối chiếu.');
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
            if (autoPaymentDiffRow && !autoPaymentDiffRow.additionalCostCustomName.trim()) {
                AppToast.warning('Vui lòng nhập tên khoản chi phí phát sinh ngoài kỳ trước khi xác nhận đối chiếu.');
                return;
            }
            AppToast.warning('Vui lòng nhập đủ số tiền, loại và lý do cho mỗi chi phí phát sinh, hoặc xóa dòng trống dở.');
            return;
        }
        if (isActualPaidEmpty) {
            AppToast.warning('Vui lòng nhập Giá trị thực trả từ biên lai.');
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

{/* ═══ ROW 1: Ảnh chứng từ & Biên lai đối soát (Trái) | Tổng kết quyết toán tài chính (Phải) ═══ */}
            <Grid container spacing={2.5} alignItems="stretch" sx={{ mb: 2.5 }}>
                {/* Left: Section 1 */}
                <Grid size={{ xs: 12, lg: 7.5 }}>
                    {/* Section 1: Chứng từ & Biên lai đối chiếu */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: '16px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff',
                            height: '100%',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ReceiptLongOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.2rem' }} />
                                1. Ảnh chứng từ & Biên lai đối soát
                            </Typography>
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
                                Đối chiếu ảnh 2 cột
                            </Button>
                        </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Column 1: Biên lai phiếu nhập lô (Bắt buộc) */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: '14px',
                            borderColor: hasAllImportReceipts ? '#bbf7d0' : '#fed7aa',
                            bgcolor: hasAllImportReceipts ? '#f0fdf41a' : '#fffaf5',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                            <Stack direction="row" spacing={1.2} alignItems="center">
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        bgcolor: hasAllImportReceipts ? '#dcfce7' : '#ffedd5',
                                        color: hasAllImportReceipts ? '#16a34a' : '#ea580c',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <ReceiptLongOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                </Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                    Biên lai phiếu nhập lô ({importBatches.length}) <Box component="span" sx={{ color: '#ef4444' }}>*</Box>
                                </Typography>
                            </Stack>
                            {importBatches.length > 1 ? (
                                hasAllImportReceipts ? (
                                    <Chip
                                        size="small"
                                        icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.95rem', color: '#16a34a' }} />}
                                        label={`Đã đính kèm (${uploadedImportReceiptCount}/${importBatches.length})`}
                                        sx={{
                                            bgcolor: '#f0fdf4',
                                            color: '#16a34a',
                                            fontWeight: 700,
                                            fontSize: '0.725rem',
                                            border: '1px solid #bbf7d0',
                                        }}
                                    />
                                ) : (
                                    <Chip
                                        size="small"
                                        icon={<WarningAmberOutlinedIcon style={{ fontSize: '0.95rem', color: '#dc2626' }} />}
                                        label={`Chưa đủ (${uploadedImportReceiptCount}/${importBatches.length} phiếu)`}
                                        sx={{
                                            bgcolor: '#fef2f2',
                                            color: '#dc2626',
                                            fontWeight: 700,
                                            fontSize: '0.725rem',
                                            border: '1px solid #fecaca',
                                        }}
                                    />
                                )
                            ) : hasImportReceipt ? (
                                <Chip
                                    size="small"
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.95rem', color: '#16a34a' }} />}
                                    label="Đã đính kèm"
                                    sx={{
                                        bgcolor: '#f0fdf4',
                                        color: '#16a34a',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #bbf7d0',
                                    }}
                                />
                            ) : (
                                <Chip
                                    size="small"
                                    icon={<WarningAmberOutlinedIcon style={{ fontSize: '0.95rem', color: '#dc2626' }} />}
                                    label="Chưa có (Bắt buộc)"
                                    sx={{
                                        bgcolor: '#fef2f2',
                                        color: '#dc2626',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fecaca',
                                    }}
                                />
                            )}
                        </Stack>

                        <Typography variant="caption" color="#64748b" sx={{ mb: 1, display: 'block' }}>
                            Tải lên ảnh biên lai phiếu nhập để đối chiếu chéo số liệu
                        </Typography>

                        {/* Batch toggle if more than 1 import batch */}
                        {importBatches.length > 1 && (
                            <Box sx={{ mb: 1.5 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                                    <Typography variant="caption" color="#475569" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                                        Danh sách phiếu nhập lô ({uploadedImportReceiptCount}/{importBatches.length} đã có ảnh):
                                    </Typography>
                                </Stack>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        p: '4px',
                                        bgcolor: '#f1f5f9',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        overflowX: 'auto',
                                        scrollbarWidth: 'none', // Firefox
                                        '&::-webkit-scrollbar': { display: 'none' }, // Chrome, Safari
                                    }}
                                >
                                    {importBatches.map((batch, index) => {
                                        const isSel = batch.id === selectedImportId;
                                        const batchHasImg = Boolean(String(importBatchReceiptUrl(batch)).trim());
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
                                                            {batchHasImg ? '✓ Đã đính kèm ảnh' : '⚠️ Chưa có ảnh'}
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
                                    bgcolor: '#ffffff',
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

                                {hasImportReceipt ? (
                                    <Chip
                                        size="small"
                                        icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.8rem', color: '#16a34a' }} />}
                                        label="Đã có ảnh"
                                        sx={{
                                            height: 22,
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            bgcolor: '#f0fdf4',
                                            color: '#16a34a',
                                            border: '1px solid #bbf7d0',
                                        }}
                                    />
                                ) : (
                                    <Chip
                                        size="small"
                                        icon={<WarningAmberOutlinedIcon style={{ fontSize: '0.8rem', color: '#dc2626' }} />}
                                        label="Chưa có ảnh"
                                        sx={{
                                            height: 22,
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            bgcolor: '#fef2f2',
                                            color: '#dc2626',
                                            border: '1px solid #fecaca',
                                        }}
                                    />
                                )}
                            </Box>
                        )}

                        {/* Hidden File Input */}
                        <input
                            ref={importReceiptInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleImportReceiptInputChange}
                        />

                        {/* Image view box or Upload Dropzone */}
                        {hasImportReceipt ? (
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    height: 180,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid #cbd5e1',
                                    bgcolor: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mt: 'auto',
                                }}
                            >
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
                                    onClick={() => handleZoom(selectedImportReceiptUrl, `Biên lai phiếu nhập · ${selectedImport?.batchCode || selectedImport?.id}`)}
                                />
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
                                        onClick={() => handleZoom(selectedImportReceiptUrl, `Biên lai phiếu nhập · ${selectedImport?.batchCode || selectedImport?.id}`)}
                                        sx={{ color: '#ffffff', p: 0.5 }}
                                        title="Xem ảnh lớn"
                                    >
                                        <ZoomInIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        disabled={isUploadingImportReceipt}
                                        onClick={() => importReceiptInputRef.current?.click()}
                                        sx={{ color: '#ffffff', p: 0.5 }}
                                        title="Thay ảnh khác"
                                    >
                                        <CloudUploadIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        disabled={isUploadingImportReceipt}
                                        onClick={handleDeleteImportReceipt}
                                        sx={{ color: '#f87171', p: 0.5 }}
                                        title="Gỡ ảnh này"
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
                                onDrop={handleImportReceiptDrop}
                                onClick={() => !isUploadingImportReceipt && selectedImport?.id && importReceiptInputRef.current?.click()}
                                sx={{
                                    width: '100%',
                                    height: 180,
                                    borderRadius: '12px',
                                    border: '2px dashed',
                                    borderColor: isDraggingImportReceipt ? '#FF3030' : '#cbd5e1',
                                    bgcolor: isDraggingImportReceipt ? '#fff5f5' : '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    cursor: isUploadingImportReceipt || !selectedImport?.id ? 'default' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    mt: 'auto',
                                    p: 2,
                                    '&:hover': {
                                        borderColor: isUploadingImportReceipt ? '#cbd5e1' : '#FF3030',
                                        bgcolor: isUploadingImportReceipt ? '#ffffff' : '#fffaf5',
                                    },
                                }}
                            >
                                {isUploadingImportReceipt ? (
                                    <Stack spacing={1} alignItems="center" justifyContent="center">
                                        <CircularProgress size={28} sx={{ color: '#FF3030' }} />
                                        <Typography variant="caption" fontWeight={700} color="#0f172a">
                                            Đang lưu ảnh biên lai phiếu nhập...
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Stack spacing={0.75} alignItems="center" justifyContent="center">
                                        <CloudUploadIcon sx={{ fontSize: '1.8rem', color: '#64748b' }} />
                                        <Typography variant="caption" fontWeight={700} color="#0f172a">
                                            Kéo thả hoặc{' '}
                                            <Box component="span" sx={{ color: '#FF3030', textDecoration: 'underline' }}>
                                                chọn tệp biên lai
                                            </Box>
                                        </Typography>
                                        <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.7rem' }}>
                                            PNG, JPG, JPEG (Tối đa 10MB) · Bắt buộc
                                        </Typography>
                                    </Stack>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Column 2: Biên lai đối soát từ NCC (Bắt buộc) */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: '14px',
                            borderColor: hasReceipt ? '#bbf7d0' : '#fed7aa',
                            bgcolor: hasReceipt ? '#f0fdf41a' : '#fffaf5',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
                            <Stack direction="row" spacing={1.2} alignItems="center">
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        bgcolor: hasReceipt ? '#dcfce7' : '#ffedd5',
                                        color: hasReceipt ? '#16a34a' : '#ea580c',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <CloudUploadIcon sx={{ fontSize: '1.15rem' }} />
                                </Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                    Biên lai đối soát từ NCC <Box component="span" sx={{ color: '#ef4444' }}>*</Box>
                                </Typography>
                            </Stack>
                            {hasReceipt ? (
                                <Chip
                                    size="small"
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.95rem', color: '#16a34a' }} />}
                                    label="Đã đính kèm"
                                    sx={{
                                        bgcolor: '#f0fdf4',
                                        color: '#16a34a',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #bbf7d0',
                                    }}
                                />
                            ) : (
                                <Chip
                                    size="small"
                                    icon={<WarningAmberOutlinedIcon style={{ fontSize: '0.95rem', color: '#dc2626' }} />}
                                    label="Chưa có (Bắt buộc)"
                                    sx={{
                                        bgcolor: '#fef2f2',
                                        color: '#dc2626',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fecaca',
                                    }}
                                />
                            )}
                        </Stack>

                        <Typography variant="caption" color="#64748b" sx={{ mb: 1, display: 'block' }}>
                            Tải lên ảnh biên lai / bảng kê NCC để đối chiếu chéo số liệu
                        </Typography>

                        {/* Hidden File Input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleFileInputChange}
                        />

                        {hasReceipt ? (
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: '100%',
                                    height: 180,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid #cbd5e1',
                                    bgcolor: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mt: 'auto',
                                }}
                            >
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
                                    onClick={() => handleZoom(receiptUrl, `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`)}
                                />
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
                                        onClick={() => handleZoom(receiptUrl, `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`)}
                                        sx={{ color: '#ffffff', p: 0.5 }}
                                        title="Xem ảnh lớn"
                                    >
                                        <ZoomInIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        disabled={isUploadingReceipt}
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{ color: '#ffffff', p: 0.5 }}
                                        title="Thay ảnh khác"
                                    >
                                        <CloudUploadIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        disabled={isUploadingReceipt}
                                        onClick={handleDeleteReceipt}
                                        sx={{ color: '#f87171', p: 0.5 }}
                                        title="Gỡ ảnh này"
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
                                    height: 180,
                                    borderRadius: '12px',
                                    border: '2px dashed',
                                    borderColor: isDragging ? '#FF3030' : '#cbd5e1',
                                    bgcolor: isDragging ? '#fff5f5' : '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    cursor: isUploadingReceipt ? 'default' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    mt: 'auto',
                                    p: 2,
                                    '&:hover': {
                                        borderColor: isUploadingReceipt ? '#cbd5e1' : '#FF3030',
                                        bgcolor: isUploadingReceipt ? '#ffffff' : '#fffaf5',
                                    },
                                }}
                            >
                                {isUploadingReceipt ? (
                                    <Stack spacing={1} alignItems="center" justifyContent="center">
                                        <CircularProgress size={28} sx={{ color: '#FF3030' }} />
                                        <Typography variant="caption" fontWeight={700} color="#0f172a">
                                            Đang lưu ảnh biên lai...
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Stack spacing={0.75} alignItems="center" justifyContent="center">
                                        <CloudUploadIcon sx={{ fontSize: '1.8rem', color: '#64748b' }} />
                                        <Typography variant="caption" fontWeight={700} color="#0f172a">
                                            Kéo thả hoặc{' '}
                                            <Box component="span" sx={{ color: '#FF3030', textDecoration: 'underline' }}>
                                                chọn tệp biên lai
                                            </Box>
                                        </Typography>
                                        <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.7rem' }}>
                                            PNG, JPG, JPEG (Tối đa 10MB) · Bắt buộc
                                        </Typography>
                                    </Stack>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Paper>
    </Grid>

                {/* Right: Card 1: Tổng kết quyết toán tài chính */}
                <Grid size={{ xs: 12, lg: 4.5 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: '16px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
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
                                    <CalculateOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                </Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                    Tổng kết quyết toán
                                </Typography>
                            </Stack>
                            <Chip
                                size="small"
                                label={liveDiscrepancyTypes.length === 0 ? 'Khớp dữ liệu' : `${liveDiscrepancyTypes.length} mục sai lệch`}
                                color={liveDiscrepancyTypes.length === 0 ? 'success' : 'warning'}
                                sx={{ fontWeight: 800, fontSize: '0.725rem', height: 22 }}
                            />
                        </Stack>

                        {/* Metrics Stack */}
                        <Stack spacing={1.5} sx={{ flex: 1 }}>
                            {/* Metric 1: Tạm tính ban đầu */}
                            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', mb: 0.25 }}>
                                    Tạm tính ban đầu
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.1rem' }}>
                                    {initialEstimatedVal != null
                                        ? <>{formatSettlementMoney(initialEstimatedVal)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>VNĐ</span></>
                                        : '—'}
                                </Typography>
                                <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.7rem' }}>
                                    Giá vốn sau HH × (SL nhập HT − SL trả HT)
                                </Typography>
                            </Box>

                            {/* Metric 2: Sau chênh lệch (Thực tế) */}
                            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                <Typography variant="caption" color="#1e40af" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', mb: 0.25 }}>
                                    Sau chênh lệch (Thực tế)
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="#1d4ed8" sx={{ fontSize: '1.25rem' }}>
                                    {finalVal != null
                                        ? <>{formatSettlementMoney(finalVal)} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa' }}>VNĐ</span></>
                                        : '—'}
                                </Typography>
                                <Typography variant="caption" color="#3b82f6" sx={{ fontSize: '0.7rem' }}>
                                    Tính từ SL nhập/trả thực tế, giá vé & chi phí phát sinh
                                </Typography>
                            </Box>

                            {/* Metric 3: Tiền chênh lệch */}
                            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: differenceTone.bg, border: `1px solid ${differenceTone.border}` }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
                                    <Typography variant="caption" fontWeight={700} color={differenceTone.color} sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                        Tiền chênh lệch
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={differenceTone.label}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.675rem',
                                            fontWeight: 800,
                                            bgcolor: '#ffffff',
                                            color: differenceTone.color,
                                            border: `1px solid ${differenceTone.border}`,
                                        }}
                                    />
                                </Stack>
                                <Typography variant="h6" fontWeight={800} color={differenceTone.color} sx={{ fontSize: '1.15rem' }}>
                                    {hasAllRequiredInputs
                                        ? <>{differenceAmount > 0 ? `+${formatSettlementMoney(differenceAmount)}` : formatSettlementMoney(differenceAmount)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>VNĐ</span></>
                                        : <>{formatSettlementMoney(0)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>VNĐ</span></>}
                                </Typography>
                            </Box>

                            {/* Discrepancy Chips */}
                            {liveDiscrepancyTypes.length > 0 && (
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
                                    {liveDiscrepancyTypes.map((type) => {
                                        if (type === 'IMPORT_UNIT_PRICE') {
                                            const isPos = unitPriceDiff > 0;
                                            return (
                                                <Chip
                                                    key={type}
                                                    size="small"
                                                    icon={isPos ? <TrendingUpOutlinedIcon style={{ fontSize: '0.8rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.8rem', color: '#b45309' }} />}
                                                    label={isPos ? `Tăng giá (+${formatSettlementMoney(unitPriceDiff)}đ)` : `Giảm giá (${formatSettlementMoney(unitPriceDiff)}đ)`}
                                                    sx={{
                                                        bgcolor: '#ffffff',
                                                        color: isPos ? '#be123c' : '#b45309',
                                                        fontWeight: 800,
                                                        fontSize: '0.7rem',
                                                        height: 24,
                                                        border: `1px solid ${isPos ? '#fecdd3' : '#fde68a'}`,
                                                    }}
                                                />
                                            );
                                        }
                                        if (type === 'IMPORT_QUANTITY') {
                                            const isPos = importQtyDiff > 0;
                                            return (
                                                <Chip
                                                    key={type}
                                                    size="small"
                                                    icon={isPos ? <TrendingUpOutlinedIcon style={{ fontSize: '0.8rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.8rem', color: '#b45309' }} />}
                                                    label={isPos ? `Thiếu nhập (+${importQtyDiff.toLocaleString('vi-VN')} vé)` : `Thừa nhập (${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                                    sx={{
                                                        bgcolor: '#ffffff',
                                                        color: isPos ? '#be123c' : '#b45309',
                                                        fontWeight: 800,
                                                        fontSize: '0.7rem',
                                                        height: 24,
                                                        border: `1px solid ${isPos ? '#fecdd3' : '#fde68a'}`,
                                                    }}
                                                />
                                            );
                                        }
                                        if (type === 'RETURN_QUANTITY') {
                                            const isPos = returnQtyDiff > 0;
                                            return (
                                                <Chip
                                                    key={type}
                                                    size="small"
                                                    icon={isPos ? <TrendingUpOutlinedIcon style={{ fontSize: '0.8rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.8rem', color: '#b45309' }} />}
                                                    label={isPos ? `Thiếu trả (+${returnQtyDiff.toLocaleString('vi-VN')} vé)` : `Thừa trả (${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                                    sx={{
                                                        bgcolor: '#ffffff',
                                                        color: isPos ? '#be123c' : '#b45309',
                                                        fontWeight: 800,
                                                        fontSize: '0.7rem',
                                                        height: 24,
                                                        border: `1px solid ${isPos ? '#fecdd3' : '#fde68a'}`,
                                                    }}
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </Stack>
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* ═══ ROW 2: Đối chiếu số lượng Nhập & Trả vé (Trái) | Số tiền biên lai NCC & Ghi chú (Phải) ═══ */}
            <Grid container spacing={2.5} alignItems="stretch" sx={{ mb: 2.5 }}>
                {/* Left: Section 2 */}
                <Grid size={{ xs: 12, lg: 7.5 }}>
                    {/* Section 2: Đối chiếu số lượng Nhập & Trả vé */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: '16px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff',
                            height: '100%',
                        }}
                    >
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CompareArrowsOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.2rem' }} />
                            2. Đối chiếu số lượng Nhập & Trả vé
                        </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Column 1: Nhập vé */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: '14px',
                            borderColor: isImportMatching ? '#e2e8f0' : importQtyDiff > 0 ? '#fecdd3' : '#fde68a',
                            bgcolor: isImportMatching ? '#ffffff' : importQtyDiff > 0 ? '#fffbfc' : '#fffdfa',
                            transition: 'all 0.2s ease',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
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
                            {isImportMatching ? (
                                <Chip
                                    size="small"
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.95rem', color: '#16a34a' }} />}
                                    label="Khớp hệ thống"
                                    sx={{
                                        bgcolor: '#f0fdf4',
                                        color: '#16a34a',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #bbf7d0',
                                    }}
                                />
                            ) : importQtyDiff > 0 ? (
                                <Chip
                                    size="small"
                                    icon={<TrendingUpOutlinedIcon style={{ fontSize: '0.95rem', color: '#be123c' }} />}
                                    label={`Thừa nhập (+${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                    sx={{
                                        bgcolor: '#fff1f2',
                                        color: '#be123c',
                                        fontWeight: 800,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fecdd3',
                                    }}
                                />
                            ) : (
                                <Chip
                                    size="small"
                                    icon={<TrendingDownOutlinedIcon style={{ fontSize: '0.95rem', color: '#b45309' }} />}
                                    label={`Thiếu nhập (${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                    sx={{
                                        bgcolor: '#fffbeb',
                                        color: '#b45309',
                                        fontWeight: 800,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fde68a',
                                    }}
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
                                mb: 2.5,
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
                            const isPositive = importQtyDiff > 0 || (importQtyDiff === 0 && importValDiff > 0);
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
                                    icon: <CheckCircleOutlinedIcon sx={{ fontSize: '1.15rem', color: '#16a34a' }} />,
                                }
                                : isPositive
                                ? {
                                    bg: '#fff1f2',
                                    border: '#fecdd3',
                                    textColor: '#be123c',
                                    subColor: '#9f1239',
                                    badgeBg: '#ffe4e6',
                                    badgeColor: '#be123c',
                                    badgeBorder: '#fecdd3',
                                    badgeText: 'Thừa nhập (+)',
                                    icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1.2rem', color: '#be123c' }} />,
                                }
                                : {
                                    bg: '#fffbeb',
                                    border: '#fde68a',
                                    textColor: '#b45309',
                                    subColor: '#92400e',
                                    badgeBg: '#fef3c7',
                                    badgeColor: '#b45309',
                                    badgeBorder: '#fde68a',
                                    badgeText: 'Thiếu nhập (-)',
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
                                        mb: 2.5,
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
                                        <Chip
                                            size="small"
                                            label={theme.badgeText}
                                            sx={{
                                                bgcolor: theme.badgeBg,
                                                color: theme.badgeColor,
                                                border: `1px solid ${theme.badgeBorder}`,
                                                fontWeight: 800,
                                                fontSize: '0.725rem',
                                                height: 22,
                                            }}
                                        />
                                    </Stack>
                                    <Typography variant="body2" fontWeight={800} color={theme.textColor} sx={{ fontSize: '0.925rem' }}>
                                        {isMatching ? (
                                            '0 vé (0 VNĐ)'
                                        ) : (
                                            <>
                                                {importQtyDiff > 0 ? `+${importQtyDiff.toLocaleString('vi-VN')}` : `${importQtyDiff.toLocaleString('vi-VN')}`} vé
                                                {' ('}
                                                {importValDiff > 0 ? `+${formatImportCost(importValDiff)}` : `${formatImportCost(importValDiff)}`} VNĐ
                                                {')'}
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
                                        setImportQty(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '');
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
                    <Stack spacing={1.25} sx={{ height: '100%' }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: '14px',
                            borderColor: isReturnLocked
                                ? '#e2e8f0'
                                : isReturnMatching
                                  ? '#e2e8f0'
                                  : returnQtyDiff > 0
                                    ? '#fecdd3'
                                    : '#fde68a',
                            bgcolor: isReturnLocked
                                ? '#f8fafc'
                                : isReturnMatching
                                  ? '#ffffff'
                                  : returnQtyDiff > 0
                                    ? '#fffbfc'
                                    : '#fffdfa',
                            transition: 'all 0.2s ease',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            opacity: isReturnLocked ? 0.62 : 1,
                            pointerEvents: isReturnLocked ? 'none' : 'auto',
                            userSelect: isReturnLocked ? 'none' : 'auto',
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={1.2} alignItems="center">
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        bgcolor: isReturnLocked ? '#f1f5f9' : '#fff7ed',
                                        color: isReturnLocked ? '#64748b' : '#ea580c',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {isReturnLocked ? (
                                        <LockOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                    ) : (
                                        <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                    )}
                                </Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                                    Số liệu Trả vé
                                </Typography>
                            </Stack>
                            {isReturnLocked ? (
                                <Chip
                                    size="small"
                                    icon={<LockOutlinedIcon style={{ fontSize: '0.95rem', color: '#64748b' }} />}
                                    label="Chưa bàn giao"
                                    sx={{
                                        bgcolor: '#f1f5f9',
                                        color: '#475569',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #e2e8f0',
                                    }}
                                />
                            ) : isReturnMatching ? (
                                <Chip
                                    size="small"
                                    icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.95rem', color: '#16a34a' }} />}
                                    label="Khớp hệ thống"
                                    sx={{
                                        bgcolor: '#f0fdf4',
                                        color: '#16a34a',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #bbf7d0',
                                    }}
                                />
                            ) : returnQtyDiff > 0 ? (
                                <Chip
                                    size="small"
                                    icon={<TrendingUpOutlinedIcon style={{ fontSize: '0.95rem', color: '#be123c' }} />}
                                    label={`Thừa trả (+${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                    sx={{
                                        bgcolor: '#fff1f2',
                                        color: '#be123c',
                                        fontWeight: 800,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fecdd3',
                                    }}
                                />
                            ) : (
                                <Chip
                                    size="small"
                                    icon={<TrendingDownOutlinedIcon style={{ fontSize: '0.95rem', color: '#b45309' }} />}
                                    label={`Thiếu trả (${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                    sx={{
                                        bgcolor: '#fffbeb',
                                        color: '#b45309',
                                        fontWeight: 800,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fde68a',
                                    }}
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
                                mb: 2.5,
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

                        {/* Chênh lệch Trả vé indicator */}
                        {(() => {
                            const isMatching = isReturnMatching;
                            const isPositive = returnQtyDiff > 0 || (returnQtyDiff === 0 && returnValDiff > 0);
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
                                    icon: <CheckCircleOutlinedIcon sx={{ fontSize: '1.15rem', color: '#16a34a' }} />,
                                }
                                : isPositive
                                ? {
                                    bg: '#fff1f2',
                                    border: '#fecdd3',
                                    textColor: '#be123c',
                                    subColor: '#9f1239',
                                    badgeBg: '#ffe4e6',
                                    badgeColor: '#be123c',
                                    badgeBorder: '#fecdd3',
                                    badgeText: 'Thừa trả (+)',
                                    icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1.2rem', color: '#be123c' }} />,
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
                                        mb: 2.5,
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
                                        <Chip
                                            size="small"
                                            label={theme.badgeText}
                                            sx={{
                                                bgcolor: theme.badgeBg,
                                                color: theme.badgeColor,
                                                border: `1px solid ${theme.badgeBorder}`,
                                                fontWeight: 800,
                                                fontSize: '0.725rem',
                                                height: 22,
                                            }}
                                        />
                                    </Stack>
                                    <Typography variant="body2" fontWeight={800} color={theme.textColor} sx={{ fontSize: '0.925rem' }}>
                                        {isMatching ? (
                                            '0 vé (0 VNĐ)'
                                        ) : (
                                            <>
                                                {returnQtyDiff > 0 ? `+${returnQtyDiff.toLocaleString('vi-VN')}` : `${returnQtyDiff.toLocaleString('vi-VN')}`} vé
                                                {' ('}
                                                {returnValDiff > 0 ? `+${formatImportCost(returnValDiff)}` : `${formatImportCost(returnValDiff)}`} VNĐ
                                                {')'}
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
                                    disabled={isReturnLocked}
                                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                    value={returnQty}
                                    error={!isReturnLocked && isReturnQtyEmpty}
                                    helperText={isReturnLocked ? 'Không thể nhập khi chưa bàn giao phiếu trả' : isReturnQtyEmpty ? 'Bắt buộc nhập số lượng' : undefined}
                                    onChange={(e) => {
                                        if (isReturnLocked) return;
                                        const raw = e.target.value.replace(/\D/g, '');
                                        setReturnQty(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '');
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
                                    label="Thực tế GT trả *"
                                    fullWidth
                                    size="small"
                                    type="text"
                                    disabled={isReturnLocked}
                                    value={formatImportCost(calculatedReturnVal)}
                                    helperText="Tự động tính (= SL trả × Giá vé)"
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
                    {isReturnLocked && (
                        <Alert
                            icon={<LockOutlinedIcon sx={{ color: '#64748b' }} />}
                            severity="warning"
                            sx={{
                                borderRadius: '10px',
                                bgcolor: '#fffbeb',
                                border: '1px solid #fde68a',
                                color: '#92400e',
                                '& .MuiAlert-message': {
                                    fontWeight: 600,
                                    fontSize: '0.8125rem',
                                },
                            }}
                        >
                            Số liệu trả vé chưa thể đối chiếu vì phiếu trả vé chưa hoàn tất bàn giao. Vui lòng hoàn tất bàn giao phiếu trả trước khi tiến hành đối chiếu.
                        </Alert>
                    )}
                    </Stack>
                </Grid>
            </Grid>
                    </Paper>
                </Grid>

                {/* Right: Số tiền biên lai NCC & Ghi chú đối chiếu */}
                <Grid size={{ xs: 12, lg: 4.5 }}>
                    <Stack spacing={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Card 2: Đối chiếu số tiền thực trả trên biên lai NCC */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                borderColor: '#e2e8f0',
                                bgcolor: '#ffffff',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.875rem', mb: 1 }}>
                                    Ghi chú đối chiếu
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    maxRows={3}
                                    size="small"
                                    value={note}
                                    placeholder="Nhập ghi chú hoặc diễn giải thêm (nếu có)..."
                                    onChange={(e) => setNote(e.target.value)}
                                    sx={{
                                        mb: 2,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            bgcolor: '#f8fafc',
                                        },
                                    }}
                                />
                            </Box>

                            <Tooltip
                                title={
                                    !hasAllRequiredInputs
                                        ? 'Vui lòng nhập đầy đủ các ô số liệu thực tế'
                                        : isActualPaidEmpty
                                        ? 'Vui lòng nhập Giá trị thực trả từ biên lai'
                                        : hasIncompleteAdditionalCost
                                        ? 'Vui lòng hoàn tất hoặc xóa các dòng chi phí phát sinh còn thiếu'
                                        : !hasAllImportReceipts
                                        ? 'Vui lòng tải lên ảnh biên lai phiếu nhập lô để tiếp tục'
                                        : !hasAllTicketListImages
                                        ? 'Vui lòng tải lên ảnh danh sách vé nhập của phiếu nhập lô để tiếp tục'
                                        : !hasReceipt
                                        ? 'Vui lòng tải lên ảnh biên lai NCC để tiếp tục'
                                        : isReturnLocked
                                        ? 'Phiếu trả chưa bàn giao / chưa kiểm tra. Bấm xác nhận để xem hộp thoại xác nhận.'
                                        : ''
                                }
                            >
                                <span>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        disabled={!canSubmit}
                                        onClick={handleSubmit}
                                        startIcon={!isSubmitting ? <CheckCircleOutlinedIcon /> : undefined}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 800,
                                            borderRadius: '12px',
                                            py: 1.25,
                                            fontSize: '0.95rem',
                                            bgcolor: '#FF3030',
                                            color: '#ffffff',
                                            boxShadow: '0 4px 14px rgba(255, 48, 48, 0.35)',
                                            '&:hover': { bgcolor: '#e02828' },
                                            ...(!canSubmit && {
                                                bgcolor: 'rgba(145, 158, 171, 0.24) !important',
                                                color: 'rgba(145, 158, 171, 0.8) !important',
                                                cursor: 'not-allowed !important',
                                                boxShadow: 'none !important',
                                                opacity: 0.6,
                                            }),
                                        }}
                                    >
                                        {isSubmitting ? 'Đang đối chiếu...' : 'Xác nhận đối chiếu'}
                                    </Button>
                                </span>
                            </Tooltip>
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>

            {/* ═══ ROW 3: Bảng giá vé theo từng nhà đài (Trái) | Chi phí ngoài kỳ (Phải) ═══ */}
            <Grid container spacing={2.5} alignItems="stretch">
                {/* Left: Section 3 */}
                <Grid size={{ xs: 12, lg: 7.5 }}>
                    {/* Section 3: Bảng giá vé theo từng nhà đài */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: '16px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <LocalOfferOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.2rem' }} />
                            3. Bảng giá vé theo từng nhà đài
                        </Typography>

                        <MatchingStationPricingTable
                            rows={pricingRows}
                            disabled={Boolean(isSubmitting)}
                            onWeightedChange={handleStationWeightedChange}
                            onStationsUpdated={onStationsUpdated}
                        />

                        {pricingRows.length === 0 && (
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label="Giá vé gốc hệ thống"
                                        fullWidth
                                        size="small"
                                        value={formatSettlementMoney(originalUnitPrice)}
                                        InputProps={{
                                            readOnly: true,
                                            endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight={700} color="#64748b">VNĐ/vé</Typography></InputAdornment>,
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f8fafc' } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label="Đơn giá đối soát thực tế (*)"
                                        fullWidth
                                        size="small"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(formatWholeNumberInput(e.target.value))}
                                        error={isUnitPriceEmpty}
                                        helperText={isUnitPriceEmpty ? 'Bắt buộc nhập đơn giá' : undefined}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight={700} color="#64748b">VNĐ/vé</Typography></InputAdornment>,
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#ffffff' }, '& input': { fontWeight: 700 } }}
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </Paper>
                </Grid>

                {/* Right: Section 4 */}
                <Grid size={{ xs: 12, lg: 4.5 }}>
                    {/* Section 4: Chi phí & Điều chỉnh phát sinh ngoài kỳ */}
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: '16px',
                            borderColor: '#e2e8f0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mb: 1.5 }}
                            flexWrap="wrap"
                            gap={1}
                        >
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
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                        4. Chi phí & Điều chỉnh ngoài kỳ
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.725rem' }}>
                                        Dương (+) = tăng phải trả · Âm (−) = giảm trừ.
                                    </Typography>
                                </Box>
                            </Stack>

                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddOutlinedIcon />}
                                onClick={handleAddAdditionalCostRow}
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    borderColor: '#cbd5e1',
                                    color: '#2563eb',
                                    py: 0.5,
                                    px: 1,
                                }}
                            >
                                Thêm khoản chi
                            </Button>
                        </Stack>

                        {additionalCostRows.length > 0 ? (
                            <TableContainer sx={{ flex: 1, borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1, minWidth: 120 }}>Loại chi phí</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1, minWidth: 110 }}>Số tiền (+ / −)</TableCell>
                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1, minWidth: 120 }}>Lý do / Tên</TableCell>
                                            <TableCell align="center" sx={{ width: 36, py: 1 }} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {additionalCostRows.map((row) => (
                                            <TableRow key={row.key} sx={{ bgcolor: row.isAutoPaymentDifference ? '#eff6ff33' : 'inherit' }}>
                                                <TableCell sx={{ py: 1 }}>
                                                    <FormControl size="small" fullWidth disabled={row.isAutoPaymentDifference}>
                                                        <Select
                                                            value={
                                                                MONETARY_COST_TYPES.some((type) => type.value === row.additionalCostType)
                                                                    ? row.additionalCostType
                                                                    : 'OTHER'
                                                            }
                                                            onChange={(e) => handleUpdateAdditionalCostRow(row.key, 'additionalCostType', e.target.value)}
                                                            sx={{ borderRadius: '6px', fontSize: '0.775rem' }}
                                                        >
                                                            {MONETARY_COST_TYPES.map((type) => (
                                                                <MenuItem key={type.value} value={type.value}>
                                                                    {type.label}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                </TableCell>
                                                <TableCell sx={{ py: 1 }}>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        disabled={row.isAutoPaymentDifference}
                                                        value={row.additionalCost}
                                                        onChange={(e) => handleUpdateAdditionalCostRow(row.key, 'additionalCost', formatSignedWithDots(e.target.value))}
                                                        placeholder="0"
                                                        InputProps={{
                                                            endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{ fontSize: '0.7rem' }}>VNĐ</Typography></InputAdornment>,
                                                        }}
                                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.775rem' } }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ py: 1 }}>
                                                    <Stack spacing={0.5}>
                                                        {row.additionalCostType === 'OTHER' && !row.isAutoPaymentDifference && (
                                                            <TextField
                                                                size="small"
                                                                fullWidth
                                                                value={row.additionalCostCustomName}
                                                                onChange={(e) => handleUpdateAdditionalCostRow(row.key, 'additionalCostCustomName', e.target.value)}
                                                                placeholder="Tên chi phí..."
                                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.75rem' } }}
                                                            />
                                                        )}
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            disabled={row.isAutoPaymentDifference}
                                                            value={row.additionalCostReason}
                                                            onChange={(e) => handleUpdateAdditionalCostRow(row.key, 'additionalCostReason', e.target.value)}
                                                            placeholder={row.isAutoPaymentDifference ? 'Tự động tính từ chênh lệch thanh toán' : 'Lý do / chi tiết...'}
                                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.775rem' } }}
                                                        />
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="center" sx={{ py: 1 }}>
                                                    {!row.isAutoPaymentDifference && (
                                                        <IconButton size="small" onClick={() => handleDeleteAdditionalCostRow(row.key)} sx={{ color: '#ef4444' }}>
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box sx={{ flex: 1, minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', p: 3 }}>
                                <ReceiptLongOutlinedIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                                <Typography variant="body2" fontWeight={600} color="#64748b" sx={{ fontSize: '0.825rem' }}>
                                    Không có khoản chi phí phát sinh nào
                                </Typography>
                                <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem', mt: 0.5 }}>
                                    Bấm nút &quot;Thêm khoản chi&quot; phía trên nếu có chi phí ngoài kỳ
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

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
                                <Chip
                                    size="small"
                                    label="Chưa bàn giao (PENDING)"
                                    sx={{
                                        height: 22,
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        bgcolor: '#fef3c7',
                                        color: '#b45309',
                                        border: '1px solid #fde68a',
                                    }}
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
                                So sánh ảnh biên lai phiếu nhập & biên lai đối soát NCC
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
                                        1. Chứng từ phiếu nhập lô ({importBatches.length})
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
                                {importBatches.length > 1 && (
                                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
                                        {importBatches.map((batch) => {
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
                                                    onClick={() => handleZoom(selectedImportReceiptUrl, `Biên lai nhập · ${selectedImport?.batchCode || selectedImport?.id}`)}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleZoom(selectedImportReceiptUrl, `Biên lai nhập · ${selectedImport?.batchCode || selectedImport?.id}`)}
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
                                            <Stack spacing={1} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                                                <ImageNotSupportedOutlinedIcon sx={{ fontSize: '2.5rem', color: '#94a3b8' }} />
                                                <Typography variant="body2" color="#64748b" fontWeight={600}>
                                                    Chưa có ảnh biên lai cho phiếu nhập này
                                                </Typography>
                                            </Stack>
                                        )
                                    ) : (
                                        selectedImportTicketListImages.length > 0 ? (
                                            <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                                                {selectedImportTicketListImages.map((imgUrl, idx) => (
                                                    <Box
                                                        key={imgUrl}
                                                        sx={{
                                                            position: 'relative',
                                                            borderRadius: '10px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #cbd5e1',
                                                            bgcolor: '#ffffff',
                                                            cursor: 'zoom-in',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                            '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.15s ease' },
                                                        }}
                                                        onClick={() => handleZoom(imgUrl, `Ảnh danh sách vé #${idx + 1} · ${selectedImport?.batchCode || selectedImport?.id}`)}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={imgUrl}
                                                            alt={`Danh sách vé ${idx + 1}`}
                                                            sx={{ width: 140, height: 140, objectFit: 'cover', display: 'block' }}
                                                        />
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
                                                                Ảnh #{idx + 1}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        ) : (
                                            <Stack spacing={1} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                                                <ImageNotSupportedOutlinedIcon sx={{ fontSize: '2.5rem', color: '#94a3b8' }} />
                                                <Typography variant="body2" color="#64748b" fontWeight={600}>
                                                    Chưa có ảnh danh sách vé cho phiếu nhập này
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
                                        <Chip size="small" label="Đã đính kèm" sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: '0.725rem', border: '1px solid #bbf7d0' }} />
                                    ) : (
                                        <Chip size="small" label="Chưa có (Bắt buộc)" sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.725rem', border: '1px solid #fecaca' }} />
                                    )}
                                </Stack>

                                <Typography variant="caption" color="#64748b" sx={{ mb: 1.5, display: 'block' }}>
                                    Ảnh biên lai / bảng kê NCC làm căn cứ đối soát
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
                                                onClick={() => handleZoom(receiptUrl, `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`)}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={() => handleZoom(receiptUrl, `Biên lai đối soát NCC #${settlement.supplierSettlementCode || settlement.id}`)}
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
                                        <Stack spacing={1} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                                            <CloudUploadIcon sx={{ fontSize: '2.5rem', color: '#94a3b8' }} />
                                            <Typography variant="body2" color="#64748b" fontWeight={600}>
                                                Chưa tải lên ảnh biên lai đối soát từ NCC
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
                                        const isHandedOver = rb.status === 'HANDED_OVER' || rb.status === 'RECEIVED';
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
                                                    <Chip
                                                        size="small"
                                                        label={rb.statusLabel || rb.status || '—'}
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: '0.725rem',
                                                            bgcolor: isHandedOver ? '#f0fdf4' : '#fff7ed',
                                                            color: isHandedOver ? '#16a34a' : '#ea580c',
                                                            border: `1px solid ${isHandedOver ? '#bbf7d0' : '#fed7aa'}`,
                                                        }}
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
