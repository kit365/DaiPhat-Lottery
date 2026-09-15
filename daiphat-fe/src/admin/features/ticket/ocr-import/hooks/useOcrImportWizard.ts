'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import {
    getActiveImportBatchDraft,
    getIncompleteImportBatches,
    cancelImportBatchDraft,
} from '../../import-batch/services/importBatchService';
import type { ImportBatch, ImportBatchLine } from '../../import-batch/types/importBatch.type';
import { getStationsByDrawDate } from '../../../station/services/stationService';
import {
    confirmOcrImport,
    correctOcrScanResultFields,
    getLotteryScanLogs,
    listOcrScanResults,
    scanTicketImage,
    type OcrFieldCorrectionPayload,
} from '../services/ticketOcrService';
import type {
    LotteryScanLog,
    OcrConfirmImportMode,
    OcrConfirmImportResponse,
    OcrImportDraft,
    OcrQueuedImage,
    OcrReviewRow,
} from '../types/ticketOcr.type';
import { OCR_IMPORT_DRAFT_KEY } from '../types/ticketOcr.type';
import {
    canConfirmReviewRow,
    collectOcrBatchOptions,
    createFailedReviewRow,
    createPrefillLineOption,
    findOcrLineOption,
    mapScannedTicketToReviewRow,
    type OcrBatchOption,
    type OcrLineOption,
    type OcrRowValidationContext,
} from '../utils/ocrImportHelpers';
import {
    normalizeOcrScanErrorMessage,
    normalizeOcrWarningList,
} from '../utils/ocrScanErrorMessage';

export type OcrWizardStep = 'upload' | 'review' | 'importMode' | 'result';
export type OcrDraftIntent = 'USE_EXISTING' | 'CREATE_NEW';

type UseOcrImportWizardArgs = {
    open: boolean;
    prefillBatch?: ImportBatch | null;
    prefillLine?: ImportBatchLine | null;
    /** Re-open after create-batch return; restore draft at importMode. */
    restoreFromDraft?: boolean;
    restoreSelectedImportBatchId?: number | null;
    onDraftRestored?: () => void;
};

const newImageId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Prefer localStorage so unfinished OCR reviews survive tab refresh / closing the dialog.
 * Falls back to reading legacy sessionStorage drafts once, then migrates them.
 */
const readDraft = (): OcrImportDraft | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw =
            localStorage.getItem(OCR_IMPORT_DRAFT_KEY) ??
            sessionStorage.getItem(OCR_IMPORT_DRAFT_KEY);
        if (!raw) {
            return null;
        }
        const draft = JSON.parse(raw) as OcrImportDraft;
        if (!localStorage.getItem(OCR_IMPORT_DRAFT_KEY) && sessionStorage.getItem(OCR_IMPORT_DRAFT_KEY)) {
            localStorage.setItem(OCR_IMPORT_DRAFT_KEY, raw);
            sessionStorage.removeItem(OCR_IMPORT_DRAFT_KEY);
        }
        return draft;
    } catch {
        return null;
    }
};

const writeDraft = (draft: OcrImportDraft) => {
    if (typeof window === 'undefined') {
        return;
    }
    const raw = JSON.stringify(draft);
    localStorage.setItem(OCR_IMPORT_DRAFT_KEY, raw);
    sessionStorage.removeItem(OCR_IMPORT_DRAFT_KEY);
};

const clearDraftStorage = () => {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.removeItem(OCR_IMPORT_DRAFT_KEY);
    sessionStorage.removeItem(OCR_IMPORT_DRAFT_KEY);
};

