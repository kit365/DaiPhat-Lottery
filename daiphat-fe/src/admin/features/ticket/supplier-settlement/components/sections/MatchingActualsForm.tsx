"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    Dialog,
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
import dayjs from 'dayjs';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';
import { AppToast } from '../../../../../../utils/toast.util';
import { attachImportBatchInvoiceEvidence } from '../../../import-batch/services/importBatchService';
import { updateSupplierSettlementReceiptUrl } from '../../services/supplierSettlementService';
import type {
    SettlementAdjustmentReasonCode,
    SettlementMatchingAdditionalCost,
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SupplierSettlement,
    SupplierSettlementAdjustment,
} from '../../types/supplierSettlement.type';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { getDiscrepancyTypeLabel, isReturnReconciliationLocked } from '../../utils/settlementLabels';

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
    isSubmitting?: boolean;
    onZoomImage?: (payload: { url: string; title: string }) => void;
    onReceiptUploaded?: () => void;
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

const formatNumberWithDots = (val?: number | string | null): string => {
    if (val === '' || val === null || val === undefined) return '';
    const digits = String(val).replace(/\D/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toLocaleString('vi-VN');
};

const parseNumberFromDots = (val?: string | number | null): number => {
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

const mapSettlementAdjustmentsToRows = (adjustments?: SupplierSettlementAdjustment[]): AdditionalCostRow[] =>
    (adjustments || [])
        .filter((row) => row.groupType === 'SETTLEMENT')
        .map((row) => ({
            key: `adj-${row.id}`,
            additionalCost: formatSignedWithDots(row.amount),
            additionalCostType: row.reasonCode,
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
    isSubmitting,
    onZoomImage,
    onReceiptUploaded,
    onConfirm,
}: MatchingActualsFormProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importReceiptInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingImportReceipt, setIsDraggingImportReceipt] = useState(false);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [isUploadingImportReceipt, setIsUploadingImportReceipt] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState(settlement.supplierSettlementReceiptUrl || '');
    const [previewZoom, setPreviewZoom] = useState<{ url: string; title: string } | null>(null);
    const [compareModalOpen, setCompareModalOpen] = useState(false);
    const [localImportReceiptById, setLocalImportReceiptById] = useState<Record<number, string>>({});

    const [selectedImportId, setSelectedImportId] = useState<number | null>(importBatches[0]?.id ?? null);

    // Initial unit price fallback
    const originalUnitPrice = useMemo(() => {
        if (settlement.originalTicketUnitPrice && settlement.originalTicketUnitPrice > 0) {
            return Number(settlement.originalTicketUnitPrice);
        }
        if (settlement.systemImportQuantity && settlement.systemImportQuantity > 0 && settlement.systemImportValue) {
            return Math.round(Number(settlement.systemImportValue) / settlement.systemImportQuantity);
        }
        return 10000;
    }, [settlement]);

    const initialUnitPrice = useMemo(() => {
        if (settlement.reconciledTicketUnitPrice && settlement.reconciledTicketUnitPrice > 0) {
            return Number(settlement.reconciledTicketUnitPrice);
        }
        if (settlement.actualTicketPrice && settlement.actualTicketPrice > 0) {
            return Number(settlement.actualTicketPrice);
        }
        return originalUnitPrice;
    }, [settlement, originalUnitPrice]);

    const [unitPrice, setUnitPrice] = useState(() => formatNumberWithDots(initialUnitPrice));
    const [importQty, setImportQty] = useState(() =>
        formatNumberWithDots(settlement.actualTicketImportQuantity ?? settlement.systemImportQuantity ?? 0)
    );
    const [returnQty, setReturnQty] = useState(() =>
        formatNumberWithDots(settlement.actualReturnTicketQuantity ?? settlement.systemReturnQuantity ?? 0)
    );
    const [note, setNote] = useState(settlement.reconciliationNote || '');
    const [actualPaidAmount, setActualPaidAmount] = useState(() =>
        formatNumberWithDots(settlement.actualPaidAmount)
    );
    const [additionalCostRows, setAdditionalCostRows] = useState<AdditionalCostRow[]>(() =>
        mapSettlementAdjustmentsToRows(adjustments)
    );

    const isReturnLocked = useMemo(
        () => isReturnReconciliationLocked(returnBatches),
        [returnBatches]
    );

    useEffect(() => {
        if (!importBatches.some((b) => b.id === selectedImportId)) {
            setSelectedImportId(importBatches[0]?.id ?? null);
        }
    }, [importBatches, selectedImportId]);

    useEffect(() => {
        setReceiptUrl(settlement.supplierSettlementReceiptUrl || '');
        const derivedUnitPrice =
            settlement.reconciledTicketUnitPrice && settlement.reconciledTicketUnitPrice > 0
                ? Number(settlement.reconciledTicketUnitPrice)
                : settlement.actualTicketPrice && settlement.actualTicketPrice > 0
                ? Number(settlement.actualTicketPrice)
                : originalUnitPrice;

        setUnitPrice(formatNumberWithDots(derivedUnitPrice));
        setImportQty(formatNumberWithDots(settlement.actualTicketImportQuantity ?? settlement.systemImportQuantity ?? 0));
        setReturnQty(formatNumberWithDots(settlement.actualReturnTicketQuantity ?? settlement.systemReturnQuantity ?? 0));
        setNote(settlement.reconciliationNote || '');
        setActualPaidAmount(formatNumberWithDots(settlement.actualPaidAmount));
    }, [settlement, originalUnitPrice]);

    const settlementAdjustmentKey = (adjustments || [])
        .filter((row) => row.groupType === 'SETTLEMENT')
        .map((row) => `${row.id}:${row.amount}:${row.reasonCode}:${row.note || ''}:${row.autoGenerated ? 1 : 0}:${row.customName || ''}`)
        .join('|');

    useEffect(() => {
        setAdditionalCostRows(mapSettlementAdjustmentsToRows(adjustments));
    }, [settlement.id, settlementAdjustmentKey]);

    const selectedImport = useMemo(
        () => importBatches.find((b) => b.id === selectedImportId) || importBatches[0],
        [importBatches, selectedImportId]
    );

    const selectedImportReceiptUrl =
        (selectedImport?.id != null ? localImportReceiptById[selectedImport.id] : undefined)
        || selectedImport?.invoiceEvidenceUrl
        || selectedImport?.receiptImageUrl
        || selectedImport?.evidenceUrl
        || '';

    const hasImportReceipt = Boolean(selectedImportReceiptUrl && selectedImportReceiptUrl.trim());
    const importBatchReceiptUrl = (batch?: SettlementOverviewImportBatch | null) =>
        (batch?.id != null ? localImportReceiptById[batch.id] : undefined)
        || batch?.invoiceEvidenceUrl
        || batch?.receiptImageUrl
        || batch?.evidenceUrl
        || '';

    const uploadedImportReceiptCount = useMemo(
        () => importBatches.filter((batch) => Boolean(String(importBatchReceiptUrl(batch)).trim())).length,
        [importBatches, localImportReceiptById]
    );

    const missingImportBatches = useMemo(
        () => importBatches.filter((batch) => !String(importBatchReceiptUrl(batch)).trim()),
        [importBatches, localImportReceiptById]
    );

    const hasAllImportReceipts =
        importBatches.length === 0
        || importBatches.every((batch) => Boolean(String(importBatchReceiptUrl(batch)).trim()));

    useEffect(() => {
        if (!importBatches.some((b) => b.id === selectedImportId)) {
            setSelectedImportId(importBatches[0]?.id ?? null);
        }
    }, [importBatches, selectedImportId]);

    const systemImportQty = settlement.systemImportQuantity ?? 0;
    const systemImportVal = Number(settlement.systemImportValue ?? 0);
    const systemReturnQty = settlement.systemReturnQuantity ?? 0;
    const systemReturnVal = Number(settlement.systemReturnValue ?? 0);

    const isImportQtyEmpty = importQty.trim() === '';
    const isReturnQtyEmpty = returnQty.trim() === '';
    const isUnitPriceEmpty = unitPrice.trim() === '';

    const hasAllRequiredInputs = !isImportQtyEmpty && !isReturnQtyEmpty && !isUnitPriceEmpty;

    // Parsed numerical values
    const parsedUnitPrice = parseNumberFromDots(unitPrice);
    const parsedImportQty = parseNumberFromDots(importQty);
    const parsedReturnQty = parseNumberFromDots(returnQty);

    // Auto-calculated import/return values for confirm payload (qty × reconciled unit price)
    const calculatedImportVal = parsedImportQty * parsedUnitPrice;
    const calculatedReturnVal = parsedReturnQty * parsedUnitPrice;

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

    // Settlement amounts:
    // - initial: always from BE baseline (or fallback to original × system net for first paint)
    // - final/difference: live-recomputed from current reconciliation inputs when they differ from system;
    //   otherwise show empty ("Chưa có chênh lệch") — never mirror the baseline as an "adjusted" value.
    const initialEstimatedVal =
        settlement.initialEstimatedSettlementValue != null
            ? Number(settlement.initialEstimatedSettlementValue)
            : originalUnitPrice * (systemImportQty - systemReturnQty);

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

    const hasLiveReconciliationAdjustment =
        (!isUnitPriceEmpty && parsedUnitPrice !== originalUnitPrice)
        || (!isImportQtyEmpty && parsedImportQty !== systemImportQty)
        || (!isReturnQtyEmpty && parsedReturnQty !== systemReturnQty)
        || manualAdditionalCostTotal !== 0;

    const liveFinalVal = parsedUnitPrice * (parsedImportQty - parsedReturnQty) + manualAdditionalCostTotal;
    const finalVal = hasAllRequiredInputs ? liveFinalVal : null;
    const differenceAmount = hasAllRequiredInputs ? liveFinalVal - initialEstimatedVal : 0;
    const parsedActualPaidAmount = parseNumberFromDots(actualPaidAmount);
    const isActualPaidEmpty = actualPaidAmount.trim() === '';
    const paymentRemainingDiff =
        !isActualPaidEmpty && finalVal != null ? parsedActualPaidAmount - finalVal : null;
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

    const differenceTone =
        !hasLiveReconciliationAdjustment
            ? { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Không đổi', icon: <TrendingFlatOutlinedIcon sx={{ fontSize: '1rem' }} /> }
            : differenceAmount === 0
              ? { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Không đổi', icon: <TrendingFlatOutlinedIcon sx={{ fontSize: '1rem' }} /> }
              : differenceAmount > 0
                ? { bg: '#fff1f2', border: '#fecdd3', color: '#be123c', label: 'Tăng', icon: <TrendingUpOutlinedIcon sx={{ fontSize: '1rem' }} /> }
                : { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'Giảm', icon: <TrendingDownOutlinedIcon sx={{ fontSize: '1rem' }} /> };

    const isImportMatching =
        !isImportQtyEmpty && !isUnitPriceEmpty && parsedImportQty === systemImportQty && calculatedImportVal === systemImportVal;
    const isReturnMatching =
        !isReturnQtyEmpty && !isUnitPriceEmpty && parsedReturnQty === systemReturnQty && calculatedReturnVal === systemReturnVal;
    const hasReceipt = Boolean(receiptUrl && receiptUrl.trim());

    const canSubmit =
        hasAllRequiredInputs
        && !isActualPaidEmpty
        && hasReceipt
        && hasAllImportReceipts
        && !hasIncompleteAdditionalCost
        && !isUploadingReceipt
        && !isUploadingImportReceipt
        && !isSubmitting
        && !isReturnLocked;

    const handleUploadFile = async (file: File) => {
        if (!settlement?.id) {
            AppToast.error('Không tìm thấy thông tin kỳ đối soát.');
            return;
        }

        try {
            setIsUploadingReceipt(true);
            const uploadedUrl = await uploadAdminImage(file);
            setReceiptUrl(uploadedUrl);
            const res = await updateSupplierSettlementReceiptUrl(settlement.id, uploadedUrl);
            if (res.success) {
                AppToast.success('Đã tải lên và lưu ảnh biên lai đối soát NCC.');
                onReceiptUploaded?.();
            } else {
                AppToast.error(res.message || 'Lưu ảnh biên lai thất bại.');
            }
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải ảnh lên máy chủ.'
            );
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

    const handleUploadImportReceipt = async (file: File) => {
        if (!selectedImport?.id) {
            AppToast.error('Không tìm thấy phiếu nhập lô để đính kèm biên lai.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            AppToast.warning('Vui lòng chọn đúng định dạng hình ảnh (PNG, JPG, JPEG, WEBP).');
            return;
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
            } else {
                AppToast.error(res.message || 'Lưu ảnh biên lai phiếu nhập thất bại.');
            }
        } catch (err: any) {
            AppToast.error(
                err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tải ảnh biên lai phiếu nhập.'
            );
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

    const handleZoom = (url: string, title?: string) => {
        const modalTitle = title || `Biên lai đối soát #${settlement.supplierSettlementCode || settlement.id}`;
        if (onZoomImage) {
            onZoomImage({ url, title: modalTitle });
        } else {
            setPreviewZoom({ url, title: modalTitle });
        }
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

    return (
        <Box sx={{ width: '100%', pt: 1 }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
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
                    <CompareArrowsOutlinedIcon sx={{ fontSize: '1.6rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.15rem', lineHeight: 1.3 }}>
                        Đối chiếu số liệu hệ thống / thực tế
                    </Typography>
                    <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>
                        Nhập số lượng thực tế và đơn giá vé. Hệ thống sẽ tự động tính toán tổng giá trị nhập, giá trị trả và giá trị đối soát trước khi chạy đối chiếu.
                    </Typography>
                </Box>
            </Stack>

            <Divider sx={{ mb: 3, borderColor: '#f1f5f9' }} />

            {/* Block 1: Comparison Grid (Import vs Return) */}
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
                                    value={formatNumberWithDots(calculatedImportVal)}
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
                                    value={formatNumberWithDots(calculatedReturnVal)}
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

            {/* Block 2: Redesigned Middle Card (Unit Prices, Settlement Summary Metrics & Notes) */}
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: '16px',
                    borderColor: '#e2e8f0',
                    bgcolor: '#fafafa',
                    mb: 3,
                }}
            >
                {/* Row 1: Đơn giá vé & Tình trạng chênh lệch */}
                <Grid container spacing={2} alignItems="stretch" sx={{ mb: 2.5 }}>
                    {/* Card 1: Đơn giá ban đầu */}
                    <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.75,
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box sx={{ mb: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Box
                                        sx={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '6px',
                                            bgcolor: '#f1f5f9',
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <LocalOfferOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                                    </Box>
                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ textTransform: 'uppercase', fontSize: '0.725rem' }}>
                                        Giá mỗi vé ban đầu
                                    </Typography>
                                </Stack>

                                <TextField
                                    fullWidth
                                    size="small"
                                    type="text"
                                    value={formatNumberWithDots(originalUnitPrice)}
                                    InputProps={{
                                        readOnly: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Typography variant="caption" fontWeight={700} color="#64748b">
                                                    VNĐ/vé
                                                </Typography>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '8px',
                                            bgcolor: '#f8fafc',
                                        },
                                        '& input': {
                                            fontWeight: 700,
                                            fontSize: '0.95rem',
                                            color: '#334155',
                                        },
                                    }}
                                />
                            </Box>
                            <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.725rem' }}>
                                Theo defaultImportCost NCC (Baseline)
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* Card 2: Đơn giá sau đối soát */}
                    <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.75,
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: isUnitPriceEmpty
                                    ? '#fca5a5'
                                    : unitPriceDiff > 0
                                    ? '#fecdd3'
                                    : unitPriceDiff < 0
                                    ? '#fde68a'
                                    : '#bfdbfe',
                                bgcolor: isUnitPriceEmpty
                                    ? '#fef2f2'
                                    : unitPriceDiff > 0
                                    ? '#fff1f2'
                                    : unitPriceDiff < 0
                                    ? '#fffbeb'
                                    : '#ffffff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box sx={{ mb: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '6px',
                                                bgcolor: unitPriceDiff > 0 ? '#fff1f2' : unitPriceDiff < 0 ? '#fffbeb' : '#eff6ff',
                                                color: unitPriceDiff > 0 ? '#be123c' : unitPriceDiff < 0 ? '#b45309' : '#2563eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <LocalOfferOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                                        </Box>
                                        <Typography variant="caption" fontWeight={700} color="#1e40af" sx={{ textTransform: 'uppercase', fontSize: '0.725rem' }}>
                                            Giá vé sau đối soát (*)
                                        </Typography>
                                    </Stack>

                                    {isUnitPriceEmpty ? (
                                        <Chip
                                            size="small"
                                            label="Chưa nhập"
                                            sx={{ height: 20, fontSize: '0.675rem', fontWeight: 800, bgcolor: '#fee2e2', color: '#dc2626' }}
                                        />
                                    ) : unitPriceDiff > 0 ? (
                                        <Chip
                                            size="small"
                                            icon={<TrendingUpOutlinedIcon style={{ fontSize: '0.8rem', color: '#be123c' }} />}
                                            label={`+${formatImportCost(unitPriceDiff)} đ`}
                                            sx={{ height: 20, fontSize: '0.675rem', fontWeight: 800, bgcolor: '#ffffff', color: '#be123c', border: '1px solid #fecdd3' }}
                                        />
                                    ) : unitPriceDiff < 0 ? (
                                        <Chip
                                            size="small"
                                            icon={<TrendingDownOutlinedIcon style={{ fontSize: '0.8rem', color: '#b45309' }} />}
                                            label={`${formatImportCost(unitPriceDiff)} đ`}
                                            sx={{ height: 20, fontSize: '0.675rem', fontWeight: 800, bgcolor: '#ffffff', color: '#b45309', border: '1px solid #fde68a' }}
                                        />
                                    ) : (
                                        <Chip
                                            size="small"
                                            label="Khớp giá gốc"
                                            sx={{ height: 20, fontSize: '0.675rem', fontWeight: 700, bgcolor: '#f1f5f9', color: '#64748b' }}
                                        />
                                    )}
                                </Stack>

                                <TextField
                                    fullWidth
                                    size="small"
                                    type="text"
                                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                                    value={unitPrice}
                                    error={isUnitPriceEmpty}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        setUnitPrice(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '');
                                    }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Typography variant="caption" fontWeight={800} color="#2563eb">
                                                    VNĐ/vé
                                                </Typography>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '8px',
                                            bgcolor: '#ffffff',
                                        },
                                        '& input': {
                                            fontWeight: 800,
                                            fontSize: '0.95rem',
                                            color: '#0f172a',
                                        },
                                    }}
                                />
                            </Box>

                            <Typography
                                variant="caption"
                                sx={{
                                    fontSize: '0.725rem',
                                    fontWeight: unitPriceDiff !== 0 ? 700 : 500,
                                    color: isUnitPriceEmpty
                                        ? '#dc2626'
                                        : unitPriceDiff > 0
                                        ? '#be123c'
                                        : unitPriceDiff < 0
                                        ? '#b45309'
                                        : '#64748b',
                                }}
                            >
                                {isUnitPriceEmpty
                                    ? 'Bắt buộc nhập đơn giá vé'
                                    : unitPriceDiff > 0
                                    ? `→ Tăng +${formatImportCost(unitPriceDiff)} VNĐ/vé so với giá gốc`
                                    : unitPriceDiff < 0
                                    ? `→ Giảm ${formatImportCost(unitPriceDiff)} VNĐ/vé so với giá gốc`
                                    : '→ Không đổi (khớp với giá ban đầu)'}
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* Card 3: Tình trạng đối chiếu phát hiện */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.75,
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: liveDiscrepancyTypes.length === 0 ? '#bbf7d0' : '#fed7aa',
                                bgcolor: liveDiscrepancyTypes.length === 0 ? '#f0fdf4' : '#fff7ed',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box sx={{ mb: 1 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '6px',
                                                bgcolor: liveDiscrepancyTypes.length === 0 ? '#dcfce7' : '#ffedd5',
                                                color: liveDiscrepancyTypes.length === 0 ? '#15803d' : '#c2410c',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {liveDiscrepancyTypes.length === 0 ? (
                                                <CheckCircleOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                                            ) : (
                                                <WarningAmberOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                                            )}
                                        </Box>
                                        <Typography variant="caption" fontWeight={700} color={liveDiscrepancyTypes.length === 0 ? '#166534' : '#9a3412'} sx={{ textTransform: 'uppercase', fontSize: '0.725rem' }}>
                                            Tình trạng đối chiếu:
                                        </Typography>
                                    </Stack>

                                    <Typography variant="caption" color={liveDiscrepancyTypes.length === 0 ? '#16a34a' : '#ea580c'} fontWeight={700} sx={{ fontSize: '0.75rem' }}>
                                        {liveDiscrepancyTypes.length === 0 ? 'Khớp toàn bộ dữ liệu' : `Có ${liveDiscrepancyTypes.length} mục sai lệch`}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ my: 0.5 }}>
                                    {liveDiscrepancyTypes.length === 0 ? (
                                        <Chip
                                            size="small"
                                            icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.85rem', color: '#16a34a' }} />}
                                            label="Số lượng vé & Đơn giá hoàn toàn khớp"
                                            sx={{ bgcolor: '#ffffff', color: '#16a34a', fontWeight: 800, fontSize: '0.725rem', border: '1px solid #86efac' }}
                                        />
                                    ) : (
                                        liveDiscrepancyTypes.map((type) => {
                                            if (type === 'IMPORT_UNIT_PRICE') {
                                                const isPos = unitPriceDiff > 0;
                                                return (
                                                    <Chip
                                                        key={type}
                                                        size="small"
                                                        icon={isPos ? <TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                                        label={isPos ? `Tăng giá (+${formatImportCost(unitPriceDiff)} đ)` : `Giảm giá (${formatImportCost(unitPriceDiff)} đ)`}
                                                        sx={{
                                                            bgcolor: '#ffffff',
                                                            color: isPos ? '#be123c' : '#b45309',
                                                            fontWeight: 800,
                                                            fontSize: '0.725rem',
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
                                                        icon={isPos ? <TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                                        label={isPos ? `Thừa nhập (+${importQtyDiff.toLocaleString('vi-VN')} vé)` : `Thiếu nhập (${importQtyDiff.toLocaleString('vi-VN')} vé)`}
                                                        sx={{
                                                            bgcolor: '#ffffff',
                                                            color: isPos ? '#be123c' : '#b45309',
                                                            fontWeight: 800,
                                                            fontSize: '0.725rem',
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
                                                        icon={isPos ? <TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                                        label={isPos ? `Thừa trả (+${returnQtyDiff.toLocaleString('vi-VN')} vé)` : `Thiếu trả (${returnQtyDiff.toLocaleString('vi-VN')} vé)`}
                                                        sx={{
                                                            bgcolor: '#ffffff',
                                                            color: isPos ? '#be123c' : '#b45309',
                                                            fontWeight: 800,
                                                            fontSize: '0.725rem',
                                                            border: `1px solid ${isPos ? '#fecdd3' : '#fde68a'}`,
                                                        }}
                                                    />
                                                );
                                            }
                                            return null;
                                        })
                                    )}
                                </Stack>
                            </Box>

                            <Typography variant="caption" color={liveDiscrepancyTypes.length === 0 ? '#15803d' : '#c2410c'} sx={{ fontSize: '0.725rem' }}>
                                {liveDiscrepancyTypes.length === 0
                                    ? '✓ Số liệu vé và đơn giá hoàn toàn trùng khớp'
                                    : '⚠ Các mục sai lệch trên ảnh hưởng trực tiếp đến kết quả tính toán bên dưới'}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2.5, borderColor: '#e2e8f0' }} />

                {/* Row 2: 3-Card Metrics Trio (Financial Settlement Summary) */}
                <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                    {/* Card 1: Giá trị đối soát tạm tính ban đầu */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
                                <Box
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '6px',
                                        bgcolor: '#f1f5f9',
                                        color: '#475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <ReceiptLongOutlinedIcon sx={{ fontSize: '1rem' }} />
                                </Box>
                                <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    Tạm tính ban đầu
                                </Typography>
                            </Stack>
                            <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.2rem', my: 0.5 }}>
                                {initialEstimatedVal != null
                                    ? <>{formatImportCost(initialEstimatedVal)} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>VNĐ</span></>
                                    : '—'}
                            </Typography>
                            <Typography variant="caption" color="#94a3b8">
                                Baseline hệ thống (giá gốc × SL hệ thống)
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* Card 2: Giá trị đối soát sau chênh lệch */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                border: '1px solid #bfdbfe',
                                bgcolor: '#eff6ff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
                                <Box
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '6px',
                                        bgcolor: '#dbeafe',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <CalculateOutlinedIcon sx={{ fontSize: '1rem' }} />
                                </Box>
                                <Typography variant="caption" fontWeight={700} color="#1e40af" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    Sau chênh lệch (Thực tế)
                                </Typography>
                            </Stack>
                            <Typography variant="h6" fontWeight={800} color="#1d4ed8" sx={{ fontSize: '1.2rem', my: 0.5 }}>
                                {finalVal != null
                                    ? <>{formatImportCost(finalVal)} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa' }}>VNĐ</span></>
                                    : '—'}
                            </Typography>
                            <Typography variant="caption" color="#3b82f6">
                                Hệ thống tự tính từ SL nhập/trả, giá vé và chi phí phát sinh
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* Card 3: Giá tiền chênh lệch */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                border: `1px solid ${differenceTone.border}`,
                                bgcolor: differenceTone.bg,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Stack direction="row" spacing={1.2} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '6px',
                                            bgcolor: '#ffffff',
                                            color: differenceTone.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px solid ${differenceTone.border}`,
                                        }}
                                    >
                                        {differenceTone.icon}
                                    </Box>
                                    <Typography variant="caption" fontWeight={700} color={differenceTone.color} sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                        Tiền chênh lệch
                                    </Typography>
                                </Stack>
                                <Chip
                                    size="small"
                                    label={differenceTone.label}
                                    sx={{
                                        height: 22,
                                        fontSize: '0.725rem',
                                        fontWeight: 800,
                                        bgcolor: '#ffffff',
                                        color: differenceTone.color,
                                        border: `1px solid ${differenceTone.border}`,
                                    }}
                                />
                            </Stack>
                            <Typography variant="h6" fontWeight={800} color={differenceTone.color} sx={{ fontSize: '1.2rem', my: 0.5 }}>
                                {hasLiveReconciliationAdjustment
                                    ? <>{differenceAmount > 0 ? `+${formatImportCost(differenceAmount)}` : formatImportCost(differenceAmount)} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>VNĐ</span></>
                                    : <>{formatImportCost(0)} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>VNĐ</span></>}
                            </Typography>
                            <Typography variant="caption" sx={{ color: differenceTone.color, opacity: 0.85 }}>
                                = Sau chênh lệch − Tạm tính ban đầu
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Row 2.5: Đối chiếu số tiền thực trả từ biên lai NCC */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2.5,
                        borderRadius: '14px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#f8fafc',
                    }}
                >
                    {/* Header: Title + Quick Fill Button */}
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
                                <PaymentsOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                    Đối chiếu số tiền thực trả trên biên lai NCC
                                </Typography>
                                <Typography variant="caption" color="#64748b">
                                    So khớp số tiền NCC ghi trên biên lai thực tế với số tiền hệ thống tính sau chênh lệch
                                </Typography>
                            </Box>
                        </Stack>

                        {finalVal != null && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AutoFixHighOutlinedIcon />}
                                onClick={() => setActualPaidAmount(formatNumberWithDots(finalVal))}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    bgcolor: '#ffffff',
                                    color: '#2563eb',
                                    borderColor: '#bfdbfe',
                                    fontSize: '0.775rem',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                    '&:hover': {
                                        bgcolor: '#eff6ff',
                                        borderColor: '#2563eb',
                                    },
                                }}
                            >
                                Khớp bằng số tiền sau chênh lệch ({formatImportCost(finalVal)} đ)
                            </Button>
                        )}
                    </Stack>

                    {/* 2-Column Content: Input vs Match Result */}
                    <Grid container spacing={2} alignItems="stretch">
                        {/* Col 1: Nhập số tiền biên lai */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.75,
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#ffffff',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ textTransform: 'uppercase', fontSize: '0.725rem', display: 'block', mb: 0.75 }}>
                                        Giá trị thực trả từ biên lai (*)
                                    </Typography>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        required
                                        value={actualPaidAmount}
                                        onChange={(e) => setActualPaidAmount(formatNumberWithDots(e.target.value))}
                                        placeholder="Ví dụ: 11.700.000"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <ReceiptLongOutlinedIcon sx={{ color: '#94a3b8', fontSize: '1.1rem' }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Typography variant="caption" fontWeight={800} color="#2563eb">
                                                        VNĐ
                                                    </Typography>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '8px',
                                                bgcolor: '#f8fafc',
                                            },
                                            '& input': {
                                                fontWeight: 800,
                                                fontSize: '1rem',
                                                color: '#0f172a',
                                            },
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <InfoOutlinedIcon sx={{ fontSize: '0.85rem', color: '#3b82f6' }} />
                                    Admin nhập theo số tiền thực trả trên biên lai (không ghi đè Sau chênh lệch).
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* Col 2: Kết quả so khớp thanh toán */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.75,
                                    borderRadius: '12px',
                                    border: '1px solid',
                                    borderColor: isActualPaidEmpty
                                        ? '#e2e8f0'
                                        : paymentRemainingDiff === 0
                                        ? '#bbf7d0'
                                        : paymentRemainingDiff > 0
                                        ? '#fecdd3'
                                        : '#fde68a',
                                    bgcolor: isActualPaidEmpty
                                        ? '#ffffff'
                                        : paymentRemainingDiff === 0
                                        ? '#f0fdf4'
                                        : paymentRemainingDiff > 0
                                        ? '#fff1f2'
                                        : '#fffbeb',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                                    <Typography variant="caption" fontWeight={700} color="#475569" sx={{ textTransform: 'uppercase', fontSize: '0.725rem' }}>
                                        Chênh lệch thanh toán:
                                    </Typography>
                                    {isActualPaidEmpty ? (
                                        <Chip
                                            size="small"
                                            label="Chưa nhập tiền"
                                            sx={{ height: 20, fontSize: '0.675rem', fontWeight: 700, bgcolor: '#f1f5f9', color: '#64748b' }}
                                        />
                                    ) : paymentRemainingDiff === 0 ? (
                                        <Chip
                                            size="small"
                                            icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.85rem', color: '#15803d' }} />}
                                            label="Khớp hoàn toàn"
                                            sx={{ height: 20, fontSize: '0.675rem', fontWeight: 800, bgcolor: '#ffffff', color: '#15803d', border: '1px solid #bbf7d0' }}
                                        />
                                    ) : paymentRemainingDiff > 0 ? (
                                        <Chip
                                            size="small"
                                            icon={<TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} />}
                                            label="Thừa thanh toán (+)"
                                            sx={{ height: 20, fontSize: '0.675rem', fontWeight: 800, bgcolor: '#ffffff', color: '#be123c', border: '1px solid #fecdd3' }}
                                        />
                                    ) : (
                                        <Chip
                                            size="small"
                                            icon={<TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#b45309' }} />}
                                            label="Thiếu thanh toán (−)"
                                            sx={{ height: 20, fontSize: '0.675rem', fontWeight: 800, bgcolor: '#ffffff', color: '#b45309', border: '1px solid #fde68a' }}
                                        />
                                    )}
                                </Stack>

                                <Box sx={{ my: 0.25 }}>
                                    <Typography
                                        variant="h6"
                                        fontWeight={800}
                                        sx={{
                                            fontSize: '1.2rem',
                                            color: isActualPaidEmpty
                                                ? '#94a3b8'
                                                : paymentRemainingDiff === 0
                                                ? '#15803d'
                                                : paymentRemainingDiff > 0
                                                ? '#be123c'
                                                : '#b45309',
                                        }}
                                    >
                                        {isActualPaidEmpty ? (
                                            '—'
                                        ) : (
                                            <>
                                                {paymentRemainingDiff > 0 ? `+${formatImportCost(paymentRemainingDiff)}` : formatImportCost(paymentRemainingDiff)}{' '}
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>VNĐ</span>
                                            </>
                                        )}
                                    </Typography>
                                </Box>

                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.725rem' }}>
                                    {isActualPaidEmpty
                                        ? '= Giá trị thực trả từ biên lai − Sau chênh lệch'
                                        : paymentRemainingDiff === 0
                                        ? '✓ Số tiền trên biên lai trùng khớp 100% với số tiền sau đối soát'
                                        : paymentRemainingDiff > 0
                                        ? `Biên lai trả thừa +${formatImportCost(paymentRemainingDiff)} VNĐ so với số tiền cần trả`
                                        : `Biên lai trả thiếu ${formatImportCost(paymentRemainingDiff)} VNĐ so với số tiền cần trả`}
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Row 3: Chi phí / điều chỉnh phát sinh */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2.5,
                        borderRadius: '14px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#f8fafc',
                    }}
                >
                    {/* Header: Title + Subtitle + Add Button */}
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
                                    Chi phí & Điều chỉnh phát sinh ngoài kỳ
                                </Typography>
                                <Typography variant="caption" color="#64748b">
                                    Dương (+) = tăng phải trả NCC · Âm (−) = giảm trừ. Chỉ ảnh hưởng số tiền thực tế sau chênh lệch.
                                </Typography>
                            </Box>
                        </Stack>

                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddOutlinedIcon />}
                            onClick={() => setAdditionalCostRows((rows) => [...rows, createAdditionalCostRow()])}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '8px',
                                bgcolor: '#ffffff',
                                color: '#2563eb',
                                borderColor: '#bfdbfe',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                '&:hover': {
                                    bgcolor: '#eff6ff',
                                    borderColor: '#2563eb',
                                },
                            }}
                        >
                            Thêm khoản chi phí
                        </Button>
                    </Stack>

                    {autoPaymentDiffRow && (
                        <Alert
                            severity="warning"
                            icon={<WarningAmberOutlinedIcon />}
                            sx={{ mb: 1.5, borderRadius: '10px', fontWeight: 600 }}
                        >
                            Số tiền thực trả trên biên lai khác số tiền hệ thống tính (Sau chênh lệch).
                            Hệ thống đã tự thêm khoản điều chỉnh <strong>Khác (phát sinh ngoài kỳ)</strong> với số tiền
                            {' '}{paymentRemainingDiff != null && paymentRemainingDiff > 0 ? '+' : ''}
                            {paymentRemainingDiff != null ? formatImportCost(paymentRemainingDiff) : ''} VNĐ.
                            Vui lòng nhập tên khoản chi phí trước khi xác nhận đối chiếu.
                        </Alert>
                    )}

                    {/* Empty State */}
                    {additionalCostRows.length === 0 ? (
                        <Box
                            sx={{
                                p: 2.5,
                                textAlign: 'center',
                                borderRadius: '10px',
                                border: '1px dashed #cbd5e1',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Typography variant="body2" color="#64748b" sx={{ fontSize: '0.85rem', mb: 0.5 }}>
                                Chưa có khoản chi phí hoặc điều chỉnh phát sinh nào cho kỳ đối soát này.
                            </Typography>
                            <Button
                                size="small"
                                variant="text"
                                startIcon={<AddOutlinedIcon />}
                                onClick={() => setAdditionalCostRows((rows) => [...rows, createAdditionalCostRow()])}
                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', color: '#2563eb' }}
                            >
                                Thêm khoản phát sinh (phí vận chuyển, phạt, chiết khấu...)
                            </Button>
                        </Box>
                    ) : (
                        /* Items List */
                        <Stack spacing={1.25}>
                            {additionalCostRows.map((row, index) => {
                                const parsedAmount = parseSignedFromDots(row.additionalCost);
                                const isPos = parsedAmount > 0;
                                const isNeg = parsedAmount < 0;
                                const isAuto = Boolean(row.isAutoPaymentDifference);

                                return (
                                    <Paper
                                        key={row.key}
                                        elevation={0}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: '12px',
                                            border: isAuto ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                                            bgcolor: isAuto ? '#fffbeb' : '#ffffff',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                            transition: 'border-color 0.2s ease',
                                            '&:hover': {
                                                borderColor: isAuto ? '#f59e0b' : '#cbd5e1',
                                            },
                                        }}
                                    >
                                        <Grid container spacing={1.25} alignItems="center">
                                            {/* Col 1: Type selection */}
                                            <Grid size={{ xs: 12, sm: 4, md: 3.5 }}>
                                                <FormControl size="small" fullWidth disabled={isAuto}>
                                                    <InputLabel>Loại điều chỉnh</InputLabel>
                                                    <Select
                                                        label="Loại điều chỉnh"
                                                        value={row.additionalCostType}
                                                        onChange={(e) => {
                                                            const nextType = e.target.value as SettlementAdjustmentReasonCode;
                                                            setAdditionalCostRows((rows) =>
                                                                rows.map((item) =>
                                                                    item.key === row.key
                                                                        ? {
                                                                              ...item,
                                                                              additionalCostType: nextType,
                                                                              additionalCostCustomName:
                                                                                  nextType === 'OTHER'
                                                                                      ? item.additionalCostCustomName
                                                                                      : '',
                                                                          }
                                                                        : item
                                                                )
                                                            );
                                                        }}
                                                        sx={{ borderRadius: '8px', fontSize: '0.85rem' }}
                                                    >
                                                        {MONETARY_COST_TYPES.map((type) => (
                                                            <MenuItem key={type.value} value={type.value} sx={{ fontSize: '0.85rem' }}>
                                                                {type.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {/* Col 2: Amount input */}
                                            <Grid size={{ xs: 12, sm: 4, md: 3.5 }}>
                                                <TextField
                                                    label="Số tiền (+ / −)"
                                                    size="small"
                                                    fullWidth
                                                    disabled={isAuto}
                                                    value={row.additionalCost}
                                                    onChange={(e) => {
                                                        const next = formatSignedWithDots(e.target.value);
                                                        setAdditionalCostRows((rows) =>
                                                            rows.map((item) =>
                                                                item.key === row.key ? { ...item, additionalCost: next } : item
                                                            )
                                                        );
                                                    }}
                                                    placeholder="50.000 hoặc -20.000"
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
                                                            borderRadius: '8px',
                                                            bgcolor: isPos ? '#fff1f215' : isNeg ? '#f0fdf415' : '#ffffff',
                                                            borderColor: isPos ? '#fecdd3' : isNeg ? '#bbf7d0' : undefined,
                                                        },
                                                        '& input': {
                                                            fontWeight: parsedAmount !== 0 ? 700 : 500,
                                                            color: isPos ? '#be123c' : isNeg ? '#15803d' : '#0f172a',
                                                        },
                                                    }}
                                                />
                                            </Grid>

                                            {/* Col 3: Reason input */}
                                            <Grid size={{ xs: 10, sm: 3.5, md: 4.3 }}>
                                                <TextField
                                                    label="Diễn giải / Lý do"
                                                    size="small"
                                                    fullWidth
                                                    disabled={isAuto}
                                                    value={row.additionalCostReason}
                                                    onChange={(e) =>
                                                        setAdditionalCostRows((rows) =>
                                                            rows.map((item) =>
                                                                item.key === row.key ? { ...item, additionalCostReason: e.target.value } : item
                                                            )
                                                        )
                                                    }
                                                    placeholder={`Ví dụ: Phí ship ngày ${index + 1}...`}
                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                                />
                                            </Grid>

                                            {/* Col 4: Delete button */}
                                            <Grid size={{ xs: 2, sm: 0.5, md: 0.7 }} sx={{ textAlign: 'center' }}>
                                                <Tooltip title={isAuto ? 'Khoản tự động từ chênh lệch thanh toán biên lai' : 'Xóa dòng này'} arrow>
                                                    <span>
                                                    <IconButton
                                                        size="small"
                                                        aria-label="Xóa dòng chi phí"
                                                        disabled={isAuto}
                                                        onClick={() =>
                                                            setAdditionalCostRows((rows) => rows.filter((item) => item.key !== row.key))
                                                        }
                                                        sx={{
                                                            color: '#dc2626',
                                                            bgcolor: '#fee2e2',
                                                            borderRadius: '8px',
                                                            width: 34,
                                                            height: 34,
                                                            '&:hover': {
                                                                bgcolor: '#fecaca',
                                                                color: '#b91c1c',
                                                            },
                                                        }}
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                        {row.additionalCostType === 'OTHER' && (
                                            <TextField
                                                label="Tên khoản chi phí"
                                                size="small"
                                                fullWidth
                                                required
                                                value={row.additionalCostCustomName}
                                                onChange={(e) =>
                                                    setAdditionalCostRows((rows) =>
                                                        rows.map((item) =>
                                                            item.key === row.key
                                                                ? { ...item, additionalCostCustomName: e.target.value }
                                                                : item
                                                        )
                                                    )
                                                }
                                                placeholder={isAuto ? 'Bắt buộc — tên khoản chi phí phát sinh ngoài kỳ' : 'Nhập tên khoản chi phí tùy chọn'}
                                                sx={{ mt: 1.25, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                            />
                                        )}
                                    </Paper>
                                );
                            })}

                            {/* Summary Bar for Additional Costs */}
                            {additionalCostTotal !== 0 && (
                                <Box
                                    sx={{
                                        p: 1.25,
                                        px: 2,
                                        borderRadius: '10px',
                                        bgcolor: additionalCostTotal > 0 ? '#fff1f2' : '#f0fdf4',
                                        border: `1px solid ${additionalCostTotal > 0 ? '#fecdd3' : '#bbf7d0'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={700} sx={{ color: additionalCostTotal > 0 ? '#be123c' : '#15803d', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                        Tổng chi phí / điều chỉnh phát sinh ({additionalCostRows.length} khoản):
                                    </Typography>

                                    <Chip
                                        size="small"
                                        icon={additionalCostTotal > 0 ? <TrendingUpOutlinedIcon style={{ fontSize: '0.85rem', color: '#be123c' }} /> : <TrendingDownOutlinedIcon style={{ fontSize: '0.85rem', color: '#15803d' }} />}
                                        label={`${additionalCostTotal > 0 ? '+' : ''}${formatImportCost(additionalCostTotal)} VNĐ (${additionalCostTotal > 0 ? 'Tăng phải trả NCC' : 'Giảm trừ thanh toán'})`}
                                        sx={{
                                            height: 24,
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            bgcolor: '#ffffff',
                                            color: additionalCostTotal > 0 ? '#be123c' : '#15803d',
                                            border: `1px solid ${additionalCostTotal > 0 ? '#fecdd3' : '#bbf7d0'}`,
                                        }}
                                    />
                                </Box>
                            )}
                        </Stack>
                    )}
                </Paper>

                {/* Row 3: Ghi chú đối chiếu */}
                <TextField
                    label="Ghi chú đối chiếu"
                    fullWidth
                    size="small"
                    value={note}
                    placeholder="Nhập ghi chú hoặc diễn giải lý do điều chỉnh số liệu (nếu có)..."
                    onChange={(e) => setNote(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <EditNoteOutlinedIcon sx={{ color: '#64748b', fontSize: '1.2rem' }} />
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
            </Paper>

            {/* Block 3: 2-Column Section (Biên lai phiếu nhập & Biên lai đối soát NCC) */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ReceiptLongOutlinedIcon sx={{ color: '#2563eb', fontSize: '1.25rem' }} />
                    Ảnh chứng từ & Biên lai đối soát
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CompareArrowsOutlinedIcon />}
                    onClick={() => setCompareModalOpen(true)}
                    sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#1e293b',
                        borderColor: '#cbd5e1',
                        bgcolor: '#ffffff',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        '&:hover': {
                            bgcolor: '#f1f5f9',
                            borderColor: '#94a3b8',
                        },
                    }}
                >
                    So sánh 2 ảnh biên lai
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

            {/* Block 4: Validation Warning & Guidance */}
            {!hasAllRequiredInputs || isActualPaidEmpty || !hasReceipt || !hasAllImportReceipts || hasIncompleteAdditionalCost || isReturnLocked ? (
                <Alert
                    icon={<WarningAmberOutlinedIcon sx={{ color: '#dc2626' }} />}
                    severity="error"
                    sx={{
                        borderRadius: '12px',
                        mb: 3,
                        bgcolor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: '0.875rem',
                        '& .MuiAlert-message': {
                            fontWeight: 600,
                        },
                    }}
                >
                    {isReturnLocked ? (
                        <>Số liệu trả vé chưa thể đối chiếu vì phiếu trả vé chưa hoàn tất bàn giao. Vui lòng hoàn tất bàn giao phiếu trả trước khi xác nhận đối chiếu.</>
                    ) : hasIncompleteAdditionalCost ? (
                        <>Vui lòng nhập đủ số tiền, loại và lý do cho mỗi chi phí phát sinh, hoặc xóa dòng chưa dùng.</>
                    ) : isActualPaidEmpty ? (
                        <>Vui lòng nhập Giá trị thực trả từ biên lai (tổng tiền trên biên lai đối soát NCC).</>
                    ) : !hasAllImportReceipts ? (
                        <>
                            Bạn cần tải lên đầy đủ ảnh biên lai cho tất cả các phiếu nhập lô ({uploadedImportReceiptCount}/{importBatches.length} phiếu đã có).
                            {missingImportBatches.length > 0 && (
                                <>
                                    {' '}Vui lòng bấm chọn các tab phiếu còn thiếu (<strong>{missingImportBatches.map((b) => b.batchCode || `#${b.id}`).join(', ')}</strong>) ở khung bên trái để tải ảnh lên trước khi có thể bấm nút Xác nhận đối chiếu.
                                </>
                            )}
                        </>
                    ) : !hasAllRequiredInputs && !hasReceipt ? (
                        <>Vui lòng nhập đầy đủ SL nhập, SL trả, Giá mỗi vé sau đối soát và tải lên ảnh biên lai NCC để tiếp tục.</>
                    ) : !hasAllRequiredInputs && hasReceipt ? (
                        <>Vui lòng nhập đầy đủ các ô số liệu thực tế còn trống (SL nhập, SL trả hoặc Giá mỗi vé sau đối soát).</>
                    ) : (
                        <>Bạn cần tải lên ảnh biên lai đối soát của Nhà cung cấp (mục có dấu *) trước khi có thể bấm nút Xác nhận đối chiếu.</>
                    )}
                </Alert>
            ) : (
                <Alert
                    icon={<InfoOutlinedIcon sx={{ color: '#0284c7' }} />}
                    severity="info"
                    sx={{
                        borderRadius: '12px',
                        mb: 3,
                        bgcolor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        color: '#0369a1',
                        fontSize: '0.875rem',
                        '& .MuiAlert-message': {
                            fontWeight: 500,
                        },
                    }}
                >
                    Sau khi xác nhận, hệ thống so sánh từng cặp số liệu nhập / trả riêng biệt và định tuyến vào quy trình xử lý chênh lệch nếu phát hiện bất kỳ sai lệch nào.
                </Alert>
            )}

            {/* Block 5: Action Button */}
            <Stack direction="row" justifyContent="flex-end" alignItems="center">
                <Tooltip
                    title={
                        isReturnLocked
                            ? 'Vui lòng hoàn tất bàn giao phiếu trả vé trước khi đối chiếu số liệu trả'
                            : !hasAllRequiredInputs
                            ? 'Vui lòng nhập đầy đủ các ô số liệu thực tế'
                            : isActualPaidEmpty
                            ? 'Vui lòng nhập Giá trị thực trả từ biên lai'
                            : hasIncompleteAdditionalCost
                            ? 'Vui lòng hoàn tất hoặc xóa các dòng chi phí phát sinh còn thiếu'
                            : !hasAllImportReceipts
                            ? 'Vui lòng tải lên ảnh biên lai phiếu nhập lô để tiếp tục'
                            : !hasReceipt
                            ? 'Vui lòng tải lên ảnh biên lai NCC để tiếp tục'
                            : ''
                    }
                >
                    <span>
                        <Button
                            variant="contained"
                            disabled={!canSubmit}
                            onClick={handleSubmit}
                            startIcon={!isSubmitting ? <CheckCircleOutlinedIcon /> : undefined}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 800,
                                borderRadius: '10px',
                                px: 3.5,
                                py: 1.1,
                                fontSize: '0.925rem',
                                ...(!canSubmit && {
                                    bgcolor: 'rgba(145, 158, 171, 0.24) !important',
                                    color: 'rgba(145, 158, 171, 0.8) !important',
                                    cursor: 'not-allowed !important',
                                    boxShadow: 'none !important',
                                    opacity: 0.6,
                                }),
                            }}
                            className="btn-primary-admin"
                        >
                            {isSubmitting ? 'Đang đối chiếu...' : 'Xác nhận đối chiếu'}
                        </Button>
                    </span>
                </Tooltip>
            </Stack>

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
                                        1. Biên lai phiếu nhập lô ({importBatches.length})
                                    </Typography>
                                    {selectedImportReceiptUrl ? (
                                        <Chip size="small" label="Có ảnh biên lai" sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: '0.725rem', border: '1px solid #bbf7d0' }} />
                                    ) : (
                                        <Chip size="small" label="Chưa có ảnh" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: '0.725rem' }} />
                                    )}
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
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}
                                >
                                    {selectedImportReceiptUrl ? (
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
        </Box>
    );
};
