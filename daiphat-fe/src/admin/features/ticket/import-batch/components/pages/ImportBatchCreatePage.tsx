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
    ThemeProvider,
    Typography,
    useTheme,
    createTheme,
    Paper,
} from '@mui/material';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { AdminDatePicker } from '../../../../../components/ui/AdminDatePicker';
import { SelectMulti } from '../../../../../components/ui/SelectMulti';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { ImportBatchReceiptUpload } from '../sections/ImportBatchReceiptUpload';
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
import {
    declaredQuantitiesMatch,
    sumImportBatchLineDeclaredQuantity,
} from '../../utils/importBatchDeclaredQuantity';
import { computeImportBatchTotals } from '../../utils/importBatchTotals';
import { computeImportCostFromStation, formatImportCost } from '../../utils/importCostCalculator';
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
import dayjs from 'dayjs';

const buildDefaultFormValues = (): CreateImportBatchFormValues => ({
    drawDate: dayjs().format('YYYY-MM-DD'),
    supplierId: 0,
    importMode: 'IN_DAY',
    totalDeclareQuantity: 0,
    invoiceEvidenceUrl: '',
    lines: [],
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

    const { fields, replace } = useFieldArray({ control, name: 'lines' });
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
            lines: (values.lines ?? []).filter((line) => line.lotteryStationId > 0),
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

    // Remove lines whose station is no longer eligible when draw date / import mode changes.
    useEffect(() => {
        if (!formInitialized || isLoadingStations) {
            return;
        }

        const currentLines = getValues('lines');
        const filtered = currentLines.filter(
            (line) => line.lotteryStationId && eligibleStationIds.has(line.lotteryStationId)
        );
        if (filtered.length !== currentLines.length) {
            replace(filtered);
        }
    }, [eligibleStationIdsKey, eligibleStationIds, formInitialized, getValues, isLoadingStations, replace]);

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

    const stationMultiOptions = useMemo(
        () =>
            eligibleStations.map((station) => ({
                value: String(station.lotteryStationId),
                label: station.name,
            })),
        [eligibleStations]
    );

    const selectedStationIdsForMulti = useMemo(
        () =>
            lines
                .map((line) => line.lotteryStationId)
                .filter((stationId) => stationId > 0)
                .map(String),
        [lines]
    );

    const handleStationsChange = useCallback(
        (selected: string[]) => {
            const selectedIds = selected.map(Number).filter((id) => id > 0);
            const nextLines = selectedIds.map((stationId) => {
                const existing = lines.find((line) => line.lotteryStationId === stationId);
                if (existing) {
                    return existing;
                }

                const station = eligibleStations.find(
                    (entry) => entry.lotteryStationId === stationId
                );
                return {
                    lotteryStationId: stationId,
                    declareQuantity: 1,
                    importCost:
                        computeImportCostFromStation(station?.price, station?.commissionRate) ?? 0,
                    resolvedBatchType: station?.resolvedBatchType,
                    stationName: station?.name,
                };
            });
            replace(nextLines);
        },
        [eligibleStations, lines, replace]
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
                <Box sx={{ mb: 3 }}>
                    <Title title="Khai báo phiếu nhập lô vé" />
                </Box>

                <form id="import-batch-create-form" onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={3}>

                        {/* ── Card 1: Thông tin phiếu nhập lô ── */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 0,
                                borderRadius: 'var(--shape-borderRadius-lg)',
                                overflow: 'hidden',
                                boxShadow: 'var(--customShadows-card)',
                                border: '1px solid var(--palette-divider)',
                            }}
                        >
                            {/* Card header */}
                            <Box
                                sx={{
                                    px: 2.5,
                                    py: 2,
                                    borderBottom: '1px solid var(--palette-divider)',
                                    bgcolor: 'var(--palette-background-neutral)',
                                }}
                            >
                                <Typography
                                    variant="subtitle1"
                                    fontWeight={700}
                                    sx={{ fontSize: '1.125rem', lineHeight: 1.4 }}
                                >
                                    Thông tin phiếu nhập lô
                                </Typography>
                            </Box>

                            {/* Card body */}
                            <Box sx={{ px: 2.5, py: 2.5 }}>
                                <Stack spacing={2}>
                                    {/* Fields on a single wrapping row */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 2,
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <Box sx={{ flex: '1 1 260px', minWidth: 0 }}>
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
                                        </Box>

                                        {!isImportAllowBlocked && (
                                            <Box sx={{ flex: '0 1 220px', minWidth: 190 }}>
                                                <Controller
                                                    name="drawDate"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <AdminDatePicker
                                                            label="Ngày quay"
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
                                                                (noEligibleStations || allStationsDraftBlocked) &&
                                                                !errors.drawDate
                                                                    ? 'warning'
                                                                    : 'default'
                                                            }
                                                        />
                                                    )}
                                                />
                                            </Box>
                                        )}

                                        {canShowBatchFields && (
                                            <Box sx={{ flex: '0 0 300px', width: 300 }}>
                                                <SelectMulti
                                                    label="Chọn đài"
                                                    options={stationMultiOptions}
                                                    value={selectedStationIdsForMulti}
                                                    onChange={handleStationsChange}
                                                    disabled={
                                                        isLoadingStations || eligibleStations.length === 0
                                                    }
                                                    sx={{ width: '100%' }}
                                                />
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Supplier import-blocked alert */}
                                    {isImportAllowBlocked && (
                                        <Alert severity="warning">
                                            Chưa đến giờ cho phép nhập vé của nhà cung cấp này
                                            ({formatSupplierTime(selectedSupplier?.importAllowFrom)}).
                                            Vui lòng đợi đến giờ mở cửa hoặc chọn nhà cung cấp khác.
                                        </Alert>
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
                                        <>
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

                                            <Box sx={{ mx: -2.5 }}>
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
                                                                <TableCell align="center" sx={{ width: 140 }}>Loại lô</TableCell>
                                                                <TableCell sx={{ width: 110 }}>SL khai báo</TableCell>
                                                                <TableCell align="center" sx={{ width: 140 }}>Giá vốn</TableCell>
                                                                <TableCell align="right" sx={{ width: 110 }}>
                                                                    Tổng giá vốn
                                                                </TableCell>
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
                                                                    selectedStationIdsInOtherRows={[]}
                                                                    stationLocked
                                                                    hideActionsColumn
                                                                    canRemove={false}
                                                                    onRemove={() => {}}
                                                                    showErrors={isSubmitted}
                                                                />
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>

                                            {errors.lines?.message && (
                                                <Typography variant="caption" color="error">
                                                    {errors.lines.message}
                                                </Typography>
                                            )}

                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-end',
                                                    gap: 1.5,
                                                    pt: 1.5,
                                                    borderTop: '1px solid var(--palette-divider)',
                                                }}
                                            >
                                                {showSharedReceipt && (
                                                    <Box sx={{ width: 220 }}>
                                                        <Controller
                                                            name="invoiceEvidenceUrl"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <ImportBatchReceiptUpload
                                                                    value={field.value}
                                                                    onChange={field.onChange}
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

                                                <Typography
                                                    variant="body1"
                                                    color="text.secondary"
                                                    sx={{ whiteSpace: 'nowrap', fontSize: '0.9375rem' }}
                                                >
                                                    Tổng giá trị:{' '}
                                                    <Box
                                                        component="span"
                                                        fontWeight={700}
                                                        color="text.primary"
                                                        sx={{ fontSize: '1.0625rem' }}
                                                    >
                                                        {formatImportCost(totals.totalCost)} VNĐ
                                                    </Box>
                                                </Typography>
                                            </Box>
                                        </>
                                    )}
                                </Stack>
                            </Box>
                        </Paper>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                            <LoadingButton
                                type="submit"
                                variant="contained"
                                loading={isPending || isSaving}
                                disabled={
                                    !canSubmit ||
                                    isLoadingStations ||
                                    isLoadingSuppliers ||
                                    !supplierId ||
                                    isSaving ||
                                    isFormBlocked
                                }
                                label="Xác nhận & Lưu"
                                loadingLabel="Đang xử lý..."
                            />
                            <Button variant="outlined" onClick={handleCancel}>
                                Hủy
                            </Button>
                        </Box>

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
            </Box>
        </ThemeProvider>
    );
};