const isDurableImageUrl = (url?: string | null): url is string =>
    Boolean(url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')));

const rebuildImagesFromDraft = (
    imageMeta: OcrImportDraft['imageMeta'],
    rows: OcrReviewRow[]
): OcrQueuedImage[] => {
    const byId = new Map<string, OcrQueuedImage>();

    for (const meta of imageMeta ?? []) {
        const rowMatch = rows.find((row) => row.sourceImageId === meta.id);
        const previewUrl =
            (isDurableImageUrl(meta.previewUrl) ? meta.previewUrl : null) ||
            (isDurableImageUrl(rowMatch?.sourcePreviewUrl) ? rowMatch?.sourcePreviewUrl : null) ||
            null;
        if (!previewUrl) {
            continue;
        }
        byId.set(meta.id, {
            id: meta.id,
            file: new File([], meta.fileName || 'restored-scan.jpg', { type: 'image/jpeg' }),
            previewUrl,
            status: 'done',
            scanId: meta.scanId ?? rowMatch?.scanId ?? null,
            imageWidth: meta.imageWidth ?? rowMatch?.imageWidth ?? null,
            imageHeight: meta.imageHeight ?? rowMatch?.imageHeight ?? null,
        });
    }

    for (const row of rows) {
        if (byId.has(row.sourceImageId)) {
            continue;
        }
        const previewUrl =
            (isDurableImageUrl(row.sourcePreviewUrl) ? row.sourcePreviewUrl : null) ||
            null;
        if (!previewUrl) {
            continue;
        }
        byId.set(row.sourceImageId, {
            id: row.sourceImageId,
            file: new File([], row.sourceFileName || 'restored-scan.jpg', { type: 'image/jpeg' }),
            previewUrl,
            status: row.status === 'FAILED' ? 'error' : 'done',
            error: row.businessValidationErrors?.[0] ?? null,
            scanId: row.scanId ?? null,
            imageWidth: row.imageWidth ?? null,
            imageHeight: row.imageHeight ?? null,
        });
    }

    return Array.from(byId.values());
};

const hydrateRowsWithPersistedImages = async (rows: OcrReviewRow[]): Promise<OcrReviewRow[]> => {
    const scanIds = Array.from(
        new Set(rows.map((row) => row.scanId).filter((id): id is string => Boolean(id)))
    );
    if (scanIds.length === 0) {
        return rows;
    }

    const byOcrId = new Map<number, { sourceImageUrl?: string | null; croppedImageUrl?: string | null }>();
    await Promise.all(
        scanIds.map(async (scanId) => {
            try {
                const results = await listOcrScanResults({ scanId });
                for (const result of results ?? []) {
                    if (result?.id != null) {
                        byOcrId.set(result.id, {
                            sourceImageUrl: result.sourceImageUrl ?? null,
                            croppedImageUrl: result.croppedImageUrl ?? null,
                        });
                    }
                }
            } catch {
                // Best-effort: keep draft URLs if API hydrate fails.
            }
        })
    );

    if (byOcrId.size === 0) {
        return rows;
    }

    return rows.map((row) => {
        if (!row.ocrScanResultId) {
            return row;
        }
        const persisted = byOcrId.get(row.ocrScanResultId);
        if (!persisted) {
            return row;
        }
        const sourcePreviewUrl =
            (isDurableImageUrl(persisted.sourceImageUrl) ? persisted.sourceImageUrl : null) ||
            (isDurableImageUrl(row.sourcePreviewUrl) ? row.sourcePreviewUrl : null);
        const croppedImageUrl =
            (isDurableImageUrl(persisted.croppedImageUrl) ? persisted.croppedImageUrl : null) ||
            row.croppedImageUrl ||
            null;
        return {
            ...row,
            sourcePreviewUrl,
            croppedImageUrl,
        };
    });
};

export const useOcrImportWizard = ({
    open,
    prefillBatch,
    prefillLine,
    restoreFromDraft = false,
    restoreSelectedImportBatchId = null,
    onDraftRestored,
}: UseOcrImportWizardArgs) => {
    const [step, setStep] = useState<OcrWizardStep>('upload');
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [batchOptions, setBatchOptions] = useState<OcrBatchOption[]>([]);
    /** Soft prefill only — not required for scan. */
    const [prefillLineOption, setPrefillLineOption] = useState<OcrLineOption | null>(null);
    const [images, setImages] = useState<OcrQueuedImage[]>([]);
    const [rows, setRows] = useState<OcrReviewRow[]>([]);
    const [scanning, setScanning] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [importResult, setImportResult] = useState<OcrConfirmImportResponse | null>(null);
    const [scanLogs, setScanLogs] = useState<LotteryScanLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const [importMode, setImportMode] = useState<OcrConfirmImportMode>('AUTO');
    const [draftIntent, setDraftIntent] = useState<OcrDraftIntent>('CREATE_NEW');
    const [supplierId, setSupplierId] = useState<number | null>(null);
    const [invoiceEvidenceUrl, setInvoiceEvidenceUrl] = useState('');
    const [ticketListImageUrl, setTicketListImageUrl] = useState('');
    const [selectedImportBatchId, setSelectedImportBatchId] = useState<number | null>(null);
    const [forceCreate, setForceCreate] = useState(false);
    const [discardingBatchId, setDiscardingBatchId] = useState<number | null>(null);
    const [stationsByDrawDate, setStationsByDrawDate] = useState<
        Record<string, { id: number; name: string; code?: string; price?: number }[]>
    >({});
    const [stationPriceById, setStationPriceById] = useState<Map<number, number>>(new Map());
    const [savedDraft, setSavedDraft] = useState<OcrImportDraft | null>(null);

    const restoredRef = useRef(false);
    const onDraftRestoredRef = useRef(onDraftRestored);
    const fieldCorrectionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        return () => {
            fieldCorrectionTimersRef.current.forEach((timer) => clearTimeout(timer));
            fieldCorrectionTimersRef.current.clear();
        };
    }, []);
    onDraftRestoredRef.current = onDraftRestored;

    const selectedBatch = useMemo(
        () => batchOptions.find((option) => option.id === selectedImportBatchId) ?? null,
        [batchOptions, selectedImportBatchId]
    );

    const reset = useCallback(() => {
        setStep('upload');
        setImages((prev) => {
            prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
            return [];
        });
        setRows([]);
        setScanning(false);
        setConfirming(false);
        setImportResult(null);
        setScanLogs([]);
        setImportMode('AUTO');
        setDraftIntent(prefillBatch?.id ? 'USE_EXISTING' : 'CREATE_NEW');
        setSupplierId(prefillBatch?.supplierId ?? null);
        setInvoiceEvidenceUrl('');
        setTicketListImageUrl('');
        setSelectedImportBatchId(prefillBatch?.id ?? null);
        setForceCreate(false);
        setPrefillLineOption(null);
        setStationsByDrawDate({});
        setStationPriceById(new Map());
        // Keep restoredRef / savedDraft intact so "xem lại kết quả cũ" still works after reopen.
    }, [prefillBatch]);

    const loadBatchOptions = useCallback(async () => {
        setLoadingBatches(true);
        try {
            // Sequential on purpose: both BE endpoints call cancelOverdueDrafts();
            // parallel calls raced and could crash the JVM (Windows ACCESS_VIOLATION).
            const incomplete = await getIncompleteImportBatches();
            const activeDraft = await getActiveImportBatchDraft();
            const byId = new Map<number, ImportBatch>();
            for (const batch of incomplete ?? []) {
                byId.set(batch.id, batch);
            }
            if (activeDraft?.id) {
                byId.set(activeDraft.id, activeDraft);
            }
            if (prefillBatch?.id) {
                byId.set(prefillBatch.id, prefillBatch);
            }

            const batches = Array.from(byId.values());
            setBatchOptions(collectOcrBatchOptions(batches));

            if (prefillBatch && prefillLine) {
                const prefill =
                    findOcrLineOption(batches, prefillLine.id, prefillBatch.batchCode) ??
                    createPrefillLineOption(prefillBatch, prefillLine);
                setPrefillLineOption(prefill);
            } else {
                setPrefillLineOption(null);
            }
        } catch {
            toast.error('Không tải được danh sách phiếu nhập.');
            setBatchOptions([]);
        } finally {
            setLoadingBatches(false);
        }
    }, [prefillBatch, prefillLine]);

    const applyDraft = useCallback(
        (draft: OcrImportDraft, overrideBatchId?: number | null, targetStep?: OcrWizardStep) => {
            setImportMode(draft.importMode ?? 'AUTO');
            setDraftIntent(
                draft.draftIntent ??
                    (draft.selectedImportBatchId || draft.importMode === 'MANUAL'
                        ? 'USE_EXISTING'
                        : 'CREATE_NEW')
            );
            setSupplierId(draft.supplierId ?? null);
            setInvoiceEvidenceUrl(draft.invoiceEvidenceUrl ?? '');
            setTicketListImageUrl(draft.ticketListImageUrl ?? '');
            setSelectedImportBatchId(
                overrideBatchId ?? draft.selectedImportBatchId ?? null
            );
            setForceCreate(Boolean(draft.forceCreate));
            const nextRows = (draft.rows ?? []).map((row) => ({
                ...row,
                // Prefer durable https/data URLs; drop dead blob: previews from prior sessions.
                sourcePreviewUrl:
                    row.sourcePreviewUrl && !row.sourcePreviewUrl.startsWith('blob:')
                        ? row.sourcePreviewUrl
                        : null,
            }));
            setRows(nextRows);
            setImages((prev) => {
                prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
                return rebuildImagesFromDraft(draft.imageMeta ?? [], nextRows);
            });
            setImportResult(null);
            setStep(targetStep ?? (draft.step === 'result' ? 'importMode' : draft.step));
        },
        []
    );

    useEffect(() => {
        if (!open) {
            restoredRef.current = false;
            return;
        }
        // Initialize once per open session so clearing restore flags does not wipe state.
        if (restoredRef.current) {
            return;
        }
        restoredRef.current = true;

        if (restoreFromDraft) {
            const draft = readDraft();
            if (draft && draft.rows && draft.rows.length > 0) {
                applyDraft(draft, restoreSelectedImportBatchId, 'importMode');
                writeDraft({
                    ...draft,
                    pendingRestore: false,
                    selectedImportBatchId:
                        restoreSelectedImportBatchId ?? draft.selectedImportBatchId,
                    step: 'importMode',
                });
                setSavedDraft(null);
                onDraftRestoredRef.current?.();
                void loadBatchOptions();
                return;
            }
        }

        reset();
        const draft = readDraft();
        if (draft && Array.isArray(draft.rows) && draft.rows.length > 0) {
            setSavedDraft(draft);
            if (draft.supplierId != null) {
                setSupplierId(draft.supplierId);
            }
        } else {
            setSavedDraft(null);
        }
        void loadBatchOptions();
        // Intentionally depend on `open` primarily; restore flags are read on first open only.
    }, [open]);

    const resumePreviousScan = useCallback(() => {
        const resumeFromDraft = async () => {
            const draft = savedDraft || readDraft();
            if (!draft || !draft.rows || draft.rows.length === 0) {
                toast.info('Không còn kết quả quét chưa nhập kho để xem lại.');
                return;
            }

            const hydratedRows = await hydrateRowsWithPersistedImages(draft.rows);
            const hydratedDraft: OcrImportDraft = {
                ...draft,
                rows: hydratedRows,
                imageMeta: (draft.imageMeta ?? []).map((meta) => {
                    const row = hydratedRows.find((item) => item.sourceImageId === meta.id);
                    return {
                        ...meta,
                        previewUrl:
                            (isDurableImageUrl(meta.previewUrl) ? meta.previewUrl : null) ||
                            (isDurableImageUrl(row?.sourcePreviewUrl) ? row?.sourcePreviewUrl : null) ||
                            null,
                    };
                }),
            };
            applyDraft(hydratedDraft, null, 'review');
            writeDraft(hydratedDraft);
            setSavedDraft(hydratedDraft);
        };

        if (rows.length > 0 && images.some((image) => Boolean(image.previewUrl))) {
            setStep('review');
            return;
        }
        void resumeFromDraft();
    }, [rows, images, savedDraft, applyDraft]);

    const discardPreviousScan = useCallback(() => {
        clearDraftStorage();
        setSavedDraft(null);
        setRows([]);
        setImages((prev) => {
            prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
            return [];
        });
    }, []);

    useEffect(() => {
        return () => {
            images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        };
    }, []);

    const buildDraftSnapshot = useCallback(
        (overrides?: Partial<OcrImportDraft>): OcrImportDraft => ({
            step,
            importMode,
            supplierId,
            invoiceEvidenceUrl,
            ticketListImageUrl,
            selectedImportBatchId,
            forceCreate,
            draftIntent,
            rows: rows.map((row) => ({
                ...row,
                sourcePreviewUrl: isDurableImageUrl(row.sourcePreviewUrl)
                    ? row.sourcePreviewUrl
                    : null,
                croppedImageBase64: isDurableImageUrl(row.croppedImageUrl)
                    ? null
                    : row.croppedImageBase64 ?? null,
            })),
            imageMeta: images.map((image) => ({
                id: image.id,
                fileName: image.file.name,
                previewUrl: isDurableImageUrl(image.previewUrl) ? image.previewUrl : null,
                scanId: image.scanId ?? null,
                imageWidth: image.imageWidth ?? null,
                imageHeight: image.imageHeight ?? null,
            })),
            pendingRestore: true,
            ...overrides,
        }),
        [
            step,
            importMode,
            supplierId,
            invoiceEvidenceUrl,
            ticketListImageUrl,
            selectedImportBatchId,
            forceCreate,
            draftIntent,
            rows,
            images,
        ]
    );

    const persistUnimportedDraft = useCallback(() => {
        if (rows.length === 0 || step === 'result') {
            return;
        }
        const snapshot = buildDraftSnapshot({
            step: step === 'upload' ? 'review' : step,
            pendingRestore: false,
        });
        writeDraft(snapshot);
        setSavedDraft(snapshot);
    }, [rows.length, step, buildDraftSnapshot]);

    const saveDraftForCreateBatch = useCallback(() => {
        writeDraft(
            buildDraftSnapshot({
                step: 'importMode',
                importMode: 'MANUAL',
                draftIntent: 'USE_EXISTING',
                pendingRestore: true,
            })
        );
    }, [buildDraftSnapshot]);

    const clearDraft = useCallback(() => {
        clearDraftStorage();
        setSavedDraft(null);
    }, []);

    const addImages = useCallback((files: FileList | File[]) => {
        const accepted = Array.from(files).filter((file) => file.type.startsWith('image/'));
        if (accepted.length === 0) {
            toast.warning('Vui lòng chọn tệp hình ảnh.');
            return;
        }
        setImages((prev) => [
            ...prev,
            ...accepted.map((file) => ({
                id: newImageId(),
                file,
                previewUrl: URL.createObjectURL(file),
                status: 'pending' as const,
            })),
        ]);
    }, []);

    const removeImage = useCallback((imageId: string) => {
        setImages((prev) => {
            const target = prev.find((image) => image.id === imageId);
            if (target) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((image) => image.id !== imageId);
        });
        setRows((prev) => prev.filter((row) => row.sourceImageId !== imageId));
    }, []);

    const clearImages = useCallback(() => {
        setImages((prev) => {
            prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
            return [];
        });
        setRows([]);
    }, []);

    const runScan = useCallback(async () => {
        if (images.length === 0) {
            toast.warning('Vui lòng thêm ít nhất một ảnh vé.');
            return;
        }

        setScanning(true);
            const nextRows: OcrReviewRow[] = [];
        const nextImages = [...images];
        const softLineId = prefillLineOption?.lineId;

        const compactRowsForDraft = (rowsToStore: OcrReviewRow[]): OcrReviewRow[] =>
            rowsToStore.map((row) => ({
                ...row,
                // Prefer durable URL; drop large base64 payloads from localStorage drafts.
                croppedImageBase64: isDurableImageUrl(row.croppedImageUrl)
                    ? null
                    : row.croppedImageBase64 ?? null,
            }));

        for (let index = 0; index < nextImages.length; index += 1) {
            const image = nextImages[index];
            nextImages[index] = { ...image, status: 'scanning', error: null };
            setImages([...nextImages]);

            try {
                const response = await scanTicketImage(image.file, softLineId ?? undefined);
                const data = response.data;
                if (!data) {
                    throw new Error(response.message || 'Không nhận được kết quả OCR.');
                }
                const durablePreview =
                    (data.sourceImageUrl && data.sourceImageUrl.trim()) ||
                    data.tickets?.find((ticket) => ticket.sourceImageUrl)?.sourceImageUrl ||
                    image.previewUrl;
                if (durablePreview !== image.previewUrl && image.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(image.previewUrl);
                }
                nextImages[index] = {
                    ...nextImages[index],
                    status: 'done',
                    scanId: data.scanId,
                    imageWidth: data.imageWidth ?? null,
                    imageHeight: data.imageHeight ?? null,
                    previewUrl: durablePreview,
                    error: null,
                };
                const tickets = data.tickets ?? [];
                if (tickets.length === 0) {
                    const reason = normalizeOcrScanErrorMessage(
                        data.warnings?.[0] ||
                            response.message ||
                            'Không thể đọc rõ thông tin vé từ ảnh này.'
                    );
                    nextRows.push(
                        createFailedReviewRow(
                            image.id,
                            image.file.name,
                            durablePreview,
                            reason
                        )
                    );
                } else {
                    for (const ticket of tickets) {
                        nextRows.push(
                            mapScannedTicketToReviewRow(
                                ticket,
                                image.id,
                                image.file.name,
                                data.scanId,
                                ticket.sourceImageUrl || durablePreview,
                                data.imageWidth,
                                data.imageHeight
                            )
                        );
                    }
                }
                const friendlyWarnings = normalizeOcrWarningList(data.warnings);
                if (friendlyWarnings.length > 0) {
                    toast.warning(friendlyWarnings.join(' · '));
                }
            } catch (error: unknown) {
                const axiosData = (
                    error as {
                        response?: { data?: { message?: string; data?: unknown } };
                        message?: string;
                    }
                )?.response?.data;
                const message =
                    axiosData?.message ||
                    (error as { message?: string })?.message ||
                    'Không thể đọc rõ thông tin vé từ ảnh này.';
                const displayMessage = normalizeOcrScanErrorMessage(message);
                nextImages[index] = {
                    ...nextImages[index],
                    status: 'error',
                    error: displayMessage,
                };
                nextRows.push(
                    createFailedReviewRow(
                        image.id,
                        image.file.name,
                        image.previewUrl,
                        displayMessage
                    )
                );
                toast.error(`${image.file.name}: ${displayMessage}`);
            }
            setImages([...nextImages]);
        }

        setRows(nextRows);
        setScanning(false);
        setStep('review');
        setImages(nextImages);
        const draftSnapshot: OcrImportDraft = {
            step: 'review',
            importMode,
            supplierId,
            invoiceEvidenceUrl,
            ticketListImageUrl,
            selectedImportBatchId,
            forceCreate,
            draftIntent,
            rows: compactRowsForDraft(nextRows),
            imageMeta: nextImages.map((img) => ({
                id: img.id,
                fileName: img.file.name,
                previewUrl: isDurableImageUrl(img.previewUrl) ? img.previewUrl : null,
                scanId: img.scanId ?? null,
                imageWidth: img.imageWidth ?? null,
                imageHeight: img.imageHeight ?? null,
            })),
            pendingRestore: false,
        };
        writeDraft(draftSnapshot);
        setSavedDraft(draftSnapshot);
    }, [
        images,
        prefillLineOption,
        importMode,
        supplierId,
        invoiceEvidenceUrl,
        ticketListImageUrl,
        selectedImportBatchId,
        forceCreate,
        draftIntent,
    ]);

    const updateRow = useCallback((key: string, patch: Partial<OcrReviewRow>) => {
        setRows((prev) => {
            const nextRows = prev.map((row) => {
                if (row.key !== key) {
                    return row;
                }
                const next = { ...row, ...patch };
                if (
                    patch.numbers !== undefined ||
                    patch.serialNumber !== undefined ||
                    patch.stationId !== undefined ||
                    patch.drawDate !== undefined ||
                    patch.batchCode !== undefined ||
                    patch.ticketType !== undefined ||
                    patch.stationName !== undefined
                ) {
                    next.edited = true;
                }
                return next;
            });

            const updated = nextRows.find((row) => row.key === key);
            if (updated?.ocrScanResultId) {
                const fields: OcrFieldCorrectionPayload[] = [];
                if (patch.numbers !== undefined) {
                    fields.push({ fieldName: 'numbers', correctedValue: patch.numbers ?? null });
                }
                if (patch.serialNumber !== undefined) {
                    fields.push({
                        fieldName: 'serialNumber',
                        correctedValue: patch.serialNumber ?? null,
                    });
                }
                if (patch.drawDate !== undefined) {
                    fields.push({
                        fieldName: 'drawDate',
                        correctedValue: patch.drawDate ?? null,
                    });
                }
                if (patch.batchCode !== undefined) {
                    fields.push({
                        fieldName: 'batchCode',
                        correctedValue: patch.batchCode ?? null,
                    });
                }
                if (patch.ticketType !== undefined) {
                    fields.push({
                        fieldName: 'ticketType',
                        correctedValue: patch.ticketType ?? null,
                    });
                }
                if (patch.stationName !== undefined) {
                    fields.push({
                        fieldName: 'stationName',
                        correctedValue: patch.stationName ?? null,
                    });
                }
                if (fields.length > 0) {
                    const resultId = Number(updated.ocrScanResultId);
                    const timerKey = `${resultId}:${fields.map((f) => f.fieldName).join(',')}`;
                    const existing = fieldCorrectionTimersRef.current.get(timerKey);
                    if (existing) {
                        clearTimeout(existing);
                    }
                    fieldCorrectionTimersRef.current.set(
                        timerKey,
                        setTimeout(() => {
                            void correctOcrScanResultFields(resultId, fields).catch(() => {
                                // Best-effort: confirm-import still syncs corrected values.
                            });
                            fieldCorrectionTimersRef.current.delete(timerKey);
                        }, 450)
                    );
                }
            }

            return nextRows;
        });
    }, []);

    const getRowValidationContext = useCallback(
        (row: OcrReviewRow): OcrRowValidationContext => {
            const drawKey = row.drawDate ? dayjs(row.drawDate).format('YYYY-MM-DD') : '';
            const scheduleLoaded = Object.keys(stationsByDrawDate).length > 0;
            const scheduleStations = drawKey ? stationsByDrawDate[drawKey] : undefined;
            let allowedStationIds: Set<number> | null = null;
            if (drawKey && scheduleStations) {
                allowedStationIds = new Set(scheduleStations.map((s) => s.id));
            } else if (drawKey && scheduleLoaded) {
                // Schedule fetch finished but this date has no stations → block selection.
                allowedStationIds = new Set();
            }
            return {
                allowedStationIds,
                stationPriceById,
            };
        },
        [stationsByDrawDate, stationPriceById]
    );

    const isRowConfirmable = useCallback(
        (row: OcrReviewRow) => canConfirmReviewRow(row, getRowValidationContext(row)),
        [getRowValidationContext]
    );

    useEffect(() => {
        if (!open || rows.length === 0) {
            return;
        }
        const dates = Array.from(
            new Set(
                rows
                    .map((row) =>
                        row.drawDate ? dayjs(row.drawDate).format('YYYY-MM-DD') : ''
                    )
                    .filter(Boolean)
            )
        );
        if (dates.length === 0) {
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const entries = await Promise.all(
                    dates.map(async (date) => {
                        const list = await getStationsByDrawDate(date);
                        return [
                            date,
                            list.map((station) => ({
                                id: Number(station.id),
                                name: station.name,
                                code: station.code,
                                price:
                                    station.price != null ? Number(station.price) : undefined,
                            })),
                        ] as const;
                    })
                );
                if (cancelled) {
                    return;
                }
                const nextByDate: Record<
                    string,
                    { id: number; name: string; code?: string; price?: number }[]
                > = {};
                const nextPrices = new Map<number, number>();
                for (const [date, list] of entries) {
                    nextByDate[date] = list;
                    for (const station of list) {
                        if (station.price != null && Number.isFinite(station.price)) {
                            nextPrices.set(station.id, station.price);
                        }
                    }
                }
                setStationsByDrawDate(nextByDate);
                setStationPriceById(nextPrices);
            } catch {
                if (!cancelled) {
                    toast.warning('Không tải được lịch xổ nhà đài để kiểm tra ngày vé.');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, rows]);

    const toggleRow = useCallback((key: string, selected: boolean) => {
        setRows((prev) => prev.map((row) => (row.key === key ? { ...row, selected } : row)));
    }, []);

    const toggleAllConfirmable = useCallback(
        (selected: boolean) => {
            setRows((prev) =>
                prev.map((row) =>
                    isRowConfirmable(row) || row.selected ? { ...row, selected } : row
                )
            );
        },
        [isRowConfirmable]
    );

    const goToImportMode = useCallback(() => {
        const selectedRows = rows.filter((row) => row.selected && isRowConfirmable(row));
        if (selectedRows.length === 0) {
            toast.warning(
                'Chọn ít nhất một vé hợp lệ (nhà đài có lịch xổ đúng ngày + dãy số/serial đúng định dạng) để tiếp tục.'
            );
            return;
        }
        const snapshot = buildDraftSnapshot({ step: 'importMode', pendingRestore: false });
        writeDraft(snapshot);
        setSavedDraft(snapshot);
        setStep('importMode');
    }, [rows, isRowConfirmable, buildDraftSnapshot]);

    const loadScanLogs = useCallback(async () => {
        const ocrIds = rows
            .map((row) => row.ocrScanResultId)
            .filter((id): id is number => typeof id === 'number');
        if (ocrIds.length === 0) {
            setScanLogs([]);
            return;
        }
        setLoadingLogs(true);
        try {
            const today = dayjs().format('YYYY-MM-DD');
            const logs: LotteryScanLog[] = [];
            const uniqueIds = Array.from(new Set(ocrIds)).slice(0, 10);
            for (const ocrScanResultId of uniqueIds) {
                const response = await getLotteryScanLogs({
                    page: 1,
                    size: 20,
                    ocrScanResultId,
                    scannedAtFrom: today,
                    scannedAtTo: today,
                    sortBy: 'scannedAt',
                    direction: 'desc',
                });
                logs.push(...(response.data?.recordList ?? []));
            }
            logs.sort((a, b) => String(b.scannedAt ?? '').localeCompare(String(a.scannedAt ?? '')));
            setScanLogs(logs);
        } catch {
            setScanLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    }, [rows]);

    const confirmableCount = rows.filter(
        (row) => row.selected && isRowConfirmable(row)
    ).length;

    const canConfirmImport = useMemo(() => {
        if (confirmableCount === 0) {
            return false;
        }
        if (draftIntent === 'USE_EXISTING') {
            return selectedImportBatchId != null && selectedImportBatchId > 0;
        }
        if (importMode === 'AUTO') {
            return supplierId != null && supplierId > 0;
        }
        return selectedImportBatchId != null && selectedImportBatchId > 0;
    }, [
        confirmableCount,
        draftIntent,
        importMode,
        supplierId,
        selectedImportBatchId,
    ]);

    const selectDraftBatch = useCallback((batchId: number | null) => {
        setDraftIntent('USE_EXISTING');
        setImportMode('MANUAL');
        setSelectedImportBatchId(batchId);
        setForceCreate(false);
    }, []);

    const chooseCreateNewBatch = useCallback(() => {
        setDraftIntent('CREATE_NEW');
        setSelectedImportBatchId(null);
        setForceCreate(true);
        if (importMode === 'MANUAL') {
            // Keep MANUAL so user can create via link; AUTO is default for net-new warehouse receipts.
            setImportMode('AUTO');
        }
    }, [importMode]);

    const discardDraftBatch = useCallback(
        async (batchId: number) => {
            setDiscardingBatchId(batchId);
            try {
                await cancelImportBatchDraft(batchId);
                toast.success('Đã huỷ phiếu nhập nháp.');
                if (selectedImportBatchId === batchId) {
                    setSelectedImportBatchId(null);
                }
                await loadBatchOptions();
            } catch (error: unknown) {
                const message =
                    (error as { response?: { data?: { message?: string } }; message?: string })
                        ?.response?.data?.message ||
                    (error as { message?: string })?.message ||
                    'Không huỷ được phiếu nháp.';
                toast.error(message);
            } finally {
                setDiscardingBatchId(null);
            }
        },
        [loadBatchOptions, selectedImportBatchId]
    );

    const confirmImport = useCallback(async () => {
        const selectedRows = rows.filter((row) => row.selected && isRowConfirmable(row));
        if (selectedRows.length === 0) {
            toast.warning('Chọn ít nhất một vé hợp lệ để nhập.');
            return;
        }

        const effectiveMode: OcrConfirmImportMode =
            draftIntent === 'USE_EXISTING' ? 'MANUAL' : importMode;

        if (effectiveMode === 'AUTO' && (supplierId == null || supplierId <= 0)) {
            toast.warning('Vui lòng chọn nhà cung cấp cho chế độ tự động.');
            return;
        }
        if (
            effectiveMode === 'MANUAL' &&
            (selectedImportBatchId == null || selectedImportBatchId <= 0)
        ) {
            toast.warning('Vui lòng chọn phiếu nhập nháp để tiếp tục gắn vé.');
            return;
        }

        setConfirming(true);
        try {
            const response = await confirmOcrImport({
                mode: effectiveMode,
                supplierId: effectiveMode === 'AUTO' ? supplierId : undefined,
                invoiceEvidenceUrl:
                    effectiveMode === 'AUTO' && invoiceEvidenceUrl.trim()
                        ? invoiceEvidenceUrl.trim()
                        : undefined,
                ticketListImageUrls:
                    effectiveMode === 'AUTO' && ticketListImageUrl.trim()
                        ? [ticketListImageUrl.trim()]
                        : undefined,
                forceCreate:
                    effectiveMode === 'AUTO'
                        ? draftIntent === 'CREATE_NEW'
                            ? true
                            : forceCreate
                        : undefined,
                importBatchId: effectiveMode === 'MANUAL' ? selectedImportBatchId : undefined,
                tickets: selectedRows.map((row) => ({
                    numbers: row.numbers.trim(),
                    serialNumber: row.serialNumber.trim(),
                    stationId: row.stationId!,
                    drawDate: dayjs(row.drawDate).format('YYYY-MM-DD'),
                    ticketImageBase64: row.croppedImageBase64 ?? null,
                    ocrScanResultId: row.ocrScanResultId ?? null,
                })),
            });
            const data = response.data;
            if (!data) {
                throw new Error(response.message || 'Nhập vé thất bại.');
            }
            setImportResult(data);
            setStep('result');
            clearDraftStorage();
            toast.success(
                `Đã nhập ${data.successCount}/${data.totalRequested} vé (trùng: ${data.duplicateCount}, lỗi: ${data.failedCount}).`
            );
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } }; message?: string })
                    ?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Nhập vé từ OCR thất bại.';
            toast.error(message);
        } finally {
            setConfirming(false);
        }
    }, [
        rows,
        isRowConfirmable,
        draftIntent,
        importMode,
        supplierId,
        invoiceEvidenceUrl,
        ticketListImageUrl,
        forceCreate,
        selectedImportBatchId,
    ]);

    const previousScanRowsCount = rows.length > 0 ? rows.length : (savedDraft?.rows?.length ?? 0);
    const hasPreviousScan = previousScanRowsCount > 0;

    return {
        step,
        setStep,
        hasPreviousScan,
        previousScanRowsCount,
        resumePreviousScan,
        discardPreviousScan,
        persistUnimportedDraft,
        loadingBatches,
        batchOptions,
        prefillLineOption,
        images,
        addImages,
        removeImage,
        clearImages,
        runScan,
        scanning,
        rows,
        updateRow,
        toggleRow,
        toggleAllConfirmable,
        confirmableCount,
        goToImportMode,
        importMode,
        setImportMode,
        draftIntent,
        setDraftIntent,
        selectDraftBatch,
        chooseCreateNewBatch,
        discardDraftBatch,
        discardingBatchId,
        supplierId,
        setSupplierId,
        invoiceEvidenceUrl,
        setInvoiceEvidenceUrl,
        ticketListImageUrl,
        setTicketListImageUrl,
        selectedImportBatchId,
        setSelectedImportBatchId,
        selectedBatch,
        forceCreate,
        setForceCreate,
        canConfirmImport,
        confirmImport,
        confirming,
        importResult,
        scanLogs,
        loadingLogs,
        loadScanLogs,
        reset,
        reloadBatches: loadBatchOptions,
        saveDraftForCreateBatch,
        clearDraft,
        getRowValidationContext,
        isRowConfirmable,
        stationsByDrawDate,
        getStationsForDrawDate: (drawDate?: string | null) => {
            if (!drawDate) {
                return [];
            }
            const key = dayjs(drawDate).format('YYYY-MM-DD');
            return stationsByDrawDate[key] ?? [];
        },
    };
};
