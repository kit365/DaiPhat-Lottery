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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../components/ui/LoadingButton';
import { UploadSingleFile } from '../../components/upload/UploadSingleFile';
import { uploadAdminImage } from '../../api/upload.api';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import { useCreateImportBatch, useEligibleImportBatchStations, useImportBatchTimePolicy } from './hooks/useImportBatch';
import { useActiveSuppliers } from '../supplier/hooks/useSupplier';
import { createImportBatchSchema, CreateImportBatchFormValues } from './schemas/importBatch.schema';
import { ImportBatchConfirmDialog } from './components/ImportBatchConfirmDialog';
import { ImportBatchLineRow } from './components/ImportBatchLineRow';
import { IMPORT_MODE_OPTIONS } from './utils/batchTypeLabels';
import {
    getDrawDateInputBounds,
    isDrawDateToday,
    resolveImportModeLock,
} from './utils/importBatchDrawDate';
import { computeImportBatchTotals } from './utils/importBatchTotals';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const emptyLine = () => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 10000,
    resolvedBatchType: undefined as CreateImportBatchFormValues['lines'][0]['resolvedBatchType'],
});

export const ImportBatchCreatePage = () => {
    const navigate = useNavigate();
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<CreateImportBatchFormValues | null>(null);
    const outerTheme = useTheme();


    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<CreateImportBatchFormValues>({
        resolver: zodResolver(createImportBatchSchema),
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: {
            drawDate: dayjs().format('YYYY-MM-DD'),
            supplierId: 0,
            importMode: 'IN_DAY',
            invoiceEvidenceUrl: '',
            lines: [emptyLine()],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
    const drawDate = useWatch({ control, name: 'drawDate' });
    const importMode = useWatch({ control, name: 'importMode' });
    const supplierId = useWatch({ control, name: 'supplierId' });
    const lines = useWatch({ control, name: 'lines' }) ?? [];
    const { data: timePolicy } = useImportBatchTimePolicy();
    const cutoffTime = timePolicy?.importBatchCutoffTime ?? '15:00';

    const { data: stationsResult, isLoading: isLoadingStations } = useEligibleImportBatchStations(
        drawDate,
        importMode
    );
    const eligibleStations = stationsResult?.eligible ?? [];
    const blockedStations = stationsResult?.blocked ?? [];
    const drawDateBounds = getDrawDateInputBounds();
    const { data: activeSuppliers = [], isLoading: isLoadingSuppliers } = useActiveSuppliers();
    const { mutateAsync: createAsync, isPending } = useCreateImportBatch();

    const uploadReceipt = useCallback(async (file: File) => uploadAdminImage(file), []);

    const eligibleStationIds = useMemo(
        () => new Set(eligibleStations.map((s) => s.lotteryStationId)),
        [eligibleStations]
    );

    const resolveStationName = (stationId: number) => {
        const station = eligibleStations.find((s) => s.lotteryStationId === stationId);
        return station?.name ?? '';
    };

    const resolveSupplierName = (id: number) => {
        const supplier = activeSuppliers.find((s) => s.id === id);
        return supplier ? `${supplier.name} (${supplier.code})` : '';
    };

    const importModeLock = useMemo(
        () => resolveImportModeLock(drawDate, eligibleStations, cutoffTime, !isLoadingStations),
        [drawDate, eligibleStations, cutoffTime, isLoadingStations]
    );

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

    // Shared receipt is required for in-day imports (NEW / LATE_IMPORT).
    const showSharedReceipt = importMode === 'IN_DAY';

    useEffect(() => {
        if (!importModeLock.locked || importMode === importModeLock.mode) {
            return;
        }
        setValue('importMode', importModeLock.mode, { shouldValidate: true });
    }, [importModeLock, importMode, setValue]);

    // Clear stations that became ineligible when draw date / import mode changes.
    // Must not depend on `lines` — that caused setValue loops on every quantity/cost edit.
    useEffect(() => {
        const currentLines = getValues('lines');
        currentLines.forEach((line, index) => {
            if (!line.lotteryStationId || eligibleStationIds.has(line.lotteryStationId)) {
                return;
            }
            setValue(`lines.${index}.lotteryStationId`, 0, { shouldValidate: true });
            setValue(`lines.${index}.resolvedBatchType`, undefined, { shouldValidate: true });
        });
    }, [eligibleStationIds, getValues, setValue]);

    const maxRows = eligibleStations.length;
    const isAtRowLimit = maxRows > 0 && fields.length >= maxRows;

    const canSubmit =
        eligibleStations.length > 0 &&
        lines.some((line) => line.lotteryStationId && eligibleStationIds.has(line.lotteryStationId));

    const totals = computeImportBatchTotals(lines);

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
                            },
                        },
                    },
                },
            }),
        [outerTheme]
    );

    const onSubmit = (data: CreateImportBatchFormValues) => {
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

    const handleConfirmCreate = async () => {
        if (!pendingFormData) return;

        try {
            const res = await createAsync({
                drawDate: pendingFormData.drawDate,
                supplierId: pendingFormData.supplierId,
                importMode: pendingFormData.importMode,
                invoiceEvidenceUrl:
                    pendingFormData.importMode === 'IN_DAY'
                        ? pendingFormData.invoiceEvidenceUrl?.trim() || undefined
                        : undefined,
                lines: pendingFormData.lines.map((line) => ({
                    lotteryStationId: line.lotteryStationId,
                    declareQuantity: line.declareQuantity,
                    importCost: line.importCost,
                })),
            });

            if (res.success) {
                toast.success(res.message || 'Tạo phiếu nhập lô thành công.');
                setConfirmOpen(false);
                setPendingFormData(null);
                navigate(ROUTES.ADMIN.IMPORT_BATCH.LIST);
            } else {
                toast.error(res.message || 'Tạo phiếu nhập lô thất bại.');
            }
        } catch (err: any) {
            const message =
                err?.response?.data?.message || err?.message || 'Tạo phiếu nhập lô thất bại.';
            toast.error(message);
        }
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
                            title="Thông tin khai báo"
                            expanded={expandedDetail}
                            onToggle={() => setExpandedDetail((v) => !v)}
                        >
                            <Stack spacing={3} sx={{ p: 3 }}>
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
                                                error={!!errors.drawDate}
                                                helperText={drawDateHelperText}
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
                                        name="supplierId"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl
                                                fullWidth
                                                sx={{ maxWidth: { sm: 360 } }}
                                                error={!!errors.supplierId}
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
                                                {errors.supplierId && (
                                                    <Typography variant="caption" color="error">
                                                        {errors.supplierId.message}
                                                    </Typography>
                                                )}
                                            </FormControl>
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
                                                <TableCell sx={{ width: '26%' }}>Nhà đài</TableCell>
                                                <TableCell sx={{ width: 100, whiteSpace: 'nowrap' }}>Ngày quay</TableCell>
                                                <TableCell sx={{ width: 168 }}>Loại lô</TableCell>
                                                <TableCell sx={{ width: 88 }}>Số lượng khai báo</TableCell>
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
                                                    eligibleStations={eligibleStations}
                                                    declareQuantity={lines[index]?.declareQuantity ?? 0}
                                                    importCost={lines[index]?.importCost ?? 10000}
                                                    lotteryStationId={lines[index]?.lotteryStationId ?? 0}
                                                    resolvedBatchType={lines[index]?.resolvedBatchType}
                                                    selectedStationIdsInOtherRows={selectedStationIdsByRow[index] ?? []}
                                                    canRemove={fields.length > 1}
                                                    onRemove={() => remove(index)}
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
                                        <strong>Tổng số lượng khai báo:</strong>{' '}
                                        {totals.totalQty.toLocaleString('vi-VN')} vé
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Tổng giá trị lô vé nhập:</strong>{' '}
                                        {totals.totalCost.toLocaleString('vi-VN')} VNĐ
                                    </Typography>
                                </Box>

                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                        if (!isAtRowLimit) {
                                            append(emptyLine());
                                        }
                                    }}
                                    disabled={isAtRowLimit || maxRows === 0}
                                    sx={{ alignSelf: 'flex-start' }}
                                >
                                    Thêm dòng
                                </Button>

                                {isAtRowLimit && (
                                    <Alert severity="warning">
                                        Đã đạt giới hạn số dòng. Ngày quay đã chọn chỉ có{' '}
                                        {maxRows} nhà đài có lịch quay, không thể thêm dòng nữa.
                                    </Alert>
                                )}

                                {showSharedReceipt && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Ảnh biên lai (dùng chung cho tất cả nhà đài)
                                        </Typography>
                                        <Controller
                                            name="invoiceEvidenceUrl"
                                            control={control}
                                            render={({ field }) => (
                                                <UploadSingleFile
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    customUpload={uploadReceipt}
                                                    error={errors.invoiceEvidenceUrl?.message}
                                                />
                                            )}
                                        />
                                    </Box>
                                )}

                                <LoadingButton
                                    type="submit"
                                    variant="contained"
                                    loading={isPending}
                                    disabled={!canSubmit || isLoadingStations || isLoadingSuppliers || !supplierId}
                                    label="Xác nhận & Lưu"
                                    loadingLabel="Đang xử lý..."
                                />
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
                    totalDeclareQuantity={confirmTotals.totalQty}
                    totalCostValue={confirmTotals.totalCost}
                    isPending={isPending}
                    onClose={handleCloseConfirm}
                    onConfirm={handleConfirmCreate}
                />
            </Box>
        </ThemeProvider>
    );
};
