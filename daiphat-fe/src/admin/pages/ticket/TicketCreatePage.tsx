import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
    Alert,
    Autocomplete,
    Box,
    Chip,
    IconButton,
    Paper,
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
    createTheme,
    useTheme,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
} from '@mui/material';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { LoadingButton } from '../../components/ui/LoadingButton';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import { useCreateTicket } from './hooks/useTicket';
import { toast } from 'react-toastify';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTicketSchema, CreateTicketFormValues } from '../../schemas/ticket.schema';
import { useProviders } from '../provider/hooks/useProvider';
import { useDraftImportBatches, useImportBatchDetail } from '../import-batch/hooks/useImportBatch';
import { getBatchTypeLabel, getImportBatchCancelledAlertMessage } from '../import-batch/utils/batchTypeLabels';
import { TicketSerialImageField } from './components/TicketSerialImageField';
import type { ImportBatch } from '../../api/importBatch.api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

const emptySerial = () => ({ serialNumber: '', ticketImg: undefined as string | undefined });

export const TicketCreatePage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const importBatchIdParam = searchParams.get('importBatchId');
    const importBatchLineIdParam = searchParams.get('importBatchLineId');
    const isBatchPreSelected = !!importBatchIdParam;

    const { data: draftBatches = [], isLoading: isLoadingDrafts } = useDraftImportBatches(!isBatchPreSelected);
    const [selectedBatchId, setSelectedBatchId] = useStateFromParam(importBatchIdParam);
    const { data: importBatch, isLoading: isLoadingBatch } = useImportBatchDetail(selectedBatchId || undefined);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CreateTicketFormValues>({
        resolver: zodResolver(createTicketSchema),
        defaultValues: {
            importBatchId: importBatchIdParam || '',
            importBatchLineId: importBatchLineIdParam || '',
            stationId: '',
            serials: [emptySerial()],
            numbers: '',
            drawDate: '',
        },
    });

    const watchedLineId = watch('importBatchLineId');
    const batchLines = importBatch?.lines ?? [];
    const hasMultipleLines = batchLines.length > 1;

    const selectedLine = useMemo(() => {
        const lineId = importBatchLineIdParam || watchedLineId;
        return (
            batchLines.find((l) => String(l.id) === String(lineId)) ??
            (batchLines.length === 1 ? batchLines[0] : undefined)
        );
    }, [batchLines, importBatchLineIdParam, watchedLineId]);

    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];
    const { mutateAsync: createAsync, isPending } = useCreateTicket();

    const resolveStationName = useCallback(
        (stationId?: number | string) => {
            if (!stationId) return '—';
            return (
                providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ??
                `Đài #${stationId}`
            );
        },
        [providers]
    );

    useEffect(() => {
        if (!importBatch || batchLines.length === 0) return;

        const lineFromParam = importBatchLineIdParam
            ? batchLines.find((l) => String(l.id) === importBatchLineIdParam)
            : undefined;
        const line = lineFromParam ?? (batchLines.length === 1 ? batchLines[0] : undefined);

        reset({
            importBatchId: String(importBatch.id),
            importBatchLineId: line ? String(line.id) : '',
            stationId: line ? String(line.lotteryStationId) : '',
            serials: [emptySerial()],
            numbers: '',
            drawDate: importBatch.drawDate,
        });
    }, [importBatch, batchLines, importBatchLineIdParam, reset]);

    const { fields, append, remove } = useFieldArray({ control, name: 'serials' });

    const outerTheme = useTheme();
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

    const handleBatchChange = (batch: ImportBatch | null) => {
        if (!batch) {
            setSelectedBatchId('');
            reset({
                importBatchId: '',
                importBatchLineId: '',
                stationId: '',
                serials: [emptySerial()],
                numbers: '',
                drawDate: '',
            });
            return;
        }
        setSelectedBatchId(String(batch.id));
    };

    const formatBatchLabel = (batch: ImportBatch) =>
        `#${batch.id} · ${dayjs(batch.drawDate).format('DD/MM/YYYY')} · ${batch.supplierName || 'N/A'} · ${batch.lines?.length ?? 0} đài`;

    const onSubmit = async (data: CreateTicketFormValues) => {
        if (!selectedLine) {
            toast.error('Vui lòng chọn nhà đài trong phiếu nhập lô');
            return;
        }

        const payload = {
            importBatchLineId: Number(data.importBatchLineId),
            stationId: data.stationId,
            drawDate: data.drawDate || importBatch?.drawDate,
            serials: data.serials.map((s) => ({
                serialNumber: s.serialNumber.trim(),
                ticketImg:
                    typeof s.ticketImg === 'string' && s.ticketImg.trim() ? s.ticketImg.trim() : undefined,
            })),
            numbers: data.numbers.trim(),
        };

        try {
            const res: any = await createAsync(payload);
            if (res.success) {
                toast.success('Nhập vé số thành công!');
                reset({
                    importBatchId: String(importBatch?.id ?? data.importBatchId),
                    importBatchLineId: String(selectedLine.id),
                    stationId: String(selectedLine.lotteryStationId),
                    serials: [emptySerial()],
                    numbers: '',
                    drawDate: importBatch?.drawDate ?? data.drawDate ?? '',
                });
            } else {
                toast.error(res.message || 'Nhập vé số thất bại');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Đã xảy ra lỗi khi nhập vé số');
        }
    };

    const isLoading = isLoadingBatch || isLoadingDrafts;
    const canEnterTickets = !!importBatch && !!selectedLine && importBatch.status === 'DRAFT';
    const importedCount = selectedLine?.totalQuantity ?? 0;
    const declareCount = selectedLine?.declareQuantity ?? 0;

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Nhập vé số" />
                    <Breadcrumb
                        items={[
                            { label: 'Dashboard', to: '/' },
                            { label: 'Kho vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập vé' },
                        ]}
                    />
                </div>
            </div>

            <ThemeProvider theme={localTheme}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', pb: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                                Phiếu nhập lô
                            </Typography>

                            {isBatchPreSelected ? (
                                <TextField
                                    label="Phiếu nhập lô"
                                    fullWidth
                                    value={importBatch ? formatBatchLabel(importBatch) : 'Đang tải...'}
                                    InputProps={{ readOnly: true }}
                                    disabled={isLoading}
                                />
                            ) : (
                                <Autocomplete
                                    options={draftBatches}
                                    loading={isLoadingDrafts}
                                    value={importBatch ?? null}
                                    onChange={(_e, batch) => handleBatchChange(batch)}
                                    getOptionLabel={formatBatchLabel}
                                    isOptionEqualToValue={(a, b) => a.id === b.id}
                                    noOptionsText="Không có phiếu nhập lô ở trạng thái Nháp"
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Chọn phiếu nhập lô"
                                            placeholder="Chọn phiếu nhập lô trước khi nhập vé"
                                            error={!!errors.importBatchId}
                                            helperText={
                                                errors.importBatchId?.message ||
                                                'Chỉ hiển thị các phiếu nhập lô đang ở trạng thái Nháp.'
                                            }
                                        />
                                    )}
                                />
                            )}

                            {importBatch && importBatch.status === 'CANCELLED' && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {getImportBatchCancelledAlertMessage(importBatch.cancelReason)}
                                </Alert>
                            )}

                            {importBatch && importBatch.status !== 'DRAFT' && importBatch.status !== 'CANCELLED' && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    Phiếu nhập lô này không còn ở trạng thái Nháp. Không thể nhập thêm vé.
                                </Alert>
                            )}
                        </Paper>

                        {importBatch && (
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    alignItems={{ sm: 'center' }}
                                    sx={{ mb: 2 }}
                                >
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                                        Thông tin lô vé
                                    </Typography>
                                    {selectedLine && (
                                        <Chip
                                            size="small"
                                            label={`Đã nhập ${importedCount}/${declareCount}`}
                                            color={importedCount >= declareCount ? 'success' : 'default'}
                                        />
                                    )}
                                </Stack>

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                        gap: 2,
                                    }}
                                >
                                    {hasMultipleLines ? (
                                        <Controller
                                            name="importBatchLineId"
                                            control={control}
                                            render={({ field }) => (
                                                <FormControl fullWidth>
                                                    <InputLabel>Nhà đài</InputLabel>
                                                    <Select
                                                        {...field}
                                                        label="Nhà đài"
                                                        value={field.value || ''}
                                                        onChange={(e) => {
                                                            const lineId = String(e.target.value);
                                                            field.onChange(lineId);
                                                            const line = batchLines.find(
                                                                (l) => String(l.id) === lineId
                                                            );
                                                            if (line) {
                                                                setValue('stationId', String(line.lotteryStationId));
                                                            }
                                                        }}
                                                    >
                                                        {batchLines.map((line) => (
                                                            <MenuItem key={line.id} value={String(line.id)}>
                                                                {resolveStationName(line.lotteryStationId)} (
                                                                {getBatchTypeLabel(line.batchType)})
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            )}
                                        />
                                    ) : (
                                        <TextField
                                            label="Nhà đài"
                                            fullWidth
                                            value={resolveStationName(selectedLine?.lotteryStationId)}
                                            InputProps={{ readOnly: true }}
                                        />
                                    )}

                                    <TextField
                                        label="Ngày quay"
                                        fullWidth
                                        value={
                                            importBatch.drawDate
                                                ? dayjs(importBatch.drawDate).format('DD/MM/YYYY')
                                                : '—'
                                        }
                                        InputProps={{ readOnly: true }}
                                    />

                                    <TextField
                                        label="Mã lô"
                                        fullWidth
                                        value={selectedLine?.batchCode || '—'}
                                        InputProps={{ readOnly: true }}
                                    />

                                    <TextField
                                        label="Nhà cung cấp"
                                        fullWidth
                                        value={importBatch.supplierName || '—'}
                                        InputProps={{ readOnly: true }}
                                    />

                                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                                        <Controller
                                            name="numbers"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    label="Dãy số"
                                                    fullWidth
                                                    disabled={!canEnterTickets}
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    autoFocus
                                                />
                                            )}
                                        />
                                    </Box>
                                </Box>
                            </Paper>
                        )}

                        {canEnterTickets && (
                            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ mb: 1.5 }}
                                >
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Số sê-ri
                                    </Typography>
                                    <LoadingButton
                                        type="button"
                                        variant="outlined"
                                        size="small"
                                        label="Thêm dòng"
                                        startIcon={<AddIcon />}
                                        onClick={() => append(emptySerial())}
                                        sx={{ minHeight: '2rem' }}
                                    />
                                </Stack>

                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell width={48}>#</TableCell>
                                                <TableCell>Số sê-ri</TableCell>
                                                <TableCell width={140}>Ảnh vé</TableCell>
                                                <TableCell width={48} />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {fields.map((item, index) => (
                                                <TableRow key={item.id} hover>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <Controller
                                                            name={`serials.${index}.serialNumber`}
                                                            control={control}
                                                            render={({ field, fieldState }) => (
                                                                <TextField
                                                                    {...field}
                                                                    size="small"
                                                                    fullWidth
                                                                    placeholder="Nhập số sê-ri"
                                                                    error={!!fieldState.error}
                                                                    helperText={fieldState.error?.message}
                                                                />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        <TicketSerialImageField
                                                            control={control}
                                                            index={index}
                                                            compact
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1 }}>
                                                        {fields.length > 1 && (
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                aria-label="Xóa dòng"
                                                                onClick={() => remove(index)}
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}

                        {!importBatch && !isLoading && (
                            <Alert severity="info">
                                Chọn phiếu nhập lô để bắt đầu nhập vé số. Nếu chưa có phiếu, hãy{' '}
                                <Typography
                                    component="span"
                                    sx={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                                    onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.CREATE)}
                                >
                                    khai báo phiếu nhập lô
                                </Typography>{' '}
                                trước.
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <LoadingButton
                                type="button"
                                variant="outlined"
                                label="Quay lại"
                                onClick={() => navigate(ROUTES.ADMIN.TICKETS.LIST)}
                                sx={{ minHeight: '2.75rem' }}
                            />
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                disabled={!canEnterTickets}
                                label="Nhập vé"
                                loadingLabel="Đang xử lý..."
                                sx={{ minHeight: '2.75rem', minWidth: '7rem' }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};

function useStateFromParam(param: string | null) {
    const [value, setValue] = useState(param || '');
    useEffect(() => {
        if (param) setValue(param);
    }, [param]);
    return [value, setValue] as const;
}
