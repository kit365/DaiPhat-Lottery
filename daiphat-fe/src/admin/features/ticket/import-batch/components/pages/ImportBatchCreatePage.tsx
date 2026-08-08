"use client";

import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ThemeProvider,
    Typography,
    useTheme,
    createTheme,
    Paper,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import { uploadAdminImage } from '../../../../../api/upload.api';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useCreateImportBatch, useEligibleImportBatchStations, useImportBatchTimePolicy } from '../../hooks/useImportBatch';
import { useActiveSuppliers } from '../../../../supplier';
import { formatSupplierTime } from '../../../../supplier/utils/supplierTimeFields';
import { createImportBatchSchema, CreateImportBatchFormValues } from '../../schemas/importBatch.schema';
import { ImportBatchConfirmDialog } from '../sections/ImportBatchConfirmDialog';
import { ImportBatchDuplicateWarningDialog } from '../sections/ImportBatchDuplicateWarningDialog';
import { ImportBatchLineRow } from '../sections/ImportBatchLineRow';
import {
    getDrawDateInputBounds,
    isBeforeSupplierImportAllowFrom,
    isDrawDateToday,
    isInReturnCutOffWarningWindow,
    isReturnCutOffPassed,
    resolveImportModeLock,
} from '../../utils/importBatchDrawDate';
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
import { resolveInvoiceEvidenceUrl } from '../../utils/invoiceEvidence';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@/components/router-compat';
import { toast } from 'react-toastify';
import { confirmDelete } from '../../../../../utils/swal';
import dayjs from 'dayjs';

const emptyLine = () => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 0,
    resolvedBatchType: undefined as CreateImportBatchFormValues['lines'][0]['resolvedBatchType'],
});

const buildDefaultFormValues = (): CreateImportBatchFormValues => ({
    drawDate: dayjs().format('YYYY-MM-DD'),
    supplierId: 0,
    importMode: 'IN_DAY',
    totalDeclareQuantity: 0,
    invoiceEvidenceUrl: '',
    lines: [emptyLine()],
});

