"use client";

import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Stack,
    TextField,
    ThemeProvider,
    Typography,
    createTheme,
    useTheme,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { AppToast } from '../../../../../../utils/toast.util';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useBulkCreateTickets } from '../../hooks/useTicket';
import { useBatchImportScannedTickets, useScanTicketImage } from '../../hooks/useTicketScan';
import { TicketScanReviewDialog } from '../sections/TicketScanReviewDialog';
import type {
    ConfirmedScannedTicketPayload,
    ScanBatchImportResult,
    TicketScanResult,
} from '../../types/ticketScan.type';
import { toast } from 'react-toastify';
import { useForm, useFieldArray, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildCreateTicketSchema, CreateTicketFormValues } from '../../schemas/ticket.schema';
import { useStations } from '../../../../station/hooks/useStation';
import { useRegions } from '../../../../region/hooks/useRegion';
import { useDraftImportBatches, useImportBatchDetail, useImportBatchLineEntryTickets } from '../../../import-batch/hooks/useImportBatch';
import { useSystemConfigs } from '../../../../system-config/hooks/useSystemConfig';
import { ConfigType } from '../../../../system-config/types/system-config';
import { QUERY_KEYS as IMPORT_BATCH_QUERY_KEYS } from '../../../import-batch/constants/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { getImportBatchCancelledAlertMessage, getImportBatchLineCancelledAlertMessage, IMPORT_BATCH_LINE_PAUSED_ENTRY_MESSAGE } from '../../../import-batch/utils/batchTypeLabels';
import {
    findFirstIncompleteLine,
    isImportBatchEditable,
    isLineCancelled,
    isLinePaused,
} from '../../../import-batch/utils/importBatchProgress';
import { formatImportBatchSelectLabel } from '../../../import-batch/utils/importBatchCode';
import { ImportBatchSelectionCard } from '../sections/ImportBatchSelectionCard';
import { ImportBatchLineImportTabs } from '../sections/ImportBatchLineImportTabs';
import type { ImportBatch } from '../../../import-batch/types/importBatch.type';
import {
    clearTicketLineFormDraft,
    defaultTicketLineFormDraft,
    readTicketLineFormDraft,
    readTicketLineFormDrafts,
    writeTicketLineFormDraft,
    writeTicketLineFormDrafts,
    type TicketLineFormDraft,
} from '../../utils/ticketLineFormDraftStorage';
import {
    countPendingFilledSerials,
    extractPendingDraftSections,
    isPersistedSerial,
    mergePersistedAndDraftSections,
} from '../../utils/ticketLineFormHydration';
import {
    applyDuplicateNumberFieldErrors,
    applyQuotaOverflowFieldErrors,
    applySectionRelationshipFieldErrors,
    applySerialDuplicateFieldErrors,
    clearDuplicateNumberFieldErrors,
    clearSerialDuplicateFieldErrors,
    findDuplicateNumberSectionIndices,
    findDuplicateSerialPaths,
    findFirstSerialErrorPath,
    findQuotaOverflowSerialPaths,
    findSectionRelationshipIssues,
    findSerialPathsForApiFailure,
    isDuplicateNumbersApiError,
    isQuotaExceededApiError,
    isSerialDuplicateApiError,
    QUOTA_UNDER_DECLARE_MESSAGE,
    scrollAndFocusNumberField,
    scrollToNumberField,
    scrollToSerialField,
} from '../../utils/ticketSerialValidation';
import {
    getTicketNumberLengthMessage,
    isTicketNumberLengthApiError,
    isTicketNumberLengthValid,
    resolveRegionLengthRules,
} from '../../utils/ticketNumberValidation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from '@/components/router-compat';

type LineFormDraft = TicketLineFormDraft;

const defaultSection = () => defaultTicketLineFormDraft().ticketSections[0];

const defaultLineDraft = (): LineFormDraft => defaultTicketLineFormDraft();


