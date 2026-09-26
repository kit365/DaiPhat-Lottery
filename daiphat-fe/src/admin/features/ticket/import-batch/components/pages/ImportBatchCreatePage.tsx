"use client";

import {
    Alert,
    Box,
    Chip,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    TextField,
    ThemeProvider,
    Typography,
    useTheme,
    createTheme,
    Paper,
    ButtonBase,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { AdminDatePicker } from '../../../../../components/ui/AdminDatePicker';
import { SelectSingle } from '../../../../../components/ui/SelectSingle';
import { Button as LoadingButton } from '../../../../../components/ui/Button';
import { Button } from '../../../../../components/ui/Button';
import { ImportBatchReceiptField } from '../sections/ImportBatchReceiptField';
import { uploadImportBatchInvoiceEvidence } from '../../services/importBatchService';
import { axiosRequestErrorMessage } from '../../../../../../api/requestError';
import { isAxiosError } from 'axios';
import type { Accept } from 'react-dropzone';
import { ImportBatchTicketListImagesField } from '../sections/ImportBatchTicketListImagesField';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useCreateImportBatch, useEligibleImportBatchStations } from '../../hooks/useImportBatch';
import { useActiveSuppliers } from '../../../../supplier';
import { formatSupplierTime } from '../../../../supplier/utils/supplierTimeFields';
import { createImportBatchSchema, CreateImportBatchFormValues } from '../../schemas/importBatch.schema';
import { ImportBatchConfirmDialog } from '../sections/ImportBatchConfirmDialog';
import { ImportBatchDuplicateWarningDialog } from '../sections/ImportBatchDuplicateWarningDialog';
import { ImportBatchLineRow } from '../sections/ImportBatchLineRow';
import {
    getDefaultInitialDrawDate,
    getDrawDateInputBounds,
    isDrawDateToday,
    resolveImportModeLock,
} from '../../utils/importBatchDrawDate';
import { useImportBatchIntakeGate } from '../../hooks/useImportBatchIntakeGate';
import { ImportBatchDeclaredQuantityProgress } from '../sections/ImportBatchDeclaredQuantityProgress';
import {
    declaredQuantitiesMatch,
    sumImportBatchLineDeclaredQuantity,
} from '../../utils/importBatchDeclaredQuantity';
import { formatViInteger, parseNonNegativeIntegerInput } from '../../../../supplier';
import { computeImportBatchTotals } from '../../utils/importBatchTotals';
import { formatImportCost } from '../../utils/importCostCalculator';
import { computeImportBatchRowLimit, IMPORT_BATCH_ROW_LIMIT_MESSAGE } from '../../utils/importBatchRowLimit';
import type { ImportBatch, ImportBatchEligibleStation } from '../../types/importBatch.type';
import { useImportBatchCreateDraft } from '../../hooks/useImportBatchCreateDraft';
import { readLocalImportBatchCreateDraft } from '../../utils/importBatchCreateDraft';
import { transferCreateFormToEditDraft } from '../../utils/importBatchEditDraft';
import {
    hasInvoiceEvidence,
    isPersistableInvoiceEvidenceUrl,
    resolveInvoiceEvidenceUrl,
} from '../../utils/invoiceEvidence';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { toast } from 'react-toastify';
import { confirmDelete } from '../../../../../utils/swal';
import dayjs from 'dayjs';
import { OCR_IMPORT_DRAFT_KEY } from '../../../ocr-import/types/ticketOcr.type';

const IMPORT_EVIDENCE_ACCEPT: Accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    'application/pdf': ['.pdf'],
    'text/csv': ['.csv'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
};

const emptyLine = () => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 0,
    resolvedBatchType: undefined as CreateImportBatchFormValues['lines'][0]['resolvedBatchType'],
});

const buildDefaultFormValues = (initialDrawDate?: string): CreateImportBatchFormValues => ({
    drawDate: initialDrawDate || getDefaultInitialDrawDate(),
    supplierId: 0,
    importMode: 'IN_DAY',
    totalDeclareQuantity: 0,
    invoiceEvidenceUrl: '',
    ticketListImageUrls: [],
    lines: [emptyLine()],
});

const CREATE_IMPORT_BATCH_TIMEOUT_MESSAGE =
    'Tạo phiếu nhập lô mất quá nhiều thời gian. Vui lòng kiểm tra danh sách phiếu nhập trước khi bấm xác nhận lại.';

