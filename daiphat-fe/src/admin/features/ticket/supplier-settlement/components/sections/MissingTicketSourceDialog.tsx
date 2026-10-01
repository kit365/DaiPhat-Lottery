"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    InputLabel,
    FormControl,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { scanTicketImage } from '@/admin/features/ticket/ocr-import/services/ticketOcrService';
import { optimizeOcrScanImages } from '@/admin/features/ticket/ocr-import/utils/optimizeOcrImage';
import OcrReviewResultCards from '@/admin/features/ticket/ocr-import/components/OcrReviewResultCards';
import type { OcrFieldSelection } from '@/admin/features/ticket/ocr-import/components/OcrReviewImagePane';
import OcrImageEditDialog from '@/admin/features/ticket/ocr-import/components/OcrImageEditDialog';
import type { OcrReviewRow } from '@/admin/features/ticket/ocr-import/types/ticketOcr.type';
import {
    buildReviewStationGroups,
    canConfirmReviewRow,
    mapScannedTicketToReviewRow,
} from '@/admin/features/ticket/ocr-import/utils/ocrImportHelpers';
import {
    inspectImportBatchFile,
    previewImportBatchFile,
} from '@/admin/features/ticket/import-batch/services/importBatchService';
import { ImportBatchFileColumnTagger } from '@/admin/features/ticket/import-batch/components/sections/ImportBatchFileColumnTagger';
import { extractSkippedTicketItem } from '@/admin/features/ticket/import-batch/components/sections/SkippedTicketsTable';
import type {
    ImportBatchFileInspectResult,
    ImportBatchFileMapping,
    ImportBatchFilePreviewResult,
} from '@/admin/features/ticket/import-batch/types/importBatch.type';
import {
    collectPreviewRowNotes,
    formatPreviewIssueNote,
    groupPreviewTicketRows,
    listPreviewSerials,
    previewTicketDisplayStatus,
} from '@/admin/features/ticket/import-batch/utils/importBatchFileImport';

export type MissingTicketCandidate = {
    key: string;
    lotteryStationId: number;
    stationName: string;
    numbers: string;
    serialNumber: string;
    evidenceUrl?: string;
    stationCode?: string;
    batchCode?: string;
    drawDate?: string;
    faceValue?: string;
    confidence?: number;
    validationStatus?: 'VALID' | 'WARNING' | 'ERROR';
    validationMessages?: string[];
    selectable?: boolean;
    edited?: boolean;
    reviewRow?: OcrReviewRow;
    sourceRowNumber?: number;
};

type Props = {
    open: boolean;
    supplierId: number;
    drawDate?: string | null;
    maxSelectable: number;
    stationAllocations: Array<{
        lotteryStationId: number;
        stationName: string;
        allocatedQuantity: number;
        currentQuantity: number;
    }>;
    onClose: () => void;
    onConfirm: (tickets: MissingTicketCandidate[]) => void;
    onConfirmLost: (entry: { quantity: number; lotteryStationId: number | null }) => void;
};

const errorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.message || fallback;

const displayDate = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const isValidTicketNumbers = (value: string) => /^\d{6}$/.test(value.trim());
const isValidTicketSerial = (value: string) => /^(?:[A-Za-z]\d+|\d+[A-Za-z])$/.test(value.trim());

const rawValueByAliases = (values: Record<string, string>, aliases: string[]) => {
    const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const entry = Object.entries(values || {}).find(([header]) =>
        aliases.some((alias) => normalize(header).includes(normalize(alias)))
    );
    return String(entry?.[1] ?? '').trim();
};

type OcrImageItem = {
    id: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'scanning' | 'done' | 'error';
    error?: string;
};

