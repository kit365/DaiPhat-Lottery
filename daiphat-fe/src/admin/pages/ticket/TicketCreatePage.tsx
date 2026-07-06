import {
    Alert,
    Autocomplete,
    Box,
    Paper,
    Stack,
    TextField,
    ThemeProvider,
    Typography,
    createTheme,
    useTheme,
} from '@mui/material';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { LoadingButton } from '../../components/ui/LoadingButton';
import { prefixAdmin, ROUTES } from '../../constants/routes';
import { useCreateTicket } from './hooks/useTicket';
import { toast } from 'react-toastify';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTicketSchema, CreateTicketFormValues } from '../../schemas/ticket.schema';
import { useProviders } from '../provider/hooks/useProvider';
import { useDraftImportBatches, useImportBatchDetail } from '../import-batch/hooks/useImportBatch';
import { getImportBatchCancelledAlertMessage } from '../import-batch/utils/batchTypeLabels';
import { formatImportBatchSelectLabel } from '../import-batch/utils/importBatchCode';
import { ImportBatchSelectionCard } from './components/ImportBatchSelectionCard';
import { ImportBatchLineImportTabs } from './components/ImportBatchLineImportTabs';
import type { ImportBatch } from '../../api/importBatch.api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type LineFormDraft = {
    numbers: string;
    serials: CreateTicketFormValues['serials'];
};

const emptySerial = () => ({ serialNumber: '', ticketImg: undefined as string | undefined });

const defaultLineDraft = (): LineFormDraft => ({
    numbers: '',
    serials: [emptySerial()],
});

