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
import type { ImportBatch } from '../../api/importBatch.api';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import { useCreateImportBatch, useActiveImportBatchDraft, useEligibleImportBatchStations } from './hooks/useImportBatch';
import { createImportBatchSchema, CreateImportBatchFormValues } from './schemas/importBatch.schema';
import { ImportBatchDrawDateInfo } from './components/LateImportWarning';
import { ImportBatchConfirmDialog } from './components/ImportBatchConfirmDialog';
import { ImportBatchLineRow } from './components/ImportBatchLineRow';
import { IMPORT_MODE_OPTIONS } from './utils/batchTypeLabels';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const resolveContinueDraftPath = (draft: ImportBatch) => {
    const firstLine = draft.lines?.[0];
    if (firstLine?.id && (draft.lines?.length ?? 0) === 1) {
        return ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH_LINE(firstLine.id);
    }
    return ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(draft.id);
};

const emptyLine = () => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 10000,
    resolvedBatchType: undefined as CreateImportBatchFormValues['lines'][0]['resolvedBatchType'],
});

export const ImportBatchCreatePage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const addTicketIntent = searchParams.get('intent') === 'add-ticket';
    const [expandedDetail, setExpandedDetail] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<CreateImportBatchFormValues | null>(null);
    const outerTheme = useTheme();

    const { data: activeDraft, isLoading: isCheckingDraft } = useActiveImportBatchDraft();

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CreateImportBatchFormValues>({
        resolver: zodResolver(createImportBatchSchema),
        defaultValues: {
            drawDate: dayjs().format('YYYY-MM-DD'),
            importMode: 'IN_DAY',
            sharedInvoiceEvidenceUrl: '',
            lines: [emptyLine()],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
    const drawDate = watch('drawDate');
    const importMode = watch('importMode');
    const lines = watch('lines');
    const { data: eligibleStations = [], isLoading: isLoadingStations } = useEligibleImportBatchStations(
        drawDate,
        importMode
    );
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

    // Shared receipt is always shown for in-day imports (required for NEW / LATE_IMPORT).
    const showSharedReceipt = importMode === 'IN_DAY';

    useEffect(() => {
        lines.forEach((line, index) => {
            if (line.lotteryStationId && !eligibleStationIds.has(line.lotteryStationId)) {
                setValue(`lines.${index}.lotteryStationId`, 0);
                setValue(`lines.${index}.resolvedBatchType`, undefined);
            } else if (line.lotteryStationId) {
                const station = eligibleStations.find((s) => s.lotteryStationId === line.lotteryStationId);
                if (station) {
                    setValue(`lines.${index}.resolvedBatchType`, station.resolvedBatchType, {
                        shouldValidate: true,
                    });
                }
            }
        });
    }, [eligibleStationIds, eligibleStations, lines, setValue]);

    const maxRows = eligibleStations.length;
    const isAtRowLimit = maxRows > 0 && fields.length >= maxRows;

    const canSubmit =
        eligibleStations.length > 0 &&
        lines.some((line) => line.lotteryStationId && eligibleStationIds.has(line.lotteryStationId));

    const totals = useMemo(() => {
        const totalQty = lines.reduce((sum, l) => sum + (Number(l.declareQuantity) || 0), 0);
        const totalCost = lines.reduce(
            (sum, l) => sum + (Number(l.declareQuantity) || 0) * (Number(l.importCost) || 0),
            0
        );
        return { totalQty, totalCost };
    }, [lines]);

    useEffect(() => {
        if (!addTicketIntent || isCheckingDraft || !activeDraft?.id) {
            return;
        }
        navigate(resolveContinueDraftPath(activeDraft), { replace: true });
    }, [activeDraft, addTicketIntent, isCheckingDraft, navigate]);

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
        if (activeDraft?.id) {
            toast.error('Bạn đang có phiếu nhập lô chưa hoàn thành. Vui lòng tiếp tục phiếu hiện tại.');
            return;
        }
        if (!canSubmit) {
            toast.error('Vui lòng chọn nhà đài hợp lệ cho ngày quay đã chọn.');
            return;
        }
        setPendingFormData(data);
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
                importMode: pendingFormData.importMode,
                sharedInvoiceEvidenceUrl:
                    pendingFormData.importMode === 'IN_DAY'
                        ? pendingFormData.sharedInvoiceEvidenceUrl?.trim() || undefined
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
                const firstLine = res.data?.lines?.[0];
                if (addTicketIntent) {
                    if ((res.data?.lines?.length ?? 0) > 1) {
                        navigate(ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(res.data!.id));
                    } else if (firstLine?.id) {
                        navigate(ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH_LINE(firstLine.id));
                    }
                } else {
                    navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(res.data!.id));
                }
            } else {
                toast.error(res.message || 'Tạo phiếu nhập lô thất bại.');
            }
        } catch (err: any) {
            const status = err?.response?.status;
            const message =
                err?.response?.data?.message || err?.message || 'Tạo phiếu nhập lô thất bại.';
            toast.error(message);

            if (status === 409) {
                setConfirmOpen(false);
                setPendingFormData(null);
                if (activeDraft?.id) {
                    navigate(resolveContinueDraftPath(activeDraft));
                }
            }
        }
    };

    if (isCheckingDraft || (addTicketIntent && activeDraft?.id)) {
        return null;
    }

    if (activeDraft?.id) {
        return (
            <ThemeProvider theme={localTheme}>
                <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.CREATE },
                            { label: 'Khai báo phiếu nhập' },
                        ]}
                    />
                    <Title title="Khai báo phiếu nhập lô vé" />

                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Bạn đang có phiếu nhập lô chưa hoàn thành (#{activeDraft.id}). Hệ thống chỉ
                        cho phép một phiếu nháp tại một thời điểm. Vui lòng tiếp tục phiếu hiện tại
                        trước khi tạo phiếu mới.
                    </Alert>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                            variant="contained"
                            onClick={() => navigate(resolveContinueDraftPath(activeDraft))}
                        >
                            Tiếp tục nhập vé
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(activeDraft.id))}
                        >
                            Xem phiếu hiện tại
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
                        { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.CREATE },
                        { label: 'Khai báo phiếu nhập' },
                    ]}
                />
                <Title title={addTicketIntent ? 'Tạo phiếu nhập lô vé' : 'Khai báo phiếu nhập lô vé'} />

                <ImportBatchDrawDateInfo
                    drawDate={drawDate}
                    importMode={importMode}
                    eligibleStations={eligibleStations}
                >
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
                                                error={!!errors.drawDate}
                                                helperText={errors.drawDate?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="importMode"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth sx={{ maxWidth: { sm: 360 } }}>
                                                <InputLabel>Loại lô vé cần nhập</InputLabel>
                                                <Select {...field} label="Loại lô vé cần nhập">
                                                    {IMPORT_MODE_OPTIONS.map((option) => (
                                                        <MenuItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    />
                                </Stack>

                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Nhà đài</TableCell>
                                                <TableCell>Ngày quay</TableCell>
                                                <TableCell>Loại lô</TableCell>
                                                <TableCell>Số lượng khai báo</TableCell>
                                                <TableCell>Giá vốn</TableCell>
                                                <TableCell align="right">Tổng giá vốn</TableCell>
                                                <TableCell align="center" width={56} />
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
                                                    importCost={lines[index]?.importCost ?? 0}
                                                    lotteryStationId={lines[index]?.lotteryStationId ?? 0}
                                                    resolvedBatchType={lines[index]?.resolvedBatchType}
                                                    canRemove={fields.length > 1}
                                                    onRemove={() => remove(index)}
                                                    errors={errors.lines?.[index]}
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
                                            name="sharedInvoiceEvidenceUrl"
                                            control={control}
                                            render={({ field }) => (
                                                <UploadSingleFile
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    customUpload={uploadReceipt}
                                                    error={errors.sharedInvoiceEvidenceUrl?.message}
                                                />
                                            )}
                                        />
                                    </Box>
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
                                        <strong>Tổng giá vốn:</strong>{' '}
                                        {totals.totalCost.toLocaleString('vi-VN')} VNĐ
                                    </Typography>
                                </Box>

                                <LoadingButton
                                    type="submit"
                                    variant="contained"
                                    loading={isPending}
                                    disabled={!canSubmit || isLoadingStations}
                                    label="Xác nhận & Lưu"
                                    loadingLabel="Đang xử lý..."
                                />
                            </Stack>
                        </CollapsibleCard>
                    </form>
                </ImportBatchDrawDateInfo>

                <ImportBatchConfirmDialog
                    open={confirmOpen}
                    drawDate={pendingFormData?.drawDate ?? ''}
                    importMode={pendingFormData?.importMode}
                    sharedInvoiceEvidenceUrl={pendingFormData?.sharedInvoiceEvidenceUrl}
                    lines={(pendingFormData?.lines ?? []).map((line) => ({
                        stationName: resolveStationName(line.lotteryStationId),
                        batchType: line.resolvedBatchType ?? 'NEW',
                        declareQuantity: line.declareQuantity,
                        importCost: line.importCost,
                    }))}
                    totalDeclareQuantity={totals.totalQty}
                    totalCostValue={totals.totalCost}
                    isPending={isPending}
                    onClose={handleCloseConfirm}
                    onConfirm={handleConfirmCreate}
                />
            </Box>
        </ThemeProvider>
    );
};