export const MissingTicketSourceDialog = ({
    open,
    supplierId,
    drawDate,
    maxSelectable,
    stationAllocations,
    onClose,
    onConfirm,
    onConfirmLost,
}: Props) => {
    const [entryKind, setEntryKind] = useState<'PRESENT' | 'LOST' | null>(null);
    const [activeSource, setActiveSource] = useState<'OCR' | 'FILE' | null>(null);
    const source = activeSource || 'OCR';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');
    const [candidates, setCandidates] = useState<MissingTicketCandidate[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [ocrImages, setOcrImages] = useState<OcrImageItem[]>([]);
    const [preparingImages, setPreparingImages] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [inspectResult, setInspectResult] = useState<ImportBatchFileInspectResult | null>(null);
    const [fileMapping, setFileMapping] = useState<ImportBatchFileMapping | null>(null);
    const [filePreview, setFilePreview] = useState<ImportBatchFilePreviewResult | null>(null);
    const [fileStep, setFileStep] = useState<'MAPPING' | 'PREVIEW'>('MAPPING');
    const [ocrFieldSelection, setOcrFieldSelection] = useState<OcrFieldSelection | null>(null);
    const [ocrSearchQuery, setOcrSearchQuery] = useState('');
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [detailTicket, setDetailTicket] = useState<MissingTicketCandidate | null>(null);
    const [fileIssueDetail, setFileIssueDetail] = useState<{ title: string; messages: string[] } | null>(null);
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filterDrawDate, setFilterDrawDate] = useState('ALL');
    const [filterStationId, setFilterStationId] = useState('ALL');
    const [filterValidity, setFilterValidity] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
    const [filterSelection, setFilterSelection] = useState<'ALL' | 'SELECTED' | 'UNSELECTED'>('ALL');
    const [lostQuantity, setLostQuantity] = useState('');
    const [lostStationId, setLostStationId] = useState<number | 'UNCONFIRMED' | ''>('');
    const ocrImagesRef = useRef<OcrImageItem[]>([]);
    const candidatesRef = useRef<MissingTicketCandidate[]>([]);
    const wasOpenRef = useRef(false);
    const hasOcrDraft = ocrImages.length > 0;
    const hasFileDraft = Boolean(file || inspectResult || filePreview);
    const pendingSource: 'OCR' | 'FILE' | null = hasOcrDraft ? 'OCR' : hasFileDraft ? 'FILE' : null;
    const hasLostDraft = Boolean(lostQuantity || lostStationId !== '');
    const pendingEntryKind: 'PRESENT' | 'LOST' | null = pendingSource ? 'PRESENT' : hasLostDraft ? 'LOST' : null;

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            setEntryKind(null);
            setActiveSource(null);
        }
        wasOpenRef.current = open;
    }, [open]);

    useEffect(() => {
        ocrImagesRef.current = ocrImages;
    }, [ocrImages]);

    useEffect(() => {
        candidatesRef.current = candidates;
    }, [candidates]);

    useEffect(() => () => {
        ocrImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    }, []);

    useEffect(() => {
        setSelected((current) => current.slice(0, Math.max(0, maxSelectable)));
    }, [maxSelectable]);

    const fileIssueRows = useMemo(() => (filePreview?.groups || []).flatMap((group) =>
        group.rows
            .filter((row) => row.status === 'ERROR' || row.status === 'SKIPPED' || row.issues.some((issue) => issue.severity === 'ERROR' || issue.severity === 'SKIPPED'))
            .map((row) => ({
                item: extractSkippedTicketItem(row, filePreview?.appliedMapping, group.drawDate),
                messages: Array.from(new Set([
                    ...row.issues.map((issue) => issue.message),
                    ...group.groupIssues.filter((issue) => issue.severity === 'ERROR').map((issue) => issue.message),
                ].filter(Boolean))),
            }))
    ), [filePreview]);

    const visibleFileIssueRows = useMemo(() => {
        const query = fileSearchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return fileIssueRows.filter(({ item, messages }) => [
            item.stationName, item.numbers, ...(item.serials || []), item.drawDate, ...messages,
        ].some((value) => !query || String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query))
            && (filterDrawDate === 'ALL' || item.drawDate === filterDrawDate)
            && (filterStationId === 'ALL' || item.stationName === stationAllocations.find((station) => String(station.lotteryStationId) === filterStationId)?.stationName)
            && filterValidity !== 'VALID'
            && filterSelection !== 'SELECTED');
    }, [fileIssueRows, fileSearchQuery, filterDrawDate, filterSelection, filterStationId, filterValidity, stationAllocations]);

    const selectedRows = useMemo(
        () => candidates.filter((ticket) => selected.includes(ticket.key)),
        [candidates, selected]
    );

    const visibleFileCandidates = useMemo(() => {
        if (source !== 'FILE') return candidates;
        const query = fileSearchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return candidates.filter((ticket) => {
            const valid = ticket.selectable !== false && ticket.validationStatus !== 'ERROR';
            return [ticket.stationName, ticket.numbers, ticket.serialNumber, ticket.batchCode, ticket.drawDate, ticket.faceValue]
                .some((value) => !query || String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query))
                && (filterDrawDate === 'ALL' || ticket.drawDate === filterDrawDate)
                && (filterStationId === 'ALL' || String(ticket.lotteryStationId) === filterStationId)
                && (filterValidity === 'ALL' || (filterValidity === 'VALID' ? valid : !valid))
                && (filterSelection === 'ALL' || (filterSelection === 'SELECTED' ? selected.includes(ticket.key) : !selected.includes(ticket.key)));
        });
    }, [candidates, fileSearchQuery, filterDrawDate, filterSelection, filterStationId, filterValidity, selected, source]);

    const candidateGroups = useMemo<Array<[string, MissingTicketCandidate[]]>>(() => {
        if (source !== 'OCR') {
            const groups = new Map<string, MissingTicketCandidate[]>();
            visibleFileCandidates.forEach((ticket) => {
                const key = ticket.drawDate || 'undated';
                groups.set(key, [...(groups.get(key) || []), ticket]);
            });
            return Array.from(groups.entries());
        }
        const groups = new Map<string, MissingTicketCandidate[]>();
        candidates.forEach((ticket) => {
            const key = String(ticket.lotteryStationId || 0);
            groups.set(key, [...(groups.get(key) || []), ticket]);
        });
        return Array.from(groups.entries());
    }, [candidates, source, visibleFileCandidates]);

    const allocationByStation = useMemo(
        () => new Map(stationAllocations.map((item) => [item.lotteryStationId, item])),
        [stationAllocations]
    );

    const allocationErrorFor = (ticket: MissingTicketCandidate) => {
        const allocation = allocationByStation.get(ticket.lotteryStationId);
        if (!allocation) return 'Nhà đài không có trong danh sách phân bổ.';
        if (allocation.currentQuantity >= allocation.allocatedQuantity) {
            return `${allocation.stationName} đã đủ số lượng được phân bổ (${allocation.allocatedQuantity} vé).`;
        }
        return '';
    };

    const selectWithinAllocation = (rows: MissingTicketCandidate[]) => {
        const used = new Map<number, number>();
        const keys: string[] = [];
        rows.forEach((ticket) => {
            if (ticket.selectable === false || keys.length >= maxSelectable) return;
            const allocation = allocationByStation.get(ticket.lotteryStationId);
            if (!allocation) return;
            const count = used.get(ticket.lotteryStationId) || 0;
            const available = Math.max(0, allocation.allocatedQuantity - allocation.currentQuantity);
            if (count >= available) return;
            used.set(ticket.lotteryStationId, count + 1);
            keys.push(ticket.key);
        });
        return keys;
    };

    const updateCandidate = (key: string, patch: Partial<MissingTicketCandidate>) => {
        setCandidates((current) => current.map((ticket) => {
            if (ticket.key !== key) return ticket;
            const next = { ...ticket, ...patch };
            const allocation = allocationByStation.get(next.lotteryStationId);
            if (allocation) next.stationName = allocation.stationName;
            if (source === 'OCR') {
                next.selectable = Boolean(next.lotteryStationId && isValidTicketNumbers(next.numbers) && isValidTicketSerial(next.serialNumber));
                next.validationStatus = next.selectable ? 'WARNING' : 'ERROR';
                next.validationMessages = next.selectable ? ['Thông tin đã được chỉnh sửa thủ công; vui lòng kiểm tra lại trước khi chọn.'] : [
                    ...(!next.lotteryStationId ? ['Chưa xác định nhà đài.'] : []),
                    ...(!isValidTicketNumbers(next.numbers) ? ['Dãy số phải có đúng 6 chữ số.'] : []),
                    ...(!isValidTicketSerial(next.serialNumber) ? ['Sê-ri phải có đúng một chữ cái ở đầu hoặc cuối; các ký tự còn lại là số.'] : []),
                ];
            }
            return next;
        }));
        setSelected((current) => current.filter((item) => item !== key));
        setError('');
    };

    const ocrReviewRows = useMemo<OcrReviewRow[]>(() => candidates.map((ticket, index) => {
        const allocationError = allocationErrorFor(ticket);
        return {
            ...(ticket.reviewRow || {} as OcrReviewRow),
            key: ticket.key,
            sourceImageId: ticket.reviewRow?.sourceImageId || ticket.key,
            sourceFileName: ticket.reviewRow?.sourceFileName || 'Ảnh vé OCR',
            sourcePreviewUrl: ticket.reviewRow?.sourcePreviewUrl || ticket.evidenceUrl || null,
            ticketIndex: ticket.reviewRow?.ticketIndex ?? index,
            ocrScanResultId: ticket.reviewRow?.ocrScanResultId ?? null,
            status: ticket.validationStatus === 'ERROR' ? 'FAILED' : ticket.validationStatus === 'WARNING' ? 'NEEDS_REVIEW' : 'COMPLETE',
            confidence: ticket.confidence ?? 0,
            adjustedConfidence: ticket.confidence ?? null,
            numbers: ticket.numbers,
            serialNumber: ticket.serialNumber,
            stationId: ticket.lotteryStationId || null,
            stationName: ticket.stationName,
            drawDate: ticket.drawDate || null,
            ticketType: ticket.faceValue || null,
            batchCode: ticket.batchCode || null,
            fieldConfidences: ticket.reviewRow?.fieldConfidences || {},
            fieldBoxes: ticket.reviewRow?.fieldBoxes || {},
            sourceFieldBoxes: ticket.reviewRow?.sourceFieldBoxes || {},
            fieldValidations: ticket.reviewRow?.fieldValidations || {},
            fields: ticket.reviewRow?.fields || {},
            overallValidationStatus: ticket.validationStatus === 'ERROR' ? 'INVALID' : ticket.validationStatus === 'WARNING' ? 'NEEDS_REVIEW' : 'VALID',
            missingFields: [],
            validationErrors: ticket.validationStatus === 'ERROR' ? (ticket.validationMessages || []) : [],
            businessValidationErrors: allocationError ? [allocationError] : [],
            duplicate: ticket.reviewRow?.duplicate || false,
            croppedImageBase64: ticket.reviewRow?.croppedImageBase64 || null,
            croppedImageUrl: ticket.evidenceUrl || null,
            selected: selected.includes(ticket.key),
            edited: Boolean(ticket.edited),
            editedFields: ticket.edited ? {
                numbers: true,
                serialNumber: true,
                stationName: true,
                drawDate: true,
                ticketType: true,
                batchCode: true,
            } : undefined,
        };
    }), [candidates, selected, allocationByStation]);

    const filteredOcrReviewRows = useMemo(() => {
        const query = ocrSearchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return ocrReviewRows.filter((row) => {
            const valid = canConfirmReviewRow(row, {
                allowedStationIds: new Set(stationAllocations.map((item) => item.lotteryStationId)),
                batchDrawDate: drawDate ? String(drawDate).slice(0, 10) : null,
            });
            return [row.numbers, row.serialNumber, row.stationName, row.drawDate, row.batchCode, row.ticketType]
                .some((value) => !query || String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query))
                && (filterDrawDate === 'ALL' || row.drawDate === filterDrawDate)
                && (filterStationId === 'ALL' || String(row.stationId || '') === filterStationId)
                && (filterValidity === 'ALL' || (filterValidity === 'VALID' ? valid : !valid))
                && (filterSelection === 'ALL' || (filterSelection === 'SELECTED' ? selected.includes(row.key) : !selected.includes(row.key)));
        });
    }, [drawDate, filterDrawDate, filterSelection, filterStationId, filterValidity, ocrReviewRows, ocrSearchQuery, selected, stationAllocations]);

    const ocrStationGroups = useMemo(
        () => buildReviewStationGroups(filteredOcrReviewRows),
        [filteredOcrReviewRows]
    );

    const validOcrKeys = useMemo(() => {
        const used = new Map<number, number>();
        const keys: string[] = [];
        filteredOcrReviewRows.forEach((row) => {
            const stationId = Number(row.stationId || 0);
            const allocation = allocationByStation.get(stationId);
            const candidate = candidates.find((item) => item.key === row.key);
            if (!allocation || !candidate || candidate.selectable === false) return;
            if (!canConfirmReviewRow(row, {
                allowedStationIds: new Set(stationAllocations.map((item) => item.lotteryStationId)),
                batchDrawDate: drawDate ? String(drawDate).slice(0, 10) : null,
            })) return;
            const available = Math.max(0, allocation.allocatedQuantity - allocation.currentQuantity);
            const count = used.get(stationId) || 0;
            if (count >= available || keys.length >= maxSelectable) return;
            used.set(stationId, count + 1);
            keys.push(row.key);
        });
        return keys;
    }, [allocationByStation, candidates, drawDate, filteredOcrReviewRows, maxSelectable, stationAllocations]);

    const allValidOcrSelected = validOcrKeys.length > 0 && validOcrKeys.every((key) => selected.includes(key));

    const validFileKeys = useMemo(
        () => selectWithinAllocation(visibleFileCandidates.filter((ticket) =>
            ticket.selectable !== false
            && ticket.validationStatus !== 'ERROR'
            && !allocationErrorFor(ticket)
        )),
        [visibleFileCandidates, allocationByStation, maxSelectable]
    );
    const allValidFileSelected = validFileKeys.length > 0 && validFileKeys.every((key) => selected.includes(key));
    const filterDrawDates = useMemo(() => Array.from(new Set([
        ...candidates.map((ticket) => ticket.drawDate || ''),
        ...fileIssueRows.map(({ item }) => item.drawDate || ''),
    ].filter(Boolean))).sort(), [candidates, fileIssueRows]);

    const updateOcrReviewRow = (key: string, patch: Partial<OcrReviewRow>) => {
        updateCandidate(key, {
            ...(patch.numbers !== undefined ? { numbers: patch.numbers } : {}),
            ...(patch.serialNumber !== undefined ? { serialNumber: patch.serialNumber } : {}),
            ...(patch.stationId !== undefined ? { lotteryStationId: Number(patch.stationId || 0) } : {}),
            ...(patch.stationName !== undefined ? { stationName: patch.stationName || 'Chưa xác định' } : {}),
            ...(patch.drawDate !== undefined ? { drawDate: patch.drawDate || '' } : {}),
            ...(patch.ticketType !== undefined ? { faceValue: patch.ticketType || '' } : {}),
            ...(patch.batchCode !== undefined ? { batchCode: patch.batchCode || '' } : {}),
            edited: true,
        });
    };

    const toggle = (key: string) => {
        const ticket = candidates.find((item) => item.key === key);
        if (!ticket || ticket.selectable === false) return;
        setSelected((current) => {
            if (current.includes(key)) return current.filter((item) => item !== key);
            if (current.length >= maxSelectable) return current;
            const allocation = allocationByStation.get(ticket.lotteryStationId);
            if (!allocation) {
                setError('Nhà đài của vé không có trong danh sách phân bổ. Hãy sửa lại nhà đài trước khi chọn vé.');
                return current;
            }
            const selectedForStation = candidates.filter(
                (item) => current.includes(item.key) && item.lotteryStationId === ticket.lotteryStationId
            ).length;
            const available = Math.max(0, allocation.allocatedQuantity - allocation.currentQuantity);
            if (selectedForStation >= available) {
                setError(`${allocation.stationName} chỉ còn được bổ sung ${available} vé theo danh sách phân bổ.`);
                return current;
            }
            setError('');
            return [...current, key];
        });
    };

    const addOcrImages = async (files: File[]) => {
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;
        setPreparingImages(true);
        setError('');
        try {
            const optimized = await optimizeOcrScanImages(imageFiles);
            const next = optimized.map((file, index): OcrImageItem => ({
                id: `${Date.now()}-${index}-${file.name}-${file.size}`,
                file,
                previewUrl: URL.createObjectURL(file),
                status: 'pending',
            }));
            setOcrImages((current) => [...current, ...next]);
        } finally {
            setPreparingImages(false);
        }
    };

    const handleFile = async (file?: File | null) => {
        if (!file) return;
        if (source === 'OCR') {
            await addOcrImages([file]);
            return;
        }
        setLoading(true);
        setError('');
        setFileName(file.name);
        setFile(file);
        setInspectResult(null);
        setFilePreview(null);
        setFileStep('MAPPING');
        setFileSearchQuery('');
        setCandidates([]);
        setSelected([]);
        try {
            const inspected = await inspectImportBatchFile(file, supplierId);
            const inspectData = inspected.data;
            if (!inspectData) throw new Error('Không đọc được cấu trúc tệp danh sách vé.');
            setInspectResult(inspectData);
            setFileMapping({
                ...inspectData.suggestedMapping,
                ...(!inspectData.suggestedMapping.drawDateColumn && drawDate
                    ? { fallbackDrawDate: String(drawDate).slice(0, 10) }
                    : {}),
            });
        } catch (err: any) {
            setError(errorMessage(err, 'Đọc tệp danh sách vé thất bại.'));
        } finally {
            setLoading(false);
        }
    };

    const runFilePreview = async () => {
        if (!file || !fileMapping) return;
        setLoading(true);
        setError('');
        setCandidates([]);
        setSelected([]);
        try {
            const previewed = await previewImportBatchFile(file, { supplierId, mapping: fileMapping });
            const preview = previewed.data;
            if (!preview) throw new Error('Không xem trước được dữ liệu trong tệp.');
            setFilePreview(preview);
            setFileMapping(preview.appliedMapping);
            const settlementDrawDate = String(drawDate || '').slice(0, 10);
            const matchingGroups = preview.groups.filter(
                (group) => !settlementDrawDate || !group.drawDate || group.drawDate === settlementDrawDate
            );
            const rows: MissingTicketCandidate[] = matchingGroups
                .flatMap((group) =>
                    groupPreviewTicketRows(group.rows || [], preview.appliedMapping).flatMap((line) => {
                        // Settlement supplements do not create/select an import batch, so
                        // only ticket/row validation applies here; import-batch group gates
                        // (draft existence, intake mode, supplier-batch binding) are ignored.
                        const displayStatus = previewTicketDisplayStatus(line);
                        const lineNotes = collectPreviewRowNotes(line);
                        return listPreviewSerials(line).map((serial, serialIndex) => {
                            const row = serial.sourceRow;
                            const stationId = Number(row.lotteryStationId || line.row.lotteryStationId || 0);
                            const numbers = line.row.numbers?.trim() || row.numbers?.trim() || '';
                            const serialNumber = serial.serial?.trim() || '';
                            const validationMessages = Array.from(new Set([
                                ...(lineNotes.full ? lineNotes.full.split('\n') : []),
                                ...serial.issues.map(formatPreviewIssueNote),
                                ...(!isValidTicketNumbers(numbers) ? ['Dãy số phải có đúng 6 chữ số.'] : []),
                                ...(!isValidTicketSerial(serialNumber) ? ['Sê-ri phải có đúng một chữ cái ở đầu hoặc cuối; các ký tự còn lại là số.'] : []),
                            ].filter(Boolean)));
                            const selectable =
                                Boolean(stationId && isValidTicketNumbers(numbers) && isValidTicketSerial(serialNumber))
                                && displayStatus !== 'ERROR'
                                && displayStatus !== 'BLOCKED'
                                && serial.status !== 'ERROR'
                                && serial.status !== 'SKIPPED';
                            return {
                                key: `file-${group.drawDate || 'date'}-${row.rowNumber}-${serialIndex}-${serialNumber || 'missing'}`,
                                lotteryStationId: stationId,
                                stationName: row.stationName?.trim() || line.row.stationName?.trim() || (stationId ? `Đài #${stationId}` : 'Chưa xác định'),
                                stationCode: rawValueByAliases(row.rawValues, ['mã đài', 'station code']),
                                numbers,
                                serialNumber,
                                batchCode: rawValueByAliases(row.rawValues, ['ký hiệu', 'mã lô', 'batch code', 'symbol']),
                                drawDate: group.drawDate || row.drawDate || '',
                                faceValue: rawValueByAliases(row.rawValues, ['mệnh giá', 'giá bán', 'sale price']),
                                evidenceUrl: serial.image || '',
                                validationStatus: selectable ? (displayStatus === 'WARNING' || validationMessages.length > 0 ? 'WARNING' : 'VALID') : 'ERROR',
                                validationMessages,
                                selectable,
                                sourceRowNumber: row.rowNumber,
                            } satisfies MissingTicketCandidate;
                        });
                    })
                );

            const unique = Array.from(new Map(rows.map((row) => [`${row.lotteryStationId}|${row.serialNumber}`, row])).values());
            candidatesRef.current = unique;
            setCandidates(unique);
            setSelected([]);
            if (unique.length === 0) {
                const fileDrawDates = Array.from(new Set(
                    preview.groups
                        .map((group) => group.drawDate)
                        .filter((value): value is string => Boolean(value))
                ));
                if (settlementDrawDate && preview.groups.length > 0 && matchingGroups.length === 0) {
                    setError(
                        `Ngày quay trong tệp (${fileDrawDates.map(displayDate).join(', ') || 'không xác định'}) không khớp ngày quay của phiên đối soát (${displayDate(settlementDrawDate)}). Vui lòng chọn đúng tệp; không cần gán lại cột.`
                    );
                } else {
                    const issueMessages = Array.from(new Set(
                        preview.groups.flatMap((group) => [
                            ...group.groupIssues.map((issue) => issue.message),
                            ...group.rows.flatMap((row) => row.issues.map((issue) => issue.message)),
                        ]).filter(Boolean)
                    ));
                    setError(
                        issueMessages.length > 0
                            ? `Không có vé hợp lệ để bổ sung. ${issueMessages.slice(0, 3).join(' · ')}`
                            : 'Không tìm thấy dãy số và sê-ri hợp lệ trong tệp. Vui lòng kiểm tra hai cột “Dãy số” và “Danh sách sê-ri”.'
                    );
                }
            }
            setFileStep('PREVIEW');
        } catch (err: any) {
            setError(errorMessage(err, 'Xem trước tệp danh sách vé thất bại.'));
        } finally {
            setLoading(false);
        }
    };

    const scanPendingImages = async () => {
        if (loading) return;
        const pending = ocrImages.filter((image) => image.status === 'pending' || image.status === 'error');
        if (pending.length === 0) return;
        setLoading(true);
        setError('');
        for (const image of pending) {
            setOcrImages((current) => current.map((item) =>
                item.id === image.id ? { ...item, status: 'scanning', error: undefined } : item
            ));
            try {
                const response = await scanTicketImage(image.file);
                const result = response.data;
                const rows: MissingTicketCandidate[] = (result?.tickets || []).flatMap((ticket, index) => {
                    const reviewRow = mapScannedTicketToReviewRow(
                        ticket,
                        image.id,
                        image.file.name,
                        result?.scanId,
                        image.previewUrl,
                        result?.imageWidth,
                        result?.imageHeight
                    );
                    const stationId = Number(reviewRow.stationId || 0);
                    const serialNumber = reviewRow.serialNumber;
                    const numbers = reviewRow.numbers;
                    const validationMessages = Array.from(new Set([
                        ...(ticket.validationErrors || []),
                        ...(ticket.businessValidationErrors || []),
                        ...(ticket.missingFields || []).map((field) => `Thiếu trường ${field}`),
                        ...Object.values(ticket.fieldValidations || {}).flatMap((validation) => [
                            validation.message || '',
                            ...(validation.ruleFailures || []).map((failure) => failure.message || ''),
                        ]),
                        ...(!isValidTicketNumbers(numbers) ? ['Dãy số phải có đúng 6 chữ số.'] : []),
                        ...(!isValidTicketSerial(serialNumber) ? ['Sê-ri phải có đúng một chữ cái ở đầu hoặc cuối; các ký tự còn lại là số.'] : []),
                    ].filter(Boolean)));
                    const selectable = Boolean(stationId && isValidTicketNumbers(numbers) && isValidTicketSerial(serialNumber))
                        && ticket.status !== 'FAILED'
                        && ticket.overallValidationStatus !== 'INVALID'
                        && canConfirmReviewRow(reviewRow, {
                            allowedStationIds: new Set(stationAllocations.map((item) => item.lotteryStationId)),
                            batchDrawDate: drawDate ? String(drawDate).slice(0, 10) : null,
                        });
                    return [{
                        key: reviewRow.key || `ocr-${ticket.ocrScanResultId || image.id}-${index}-${serialNumber}`,
                        lotteryStationId: stationId,
                        stationName: reviewRow.stationName?.trim() || (stationId ? `Đài #${stationId}` : 'Chưa xác định'),
                        stationCode: ticket.extracted?.stationCode?.trim() || '',
                        numbers,
                        serialNumber,
                        batchCode: reviewRow.batchCode?.trim() || '',
                        drawDate: reviewRow.drawDate || '',
                        faceValue: reviewRow.ticketType || '',
                        confidence: ticket.adjustedConfidence ?? ticket.confidence,
                        evidenceUrl: ticket.croppedImageUrl || ticket.sourceImageUrl || result?.sourceImageUrl || '',
                        validationStatus: selectable
                            ? ticket.overallValidationStatus === 'NEEDS_REVIEW' || ticket.status !== 'COMPLETE' || validationMessages.length > 0
                                ? 'WARNING'
                                : 'VALID'
                            : 'ERROR',
                        validationMessages,
                        selectable,
                        reviewRow,
                    }];
                });
                const unique = Array.from(new Map(
                    [...candidatesRef.current, ...rows].map((row) => [`${row.lotteryStationId}|${row.serialNumber}`, row])
                ).values());
                candidatesRef.current = unique;
                setCandidates(unique);
                setSelected(selectWithinAllocation(unique));
                setOcrImages((current) => current.map((item) =>
                    item.id === image.id ? { ...item, status: 'done' } : item
                ));
            } catch (err: any) {
                const message = errorMessage(err, 'Quét OCR thất bại.');
                setOcrImages((current) => current.map((item) =>
                    item.id === image.id ? { ...item, status: 'error', error: message } : item
                ));
                setError(message);
            }
        }
        setLoading(false);
    };

    const removeOcrImage = (id: string) => {
        setOcrImages((current) => {
            const target = current.find((item) => item.id === id);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return current.filter((item) => item.id !== id);
        });
        const nextCandidates = candidatesRef.current.filter((ticket) => ticket.reviewRow?.sourceImageId !== id);
        candidatesRef.current = nextCandidates;
        setCandidates(nextCandidates);
        setSelected((current) => current.filter((key) => nextCandidates.some((ticket) => ticket.key === key)));
        setOcrFieldSelection(null);
        setDetailTicket((current) => current?.reviewRow?.sourceImageId === id ? null : current);
        setError('');
    };

    const replaceOcrImage = (id: string, file: File) => {
        setOcrImages((current) => current.map((image) => {
            if (image.id !== id) return image;
            URL.revokeObjectURL(image.previewUrl);
            return {
                ...image,
                file,
                previewUrl: URL.createObjectURL(file),
                status: 'pending',
                error: undefined,
            };
        }));
        const nextCandidates = candidatesRef.current.filter((ticket) => ticket.reviewRow?.sourceImageId !== id);
        candidatesRef.current = nextCandidates;
        setCandidates(nextCandidates);
        setSelected((current) => current.filter((key) => nextCandidates.some((ticket) => ticket.key === key)));
        setOcrFieldSelection(null);
        setError('Ảnh đã được chỉnh sửa. Nhấn “Tiến hành quét” để cập nhật lại thông tin vé.');
    };

    const resetOcrState = () => {
        ocrImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setOcrImages([]);
        candidatesRef.current = [];
        setCandidates([]);
        setSelected([]);
        setOcrFieldSelection(null);
        setOcrSearchQuery('');
        setFiltersOpen(false);
        setFilterDrawDate('ALL');
        setFilterStationId('ALL');
        setFilterValidity('ALL');
        setFilterSelection('ALL');
        setEditingImageId(null);
        setDetailTicket(null);
        setError('');
    };

    const resetFileState = () => {
        setFile(null);
        setFileName('');
        setInspectResult(null);
        setFileMapping(null);
        setFilePreview(null);
        setFileStep('MAPPING');
        candidatesRef.current = [];
        setCandidates([]);
        setSelected([]);
        setDetailTicket(null);
        setFileIssueDetail(null);
        setFileSearchQuery('');
        setFiltersOpen(false);
        setFilterDrawDate('ALL');
        setFilterStationId('ALL');
        setFilterValidity('ALL');
        setFilterSelection('ALL');
        setError('');
    };

    const allocationSummary = (
        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', borderColor: '#dbeafe' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25, bgcolor: '#eff6ff' }}>
                <Box>
                    <Typography variant="subtitle2" fontWeight={800}>Danh sách phân bổ theo nhà đài</Typography>
                    <Typography variant="caption" color="text.secondary">Đối chiếu số lượng cần bổ sung trước khi chọn vé.</Typography>
                </Box>
                <Chip size="small" label={`Còn thiếu ${maxSelectable} vé`} color="warning" sx={{ fontWeight: 800 }} />
            </Stack>
            <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' } }}>
                            <TableCell>Nhà đài</TableCell>
                            <TableCell align="right">Cần bổ sung</TableCell>
                            <TableCell align="right">Đã có</TableCell>
                            <TableCell align="right">Đang chọn</TableCell>
                            <TableCell align="right">Còn lại</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stationAllocations.map((station) => {
                            const selecting = selectedRows.filter((ticket) => ticket.lotteryStationId === station.lotteryStationId).length;
                            const remaining = Math.max(0, station.allocatedQuantity - station.currentQuantity - selecting);
                            return (
                                <TableRow key={station.lotteryStationId} hover>
                                    <TableCell sx={{ fontWeight: 700 }}>{station.stationName}</TableCell>
                                    <TableCell align="right">{station.allocatedQuantity}</TableCell>
                                    <TableCell align="right">{station.currentQuantity}</TableCell>
                                    <TableCell align="right" sx={{ color: selecting > 0 ? '#2563eb' : '#94a3b8', fontWeight: 800 }}>{selecting}</TableCell>
                                    <TableCell align="right" sx={{ color: remaining === 0 ? '#16a34a' : '#d97706', fontWeight: 800 }}>{remaining}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Box>
        </Paper>
    );

    const ticketFilterPanel = filtersOpen && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 170 }}>
                    <InputLabel>Ngày quay</InputLabel>
                    <Select label="Ngày quay" value={filterDrawDate} onChange={(event) => setFilterDrawDate(String(event.target.value))}>
                        <MenuItem value="ALL">Tất cả ngày quay</MenuItem>
                        {filterDrawDates.map((date) => <MenuItem key={date} value={date}>{displayDate(date)}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 190 }}>
                    <InputLabel>Nhà đài</InputLabel>
                    <Select label="Nhà đài" value={filterStationId} onChange={(event) => setFilterStationId(String(event.target.value))}>
                        <MenuItem value="ALL">Tất cả nhà đài</MenuItem>
                        {stationAllocations.map((station) => <MenuItem key={station.lotteryStationId} value={String(station.lotteryStationId)}>{station.stationName}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Hợp lệ</InputLabel>
                    <Select label="Hợp lệ" value={filterValidity} onChange={(event) => setFilterValidity(event.target.value as typeof filterValidity)}>
                        <MenuItem value="ALL">Tất cả</MenuItem>
                        <MenuItem value="VALID">Hợp lệ</MenuItem>
                        <MenuItem value="INVALID">Không hợp lệ</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 165 }}>
                    <InputLabel>Trạng thái chọn</InputLabel>
                    <Select label="Trạng thái chọn" value={filterSelection} onChange={(event) => setFilterSelection(event.target.value as typeof filterSelection)}>
                        <MenuItem value="ALL">Tất cả</MenuItem>
                        <MenuItem value="SELECTED">Đã chọn</MenuItem>
                        <MenuItem value="UNSELECTED">Chưa chọn</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    size="small"
                    onClick={() => {
                        setFilterDrawDate('ALL');
                        setFilterStationId('ALL');
                        setFilterValidity('ALL');
                        setFilterSelection('ALL');
                    }}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    Xóa bộ lọc
                </Button>
            </Stack>
        </Paper>
    );

    if (!entryKind) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pr: 7, fontWeight: 800 }}>
                    Bổ sung vé thiếu
                    <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Alert severity={pendingEntryKind ? 'warning' : 'info'} sx={{ mb: 2, borderRadius: '10px' }}>
                        {pendingEntryKind
                            ? `Bạn đang có dữ liệu ${pendingEntryKind === 'PRESENT' ? 'vé hiện có' : 'vé thất thoát'} chưa xác nhận. Hãy tiếp tục hoặc xóa dữ liệu hiện tại trước khi chuyển loại vé.`
                            : 'Chọn loại vé cần bổ sung. Dữ liệu chỉ được đưa vào danh sách sau khi bạn xác nhận.'}
                    </Alert>
                    <Stack spacing={1.5}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<DocumentScannerOutlinedIcon />}
                            disabled={pendingEntryKind === 'LOST'}
                            onClick={() => setEntryKind('PRESENT')}
                            sx={{ minHeight: 82, justifyContent: 'flex-start', textTransform: 'none', fontWeight: 800, borderRadius: '12px', px: 2 }}
                        >
                            <Stack alignItems="flex-start" spacing={0.35}>
                                <Typography fontWeight={800}>{pendingEntryKind === 'PRESENT' ? 'Tiếp tục xử lý vé hiện có' : 'Bổ sung vé hiện có'}</Typography>
                                <Typography variant="caption" color="text.secondary">Quét OCR hoặc đọc danh sách vé từ tệp.</Typography>
                            </Stack>
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="warning"
                            startIcon={<ConfirmationNumberOutlinedIcon />}
                            disabled={pendingEntryKind === 'PRESENT'}
                            onClick={() => setEntryKind('LOST')}
                            sx={{ minHeight: 82, justifyContent: 'flex-start', textTransform: 'none', fontWeight: 800, borderRadius: '12px', px: 2 }}
                        >
                            <Stack alignItems="flex-start" spacing={0.35}>
                                <Typography fontWeight={800}>{pendingEntryKind === 'LOST' ? 'Tiếp tục nhập vé thất thoát' : 'Bổ sung vé thất thoát'}</Typography>
                                <Typography variant="caption" color="text.secondary">Nhập số lượng và chọn nhà đài, không cần OCR hoặc tải tệp.</Typography>
                            </Stack>
                        </Button>
                    </Stack>
                </DialogContent>
            </Dialog>
        );
    }

    if (entryKind === 'LOST') {
        const quantity = Number(lostQuantity || 0);
        const invalidQuantity = quantity > maxSelectable;
        return (
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pr: 7, fontWeight: 800 }}>
                    Bổ sung vé thất thoát
                    <Button
                        size="small"
                        startIcon={<ArrowBackOutlinedIcon />}
                        disabled={hasLostDraft}
                        onClick={() => setEntryKind(null)}
                        sx={{ ml: 1.5, textTransform: 'none', fontWeight: 700 }}
                    >
                        {hasLostDraft ? 'Xóa dữ liệu để quay lại' : 'Quay lại'}
                    </Button>
                    <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Alert severity="info" sx={{ borderRadius: '10px' }}>
                            Vé thất thoát chỉ ghi nhận số lượng và nhà đài; không tạo dãy số hoặc sê-ri.
                        </Alert>
                        <TextField
                            fullWidth
                            size="small"
                            label="Số lượng vé thất thoát"
                            value={lostQuantity}
                            error={invalidQuantity}
                            helperText={invalidQuantity ? `Chỉ còn được bổ sung tối đa ${maxSelectable} vé.` : `Tối đa ${maxSelectable} vé còn thiếu.`}
                            onChange={(event) => setLostQuantity(event.target.value.replace(/\D/g, ''))}
                            inputProps={{ inputMode: 'numeric', min: 1, max: maxSelectable }}
                        />
                        <FormControl fullWidth size="small">
                            <InputLabel>Nhà đài</InputLabel>
                            <Select
                                label="Nhà đài"
                                value={lostStationId}
                                onChange={(event) => setLostStationId(event.target.value as number | 'UNCONFIRMED')}
                            >
                                <MenuItem value="UNCONFIRMED">Chưa xác nhận nhà đài</MenuItem>
                                {stationAllocations.map((station) => (
                                    <MenuItem key={station.lotteryStationId} value={station.lotteryStationId}>{station.stationName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {hasLostDraft && (
                            <Button
                                color="error"
                                startIcon={<DeleteOutlineIcon />}
                                onClick={() => {
                                    setLostQuantity('');
                                    setLostStationId('');
                                    setError('');
                                }}
                                sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                            >
                                Xóa dữ liệu đã nhập
                            </Button>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>Đóng</Button>
                    <Button
                        variant="contained"
                        startIcon={<CheckCircleOutlinedIcon />}
                        disabled={quantity <= 0 || invalidQuantity || lostStationId === ''}
                        onClick={() => {
                            onConfirmLost({
                                quantity,
                                lotteryStationId: lostStationId === 'UNCONFIRMED' ? null : Number(lostStationId),
                            });
                            setLostQuantity('');
                            setLostStationId('');
                            setEntryKind(null);
                            onClose();
                        }}
                        sx={{ textTransform: 'none', fontWeight: 800 }}
                    >
                        Xác nhận {quantity || 0} vé thất thoát
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    if (!activeSource) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pr: 7, fontWeight: 800 }}>
                    Bổ sung vé hiện có
                    <Button
                        size="small"
                        startIcon={<ArrowBackOutlinedIcon />}
                        disabled={Boolean(pendingSource)}
                        onClick={() => setEntryKind(null)}
                        sx={{ ml: 1.5, textTransform: 'none', fontWeight: 700 }}
                    >
                        Quay lại loại vé
                    </Button>
                    <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Alert severity={pendingSource ? 'warning' : 'info'} sx={{ mb: 2, borderRadius: '10px' }}>
                        {pendingSource
                            ? `Bạn đang có dữ liệu ${pendingSource === 'OCR' ? 'OCR' : 'từ tệp'} chưa xác nhận. Hãy tiếp tục xử lý hoặc xóa dữ liệu hiện tại trước khi đổi phương thức.`
                            : 'Chọn cách lấy thông tin vé. Nhà đài và số lượng sẽ được kiểm tra theo danh sách phân bổ trước khi thêm.'}
                    </Alert>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<DocumentScannerOutlinedIcon />}
                            onClick={() => setActiveSource('OCR')}
                            disabled={pendingSource === 'FILE'}
                            sx={{ minHeight: 88, textTransform: 'none', fontWeight: 800, borderRadius: '12px' }}
                        >
                            <Stack alignItems="flex-start" spacing={0.35}>
                                <Typography variant="body2" fontWeight={800}>{pendingSource === 'OCR' ? 'Tiếp tục xử lý OCR' : 'Bổ sung bằng OCR'}</Typography>
                                <Typography variant="caption" color="text.secondary" textAlign="left">
                                    {candidates.some((ticket) => ticket.reviewRow)
                                        ? `${candidates.filter((ticket) => ticket.reviewRow).length} vé đã có thông tin OCR · ${selected.length} vé đang chọn`
                                        : ocrImages.some((image) => image.status === 'pending' || image.status === 'scanning')
                                            ? `${ocrImages.filter((image) => image.status === 'pending' || image.status === 'scanning').length} ảnh chưa xác nhận / chưa quét xong`
                                            : 'Chưa có ảnh được xác nhận hoặc quét'}
                                </Typography>
                            </Stack>
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<UploadFileOutlinedIcon />}
                            onClick={() => setActiveSource('FILE')}
                            disabled={pendingSource === 'OCR'}
                            sx={{ minHeight: 88, textTransform: 'none', fontWeight: 800, borderRadius: '12px' }}
                        >
                            <Stack alignItems="flex-start" spacing={0.35}>
                                <Typography variant="body2" fontWeight={800}>{pendingSource === 'FILE' ? 'Tiếp tục xử lý tệp' : 'Bổ sung từ tệp'}</Typography>
                                <Typography variant="caption" color="text.secondary" textAlign="left">
                                    {filePreview
                                        ? `${filePreview.totalRows} dòng đã đọc · ${filePreview.importableRows} dòng hợp lệ`
                                        : file
                                            ? 'Tệp đã chọn nhưng chưa xác nhận xem trước'
                                            : 'Chưa có tệp được xác nhận'}
                                </Typography>
                            </Stack>
                        </Button>
                    </Stack>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <>
        <Dialog open={open} onClose={onClose} maxWidth={source === 'FILE' || candidates.length > 0 ? 'xl' : 'md'} fullWidth>
            <DialogTitle sx={{ pr: 7, fontWeight: 800 }}>
                {source === 'OCR' ? 'Bổ sung vé thiếu bằng OCR' : 'Bổ sung vé thiếu từ tệp'}
                <Button
                    size="small"
                    startIcon={<ArrowBackOutlinedIcon />}
                    onClick={() => setActiveSource(null)}
                    disabled={Boolean(pendingSource)}
                    title={pendingSource ? 'Hãy xác nhận hoặc xóa dữ liệu hiện tại trước khi đổi phương thức.' : 'Đổi phương thức bổ sung vé'}
                    sx={{ ml: 1.5, textTransform: 'none', fontWeight: 700 }}
                >
                    {pendingSource ? 'Hoàn tất hoặc xóa để đổi' : 'Đổi phương thức'}
                </Button>
                <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {source === 'OCR' && (
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ py: 0.5 }}>
                            <Chip
                                size="small"
                                color={candidates.length === 0 ? 'primary' : 'success'}
                                label="1. Tải ảnh & quét OCR"
                                sx={{ fontWeight: 800 }}
                            />
                            <Box sx={{ width: { xs: 20, sm: 48 }, height: 2, bgcolor: candidates.length > 0 ? '#10b981' : '#cbd5e1' }} />
                            <Chip
                                size="small"
                                color={candidates.length > 0 ? 'primary' : 'default'}
                                label="2. Xem lại kết quả"
                                sx={{ fontWeight: 800 }}
                            />
                        </Stack>
                    )}
                    {source === 'OCR' && (
                        <Alert severity="info" sx={{ borderRadius: '10px' }}>
                            Tải một hoặc nhiều ảnh vé. Ảnh chỉ được quét khi bạn bấm “Tiến hành quét”.
                        </Alert>
                    )}
                    {allocationSummary}
                    {source === 'OCR' ? (
                        <Stack spacing={2}>
                            <input
                                id="missing-ticket-ocr-images"
                                hidden
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) => {
                                    if (event.target.files) void addOcrImages(Array.from(event.target.files));
                                    event.target.value = '';
                                }}
                            />
                            {ocrImages.length === 0 ? (
                                <Box
                                    component="label"
                                    htmlFor="missing-ticket-ocr-images"
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragging(true);
                                    }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragging(false);
                                        void addOcrImages(Array.from(event.dataTransfer.files));
                                    }}
                                    sx={{
                                        border: `2px dashed ${dragging ? '#2563eb' : '#cbd5e1'}`,
                                        borderRadius: '14px',
                                        p: { xs: 3, sm: 4 },
                                        bgcolor: dragging ? '#eff6ff' : '#f8fafc',
                                        textAlign: 'center',
                                        cursor: preparingImages ? 'wait' : 'pointer',
                                        transition: 'all .2s',
                                        '&:hover': { borderColor: '#2563eb', bgcolor: '#f0f7ff' },
                                    }}
                                >
                                    {preparingImages ? <CircularProgress size={38} /> : (
                                        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: dragging ? '#dbeafe' : 'rgba(37,99,235,.08)', color: '#2563eb', display: 'inline-grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(37,99,235,.12)' }}>
                                            <CloudUploadOutlinedIcon sx={{ fontSize: 34 }} />
                                        </Box>
                                    )}
                                    <Typography fontWeight={800} color="#0f172a" sx={{ mt: 1 }}>
                                        Kéo và thả ảnh vé vào đây, hoặc nhấn để chọn tệp
                                    </Typography>
                                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                                        <Chip size="small" label="JPG, PNG, WEBP" />
                                        <Chip size="small" label="Tối đa 15MB / ảnh" />
                                        <Chip size="small" label="Quét được nhiều vé / ảnh" />
                                    </Stack>
                                    <Button component="span" variant="contained" startIcon={<AddPhotoAlternateOutlinedIcon />} sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}>
                                        Chọn ảnh từ thiết bị
                                    </Button>
                                </Box>
                            ) : (
                                <Stack spacing={1.5}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#f8fafc' }}>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5}>
                                            <Stack direction="row" alignItems="center" spacing={1.25}>
                                                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: '#dbeafe', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                                                    <DocumentScannerOutlinedIcon sx={{ fontSize: 20 }} />
                                                </Box>
                                                <Box>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography fontWeight={800}>Đã chọn {ocrImages.length} ảnh vé</Typography>
                                                        <Chip size="small" color={ocrImages.some((image) => image.status === 'pending') ? 'success' : 'default'} label={ocrImages.some((image) => image.status === 'pending') ? 'Sẵn sàng quét' : 'Đã quét'} sx={{ fontWeight: 700 }} />
                                                    </Stack>
                                                    <Typography variant="caption" color="text.secondary">Có thể thêm ảnh mới hoặc quét các ảnh đang chờ.</Typography>
                                                </Box>
                                            </Stack>
                                            <Stack direction="row" spacing={1}>
                                                <Button component="label" htmlFor="missing-ticket-ocr-images" variant="outlined" startIcon={<AddPhotoAlternateOutlinedIcon />} disabled={preparingImages} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                                    Thêm ảnh
                                                </Button>
                                                <Button color="error" variant="text" startIcon={<DeleteOutlineIcon />} disabled={loading} onClick={resetOcrState} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                                    Xóa tất cả
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.25, maxHeight: 380, overflowY: 'auto', p: 0.5 }}>
                                        {ocrImages.map((image) => (
                                            <Paper key={image.id} variant="outlined" sx={{ p: 1, borderRadius: '12px', overflow: 'hidden' }}>
                                                <Box sx={{ position: 'relative' }}>
                                                    <Box component="img" src={image.previewUrl} alt={image.file.name} sx={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: '8px', bgcolor: '#f1f5f9' }} />
                                                    <IconButton
                                                        size="small"
                                                        aria-label={`Chỉnh sửa ảnh ${image.file.name}`}
                                                        title="Cắt hoặc xoay ảnh"
                                                        disabled={loading}
                                                        onClick={() => setEditingImageId(image.id)}
                                                        sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(255,255,255,.92)', boxShadow: '0 1px 4px rgba(0,0,0,.15)', '&:hover': { bgcolor: '#fff' } }}
                                                    >
                                                        <EditOutlinedIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Box>
                                                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 1 }}>
                                                    <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 700 }}>{image.file.name}</Typography>
                                                    {image.status === 'pending' && <Chip size="small" label="Chờ quét" />}
                                                    {image.status === 'scanning' && <Chip size="small" color="info" icon={<CircularProgress size={11} />} label="Đang quét" />}
                                                    {image.status === 'done' && <Chip size="small" color="success" label="Đã quét" />}
                                                    {image.status === 'error' && <Chip size="small" color="error" label="Lỗi" />}
                                                </Stack>
                                                {image.status === 'done' && candidates.some((ticket) => ticket.reviewRow?.sourceImageId === image.id) ? (
                                                    <Stack spacing={0.35} sx={{ mt: 0.75, p: 0.75, borderRadius: '7px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                                        {candidates.filter((ticket) => ticket.reviewRow?.sourceImageId === image.id).slice(0, 3).map((ticket) => (
                                                            <Typography key={ticket.key} variant="caption" noWrap sx={{ color: '#166534', fontWeight: 700 }}>
                                                                {ticket.stationName} · {ticket.numbers || 'Chưa có dãy số'} · {ticket.serialNumber || 'Chưa có sê-ri'}
                                                            </Typography>
                                                        ))}
                                                    </Stack>
                                                ) : image.status === 'pending' ? (
                                                    <Chip size="small" color="warning" variant="outlined" label="Chưa xác nhận · chưa quét" sx={{ mt: 0.75, fontWeight: 700 }} />
                                                ) : image.status === 'scanning' ? (
                                                    <Chip size="small" color="info" variant="outlined" label="Chưa xác nhận · đang quét" sx={{ mt: 0.75, fontWeight: 700 }} />
                                                ) : image.status === 'done' ? (
                                                    <Chip size="small" color="warning" variant="outlined" label="Đã quét · chưa có thông tin vé" sx={{ mt: 0.75, fontWeight: 700 }} />
                                                ) : null}
                                                <Stack direction="row" spacing={1.25} sx={{ mt: 0.5 }}>
                                                    <Button
                                                        size="small"
                                                        startIcon={<EditOutlinedIcon />}
                                                        disabled={loading}
                                                        onClick={() => setEditingImageId(image.id)}
                                                        sx={{ p: 0, minWidth: 0, textTransform: 'none', fontWeight: 700 }}
                                                    >
                                                        Chỉnh sửa ảnh
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        startIcon={<DeleteOutlineIcon />}
                                                        disabled={loading}
                                                        onClick={() => removeOcrImage(image.id)}
                                                        sx={{ p: 0, minWidth: 0, textTransform: 'none', fontWeight: 700 }}
                                                    >
                                                        Xóa ảnh
                                                    </Button>
                                                </Stack>
                                                {image.error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{image.error}</Typography>}
                                            </Paper>
                                        ))}
                                    </Box>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5} sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#eff6ff', border: '1px solid #93c5fd' }}>
                                        <Box>
                                            <Typography fontWeight={800} color="#1e40af">
                                                {loading ? 'Đang quét OCR… Bạn có thể đóng popup và quay lại sau.' : 'Ảnh sẽ không tự động quét'}
                                            </Typography>
                                            <Typography variant="caption" color="#3b82f6">Kết quả và tiến trình được giữ nguyên khi popup đóng.</Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DocumentScannerOutlinedIcon />}
                                            disabled={loading || preparingImages || !ocrImages.some((image) => image.status === 'pending' || image.status === 'error')}
                                            onClick={() => void scanPendingImages()}
                                            sx={{ textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap' }}
                                        >
                                            {loading ? 'Đang quét…' : `Tiến hành quét (${ocrImages.filter((image) => image.status === 'pending' || image.status === 'error').length} ảnh)`}
                                        </Button>
                                    </Stack>
                                </Stack>
                            )}
                        </Stack>
                    ) : (
                        <Stack spacing={2}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Chip
                                    size="small"
                                    color={fileStep === 'MAPPING' ? 'primary' : 'success'}
                                    label="1. Gán cột"
                                    sx={{ fontWeight: 800 }}
                                />
                                <Box sx={{ width: 32, height: 1, bgcolor: '#cbd5e1' }} />
                                <Chip
                                    size="small"
                                    color={fileStep === 'PREVIEW' ? 'primary' : 'default'}
                                    label="2. Xem trước"
                                    sx={{ fontWeight: 800 }}
                                />
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Button
                                    component="label"
                                    variant="outlined"
                                    disabled={loading}
                                    startIcon={<UploadFileOutlinedIcon />}
                                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                                >
                                    {loading ? 'Đang xử lý...' : fileName || 'Chọn tệp danh sách vé'}
                                    <input hidden type="file" accept=".xlsx,.xls,.csv,.tsv" onChange={(event) => {
                                        void handleFile(event.target.files?.[0]);
                                        event.target.value = '';
                                    }} />
                                </Button>
                                {file && (
                                    <Button
                                        color="error"
                                        variant="text"
                                        startIcon={<DeleteOutlineIcon />}
                                        disabled={loading}
                                        onClick={resetFileState}
                                        sx={{ textTransform: 'none', fontWeight: 700 }}
                                    >
                                        Xóa tệp
                                    </Button>
                                )}
                            </Stack>
                            {inspectResult && fileMapping && fileStep === 'MAPPING' && (
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: '#f8fafc' }}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography fontWeight={800}>Gán cột dữ liệu</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Hệ thống đã tự nhận diện cấu trúc tệp. Kiểm tra lại các cột trước khi xem trước vé.
                                            </Typography>
                                        </Box>
                                        <ImportBatchFileColumnTagger
                                            headers={inspectResult.detectedHeaders}
                                            sampleRows={inspectResult.sampleRows}
                                            mapping={fileMapping}
                                            onChange={(patch) => {
                                                setFileMapping((current) => current ? { ...current, ...patch } : current);
                                                setFilePreview(null);
                                                setCandidates([]);
                                                setSelected([]);
                                                setError('');
                                            }}
                                        />
                                        <Stack direction="row" justifyContent="flex-end">
                                            <Button
                                                variant="contained"
                                                disabled={loading || !fileMapping.stationColumn || !fileMapping.numbersColumn || !fileMapping.serialsColumn}
                                                onClick={() => void runFilePreview()}
                                                sx={{ textTransform: 'none', fontWeight: 800 }}
                                            >
                                                {loading ? 'Đang phân tích...' : 'Xem trước danh sách vé'}
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            )}
                            {filePreview && fileStep === 'PREVIEW' && (
                                <Stack spacing={1.5} sx={{ position: 'relative', isolation: 'isolate' }}>
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        justifyContent="space-between"
                                        alignItems={{ xs: 'stretch', sm: 'center' }}
                                        spacing={1}
                                        sx={{ position: 'relative', zIndex: 2, bgcolor: 'background.paper', pb: 0.5 }}
                                    >
                                        <Box>
                                            <Typography fontWeight={800}>Xem trước danh sách vé</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Kiểm tra vé hợp lệ, vé cần sửa và lý do bị loại trước khi đưa vào phân bổ.
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="outlined"
                                            startIcon={<ArrowBackOutlinedIcon />}
                                            onClick={() => {
                                                setFileStep('MAPPING');
                                                setError('');
                                            }}
                                            sx={{ textTransform: 'none', fontWeight: 800 }}
                                        >
                                            Quay lại gán cột
                                        </Button>
                                    </Stack>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.25 }}>
                                        {[
                                            ['Dãy vé hợp lệ', filePreview.importableRows, '#0f172a', '#ffffff', '#e2e8f0'],
                                            ['Sê-ri được chọn', selected.length, '#15803d', '#f0fdf4', '#bbf7d0'],
                                            ['Dòng trong tệp', filePreview.totalRows, '#1e40af', '#eff6ff', '#dbeafe'],
                                            ['Dòng lỗi', filePreview.errorRows + filePreview.skippedRows, '#b91c1c', '#fef2f2', '#fecaca'],
                                        ].map(([label, value, color, bgcolor, border]) => (
                                            <Paper key={String(label)} elevation={0} sx={{ p: 1.5, borderRadius: '12px', bgcolor: String(bgcolor), border: `1px solid ${String(border)}` }}>
                                                <Typography variant="caption" fontWeight={700} color={String(color)}>{label}</Typography>
                                                <Typography variant="h6" fontWeight={800} color={String(color)}>{String(value)}</Typography>
                                            </Paper>
                                        ))}
                                    </Box>
                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            value={fileSearchQuery}
                                            onChange={(event) => setFileSearchQuery(event.target.value)}
                                            placeholder="Tìm theo nhà đài, dãy số, sê-ri, ngày quay hoặc ký hiệu…"
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b', fontSize: 20 }} /></InputAdornment>,
                                                endAdornment: fileSearchQuery ? <InputAdornment position="end"><IconButton size="small" onClick={() => setFileSearchQuery('')}><CloseIcon sx={{ fontSize: 18 }} /></IconButton></InputAdornment> : undefined,
                                            }}
                                            sx={{ maxWidth: 720, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                                        />
                                        <Button variant={filtersOpen ? 'contained' : 'outlined'} startIcon={<FilterAltOutlinedIcon />} onClick={() => setFiltersOpen((value) => !value)} sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            Bộ lọc
                                        </Button>
                                        <Button
                                            variant={allValidFileSelected ? 'contained' : 'outlined'}
                                            color="success"
                                            startIcon={<CheckCircleOutlinedIcon />}
                                            disabled={validFileKeys.length === 0}
                                            onClick={() => setSelected((current) => allValidFileSelected
                                                ? current.filter((key) => !validFileKeys.includes(key))
                                                : Array.from(new Set([...current, ...validFileKeys])).slice(0, maxSelectable))}
                                            sx={{ textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap' }}
                                        >
                                            {allValidFileSelected ? `Đã chọn (${validFileKeys.length})` : `Chọn vé hợp lệ (${validFileKeys.length})`}
                                        </Button>
                                    </Stack>
                                    {ticketFilterPanel}
                                    {visibleFileIssueRows.length > 0 && (
                                        <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'auto', maxHeight: 320, position: 'relative', isolation: 'isolate' }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead sx={{ position: 'sticky', top: 0, zIndex: 3 }}>
                                                    <TableRow sx={{ '& th': { bgcolor: '#fff7ed !important', fontWeight: 800, color: '#9a3412', whiteSpace: 'nowrap', borderBottom: '1px solid #fed7aa' } }}>
                                                        <TableCell padding="checkbox"><Checkbox size="small" disabled /></TableCell>
                                                        <TableCell>Dòng</TableCell>
                                                        <TableCell>Nhà đài</TableCell>
                                                        <TableCell>Ngày quay</TableCell>
                                                        <TableCell>Dãy số / Sê-ri</TableCell>
                                                        <TableCell align="center">Chi tiết</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {visibleFileIssueRows.map(({ item, messages }) => (
                                                        <TableRow key={`${item.rowNumber}-${item.numbers}`} hover>
                                                            <TableCell padding="checkbox"><Checkbox size="small" disabled /></TableCell>
                                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>#{item.rowNumber}</TableCell>
                                                            <TableCell sx={{ fontWeight: 700 }}>{item.stationName || '—'}</TableCell>
                                                            <TableCell>{item.drawDate ? displayDate(item.drawDate) : '—'}</TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight={700}>{item.numbers || '—'}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{item.serials?.join(', ') || '—'}</Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Button
                                                                    size="small"
                                                                    color="error"
                                                                    variant="outlined"
                                                                    onClick={() => setFileIssueDetail({
                                                                        title: `Lỗi dữ liệu dòng #${item.rowNumber}`,
                                                                        messages: messages.length > 0 ? messages : [item.reason],
                                                                    })}
                                                                    sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '999px' }}
                                                                >
                                                                    {Math.max(1, messages.length)} lỗi
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Paper>
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    )}
                    {error && <Alert severity="warning" sx={{ borderRadius: '10px' }}>{error}</Alert>}
                    {candidates.length > 0 && (
                        source === 'OCR' ? (
                            <Stack spacing={1.5}>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={800}>Danh sách vé theo nhà đài</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Kiểm tra và sửa trực tiếp kết quả OCR trước khi đưa vé vào phân bổ.
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        variant={allValidOcrSelected ? 'contained' : 'outlined'}
                                        color="success"
                                        startIcon={<CheckCircleOutlinedIcon />}
                                        disabled={validOcrKeys.length === 0}
                                        onClick={() => setSelected((current) => {
                                            if (allValidOcrSelected) return current.filter((key) => !validOcrKeys.includes(key));
                                            return Array.from(new Set([...current, ...validOcrKeys])).slice(0, maxSelectable);
                                        })}
                                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '9px' }}
                                    >
                                        {allValidOcrSelected ? `Đã chọn (${validOcrKeys.length}) vé` : `Chọn vé hợp lệ (${validOcrKeys.length})`}
                                    </Button>
                                </Stack>
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        value={ocrSearchQuery}
                                        onChange={(event) => setOcrSearchQuery(event.target.value)}
                                        placeholder="Tìm theo dãy số, sê-ri, nhà đài, ngày quay, ký hiệu hoặc mệnh giá…"
                                        inputProps={{ 'aria-label': 'Tìm kiếm vé OCR' }}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b', fontSize: 20 }} /></InputAdornment>,
                                            endAdornment: ocrSearchQuery ? (
                                                <InputAdornment position="end">
                                                    <IconButton size="small" onClick={() => setOcrSearchQuery('')} aria-label="Xóa nội dung tìm kiếm"><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
                                                </InputAdornment>
                                            ) : undefined,
                                        }}
                                        sx={{ maxWidth: 720, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#fff' } }}
                                    />
                                    <Button variant={filtersOpen ? 'contained' : 'outlined'} startIcon={<FilterAltOutlinedIcon />} onClick={() => setFiltersOpen((value) => !value)} sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        Bộ lọc
                                    </Button>
                                </Stack>
                                {ticketFilterPanel}
                                {ocrStationGroups.length === 0 && (
                                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center', color: 'text.secondary' }}>
                                        Không tìm thấy vé phù hợp với “{ocrSearchQuery.trim()}”.
                                    </Paper>
                                )}
                                {ocrStationGroups.map((station) => (
                                    <Paper key={station.key} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            <Typography variant="subtitle1" fontWeight={800}>{station.stationName}</Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Chip size="small" label={`${station.tickets.length} dãy số`} variant="outlined" />
                                                <Chip size="small" label={`${station.tickets.reduce((sum, ticket) => sum + ticket.rows.length, 0)} sê-ri`} variant="outlined" />
                                            </Stack>
                                        </Stack>
                                        <Stack sx={{ p: 1.5 }} spacing={1}>
                                            {station.tickets.map((ticket) => (
                                                <Accordion key={`${station.key}:${ticket.key}`} defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
                                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} flexWrap="wrap">
                                                            <Typography variant="body2" fontWeight={800}>Dãy số: {ticket.numbers || 'Chưa xác định'}</Typography>
                                                            <Typography variant="caption" color="text.secondary">Ngày quay: {ticket.drawDate ? displayDate(ticket.drawDate) : 'Chưa xác định'}</Typography>
                                                            <Chip size="small" label={`${ticket.rows.length} sê-ri`} variant="outlined" />
                                                        </Stack>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ px: 1, pb: 1.5 }}>
                                                        <OcrReviewResultCards
                                                            rows={ticket.rows}
                                                            selection={ocrFieldSelection}
                                                            stations={stationAllocations.map((item) => ({ id: item.lotteryStationId, name: item.stationName }))}
                                                            stationsForRow={() => stationAllocations.map((item) => ({ id: item.lotteryStationId, name: item.stationName }))}
                                                            validationContextForRow={() => ({
                                                                allowedStationIds: new Set(stationAllocations.map((item) => item.lotteryStationId)),
                                                                batchDrawDate: drawDate ? String(drawDate).slice(0, 10) : null,
                                                            })}
                                                            batchDrawDate={drawDate ? String(drawDate).slice(0, 10) : null}
                                                            onSelect={setOcrFieldSelection}
                                                            onToggle={(key, checked) => {
                                                                const isSelected = selected.includes(key);
                                                                if (checked !== isSelected) toggle(key);
                                                            }}
                                                            onUpdate={updateOcrReviewRow}
                                                            embedded
                                                        />
                                                    </AccordionDetails>
                                                </Accordion>
                                            ))}
                                        </Stack>
                                    </Paper>
                                ))}
                            </Stack>
                        ) : (
                        <Stack spacing={1}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800}>Vé hợp lệ từ tệp</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Danh sách này chỉ chứa dữ liệu đọc từ tệp; không hiển thị kết quả quét OCR.
                                </Typography>
                            </Box>
                            {visibleFileCandidates.length === 0 && (
                                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    Không tìm thấy vé phù hợp với “{fileSearchQuery.trim()}”.
                                </Paper>
                            )}
                            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'auto', maxHeight: 520, display: visibleFileCandidates.length === 0 ? 'none' : undefined }}>
                            <Table size="small" stickyHeader sx={{ '--TableCell-stickyHeader-background': '#f8fafc' }}>
                                <TableHead
                                    sx={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 10,
                                        '& .MuiTableCell-head, & .MuiTableCell-stickyHeader': {
                                            backgroundColor: '#f8fafc !important',
                                            bgcolor: '#f8fafc !important',
                                            zIndex: 10,
                                            fontWeight: 800,
                                        },
                                    }}
                                >
                                    <TableRow>
                                        <TableCell padding="checkbox" />
                                        <TableCell sx={{ fontWeight: 800, minWidth: 70 }}>Dòng</TableCell>
                                        <TableCell sx={{ fontWeight: 800, minWidth: 145 }}>Nhà đài</TableCell>
                                        <TableCell sx={{ fontWeight: 800, minWidth: 110 }}>Ngày quay</TableCell>
                                        <TableCell sx={{ fontWeight: 800, minWidth: 155 }}>Dãy số / Sê-ri</TableCell>
                                        <TableCell sx={{ fontWeight: 800, minWidth: 110 }}>Ký hiệu</TableCell>
                                        <TableCell sx={{ fontWeight: 800, minWidth: 105 }}>Mệnh giá</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, minWidth: 105 }}>Trạng thái</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, minWidth: 110 }}>Chi tiết</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {candidateGroups.map(([groupKey, groupTickets]) => (
                                        <Fragment key={groupKey}>
                                            {source === 'FILE' && (
                                                <TableRow sx={{ '& td': { bgcolor: '#eff6ff', color: '#1e3a8a', fontWeight: 800, borderBottom: '1px solid #bfdbfe' } }}>
                                                    <TableCell colSpan={9}>
                                                        Ngày quay: {groupKey === 'undated' ? 'Chưa xác định' : displayDate(groupKey)}
                                                        <Typography component="span" variant="caption" sx={{ ml: 1, color: '#475569', fontWeight: 700 }}>
                                                            ({groupTickets.length} vé)
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {groupTickets.map((ticket) => {
                                                const checked = selected.includes(ticket.key);
                                                const allocationError = allocationErrorFor(ticket);
                                                const disabled = ticket.selectable === false || Boolean(allocationError) || (!checked && selected.length >= maxSelectable);
                                                return (
                                            <TableRow key={ticket.key} hover selected={checked} onClick={() => !disabled && toggle(ticket.key)} sx={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: ticket.selectable === false || allocationError ? 0.72 : 1 }}>
                                                <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                                                    <Checkbox
                                                        checked={checked}
                                                        disabled={disabled}
                                                        size="small"
                                                        onChange={() => toggle(ticket.key)}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>#{ticket.sourceRowNumber || '—'}</TableCell>
                                                <TableCell onClick={(event) => event.stopPropagation()}>
                                                    <Typography variant="body2" fontWeight={800}>{ticket.stationName}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{ticket.stationCode || '—'}</Typography>
                                                </TableCell>
                                                <TableCell>{ticket.drawDate ? displayDate(ticket.drawDate) : '—'}</TableCell>
                                                <TableCell onClick={(event) => event.stopPropagation()}>
                                                    <Typography variant="body2" fontWeight={800}>{ticket.numbers || '—'}</Typography>
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{ticket.serialNumber || '—'}</Typography>
                                                </TableCell>
                                                <TableCell onClick={(event) => event.stopPropagation()}>
                                                    <Typography variant="body2" fontWeight={700}>{ticket.batchCode || '—'}</Typography>
                                                </TableCell>
                                                <TableCell onClick={(event) => event.stopPropagation()}>
                                                    <Typography variant="body2" fontWeight={700}>{ticket.faceValue || '—'}</Typography>
                                                </TableCell>
                                                <TableCell align="center" onClick={(event) => event.stopPropagation()}>
                                                    <Chip
                                                        size="small"
                                                        label={(ticket.validationMessages?.length || allocationError) ? 'Cần kiểm tra' : 'Hợp lệ'}
                                                        color={(ticket.validationMessages?.length || allocationError) ? 'warning' : 'success'}
                                                        variant="outlined"
                                                        sx={{ fontWeight: 800 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center" onClick={(event) => event.stopPropagation()}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color={(ticket.validationMessages?.length || allocationError) ? 'error' : 'success'}
                                                        onClick={() => setDetailTicket(ticket)}
                                                        sx={{ minWidth: 76, textTransform: 'none', fontWeight: 800, borderRadius: '999px' }}
                                                    >
                                                        {(ticket.validationMessages?.length || allocationError)
                                                            ? `${(ticket.validationMessages?.length || 0) + (allocationError ? 1 : 0)} lỗi`
                                                            : 'Hợp lệ'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                                );
                                            })}
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                            </Box>
                        </Stack>
                        )
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
                    Đã chọn {selectedRows.length}/{maxSelectable} vé còn thiếu
                </Typography>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>Đóng</Button>
                <Button
                    variant="contained"
                    startIcon={<CheckCircleOutlinedIcon />}
                    disabled={selectedRows.length === 0 || loading}
                    onClick={() => {
                        const errors: string[] = [];
                        const selectedByStation = new Map<number, number>();
                        selectedRows.forEach((ticket) => {
                            const allocation = allocationByStation.get(ticket.lotteryStationId);
                            if (!allocation) {
                                errors.push(`${ticket.stationName || 'Vé'}: nhà đài không có trong danh sách phân bổ.`);
                                return;
                            }
                            selectedByStation.set(ticket.lotteryStationId, (selectedByStation.get(ticket.lotteryStationId) || 0) + 1);
                            if (!isValidTicketNumbers(ticket.numbers)) {
                                errors.push(`${allocation.stationName}: dãy số phải có đúng 6 chữ số.`);
                            }
                            if (!isValidTicketSerial(ticket.serialNumber)) {
                                errors.push(`${allocation.stationName}: sê-ri phải có đúng một chữ cái ở đầu hoặc cuối; các ký tự còn lại là số.`);
                            }
                        });
                        selectedByStation.forEach((quantity, stationId) => {
                            const allocation = allocationByStation.get(stationId);
                            if (!allocation) return;
                            const available = Math.max(0, allocation.allocatedQuantity - allocation.currentQuantity);
                            if (quantity > available) errors.push(`${allocation.stationName}: chọn ${quantity} vé nhưng chỉ còn được bổ sung ${available} vé.`);
                        });
                        if (selectedRows.length > maxSelectable) errors.push(`Chỉ còn được bổ sung tối đa ${maxSelectable} vé.`);
                        if (errors.length > 0) {
                            setError(Array.from(new Set(errors)).join(' '));
                            return;
                        }
                        onConfirm(selectedRows);
                        if (source === 'OCR') resetOcrState();
                        else resetFileState();
                        onClose();
                    }}
                    sx={{ textTransform: 'none', fontWeight: 800 }}
                >
                    Đưa {selectedRows.length} vé vào phân bổ
                </Button>
            </DialogActions>
        </Dialog>
        <OcrImageEditDialog
            imageFile={ocrImages.find((image) => image.id === editingImageId)?.file || null}
            onClose={() => setEditingImageId(null)}
            onSave={(file) => {
                if (!editingImageId) return;
                replaceOcrImage(editingImageId, file);
                setEditingImageId(null);
            }}
        />
        <Dialog open={Boolean(detailTicket)} onClose={() => setDetailTicket(null)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pr: 7, fontWeight: 800 }}>
                Chi tiết kiểm tra vé
                <IconButton aria-label="Đóng" onClick={() => setDetailTicket(null)} sx={{ position: 'absolute', right: 12, top: 12 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {detailTicket && (
                    <Stack spacing={2}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#f8fafc' }}>
                            <Typography fontWeight={800}>{detailTicket.stationName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Dãy số: {detailTicket.numbers || '—'} · Sê-ri: {detailTicket.serialNumber || '—'} · Ngày quay: {detailTicket.drawDate || '—'}
                            </Typography>
                        </Paper>
                        {(detailTicket.validationMessages?.length || allocationErrorFor(detailTicket)) ? (
                            <Alert severity="error" sx={{ borderRadius: '10px' }}>
                                <Stack spacing={0.75}>
                                    {(detailTicket.validationMessages || []).map((message) => (
                                        <Typography key={message} variant="body2">• {message}</Typography>
                                    ))}
                                    {allocationErrorFor(detailTicket) && (
                                        <Typography variant="body2">• {allocationErrorFor(detailTicket)}</Typography>
                                    )}
                                </Stack>
                            </Alert>
                        ) : (
                            <Alert severity="success" sx={{ borderRadius: '10px' }}>Vé hợp lệ và phù hợp với danh sách phân bổ.</Alert>
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions><Button onClick={() => setDetailTicket(null)}>Đóng</Button></DialogActions>
        </Dialog>
        <Dialog open={Boolean(fileIssueDetail)} onClose={() => setFileIssueDetail(null)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pr: 7, fontWeight: 800 }}>
                {fileIssueDetail?.title || 'Chi tiết lỗi dữ liệu'}
                <IconButton aria-label="Đóng" onClick={() => setFileIssueDetail(null)} sx={{ position: 'absolute', right: 12, top: 12 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Alert severity="error" sx={{ borderRadius: '10px' }}>
                    <Stack spacing={0.75}>
                        {(fileIssueDetail?.messages || []).map((message) => (
                            <Typography key={message} variant="body2">• {message}</Typography>
                        ))}
                    </Stack>
                </Alert>
            </DialogContent>
            <DialogActions><Button onClick={() => setFileIssueDetail(null)}>Đóng</Button></DialogActions>
        </Dialog>
        </>
    );
};