export const ImportBatchCreatePage = () => {
    const navigate = useNavigate();
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
    const lines = useWatch({ control, name: 'lines' }) ?? [];
    const [nowTick, setNowTick] = useState(() => dayjs());

    const { data: stationsResult, isLoading: isLoadingStations } = useEligibleImportBatchStations(
        drawDate,
        importMode
    );
    const eligibleStations = stationsResult?.eligible ?? [];
    const blockedStations = stationsResult?.blocked ?? [];
    const drawDateBounds = getDrawDateInputBounds();
    const { data: activeSuppliers = [], isLoading: isLoadingSuppliers } = useActiveSuppliers();
    const { data: timePolicy } = useImportBatchTimePolicy();
    const returnBufferMinutes = timePolicy?.returnBufferMinutes ?? 45;
    const { mutateAsync: createAsync, isPending } = useCreateImportBatch();
    const [isSaving, setIsSaving] = useState(false);

    const uploadReceipt = useCallback(async (file: File) => uploadAdminImage(file), []);

    const buildCreatePayload = async (formData: CreateImportBatchFormValues, forceCreate?: boolean) => {
        let invoiceEvidenceUrl: string | undefined;
        try {
            invoiceEvidenceUrl =
                formData.importMode === 'IN_DAY'
                    ? await resolveInvoiceEvidenceUrl(formData.invoiceEvidenceUrl, uploadReceipt)
                    : undefined;
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
                    ?.message ||
                (err as { message?: string })?.message ||
                'Tải ảnh biên lai thất bại.';
            throw new Error(message);
        }

        return {
            drawDate: formData.drawDate,
            supplierId: formData.supplierId,
            importMode: formData.importMode,
            totalDeclareQuantity: formData.totalDeclareQuantity,
            ...(forceCreate ? { forceCreate: true } : {}),
            invoiceEvidenceUrl,
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
            lines,
        }),
        [supplierId, drawDate, importMode, totalDeclareQuantity, invoiceEvidenceUrl, lines]
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
        const values = localDraft?.values ?? buildDefaultFormValues();
        const restoredValues: CreateImportBatchFormValues = {
            ...values,
            lines: values.lines?.length > 0 ? values.lines : [emptyLine()],
        };

        reset(restoredValues, { keepDirty: false, keepTouched: false, keepErrors: false });
        formInitializedRef.current = true;
        setFormInitialized(true);

        if (localDraft) {
            toast.info('Đã khôi phục bản nháp chỉnh sửa chưa lưu.');
        }
    }, [isLoadingSuppliers, reset]);

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

    const isImportAllowBlocked =
        !!selectedSupplier &&
        isBeforeSupplierImportAllowFrom(selectedSupplier.importAllowFrom, nowTick);

    const isReturnCutOffBlocked =
        !!selectedSupplier &&
        isDrawDateToday(drawDate) &&
        isReturnCutOffPassed(selectedSupplier.returnCutOffTime, nowTick);

    const isReturnCutOffWarning =
        !!selectedSupplier &&
        isDrawDateToday(drawDate) &&
        !isReturnCutOffBlocked &&
        isInReturnCutOffWarningWindow(
            selectedSupplier.returnCutOffTime,
            returnBufferMinutes,
            nowTick
        );

    const isFormBlocked = isImportAllowBlocked || isReturnCutOffBlocked;
    const canShowBatchFields = !isImportAllowBlocked && !isReturnCutOffBlocked;

    useEffect(() => {
        if (!isImportAllowBlocked && !isReturnCutOffWarning) {
            return;
        }
        const timer = window.setInterval(() => setNowTick(dayjs()), 15_000);
        return () => window.clearInterval(timer);
    }, [isImportAllowBlocked, isReturnCutOffWarning]);

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
        declaredQuantitiesMatch(totalDeclareQuantity ?? 0, lines);

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
            lines.map((_, rowIndex) =>
                lines
                    .map((line, index) => (index !== rowIndex ? line.lotteryStationId : 0))
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
                toast.error('Đã qua giờ chốt trả vé của nhà cung cấp. Không thể tạo phiếu nhập lô mới.');
            }
            return;
        }
        if (!canSubmit) {
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
        navigate(ROUTES.ADMIN.IMPORT_BATCH.EDIT(duplicateExistingBatch.id));
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
                navigate(ROUTES.ADMIN.IMPORT_BATCH.LIST);
            } else {
                toast.error(res.message || 'Tạo phiếu nhập lô thất bại.');
            }
        } catch (err: any) {
            const message =
                err?.response?.data?.message || err?.message || 'Tạo phiếu nhập lô thất bại.';
            toast.error(message);
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
                navigate(ROUTES.ADMIN.IMPORT_BATCH.LIST);
            } else {
                toast.error(res.message || 'Tạo phiếu nhập lô thất bại.');
            }
        } catch (err: any) {
            const status = err?.response?.status;
            const existingBatch = err?.response?.data?.data || null;

            if (status === 409 && existingBatch) {
                setDuplicateExistingBatch(existingBatch);
                setDuplicateOpen(true);
                setConfirmOpen(false);
                return;
            }

            const message =
                err?.response?.data?.message || err?.message || 'Tạo phiếu nhập lô thất bại.';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        clearDraft();
        navigate(ROUTES.ADMIN.IMPORT_BATCH.LIST);
    };

    if (isLoadingSuppliers) {
        return null;
    }

    if (activeSuppliers.length === 0) {
        return (
            <ThemeProvider theme={localTheme}>
                <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                            { label: 'Khai báo phiếu nhập' },
                        ]}
                    />
                    <Title title="Khai báo phiếu nhập lô vé" />

                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Chưa có nhà cung cấp. Vui lòng tạo nhà cung cấp trước khi nhập vé.
                    </Alert>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                            variant="contained"
                            className="btn-primary-admin"
                            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.CREATE)}
                        >
                            Tạo nhà cung cấp
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(ROUTES.ADMIN.SUPPLIER.LIST)}
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
                <Breadcrumb
                    items={[
                        { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                        { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                        { label: 'Khai báo phiếu nhập' },
                    ]}
                />
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 3,
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Title title="Khai báo phiếu nhập lô vé" />
                    <Stack direction="row" spacing={1.5}>
                        <LoadingButton
                            type="submit"
                            form="import-batch-create-form"
                            variant="contained"
                            loading={isPending || isSaving}
                            disabled={!canSubmit || isLoadingStations || isLoadingSuppliers || !supplierId || isSaving || isFormBlocked}
                            label="Xác nhận & Lưu"
                            loadingLabel="Đang xử lý..."
                        />
                        <Button variant="outlined" onClick={handleCancel}>
                            Hủy
                        </Button>
                    </Stack>
                </Box>

                <form id="import-batch-create-form" onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={3}>

                        {/* ── Card 1: Thông tin phiếu nhập lô ── */}
                        <Paper
                            variant="outlined"
                            sx={{
                                borderRadius: 'var(--shape-borderRadius-lg)',
                                overflow: 'hidden',
                                boxShadow: 'var(--customShadows-card)',
                                border: '1px solid var(--palette-divider)',
                            }}
                        >
                            {/* Card header */}
                            <Box
                                sx={{
                                    px: 3,
                                    py: 1.75,
                                    borderBottom: '1px solid var(--palette-divider)',
                                    bgcolor: 'var(--palette-background-neutral)',
                                }}
                            >
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Thông tin phiếu nhập lô
                                </Typography>
                            </Box>

                            {/* Card body */}
                            <Box sx={{ px: 3, py: 3 }}>
                                <Stack spacing={3}>
                                    {/* Row 1: Nhà cung cấp */}
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '280px 1fr' },
                                            gap: 2.5,
                                            alignItems: 'start',
                                        }}
                                    >
                                        <Controller
                                            name="supplierId"
                                            control={control}
                                            render={({ field }) => (
                                                <FormControl
                                                    fullWidth
                                                    error={isSubmitted && !!errors.supplierId}
                                                >
                                                    <InputLabel>Nhà cung cấp</InputLabel>
                                                    <Select
                                                        {...field}
                                                        label="Nhà cung cấp"
                                                        value={field.value || ''}
                                                        disabled={isLoadingSuppliers || activeSuppliers.length === 0}
                                                    >
                                                        {activeSuppliers.map((supplier) => (
                                                            <MenuItem key={supplier.id} value={supplier.id}>
                                                                {supplier.name} ({supplier.code})
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    {isSubmitted && errors.supplierId && (
                                                        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                                            {errors.supplierId.message}
                                                        </Typography>
                                                    )}
                                                </FormControl>
                                            )}
                                        />

                                        {/* Supplier import-blocked alert */}
                                        {isImportAllowBlocked && (
                                            <Alert severity="warning" sx={{ alignSelf: 'center' }}>
                                                Chưa đến giờ cho phép nhập vé của nhà cung cấp này
                                                ({formatSupplierTime(selectedSupplier?.importAllowFrom)}).
                                                Vui lòng đợi đến giờ mở cửa hoặc chọn nhà cung cấp khác.
                                            </Alert>
                                        )}
                                    </Box>

                                    {/* Row 2: Ngày quay */}
                                    {!isImportAllowBlocked && (
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr', sm: '200px' },
                                                gap: 2.5,
                                                alignItems: 'start',
                                            }}
                                        >
                                            <Controller
                                                name="drawDate"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Ngày quay"
                                                        type="date"
                                                        fullWidth
                                                        InputLabelProps={{ shrink: true }}
                                                        inputProps={{
                                                            min: drawDateBounds.min,
                                                            max: drawDateBounds.max,
                                                        }}
                                                        error={isSubmitted && !!errors.drawDate}
                                                        helperText={
                                                            (isSubmitted && errors.drawDate?.message) ||
                                                            drawDateHelperText
                                                        }
                                                        FormHelperTextProps={
                                                            (noEligibleStations || allStationsDraftBlocked) &&
                                                            !errors.drawDate
                                                                ? { sx: { color: 'warning.main' } }
                                                                : undefined
                                                        }
                                                    />
                                                )}
                                            />
                                        </Box>
                                    )}

                                    {isReturnCutOffBlocked && (
                                        <Alert severity="error">
                                            Đã qua giờ chốt trả vé của nhà cung cấp này (
                                            {formatSupplierTime(selectedSupplier?.returnCutOffTime)}).
                                            Không thể tạo phiếu nhập lô mới cho kỳ quay hôm nay.
                                            Vui lòng chọn ngày quay ngày mai hoặc đợi kỳ quay khác.
                                        </Alert>
                                    )}

                                    {isReturnCutOffWarning && (
                                        <Alert severity="warning">
                                            Sắp đến giờ chốt trả vé (
                                            {formatSupplierTime(selectedSupplier?.returnCutOffTime)}).
                                            Vui lòng cân nhắc trước khi tiếp tục tạo phiếu nhập lô.
                                        </Alert>
                                    )}

                                    {canShowBatchFields && (
                                        <Controller
                                            name="totalDeclareQuantity"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    name={field.name}
                                                    value={formatViInteger(field.value)}
                                                    label="Tổng số lượng khai báo (Tự động tính từ danh sách đài)"
                                                    fullWidth
                                                    disabled
                                                    error={isSubmitted && !!fieldState.error}
                                                    helperText={
                                                        isSubmitted && fieldState.error?.message
                                                            ? fieldState.error.message
                                                            : 'Tự động tổng hợp từ số lượng khai báo của các nhà đài trong danh sách bên dưới.'
                                                    }
                                                    InputProps={{
                                                        readOnly: true,
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <Typography variant="body2" color="text.secondary">
                                                                    vé
                                                                </Typography>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                    sx={{
                                                        '& .MuiInputBase-input.Mui-disabled': {
                                                            WebkitTextFillColor: '#0F172A',
                                                            fontWeight: 700,
                                                            bgcolor: '#F8FAFC',
                                                        },
                                                    }}
                                                />
                                            )}
                                        />
                                    )}

                                    {/* Declared quantity progress bar */}
                                    {canShowBatchFields && (
                                        <ImportBatchDeclaredQuantityProgress
                                            totalDeclareQuantity={totalDeclareQuantity ?? 0}
                                            linesSum={linesDeclaredQuantity}
                                            showError={isSubmitted}
                                        />
                                    )}
                                </Stack>
                            </Box>
                        </Paper>

                        {/* ── Card 2: Danh sách nhà đài (only when not blocked) ── */}
                        {canShowBatchFields && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    borderRadius: 'var(--shape-borderRadius-lg)',
                                    overflow: 'hidden',
                                    boxShadow: 'var(--customShadows-card)',
                                    border: '1px solid var(--palette-divider)',
                                }}
                            >
                                {/* Card header */}
                                <Box
                                    sx={{
                                        px: 3,
                                        py: 1.75,
                                        borderBottom: '1px solid var(--palette-divider)',
                                        bgcolor: 'var(--palette-background-neutral)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 2,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Danh sách nhà đài
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => {
                                            if (canAddRow) {
                                                append(emptyLine());
                                            }
                                        }}
                                        disabled={!canAddRow || isLoadingStations}
                                    >
                                        Thêm dòng
                                    </Button>
                                </Box>

                                {/* Blocked stations info */}
                                {blockedStations.length > 0 && (
                                    <Box sx={{ px: 3, pt: 2 }}>
                                        <Alert severity="info">
                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                Một số nhà đài đã có phiếu nhập nháp:
                                            </Typography>
                                            {blockedStations.map((station) => (
                                                <Typography key={station.lotteryStationId} variant="body2">
                                                    {station.name}
                                                    {station.existingDraftBatchId
                                                        ? ` — phiếu #${station.existingDraftBatchId}`
                                                        : ''}
                                                    {station.existingDraftBatchId && (
                                                        <>
                                                            {' '}
                                                            <Button
                                                                size="small"
                                                                variant="text"
                                                                sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}
                                                                onClick={() =>
                                                                    navigate(
                                                                        ROUTES.ADMIN.IMPORT_BATCH.DETAIL(
                                                                            station.existingDraftBatchId!
                                                                        )
                                                                    )
                                                                }
                                                            >
                                                                Xem phiếu
                                                            </Button>
                                                        </>
                                                    )}
                                                </Typography>
                                            ))}
                                        </Alert>
                                    </Box>
                                )}

                                {/* Table */}
                                <Box sx={{ px: 0 }}>
                                    <TableContainer>
                                        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                            <TableHead>
                                                <TableRow
                                                    sx={{
                                                        '& .MuiTableCell-head': {
                                                            fontWeight: 600,
                                                            fontSize: '0.8125rem',
                                                            color: 'var(--palette-text-secondary)',
                                                            bgcolor: 'var(--palette-background-neutral)',
                                                            borderBottom: '1px solid var(--palette-divider)',
                                                            py: 1.25,
                                                            px: 2,
                                                        },
                                                    }}
                                                >
                                                    <TableCell sx={{ width: '24%' }}>Nhà đài</TableCell>
                                                    <TableCell sx={{ width: 96, whiteSpace: 'nowrap' }}>
                                                        Ngày quay
                                                    </TableCell>
                                                    <TableCell sx={{ width: 140 }}>Loại lô</TableCell>
                                                    <TableCell sx={{ width: 110 }}>SL khai báo</TableCell>
                                                    <TableCell sx={{ width: 140 }}>Giá vốn</TableCell>
                                                    <TableCell align="right" sx={{ width: 110 }}>
                                                        Tổng giá vốn
                                                    </TableCell>
                                                    <TableCell align="center" width={48} />
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
                                                        showErrors={isSubmitted}
                                                    />
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>

                                {/* Row limit warning */}
                                {isAtRowLimit && (
                                    <Box sx={{ px: 3, pb: 2 }}>
                                        <Alert severity="warning">{IMPORT_BATCH_ROW_LIMIT_MESSAGE}</Alert>
                                    </Box>
                                )}

                                {errors.lines?.message && (
                                    <Box sx={{ px: 3, pb: 1 }}>
                                        <Typography variant="caption" color="error">
                                            {errors.lines.message}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Summary footer */}
                                <Box
                                    sx={{
                                        px: 3,
                                        py: 1.75,
                                        borderTop: '1px solid var(--palette-divider)',
                                        bgcolor: 'var(--palette-background-neutral)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        gap: 4,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary">
                                        Tổng giá trị lô vé nhập:{' '}
                                        <Box component="span" fontWeight={700} color="text.primary">
                                            {formatImportCost(totals.totalCost)} VNĐ
                                        </Box>
                                    </Typography>
                                </Box>
                            </Paper>
                        )}

                        {/* ── Card 3: Ảnh biên lai (in-day only) ── */}
                        {canShowBatchFields && showSharedReceipt && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    borderRadius: 'var(--shape-borderRadius-lg)',
                                    overflow: 'hidden',
                                    boxShadow: 'var(--customShadows-card)',
                                    border: '1px solid var(--palette-divider)',
                                }}
                            >
                                <Box
                                    sx={{
                                        px: 3,
                                        py: 1.75,
                                        borderBottom: '1px solid var(--palette-divider)',
                                        bgcolor: 'var(--palette-background-neutral)',
                                    }}
                                >
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Ảnh biên lai
                                    </Typography>
                                </Box>
                                <Box sx={{ px: 3, py: 3 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Ảnh biên lai dùng chung cho tất cả nhà đài — ảnh sẽ được tải lên khi bạn xác nhận lưu phiếu.
                                    </Typography>
                                    <Controller
                                        name="invoiceEvidenceUrl"
                                        control={control}
                                        render={({ field }) => (
                                            <UploadSingleFile
                                                label=""
                                                value={field.value}
                                                onChange={field.onChange}
                                                useRawFile
                                                error={
                                                    isSubmitted
                                                        ? errors.invoiceEvidenceUrl?.message
                                                        : undefined
                                                }
                                            />
                                        )}
                                    />
                                </Box>
                            </Paper>
                        )}

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

