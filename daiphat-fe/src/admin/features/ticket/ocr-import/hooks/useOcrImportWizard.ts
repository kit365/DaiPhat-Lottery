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
    formatOcrWarningsForToast,
    isOcrRateLimitMessage,
    isTechnicalOcrErrorMessage,
    OCR_RATE_LIMIT_MESSAGE,
    OCR_SERVICE_UNAVAILABLE_MESSAGE,
} from '../utils/ocrScanErrorMessage';
import {
    checkOcrImportQuantity,
    type ImportQuantityCheck,
} from '../utils/ocrImportQuantity';
import { optimizeOcrScanImage } from '../utils/optimizeOcrImage';

export type OcrWizardStep = 'upload' | 'review' | 'importMode' | 'result';
export type OcrDraftIntent = 'USE_EXISTING' | 'CREATE_NEW';

/** Brief pause between multi-image scans to reduce Groq RPM/OTPM collisions. */
const OCR_INTER_IMAGE_DELAY_MS = 750;
/** One automatic wait+retry when Groq returns a rate-limit soft-fail. */
const OCR_RATE_LIMIT_RETRY_DELAY_MS = 20_000;
const OCR_RATE_LIMIT_MAX_RETRIES = 1;
/** OCR worker can be briefly busy (YOLO/Groq); retry once before surfacing outage. */
const OCR_SERVICE_RETRY_DELAY_MS = 8_000;
const OCR_SERVICE_MAX_RETRIES = 1;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isUnreadableScanResult = (
    tickets: { status?: string | null; extracted?: { numbers?: string | null; serialNumber?: string | null } | null }[]
): boolean => {
    if (tickets.length === 0) {
        return true;
    }
    return tickets.every((ticket) => {
        if (ticket.status !== 'FAILED') {
            return false;
        }
        const numbers = ticket.extracted?.numbers?.trim();
        const serial = ticket.extracted?.serialNumber?.trim();
        return !numbers && !serial;
    });
};

const warningsIndicateRateLimit = (warnings?: string[] | null, message?: string | null): boolean => {
    if (isOcrRateLimitMessage(message)) {
        return true;
    }
    return (warnings ?? []).some((warning) => isOcrRateLimitMessage(warning));
};

const warningsIndicateBusyOrTimeout = (
    warnings?: string[] | null,
    message?: string | null
): boolean => {
    const texts = [...(warnings ?? []), message ?? ''].filter(Boolean);
    return texts.some((text) => {
        const lower = text.toLowerCase();
        return (
            lower.includes('phản hồi quá chậm') ||
            lower.includes('đang bận') ||
            lower.includes('timed out') ||
            lower.includes('timeout')
        );
    });
};

