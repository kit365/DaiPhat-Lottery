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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import { uploadAdminImage } from '../../../../../api/upload.api';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useCreateImportBatch, useEligibleImportBatchStations } from '../../hooks/useImportBatch';
import { useActiveSuppliers } from '../../../../supplier';
import { formatSupplierTime } from '../../../../supplier/utils/supplierTimeFields';
import { createImportBatchSchema, CreateImportBatchFormValues } from '../../schemas/importBatch.schema';
import { ImportBatchConfirmDialog } from '../sections/ImportBatchConfirmDialog';
import { ImportBatchDuplicateWarningDialog } from '../sections/ImportBatchDuplicateWarningDialog';
import { ImportBatchLineRow } from '../sections/ImportBatchLineRow';
import { IMPORT_MODE_OPTIONS } from '../../utils/batchTypeLabels';
import {
    getDrawDateInputBounds,
    isBeforeSupplierImportAllowFrom,
    isDrawDateToday,
    resolveImportModeLock,
} from '../../utils/importBatchDrawDate';
import { ImportBatchDeclaredQuantityProgress } from '../sections/ImportBatchDeclaredQuantityProgress';
import {
    declaredQuantitiesMatch,
    sumImportBatchLineDeclaredQuantity,
} from '../../utils/importBatchDeclaredQuantity';
import { formatViInteger, parseNonNegativeIntegerInput } from '../../../../supplier';
import { computeImportBatchTotals } from '../../utils/importBatchTotals';
import { computeImportBatchRowLimit, IMPORT_BATCH_ROW_LIMIT_MESSAGE } from '../../utils/importBatchRowLimit';
import type { ImportBatch, ImportBatchEligibleStation } from '../../types/importBatch.type';
import { useImportBatchCreateDraft } from '../../hooks/useImportBatchCreateDraft';
import { readLocalImportBatchCreateDraft } from '../../utils/importBatchCreateDraft';
import { transferCreateFormToEditDraft } from '../../utils/importBatchEditDraft';
import { resolveInvoiceEvidenceUrl } from '../../utils/invoiceEvidence';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmDelete } from '../../../../../utils/swal';
import dayjs from 'dayjs';