export const TicketCreatePage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const importBatchIdParam = searchParams.get('importBatchId');
    const importBatchLineIdParam = searchParams.get('importBatchLineId');
    const isBatchPreSelected = !!importBatchIdParam;

    const { data: draftBatches = [], isLoading: isLoadingDrafts } = useDraftImportBatches(true);
    const [selectedBatchId, setSelectedBatchId] = useStateFromParam(importBatchIdParam);
    const {
        data: importBatchDetail,
        isLoading: isLoadingBatch,
        isFetching: isFetchingBatch,
    } = useImportBatchDetail(selectedBatchId || undefined);

    const resolvedBatch = useMemo(() => {
        if (!selectedBatchId) {
            return null;
        }
        if (importBatchDetail && String(importBatchDetail.id) === String(selectedBatchId)) {
            return importBatchDetail;
        }
        return draftBatches.find((batch) => String(batch.id) === String(selectedBatchId)) ?? null;
    }, [draftBatches, importBatchDetail, selectedBatchId]);

    const isBatchLoading =
        !!selectedBatchId &&
        (isLoadingBatch || isFetchingBatch) &&
        (!importBatchDetail || String(importBatchDetail.id) !== String(selectedBatchId));

    const initialLineAppliedRef = useRef(false);
    const lastInitializedBatchIdRef = useRef<string | null>(null);
    const [lineFormDrafts, setLineFormDrafts] = useState<Record<string, LineFormDraft>>({});

    const {
        control,
        handleSubmit,
        reset,
        watch,
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

    const { fields, append, remove } = useFieldArray({ control, name: 'serials' });

    const watchedLineId = watch('importBatchLineId');
    const batchLines = resolvedBatch?.lines ?? [];

    const selectedLine = useMemo(() => {
        if (!watchedLineId) {
            return batchLines.length === 1 ? batchLines[0] : undefined;
        }
        return batchLines.find((line) => String(line.id) === String(watchedLineId));
    }, [batchLines, watchedLineId]);

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
        if (importBatchIdParam) {
            return;
        }
        if (!importBatchLineIdParam || draftBatches.length === 0) {
            return;
        }
        const owningBatch = draftBatches.find((batch) =>
            batch.lines?.some((line) => String(line.id) === importBatchLineIdParam)
        );
        if (owningBatch) {
            setSelectedBatchId(String(owningBatch.id));
        }
    }, [draftBatches, importBatchIdParam, importBatchLineIdParam]);

    const syncBatchToUrl = useCallback(
        (batchId: string, lineId?: string) => {
            const params = new URLSearchParams();
            if (batchId) {
                params.set('importBatchId', batchId);
            }
            if (lineId) {
                params.set('importBatchLineId', lineId);
            }
            setSearchParams(params, { replace: true });
        },
        [setSearchParams]
    );

    const applyLineToForm = useCallback(
        (lineId: string, drafts: Record<string, LineFormDraft>) => {
            if (!resolvedBatch) {
                return;
            }
            const line = batchLines.find((item) => String(item.id) === lineId);
            if (!line) {
                return;
            }
            const draft = drafts[lineId] ?? defaultLineDraft();
            reset({
                importBatchId: String(resolvedBatch.id),
                importBatchLineId: lineId,
                stationId: String(line.lotteryStationId),
                numbers: draft.numbers,
                serials: draft.serials.length > 0 ? draft.serials : [emptySerial()],
                drawDate: resolvedBatch.drawDate,
            });
        },
        [batchLines, reset, resolvedBatch]
    );

    useEffect(() => {
        if (!resolvedBatch || batchLines.length === 0) {
            return;
        }

        const batchId = String(resolvedBatch.id);
        if (lastInitializedBatchIdRef.current === batchId && initialLineAppliedRef.current) {
            return;
        }

        const line = importBatchLineIdParam
            ? batchLines.find((item) => String(item.id) === importBatchLineIdParam)
            : batchLines[0];
        const lineId = line ? String(line.id) : '';

        lastInitializedBatchIdRef.current = batchId;
        initialLineAppliedRef.current = true;
        setLineFormDrafts({});

        if (lineId) {
            applyLineToForm(lineId, {});
            syncBatchToUrl(batchId, lineId);
        }
    }, [
        resolvedBatch?.id,
        batchLines.length,
        importBatchLineIdParam,
        applyLineToForm,
        syncBatchToUrl,
    ]);

    const handleTabChange = (lineId: string) => {
        const currentLineId = watch('importBatchLineId');
        let nextDrafts = lineFormDrafts;
        if (currentLineId) {
            nextDrafts = {
                ...lineFormDrafts,
                [currentLineId]: {
                    numbers: watch('numbers'),
                    serials: watch('serials'),
                },
            };
            setLineFormDrafts(nextDrafts);
        }
        applyLineToForm(lineId, nextDrafts);
        if (selectedBatchId) {
            syncBatchToUrl(selectedBatchId, lineId);
        }
    };

    const handleBatchChange = (batch: ImportBatch | null) => {
        initialLineAppliedRef.current = false;
        lastInitializedBatchIdRef.current = null;
        setLineFormDrafts({});

        if (!batch) {
            setSelectedBatchId('');
            syncBatchToUrl('');
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

        const batchId = String(batch.id);
        setSelectedBatchId(batchId);
        syncBatchToUrl(batchId);
    };

    const onSubmit = async (data: CreateTicketFormValues) => {
        if (!selectedLine || !resolvedBatch) {
            toast.error('Vui lòng chọn nhà đài trong phiếu nhập lô');
            return;
        }

        const imported = selectedLine.totalQuantity ?? 0;
        const declared = selectedLine.declareQuantity ?? 0;
        if (declared > 0 && imported >= declared) {
            toast.info('Đài này đã nhập đủ số lượng khai báo');
            return;
        }

        const payload = {
            importBatchLineId: Number(data.importBatchLineId),
            stationId: data.stationId,
            drawDate: data.drawDate || resolvedBatch.drawDate,
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
                const lineId = String(selectedLine.id);
                const clearedDraft = defaultLineDraft();
                setLineFormDrafts((prev) => ({
                    ...prev,
                    [lineId]: clearedDraft,
                }));
                reset({
                    importBatchId: String(resolvedBatch.id),
                    importBatchLineId: lineId,
                    stationId: String(selectedLine.lotteryStationId),
                    serials: clearedDraft.serials,
                    numbers: clearedDraft.numbers,
                    drawDate: resolvedBatch.drawDate,
                });
            } else {
                toast.error(res.message || 'Nhập vé số thất bại');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Đã xảy ra lỗi khi nhập vé số');
        }
    };

    const isLoading = isBatchLoading || (!isBatchPreSelected && isLoadingDrafts);

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
                <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', pb: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                            Phiếu nhập lô
                        </Typography>

                        {!isBatchPreSelected && (
                            <Autocomplete
                                sx={{ mb: 2 }}
                                options={draftBatches}
                                loading={isLoadingDrafts}
                                value={
                                    selectedBatchId
                                        ? draftBatches.find(
                                              (batch) => String(batch.id) === String(selectedBatchId)
                                          ) ?? null
                                        : null
                                }
                                onChange={(_e, batch) => handleBatchChange(batch)}
                                getOptionLabel={formatImportBatchSelectLabel}
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

                        <ImportBatchSelectionCard
                            batch={resolvedBatch}
                            isLoading={isBatchLoading}
                            selectedBatchId={selectedBatchId}
                        />

                        {resolvedBatch && resolvedBatch.status === 'CANCELLED' && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {getImportBatchCancelledAlertMessage(resolvedBatch.cancelReason)}
                            </Alert>
                        )}

                        {resolvedBatch &&
                            resolvedBatch.status !== 'DRAFT' &&
                            resolvedBatch.status !== 'CANCELLED' && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    Phiếu nhập lô này không còn ở trạng thái Nháp. Không thể nhập thêm vé.
                                </Alert>
                            )}
                    </Paper>

                    {resolvedBatch && batchLines.length > 0 && (
                        <ImportBatchLineImportTabs
                            lines={batchLines}
                            activeLineId={watchedLineId}
                            batchStatus={resolvedBatch.status}
                            drawDate={resolvedBatch.drawDate}
                            resolveStationName={resolveStationName}
                            onTabChange={handleTabChange}
                            onSubmit={handleSubmit(onSubmit)}
                            isSubmitting={isPending}
                            control={control}
                            errors={errors}
                            fields={fields}
                            append={append}
                            remove={remove}
                        />
                    )}

                    {!resolvedBatch && !isLoading && (
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

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <LoadingButton
                            type="button"
                            variant="outlined"
                            label="Quay lại"
                            onClick={() => navigate(ROUTES.ADMIN.TICKETS.LIST)}
                            sx={{ minHeight: '2.75rem' }}
                        />
                    </Box>
                </Stack>
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