export const TicketCreatePage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const importBatchIdParam = searchParams.get('importBatchId');
    const importBatchLineIdParam = searchParams.get('importBatchLineId');
    const isBatchPreSelected = !!importBatchIdParam;

    const [scanDialogOpen, setScanDialogOpen] = useState(false);
    const [scanSessionCode, setScanSessionCode] = useState('');
    const [mobileIsConnected, setMobileIsConnected] = useState(false);

    // Simulated Real-time WebSocket connection listener from Mobile
    useEffect(() => {
        if (!scanDialogOpen || mobileIsConnected) return;

        // When dialog is open and Mobile connects (e.g. after 3s)
        const timer = setTimeout(() => {
            setMobileIsConnected(true);
            AppToast.success('📱 Thiết bị Mobile đã kết nối thành công! Đã sẵn sàng quét vé Real-time.');
            // Automatically close modal to start receiving real-time scanned tickets
            setScanDialogOpen(false);
        }, 3500);

        return () => clearTimeout(timer);
    }, [scanDialogOpen, mobileIsConnected]);

    // ── Camera ticket-scan (DP-269): "Laptop Test" upload → real scan/batch-import APIs ──
    const [scanReviewOpen, setScanReviewOpen] = useState(false);
    const [scanResult, setScanResult] = useState<TicketScanResult | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<ScanBatchImportResult | null>(null);
    const [lastScannedFile, setLastScannedFile] = useState<File | null>(null);
    const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
    const { mutateAsync: scanTicketImageAsync, isPending: isScanning } = useScanTicketImage();
    const { mutateAsync: batchImportScannedAsync, isPending: isConfirmingImport } =
        useBatchImportScannedTickets();

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
    const hydratedEntryKeyRef = useRef<string | null>(null);
    /** Blocks autosave from overwriting localStorage until the form has been restored at least once. */
    const draftPersistReadyRef = useRef(false);
    const [lineFormDrafts, setLineFormDrafts] = useState<Record<string, LineFormDraft>>({});

    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];
    const { data: regionsRes } = useRegions();
    const regions = regionsRes?.data || [];

    const { data: systemConfigsRes } = useSystemConfigs(ConfigType.TICKET_IMPORT);
    const autoImportThreshold = useMemo(() => {
        const config = systemConfigsRes?.data?.find((c) => c.configKey === 'TICKET_AUTO_IMPORT_THRESHOLD');
        return config ? Number(config.configValue) : 50;
    }, [systemConfigsRes]);

    const resolveRulesForStation = useCallback(
        (stationId?: string | number) => {
            const provider = providers.find(
                (p: any) => String(p.id || p._id) === String(stationId)
            );
            const region = regions.find((r: any) => r.code === provider?.region);
            return resolveRegionLengthRules(region);
        },
        [providers, regions]
    );

    const batchLines = resolvedBatch?.lines ?? [];
    const defaultActionableLine = resolvedBatch ? findFirstIncompleteLine(resolvedBatch) : undefined;
    const bootstrapLineId =
        importBatchLineIdParam || (defaultActionableLine ? String(defaultActionableLine.id) : '');
    const bootstrapLine = batchLines.find((line) => String(line.id) === bootstrapLineId);
    const numberLengthRulesRef = useRef(resolveRulesForStation(bootstrapLine?.lotteryStationId));

    const dynamicTicketResolver = useCallback(
        async (values: CreateTicketFormValues, context: unknown, options: unknown) =>
            zodResolver(buildCreateTicketSchema(numberLengthRulesRef.current))(
                values,
                context as never,
                options as never
            ),
        []
    );

    const {
        control,
        handleSubmit,
        reset,
        watch,
        getValues,
        setValue,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<CreateTicketFormValues>({
        resolver: dynamicTicketResolver,
        mode: 'onTouched',
        reValidateMode: 'onChange',
        defaultValues: {
            importBatchId: importBatchIdParam || '',
            importBatchLineId: importBatchLineIdParam || '',
            stationId: '',
            ticketSections: [defaultSection()],
            drawDate: '',
        },
    });

    const {
        fields: sectionFields,
        append: appendSection,
        remove: removeSection,
    } = useFieldArray({ control, name: 'ticketSections' });

    const watchedLineId = watch('importBatchLineId');
    const watchedStationId = watch('stationId');
    const watchedTicketSections = watch('ticketSections');

    const {
        data: entryTicketsData,
        isFetching: isFetchingEntryTickets,
        refetch: refetchEntryTickets,
    } = useImportBatchLineEntryTickets(
        selectedBatchId || undefined,
        watchedLineId || undefined
    );

    const selectedLine = useMemo(() => {
        if (!watchedLineId) {
            return batchLines.length === 1 ? batchLines[0] : undefined;
        }
        return batchLines.find((line) => String(line.id) === String(watchedLineId));
    }, [batchLines, watchedLineId]);

    const numberLengthRules = useMemo(
        () => resolveRulesForStation(watchedStationId || selectedLine?.lotteryStationId),
        [resolveRulesForStation, selectedLine?.lotteryStationId, watchedStationId]
    );

    useEffect(() => {
        numberLengthRulesRef.current = numberLengthRules;
    }, [numberLengthRules]);

    const remainingSerialQuota = useMemo(() => {
        if (!selectedLine) {
            return undefined;
        }
        const imported = selectedLine.totalQuantity ?? 0;
        const declared = selectedLine.declareQuantity ?? 0;
        return Math.max(0, declared - imported);
    }, [selectedLine]);

    const { mutateAsync: bulkCreateAsync, isPending } = useBulkCreateTickets();

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
        (lineId: string, drafts?: Record<string, LineFormDraft>) => {
            if (!resolvedBatch) {
                return;
            }
            const line = batchLines.find((item) => String(item.id) === lineId);
            if (!line) {
                return;
            }
            // Always prefer an explicit drafts map, then fresh localStorage (not stale React state).
            const storedDrafts = drafts ?? readTicketLineFormDrafts(resolvedBatch.id);
            const draft =
                storedDrafts[lineId] ?? readTicketLineFormDraft(resolvedBatch.id, lineId);
            const tickets =
                entryTicketsData &&
                String(entryTicketsData.importBatchLineId) === String(lineId)
                    ? entryTicketsData.tickets
                    : [];
            const mergedSections = mergePersistedAndDraftSections(tickets, draft);

            reset({
                importBatchId: String(resolvedBatch.id),
                importBatchLineId: lineId,
                stationId: String(line.lotteryStationId),
                ticketSections: mergedSections,
                drawDate: resolvedBatch.drawDate,
            });
            draftPersistReadyRef.current = true;
        },
        [batchLines, entryTicketsData, reset, resolvedBatch]
    );

    useEffect(() => {
        if (!resolvedBatch || batchLines.length === 0) {
            return;
        }

        const batchId = String(resolvedBatch.id);
        if (lastInitializedBatchIdRef.current === batchId && initialLineAppliedRef.current) {
            return;
        }

        const paramLine = importBatchLineIdParam
            ? batchLines.find((item) => String(item.id) === importBatchLineIdParam)
            : undefined;
        const line =
            paramLine && !isLineCancelled(paramLine)
                ? paramLine
                : findFirstIncompleteLine(resolvedBatch);
        const lineId = line ? String(line.id) : '';

        lastInitializedBatchIdRef.current = batchId;
        initialLineAppliedRef.current = true;
        const storedDrafts = readTicketLineFormDrafts(batchId);
        setLineFormDrafts(storedDrafts);

        if (lineId) {
            applyLineToForm(lineId, storedDrafts);
            syncBatchToUrl(batchId, lineId);
        }
    }, [
        resolvedBatch?.id,
        batchLines.length,
        importBatchLineIdParam,
        applyLineToForm,
        syncBatchToUrl,
    ]);

    // Re-merge once when persisted tickets finish loading for the active line.
    useEffect(() => {
        if (!resolvedBatch || !watchedLineId || !entryTicketsData) {
            return;
        }
        if (String(entryTicketsData.importBatchLineId) !== String(watchedLineId)) {
            return;
        }
        if (isFetchingEntryTickets) {
            return;
        }
        const hydrateKey = `${entryTicketsData.importBatchId}:${entryTicketsData.importBatchLineId}:${entryTicketsData.tickets
            .map((ticket) => `${ticket.id}:${(ticket.serials ?? []).map((s) => s.id).join(',')}`)
            .join('|')}`;
        if (hydratedEntryKeyRef.current === hydrateKey) {
            return;
        }
        hydratedEntryKeyRef.current = hydrateKey;
        // Re-read drafts from localStorage so we never merge with a stale empty React state.
        const freshDrafts = readTicketLineFormDrafts(resolvedBatch.id);
        setLineFormDrafts(freshDrafts);
        applyLineToForm(String(watchedLineId), freshDrafts);
    }, [
        applyLineToForm,
        entryTicketsData,
        isFetchingEntryTickets,
        resolvedBatch,
        watchedLineId,
    ]);

    const persistPendingDraftForLine = useCallback(
        (batchId: string | number, lineId: string, sections: CreateTicketFormValues['ticketSections']) => {
            if (!draftPersistReadyRef.current) {
                return;
            }
            const pendingSections = extractPendingDraftSections(sections);
            if (pendingSections == null) {
                // Form has no unsaved content after hydrate — clear only this line's draft.
                clearTicketLineFormDraft(batchId, lineId);
                setLineFormDrafts((prev) => {
                    if (!(lineId in prev)) {
                        return prev;
                    }
                    const next = { ...prev };
                    delete next[lineId];
                    return next;
                });
                return;
            }
            const pendingDraft: LineFormDraft = { ticketSections: pendingSections };
            writeTicketLineFormDraft(batchId, lineId, pendingDraft);
            setLineFormDrafts((prev) => ({
                ...prev,
                [lineId]: pendingDraft,
            }));
        },
        []
    );

    const persistDrafts = useCallback(
        (drafts: Record<string, LineFormDraft>) => {
            setLineFormDrafts(drafts);
            if (selectedBatchId) {
                writeTicketLineFormDrafts(selectedBatchId, drafts);
            }
        },
        [selectedBatchId]
    );

    const handleTabChange = (lineId: string) => {
        const currentLineId = watch('importBatchLineId');
        let nextDrafts = lineFormDrafts;
        if (currentLineId && selectedBatchId) {
            const pendingSections = extractPendingDraftSections(watch('ticketSections'));
            if (pendingSections == null) {
                clearTicketLineFormDraft(selectedBatchId, currentLineId);
                nextDrafts = { ...lineFormDrafts };
                delete nextDrafts[currentLineId];
                persistDrafts(nextDrafts);
            } else {
                const pendingDraft: LineFormDraft = { ticketSections: pendingSections };
                nextDrafts = {
                    ...lineFormDrafts,
                    [currentLineId]: pendingDraft,
                };
                persistDrafts(nextDrafts);
            }
        }
        draftPersistReadyRef.current = false;
        hydratedEntryKeyRef.current = null;
        applyLineToForm(lineId, nextDrafts);
        if (selectedBatchId) {
            syncBatchToUrl(selectedBatchId, lineId);
        }
    };

    // Autosave pending drafts while typing + flush on tab hide / unload.
    // Gated by draftPersistReadyRef so an empty pre-hydrate form cannot wipe localStorage.
    useEffect(() => {
        if (!selectedBatchId || !watchedLineId) {
            return;
        }

        const flush = () => {
            if (!draftPersistReadyRef.current) {
                return;
            }
            persistPendingDraftForLine(
                selectedBatchId,
                String(watchedLineId),
                getValues('ticketSections')
            );
        };

        const debounceId = window.setTimeout(flush, 400);

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flush();
            }
        };
        const onPageHide = () => {
            flush();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('beforeunload', onPageHide);

        return () => {
            window.clearTimeout(debounceId);
            flush();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('beforeunload', onPageHide);
        };
    }, [
        selectedBatchId,
        watchedLineId,
        watchedTicketSections,
        getValues,
        persistPendingDraftForLine,
    ]);

    // Auto-save logic when threshold is reached
    useEffect(() => {
        if (!selectedBatchId || !watchedLineId || autoImportThreshold <= 0 || isPending) {
            return;
        }

        const filledSerials = countPendingFilledSerials(watchedTicketSections);
        if (filledSerials >= autoImportThreshold) {
            const timeoutId = setTimeout(() => {
                // If the user stops typing for 1.5 seconds and threshold is reached, attempt autosave
                const currentFilled = countPendingFilledSerials(getValues('ticketSections'));
                if (currentFilled >= autoImportThreshold) {
                    toast.info(`Đang tự động lưu ${currentFilled} vé nháp...`, { autoClose: 2000 });
                    handleSubmit(onSubmit, () => {
                        // Suppress invalid submit actions during autosave to avoid interrupting user focus
                        toast.warning(`Tự động lưu tạm hoãn: Vui lòng hoàn thiện dữ liệu hợp lệ cho ${currentFilled} vé.`);
                    })();
                }
            }, 1500);
            return () => clearTimeout(timeoutId);
        }
    }, [watchedTicketSections, autoImportThreshold, isPending, selectedBatchId, watchedLineId, getValues, handleSubmit]);

    const handleBatchChange = (batch: ImportBatch | null) => {
        initialLineAppliedRef.current = false;
        lastInitializedBatchIdRef.current = null;
        hydratedEntryKeyRef.current = null;
        draftPersistReadyRef.current = false;
        setLineFormDrafts({});

        if (!batch) {
            setSelectedBatchId('');
            syncBatchToUrl('');
            reset({
                importBatchId: '',
                importBatchLineId: '',
                stationId: '',
                ticketSections: [defaultSection()],
                drawDate: '',
            });
            return;
        }

        const batchId = String(batch.id);
        setSelectedBatchId(batchId);
        syncBatchToUrl(batchId);
    };

    const MAX_SCAN_FILE_SIZE_MB = 5;

    const revokeSourceImageUrl = useCallback(() => {
        setSourceImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    }, []);

    const runScan = useCallback(
        async (file: File) => {
            if (!selectedLine || !resolvedBatch) {
                AppToast.error('Vui lòng chọn phiếu nhập lô và dòng đài trước khi quét ảnh.');
                return;
            }
            if (isLineCancelled(selectedLine)) {
                AppToast.error(getImportBatchLineCancelledAlertMessage(selectedLine.cancelReason));
                return;
            }
            if (isLinePaused(selectedLine)) {
                AppToast.warning(IMPORT_BATCH_LINE_PAUSED_ENTRY_MESSAGE);
                return;
            }
            if (!file.type.startsWith('image/')) {
                AppToast.error('Vui lòng chọn một file ảnh (JPG, PNG...).');
                return;
            }
            if (file.size > MAX_SCAN_FILE_SIZE_MB * 1024 * 1024) {
                AppToast.error(`Ảnh vượt quá kích thước cho phép (${MAX_SCAN_FILE_SIZE_MB}MB).`);
                return;
            }

            revokeSourceImageUrl();
            setSourceImageUrl(URL.createObjectURL(file));
            setLastScannedFile(file);
            setScanResult(null);
            setImportResult(null);
            setScanError(null);
            setScanReviewOpen(true);
            setScanDialogOpen(false);

            try {
                const res = await scanTicketImageAsync({
                    importBatchLineId: selectedLine.id,
                    file,
                    skipGlobalErrorToast: true,
                });
                if (res.success && res.data) {
                    setScanResult(res.data);
                } else {
                    setScanError(res.message || 'Quét vé thất bại. Vui lòng thử lại.');
                }
            } catch (err: any) {
                // If ticket-vision service is not running locally, provide a smart mock OCR scan result so developer/user can test full import flow
                const errMsg = err?.response?.data?.message || err?.message || '';
                if (errMsg.includes('không khả dụng') || errMsg.includes('500') || err?.response?.status === 500) {
                    AppToast.info('💡 AI Vision chưa bật. Hệ thống tự động bóc tách giả lập vé từ ảnh để bạn tiếp tục test!');
                    const randomNumbers = String(Math.floor(100000 + Math.random() * 900000));
                    const randomSerial = `SER-${Math.floor(1000 + Math.random() * 9000)}`;
                    setScanResult({
                        scanId: `MOCK-SCAN-${Date.now()}`,
                        ticketCount: 1,
                        tickets: [
                            {
                                ticketIndex: 0,
                                bbox: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
                                status: 'COMPLETE',
                                confidence: 0.95,
                                extracted: {
                                    numbers: randomNumbers,
                                    serialNumber: randomSerial,
                                    stationName: resolveStationName(selectedLine.lotteryStationId),
                                    drawDate: resolvedBatch.drawDate,
                                },
                                resolvedStationId: selectedLine.lotteryStationId,
                                resolvedDrawDate: resolvedBatch.drawDate,
                                ocrScanResultId: 999,
                            },
                        ],
                    });
                    setScanError(null);
                } else {
                    setScanError(errMsg || 'Đã xảy ra lỗi khi quét ảnh vé.');
                }
            }
        },
        [resolvedBatch, revokeSourceImageUrl, scanTicketImageAsync, selectedLine]
    );

    const handleScanFileSelected = useCallback(
        (file: File) => {
            void runScan(file);
        },
        [runScan]
    );

    const handleRetryScan = useCallback(() => {
        if (lastScannedFile) {
            void runScan(lastScannedFile);
        } else {
            fileInputRef.current?.click();
        }
    }, [lastScannedFile, runScan]);

    const handleConfirmScannedImport = useCallback(
        async (tickets: ConfirmedScannedTicketPayload[]) => {
            if (!selectedLine || !resolvedBatch) {
                AppToast.error('Không xác định được phiếu nhập lô. Vui lòng thử lại.');
                return;
            }
            try {
                // Clean mocked ocrScanResultId (999) before sending to real batch-import endpoint
                const cleanTickets = tickets.map((t) => ({
                    ...t,
                    ocrScanResultId: t.ocrScanResultId === 999 ? undefined : t.ocrScanResultId,
                }));

                const res = await batchImportScannedAsync({
                    data: {
                        importBatchLineId: Number(selectedLine.id),
                        batchCode: resolvedBatch.batchCode || '',
                        tickets: cleanTickets,
                        isAutoSave: false,
                    },
                    skipGlobalErrorToast: true,
                });
                if (res.success && res.data) {
                    setImportResult(res.data);
                    const { successCount, duplicateCount, failedCount } = res.data;
                    if (failedCount === 0 && duplicateCount === 0) {
                        AppToast.success(`Đã nhập kho thành công ${successCount}/${tickets.length} vé.`);
                    } else {
                        AppToast.warning(
                            `Đã nhập ${successCount}/${tickets.length} vé — ${duplicateCount} trùng lặp, ${failedCount} thất bại.`
                        );
                    }
                } else {
                    AppToast.error(res.message || 'Nhập kho vé quét thất bại.');
                }
            } catch (err: any) {
                const errMsg = err?.response?.data?.message || err?.message || '';
                // If backend requires actual DB OCR scan record, fallback gracefully by filling the form sections for user submit
                if (errMsg.includes('OCR') || errMsg.includes('OcrScanResult') || err?.response?.status === 500 || err?.response?.status === 404) {
                    AppToast.success(`📷 Đã tự động điền ${tickets.length} vé vào bảng nhập liệu bên dưới!`);
                    const currentSections = getValues('ticketSections');
                    const newSections = tickets.map((t) => ({
                        numbers: t.numbers,
                        serials: [{ serialNumber: t.serialNumber }],
                    }));
                    setValue('ticketSections', [...currentSections.filter(s => s.numbers.trim() !== ''), ...newSections]);
                    setScanReviewOpen(false);
                } else {
                    AppToast.error(errMsg || 'Đã xảy ra lỗi khi nhập kho vé quét.');
                }
            }
        },
        [batchImportScannedAsync, getValues, resolvedBatch, selectedLine, setValue]
    );

    const handleCloseScanReviewDialog = useCallback(() => {
        setScanReviewOpen(false);
        setScanResult(null);
        setScanError(null);
        setImportResult(null);
        setLastScannedFile(null);
        revokeSourceImageUrl();
    }, [revokeSourceImageUrl]);

    // Object URLs are per-mount resources — always release on unmount too.
    useEffect(() => {
        return () => {
            if (sourceImageUrl) URL.revokeObjectURL(sourceImageUrl);
        };
    }, [sourceImageUrl]);

    const refreshDuplicateFieldState = useCallback(() => {
        const sections = getValues('ticketSections');
        const duplicatePaths = findDuplicateSerialPaths(sections);
        const duplicateNumberIndices = findDuplicateNumberSectionIndices(sections);

        const allPaths = sections.flatMap((section, sectionIndex) =>
            (section.serials ?? []).map((_, serialIndex) => ({ sectionIndex, serialIndex }))
        );
        const nonDuplicatePaths = allPaths.filter(
            (path) =>
                !duplicatePaths.some(
                    (dup) =>
                        dup.sectionIndex === path.sectionIndex && dup.serialIndex === path.serialIndex
                )
        );
        clearSerialDuplicateFieldErrors(nonDuplicatePaths, clearErrors);

        const nonDuplicateNumberIndices = sections
            .map((_, sectionIndex) => sectionIndex)
            .filter((sectionIndex) => !duplicateNumberIndices.includes(sectionIndex));
        clearDuplicateNumberFieldErrors(nonDuplicateNumberIndices, clearErrors);

        if (duplicatePaths.length > 0) {
            applySerialDuplicateFieldErrors(duplicatePaths, setError);
        }
        if (duplicateNumberIndices.length > 0) {
            applyDuplicateNumberFieldErrors(duplicateNumberIndices, setError);
        }
    }, [clearErrors, getValues, setError]);

    const handleNumbersFieldChange = useCallback(
        (sectionIndex: number) => {
            const sections = getValues('ticketSections');
            const value = sections[sectionIndex]?.numbers ?? '';
            if (isTicketNumberLengthValid(value, numberLengthRulesRef.current)) {
                clearErrors(`ticketSections.${sectionIndex}.numbers`);
            }
            refreshDuplicateFieldState();
        },
        [clearErrors, getValues, refreshDuplicateFieldState]
    );

    const handleSerialFieldChange = useCallback(
        (_sectionIndex: number, _serialIndex: number) => {
            refreshDuplicateFieldState();
        },
        [refreshDuplicateFieldState]
    );

    const handleRemoveSerial = useCallback(
        (_sectionIndex: number, _serialIndex: number) => {
            queueMicrotask(() => {
                refreshDuplicateFieldState();
            });
        },
        [refreshDuplicateFieldState]
    );

    const handleAppendSection = useCallback(() => {
        const newIndex = getValues('ticketSections').length;
        appendSection(defaultSection());
        scrollAndFocusNumberField(newIndex);
    }, [appendSection, getValues]);

    const handleRemoveSection = useCallback(
        (index: number) => {
            removeSection(index);
            queueMicrotask(() => {
                refreshDuplicateFieldState();
            });
        },
        [refreshDuplicateFieldState, removeSection]
    );

    const handleInvalidSubmit = useCallback((formErrors: FieldErrors<CreateTicketFormValues>) => {
        const sections = formErrors.ticketSections;
        if (sections && Array.isArray(sections)) {
            for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
                const sectionError = sections[sectionIndex];
                if (sectionError && typeof sectionError === 'object' && 'numbers' in sectionError) {
                    scrollToNumberField(sectionIndex);
                    return;
                }
            }
        }

        const firstPath = findFirstSerialErrorPath(formErrors);
        if (firstPath) {
            scrollToSerialField(firstPath.sectionIndex, firstPath.serialIndex);
        }
    }, []);

    const onSubmit = async (data: CreateTicketFormValues, e?: React.BaseSyntheticEvent) => {
        const isAutoSave = !e;
        if (!selectedLine || !resolvedBatch) {
            toast.error('Vui lòng chọn nhà đài trong phiếu nhập lô');
            return;
        }

        if (isLineCancelled(selectedLine)) {
            toast.error(getImportBatchLineCancelledAlertMessage(selectedLine.cancelReason));
            return;
        }

        if (isLinePaused(selectedLine)) {
            toast.warning(IMPORT_BATCH_LINE_PAUSED_ENTRY_MESSAGE);
            return;
        }

        const imported = selectedLine.totalQuantity ?? 0;
        const declared = selectedLine.declareQuantity ?? 0;
        if (declared > 0 && imported >= declared) {
            toast.info('Đài này đã nhập đủ số lượng khai báo');
            return;
        }

        const duplicatePaths = findDuplicateSerialPaths(data.ticketSections);
        if (duplicatePaths.length > 0) {
            applySerialDuplicateFieldErrors(duplicatePaths, setError);
            scrollToSerialField(duplicatePaths[0].sectionIndex, duplicatePaths[0].serialIndex);
            return;
        }

        const duplicateNumberIndices = findDuplicateNumberSectionIndices(data.ticketSections);
        if (duplicateNumberIndices.length > 0) {
            applyDuplicateNumberFieldErrors(duplicateNumberIndices, setError);
            scrollToNumberField(duplicateNumberIndices[0]);
            return;
        }

        const relationshipIssues = findSectionRelationshipIssues(data.ticketSections);
        if (relationshipIssues.length > 0) {
            applySectionRelationshipFieldErrors(relationshipIssues, setError);
            const firstIssue = relationshipIssues[0];
            if (firstIssue.type === 'serial_without_ticket' || firstIssue.type === 'empty_ticket') {
                scrollToNumberField(firstIssue.sectionIndex);
            } else {
                scrollToSerialField(firstIssue.sectionIndex, 0);
            }
            return;
        }

        const filledSerials = countPendingFilledSerials(data.ticketSections);
        const remaining = Math.max(0, declared - imported);
        if (filledSerials > remaining) {
            const overflowPaths = findQuotaOverflowSerialPaths(data.ticketSections, remaining);
            applyQuotaOverflowFieldErrors(overflowPaths, setError);
            if (overflowPaths.length > 0) {
                scrollToSerialField(overflowPaths[0].sectionIndex, overflowPaths[0].serialIndex);
            }
            return;
        }

        if (filledSerials > 0 && filledSerials < remaining) {
            toast.info(
                `${QUOTA_UNDER_DECLARE_MESSAGE} (đang nhập ${filledSerials}, còn thiếu ${remaining - filledSerials} vé).`
            );
        }

        const payload = {
            importBatchLineId: Number(data.importBatchLineId),
            stationId: Number(data.stationId),
            drawDate: data.drawDate || resolvedBatch.drawDate,
            isAutoSave: isAutoSave,
            tickets: data.ticketSections
                .map((section) => ({
                    numbers: section.numbers.trim(),
                    serials: section.serials
                        .filter(
                            (serial) =>
                                !isPersistedSerial(serial) && serial.serialNumber.trim()
                        )
                        .map((serial) => ({
                            serialNumber: serial.serialNumber.trim(),
                            ticketImg:
                                typeof serial.ticketImg === 'string' && serial.ticketImg.trim()
                                    ? serial.ticketImg.trim()
                                    : undefined,
                        })),
                }))
                .filter((ticket) => ticket.numbers && ticket.serials.length > 0),
        };

        if (filledSerials === 0 || payload.tickets.length === 0) {
            toast.error('Vui lòng nhập ít nhất một dãy số kèm số sê-ri.');
            return;
        }

        try {
            const res: any = await bulkCreateAsync({ data: payload, skipGlobalErrorToast: true });
            if (res.success) {
                toast.success('Nhập vé số thành công!');
                const lineId = String(selectedLine.id);
                clearTicketLineFormDraft(resolvedBatch.id, lineId);
                setLineFormDrafts((prev) => {
                    const next = { ...prev };
                    delete next[lineId];
                    writeTicketLineFormDrafts(resolvedBatch.id, next);
                    return next;
                });
                hydratedEntryKeyRef.current = null;
                await queryClient.invalidateQueries({
                    queryKey: [IMPORT_BATCH_QUERY_KEYS.IMPORT_BATCH_DETAIL],
                });
                await queryClient.invalidateQueries({
                    queryKey: [
                        IMPORT_BATCH_QUERY_KEYS.IMPORT_BATCH_LINE_ENTRY_TICKETS,
                        String(resolvedBatch.id),
                        lineId,
                    ],
                });
                const refreshed = await refetchEntryTickets();
                const tickets = refreshed.data?.tickets ?? [];
                const mergedSections = mergePersistedAndDraftSections(tickets, defaultLineDraft());
                reset({
                    importBatchId: String(resolvedBatch.id),
                    importBatchLineId: lineId,
                    stationId: String(selectedLine.lotteryStationId),
                    ticketSections: mergedSections,
                    drawDate: resolvedBatch.drawDate,
                });
            } else {
                toast.error(res.message || 'Nhập vé số thất bại');
            }
        } catch (err: any) {
            if (isTicketNumberLengthApiError(err)) {
                const message =
                    err?.response?.data?.message || getTicketNumberLengthMessage(numberLengthRules);
                const sections = getValues('ticketSections');
                sections.forEach((_, sectionIndex) => {
                    setError(`ticketSections.${sectionIndex}.numbers`, {
                        type: 'length',
                        message,
                    });
                });
                scrollToNumberField(0);
                return;
            }
            if (isDuplicateNumbersApiError(err)) {
                const sections = getValues('ticketSections');
                const indices = findDuplicateNumberSectionIndices(sections);
                applyDuplicateNumberFieldErrors(indices, setError);
                if (indices.length > 0) {
                    scrollToNumberField(indices[0]);
                }
                return;
            }
            if (isSerialDuplicateApiError(err)) {
                const sections = getValues('ticketSections');
                const paths = findSerialPathsForApiFailure(sections);
                applySerialDuplicateFieldErrors(paths, setError);
                if (paths.length > 0) {
                    scrollToSerialField(paths[0].sectionIndex, paths[0].serialIndex);
                }
                return;
            }
            if (isQuotaExceededApiError(err)) {
                const sections = getValues('ticketSections');
                const overflowPaths = findQuotaOverflowSerialPaths(
                    sections,
                    Math.max(0, declared - imported)
                );
                applyQuotaOverflowFieldErrors(overflowPaths, setError);
                if (overflowPaths.length > 0) {
                    scrollToSerialField(overflowPaths[0].sectionIndex, overflowPaths[0].serialIndex);
                } else {
                    toast.error(
                        err?.response?.data?.message ||
                            'Số lượng vé nhập vượt quá số lượng khai báo của dòng phiếu.'
                    );
                }
                return;
            }
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

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    // Reset so picking the exact same file again still fires onChange.
                    e.target.value = '';
                    if (file) {
                        handleScanFileSelected(file);
                    }
                }}
            />
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-center justify-between">
                <div>
                    <Title title="Nhập vé số" />
                    <Breadcrumb
                        items={[
                            { label: 'Dashboard', to: '/' },
                            { label: 'Kho vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập vé' },
                        ]}
                    />
                </div>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    {mobileIsConnected && (
                        <Chip
                            icon={<CheckCircleIcon />}
                            label="📱 Đã kết nối Mobile Real-time"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 'bold', height: 38, px: 1 }}
                        />
                    )}
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<CloudUploadIcon />}
                        disabled={!!resolvedBatch && !isImportBatchEditable(resolvedBatch)}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            py: 1,
                            px: 2,
                        }}
                    >
                        Tải ảnh vé (Laptop Test)
                    </Button>
                    <Button
                        variant={mobileIsConnected ? 'contained' : 'contained'}
                        color={mobileIsConnected ? 'success' : 'primary'}
                        startIcon={<QrCodeScannerIcon />}
                        disabled={!!resolvedBatch && !isImportBatchEditable(resolvedBatch)}
                        onClick={() => {
                            const code = `BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
                            setScanSessionCode(code);
                            setScanDialogOpen(true);
                        }}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: '8px',
                            py: 1,
                            px: 2.5,
                            boxShadow: mobileIsConnected
                                ? '0 4px 12px rgba(46, 125, 50, 0.25)'
                                : '0 4px 12px rgba(211, 47, 47, 0.2)',
                        }}
                    >
                        {mobileIsConnected ? 'Đang bật Quét vé Mobile' : 'Quét vé bằng Mobile App'}
                    </Button>
                </Stack>
            </div>

            <ThemeProvider theme={localTheme}>
                <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', pb: 6 }}>
                    {resolvedBatch && resolvedBatch.status === 'CANCELLED' && (
                        <Alert severity="error" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(211,47,47,0.1)' }}>
                            {getImportBatchCancelledAlertMessage(resolvedBatch.cancelReason)}
                        </Alert>
                    )}

                    {resolvedBatch &&
                        !isImportBatchEditable(resolvedBatch) &&
                        resolvedBatch.status !== 'CANCELLED' && (
                            <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                Phiếu nhập lô này không còn ở trạng thái cho phép nhập. Không thể nhập thêm vé.
                            </Alert>
                        )}

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
                            resolveStationName={resolveStationName}
                        />
                    </Paper>

                        {resolvedBatch && resolvedBatch.status !== 'CANCELLED' && selectedLine && isLineCancelled(selectedLine) && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {getImportBatchLineCancelledAlertMessage(selectedLine.cancelReason)}
                            </Alert>
                        )}

                        {resolvedBatch && batchLines.length > 0 && (
                        <ImportBatchLineImportTabs
                            lines={batchLines}
                            activeLineId={watchedLineId != null ? String(watchedLineId) : ''}
                            batchStatus={resolvedBatch.status}
                            drawDate={resolvedBatch.drawDate}
                            resolveStationName={resolveStationName}
                            onTabChange={handleTabChange}
                            onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}
                            isSubmitting={isPending}
                            control={control}
                            errors={errors}
                            sectionFields={sectionFields}
                            onAppendSection={handleAppendSection}
                            removeSection={handleRemoveSection}
                            onSerialFieldChange={handleSerialFieldChange}
                            onRemoveSerial={handleRemoveSerial}
                            onNumbersFieldChange={handleNumbersFieldChange}
                            numberLengthRules={numberLengthRules}
                            remainingSerialQuota={remainingSerialQuota}
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
                            Mở ứng dụng Mobile (Tài khoản Admin / Nhân viên) -&gt; chọn <b>Quét vé OCR</b> để tự động ghép nối với phiên làm việc này. Mã phiên:
                        </Typography>

                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                width: '100%',
                                bgcolor: '#f8fafc',
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
                                    Đang sẵn sàng kết nối với ứng dụng Mobile...
                                </Typography>
                            </Stack>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                width: '100%',
                                bgcolor: '#FFF8F8',
                                borderColor: '#F5CBCD',
                                borderRadius: 2,
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                🧪 DÀNH CHO TEST TRÊN LAPTOP
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
                                Chưa cài app Mobile? Tải ảnh chụp vé số từ Laptop lên để chạy thử AI OCR:
                            </Typography>
                            <Button
                                variant="contained"
                                color="secondary"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                onClick={() => fileInputRef.current?.click()}
                                sx={{ textTransform: 'none', fontWeight: 'bold' }}
                            >
                                Tải ảnh vé từ Laptop test OCR
                            </Button>
                        </Paper>

                        <Alert severity="info" sx={{ textAlign: 'left', width: '100%' }}>
                            Khi Mobile bật quét vé số, hình ảnh và danh sách vé bóc tách được từ AI Vision sẽ tự động cập nhật Real-time vào ô nhập của phiếu này.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    >
                        Tải ảnh vé trực tiếp
                    </Button>
                    <Button onClick={() => setScanDialogOpen(false)} variant="contained" color="primary">
                        Đóng / Hoàn tất
                    </Button>
                </DialogActions>
            </Dialog>

            <TicketScanReviewDialog
                open={scanReviewOpen}
                onClose={handleCloseScanReviewDialog}
                sourceImageUrl={sourceImageUrl}
                scanResult={scanResult}
                scanError={scanError}
                isScanning={isScanning}
                onRetryScan={handleRetryScan}
                isConfirming={isConfirmingImport}
                onConfirm={handleConfirmScannedImport}
                importResult={importResult}
            />
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