const emptyLine = () => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 10000,
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

    useEffect(() => {
        if (!isImportAllowBlocked) {
            return;
        }
        const timer = window.setInterval(() => setNowTick(dayjs()), 15_000);
        return () => window.clearInterval(timer);
    }, [isImportAllowBlocked]);

    const importModeLock = useMemo(() => resolveImportModeLock(drawDate), [drawDate]);

    const isImportModeLocked = importModeLock.locked;
    const importModeLockReason = importModeLock.locked ? importModeLock.reason : undefined;

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
              ? 'Không có nhà đài nào phù hợp với ngày quay và loại nhập đã chọn.'
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
        if (isImportAllowBlocked) {
            toast.error('Chưa đến giờ cho phép nhập vé của nhà cung cấp đã chọn.');
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
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                <Breadcrumb
                    items={[
                        { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                        { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                        { label: 'Khai báo phiếu nhập' },
                    ]}
                />
                <Title title="Khai báo phiếu nhập lô vé" />

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CollapsibleCard
                        title="Thông tin phiếu nhập lô"
                        expanded
                        onToggle={() => undefined}
                        collapsible={false}
                    >
                        <Stack spacing={3}>
                            <Controller
                                name="supplierId"
                                control={control}
                                render={({ field }) => (
                                    <FormControl
                                        fullWidth
                                        sx={{ maxWidth: { sm: 360 } }}
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
                                            <Typography variant="caption" color="error">
                                                {errors.supplierId.message}
                                            </Typography>
                                        )}
                                    </FormControl>
                                )}
                            />

                            {isImportAllowBlocked && (
                                <Alert severity="warning">
                                    Chưa đến giờ cho phép nhập vé của nhà cung cấp này
                                    ({formatSupplierTime(selectedSupplier?.importAllowFrom)}).
                                    Vui lòng đợi đến giờ mở cửa nhập hoặc chọn nhà cung cấp khác.
                                </Alert>
                            )}

                            {!isImportAllowBlocked && (
                                <>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Controller
                                    name="drawDate"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Ngày quay"
                                            type="date"
                                            fullWidth
                                            sx={{ maxWidth: { sm: 280 } }}
                                            InputLabelProps={{ shrink: true }}
                                            inputProps={{ max: drawDateBounds.max }}
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
                                <Controller
                                    name="importMode"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth sx={{ maxWidth: { sm: 360 } }}>
                                            <InputLabel>Loại lô vé cần nhập</InputLabel>
                                            <Select
                                                {...field}
                                                label="Loại lô vé cần nhập"
                                                disabled={isImportModeLocked}
                                            >
                                                {IMPORT_MODE_OPTIONS.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {isImportModeLocked && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {importModeLockReason}
                                                </Typography>
                                            )}
                                        </FormControl>
                                    )}
                                />
                            </Stack>

                            <Controller
                                name="totalDeclareQuantity"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        name={field.name}
                                        onBlur={field.onBlur}
                                        inputRef={field.ref}
                                        value={formatViInteger(field.value)}
                                        label="Tổng số lượng khai báo phiếu nhập lô"
                                        fullWidth
                                        sx={{ maxWidth: { sm: 360 } }}
                                        error={isSubmitted && !!fieldState.error}
                                        helperText={isSubmitted && fieldState.error?.message}
                                        onChange={(e) => {
                                            field.onChange(parseNonNegativeIntegerInput(e.target.value) ?? 0);
                                        }}
                                        inputProps={{ inputMode: 'numeric' }}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Typography variant="body2" color="text.secondary">
                                                        vé
                                                    </Typography>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />

                            <ImportBatchDeclaredQuantityProgress
                                totalDeclareQuantity={totalDeclareQuantity ?? 0}
                                linesSum={linesDeclaredQuantity}
                                showError={isSubmitted}
                            />

                            {blockedStations.length > 0 && (
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
                            )}

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: '22%' }}>Nhà đài</TableCell>
                                            <TableCell sx={{ width: 100, whiteSpace: 'nowrap' }}>
                                                Ngày quay
                                            </TableCell>
                                            <TableCell sx={{ width: 148 }}>Loại lô</TableCell>
                                            <TableCell sx={{ width: 112 }}>Số lượng khai báo</TableCell>
                                            <TableCell sx={{ width: 148 }}>Giá vốn</TableCell>
                                            <TableCell align="right" sx={{ width: 108 }}>
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
                                                importCost={lines[index]?.importCost ?? 10000}
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

                            {errors.lines?.message && (
                                <Typography variant="caption" color="error">
                                    {errors.lines.message}
                                </Typography>
                            )}

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: 'var(--palette-background-neutral)',
                                    display: 'flex',
                                    gap: 4,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Typography variant="body2">
                                    <strong>Tổng giá trị lô vé nhập:</strong>{' '}
                                    {totals.totalCost.toLocaleString('vi-VN')} VNĐ
                                </Typography>
                            </Box>

                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    if (canAddRow) {
                                        append(emptyLine());
                                    }
                                }}
                                disabled={!canAddRow || isLoadingStations}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Thêm dòng
                            </Button>

                            {isAtRowLimit && (
                                <Alert severity="warning">{IMPORT_BATCH_ROW_LIMIT_MESSAGE}</Alert>
                            )}

                            {showSharedReceipt && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                        Ảnh biên lai (dùng chung cho tất cả nhà đài)
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1.5 }}
                                    >
                                        Chọn ảnh biên lai — ảnh sẽ được tải lên khi bạn xác nhận lưu phiếu.
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
                            )}

                            <Stack direction="row" spacing={2}>
                                <LoadingButton
                                    type="submit"
                                    variant="contained"
                                    loading={isPending || isSaving}
                                    disabled={!canSubmit || isLoadingStations || isLoadingSuppliers || !supplierId || isSaving}
                                    label="Xác nhận & Lưu"
                                    loadingLabel="Đang xử lý..."
                                />
                                <Button variant="outlined" onClick={handleCancel}>
                                    Hủy
                                </Button>
                            </Stack>
                                </>
                            )}

                            {isImportAllowBlocked && (
                                <Stack direction="row" spacing={2}>
                                    <Button variant="outlined" onClick={handleCancel}>
                                        Hủy
                                    </Button>
                                </Stack>
                            )}
                        </Stack>
                    </CollapsibleCard>
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
            </Box>
        </ThemeProvider>
    );
};