type UseOcrImportWizardArgs = {
    open: boolean;
    prefillBatch?: ImportBatch | null;
    prefillLine?: ImportBatchLine | null;
    /** Re-open after create-batch return; restore draft (upload if no rows, else confirm step). */
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

    const [importMode] = useState<OcrConfirmImportMode>('MANUAL');
    const [draftIntent, setDraftIntent] = useState<OcrDraftIntent>('USE_EXISTING');
    const [supplierId, setSupplierIdState] = useState<number | null>(null);
    const [invoiceEvidenceUrl, setInvoiceEvidenceUrl] = useState('');
    const [ticketListImageUrl, setTicketListImageUrl] = useState('');
    const [selectedImportBatchId, setSelectedImportBatchId] = useState<number | null>(null);
    const [forceCreate, setForceCreate] = useState(false);
    const [discardingBatchId, setDiscardingBatchId] = useState<number | null>(null);
    const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
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

    const selectedImportBatch = useMemo(
        () => importBatches.find((batch) => batch.id === selectedImportBatchId) ?? null,
        [importBatches, selectedImportBatchId]
    );

    const setSupplierId = useCallback(
        (next: number | null) => {
            setSupplierIdState(next);
            setSelectedImportBatchId((prev) => {
                if (prev == null) {
                    return null;
                }
                const batch = batchOptions.find((option) => option.id === prev);
                if (!batch || (next != null && batch.supplierId !== next)) {
                    return null;
                }
                return prev;
            });
        },
        [batchOptions]
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
        setDraftIntent('USE_EXISTING');
        setSupplierIdState(prefillBatch?.supplierId ?? null);
        setInvoiceEvidenceUrl('');
        setTicketListImageUrl('');
        setSelectedImportBatchId(prefillBatch?.id ?? null);
        setForceCreate(false);
        setPrefillLineOption(null);
        setImportBatches([]);
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
            setImportBatches(batches);
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
            setDraftIntent(draft.draftIntent ?? 'USE_EXISTING');
            setSupplierIdState(draft.supplierId ?? null);
            setInvoiceEvidenceUrl(draft.invoiceEvidenceUrl ?? '');
            setTicketListImageUrl(draft.ticketListImageUrl ?? '');
            setSelectedImportBatchId(overrideBatchId ?? draft.selectedImportBatchId ?? null);
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
            if (draft) {
                const hasRows = Array.isArray(draft.rows) && draft.rows.length > 0;
                const targetStep: OcrWizardStep = hasRows
                    ? draft.step === 'review'
                        ? 'review'
                        : 'importMode'
                    : 'upload';
                applyDraft(draft, restoreSelectedImportBatchId, targetStep);
                writeDraft({
                    ...draft,
                    pendingRestore: false,
                    importMode: 'MANUAL',
                    draftIntent: 'USE_EXISTING',
                    selectedImportBatchId:
                        restoreSelectedImportBatchId ?? draft.selectedImportBatchId,
                    step: targetStep,
                });
                setSavedDraft(hasRows ? draft : null);
                onDraftRestoredRef.current?.();
                void loadBatchOptions();
                return;
            }

            reset();
            if (restoreSelectedImportBatchId != null && restoreSelectedImportBatchId > 0) {
                setSelectedImportBatchId(restoreSelectedImportBatchId);
                setDraftIntent('USE_EXISTING');
            }
            onDraftRestoredRef.current?.();
            void loadBatchOptions();
            return;
        }

        reset();
        const draft = readDraft();
        if (draft && Array.isArray(draft.rows) && draft.rows.length > 0) {
            setSavedDraft(draft);
            if (draft.supplierId != null) {
                setSupplierIdState(draft.supplierId);
            }
            if (draft.selectedImportBatchId != null) {
                setSelectedImportBatchId(draft.selectedImportBatchId);
            }
        } else {
            setSavedDraft(null);
        }
        void loadBatchOptions();
        // Intentionally depend on `open` primarily; restore flags are read on first open only.
    }, [open]);

    // After batches load, sync supplier from selected batch (e.g. return from create).
    useEffect(() => {
        if (selectedImportBatchId == null) {
            return;
        }
        const match = batchOptions.find((option) => option.id === selectedImportBatchId);
        if (match?.supplierId != null && supplierId !== match.supplierId) {
            setSupplierIdState(match.supplierId);
        }
    }, [batchOptions, selectedImportBatchId, supplierId]);

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
                step: step === 'result' ? 'upload' : step,
                importMode: 'MANUAL',
                draftIntent: 'USE_EXISTING',
                pendingRestore: true,
            })
        );
    }, [buildDraftSnapshot, step]);

    const clearDraft = useCallback(() => {
        clearDraftStorage();
        setSavedDraft(null);
    }, []);

    const addImages = useCallback(async (files: FileList | File[]) => {
        const accepted = Array.from(files).filter((file) => file.type.startsWith('image/'));
        if (accepted.length === 0) {
            toast.warning('Vui lòng chọn tệp hình ảnh.');
            return;
        }
        const toastId = toast.info(
            accepted.length === 1
                ? 'Đang cắt / nén ảnh để tối ưu OCR…'
                : `Đang cắt / nén ${accepted.length} ảnh để tối ưu OCR…`,
            { autoClose: false }
        );
        try {
            const optimized: Array<{ id: string; file: File; previewUrl: string; status: 'pending' }> =
                [];
            for (const file of accepted) {
                const nextFile = await optimizeOcrScanImage(file);
                optimized.push({
                    id: newImageId(),
                    file: nextFile,
                    previewUrl: URL.createObjectURL(nextFile),
                    status: 'pending',
                });
            }
            setImages((prev) => [...prev, ...optimized]);
        } catch {
            toast.warning('Không tối ưu được ảnh; sẽ dùng ảnh gốc để quét.');
            setImages((prev) => [
                ...prev,
                ...accepted.map((file) => ({
                    id: newImageId(),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    status: 'pending' as const,
                })),
            ]);
        } finally {
            toast.dismiss(toastId);
        }
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

    const hasAutoCreateEvidence = useMemo(
        () => Boolean(invoiceEvidenceUrl.trim() && ticketListImageUrl.trim()),
        [invoiceEvidenceUrl, ticketListImageUrl]
    );

    const runScan = useCallback(async () => {
        if (supplierId == null || supplierId <= 0) {
            toast.warning('Vui lòng chọn nhà cung cấp trước khi quét.');
            return;
        }
        if (selectedImportBatchId == null || selectedImportBatchId <= 0) {
            toast.warning('Vui lòng chọn phiếu nhập lô trước khi quét.');
            return;
        }
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
            let image = nextImages[index];
            nextImages[index] = { ...image, status: 'scanning', error: null };
            setImages([...nextImages]);
            image = nextImages[index];

            if (index > 0) {
                await sleep(OCR_INTER_IMAGE_DELAY_MS);
            }

            let rateLimitRetries = 0;
            let serviceRetries = 0;
            let finishedImage = false;
            while (!finishedImage) {
            try {
                // Re-optimize right before upload in case drafts restored large originals.
                const scanFile = await optimizeOcrScanImage(image.file);
                if (scanFile !== image.file) {
                    if (image.previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(image.previewUrl);
                    }
                    const nextPreview = URL.createObjectURL(scanFile);
                    nextImages[index] = {
                        ...nextImages[index],
                        file: scanFile,
                        previewUrl: nextPreview,
                    };
                    image = nextImages[index];
                    setImages([...nextImages]);
                }
                const response = await scanTicketImage(image.file, {
                    importBatchLineId: softLineId ?? undefined,
                    importBatchId: selectedImportBatchId ?? undefined,
                });
                const data = response.data;
                if (!data) {
                    throw new Error(response.message || 'Không nhận được kết quả OCR.');
                }

                if (
                    warningsIndicateRateLimit(data.warnings, response.message) &&
                    rateLimitRetries < OCR_RATE_LIMIT_MAX_RETRIES
                ) {
                    rateLimitRetries += 1;
                    toast.info(
                        `Ảnh ${index + 1}/${nextImages.length}: Groq đang giới hạn tốc độ. Đợi ${Math.round(
                            OCR_RATE_LIMIT_RETRY_DELAY_MS / 1000
                        )}s rồi thử lại lần ${rateLimitRetries}…`
                    );
                    await sleep(OCR_RATE_LIMIT_RETRY_DELAY_MS);
                    continue;
                }

                if (
                    warningsIndicateBusyOrTimeout(data.warnings, response.message) &&
                    serviceRetries < OCR_SERVICE_MAX_RETRIES
                ) {
                    serviceRetries += 1;
                    toast.info(
                        `Ảnh ${index + 1}/${nextImages.length}: OCR đang bận. Đợi ${Math.round(
                            OCR_SERVICE_RETRY_DELAY_MS / 1000
                        )}s rồi thử lại…`
                    );
                    await sleep(OCR_SERVICE_RETRY_DELAY_MS);
                    continue;
                }

                const durablePreview =
                    (data.sourceImageUrl && data.sourceImageUrl.trim()) ||
                    data.tickets?.find((ticket) => ticket.sourceImageUrl)?.sourceImageUrl ||
                    image.previewUrl;
                if (durablePreview !== image.previewUrl && image.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(image.previewUrl);
                }
                const tickets = data.tickets ?? [];
                const unreadable = isUnreadableScanResult(tickets);
                const failureReason = normalizeOcrScanErrorMessage(
                    data.warnings?.[0] ||
                        response.message ||
                        'Không thể đọc rõ thông tin vé từ ảnh này.'
                );

                nextImages[index] = {
                    ...nextImages[index],
                    status: unreadable ? 'error' : 'done',
                    scanId: data.scanId,
                    imageWidth: data.imageWidth ?? null,
                    imageHeight: data.imageHeight ?? null,
                    previewUrl: durablePreview,
                    error: unreadable ? failureReason : null,
                };

                if (tickets.length === 0 || unreadable) {
                    nextRows.push(
                        createFailedReviewRow(
                            image.id,
                            image.file.name,
                            durablePreview,
                            failureReason
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
                    toast.warning(formatOcrWarningsForToast(friendlyWarnings), {
                        style: { whiteSpace: 'pre-line' },
                    });
                }
                finishedImage = true;
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
                if (
                    isOcrRateLimitMessage(message) &&
                    rateLimitRetries < OCR_RATE_LIMIT_MAX_RETRIES
                ) {
                    rateLimitRetries += 1;
                    toast.info(
                        `Ảnh ${index + 1}/${nextImages.length}: ${OCR_RATE_LIMIT_MESSAGE} Đang thử lại…`
                    );
                    await sleep(OCR_RATE_LIMIT_RETRY_DELAY_MS);
                    continue;
                }
                if (
                    (isTechnicalOcrErrorMessage(message) ||
                        warningsIndicateBusyOrTimeout(null, message)) &&
                    serviceRetries < OCR_SERVICE_MAX_RETRIES
                ) {
                    serviceRetries += 1;
                    toast.info(
                        `Ảnh ${index + 1}/${nextImages.length}: OCR tạm thời không phản hồi. Đợi ${Math.round(
                            OCR_SERVICE_RETRY_DELAY_MS / 1000
                        )}s rồi thử lại…`
                    );
                    await sleep(OCR_SERVICE_RETRY_DELAY_MS);
                    continue;
                }
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
                finishedImage = true;
            }
            } // while retry
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

    const scanMoreImages = useCallback(
        async (files: FileList | File[]) => {
            const accepted = Array.from(files).filter((file) => file.type.startsWith('image/'));
            if (accepted.length === 0) {
                toast.warning('Vui lòng chọn tệp hình ảnh.');
                return;
            }
            if (supplierId == null || supplierId <= 0) {
                toast.warning('Vui lòng chọn nhà cung cấp trước khi quét.');
                return;
            }
            if (selectedImportBatchId == null || selectedImportBatchId <= 0) {
                toast.warning('Vui lòng chọn phiếu nhập lô trước khi quét.');
                return;
            }

            setScanning(true);
            const toastId = toast.info(
                accepted.length === 1
                    ? 'Đang cắt / nén ảnh để tối ưu OCR…'
                    : `Đang cắt / nén ${accepted.length} ảnh để tối ưu OCR…`,
                { autoClose: false }
            );

            const newQueuedImages: OcrQueuedImage[] = [];
            for (const file of accepted) {
                try {
                    const nextFile = await optimizeOcrScanImage(file);
                    newQueuedImages.push({
                        id: newImageId(),
                        file: nextFile,
                        previewUrl: URL.createObjectURL(nextFile),
                        status: 'pending',
                    });
                } catch {
                    newQueuedImages.push({
                        id: newImageId(),
                        file,
                        previewUrl: URL.createObjectURL(file),
                        status: 'pending',
                    });
                }
            }
            toast.dismiss(toastId);

            const allImages = [...images, ...newQueuedImages];
            setImages(allImages);

            const addedRows: OcrReviewRow[] = [];
            const softLineId = prefillLineOption?.lineId;

            const compactRowsForDraft = (rowsToStore: OcrReviewRow[]): OcrReviewRow[] =>
                rowsToStore.map((row) => ({
                    ...row,
                    croppedImageBase64: isDurableImageUrl(row.croppedImageUrl)
                        ? null
                        : row.croppedImageBase64 ?? null,
                }));

            const startIndex = images.length;
            for (let i = 0; i < newQueuedImages.length; i += 1) {
                const targetIndex = startIndex + i;
                let image = allImages[targetIndex];
                allImages[targetIndex] = { ...image, status: 'scanning', error: null };
                setImages([...allImages]);
                image = allImages[targetIndex];

                if (i > 0) {
                    await sleep(OCR_INTER_IMAGE_DELAY_MS);
                }

                let rateLimitRetries = 0;
                let serviceRetries = 0;
                let finishedImage = false;
                while (!finishedImage) {
                    try {
                        const scanFile = await optimizeOcrScanImage(image.file);
                        if (scanFile !== image.file) {
                            if (image.previewUrl.startsWith('blob:')) {
                                URL.revokeObjectURL(image.previewUrl);
                            }
                            const nextPreview = URL.createObjectURL(scanFile);
                            allImages[targetIndex] = {
                                ...allImages[targetIndex],
                                file: scanFile,
                                previewUrl: nextPreview,
                            };
                            image = allImages[targetIndex];
                            setImages([...allImages]);
                        }
                        const response = await scanTicketImage(image.file, {
                            importBatchLineId: softLineId ?? undefined,
                            importBatchId: selectedImportBatchId ?? undefined,
                        });
                        const data = response.data;
                        if (!data) {
                            throw new Error(response.message || 'Không nhận được kết quả OCR.');
                        }

                        if (
                            warningsIndicateRateLimit(data.warnings, response.message) &&
                            rateLimitRetries < OCR_RATE_LIMIT_MAX_RETRIES
                        ) {
                            rateLimitRetries += 1;
                            toast.info(
                                `Ảnh ${i + 1}/${newQueuedImages.length}: Groq đang giới hạn tốc độ. Đợi ${Math.round(
                                    OCR_RATE_LIMIT_RETRY_DELAY_MS / 1000
                                )}s rồi thử lại lần ${rateLimitRetries}…`
                            );
                            await sleep(OCR_RATE_LIMIT_RETRY_DELAY_MS);
                            continue;
                        }

                        if (
                            warningsIndicateBusyOrTimeout(data.warnings, response.message) &&
                            serviceRetries < OCR_SERVICE_MAX_RETRIES
                        ) {
                            serviceRetries += 1;
                            toast.info(
                                `Ảnh ${i + 1}/${newQueuedImages.length}: OCR đang bận. Đợi ${Math.round(
                                    OCR_SERVICE_RETRY_DELAY_MS / 1000
                                )}s rồi thử lại…`
                            );
                            await sleep(OCR_SERVICE_RETRY_DELAY_MS);
                            continue;
                        }

                        const durablePreview =
                            (data.sourceImageUrl && data.sourceImageUrl.trim()) ||
                            data.tickets?.find((ticket) => ticket.sourceImageUrl)?.sourceImageUrl ||
                            image.previewUrl;
                        if (durablePreview !== image.previewUrl && image.previewUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(image.previewUrl);
                        }
                        const tickets = data.tickets ?? [];
                        const unreadable = isUnreadableScanResult(tickets);
                        const failureReason = normalizeOcrScanErrorMessage(
                            data.warnings?.[0] ||
                                response.message ||
                                'Không thể đọc rõ thông tin vé từ ảnh này.'
                        );

                        allImages[targetIndex] = {
                            ...allImages[targetIndex],
                            status: unreadable ? 'error' : 'done',
                            scanId: data.scanId,
                            imageWidth: data.imageWidth ?? null,
                            imageHeight: data.imageHeight ?? null,
                            previewUrl: durablePreview,
                            error: unreadable ? failureReason : null,
                        };

                        if (tickets.length === 0 || unreadable) {
                            addedRows.push(
                                createFailedReviewRow(
                                    image.id,
                                    image.file.name,
                                    durablePreview,
                                    failureReason
                                )
                            );
                        } else {
                            for (const ticket of tickets) {
                                addedRows.push(
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
                            toast.warning(formatOcrWarningsForToast(friendlyWarnings), {
                                style: { whiteSpace: 'pre-line' },
                            });
                        }
                        finishedImage = true;
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
                        if (
                            isOcrRateLimitMessage(message) &&
                            rateLimitRetries < OCR_RATE_LIMIT_MAX_RETRIES
                        ) {
                            rateLimitRetries += 1;
                            toast.info(
                                `Ảnh ${i + 1}/${newQueuedImages.length}: ${OCR_RATE_LIMIT_MESSAGE} Đang thử lại…`
                            );
                            await sleep(OCR_RATE_LIMIT_RETRY_DELAY_MS);
                            continue;
                        }
                        if (
                            (isTechnicalOcrErrorMessage(message) ||
                                warningsIndicateBusyOrTimeout(null, message)) &&
                            serviceRetries < OCR_SERVICE_MAX_RETRIES
                        ) {
                            serviceRetries += 1;
                            toast.info(
                                `Ảnh ${i + 1}/${newQueuedImages.length}: OCR tạm thời không phản hồi. Đợi ${Math.round(
                                    OCR_SERVICE_RETRY_DELAY_MS / 1000
                                )}s rồi thử lại…`
                            );
                            await sleep(OCR_SERVICE_RETRY_DELAY_MS);
                            continue;
                        }
                        const displayMessage = normalizeOcrScanErrorMessage(message);
                        allImages[targetIndex] = {
                            ...allImages[targetIndex],
                            status: 'error',
                            error: displayMessage,
                        };
                        addedRows.push(
                            createFailedReviewRow(
                                image.id,
                                image.file.name,
                                image.previewUrl,
                                displayMessage
                            )
                        );
                        toast.error(`${image.file.name}: ${displayMessage}`);
                        finishedImage = true;
                    }
                }
                setImages([...allImages]);
            }

            const mergedRows = [...rows, ...addedRows];
            setRows(mergedRows);
            setScanning(false);
            setImages(allImages);

            const draftSnapshot: OcrImportDraft = {
                step: 'review',
                importMode,
                supplierId,
                invoiceEvidenceUrl,
                ticketListImageUrl,
                selectedImportBatchId,
                forceCreate,
                draftIntent,
                rows: compactRowsForDraft(mergedRows),
                imageMeta: allImages.map((img) => ({
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
        },
        [
            images,
            rows,
            supplierId,
            selectedImportBatchId,
            prefillLineOption,
            importMode,
            invoiceEvidenceUrl,
            ticketListImageUrl,
            forceCreate,
            draftIntent,
        ]
    );

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
        if (selectedImportBatchId == null || selectedImportBatchId <= 0) {
            toast.warning('Vui lòng chọn phiếu nhập lô ở bước tải ảnh trước khi tiếp tục.');
            setStep('upload');
            return;
        }
        const selectedRows = rows.filter((row) => row.selected && isRowConfirmable(row));
        if (selectedRows.length === 0) {
            toast.warning(
                'Chọn ít nhất một vé hợp lệ (nhà đài có lịch xổ đúng ngày + dãy số/serial đúng định dạng) để tiếp tục.'
            );
            return;
        }
        const snapshot = buildDraftSnapshot({
            step: 'importMode',
            importMode: 'MANUAL',
            draftIntent: 'USE_EXISTING',
            pendingRestore: false,
        });
        writeDraft(snapshot);
        setSavedDraft(snapshot);
        setStep('importMode');
    }, [rows, isRowConfirmable, buildDraftSnapshot, selectedImportBatchId]);

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

    const getImportQuantityCheck = useCallback((): ImportQuantityCheck => {
        return checkOcrImportQuantity(rows, selectedImportBatch, isRowConfirmable);
    }, [rows, selectedImportBatch, isRowConfirmable]);

    const canConfirmImport = useMemo(() => {
        if (confirmableCount === 0) {
            return false;
        }
        return selectedImportBatchId != null && selectedImportBatchId > 0;
    }, [confirmableCount, selectedImportBatchId]);

    const selectDraftBatch = useCallback((batchId: number | null) => {
        setDraftIntent('USE_EXISTING');
        setSelectedImportBatchId(batchId);
        setForceCreate(false);
        if (batchId != null) {
            const match = batchOptions.find((option) => option.id === batchId);
            if (match?.supplierId != null) {
                setSupplierIdState(match.supplierId);
            }
        }
    }, [batchOptions]);

    const chooseCreateNewBatch = useCallback(() => {
        setDraftIntent('USE_EXISTING');
        setSelectedImportBatchId(null);
        setForceCreate(false);
    }, []);

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

    const confirmImport = useCallback(
        async (options?: { acknowledgeShortfall?: boolean }): Promise<'OK' | 'OVER' | 'SHORTFALL' | 'BLOCKED'> => {
            const selectedRows = rows.filter((row) => row.selected && isRowConfirmable(row));
            if (selectedRows.length === 0) {
                toast.warning('Chọn ít nhất một vé hợp lệ để nhập.');
                return 'BLOCKED';
            }

            if (selectedImportBatchId == null || selectedImportBatchId <= 0) {
                toast.warning('Vui lòng chọn phiếu nhập lô để tiếp tục gắn vé.');
                setStep('upload');
                return 'BLOCKED';
            }

            const quantityCheck = checkOcrImportQuantity(
                rows,
                selectedImportBatch,
                isRowConfirmable
            );
            if (quantityCheck.isOverCapacity) {
                const stationHint =
                    quantityCheck.stationExcesses.length > 0
                        ? quantityCheck.stationExcesses
                              .map(
                                  (item) =>
                                      `${item.stationName}: chọn ${item.selected}, còn ${item.remaining}`
                              )
                              .join('; ')
                        : null;
                toast.error(
                    stationHint
                        ? `Số vé chọn vượt chỗ còn lại trên phiếu. Bỏ bớt vé trước khi nhập. (${stationHint})`
                        : `Đã chọn ${quantityCheck.selectedCount} vé nhưng phiếu chỉ còn ${quantityCheck.remainingCapacity} chỗ. Vui lòng bỏ bớt ${quantityCheck.excessCount} vé trước khi nhập.`
                );
                return 'OVER';
            }
            if (quantityCheck.isShortfall && !options?.acknowledgeShortfall) {
                return 'SHORTFALL';
            }

            setConfirming(true);
            try {
                const tickets = selectedRows.map((row) => ({
                    numbers: row.numbers.trim(),
                    serialNumber: row.serialNumber.trim(),
                    stationId: row.stationId!,
                    drawDate: dayjs(row.drawDate).format('YYYY-MM-DD'),
                    ticketImageBase64: row.croppedImageBase64 ?? null,
                    ocrScanResultId: row.ocrScanResultId ?? null,
                }));
                const response = await confirmOcrImport({
                    mode: 'MANUAL',
                    importBatchId: selectedImportBatchId,
                    tickets,
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
                return 'OK';
            } catch (error: unknown) {
                const message =
                    (error as { response?: { data?: { message?: string } }; message?: string })
                        ?.response?.data?.message ||
                    (error as { message?: string })?.message ||
                    'Nhập vé từ OCR thất bại.';
                toast.error(message);
                return 'BLOCKED';
            } finally {
                setConfirming(false);
            }
        },
        [rows, isRowConfirmable, selectedImportBatchId, selectedImportBatch]
    );

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
        scanMoreImages,
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
        hasAutoCreateEvidence,
        selectedImportBatchId,
        setSelectedImportBatchId,
        selectedBatch,
        selectedImportBatch,
        forceCreate,
        setForceCreate,
        canConfirmImport,
        getImportQuantityCheck,
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
