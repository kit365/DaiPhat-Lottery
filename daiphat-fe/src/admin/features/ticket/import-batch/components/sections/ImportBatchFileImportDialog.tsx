"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    IconButton,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useActiveSuppliers } from '../../../../supplier';
import {
    cancelImportBatchDraft,
    commitImportBatchFile,
    inspectImportBatchFile,
    previewImportBatchFile,
    saveImportBatchFileMappingProfile,
    saveLotteryStationAlias,
} from '../../services/importBatchService';
import type {
    ImportBatchFileGroup,
    ImportBatchFileInspectResult,
    ImportBatchFileMapping,
    ImportBatchFilePreviewResult,
    ImportBatchFileRow,
    ImportBatchFileIssue,
    ImportBatchFilePricingMismatch,
    ImportBatchFileScheduleMismatch,
} from '../../types/importBatch.type';
import { mappingImportsTickets } from '../../types/importBatch.type';
import {
    checkFileImportGroupQuantity,
    mergeImportQuantityChecks,
    type ImportQuantityCheck,
} from '../../../ocr-import/utils/ocrImportQuantity';
import { ImportBatchFileColumnTagger } from './ImportBatchFileColumnTagger';
import { ImportBatchFileConfigDialog } from './ImportBatchFileConfigDialog';
import { ImportBatchFilePricingDialog } from './ImportBatchFilePricingDialog';
import { ImportBatchFileSupplierIdentityPanel } from './ImportBatchFileSupplierIdentityPanel';
import { ImportBatchFileScheduleDialog } from './ImportBatchFileScheduleDialog';
import { ImportBatchFileSupplierDialog } from './ImportBatchFileSupplierDialog';
import { ImportBatchFileMappingProfilePanel } from './ImportBatchFileMappingProfilePanel';
import { ImportBatchFileAllocationSummary, buildFileAllocationRows } from './ImportBatchFileAllocationSummary';
import { ImportBatchQuickAllocationModal } from './ImportBatchQuickAllocationModal';
import { ImportBatchReceptionLineSummary } from './ImportBatchReceptionLineSummary';
import {
    downloadImportBatchProgressCsv,
    type ImportBatchProgressStationPricing,
} from '../../utils/importBatchProgressExport';
import { formatImportCost } from '../../utils/importCostCalculator';
import {
    collectAnomalies,
    collectPreviewRowNotes,
    fileImportRequestErrorMessage,
    formatPreviewIssueNote,
    groupPreviewTicketRows,
    hasDrawDateIssue,
    isDrawDateOutsideWindow,
    isGroupSelectable,
    listPreviewSerials,
    previewTicketDisplayStatus,
    type PreviewDisplayStatus,
    readPreviewFileValues,
    type ImportBatchFileAnomaly,
    type PreviewTicketLine,
} from '../../utils/importBatchFileImport';
import {
    IMPORT_BATCH_FILE_ACCEPT,
    downloadImportBatchFileTemplate,
    type ImportBatchTemplateDay,
    type ImportBatchTemplateIssuer,
} from '../../utils/importBatchFileTemplate';
import { usePublicSystemConfigValues } from '@/client/hooks/usePublicSystemConfigValues';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStationsByDrawDate } from '../../../../station/hooks/useStation';
import {
    useImportBatchTimePolicy,
    useDraftImportBatches,
} from '../../hooks/useImportBatch';
import { evaluateImportBatchIntake } from '../../hooks/useImportBatchIntakeGate';
import {
    DEFAULT_RETURN_BUFFER_MINUTES,
    buildImportIntakeClosedMessage,
} from '../../utils/importBatchDrawDate';
import { formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import {
    canDeleteImportBatch,
    canShowImportBatchDelete,
    getImportBatchDeleteDisabledReason,
} from '../../utils/importBatchDeletion';
import {
    collectOcrBatchOptions,
    filterEligibleOcrBatches,
    countOcrBatchesBlockedByIntake,
    type OcrBatchOption,
} from '../../../ocr-import/utils/ocrImportHelpers';
import { useImportBatchIntakeGate } from '../../hooks/useImportBatchIntakeGate';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import type { Station } from '../../../../station/types/station.type';
import { ROUTES } from '@/admin/constants/routes';
import { useRouter } from 'next/navigation';

type ImportBatchFileImportDialogProps = {
    open: boolean;
    onClose: () => void;
    onImported?: () => void;
    prefillSupplierId?: number | null;
    prefillBatchId?: number | null;
};

const STEPS = ['Chọn tệp & Nhà cung cấp', 'Gán cột dữ liệu', 'Xem trước & Nạp vé'];

const STEP_SUBTITLES = [
    'Chọn tệp danh sách vé, nhà cung cấp và thiết lập phiếu nhập lô tiếp nhận',
    'Khớp các cột dữ liệu từ tệp vào hệ thống và tùy chỉnh cấu hình phụ trợ',
    'Kiểm tra dữ liệu chi tiết, phân loại kỳ vé và hoàn tất nạp vé',
];

/**
 * The receiving party, printed on every document this screen produces. Read from
 * the public config endpoint rather than the settings API: warehouse staff run
 * this screen without settings permissions.
 */
const ISSUER_CONFIG_KEYS = [
    'SITE_LEGAL_NAME',
    'SITE_TAX_CODE',
    'SITE_ADDRESS',
    'SITE_PHONE',
    'SITE_EMAIL',
] as const;

const ISSUER_CONFIG_DEFAULTS: Record<(typeof ISSUER_CONFIG_KEYS)[number], string> = {
    SITE_LEGAL_NAME: 'ĐẠI PHÁT',
    SITE_TAX_CODE: '',
    SITE_ADDRESS: '',
    SITE_PHONE: '',
    SITE_EMAIL: '',
};

/** Shared by the template download buttons so they read as one set of options. */
const TEMPLATE_BUTTON_SX = {
    borderRadius: '10px',
    textTransform: 'none',
    fontWeight: 700,
    fontSize: '0.8125rem',
    borderColor: '#cbd5e1',
    color: '#334155',
    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
} as const;

const formatDate = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY') : '—');

type PreviewNotice = {
    id: string;
    severity: 'success' | 'info' | 'warning' | 'error';
    title: string;
    detail?: string;
    actionLabel?: string;
    onAction?: () => void;
};

const NOTICE_TONE: Record<PreviewNotice['severity'], { border: string; bg: string; color: string; chip: 'success' | 'info' | 'warning' | 'error' | 'default' }> = {
    error: { border: '#fecaca', bg: '#fef2f2', color: '#b91c1c', chip: 'error' },
    warning: { border: '#fed7aa', bg: '#fff7ed', color: '#c2410c', chip: 'warning' },
    info: { border: '#bae6fd', bg: '#f0f9ff', color: '#0369a1', chip: 'info' },
    success: { border: '#bbf7d0', bg: '#f0fdf4', color: '#15803d', chip: 'success' },
};

const PreviewNoticeBoard = ({
    notices,
    successLabel,
}: {
    notices: PreviewNotice[];
    successLabel?: string;
}) => {
    if (notices.length === 0) {
        if (!successLabel) {
            return null;
        }
        return (
            <Chip
                size="small"
                icon={<CheckCircleIcon />}
                label={successLabel}
                color="success"
                variant="outlined"
                sx={{ alignSelf: 'flex-start', height: 28, fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
            />
        );
    }

    const errorCount = notices.filter((item) => item.severity === 'error').length;
    const warningCount = notices.filter((item) => item.severity === 'warning').length;
    const worst = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : notices[0]?.severity ?? 'success';
    const tone = NOTICE_TONE[worst];

    return (
        <Paper
            elevation={0}
            sx={{
                border: `1px solid ${tone.border}`,
                borderRadius: '14px',
                bgcolor: '#fff',
                overflow: 'hidden',
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={1}
                sx={{ px: 1.75, py: 1.1, bgcolor: tone.bg, borderBottom: notices.length > 0 ? `1px solid ${tone.border}` : 'none' }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    {worst === 'error' ? (
                        <WarningAmberIcon sx={{ color: tone.color, fontSize: 20 }} />
                    ) : worst === 'success' || notices.length === 0 ? (
                        <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                    ) : (
                        <InfoOutlinedIcon sx={{ color: tone.color, fontSize: 20 }} />
                    )}
                    <Typography variant="subtitle2" fontWeight={800} color={tone.color}>
                        {notices.length === 0 ? 'Sẵn sàng xem trước' : `Cần xử lý (${notices.length})`}
                    </Typography>
                    {errorCount > 0 && <Chip size="small" color="error" label={`${errorCount} lỗi`} sx={{ height: 20, fontWeight: 700, fontSize: '0.7rem' }} />}
                    {warningCount > 0 && <Chip size="small" color="warning" label={`${warningCount} cảnh báo`} sx={{ height: 20, fontWeight: 700, fontSize: '0.7rem' }} />}
                </Stack>
                {successLabel && (
                    <Chip
                        size="small"
                        icon={<CheckCircleIcon />}
                        label={successLabel}
                        color="success"
                        variant="outlined"
                        sx={{ height: 24, fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
                    />
                )}
            </Stack>

            {notices.length > 0 && (
                <Stack divider={<Divider />}>
                    {notices.map((notice) => {
                        const itemTone = NOTICE_TONE[notice.severity];
                        return (
                            <Stack
                                key={notice.id}
                                direction={{ xs: 'column', sm: 'row' }}
                                alignItems={{ sm: 'center' }}
                                justifyContent="space-between"
                                gap={1}
                                sx={{ px: 1.75, py: 1.1 }}
                            >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                        <Chip
                                            size="small"
                                            color={itemTone.chip}
                                            label={notice.severity === 'error' ? 'Lỗi' : notice.severity === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                                            sx={{ height: 20, fontWeight: 800, fontSize: '0.65rem', mt: 0.15 }}
                                        />
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.3 }}>
                                                {notice.title}
                                            </Typography>
                                            {notice.detail && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                                                    {notice.detail}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>
                                </Box>
                                {notice.actionLabel && notice.onAction && (
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color={notice.severity === 'error' ? 'error' : 'warning'}
                                        onClick={notice.onAction}
                                        sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0, borderRadius: '8px' }}
                                    >
                                        {notice.actionLabel}
                                    </Button>
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            )}
        </Paper>
    );
};

const GROUP_ISSUE_TITLE: Record<string, string> = {
    DRAW_DATE_OUT_OF_WINDOW: 'Ngoài phạm vi nhập hôm nay',
    DRAFT_ALREADY_EXISTS: 'Đã có phiếu nhập cho ngày này',
    SUPPLIER_IMPORT_NOT_ALLOWED: 'Chưa đến giờ nhập vé',
    SUPPLIER_RETURN_CUT_OFF_PASSED: 'Đã quá giờ nhận vé',
    NO_VALID_ROW: 'Không có dòng hợp lệ để nạp vào phiếu',
    STATION_PRICING_MISMATCH: 'Giá lệch so với hệ thống',
    STATION_SCHEDULE_MISMATCH: 'Lịch quay không khớp',
    PARTIAL_IMPORT_DISABLED: 'Không cho phép nhập một phần',
    SUPPLIER_IDENTITY_MISMATCH: 'Tệp không khớp nhà cung cấp đã chọn',
    SUPPLIER_IDENTITY_NOT_DECLARED: 'Tệp không ghi thông tin nhà cung cấp',
};

const FILE_LEVEL_GROUP_ISSUE_CODES = new Set([
    'SUPPLIER_IDENTITY_MISMATCH',
    'SUPPLIER_IDENTITY_NOT_DECLARED',
]);

const GroupIssuesList = ({
    issues,
    onOpenPricing,
    onOpenSchedule,
}: {
    issues: ImportBatchFileIssue[];
    onOpenPricing?: () => void;
    onOpenSchedule?: () => void;
}) => {
    const visible = issues.filter(
        (issue) => !FILE_LEVEL_GROUP_ISSUE_CODES.has(issue.code) && issue.code !== 'DRAFT_ALREADY_EXISTS'
    );
    if (visible.length === 0) {
        return null;
    }

    const worst = visible.some((issue) => issue.severity === 'ERROR')
        ? 'error'
        : visible.some((issue) => issue.severity === 'WARNING')
          ? 'warning'
          : 'info';
    const tone = NOTICE_TONE[worst];

    return (
        <Paper
            elevation={0}
            sx={{
                mt: 1.5,
                border: `1px solid ${tone.border}`,
                borderRadius: '12px',
                overflow: 'hidden',
                bgcolor: '#fff',
            }}
        >
            <Stack divider={<Divider />}>
                {visible.map((issue, index) => {
                    const itemTone = NOTICE_TONE[
                        issue.severity === 'ERROR' ? 'error' : issue.severity === 'WARNING' ? 'warning' : 'info'
                    ];
                    const action =
                        issue.code === 'STATION_PRICING_MISMATCH'
                            ? { label: 'Đối chiếu giá', onClick: onOpenPricing }
                            : issue.code === 'STATION_SCHEDULE_MISMATCH'
                              ? { label: 'Sửa lịch quay', onClick: onOpenSchedule }
                              : undefined;
                    return (
                        <Stack
                            key={`${issue.code}-${index}`}
                            direction="row"
                            alignItems="flex-start"
                            justifyContent="space-between"
                            gap={1}
                            sx={{ px: 1.5, py: 1, bgcolor: index === 0 ? itemTone.bg : '#fff' }}
                        >
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={800} color={itemTone.color} sx={{ lineHeight: 1.3 }}>
                                    {GROUP_ISSUE_TITLE[issue.code] ?? issue.message}
                                </Typography>
                                {GROUP_ISSUE_TITLE[issue.code] && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        {issue.message}
                                    </Typography>
                                )}
                            </Box>
                            {action?.onClick && (
                                <Button
                                    size="small"
                                    variant="text"
                                    color={issue.severity === 'ERROR' ? 'error' : 'warning'}
                                    onClick={action.onClick}
                                    sx={{ textTransform: 'none', fontWeight: 800, flexShrink: 0, minWidth: 0, px: 0.5 }}
                                >
                                    {action.label}
                                </Button>
                            )}
                        </Stack>
                    );
                })}
            </Stack>
        </Paper>
    );
};

const ROW_STATUS_CHIP: Record<
    PreviewDisplayStatus,
    { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
    OK: { label: 'Hợp lệ', color: 'success' },
    WARNING: { label: 'Cần xem lại', color: 'warning' },
    ERROR: { label: 'Lỗi', color: 'error' },
    SKIPPED: { label: 'Bỏ qua', color: 'default' },
    // The row itself is sound; the whole draw date is barred. "Lỗi" would send
    // the operator looking for a mistake in a row that has none.
    BLOCKED: { label: 'Không hợp lệ', color: 'error' },
};

export const ImportBatchFileImportDialog = ({
    open,
    onClose,
    onImported,
    prefillSupplierId = null,
    prefillBatchId = null,
}: ImportBatchFileImportDialogProps) => {
    const router = useRouter();
    const { data: activeSuppliers = [] } = useActiveSuppliers();
    const { evaluate: evaluateIntake } = useImportBatchIntakeGate();
    // The draw schedule, not the import-eligibility list. A delivery note must
    // name every station that drew that day; eligibility is a different question
    // and answers it too narrowly here - it rejects past dates outright and drops
    // stations already sitting in a draft batch, both of which really did deliver
    // tickets. Yesterday needs its own call because the southern schedule differs
    // by weekday.
    const { data: todayStations } = useStationsByDrawDate(dayjs().format('YYYY-MM-DD'));
    const { data: yesterdayStations } = useStationsByDrawDate(
        dayjs().subtract(1, 'day').format('YYYY-MM-DD')
    );
    const { data: tomorrowStations } = useStationsByDrawDate(
        dayjs().add(1, 'day').format('YYYY-MM-DD')
    );
    const { data: intakeTimePolicy } = useImportBatchTimePolicy();

    const [step, setStep] = useState(0);
    const [busy, setBusy] = useState(false);
    const [supplierId, setSupplierId] = useState<number>(prefillSupplierId ?? 0);
    const [file, setFile] = useState<File | null>(null);
    const [inspectResult, setInspectResult] = useState<ImportBatchFileInspectResult | null>(null);
    const [mapping, setMapping] = useState<ImportBatchFileMapping | null>(null);
    const [preview, setPreview] = useState<ImportBatchFilePreviewResult | null>(null);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [rememberMapping, setRememberMapping] = useState(true);
    const [configOpen, setConfigOpen] = useState(false);
    const [auxConfigOpen, setAuxConfigOpen] = useState(false);
    const [pricingOpen, setPricingOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [supplierEditOpen, setSupplierEditOpen] = useState(false);
    const [profileRefreshToken, setProfileRefreshToken] = useState(0);
    const [selectedImportBatchId, setSelectedImportBatchId] = useState<number | null>(prefillBatchId ?? null);
    const [batchToDiscard, setBatchToDiscard] = useState<OcrBatchOption | null>(null);
    const [discardingBatchId, setDiscardingBatchId] = useState<number | null>(null);
    const [shortfallCheck, setShortfallCheck] = useState<ImportQuantityCheck | null>(null);
    const [allocationOpen, setAllocationOpen] = useState(false);

    const { data: draftBatches = [], refetch: refetchDraftBatches, isLoading: loadingBatches } =
        useDraftImportBatches(open);

    /**
     * The same station can be flagged on several draw dates; the correction is
     * per station, so collapse to one entry each before offering the fix.
     */
    const pricingMismatches = useMemo(() => {
        const byStation = new Map<number, ImportBatchFilePricingMismatch>();
        (preview?.groups ?? []).forEach((group) => {
            (group.pricingMismatches ?? []).forEach((item) => {
                if (!byStation.has(item.lotteryStationId)) {
                    byStation.set(item.lotteryStationId, item);
                }
            });
        });
        return [...byStation.values()];
    }, [preview]);

    /**
     * How the file's draw dates line up with the only date import accepts.
     *
     * <p>A supplier file legitimately covers a whole week, so a date other than
     * today is normally a benign skip. But that same shape appears when the date
     * column is simply wrong, and then the operator sees a preview reporting zero
     * errors while importing nothing. Telling the two apart is the point: nothing
     * importable at all is a problem with this upload, not a fact about the file.
     */
    const drawDateProblem = useMemo(() => {
        const groups = preview?.groups ?? [];
        if (groups.length === 0) {
            return null;
        }
        const outOfWindow = groups.filter((group) => group.status === 'OUT_OF_WINDOW');
        const unreadable = groups.filter((group) => !group.drawDate);
        if (outOfWindow.length === 0 && unreadable.length === 0) {
            return null;
        }

        const countRows = (list: ImportBatchFileGroup[]) =>
            list.reduce((sum, group) => sum + (group.rows?.length ?? 0), 0);

        return {
            // Nothing to import means this upload cannot go anywhere, whatever the
            // reason; that deserves an error rather than a quiet skip count.
            blocking: !groups.some(isGroupSelectable),
            outOfWindowRows: countRows(outOfWindow),
            unreadableRows: countRows(unreadable),
            dates: outOfWindow
                .map((group) => formatDate(group.drawDate))
                .filter(Boolean)
                .join(', '),
        };
    }, [preview]);

    /**
     * A station can be off-schedule on several draw dates at once; the required
     * weekdays are merged so one correction covers every date in the file.
     */
    const scheduleMismatches = useMemo(() => {
        const byStation = new Map<number, ImportBatchFileScheduleMismatch>();
        (preview?.groups ?? []).forEach((group) => {
            (group.scheduleMismatches ?? []).forEach((item) => {
                const existing = byStation.get(item.lotteryStationId);
                if (!existing) {
                    byStation.set(item.lotteryStationId, item);
                    return;
                }
                const required = [
                    ...new Set([...existing.requiredDrawDays, ...item.requiredDrawDays]),
                ];
                byStation.set(item.lotteryStationId, {
                    ...existing,
                    drawDate: `${existing.drawDate}, ${item.drawDate}`,
                    requiredDrawDays: required,
                    suggestedDrawDays: [
                        ...new Set([...existing.currentDrawDays, ...required]),
                    ],
                });
            });
        });
        return [...byStation.values()];
    }, [preview]);

    const selectedSupplier = useMemo(
        () => activeSuppliers.find((supplier) => supplier.id === supplierId),
        [activeSuppliers, supplierId]
    );
    const todayDrawDate = dayjs().format('YYYY-MM-DD');
    const todayIntake = useMemo(
        () => evaluateIntake(selectedSupplier, todayDrawDate),
        [evaluateIntake, selectedSupplier, todayDrawDate]
    );
    const isDrawDateIntakeBlocked = useCallback(
        (drawDate?: string | null) =>
            Boolean(drawDate && selectedSupplier && evaluateIntake(selectedSupplier, drawDate).blocked),
        [evaluateIntake, selectedSupplier]
    );

    const selectedDraftBatch = useMemo(
        () => draftBatches.find((b) => b.id === selectedImportBatchId) ?? null,
        [draftBatches, selectedImportBatchId]
    );

    const selectedBatchDrawDate = useMemo(() => {
        if (!selectedDraftBatch?.drawDate) {
            return null;
        }
        return dayjs(selectedDraftBatch.drawDate).format('YYYY-MM-DD');
    }, [selectedDraftBatch]);

    const selectedGroup = useMemo(
        () => preview?.groups.find((group) => group.drawDate === selectedBatchDrawDate),
        [preview, selectedBatchDrawDate]
    );
    const validFileStations = selectedGroup?.status === 'IMPORTABLE' ? selectedGroup.stations : [];
    const validTicketCount = validFileStations.reduce((sum, station) => sum + station.ticketCount, 0);
    const validSerialCount = validFileStations.reduce((sum, station) => sum + station.serialCount, 0);
    const stationNames = useMemo(() => {
        const names: Record<number, string> = {};
        [...(yesterdayStations ?? []), ...(todayStations ?? []), ...(tomorrowStations ?? [])].forEach((station) => {
            names[Number(station.id)] = station.name;
        });
        return names;
    }, [yesterdayStations, todayStations, tomorrowStations]);
    const allocationRows = useMemo(
        () => buildFileAllocationRows(selectedDraftBatch, selectedGroup, stationNames),
        [selectedDraftBatch, selectedGroup, stationNames]
    );
    const hasAllocationIssue = allocationRows.some((row) => row.issue !== null);

    const selectedBatchIntake = useMemo(() => {
        if (!selectedSupplier || !selectedBatchDrawDate) {
            return null;
        }
        return evaluateIntake(selectedSupplier, selectedBatchDrawDate);
    }, [evaluateIntake, selectedSupplier, selectedBatchDrawDate]);

    const activeIntakeAlert = useMemo(() => {
        if (!selectedSupplier || supplierId <= 0) {
            return null;
        }
        if (selectedDraftBatch) {
            if (selectedBatchIntake && (selectedBatchIntake.blocked || selectedBatchIntake.notYetAllowed)) {
                return selectedBatchIntake;
            }
            return null;
        }
        if (todayIntake.blocked || todayIntake.notYetAllowed) {
            return todayIntake;
        }
        return null;
    }, [selectedSupplier, supplierId, selectedDraftBatch, selectedBatchIntake, todayIntake]);

    const returnBufferMinutes =
        intakeTimePolicy?.returnBufferMinutes ?? DEFAULT_RETURN_BUFFER_MINUTES;

    const allBatchOptions = useMemo(
        () => collectOcrBatchOptions(draftBatches),
        [draftBatches]
    );

    const eligibleBatchOptions = useMemo(
        () =>
            filterEligibleOcrBatches(allBatchOptions, {
                supplierId: supplierId || null,
                returnCutOffTime: selectedSupplier?.returnCutOffTime,
                returnBufferMinutes,
            }),
        [
            allBatchOptions,
            supplierId,
            selectedSupplier?.returnCutOffTime,
            returnBufferMinutes,
        ]
    );

    const blockedByIntakeCount = useMemo(
        () =>
            countOcrBatchesBlockedByIntake(allBatchOptions, {
                supplierId: supplierId || null,
                returnCutOffTime: selectedSupplier?.returnCutOffTime,
                returnBufferMinutes,
            }),
        [
            allBatchOptions,
            supplierId,
            selectedSupplier?.returnCutOffTime,
            returnBufferMinutes,
        ]
    );

    const intakeClosedHint = useMemo(() => {
        if (blockedByIntakeCount <= 0 || !selectedSupplier) {
            return null;
        }
        return buildImportIntakeClosedMessage({
            supplierName: selectedSupplier.name,
            returnCutOffTime: selectedSupplier.returnCutOffTime,
            returnBufferMinutes,
            drawDate: todayDrawDate,
        });
    }, [blockedByIntakeCount, selectedSupplier, returnBufferMinutes, todayDrawDate]);

    const handleSelectDraftBatch = useCallback((batchId: number | null) => {
        setSelectedImportBatchId(batchId);
        setPreview(null);
        setSelectedDates([]);
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }
        if (prefillSupplierId != null && prefillSupplierId > 0) {
            setSupplierId(prefillSupplierId);
        }
        if (prefillBatchId != null && prefillBatchId > 0) {
            handleSelectDraftBatch(prefillBatchId);
        }
    }, [open, prefillSupplierId, prefillBatchId, handleSelectDraftBatch]);

    useEffect(() => {
        if (loadingBatches || !supplierId) {
            return;
        }
        if (selectedImportBatchId == null) {
            if (eligibleBatchOptions.length === 1) {
                handleSelectDraftBatch(eligibleBatchOptions[0].id);
            }
            return;
        }
        if (!eligibleBatchOptions.some((b) => b.id === selectedImportBatchId)) {
            handleSelectDraftBatch(null);
        }
    }, [eligibleBatchOptions, selectedImportBatchId, supplierId, loadingBatches, handleSelectDraftBatch]);

    const handleNavigateToCreateBatch = () => {
        const createUrl = supplierId
            ? `${ROUTES.ADMIN.IMPORT_BATCH.CREATE}?supplierId=${supplierId}&returnTo=file-import`
            : `${ROUTES.ADMIN.IMPORT_BATCH.CREATE}?returnTo=file-import`;
        router.push(createUrl);
        onClose();
    };

    const handleEditBatchNavigate = (batchId: number) => {
        router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batchId));
        onClose();
    };

    const handleDiscardDraftBatch = async (batchId: number) => {
        setDiscardingBatchId(batchId);
        try {
            await cancelImportBatchDraft(batchId);
            toast.success('Đã xóa phiếu nhập lô.');
            if (selectedImportBatchId === batchId) {
                handleSelectDraftBatch(null);
            }
            await refetchDraftBatches();
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Không xóa được phiếu nhập lô.';
            toast.error(message);
        } finally {
            setDiscardingBatchId(null);
        }
    };

    const issuerConfig = usePublicSystemConfigValues(ISSUER_CONFIG_KEYS, ISSUER_CONFIG_DEFAULTS);
    /**
     * Who is running this reconciliation. Falls back through the names a session
     * can carry, so the line is only left blank when nothing identifies the user.
     */
    const currentUser = useAuthStore((state) => state.user);
    const operatorName = useMemo(() => {
        if (!currentUser) {
            return undefined;
        }
        const composed = [currentUser.firstName, currentUser.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
        return (
            currentUser.fullName?.trim() ||
            composed ||
            currentUser.username?.trim() ||
            currentUser.email?.trim() ||
            undefined
        );
    }, [currentUser]);

    const templateIssuer: ImportBatchTemplateIssuer = useMemo(
        () => ({
            legalName: issuerConfig.SITE_LEGAL_NAME,
            taxCode: issuerConfig.SITE_TAX_CODE,
            address: issuerConfig.SITE_ADDRESS,
            phone: issuerConfig.SITE_PHONE,
            email: issuerConfig.SITE_EMAIL,
        }),
        [issuerConfig]
    );

    /** The letterhead is checked back on upload, so the template is issued by name. */
    const templateSupplier = useMemo(
        () =>
            selectedSupplier && {
                name: selectedSupplier.name,
                code: selectedSupplier.code,
                taxCode: selectedSupplier.taxCode,
                contactName: selectedSupplier.contactName,
                contactPhone: selectedSupplier.contactPhone,
                contactEmail: selectedSupplier.contactEmail,
                address: selectedSupplier.address,
            },
        [selectedSupplier]
    );

    /**
     * Which draw date the template should be prepared for.
     *
     * <p>Once this supplier's intake has closed for today — at
     * returnCutOffTime − returnBufferTime, when staff start checking tickets for
     * return — no more tickets can be taken for today. The operator is by then
     * preparing tomorrow's delivery, so the template follows them: tomorrow's
     * date, and with it tomorrow's stations, which are a different set on a
     * different weekday.
     */
    const templateIntake = useMemo(
        () =>
            evaluateImportBatchIntake(
                selectedSupplier,
                dayjs().format('YYYY-MM-DD'),
                intakeTimePolicy?.returnBufferMinutes ?? DEFAULT_RETURN_BUFFER_MINUTES
            ),
        [selectedSupplier, intakeTimePolicy?.returnBufferMinutes]
    );
    const templateTargetsTomorrow = templateIntake.blocked;

    const toTemplateStations = (stations?: Station[]) =>
        (stations ?? []).map((station) => ({
            name: station.name,
            code: station.code,
            price: station.price,
            commissionRate: station.commissionRate,
            drawSchedule: station.drawSchedule,
        }));

    /**
     * Station facts the preview response does not repeat per row. Read from the
     * draw schedule so the reconciliation report names the same prices and
     * schedule the delivery note does.
     */
    const stationPricing = useMemo(() => {
        const byId: Record<number, ImportBatchProgressStationPricing> = {};
        [
            ...(todayStations ?? []),
            ...(yesterdayStations ?? []),
            ...(tomorrowStations ?? []),
        ].forEach((station) => {
            byId[Number(station.id)] = {
                drawSchedule: station.drawSchedule,
                salePrice: station.price,
                commissionPercent:
                    station.commissionRate != null ? station.commissionRate * 100 : undefined,
            };
        });
        return byId;
    }, [todayStations, yesterdayStations, tomorrowStations]);

    /**
     * The day the "Mẫu nhập vé chi tiết" button issues. Named for its role rather
     * than for "today", because after the cut-off it is tomorrow.
     */
    const primaryTemplateDay: ImportBatchTemplateDay = templateTargetsTomorrow
        ? {
              drawDate: dayjs().add(1, 'day').format('DD/MM/YYYY'),
              stations: toTemplateStations(tomorrowStations),
          }
        : {
              drawDate: dayjs().format('DD/MM/YYYY'),
              stations: toTemplateStations(todayStations),
          };
    const todayTemplateDay: ImportBatchTemplateDay = {
        drawDate: dayjs().format('DD/MM/YYYY'),
        stations: toTemplateStations(todayStations),
    };
    const yesterdayTemplateDay: ImportBatchTemplateDay = {
        drawDate: dayjs().subtract(1, 'day').format('DD/MM/YYYY'),
        stations: toTemplateStations(yesterdayStations),
    };

    /**
     * The letterhead check is per file, so every draw-date group repeats the same
     * verdict. Read it from the preview root and show it once.
     */
    const supplierIdentity = preview?.supplierIdentity;
    const supplierIdentityMismatched = !!supplierIdentity?.mismatched;
    const supplierIdentityMatched =
        !!supplierIdentity?.declared
        && !supplierIdentity.mismatched
        && (supplierIdentity.fields ?? []).every((field) => field.matched);
    const supplierMatchedLabel = supplierIdentityMatched && selectedSupplier
        ? `NCC khớp: ${selectedSupplier.name}`
        : undefined;

    const previewNotices = useMemo((): PreviewNotice[] => {
        const notices: PreviewNotice[] = [];
        const softMismatches = supplierIdentity?.declared && !supplierIdentity.mismatched
            ? supplierIdentity.fields.filter((field) => !field.matched)
            : [];

        if (supplierIdentity && !supplierIdentity.declared && selectedSupplier) {
            notices.push({
                id: 'supplier-undeclared',
                severity: 'info',
                title: 'Tệp không ghi thông tin nhà cung cấp',
                detail: `Hệ thống không đối chiếu được. Vui lòng tự kiểm tra tệp này đúng là của ${selectedSupplier.name}.`,
            });
        } else if (softMismatches.length > 0 && selectedSupplier) {
            notices.push({
                id: 'supplier-soft',
                severity: 'warning',
                title: `Thông tin nhà cung cấp khớp với ${selectedSupplier.name}`,
                detail: `${softMismatches.map((field) => field.label.toLowerCase()).join(', ')} khác với hệ thống nhưng không chặn việc nhập.`,
                actionLabel: 'Sửa thông tin NCC',
                onAction: () => setSupplierEditOpen(true),
            });
        }

        if (drawDateProblem) {
            notices.push({
                id: 'draw-date',
                severity: drawDateProblem.blocking ? 'error' : 'warning',
                title: drawDateProblem.blocking
                    ? `Tệp không có dòng nào có thể nhập cho ngày quay ${formatDate(selectedBatchDrawDate ?? undefined)}`
                    : `${drawDateProblem.outOfWindowRows + drawDateProblem.unreadableRows} dòng không thuộc ngày quay sẽ nhập`,
                detail: [
                    drawDateProblem.outOfWindowRows > 0
                        ? `${drawDateProblem.outOfWindowRows} dòng thuộc ngày ${drawDateProblem.dates}.`
                        : '',
                    drawDateProblem.unreadableRows > 0
                        ? `${drawDateProblem.unreadableRows} dòng không đọc được ngày quay.`
                        : '',
                    `Phiếu đã chọn chỉ nhận vé của ngày quay ${formatDate(selectedBatchDrawDate ?? undefined)}.`,
                ].filter(Boolean).join(' '),
            });
        }

        if (scheduleMismatches.length > 0) {
            notices.push({
                id: 'schedule',
                severity: 'error',
                title: `${scheduleMismatches.length} nhà đài không có lịch quay vào ngày ghi trong tệp`,
                detail: 'Vé của các đài này bị bỏ qua. Nếu đài thực sự có quay, hãy bổ sung thứ còn thiếu rồi xem trước lại.',
                actionLabel: 'Sửa lịch quay',
                onAction: () => setScheduleOpen(true),
            });
        }

        if (pricingMismatches.length > 0) {
            notices.push({
                id: 'pricing',
                severity: 'error',
                title: `${pricingMismatches.length} nhà đài có giá lệch giữa tệp và hệ thống`,
                detail: 'Phiếu nhập được tính tiền theo cấu hình đài, nên phải thống nhất giá trước khi nạp vé.',
                actionLabel: 'Đối chiếu giá',
                onAction: () => setPricingOpen(true),
            });
        }

        return notices;
    }, [drawDateProblem, pricingMismatches, scheduleMismatches, selectedSupplier, supplierIdentity, selectedBatchDrawDate]);

    const headerOptions = inspectResult?.detectedHeaders ?? [];
    const importsTickets = mappingImportsTickets(mapping);
    const mappingReady =
        !!mapping?.stationColumn &&
        importsTickets &&
        !!(mapping?.drawDateColumn || mapping?.fallbackDrawDate);

    const reset = () => {
        setStep(0);
        setBusy(false);
        setFile(null);
        setInspectResult(null);
        setMapping(null);
        setPreview(null);
        setSelectedDates([]);
        setSelectedImportBatchId(null);
        setAllocationOpen(false);
        setBatchToDiscard(null);
        setDiscardingBatchId(null);
        setAuxConfigOpen(false);
    };

    const handleClose = () => {
        if (busy) {
            return;
        }
        reset();
        onClose();
    };

    const handleFileChosen = async (chosen: File | null) => {
        setFile(chosen);
        setInspectResult(null);
        setMapping(null);
        setPreview(null);
        if (!chosen) {
            return;
        }

        setBusy(true);
        try {
            const response = await inspectImportBatchFile(chosen, supplierId || undefined);
            const result = response.data;
            if (!result) {
                toast.error('Không đọc được tệp.');
                return;
            }
            setInspectResult(result);
            setMapping(result.suggestedMapping);
            setStep(1);
            if (result.profileMatched) {
                toast.info('Đã áp dụng cấu hình cột đã lưu của nhà cung cấp này.');
            }
        } catch (err: unknown) {
            toast.error(
                fileImportRequestErrorMessage(
                    err,
                    'Không đọc được tệp. Vui lòng kiểm tra định dạng .csv hoặc .xlsx.'
                )
            );
        } finally {
            setBusy(false);
        }
    };

    const runPreview = async (nextMapping?: ImportBatchFileMapping) => {
        const effectiveMapping = nextMapping ?? mapping;
        if (!file || !effectiveMapping || !supplierId || !selectedDraftBatch) {
            return;
        }

        setBusy(true);
        try {
            const response = await previewImportBatchFile(file, {
                supplierId,
                mapping: effectiveMapping,
                importBatchId: selectedImportBatchId ?? undefined,
            });
            const result = response.data;
            if (!result) {
                toast.error('Không xem trước được tệp.');
                return;
            }
            setPreview(result);
            setMapping(result.appliedMapping);
            const selectableDates = result.groups
                .filter((group) => isGroupSelectable(group) && group.drawDate === selectedBatchDrawDate)
                .map((group) => group.drawDate as string);
            setSelectedDates(selectableDates);
            setStep(2);
        } catch (err: unknown) {
            toast.error(
                fileImportRequestErrorMessage(
                    err,
                    'Không xem trước được tệp. Vui lòng kiểm tra lại cấu hình cột.'
                )
            );
        } finally {
            setBusy(false);
        }
    };

    const handleChooseStation = async (row: ImportBatchFileRow, lotteryStationId: number) => {
        const stationColumn = mapping?.stationColumn;
        const rawName = stationColumn ? row.rawValues[stationColumn] : undefined;
        if (!rawName) {
            return;
        }

        setBusy(true);
        try {
            await saveLotteryStationAlias({ rawName, lotteryStationId });
        } catch {
            toast.error('Không lưu được cách viết tên nhà đài.');
            setBusy(false);
            return;
        }
        setBusy(false);
        await runPreview();
    };

    const evaluateSelectedQuantity = (): ImportQuantityCheck => {
        if (!preview) {
            return mergeImportQuantityChecks([]);
        }
        const checks = selectedDates.map((drawDate) => {
            const group =
                preview.groups.find(
                    (item) =>
                        item.drawDate === drawDate ||
                        (item.drawDate != null &&
                            dayjs(item.drawDate).format('YYYY-MM-DD') === drawDate)
                ) ?? { stations: [], ticketCount: 0, totalSerialCount: 0 };
            return checkFileImportGroupQuantity(group, selectedDraftBatch);
        });
        return mergeImportQuantityChecks(checks);
    };

    const handleCommit = async (options?: { acknowledgeShortfall?: boolean }) => {
        if (!preview || !file || !supplierId || !mapping) {
            return;
        }
        if (selectedDates.length === 0) {
            toast.warning('Chưa chọn ngày quay nào để nạp vé.');
            return;
        }
        const blockedDates = selectedDates.filter((drawDate) => isDrawDateIntakeBlocked(drawDate));
        if (blockedDates.length > 0) {
            toast.error(
                evaluateIntake(selectedSupplier, blockedDates[0]).message ??
                    'Đã qua giờ cho phép nhập lô cho kỳ quay hôm nay.'
            );
            return;
        }
        if (!selectedDraftBatch || selectedDates.some((date) => date !== selectedBatchDrawDate)) {
            toast.warning('Phiếu nhập đã chọn không khớp ngày quay trong tệp.');
            return;
        }
        if (hasAllocationIssue) {
            setAllocationOpen(true);
            return;
        }

        const quantityCheck = evaluateSelectedQuantity();
        if (quantityCheck.isOverCapacity) {
            const stationHint =
                quantityCheck.stationExcesses.length > 0
                    ? quantityCheck.stationExcesses
                          .map(
                              (item) =>
                                  `${item.stationName}: tệp ${item.selected}, còn ${item.remaining}`
                          )
                          .join('; ')
                    : null;
            toast.error(
                stationHint
                    ? `Số vé trong tệp vượt chỗ còn lại trên phiếu. Hãy chỉnh sửa phiếu nhập hoặc tệp. (${stationHint})`
                    : `Tệp có ${quantityCheck.selectedCount} vé nhưng phiếu chỉ còn ${quantityCheck.remainingCapacity} chỗ. Vui lòng chỉnh sửa phiếu nhập hoặc tệp.`
            );
            return;
        }
        if (quantityCheck.isShortfall && !options?.acknowledgeShortfall) {
            setShortfallCheck(quantityCheck);
            return;
        }

        setBusy(true);
        try {
            const manualBatchBindings = selectedDates.map((drawDate) => ({
                drawDate,
                importBatchId: selectedDraftBatch.id,
            }));
            const response = await commitImportBatchFile(file, {
                supplierId,
                fileHash: preview.fileHash,
                mapping,
                drawDates: selectedDates,
                commitMode: 'MANUAL',
                manualBatchBindings,
            });
            const result = response.data;
            if (!result) {
                toast.error('Không nạp được vé vào phiếu nhập từ tệp.');
                return;
            }

            if (rememberMapping && inspectResult) {
                await saveImportBatchFileMappingProfile({
                    supplierId,
                    headerSignature: inspectResult.headerSignature,
                    mapping,
                })
                    .then(() => setProfileRefreshToken((token) => token + 1))
                    .catch(() => undefined);
            }

            const shortfall = result.items.filter(
                (item) =>
                    item.success &&
                    (item.importedSerialCount ?? 0) < (item.declaredSerialCount ?? 0)
            );

            if (result.failedCount > 0) {
                const failures = result.items
                    .filter((item) => !item.success)
                    .map((item) => `${formatDate(item.drawDate)}: ${item.message ?? item.errorCode}`)
                    .join('; ');
                toast.warning(
                    `Đã gắn ${result.createdCount}/${result.requestedCount} ngày quay. ${failures}`
                );
            } else if (shortfall.length > 0) {
                toast.warning(
                    `Đã gắn ${result.createdCount} ngày quay. Có ${shortfall.length} phiếu nhập chưa đủ vé, hãy hoàn tất ở màn hình nhập vé.`
                );
            } else {
                toast.success(`Đã nhập vào ${result.createdCount} phiếu nhập lô vé từ tệp.`);
            }

            onImported?.();
            reset();
            onClose();
        } catch (err: unknown) {
            toast.error(fileImportRequestErrorMessage(err, 'Không nhập được vé từ tệp vào phiếu nhập.'));
        } finally {
            setBusy(false);
        }
    };

    const handleCommitClick = async () => {
        await handleCommit();
    };

    const handleConfirmShortfallContinue = async () => {
        setShortfallCheck(null);
        await handleCommit({ acknowledgeShortfall: true });
    };

    const updateMapping = (patch: Partial<ImportBatchFileMapping>) => {
        setMapping((current) => (current ? { ...current, ...patch } : current));
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: 'var(--customShadows-dialog, 0 20px 40px rgba(0,0,0,0.2))',
                },
            }}
        >
            {/* Header */}
            <DialogTitle sx={{ pr: 6, pb: 1.5, pt: 2.5, px: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            bgcolor: 'rgba(37,99,235,0.08)',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <UploadFileOutlinedIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                            Nhập lô vé từ tệp
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {STEP_SUBTITLES[step] ?? 'Tải lên tệp Excel (.xlsx) hoặc CSV để nạp vé vào phiếu nhập kho'}
                        </Typography>
                    </Box>
                </Stack>

                <IconButton
                    onClick={handleClose}
                    disabled={busy}
                    sx={{ position: 'absolute', right: 14, top: 14 }}
                    aria-label="Đóng"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            {/* Stepper Bar */}
            <Box
                sx={{
                    px: 3,
                    py: 1.5,
                    bgcolor: 'var(--palette-background-neutral, #f8fafc)',
                    borderTop: '1px solid var(--palette-divider, #f1f5f9)',
                    borderBottom: '1px solid var(--palette-divider, #e2e8f0)',
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={{ xs: 1, sm: 2.5 }}
                >
                    {STEPS.map((s, index) => {
                        const isCurrent = step === index;
                        const isCompleted = step > index;

                        return (
                            <Stack key={s} direction="row" alignItems="center" spacing={1}>
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        bgcolor: isCurrent
                                            ? 'primary.main'
                                            : isCompleted
                                              ? '#10b981'
                                              : 'var(--palette-text-disabled, #94a3b8)',
                                        color: '#fff',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {isCompleted ? '✓' : index + 1}
                                </Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                                        color: isCurrent
                                            ? 'text.primary'
                                            : isCompleted
                                              ? '#059669'
                                              : 'text.secondary',
                                        display: { xs: isCurrent ? 'inline' : 'none', sm: 'inline' },
                                    }}
                                >
                                    {s}
                                </Typography>
                                {index < STEPS.length - 1 && (
                                    <Box
                                        sx={{
                                            width: { xs: 12, sm: 24 },
                                            height: 2,
                                            bgcolor: isCompleted
                                                ? '#10b981'
                                                : 'var(--palette-divider, #e2e8f0)',
                                        }}
                                    />
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            </Box>

            <DialogContent dividers sx={{ minHeight: 480, p: { xs: 2.5, md: 3 }, bgcolor: '#f8fafc' }}>

                {/* ── STEP 0: Chọn tệp & Nhà cung cấp ── */}
                {step === 0 && (
                    <Stack spacing={3}>
                        {/* Information Guidelines Card */}
                        <Box
                            sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                bgcolor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                            }}
                        >
                            <Box
                                sx={{
                                    color: '#2563eb',
                                    p: 0.75,
                                    bgcolor: '#dbeafe',
                                    borderRadius: '10px',
                                    display: 'flex',
                                }}
                            >
                                <InfoOutlinedIcon fontSize="small" />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={800} color="#1e40af" sx={{ mb: 0.5 }}>
                                    Lưu ý quan trọng khi nhập tệp
                                </Typography>
                                <Typography variant="body2" color="#1e3a8a" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                                    • <b>Phạm vi ngày quay:</b> Nhập từ tệp chỉ áp dụng cho <b>ngày quay hôm nay</b>, và phải trước giờ kiểm vé chuẩn bị trả của nhà cung cấp. Ngày đã qua hoặc chưa tới sẽ bị bỏ qua.<br />
                                    • <b>Chế độ nhập vé:</b> Vé trong tệp sẽ được gắn vào phiếu nhập lô nháp đã chọn. Nếu tệp có cột <b>dãy số</b> và <b>danh sách sê-ri</b> (phân cách bằng dấu <b>;</b>), hệ thống sẽ nhập vé vào kho. Nếu chỉ có cột <b>số lượng</b> thì hệ thống sẽ cập nhật số lượng khai báo.
                                </Typography>
                            </Box>
                        </Box>

                        {/* Supplier Selection */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 2 }}>
                                1. Chọn nhà cung cấp *
                            </Typography>
                            <TextField
                                select
                                required
                                label="Nhà cung cấp"
                                value={supplierId || ''}
                                onChange={(event) => {
                                    const nextSupplierId = Number(event.target.value);
                                    setSupplierId(nextSupplierId);
                                    setSelectedImportBatchId(null);
                                    setFile(null);
                                    setInspectResult(null);
                                    setMapping(null);
                                    setPreview(null);
                                }}
                                fullWidth
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '12px',
                                        bgcolor: '#ffffff',
                                    },
                                }}
                            >
                                {activeSuppliers.map((supplier) => (
                                    <MenuItem key={supplier.id} value={supplier.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography fontWeight={600}>{supplier.name}</Typography>
                                            <Chip size="small" label={supplier.code} sx={{ height: 22, fontSize: '0.75rem' }} />
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>

                            {activeIntakeAlert && (
                                <Alert severity={activeIntakeAlert.blocked ? 'error' : 'warning'} sx={{ mt: 2 }}>
                                    {activeIntakeAlert.message}
                                </Alert>
                            )}

                            {supplierId > 0 && (
                                <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="body2" fontWeight={700} color="#334155">
                                                Phiếu nhập lô tiếp nhận
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label="Bắt buộc"
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.675rem',
                                                    fontWeight: 700,
                                                    bgcolor: '#fee2e2',
                                                    color: '#b91c1c',
                                                }}
                                            />
                                        </Stack>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<RefreshOutlinedIcon />}
                                                disabled={loadingBatches}
                                                onClick={() => void refetchDraftBatches()}
                                                sx={{ textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Tải lại
                                            </Button>
                                            {eligibleBatchOptions.length > 0 && (
                                                <Button
                                                    size="small"
                                                    startIcon={<AddCircleOutlineIcon />}
                                                    onClick={handleNavigateToCreateBatch}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        fontSize: '0.775rem',
                                                        color: '#2563eb',
                                                    }}
                                                >
                                                    Khai báo thêm phiếu
                                                </Button>
                                            )}
                                        </Stack>
                                    </Stack>

                                    {loadingBatches ? (
                                        <Stack alignItems="center" py={2}>
                                            <CircularProgress size={24} />
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                                Đang tải danh sách phiếu nhập…
                                            </Typography>
                                        </Stack>
                                    ) : eligibleBatchOptions.length === 0 ? (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2.25,
                                                borderRadius: '12px',
                                                bgcolor: '#fffbeb',
                                                border: '1px solid #fef08a',
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                justifyContent: 'space-between',
                                                gap: 2,
                                            }}
                                        >
                                            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                                                <WarningAmberOutlinedIcon sx={{ color: '#d97706', fontSize: '1.4rem', flexShrink: 0, mt: 0.25 }} />
                                                <Box>
                                                    <Typography variant="body2" color="#92400e" fontWeight={700} sx={{ lineHeight: 1.4 }}>
                                                        {blockedByIntakeCount > 0
                                                            ? 'Phiếu nhập lô hiện có đã quá thời hạn cho phép tiếp nhận vé.'
                                                            : 'Nhà cung cấp này chưa có phiếu nhập lô nào đang mở để tiếp nhận vé.'}
                                                    </Typography>
                                                    <Typography variant="caption" color="#a16207" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                                                        {intakeClosedHint
                                                            ? intakeClosedHint
                                                            : 'Vui lòng khai báo phiếu nhập lô mới cho nhà cung cấp trước khi thực hiện tải lên tệp vé.'}
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<AddCircleOutlineIcon />}
                                                onClick={handleNavigateToCreateBatch}
                                                sx={{
                                                    whiteSpace: 'nowrap',
                                                    fontWeight: 700,
                                                    fontSize: '0.8rem',
                                                    textTransform: 'none',
                                                    borderRadius: '8px',
                                                    bgcolor: '#d97706',
                                                    color: '#ffffff',
                                                    px: 2,
                                                    py: 0.75,
                                                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                                                    '&:hover': {
                                                        bgcolor: '#b45309',
                                                    },
                                                    alignSelf: { xs: 'stretch', sm: 'center' },
                                                }}
                                            >
                                                Khai báo phiếu nhập
                                            </Button>
                                        </Paper>
                                    ) : (
                                        <Stack spacing={1}>
                                            {eligibleBatchOptions.map((option) => {
                                                const selected = selectedImportBatchId === option.id;
                                                const isReceiving = option.status === 'RECEIVING';
                                                const isPartial = option.status === 'PARTIALLY_IMPORTED';
                                                return (
                                                    <Paper
                                                        key={option.id}
                                                        elevation={0}
                                                        onClick={() => handleSelectDraftBatch(selected ? null : option.id)}
                                                        sx={{
                                                            border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                            borderRadius: '12px',
                                                            p: 1.5,
                                                            cursor: 'pointer',
                                                            bgcolor: selected ? '#eff6ff' : '#ffffff',
                                                            boxShadow: selected ? '0 2px 8px rgba(37, 99, 235, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                                                            transition: 'all 0.15s ease-in-out',
                                                            '&:hover': {
                                                                borderColor: selected ? '#2563eb' : '#94a3b8',
                                                                bgcolor: selected ? '#eff6ff' : '#f8fafc',
                                                            },
                                                        }}
                                                    >
                                                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                                                            <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" sx={{ flex: 1 }}>
                                                                <Chip
                                                                    size="small"
                                                                    label={formatImportBatchHeaderCode(option.batchCode, option.id)}
                                                                    sx={{
                                                                        fontWeight: 800,
                                                                        fontSize: '0.8rem',
                                                                        bgcolor: selected ? '#2563eb' : '#f1f5f9',
                                                                        color: selected ? '#ffffff' : '#1e293b',
                                                                        borderRadius: '6px',
                                                                    }}
                                                                />
                                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                                    <CalendarTodayOutlinedIcon sx={{ fontSize: '0.875rem', color: '#64748b' }} />
                                                                    <Typography variant="body2" color="#475569" fontWeight={600}>
                                                                        Ngày quay: {dayjs(option.drawDate).format('DD/MM/YYYY')}
                                                                    </Typography>
                                                                </Stack>
                                                                {isReceiving ? (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Đang nhập"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 700,
                                                                            borderColor: '#93c5fd',
                                                                            color: '#1d4ed8',
                                                                            bgcolor: '#eff6ff',
                                                                        }}
                                                                    />
                                                                ) : isPartial ? (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Đã nhập 1 nửa"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 700,
                                                                            borderColor: '#fde68a',
                                                                            color: '#b45309',
                                                                            bgcolor: '#fefce8',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Chip
                                                                        size="small"
                                                                        label="Bản nháp"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 600,
                                                                            borderColor: '#cbd5e1',
                                                                            color: '#64748b',
                                                                            bgcolor: '#f8fafc',
                                                                        }}
                                                                    />
                                                                )}
                                                            </Stack>

                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                {selected ? (
                                                                    <Chip
                                                                        size="small"
                                                                        icon={<CheckCircleIcon sx={{ fontSize: '1rem !important', color: '#2563eb !important' }} />}
                                                                        label="Đang chọn"
                                                                        sx={{
                                                                            bgcolor: '#dbeafe',
                                                                            color: '#1d4ed8',
                                                                            fontWeight: 700,
                                                                            fontSize: '0.75rem',
                                                                            height: 28,
                                                                            px: 0.5,
                                                                            border: '1px solid #bfdbfe',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            handleSelectDraftBatch(option.id);
                                                                        }}
                                                                        sx={{
                                                                            textTransform: 'none',
                                                                            fontWeight: 600,
                                                                            borderRadius: '8px',
                                                                            fontSize: '0.775rem',
                                                                            py: 0.25,
                                                                        }}
                                                                    >
                                                                        Chọn
                                                                    </Button>
                                                                )}
                                                                <Tooltip title="Chỉnh sửa phiếu nhập này">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            handleEditBatchNavigate(option.id);
                                                                        }}
                                                                        sx={{
                                                                            p: 0.75,
                                                                            borderRadius: '8px',
                                                                            color: '#475569',
                                                                            bgcolor: '#f1f5f9',
                                                                            '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' },
                                                                        }}
                                                                    >
                                                                        <EditOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                {canShowImportBatchDelete(option) && (
                                                                <Tooltip title={getImportBatchDeleteDisabledReason(option) || 'Xóa phiếu nhập này'}>
                                                                    <span>
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        disabled={
                                                                            discardingBatchId === option.id ||
                                                                            !canDeleteImportBatch(option)
                                                                        }
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            setBatchToDiscard(option);
                                                                        }}
                                                                        sx={{
                                                                            p: 0.75,
                                                                            borderRadius: '8px',
                                                                            '&:hover': { bgcolor: '#fee2e2' },
                                                                        }}
                                                                    >
                                                                        {discardingBatchId === option.id ? (
                                                                            <CircularProgress size={16} />
                                                                        ) : (
                                                                            <DeleteOutlineIcon sx={{ fontSize: '1.15rem' }} />
                                                                        )}
                                                                    </IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                                )}
                                                            </Stack>
                                                        </Stack>
                                                        <ImportBatchReceptionLineSummary
                                                            batch={option}
                                                            onChanged={async () => {
                                                                await refetchDraftBatches();
                                                            }}
                                                        />
                                                    </Paper>
                                                );
                                            })}
                                        </Stack>
                                    )}

                                    {!selectedImportBatchId && eligibleBatchOptions.length > 0 && (
                                        <FormHelperText sx={{ color: '#d97706', fontWeight: 600, mx: 0 }}>
                                            ⚠️ Vui lòng nhấp chọn một phiếu nhập lô ở trên để tiếp tục
                                        </FormHelperText>
                                    )}
                                </Stack>
                            )}

                            <Box sx={{ mt: 2 }}>
                                <ImportBatchFileMappingProfilePanel
                                    supplierId={supplierId}
                                    refreshToken={profileRefreshToken}
                                />
                            </Box>
                        </Paper>

                        {/* File Upload Zone */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 2 }}>
                                2. Tải lên tệp dữ liệu *
                            </Typography>

                            <Box
                                component="label"
                                sx={{
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '16px',
                                    p: 4,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: file ? '#f0fdf4' : !supplierId || !selectedImportBatchId ? '#f8fafc' : '#f8fafc',
                                    cursor: !supplierId || !selectedImportBatchId || busy ? 'not-allowed' : 'pointer',
                                    opacity: !supplierId || !selectedImportBatchId ? 0.6 : 1,
                                    transition: 'all 0.2s',
                                    textAlign: 'center',
                                    '&:hover': !supplierId || !selectedImportBatchId || busy ? {} : {
                                        borderColor: '#2563eb',
                                        bgcolor: 'rgba(37, 99, 235, 0.04)',
                                    },
                                }}
                            >
                                <input
                                    hidden
                                    type="file"
                                    accept={IMPORT_BATCH_FILE_ACCEPT}
                                    disabled={!supplierId || !selectedDraftBatch || busy}
                                    onChange={(event) =>
                                        handleFileChosen(event.target.files?.[0] ?? null)
                                    }
                                />

                                {busy ? (
                                    <Stack alignItems="center" spacing={1.5}>
                                        <CircularProgress size={36} color="primary" />
                                        <Typography variant="body2" fontWeight={700} color="#475569">
                                            Đang phân tích tệp dữ liệu...
                                        </Typography>
                                    </Stack>
                                ) : file ? (
                                    <Stack alignItems="center" spacing={1}>
                                        <Box
                                            sx={{
                                                width: 52,
                                                height: 52,
                                                borderRadius: '14px',
                                                bgcolor: '#dcfce7',
                                                color: '#16a34a',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <InsertDriveFileOutlinedIcon fontSize="large" />
                                        </Box>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                            {file.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {(file.size / 1024).toFixed(1)} KB · Nhấn để đổi tệp khác
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Stack alignItems="center" spacing={1.5}>
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: '16px',
                                                bgcolor: 'rgba(37,99,235,0.08)',
                                                color: 'primary.main',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <CloudUploadOutlinedIcon fontSize="large" />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                                {!supplierId
                                                    ? 'Vui lòng chọn nhà cung cấp trước'
                                                    : !selectedImportBatchId
                                                      ? 'Vui lòng chọn phiếu nhập lô ở trên'
                                                      : 'Kéo thả tệp hoặc bấm vào đây để chọn'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                Hỗ trợ định dạng Microsoft Excel (.xlsx) hoặc CSV (.csv)
                                            </Typography>
                                        </Box>
                                    </Stack>
                                )}
                            </Box>

                            {supplierId > 0 && !selectedImportBatchId && (
                                <FormHelperText sx={{ color: '#d97706', fontWeight: 600, mt: 1.5, textAlign: 'center' }}>
                                    ⚠️ Vui lòng chọn phiếu nhập lô tiếp nhận ở bước trên trước khi tải lên tệp dữ liệu
                                </FormHelperText>
                            )}

                            {/* Template & Helper Buttons */}
                            <Stack
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                flexWrap="wrap"
                                sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #f1f5f9' }}
                            >
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    Tệp mẫu chuẩn:
                                </Typography>
                                <Tooltip
                                    title={
                                        templateTargetsTomorrow
                                            ? `Đã quá giờ nhận vé cho hôm nay, nên mẫu được lập cho ngày quay ${primaryTemplateDay.drawDate} với ${primaryTemplateDay.stations.length} đài quay hôm đó. Tải lên được ngay bây giờ — lô ngày mai chỉ đóng khi tới giờ chốt của chính ngày đó.`
                                            : `Vé của ${primaryTemplateDay.stations.length} đài quay hôm nay (${primaryTemplateDay.drawDate})`
                                    }
                                >
                                    <span>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<DownloadOutlinedIcon />}
                                            disabled={!supplierId}
                                            onClick={() =>
                                                void downloadImportBatchFileTemplate(
                                                    [primaryTemplateDay],
                                                    templateSupplier || undefined,
                                                    templateIssuer
                                                )
                                            }
                                            sx={TEMPLATE_BUTTON_SX}
                                        >
                                            {templateTargetsTomorrow
                                                ? `Mẫu nhập vé — ngày mai (${primaryTemplateDay.drawDate})`
                                                : 'Mẫu nhập vé chi tiết'}
                                        </Button>
                                    </span>
                                </Tooltip>

                                <Tooltip
                                    title={
                                        yesterdayTemplateDay.stations.length === 0
                                            ? 'Hôm qua không có đài nào quay số'
                                            : `Gộp 2 ngày quay: ${yesterdayTemplateDay.drawDate} (${yesterdayTemplateDay.stations.length} đài) và ${todayTemplateDay.drawDate} (${todayTemplateDay.stations.length} đài). Ngày hôm qua nằm ngoài phạm vi nhập vé nên sẽ bị bỏ qua khi nhập.`
                                    }
                                >
                                    <span>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<DownloadOutlinedIcon />}
                                            disabled={
                                                !supplierId ||
                                                yesterdayTemplateDay.stations.length === 0
                                            }
                                            onClick={() =>
                                                void downloadImportBatchFileTemplate(
                                                    [yesterdayTemplateDay, todayTemplateDay],
                                                    templateSupplier || undefined,
                                                    templateIssuer
                                                )
                                            }
                                            sx={TEMPLATE_BUTTON_SX}
                                        >
                                            Mẫu hôm qua + hôm nay
                                        </Button>
                                    </span>
                                </Tooltip>

                                <Box sx={{ flex: 1 }} />

                                <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<SettingsOutlinedIcon />}
                                    onClick={() => setConfigOpen(true)}
                                    sx={{
                                        borderRadius: '10px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        color: '#64748b',
                                        '&:hover': { bgcolor: '#f1f5f9' },
                                    }}
                                >
                                    Xem quy tắc đọc tệp
                                </Button>
                            </Stack>
                        </Paper>
                    </Stack>
                )}

                {/* ── STEP 1: Gán cột dữ liệu ── */}
                {step === 1 && mapping && (
                    <Stack spacing={3}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 2,
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                    Đã đọc {inspectResult?.totalRows ?? 0} dòng dữ liệu
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Đối chiếu và chọn đúng trường thông tin cho từng cột trong tệp của bạn
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                <Chip
                                    icon={importsTickets ? <CheckCircleIcon /> : <InfoOutlinedIcon />}
                                    color={importsTickets ? 'success' : 'primary'}
                                    label={
                                        importsTickets
                                            ? 'Đã gán dãy số và sê-ri vé'
                                            : 'Cần gán cột dãy số và sê-ri vé'
                                    }
                                    sx={{ fontWeight: 700, borderRadius: '8px', py: 1.75 }}
                                />
                                <Tooltip title="Mở cấu hình phụ trợ (dấu phân cách, định dạng số, ngày quay áp dụng)">
                                    <Button
                                        variant="outlined"
                                        startIcon={<SettingsOutlinedIcon />}
                                        onClick={() => setAuxConfigOpen(true)}
                                        sx={{
                                            borderRadius: '8px',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderColor: '#cbd5e1',
                                            color: '#334155',
                                            bgcolor: '#ffffff',
                                            py: 0.75,
                                            px: 1.75,
                                            '&:hover': {
                                                borderColor: '#94a3b8',
                                                bgcolor: '#f8fafc',
                                            },
                                        }}
                                    >
                                        Cấu hình phụ trợ
                                    </Button>
                                </Tooltip>
                            </Stack>
                        </Paper>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <ImportBatchFileColumnTagger
                                headers={headerOptions}
                                sampleRows={inspectResult?.sampleRows ?? []}
                                mapping={mapping}
                                onChange={updateMapping}
                            />
                        </Paper>
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={rememberMapping}
                                        onChange={(event) => setRememberMapping(event.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body2" fontWeight={700} color="#334155">
                                        Ghi nhớ cấu hình cột này cho nhà cung cấp (tự động nhận diện vào lần sau)
                                    </Typography>
                                }
                            />
                        </Paper>
                    </Stack>
                )}

                {/* ── STEP 2: Xem trước & Nạp vé ── */}
                {step === 2 && preview && (
                    <Stack spacing={3}>
                        {supplierIdentityMismatched && supplierIdentity && selectedSupplier && (
                            <ImportBatchFileSupplierIdentityPanel
                                identity={supplierIdentity}
                                supplierName={selectedSupplier.name}
                                onEditSupplier={() => setSupplierEditOpen(true)}
                            />
                        )}

                        <PreviewNoticeBoard
                            notices={previewNotices}
                            successLabel={supplierMatchedLabel}
                        />

                        {selectedDraftBatch && (
                            <ImportBatchFileAllocationSummary
                                batch={selectedDraftBatch}
                                supplierName={selectedSupplier?.name || selectedDraftBatch.supplierName || 'Nhà cung cấp'}
                                rows={allocationRows}
                                onEdit={() => setAllocationOpen(true)}
                                onExport={() => void downloadImportBatchProgressCsv(preview, mapping, file?.name, {
                                    issuer: templateIssuer,
                                    operatorName,
                                    supplier: templateSupplier || undefined,
                                    stationPricing,
                                })}
                            />
                        )}

                        {/* KPI Summary Cards */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                                gap: 2,
                            }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: '#ffffff',
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    Dãy vé hợp lệ
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                    {validTicketCount.toLocaleString('vi-VN')}
                                </Typography>
                            </Paper>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid #bbf7d0',
                                    bgcolor: '#f0fdf4',
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} color="#16a34a">
                                    Sê-ri hợp lệ
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#15803d" sx={{ mt: 0.5 }}>
                                    {validSerialCount.toLocaleString('vi-VN')}
                                </Typography>
                            </Paper>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid #dbeafe',
                                    bgcolor: '#eff6ff',
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} color="#1d4ed8">
                                    Dòng trong tệp
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#1e40af" sx={{ mt: 0.5 }}>
                                    {preview.totalRows.toLocaleString('vi-VN')}
                                </Typography>
                            </Paper>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid #fecaca',
                                    bgcolor: '#fef2f2',
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} color="#dc2626">
                                    Dòng lỗi trong tệp
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#b91c1c" sx={{ mt: 0.5 }}>
                                    {preview.errorRows}
                                </Typography>
                            </Paper>
                        </Box>

                        {/* Anomalies Table */}
                        <AnomalyTable
                            anomalies={collectAnomalies(preview.groups)}
                            mapping={mapping}
                            busy={busy}
                            hideEmptySuccess={previewNotices.length > 0 || !!supplierMatchedLabel}
                            onChooseStation={handleChooseStation}
                        />

                        {/* Preview tickets for the selected, existing batch. */}
                        <Stack spacing={2}>
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                Danh sách vé theo ngày quay ({preview.groups.length})
                            </Typography>
                            {selectedDates.length === 0 && (
                                <Alert severity="error">
                                    Tệp không có vé hợp lệ cho ngày quay của phiếu nhập đã chọn ({formatDate(selectedBatchDrawDate ?? undefined)}).
                                </Alert>
                            )}
                            {preview.groups.map((group, index) => (
                                <PreviewGroup
                                    key={group.drawDate ?? `undated-${index}`}
                                    group={group}
                                    targetDrawDate={selectedBatchDrawDate}
                                    busy={busy}
                                    importsTickets={preview.importsTickets}
                                    mapping={mapping}
                                    windowFrom={preview.windowFrom}
                                    windowTo={preview.windowTo}
                                    onChooseStation={handleChooseStation}
                                    onOpenPricing={() => setPricingOpen(true)}
                                    onOpenSchedule={() => setScheduleOpen(true)}
                                />
                            ))}
                        </Stack>

                    </Stack>
                )}
            </DialogContent>

            {/* Footer Actions */}
            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    borderTop: '1px solid var(--palette-divider, #e2e8f0)',
                    bgcolor: 'var(--palette-background-paper, #ffffff)',
                }}
            >
                <Button
                    onClick={handleClose}
                    disabled={busy}
                    sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}
                >
                    Hủy bỏ
                </Button>

                <Box sx={{ flex: 1 }} />

                {step === 0 && inspectResult && mapping && (
                    <Button
                        variant="contained"
                        onClick={() => setStep(1)}
                        disabled={busy}
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 1.5,
                            bgcolor: '#2563eb',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        Tiếp tục
                    </Button>
                )}

                {step === 1 && (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Button
                            onClick={() => setStep(0)}
                            disabled={busy}
                            startIcon={<ArrowBackIcon />}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Quay lại
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => runPreview()}
                            disabled={busy || !mappingReady || !selectedDraftBatch}
                            endIcon={busy ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: 1.5,
                                bgcolor: '#2563eb',
                                '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                        >
                            {busy ? 'Đang đọc tệp…' : 'Xem trước'}
                        </Button>
                    </Stack>
                )}

                {step === 2 && (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Button
                            onClick={() => setStep(1)}
                            disabled={busy}
                            startIcon={<ArrowBackIcon />}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Quay lại
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => void handleCommitClick()}
                            disabled={
                                busy
                                || selectedDates.length === 0
                                || selectedDates.some(isDrawDateIntakeBlocked)
                                || hasAllocationIssue
                            }
                            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: 1.5,
                                bgcolor: '#2563eb',
                                '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                        >
                            {busy ? 'Đang nhập…' : `Tiến hành nhập (${selectedDates.length} ngày)`}
                        </Button>
                    </Stack>
                )}
            </DialogActions>

            <ImportBatchQuickAllocationModal
                open={allocationOpen}
                onClose={() => setAllocationOpen(false)}
                batch={selectedDraftBatch}
                fileStations={selectedGroup?.stations ?? []}
                onBatchUpdated={async () => {
                    await refetchDraftBatches();
                }}
            />

            {/* Modal Cấu hình phụ trợ */}
            <Dialog
                open={auxConfigOpen && Boolean(mapping)}
                onClose={() => setAuxConfigOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: 'var(--customShadows-dialog, 0 20px 40px rgba(0,0,0,0.2))',
                    },
                }}
            >
                <DialogTitle sx={{ pr: 6, pb: 1.5, pt: 2.5, px: 3 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                bgcolor: 'rgba(37,99,235,0.08)',
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <SettingsOutlinedIcon />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                                Cấu hình phụ trợ
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Tùy chỉnh dấu phân cách, định dạng số và ngày quay áp dụng chung
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton
                        onClick={() => setAuxConfigOpen(false)}
                        sx={{ position: 'absolute', right: 14, top: 14 }}
                        aria-label="Đóng"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 3, bgcolor: '#ffffff' }}>
                    {mapping && (
                        <Stack spacing={2.5}>
                            <TextField
                                type="date"
                                label="Ngày quay áp dụng cho cả tệp"
                                InputLabelProps={{ shrink: true }}
                                helperText={
                                    mapping.drawDateColumn
                                        ? `Đang có cột "${mapping.drawDateColumn}" trong tệp. Giá trị này sẽ được dùng dự phòng khi ô rỗng.`
                                        : 'Dùng khi tệp không có cột ngày quay riêng'
                                }
                                value={mapping.fallbackDrawDate ?? ''}
                                onChange={(event) =>
                                    updateMapping({
                                        fallbackDrawDate: event.target.value || null,
                                    })
                                }
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />

                            <TextField
                                label="Dấu phân cách trong ô"
                                helperText="Dùng để đọc nhiều giá trị trong 1 ô (VD: abc;1;abc2;abc3, ...)"
                                value={mapping.serialSeparator ?? ';'}
                                onChange={(event) =>
                                    updateMapping({ serialSeparator: event.target.value || ';' })
                                }
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />

                            <TextField
                                select
                                label="Định dạng số"
                                helperText="Dùng để đọc số tiền / giá vốn và số lượng (phân cách hàng nghìn, thập phân)"
                                value={mapping.numberStyle ?? 'AUTO'}
                                onChange={(event) =>
                                    updateMapping({
                                        numberStyle: event.target.value as ImportBatchFileMapping['numberStyle'],
                                    })
                                }
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            >
                                <MenuItem value="AUTO">Tự động nhận diện</MenuItem>
                                <MenuItem value="VN">Kiểu Việt Nam (VD: 10.000 hoặc 1.000.000,5)</MenuItem>
                                <MenuItem value="EN">Kiểu Quốc tế (VD: 10,000 hoặc 1,000,000.5)</MenuItem>
                            </TextField>
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                    <Button
                        variant="contained"
                        onClick={() => setAuxConfigOpen(false)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 1.5,
                            bgcolor: '#2563eb',
                            '&:hover': { bgcolor: '#1d4ed8' },
                            px: 3,
                        }}
                    >
                        Xác nhận & Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={Boolean(shortfallCheck)}
                onClose={() => setShortfallCheck(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Số vé chưa đủ so với phiếu nhập</DialogTitle>
                <DialogContent>
                    <DialogContentText component="div" sx={{ color: 'text.primary' }}>
                        Tệp đang nhập <strong>{shortfallCheck?.selectedCount ?? 0}</strong> vé trong khi
                        các phiếu còn <strong>{shortfallCheck?.remainingCapacity ?? 0}</strong> chỗ
                        (thiếu <strong>{shortfallCheck?.shortfallCount ?? 0}</strong> vé).
                        Bạn vẫn có thể tiếp tục; phần còn thiếu cần bổ sung sau.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setShortfallCheck(null)} sx={{ textTransform: 'none' }}>
                        Quay lại
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        disabled={busy}
                        onClick={() => void handleConfirmShortfallContinue()}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        Vẫn tiếp tục nhập
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal xác nhận hủy / xóa phiếu nhập nháp */}
            <Dialog
                open={Boolean(batchToDiscard)}
                onClose={() => !discardingBatchId && setBatchToDiscard(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem' }}>
                        Xóa phiếu nhập lô
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 2.5, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Bạn có chắc chắn muốn xóa phiếu nhập lô{' '}
                        <Box component="span" fontWeight={700} color="text.primary">
                            {batchToDiscard ? formatImportBatchHeaderCode(batchToDiscard.batchCode, batchToDiscard.id) : ''}
                            {batchToDiscard?.drawDate ? ` - ${dayjs(batchToDiscard.drawDate).format('DD/MM/YYYY')}` : ''}
                        </Box>{' '}
                        không? Thao tác này không thể hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, gap: 1 }}>
                    <Button
                        variant="outlined"
                        disabled={Boolean(discardingBatchId)}
                        onClick={() => setBatchToDiscard(null)}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={Boolean(discardingBatchId)}
                        startIcon={
                            discardingBatchId ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <DeleteOutlineIcon />
                            )
                        }
                        onClick={async () => {
                            if (batchToDiscard) {
                                await handleDiscardDraftBatch(batchToDiscard.id);
                                setBatchToDiscard(null);
                            }
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                    >
                        {discardingBatchId ? 'Đang xóa…' : 'Xác nhận xóa'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ImportBatchFileConfigDialog
                open={configOpen}
                onClose={() => setConfigOpen(false)}
            />

            <ImportBatchFilePricingDialog
                open={pricingOpen}
                onClose={() => setPricingOpen(false)}
                mismatches={pricingMismatches}
                // Station pricing drives the batch line cost, so the preview has to
                // be recomputed before the numbers on screen mean anything again.
                onSaved={() => void runPreview()}
            />

            {selectedSupplier && supplierIdentity && (
                <ImportBatchFileSupplierDialog
                    open={supplierEditOpen}
                    onClose={() => setSupplierEditOpen(false)}
                    supplier={selectedSupplier}
                    identity={supplierIdentity}
                    // The letterhead check runs during resolution, so the verdict on
                    // screen only changes once the file is read against the corrected
                    // record.
                    onSaved={() => void runPreview()}
                />
            )}

            <ImportBatchFileScheduleDialog
                open={scheduleOpen}
                onClose={() => setScheduleOpen(false)}
                mismatches={scheduleMismatches}
                // Which stations are eligible is derived from their schedule, so the
                // whole preview has to be resolved again before anything on screen
                // reflects the correction.
                onSaved={() => void runPreview()}
            />
        </Dialog>
    );
};

type AnomalyTableProps = {
    anomalies: ImportBatchFileAnomaly[];
    mapping: ImportBatchFileMapping | null;
    busy: boolean;
    hideEmptySuccess?: boolean;
    onChooseStation: (row: ImportBatchFileRow, lotteryStationId: number) => void;
};

const AnomalyTable = ({ anomalies, mapping, busy, hideEmptySuccess, onChooseStation }: AnomalyTableProps) => {
    if (anomalies.length === 0) {
        if (hideEmptySuccess) {
            return null;
        }
        return (
            <Paper
                elevation={0}
                sx={{
                    px: 1.75,
                    py: 1.1,
                    borderRadius: '14px',
                    border: '1px solid #bbf7d0',
                    bgcolor: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                <Typography variant="body2" fontWeight={700} color="#15803d">
                    Tất cả nhà đài, ngày quay và số lượng vé đều hợp lệ.
                </Typography>
            </Paper>
        );
    }

    const errorCount = anomalies.filter(({ row }) => row.status === 'ERROR').length;

    return (
        <Paper
            elevation={0}
            sx={{
                border: '1px solid #fecaca',
                borderRadius: '16px',
                p: 2.5,
                bgcolor: '#fff',
                overflow: 'hidden',
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <WarningAmberIcon color="error" />
                <Typography variant="subtitle1" fontWeight={800} color="#991b1b">
                    Các dòng cần kiểm tra hoặc khớp đài ({anomalies.length})
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.875rem' }}>
                {errorCount > 0
                    ? `${errorCount} dòng bị lỗi sẽ không thể nạp vào phiếu cho tới khi bạn chọn đúng nhà đài hoặc sửa tệp.`
                    : 'Các dòng cảnh báo này vẫn có thể nhập được, nhưng bạn nên xem lại trước khi xác nhận.'}
            </Typography>

            <Box sx={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Dòng</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Ngày quay</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Tên đài trong tệp</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Dãy số</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>Số vé</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Chi tiết vấn đề</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Xử lý</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {anomalies.map(({ drawDate, row }) => {
                            const suggestions = row.issues.flatMap((issue) => issue.suggestions ?? []);
                            const rawStation = mapping?.stationColumn ? row.rawValues[mapping.stationColumn] : '';
                            const rawQuantity = mapping?.quantityColumn
                                ? row.rawValues[mapping.quantityColumn]
                                : String(row.serialNumbers?.length ?? row.declareQuantity ?? '');
                            const rawDrawDate = mapping?.drawDateColumn
                                ? row.rawValues[mapping.drawDateColumn]
                                : formatDate(drawDate);

                            return (
                                <TableRow key={`${drawDate ?? 'undated'}-${row.rowNumber}`} hover>
                                    <TableCell sx={{ fontWeight: 700 }}>#{row.rowNumber}</TableCell>
                                    <TableCell>{rawDrawDate || '—'}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>{rawStation || '—'}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        <AdminLuckyDisplay
                                            value={(mapping?.numbersColumn ? row.rawValues[mapping.numbersColumn] : row.numbers) || ''}
                                            ticket
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{rawQuantity || '—'}</TableCell>
                                    <TableCell>
                                        <Stack spacing={0.5}>
                                            {row.issues
                                                .filter((issue) => issue.severity !== 'SKIPPED')
                                                .map((issue, index) => (
                                                    <Tooltip
                                                        key={`${issue.code}-${index}`}
                                                        title={issue.message}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            fontWeight={600}
                                                            color={issue.severity === 'ERROR' ? 'error.main' : 'warning.main'}
                                                            sx={{ display: 'block' }}
                                                        >
                                                            • {formatPreviewIssueNote(issue)}
                                                        </Typography>
                                                    </Tooltip>
                                                ))}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        {suggestions.length > 0 ? (
                                            <TextField
                                                select
                                                size="small"
                                                label="Chọn đài khớp"
                                                value=""
                                                disabled={busy}
                                                onChange={(event) =>
                                                    onChooseStation(row, Number(event.target.value))
                                                }
                                                sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                            >
                                                {suggestions.map((suggestion) => (
                                                    <MenuItem
                                                        key={suggestion.lotteryStationId}
                                                        value={suggestion.lotteryStationId}
                                                    >
                                                        {suggestion.name}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                Sửa lại tệp nguồn
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Box>
        </Paper>
    );
};

type PreviewGroupProps = {
    group: ImportBatchFileGroup;
    targetDrawDate: string | null;
    busy: boolean;
    importsTickets: boolean;
    mapping: ImportBatchFileMapping | null;
    windowFrom?: string | null;
    windowTo?: string | null;
    onChooseStation: (row: ImportBatchFileRow, lotteryStationId: number) => void;
    onOpenPricing: () => void;
    onOpenSchedule: () => void;
};

const PreviewGroup = ({
    group,
    targetDrawDate,
    busy,
    importsTickets,
    mapping,
    windowFrom,
    windowTo,
    onChooseStation,
    onOpenPricing,
    onOpenSchedule,
}: PreviewGroupProps) => {
    const offWindow = group.status === 'OUT_OF_WINDOW' || !group.drawDate;
    const [openRows, setOpenRows] = useState(offWindow);
    const ticketLines = useMemo(
        () => groupPreviewTicketRows(group.rows ?? [], mapping),
        [group.rows, mapping]
    );
    const showFilePricing = ticketLines.some((line) => {
        const values = readPreviewFileValues(line.row, mapping);
        return Boolean(values.salePrice || values.commission);
    });
    const stationColumn = mapping?.stationColumn ?? '';

    return (
        <Paper
            elevation={0}
            sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                p: 2.5,
                bgcolor: '#ffffff',
                transition: 'all 0.2s',
                '&:hover': {
                    borderColor: '#cbd5e1',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                },
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={1.5}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                {group.drawDate ? formatDate(group.drawDate) : 'Không xác định ngày quay'}
                            </Typography>
                            {group.drawDate === targetDrawDate && group.status === 'IMPORTABLE' ? (
                                <Chip size="small" color="success" label="Sẽ nhập vào phiếu đã chọn" />
                            ) : (
                                <Chip size="small" label="Không nhập vào phiếu đã chọn" />
                            )}
                            {group.status === 'OUT_OF_WINDOW' && (
                                <Chip size="small" label="Ngoài phạm vi hôm nay/ngày mai" sx={{ height: 22, fontSize: '0.75rem' }} />
                            )}
                            {group.status === 'BLOCKED' && (
                                <Chip size="small" color="error" label="Không thể nạp vé" sx={{ height: 22, fontSize: '0.75rem' }} />
                            )}
                        </Stack>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>{group.stations?.length ?? 0}</span> đài ·{' '}
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>{group.ticketCount ?? 0}</span> dãy số ·{' '}
                        khai báo <span style={{ color: '#0f172a', fontWeight: 800 }}>{group.totalDeclareQuantity}</span> vé
                        {(group.totalSerialCount ?? 0) !== group.totalDeclareQuantity && (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}> (nhập {group.totalSerialCount ?? 0})</span>
                        )}
                    </Typography>

                    <Button
                        size="small"
                        variant="text"
                        onClick={() => setOpenRows((prev) => !prev)}
                        endIcon={openRows ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                    >
                        {openRows ? 'Thu gọn' : `Danh sách vé (${ticketLines.length})`}
                    </Button>
                </Stack>
            </Stack>

            <GroupIssuesList
                issues={group.groupIssues}
                onOpenPricing={onOpenPricing}
                onOpenSchedule={onOpenSchedule}
            />


            {/* Expandable Rows Table */}
            <Collapse in={openRows} timeout="auto" unmountOnExit>
                {ticketLines.length > 0 && (
                    <Box sx={{ overflowX: 'auto', mt: 2, border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <Table
                            size="small"
                            sx={{
                                '& .MuiTableCell-root': {
                                    py: 0.85,
                                    px: 1.25,
                                    fontSize: '0.8125rem',
                                    borderColor: '#f1f5f9',
                                },
                                '& .MuiTableHead-root .MuiTableCell-root': {
                                    py: 0.7,
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    color: '#64748b',
                                    bgcolor: '#f8fafc',
                                },
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 56 }}>STT</TableCell>
                                    <TableCell>Đài</TableCell>
                                    <TableCell>Ngày quay</TableCell>
                                    {importsTickets && <TableCell>Dãy số</TableCell>}
                                    <TableCell align="right">Giá nhập</TableCell>
                                    {showFilePricing && <TableCell align="right">Giá bán</TableCell>}
                                    {showFilePricing && <TableCell align="right">HH</TableCell>}
                                    <TableCell>Trạng thái</TableCell>
                                    <TableCell sx={{ minWidth: 180 }}>Ghi chú</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ticketLines.map((line, index) => (
                                    <PreviewRow
                                        key={line.row.rowNumber}
                                        index={index}
                                        line={line}
                                        busy={busy}
                                        importsTickets={importsTickets}
                                        showFilePricing={showFilePricing}
                                        mapping={mapping}
                                        stationColumn={stationColumn}
                                        windowFrom={windowFrom}
                                        windowTo={windowTo}
                                        group={group}
                                        onChooseStation={onChooseStation}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Collapse>
        </Paper>
    );
};

type PreviewRowProps = {
    index: number;
    line: PreviewTicketLine;
    busy: boolean;
    importsTickets: boolean;
    showFilePricing: boolean;
    mapping: ImportBatchFileMapping | null;
    stationColumn: string;
    windowFrom?: string | null;
    windowTo?: string | null;
    /** Needed because a blocked draw date overrides every row's own status. */
    group: ImportBatchFileGroup;
    onChooseStation: (row: ImportBatchFileRow, lotteryStationId: number) => void;
};

const formatCommissionDisplay = (value: string) => {
    if (!value) {
        return '—';
    }
    return value.includes('%') ? value : `${value}%`;
};

const PreviewRow = ({
    index,
    line,
    busy,
    importsTickets,
    showFilePricing,
    mapping,
    stationColumn,
    windowFrom,
    windowTo,
    group,
    onChooseStation,
}: PreviewRowProps) => {
    const [expanded, setExpanded] = useState(false);
    const row = line.row;
    const displayStatus = previewTicketDisplayStatus(line, group);
    const chip = ROW_STATUS_CHIP[displayStatus];
    const suggestions = row.issues.flatMap((issue) => issue.suggestions ?? []);
    const rawStation = (row.rawValues[stationColumn] ?? '').trim();
    const serialEntries = listPreviewSerials(line);
    const errorSerialCount = serialEntries.filter((item) => item.status === 'ERROR').length;
    const matchedStation = (row.stationName ?? '').trim();
    const stationMatchesFile =
        !rawStation || !matchedStation || rawStation.toLowerCase() === matchedStation.toLowerCase();
    const fileValues = readPreviewFileValues(row, mapping);
    const notes = collectPreviewRowNotes(line, group);
    const dateIssue = hasDrawDateIssue(row) || line.attachedRows.some(hasDrawDateIssue);
    const offWindow = isDrawDateOutsideWindow(row.drawDate, windowFrom, windowTo);
    const dateInvalid = !row.drawDate || row.issues.some((issue) => issue.code === 'DRAW_DATE_INVALID');
    const columnCount = 6 + (importsTickets ? 1 : 0) + (showFilePricing ? 2 : 0);
    const canExpand = importsTickets && serialEntries.length > 0;
    const formattedImportCost = formatImportCost(row.importCost);
    const showFileImportCost =
        Boolean(fileValues.importCost)
        && fileValues.importCost.replace(/\s/g, '') !== formattedImportCost.replace(/\s/g, '');

    return (
        <>
            <TableRow
                hover
                sx={{ '& > *': { borderBottom: expanded ? 'unset' : undefined } }}
            >
                <TableCell sx={{ fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {index + 1}
                </TableCell>
                <TableCell sx={{ minWidth: 140 }}>
                    {matchedStation ? (
                        <Stack spacing={0.15}>
                            <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ lineHeight: 1.25 }}>
                                {matchedStation}
                            </Typography>
                            {(fileValues.stationCode || !stationMatchesFile) && (
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                    {[fileValues.stationCode, !stationMatchesFile ? `Tệp: ${rawStation}` : null]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </Typography>
                            )}
                        </Stack>
                    ) : suggestions.length > 0 ? (
                        <TextField
                            select
                            size="small"
                            label="Chọn đài"
                            value=""
                            disabled={busy}
                            onChange={(event) =>
                                onChooseStation(row, Number(event.target.value))
                            }
                            sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                        >
                            {suggestions.map((suggestion) => (
                                <MenuItem
                                    key={suggestion.lotteryStationId}
                                    value={suggestion.lotteryStationId}
                                >
                                    {suggestion.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {rawStation || fileValues.stationName || fileValues.stationCode || '—'}
                        </Typography>
                    )}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography
                        variant="body2"
                        fontWeight={800}
                        color={dateIssue || offWindow || dateInvalid ? '#c2410c' : '#0f172a'}
                    >
                        {row.drawDate ? formatDate(row.drawDate) : 'Không đọc được'}
                    </Typography>
                    {(dateIssue || offWindow || dateInvalid) && (
                        <Typography variant="caption" fontWeight={700} color="#c2410c" sx={{ display: 'block', lineHeight: 1.2 }}>
                            {dateInvalid ? 'Sai / thiếu ngày quay' : `Ngoài hạn ${formatDate(windowFrom ?? undefined)}`}
                        </Typography>
                    )}
                </TableCell>
                {importsTickets && (
                    <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <AdminLuckyDisplay value={row.numbers} ticket sx={{ fontWeight: 800, color: '#0f172a' }} />
                            {canExpand && (
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setExpanded((current) => !current)}
                                    endIcon={expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        minWidth: 0,
                                        px: 0.75,
                                        color: errorSerialCount > 0 ? '#c2410c' : '#64748b',
                                    }}
                                >
                                    {serialEntries.length} sê-ri
                                    {errorSerialCount > 0 ? ` · ${errorSerialCount} lỗi` : ''}
                                </Button>
                            )}
                        </Stack>
                    </TableCell>
                )}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                        {formattedImportCost}
                    </Typography>
                    {showFileImportCost && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                            Tệp: {fileValues.importCost}
                        </Typography>
                    )}
                </TableCell>
                {showFilePricing && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: line.priceVariance ? '#d97706' : undefined }}>
                        {fileValues.salePrice || '—'}
                    </TableCell>
                )}
                {showFilePricing && (
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: line.priceVariance ? '#d97706' : undefined }}>
                        {formatCommissionDisplay(fileValues.commission)}
                    </TableCell>
                )}
                <TableCell>
                    <Chip
                        size="small"
                        color={dateIssue || offWindow || dateInvalid ? 'warning' : chip.color}
                        label={
                            dateInvalid
                                ? 'Sai ngày quay'
                                : dateIssue || offWindow
                                    ? 'Ngoài hạn nhập'
                                    : chip.label
                        }
                        sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                    />
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                    {!notes.short ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                    ) : (
                        <Tooltip title={<Box sx={{ whiteSpace: 'pre-line' }}>{notes.full || notes.short}</Box>}>
                            <Typography
                                variant="caption"
                                color={errorSerialCount > 0 || displayStatus === 'ERROR' || dateIssue || offWindow || dateInvalid ? 'error.main' : 'text.secondary'}
                                sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.35,
                                    fontWeight: 600,
                                }}
                            >
                                {notes.short}
                            </Typography>
                        </Tooltip>
                    )}
                </TableCell>
            </TableRow>

            {canExpand && (
                <TableRow>
                    <TableCell colSpan={columnCount} sx={{ py: 0, borderBottom: expanded ? undefined : 0 }}>
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box
                                sx={{
                                    mx: 1.5,
                                    my: 1.25,
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    bgcolor: '#fff',
                                }}
                            >
                                <Table
                                    size="small"
                                    sx={{
                                        '& .MuiTableCell-root': {
                                            py: 0.85,
                                            px: 1.5,
                                            fontSize: '0.8125rem',
                                            borderColor: '#f1f5f9',
                                        },
                                        '& .MuiTableHead-root .MuiTableCell-root': {
                                            py: 0.7,
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                            color: '#64748b',
                                            bgcolor: '#f8fafc',
                                        },
                                    }}
                                >
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: 44 }}>#</TableCell>
                                            <TableCell>Sê-ri</TableCell>
                                            <TableCell>Đài</TableCell>
                                            <TableCell>Trạng thái</TableCell>
                                            <TableCell>Ghi chú</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {serialEntries.map((entry, serialIndex) => {
                                            const serialChip = ROW_STATUS_CHIP[entry.status];
                                            const serialNotes = entry.issues
                                                .map((issue) => formatPreviewIssueNote(issue))
                                                .join(' · ');
                                            const serialSuggestions = entry.issues.flatMap(
                                                (issue) => issue.suggestions ?? []
                                            );
                                            return (
                                                <TableRow
                                                    key={`${entry.serial}-${entry.sourceRowNumber}-${serialIndex}`}
                                                    sx={{
                                                        bgcolor: entry.status === 'ERROR' ? '#fef2f2' : undefined,
                                                    }}
                                                >
                                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>
                                                        {serialIndex + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                                {entry.serial}
                                                            </Typography>
                                                            {entry.image && (
                                                                <Chip
                                                                    size="small"
                                                                    icon={<ImageOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                                                                    label="Ảnh"
                                                                    component="a"
                                                                    href={entry.image}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    clickable
                                                                    sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        {serialSuggestions.length > 0 ? (
                                                            <TextField
                                                                select
                                                                size="small"
                                                                label="Chọn đài"
                                                                value=""
                                                                disabled={busy}
                                                                onChange={(event) =>
                                                                    onChooseStation(
                                                                        entry.sourceRow,
                                                                        Number(event.target.value)
                                                                    )
                                                                }
                                                                sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                                            >
                                                                {serialSuggestions.map((suggestion) => (
                                                                    <MenuItem
                                                                        key={suggestion.lotteryStationId}
                                                                        value={suggestion.lotteryStationId}
                                                                    >
                                                                        {suggestion.name}
                                                                    </MenuItem>
                                                                ))}
                                                            </TextField>
                                                        ) : (
                                                            <Typography variant="body2" fontWeight={600} color="#334155">
                                                                {entry.stationName || '—'}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            color={serialChip.color}
                                                            label={serialChip.label}
                                                            sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {serialNotes ? (
                                                            <Tooltip
                                                                title={entry.issues.map((issue) => issue.message).join('\n')}
                                                            >
                                                                <Typography
                                                                    variant="caption"
                                                                    fontWeight={600}
                                                                    color={entry.status === 'ERROR' ? 'error.main' : 'text.secondary'}
                                                                >
                                                                    {serialNotes}
                                                                </Typography>
                                                            </Tooltip>
                                                        ) : (
                                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};