export const ImportBatchCreatePage = () => {
    const router = useAdminRouter();
    const searchParams = useSearchParams();
    const returnToOcrImport =
        searchParams?.get('returnTo') === 'ocr-import' &&
        (searchParams?.get('draftKey') === OCR_IMPORT_DRAFT_KEY || !searchParams?.get('draftKey'));

    const redirectAfterCreate = useCallback(
        (createdBatchId?: number | null) => {
            if (returnToOcrImport) {
                const params = new URLSearchParams({
                    returnTo: 'ocr-import',
                    draftKey: OCR_IMPORT_DRAFT_KEY,
                });
                if (createdBatchId != null) {
                    params.set('selectedImportBatchId', String(createdBatchId));
                }
                router.push(`${ROUTES.ADMIN.IMPORT_BATCH.LIST}?${params.toString()}`);
                return;
            }
            router.push(ROUTES.ADMIN.IMPORT_BATCH.LIST);
        },
        [returnToOcrImport, router]
    );

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<CreateImportBatchFormValues | null>(null);
    const [duplicateOpen, setDuplicateOpen] = useState(false);
    const [duplicateExistingBatch, setDuplicateExistingBatch] = useState<ImportBatch | null>(null);
    const [scanDialogOpen, setScanDialogOpen] = useState(false);
    const [scanSessionCode, setScanSessionCode] = useState('');
    const [formInitialized, setFormInitialized] = useState(false);
    const formInitializedRef = useRef(false);
    const outerTheme = useTheme();

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        getValues,
        formState: { errors, isSubmitted },
    } = useForm<CreateImportBatchFormValues>({
        resolver: zodResolver(createImportBatchSchema) as unknown as Resolver<CreateImportBatchFormValues>,
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: buildDefaultFormValues(),
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
    const drawDate = useWatch({ control, name: 'drawDate' });
    const importMode = useWatch({ control, name: 'importMode' });
    const supplierId = useWatch({ control, name: 'supplierId' });
    const totalDeclareQuantity = useWatch({ control, name: 'totalDeclareQuantity' });
    const invoiceEvidenceUrl = useWatch({ control, name: 'invoiceEvidenceUrl' });
    const ticketListImageUrls = useWatch({ control, name: 'ticketListImageUrls' }) ?? [];
    const lines = useWatch({ control, name: 'lines' }) ?? [];

    const { evaluate: evaluateIntake } = useImportBatchIntakeGate();

    const { data: stationsResult, isLoading: isLoadingStations } = useEligibleImportBatchStations(
        drawDate,
        importMode
    );
    const eligibleStations = stationsResult?.eligible ?? [];
    const blockedStations = stationsResult?.blocked ?? [];
    const drawDateBounds = getDrawDateInputBounds();
    const { data: activeSuppliers = [], isLoading: isLoadingSuppliers } = useActiveSuppliers();
    const { mutateAsync: createAsync, isPending } = useCreateImportBatch();
    const [isSaving, setIsSaving] = useState(false);
    const [isReceiptUploading, setIsReceiptUploading] = useState(false);
    const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);

    const uploadReceipt = useCallback(async (file: File) => {
        try {
            const url = await uploadImportBatchInvoiceEvidence(file);
            setReceiptUploadError(null);
            return url;
        } catch (err: unknown) {
            const message = axiosRequestErrorMessage(
                err,
                'Tải tệp biên lai thất bại.',
                'Tải tệp biên lai mất quá nhiều thời gian. Vui lòng thử lại với tệp nhỏ hơn hoặc kiểm tra kết nối mạng.'
            );
            setReceiptUploadError(message);
            throw err instanceof Error ? err : new Error(message);
        }
    }, []);

    const buildCreatePayload = async (formData: CreateImportBatchFormValues, forceCreate?: boolean) => {
        let invoiceEvidenceUrl: string | undefined;
        try {
            invoiceEvidenceUrl =
                formData.importMode === 'IN_DAY'
                    ? await resolveInvoiceEvidenceUrl(formData.invoiceEvidenceUrl, uploadReceipt)
                    : undefined;
        } catch (err: unknown) {
            const message = axiosRequestErrorMessage(
                err,
                'Tải tệp biên lai thất bại.',
                'Tải tệp biên lai mất quá nhiều thời gian. Vui lòng thử lại với tệp nhỏ hơn hoặc kiểm tra kết nối mạng.'
            );
            throw err instanceof Error ? err : new Error(message);
        }

        if (formData.importMode === 'IN_DAY' && !invoiceEvidenceUrl) {
            throw new Error('Vui lòng tải tệp / ảnh biên lai thành công trước khi xác nhận.');
        }

        const ticketListImageUrls = (formData.ticketListImageUrls ?? []).filter(Boolean);
        if (ticketListImageUrls.length < 1) {
            throw new Error('Vui lòng tải lên ít nhất một ảnh hoặc tệp danh sách vé nhập.');
        }

        return {
            drawDate: formData.drawDate,
            supplierId: formData.supplierId,
            importMode: formData.importMode,
            totalDeclareQuantity: formData.totalDeclareQuantity,
            ...(forceCreate ? { forceCreate: true } : {}),
            invoiceEvidenceUrl,
            ticketListImageUrls,
            lines: formData.lines.map((line) => ({
                lotteryStationId: line.lotteryStationId,
                declareQuantity: line.declareQuantity,
                importCost: line.importCost,
            })),
        };
    };

    const formSnapshot = useMemo(
        () => ({
            supplierId,
            drawDate,
            importMode,
            totalDeclareQuantity,
            invoiceEvidenceUrl,
            ticketListImageUrls,
            lines,
        }),
        [supplierId, drawDate, importMode, totalDeclareQuantity, invoiceEvidenceUrl, ticketListImageUrls, lines]
    );

    const { clearDraft } = useImportBatchCreateDraft({
        enabled: formInitialized && activeSuppliers.length > 0,
        getValues,
        formSnapshot,
    });

    useEffect(() => {
        if (isLoadingSuppliers || formInitializedRef.current) {
            return;
        }

        const localDraft = readLocalImportBatchCreateDraft();
        const paramSupplierId = searchParams?.get('supplierId') ? Number(searchParams.get('supplierId')) : 0;
        const defaultValues = buildDefaultFormValues();
        if (paramSupplierId && !localDraft) {
            defaultValues.supplierId = paramSupplierId;
        }
        const values = localDraft?.values ?? defaultValues;
        const restoredValues: CreateImportBatchFormValues = {
            ...values,
            supplierId: (returnToOcrImport && paramSupplierId) ? paramSupplierId : (values.supplierId || paramSupplierId || 0),
            lines: values.lines?.length > 0 ? values.lines : [emptyLine()],
        };

        reset(restoredValues, { keepDirty: false, keepTouched: false, keepErrors: false });
        formInitializedRef.current = true;
        setFormInitialized(true);

        if (localDraft && !returnToOcrImport) {
            toast.info('Đã khôi phục bản nháp chỉnh sửa chưa lưu.');
        }
    }, [isLoadingSuppliers, reset, searchParams, returnToOcrImport]);

    const eligibleStationIds = useMemo(
        () => new Set(eligibleStations.map((s) => s.lotteryStationId)),
        [eligibleStations]
    );

    const eligibleStationIdsKey = useMemo(
        () =>
            eligibleStations
                .map((s) => s.lotteryStationId)
                .sort((a, b) => a - b)
                .join(','),
        [eligibleStations]
    );

    const displayEligibleStations = useMemo(() => {
        const stationMap = new Map<number, ImportBatchEligibleStation>(
            eligibleStations.map((station) => [station.lotteryStationId, station])
        );

        lines.forEach((line) => {
            const stationId = line.lotteryStationId;
            if (!stationId || stationId < 1 || stationMap.has(stationId)) {
                return;
            }

            stationMap.set(stationId, {
                lotteryStationId: stationId,
                name: line.stationName ?? `Đài #${stationId}`,
                resolvedBatchType: line.resolvedBatchType ?? 'NEW',
            });
        });

        return Array.from(stationMap.values());
    }, [eligibleStations, lines]);

    const resolveStationName = (stationId: number) => {
        const station = displayEligibleStations.find((s) => s.lotteryStationId === stationId);
        return station?.name ?? '';
    };

    const resolveSupplierName = (id: number) => {
        const supplier = activeSuppliers.find((s) => s.id === id);
        return supplier ? `${supplier.name} (${supplier.code})` : '';
    };

    const selectedSupplier = useMemo(
        () => activeSuppliers.find((supplier) => supplier.id === supplierId),
        [activeSuppliers, supplierId]
    );

    const intakeGate = useMemo(
        () => evaluateIntake(selectedSupplier, drawDate),
        [evaluateIntake, selectedSupplier, drawDate]
    );

    const isImportAllowBlocked = intakeGate.notYetAllowed;
    const isReturnCutOffBlocked = intakeGate.blocked;
    const isReturnCutOffWarning = intakeGate.warning;
    const isFormBlocked = isImportAllowBlocked || isReturnCutOffBlocked;
    const canShowBatchFields = !isImportAllowBlocked && !isReturnCutOffBlocked;

    useEffect(() => {
        if (!formInitialized || !selectedSupplier) {
            return;
        }
        const currentDrawDate = getValues('drawDate');
        if (
            isDrawDateToday(currentDrawDate) &&
            evaluateIntake(selectedSupplier, currentDrawDate).blocked
        ) {
            setValue('drawDate', dayjs().add(1, 'day').format('YYYY-MM-DD'), {
                shouldValidate: true,
            });
        }
    }, [selectedSupplier, formInitialized, getValues, evaluateIntake, setValue]);

    const importModeLock = useMemo(() => resolveImportModeLock(drawDate), [drawDate]);

    const allStationsDraftBlocked =
        !!drawDate &&
        !isLoadingStations &&
        importMode === 'IN_DAY' &&
        isDrawDateToday(drawDate) &&
        eligibleStations.length === 0 &&
        blockedStations.length > 0;

    const noEligibleStations =
        !!drawDate && !isLoadingStations && eligibleStations.length === 0;

    const drawDateHelperText =
        errors.drawDate?.message ??
        (allStationsDraftBlocked
            ? 'Tất cả nhà đài trong ngày quay đã có phiếu nhập nháp. Vui lòng hoàn tất các phiếu hiện tại hoặc chọn ngày quay khác.'
            : noEligibleStations
                ? 'Không có nhà đài nào phù hợp với ngày quay đã chọn.'
                : undefined);

    // Shared receipt is required for in-day imports (NEW).
    const showSharedReceipt = importMode === 'IN_DAY';

    useEffect(() => {
        if (!importModeLock.locked || importMode === importModeLock.mode) {
            return;
        }
        setValue('importMode', importModeLock.mode, { shouldValidate: true });
    }, [importModeLock, importMode, setValue]);

    // Clear stations that became ineligible when draw date / import mode changes.
    // Skip while stations are loading so restored draft values are not wiped.
    useEffect(() => {
        if (!formInitialized || isLoadingStations) {
            return;
        }

        const currentLines = getValues('lines');
        currentLines.forEach((line, index) => {
            if (!line.lotteryStationId || eligibleStationIds.has(line.lotteryStationId)) {
                return;
            }
            setValue(`lines.${index}.lotteryStationId`, 0, { shouldValidate: false });
            setValue(`lines.${index}.resolvedBatchType`, undefined, { shouldValidate: false });
            setValue(`lines.${index}.stationName`, undefined, { shouldValidate: false });
        });
    }, [eligibleStationIdsKey, eligibleStationIds, formInitialized, getValues, isLoadingStations, setValue]);

    useEffect(() => {
        if (!formInitialized || isLoadingStations) {
            return;
        }

        const currentLines = getValues('lines');
        currentLines.forEach((line, index) => {
            if (!line.lotteryStationId || line.lotteryStationId < 1) {
                return;
            }

            const station = eligibleStations.find(
                (entry) => entry.lotteryStationId === line.lotteryStationId
            );
            if (!station) {
                return;
            }

            if (!line.resolvedBatchType) {
                setValue(`lines.${index}.resolvedBatchType`, station.resolvedBatchType, {
                    shouldDirty: false,
                    shouldValidate: false,
                });
            }
            if (!line.stationName) {
                setValue(`lines.${index}.stationName`, station.name, {
                    shouldDirty: false,
                    shouldValidate: false,
                });
            }
        });
    }, [eligibleStationIdsKey, eligibleStations, formInitialized, getValues, isLoadingStations, setValue]);

    const { isAtRowLimit, canAddRow } = useMemo(
        () => computeImportBatchRowLimit(eligibleStations, lines),
        [eligibleStations, lines]
    );

    const canSubmit =
        eligibleStations.length > 0 &&
        lines.some((line) => line.lotteryStationId && eligibleStationIds.has(line.lotteryStationId)) &&
        declaredQuantitiesMatch(totalDeclareQuantity ?? 0, lines) &&
        (!showSharedReceipt ||
            (hasInvoiceEvidence(invoiceEvidenceUrl) &&
                !isReceiptUploading &&
                !receiptUploadError)) &&
        ticketListImageUrls.length > 0;

    const totals = computeImportBatchTotals(lines);
    const linesDeclaredQuantity = sumImportBatchLineDeclaredQuantity(lines);

    useEffect(() => {
        if (formInitialized) {
            setValue('totalDeclareQuantity', linesDeclaredQuantity, {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
    }, [linesDeclaredQuantity, formInitialized, setValue]);

    const confirmTotals = pendingFormData
        ? computeImportBatchTotals(pendingFormData.lines)
        : totals;

    const selectedStationIdsByRow = useMemo(
        () =>
            (lines ?? []).map((_, rowIndex) =>
                (lines ?? [])
                    .map((line, index) => (index !== rowIndex ? Number(line?.lotteryStationId) || 0 : 0))
                    .filter((stationId) => Number(stationId) > 0)
            ),
        [lines]
    );

    const localTheme = useMemo(
        () =>
            createTheme(outerTheme, {
                components: {
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none !important',
                                backdropFilter: 'none !important',
                                backgroundColor: 'var(--palette-background-paper) !important',
                                boxShadow: 'var(--customShadows-card)',
                                borderRadius: 'var(--shape-borderRadius-lg)',
                                color: 'var(--palette-text-primary)',
                            },
                        },
                    },
                    MuiInputLabel: {
                        styleOverrides: {
                            root: { fontSize: '0.875rem' },
                        },
                    },
                    MuiOutlinedInput: {
                        styleOverrides: {
                            root: { fontSize: '1rem' },
                        },
                    },
                },
            }),
        [outerTheme]
    );

    const onSubmit = (data: CreateImportBatchFormValues) => {
        if (isFormBlocked) {
            if (isImportAllowBlocked) {
                toast.error('Chưa đến giờ cho phép nhập vé của nhà cung cấp đã chọn.');
            } else {
                toast.error(
                    intakeGate.message ??
                    'Đã qua giờ cho phép nhập lô. Không thể tạo phiếu nhập lô mới cho kỳ quay hôm nay.'
                );
            }
            return;
        }
        if (!canSubmit) {
            if (
                showSharedReceipt &&
                (!hasInvoiceEvidence(invoiceEvidenceUrl) ||
                    isReceiptUploading ||
                    !!receiptUploadError)
            ) {
                toast.error(
                    receiptUploadError ||
                    'Vui lòng tải ảnh biên lai thành công trước khi xác nhận.'
                );
                return;
            }
            if (ticketListImageUrls.length === 0) {
                toast.error('Vui lòng tải lên ít nhất một ảnh hoặc tệp danh sách vé nhập.');
                return;
            }
            toast.error('Vui lòng chọn nhà đài hợp lệ cho ngày quay đã chọn.');
            return;
        }
        const enriched: CreateImportBatchFormValues = {
            ...data,
            lines: data.lines.map((line) => {
                const station = eligibleStations.find(
                    (s) => s.lotteryStationId === line.lotteryStationId
                );
                const resolvedBatchType =
                    line.resolvedBatchType ?? station?.resolvedBatchType;
                return { ...line, resolvedBatchType };
            }),
        };
        setPendingFormData(enriched);
        setConfirmOpen(true);
    };

    const handleCloseConfirm = () => {
        setConfirmOpen(false);
        setPendingFormData(null);
    };

    const handleCloseDuplicate = () => {
        setDuplicateOpen(false);
        setDuplicateExistingBatch(null);
    };

    const handleContinueExistingBatch = () => {
        if (!duplicateExistingBatch) return;

        const createValues = pendingFormData ?? getValues();
        transferCreateFormToEditDraft(
            duplicateExistingBatch.id,
            createValues,
            duplicateExistingBatch
        );

        handleCloseDuplicate();
        setConfirmOpen(false);
        setPendingFormData(null);
        clearDraft();
        if (returnToOcrImport) {
            redirectAfterCreate(duplicateExistingBatch.id);
            return;
        }
        router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(duplicateExistingBatch.id));
    };

    const handleCreateNewAnyway = async () => {
        if (!pendingFormData) return;

        try {
            setIsSaving(true);
            const res = await createAsync(await buildCreatePayload(pendingFormData, true));

            if (res.success) {
                clearDraft();
                toast.success(res.message || 'Tạo phiếu nhập lô thành công.');
                setConfirmOpen(false);
                setPendingFormData(null);
                handleCloseDuplicate();
                redirectAfterCreate(res.data?.id ?? null);
            } else {
                toast.error(res.message || 'Tạo phiếu nhập lô thất bại.');
            }
        } catch (err: unknown) {
            toast.error(
                axiosRequestErrorMessage(
                    err,
                    'Tạo phiếu nhập lô thất bại.',
                    CREATE_IMPORT_BATCH_TIMEOUT_MESSAGE
                )
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmCreate = async () => {
        if (!pendingFormData) return;

        try {
            setIsSaving(true);
            const res = await createAsync(await buildCreatePayload(pendingFormData));

            if (res.success) {
                clearDraft();
                toast.success(res.message || 'Tạo phiếu nhập lô thành công.');
                setConfirmOpen(false);
                setPendingFormData(null);
                redirectAfterCreate(res.data?.id ?? null);
            } else {
                toast.error(res.message || 'Tạo phiếu nhập lô thất bại.');
            }
        } catch (err: unknown) {
            const status = isAxiosError(err) ? err.response?.status : undefined;
            const existingBatch = isAxiosError(err)
                ? (err.response?.data as { data?: unknown } | undefined)?.data ?? null
                : null;

            if (status === 409 && existingBatch) {
                setDuplicateExistingBatch(existingBatch as ImportBatch);
                setDuplicateOpen(true);
                setConfirmOpen(false);
                return;
            }

            toast.error(
                axiosRequestErrorMessage(
                    err,
                    'Tạo phiếu nhập lô thất bại.',
                    CREATE_IMPORT_BATCH_TIMEOUT_MESSAGE
                )
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        clearDraft();
        if (returnToOcrImport) {
            redirectAfterCreate(null);
            return;
        }
        router.push(ROUTES.ADMIN.IMPORT_BATCH.LIST);
    };

    if (isLoadingSuppliers) {
        return null;
    }

    if (activeSuppliers.length === 0) {
        return (
            <ThemeProvider theme={localTheme}>
                <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                    <Title title="Khai báo phiếu nhập lô vé" />
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                            { label: 'Khai báo phiếu nhập' },
                        ]}
                    />

                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Chưa có nhà cung cấp. Vui lòng tạo nhà cung cấp trước khi nhập vé.
                    </Alert>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                            variant="contained"
                            className="btn-primary-admin"
                            onClick={() => router.push(ROUTES.ADMIN.SUPPLIER.CREATE)}
                        >
                            Tạo nhà cung cấp
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => router.push(ROUTES.ADMIN.SUPPLIER.LIST)}
                        >
                            Quản lý nhà cung cấp
                        </Button>
                    </Stack>
                </Box>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={localTheme}>
            <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
                {/* ── Header ── */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1.5,
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Title title="Khai báo phiếu nhập lô vé" disableBottomMargin />
                    <Stack direction="row" spacing={1.5}>
                        <LoadingButton
                            type="submit"
                            form="import-batch-create-form"
                            variant="contained"
                            loading={isPending || isSaving}
                            disabled={
                                !canSubmit ||
                                isLoadingStations ||
                                isLoadingSuppliers ||
                                !supplierId ||
                                isSaving ||
                                isFormBlocked ||
                                isReceiptUploading
                            }
                            startIcon={<SaveOutlinedIcon />}
                            sx={{
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 800,
                                px: 3,
                                py: 1.1,
                                bgcolor: '#FF3030',
                                color: '#ffffff',
                                boxShadow: '0 4px 14px rgba(255, 48, 48, 0.3)',
                                '&:hover': { bgcolor: '#e02828' },
                            }}
                        >
                            {isPending || isSaving ? 'Đang lưu...' : 'Xác nhận & Lưu'}
                        </LoadingButton>
                        <Button variant="outlined" onClick={handleCancel} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
                            Hủy
                        </Button>
                    </Stack>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                            { label: 'Khai báo phiếu nhập' },
                        ]}
                    />
                </Box>

                <form id="import-batch-create-form" onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={3}>

                        {/* ── Card 1: Thông tin phiếu nhập lô & Chứng từ ── */}
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            {/* Card header */}
                            <Box
                                sx={{
                                    px: 3,
                                    pt: 3,
                                    pb: 1,
                                }}
                            >
                                <Typography variant="h6" fontWeight={700} color="text.primary">
                                    Thông tin phiếu nhập lô
                                </Typography>
                            </Box>

                            {/* Card body */}
                            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                                <Grid container spacing={2.5}>
                                    {/* Input 1: Nhà cung cấp */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="supplierId"
                                            control={control}
                                            render={({ field }) => (
                                                <SelectSingle
                                                    label="Nhà cung cấp *"
                                                    {...field}
                                                    value={field.value ? String(field.value) : ''}
                                                    onChange={(val) => field.onChange(val ? Number(val) : '')}
                                                    disabled={isLoadingSuppliers || activeSuppliers.length === 0}
                                                    error={isSubmitted && !!errors.supplierId}
                                                    helperText={isSubmitted && errors.supplierId ? errors.supplierId.message : undefined}
                                                    sx={{ width: '100%' }}
                                                    options={activeSuppliers.map(s => ({
                                                        value: String(s.id),
                                                        label: `${s.name} (${s.code})`
                                                    }))}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    {/* Input 2: Ngày quay */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="drawDate"
                                            control={control}
                                            render={({ field }) => (
                                                <AdminDatePicker
                                                    label="Ngày quay *"
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                    min={drawDateBounds.min}
                                                    max={drawDateBounds.max}
                                                    error={isSubmitted && !!errors.drawDate}
                                                    helperText={
                                                        (isSubmitted && errors.drawDate?.message) ||
                                                        drawDateHelperText ||
                                                        undefined
                                                    }
                                                    helperTextColor={
                                                        errors.drawDate
                                                            ? 'error'
                                                            : noEligibleStations || allStationsDraftBlocked
                                                                ? 'warning'
                                                                : 'default'
                                                    }
                                                />
                                            )}
                                        />
                                    </Grid>

                                    {/* Supplier import-blocked alert */}
                                    {isImportAllowBlocked && (
                                        <Grid size={{ xs: 12 }}>
                                            <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                                                Chưa đến giờ cho phép nhập vé của nhà cung cấp này
                                                ({formatSupplierTime(selectedSupplier?.importAllowFrom)}).
                                                Vui lòng đợi đến giờ mở cửa hoặc chọn nhà cung cấp khác.
                                            </Alert>
                                        </Grid>
                                    )}

                                    {/* Return cut-off alerts */}
                                    {isReturnCutOffBlocked && (
                                        <Grid size={{ xs: 12 }}>
                                            <Alert severity="error" sx={{ borderRadius: '10px' }}>
                                                {intakeGate.message}
                                                {' '}
                                                Vui lòng chọn ngày quay ngày mai hoặc đợi kỳ quay khác.
                                            </Alert>
                                        </Grid>
                                    )}

                                    {isReturnCutOffWarning && (
                                        <Grid size={{ xs: 12 }}>
                                            <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                                                Sắp đến giờ kiểm vé chuẩn bị trả (
                                                {intakeGate.inspectionStartLabel ?? '—'}).
                                                Sau mốc này sẽ không thể nhập thêm vé cho kỳ quay hôm nay
                                                (giờ chốt trả vé: {intakeGate.returnCutOffLabel ?? '—'}).
                                            </Alert>
                                        </Grid>
                                    )}

                                    {/* Section Divider: Chứng từ & Biên lai đính kèm */}
                                    <Grid size={{ xs: 12 }}>
                                        <Box sx={{ mt: 1, pt: 2.5, borderTop: '1px solid #f1f5f9' }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 0.25 }}>
                                                Chứng từ & Biên lai đối soát NCC
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                                Đính kèm biên lai xác nhận và bảng kê chi tiết danh sách vé nhập từ nhà cung cấp
                                            </Typography>

                                            <Grid container spacing={2.5}>
                                                {/* Cột 1: Biên lai phiếu nhập NCC */}
                                                {showSharedReceipt && (
                                                    <Grid size={{ xs: 12, md: 6 }}>
                                                        <Paper
                                                            variant="outlined"
                                                            sx={{
                                                                p: 2,
                                                                borderRadius: '12px',
                                                                borderColor: receiptUploadError ? '#fca5a5' : '#e2e8f0',
                                                                bgcolor: '#f8fafc',
                                                                height: '100%',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                ...(isFormBlocked && { opacity: 0.5, pointerEvents: 'none' }),
                                                            }}
                                                        >
                                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                                    Biên lai phiếu nhập NCC <Box component="span" color="error.main">*</Box>
                                                                </Typography>
                                                                <Chip
                                                                    size="small"
                                                                    label="Bắt buộc"
                                                                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 700, bgcolor: '#fee2e2', color: '#b91c1c' }}
                                                                />
                                                            </Stack>
                                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                                                Tệp ảnh hoặc PDF/Excel/CSV biên lai xác nhận từ nhà cung cấp
                                                            </Typography>

                                                            <Box sx={{ flex: 1 }}>
                                                                <Controller
                                                                    name="invoiceEvidenceUrl"
                                                                    control={control}
                                                                    render={({ field }) => (
                                                                        <ImportBatchReceiptField
                                                                            compact
                                                                            required
                                                                            value={typeof field.value === 'string' ? field.value : ''}
                                                                            onChange={(url) => {
                                                                                const next = typeof url === 'string' ? url : '';
                                                                                field.onChange(next);
                                                                                if (!next || isPersistableInvoiceEvidenceUrl(next)) {
                                                                                    setReceiptUploadError(null);
                                                                                }
                                                                            }}
                                                                            accept={IMPORT_EVIDENCE_ACCEPT}
                                                                            customUpload={uploadReceipt}
                                                                            onUploadingChange={setIsReceiptUploading}
                                                                            error={
                                                                                receiptUploadError ||
                                                                                (isSubmitted && !isFormBlocked ? errors.invoiceEvidenceUrl?.message : undefined)
                                                                            }
                                                                        />
                                                                    )}
                                                                />
                                                            </Box>
                                                        </Paper>
                                                    </Grid>
                                                )}

                                                {/* Cột 2: Danh sách vé nhập lô */}
                                                <Grid size={{ xs: 12, md: showSharedReceipt ? 6 : 12 }}>
                                                    <Paper
                                                        variant="outlined"
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: '12px',
                                                            borderColor: '#e2e8f0',
                                                            bgcolor: '#f8fafc',
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            ...(isFormBlocked && { opacity: 0.5, pointerEvents: 'none' }),
                                                        }}
                                                    >
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                                            <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                                Ảnh / Tệp danh sách vé nhập <Box component="span" color="error.main">*</Box>
                                                            </Typography>
                                                            <Chip
                                                                size="small"
                                                                label="Bắt buộc"
                                                                sx={{ height: 20, fontSize: '0.675rem', fontWeight: 700, bgcolor: '#fee2e2', color: '#b91c1c' }}
                                                            />
                                                        </Stack>
                                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                                            Ảnh hoặc tệp bảng kê chi tiết các cuốn/dãy vé (PDF, Excel, CSV)
                                                        </Typography>

                                                        <Box sx={{ flex: 1 }}>
                                                            <Controller
                                                                name="ticketListImageUrls"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <ImportBatchTicketListImagesField
                                                                        compact
                                                                        required
                                                                        value={field.value ?? []}
                                                                        onChange={field.onChange}
                                                                    />
                                                                )}
                                                            />
                                                            {isSubmitted && !isFormBlocked && errors.ticketListImageUrls?.message && (
                                                                <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                                                                    {errors.ticketListImageUrls.message}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Paper>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>

                        {/* ── Card 2: Danh sách nhà đài & Phân bổ số lượng ── */}
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                                ...(isFormBlocked && {
                                    opacity: 0.5,
                                    pointerEvents: 'none',
                                    filter: 'grayscale(0.2)',
                                    userSelect: 'none',
                                }),
                            }}
                        >
                            {/* Card header */}
                            <Box
                                sx={{
                                    px: 3,
                                    py: 2.25,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                    flexWrap: 'wrap',
                                    borderBottom: '1px solid #f1f5f9',
                                }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '12px',
                                            bgcolor: '#eff6ff',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <StorefrontOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                            Phân bổ số lượng nhập theo từng nhà đài
                                        </Typography>
                                        <Typography variant="body2" color="#64748b" sx={{ fontSize: '0.8125rem' }}>
                                            Chọn nhà đài và phân bổ số lượng vé nhập tương ứng cho kỳ quay
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                        if (canAddRow) {
                                            append(emptyLine());
                                        }
                                    }}
                                    disabled={!canAddRow || isLoadingStations || isFormBlocked}
                                    sx={{
                                        borderRadius: '9px',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        fontSize: '0.8125rem',
                                        borderColor: '#bfdbfe',
                                        color: '#1d4ed8',
                                        bgcolor: '#eff6ff',
                                        '&:hover': {
                                            bgcolor: '#dbeafe',
                                            borderColor: '#93c5fd',
                                            color: '#1e40af',
                                        },
                                    }}
                                >
                                    Thêm nhà đài
                                </Button>
                            </Box>



                            {/* Blocked stations info */}
                            {blockedStations.length > 0 && !isFormBlocked && (
                                <Box sx={{ px: 3, pt: 2.5 }}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: '12px',
                                            bgcolor: '#f0f9ff',
                                            border: '1px solid #bae6fd',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1.25,
                                        }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <InfoOutlinedIcon sx={{ color: '#0284c7', fontSize: '1.25rem' }} />
                                            <Typography variant="body2" fontWeight={700} color="#0369a1">
                                                Một số nhà đài trong kỳ quay này đã có phiếu nhập nháp:
                                            </Typography>
                                        </Stack>

                                        <Typography variant="caption" color="#0369a1" sx={{ mt: -0.5, opacity: 0.9 }}>
                                            Các nhà đài dưới đây đã được tạo phiếu nhập trước đó. Bạn có thể mở phiếu nháp hiện có để tiếp tục xử lý:
                                        </Typography>

                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: {
                                                    xs: '1fr',
                                                    sm: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                },
                                                gap: 1.25,
                                                mt: 0.25,
                                            }}
                                        >
                                            {blockedStations.map((station) => (
                                                <Paper
                                                    key={station.lotteryStationId}
                                                    elevation={0}
                                                    sx={{
                                                        p: 1.25,
                                                        px: 1.5,
                                                        borderRadius: '10px',
                                                        border: '1px solid #bae6fd',
                                                        bgcolor: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 1.25,
                                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                                                    }}
                                                >
                                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                                        <Box
                                                            sx={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: '50%',
                                                                bgcolor: '#0284c7',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight={700}
                                                            color="#0f172a"
                                                            noWrap
                                                            title={station.name}
                                                        >
                                                            {station.name}
                                                        </Typography>
                                                    </Stack>

                                                    {station.existingDraftBatchId && (
                                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                                                            <Chip
                                                                size="small"
                                                                label={`Phiếu #${station.existingDraftBatchId}`}
                                                                sx={{
                                                                    height: 22,
                                                                    fontSize: '0.725rem',
                                                                    fontWeight: 700,
                                                                    fontFamily: 'monospace',
                                                                    bgcolor: '#f0f9ff',
                                                                    color: '#0369a1',
                                                                    border: '1px solid #e0f2fe',
                                                                }}
                                                            />
                                                            <ButtonBase
                                                                onClick={() =>
                                                                    router.push(
                                                                        ROUTES.ADMIN.IMPORT_BATCH.DETAIL(
                                                                            station.existingDraftBatchId!
                                                                        )
                                                                    )
                                                                }
                                                                sx={{
                                                                    height: 24,
                                                                    px: 1,
                                                                    fontSize: '0.725rem',
                                                                    fontWeight: 700,
                                                                    borderRadius: '6px',
                                                                    color: '#0284c7',
                                                                    bgcolor: '#f0f9ff',
                                                                    border: '1px solid #bae6fd',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5,
                                                                    transition: 'all 0.15s ease',
                                                                    '&:hover': {
                                                                        bgcolor: '#e0f2fe',
                                                                        borderColor: '#7dd3fc',
                                                                        color: '#0369a1',
                                                                    },
                                                                }}
                                                            >
                                                                <span>Xem phiếu</span>
                                                                <ArrowForwardOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                                                            </ButtonBase>
                                                        </Stack>
                                                    )}
                                                </Paper>
                                            ))}
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {/* Table */}
                            <Box sx={{ px: 0 }}>
                                <TableContainer sx={{ padding: '0 !important' }}>
                                    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                        <TableHead>
                                            <TableRow
                                                sx={{
                                                    '& .MuiTableCell-head': {
                                                        fontWeight: 800,
                                                        fontSize: '0.8125rem',
                                                        color: '#475569',
                                                        bgcolor: '#f8fafc',
                                                        borderBottom: '1px solid #e2e8f0',
                                                        py: 1.5,
                                                        px: 0.5,
                                                    },
                                                }}
                                            >
                                                <TableCell sx={{ width: '28%' }}>Nhà đài</TableCell>


                                                <TableCell align="right" sx={{ width: 130 }}>SL phân bổ</TableCell>
                                                <TableCell align="right" sx={{ width: 130 }}>Đơn giá vốn</TableCell>
                                                <TableCell align="right" sx={{ width: 140, whiteSpace: 'nowrap' }}>
                                                    Tổng giá vốn
                                                </TableCell>
                                                <TableCell align="center" width={52} />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {fields.map((field, index) => (
                                                <ImportBatchLineRow
                                                    key={field.id}
                                                    index={index}
                                                    control={control}
                                                    setValue={setValue}
                                                    drawDate={drawDate}
                                                    eligibleStations={displayEligibleStations}
                                                    declareQuantity={lines[index]?.declareQuantity ?? 0}
                                                    importCost={lines[index]?.importCost ?? 0}
                                                    lotteryStationId={lines[index]?.lotteryStationId ?? 0}
                                                    resolvedBatchType={lines[index]?.resolvedBatchType}
                                                    stationName={lines[index]?.stationName}
                                                    selectedStationIdsInOtherRows={
                                                        selectedStationIdsByRow[index] ?? []
                                                    }
                                                    canRemove
                                                    onRemove={() => {
                                                        confirmDelete(
                                                            'Dòng phiếu này sẽ bị xóa khỏi phiếu nhập lô đang tạo.',
                                                            () => remove(index)
                                                        );
                                                    }}
                                                    showErrors={isSubmitted && !isFormBlocked}
                                                />
                                            ))}
                                        </TableBody>
                                        {fields.length > 0 && (
                                            <TableFooter sx={{ borderTop: '2px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                                                <TableRow sx={{ '& td': { py: 1.5, px: 0.5, fontWeight: 800, fontSize: '0.85rem' } }}>
                                                    <TableCell colSpan={1} sx={{ color: '#334155' }}>
                                                        Tổng cộng ({fields.length} đài)
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: '#0284c7' }}>
                                                        {totals.totalQty.toLocaleString('vi-VN')} vé
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                        —
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: '#15803d' }}>
                                                        {formatImportCost(totals.totalCost)} đ
                                                    </TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableFooter>
                                        )}
                                    </Table>
                                </TableContainer>
                            </Box>

                            {errors.lines?.message && !isFormBlocked && (
                                <Box sx={{ px: 3, py: 1 }}>
                                    <Typography variant="caption" color="error">
                                        {errors.lines.message}
                                    </Typography>
                                </Box>
                            )}
                        </Paper>

                    </Stack>
                </form>

                <ImportBatchConfirmDialog
                    open={confirmOpen}
                    drawDate={pendingFormData?.drawDate ?? ''}
                    supplierName={
                        pendingFormData?.supplierId
                            ? resolveSupplierName(pendingFormData.supplierId)
                            : ''
                    }
                    importMode={pendingFormData?.importMode}
                    invoiceEvidenceUrl={pendingFormData?.invoiceEvidenceUrl}
                    ticketListImageUrls={pendingFormData?.ticketListImageUrls ?? []}
                    lines={(pendingFormData?.lines ?? []).map((line) => ({
                        stationName: resolveStationName(line.lotteryStationId),
                        batchType: line.resolvedBatchType ?? 'NEW',
                        declareQuantity: line.declareQuantity,
                        importCost: line.importCost,
                    }))}
                    totalDeclareQuantity={pendingFormData?.totalDeclareQuantity ?? 0}
                    totalCostValue={confirmTotals.totalCost}
                    isPending={isPending || isSaving}
                    onClose={handleCloseConfirm}
                    onConfirm={handleConfirmCreate}
                />
                <ImportBatchDuplicateWarningDialog
                    open={duplicateOpen}
                    existingBatch={duplicateExistingBatch}
                    onClose={handleCloseDuplicate}
                    onContinue={handleContinueExistingBatch}
                    onCreateNew={handleCreateNewAnyway}
                    isCreatingNew={isPending || isSaving}
                />

                {/* ── Dialog Kết nối Quét vé số từ Mobile App ── */}
                <Dialog
                    open={scanDialogOpen}
                    onClose={() => setScanDialogOpen(false)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <PhoneIphoneIcon color="primary" />
                            <Typography variant="h6" fontWeight="bold">
                                Kết nối Quét vé Mobile
                            </Typography>
                        </Stack>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2} alignItems="center" sx={{ py: 1, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                Mở ứng dụng Mobile (Tài khoản Admin / Nhân viên) -&gt; chọn <b>Quét vé OCR</b> và nhập Mã kết nối sau:
                            </Typography>

                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    width: '100%',
                                    bgcolor: 'action.hover',
                                    borderColor: 'primary.main',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                                    MÃ KẾT NỐI PHIÊN (SESSION CODE)
                                </Typography>
                                <Typography
                                    variant="h4"
                                    color="primary.main"
                                    fontWeight="bold"
                                    letterSpacing={2}
                                    sx={{ my: 0.5 }}
                                >
                                    {scanSessionCode}
                                </Typography>
                                <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                                    <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                                    <Typography variant="caption" color="success.main" fontWeight="bold">
                                        Đang lắng nghe kết nối Real-time từ Mobile...
                                    </Typography>
                                </Stack>
                            </Paper>

                            <Alert severity="info" sx={{ textAlign: 'left', width: '100%' }}>
                                Sau khi Mobile chụp vé số, hình ảnh và kết quả soi vé số sẽ tự động đồng bộ trực tiếp vào trang này.
                            </Alert>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setScanDialogOpen(false)} variant="contained" color="primary">
                            Đóng / Hoàn tất
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </ThemeProvider>
    );
};

