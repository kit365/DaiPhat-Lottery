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
    Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../components/ui/LoadingButton';
import { UploadSingleFile } from '../../components/upload/UploadSingleFile';
import { uploadAdminImage } from '../../api/upload.api';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import {
    useEligibleImportBatchStations,
    useImportBatchDetail,
    useUpdateImportBatch,
} from './hooks/useImportBatch';
import { useActiveSuppliers } from '../supplier/hooks/useSupplier';
import { useProviders } from '../provider/hooks/useProvider';
import { updateImportBatchSchema, UpdateImportBatchFormValues } from './schemas/importBatch.schema';
import { ImportBatchLineRow } from './components/ImportBatchLineRow';
import { getImportBatchStatusLabel, getImportModeLabel } from './utils/batchTypeLabels';
import { formatImportBatchHeaderCode } from './utils/importBatchCode';
import { computeImportBatchTotals } from './utils/importBatchTotals';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const emptyLine = (): UpdateImportBatchFormValues['lines'][0] => ({
    lotteryStationId: 0,
    declareQuantity: 1,
    importCost: 10000,
    resolvedBatchType: undefined,
    readOnly: false,
    removed: false,
});

export const ImportBatchEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [expandedDetail, setExpandedDetail] = useState(true);
    const outerTheme = useTheme();

    const { data: batch, isLoading: isBatchLoading } = useImportBatchDetail(id);
    const { mutateAsync: updateAsync, isPending } = useUpdateImportBatch(id);
    const { data: activeSuppliers = [], isLoading: isLoadingSuppliers } = useActiveSuppliers();
    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const {
        control,
        handleSubmit,
        setValue,
        reset,
        formState: { errors, isSubmitted },
    } = useForm<UpdateImportBatchFormValues>({
        resolver: zodResolver(updateImportBatchSchema),
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: {
            supplierId: 0,
            invoiceEvidenceUrl: '',
            importMode: 'IN_DAY',
            drawDate: '',
            lines: [emptyLine()],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
    const drawDate = useWatch({ control, name: 'drawDate' });
    const importMode = useWatch({ control, name: 'importMode' });
    const supplierId = useWatch({ control, name: 'supplierId' });
    const lines = useWatch({ control, name: 'lines' }) ?? [];

    const { data: stationsResult, isLoading: isLoadingStations } = useEligibleImportBatchStations(
        drawDate,
        importMode,
        batch?.id
    );

    const resolveStationName = useCallback(
        (stationId: number) =>
            providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ||
            `Đài #${stationId}`,
        [providers]
    );

    const mergedEligibleStations = useMemo(() => {
        const eligible = stationsResult?.eligible ?? [];
        const byId = new Map(eligible.map((station) => [station.lotteryStationId, station]));

        lines.forEach((line) => {
            if (!line.lotteryStationId) {
                return;
            }

            const stationEntry = {
                lotteryStationId: line.lotteryStationId,
                name: line.stationName || resolveStationName(line.lotteryStationId),
                resolvedBatchType: line.resolvedBatchType ?? ('NEW' as const),
            };

            // Soft-deleted rows free their station for re-selection in this session.
            if (line.removed) {
                byId.set(line.lotteryStationId, stationEntry);
                return;
            }

            if (!byId.has(line.lotteryStationId)) {
                byId.set(line.lotteryStationId, stationEntry);
            }
        });

        return Array.from(byId.values());
    }, [stationsResult?.eligible, lines, resolveStationName]);

    const uploadReceipt = useCallback(async (file: File) => uploadAdminImage(file), []);

    useEffect(() => {
        if (!batch || batch.status !== 'DRAFT') {
            return;
        }

        reset(
            {
                supplierId: batch.supplierId ?? 0,
                invoiceEvidenceUrl: batch.invoiceEvidenceUrl ?? '',
                importMode: batch.importMode ?? 'IN_DAY',
                drawDate: batch.drawDate,
                lines: (batch.lines ?? []).map((line) => ({
                    id: line.id,
                    lotteryStationId: line.lotteryStationId,
                    declareQuantity: line.declareQuantity,
                    importCost: line.importCost,
                    resolvedBatchType: line.batchType,
                    status: line.status,
                    readOnly: line.status !== 'OPEN',
                    removed: false,
                    stationName: resolveStationName(line.lotteryStationId),
                })),
            },
            { keepDirty: false, keepTouched: false, keepErrors: false }
        );
    }, [batch, reset, resolveStationName]);

    const activeLines = lines.filter((line) => !line.removed);
    const eligibleStationIds = useMemo(
        () => new Set(mergedEligibleStations.map((s) => s.lotteryStationId)),
        [mergedEligibleStations]
    );

    const maxRows = mergedEligibleStations.length;
    const isAtRowLimit = maxRows > 0 && activeLines.length >= maxRows;
    const showSharedReceipt = importMode === 'IN_DAY';
    const totals = computeImportBatchTotals(activeLines);

    const selectedStationIdsByRow = useMemo(
        () =>
            lines.map((_, rowIndex) =>
                lines
                    .map((line, index) =>
                        index !== rowIndex && !line.removed ? line.lotteryStationId : 0
                    )
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

    const handleRemoveLine = (index: number) => {
        const line = lines[index];
        if (!line) {
            return;
        }

        if (activeLines.length <= 1) {
            toast.error('Phải giữ lại ít nhất một dòng nhập lô.');
            return;
        }

        // Unsaved rows are dropped from the form entirely.
        if (!line.id) {
            remove(index);
            return;
        }

        if (line.readOnly || line.status !== 'OPEN') {
            return;
        }

        setValue(`lines.${index}.removed`, true, { shouldDirty: true });
    };

    const canRemoveLine = (line: UpdateImportBatchFormValues['lines'][number]) => {
        if (activeLines.length <= 1) {
            return false;
        }
        if (!line.id) {
            return true;
        }
        return line.status === 'OPEN' && !line.readOnly;
    };

    const onSubmit = async (data: UpdateImportBatchFormValues) => {
        if (!batch) return;

        try {
            const res = await updateAsync({
                supplierId: data.supplierId,
                invoiceEvidenceUrl:
                    data.importMode === 'IN_DAY' ? data.invoiceEvidenceUrl?.trim() || undefined : undefined,
                lines: data.lines.map((line) => ({
                    id: line.id,
                    lotteryStationId: line.lotteryStationId,
                    declareQuantity: line.declareQuantity,
                    importCost: line.importCost,
                    removed: line.removed,
                })),
            });

            if (res.success) {
                toast.success(res.message || 'Cập nhật phiếu nhập lô thành công.');
                navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id));
            } else {
                toast.error(res.message || 'Cập nhật phiếu nhập lô thất bại.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Cập nhật phiếu nhập lô thất bại.');
        }
    };

    if (isBatchLoading || isLoadingSuppliers) {
        return null;
    }

    if (!batch) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Không tìm thấy phiếu nhập lô.</Typography>
            </Box>
        );
    }

    if (batch.status !== 'DRAFT') {
        return (
            <Box sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Chỉ phiếu nhập lô ở trạng thái Nháp mới được chỉnh sửa.
                </Alert>
                <Button variant="contained" onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}>
                    Xem chi tiết phiếu
                </Button>
            </Box>
        );
    }

    const hasReadOnlyLines = lines.some((line) => line.readOnly && !line.removed);

    return (
        <ThemeProvider theme={localTheme}>
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                <Breadcrumb
                    items={[
                        { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                        { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                        {
                            label: formatImportBatchHeaderCode(batch.batchCode, batch.id),
                            to: ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id),
                        },
                        { label: 'Chỉnh sửa' },
                    ]}
                />
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Title
                        title={`Chỉnh sửa phiếu ${formatImportBatchHeaderCode(batch.batchCode, batch.id)}`}
                    />
                    <Chip label={getImportBatchStatusLabel(batch.status)} size="small" />
                </Stack>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CollapsibleCard
                        title="Thông tin phiếu"
                        expanded={expandedDetail}
                        onToggle={() => setExpandedDetail((v) => !v)}
                    >
                        <Stack spacing={3} sx={{ p: 3 }}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label="Ngày quay"
                                    value={drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : ''}
                                    fullWidth
                                    sx={{ maxWidth: { sm: 280 } }}
                                    InputProps={{ readOnly: true }}
                                />
                                <TextField
                                    label="Loại nhập"
                                    value={getImportModeLabel(importMode)}
                                    fullWidth
                                    sx={{ maxWidth: { sm: 360 } }}
                                    InputProps={{ readOnly: true }}
                                />
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
                            </Stack>

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: '26%' }}>Nhà đài</TableCell>
                                            <TableCell sx={{ width: 100 }}>Ngày quay</TableCell>
                                            <TableCell sx={{ width: 168 }}>Loại lô</TableCell>
                                            {hasReadOnlyLines && (
                                                <TableCell sx={{ width: 120 }}>Trạng thái dòng</TableCell>
                                            )}
                                            <TableCell sx={{ width: 88 }}>Số lượng khai báo</TableCell>
                                            <TableCell sx={{ width: 148 }}>Giá vốn</TableCell>
                                            <TableCell align="right" sx={{ width: 108 }}>
                                                Tổng giá vốn
                                            </TableCell>
                                            <TableCell align="center" width={48} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {fields.map((field, index) => {
                                            const line = lines[index];
                                            if (!line || line.removed) {
                                                return null;
                                            }

                                            return (
                                                <ImportBatchLineRow
                                                    key={field.id}
                                                    index={index}
                                                    control={control}
                                                    setValue={setValue}
                                                    drawDate={drawDate}
                                                    eligibleStations={mergedEligibleStations}
                                                    declareQuantity={line.declareQuantity ?? 0}
                                                    importCost={line.importCost ?? 10000}
                                                    lotteryStationId={line.lotteryStationId ?? 0}
                                                    resolvedBatchType={line.resolvedBatchType}
                                                    selectedStationIdsInOtherRows={
                                                        selectedStationIdsByRow[index] ?? []
                                                    }
                                                    canRemove={canRemoveLine(line)}
                                                    onRemove={() => handleRemoveLine(index)}
                                                    readOnly={!!line.readOnly}
                                                    lineStatus={line.status}
                                                    stationLocked={!!line.id}
                                                    stationName={line.stationName}
                                                    showErrors={isSubmitted}
                                                />
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {isSubmitted && errors.lines?.message && (
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
                                                error={isSubmitted ? errors.invoiceEvidenceUrl?.message : undefined}
                                            />
                                        )}
                                    />
                                </Box>
                            )}

                            <Stack direction="row" spacing={2}>
                                <LoadingButton
                                    type="submit"
                                    variant="contained"
                                    loading={isPending}
                                    disabled={
                                        isLoadingStations ||
                                        !supplierId ||
                                        activeLines.every(
                                            (line) =>
                                                !line.lotteryStationId ||
                                                !eligibleStationIds.has(line.lotteryStationId)
                                        )
                                    }
                                    label="Lưu thay đổi"
                                    loadingLabel="Đang xử lý..."
                                />
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                                >
                                    Hủy
                                </Button>
                            </Stack>
                        </Stack>
                    </CollapsibleCard>
                </form>
            </Box>
        </ThemeProvider>
    );
};
