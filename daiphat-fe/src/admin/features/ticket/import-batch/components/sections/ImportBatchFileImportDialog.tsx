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
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
    Alert,
    Badge,
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
    InputAdornment,
    MenuItem,
    Paper,
    Popover,
    Radio,
    RadioGroup,
    Stack,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useActiveSuppliers } from '../../../../supplier';
import {
    commitImportBatchFile,
    inspectImportBatchFile,
    previewImportBatchFile,
    saveImportBatchFileMappingProfile,
    saveLotteryStationAlias,
    uploadImportBatchInvoiceEvidence,
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
import { ImportBatchFileColumnTagger } from './ImportBatchFileColumnTagger';
import { ImportBatchFileConfigDialog } from './ImportBatchFileConfigDialog';
import { ImportBatchFilePricingDialog } from './ImportBatchFilePricingDialog';
import { ImportBatchFileSupplierIdentityPanel } from './ImportBatchFileSupplierIdentityPanel';
import { ImportBatchFileScheduleDialog } from './ImportBatchFileScheduleDialog';
import { ImportBatchFileSupplierDialog } from './ImportBatchFileSupplierDialog';
import { ImportBatchFileMappingProfilePanel } from './ImportBatchFileMappingProfilePanel';
import {
    downloadImportBatchProgressCsv,
    type ImportBatchProgressStationPricing,
} from '../../utils/importBatchProgressExport';
import { formatImportCost } from '../../utils/importCostCalculator';
import {
    collectPreviewRowNotes,
    collectPreviewSerialNotes,
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
    type PreviewTicketLine,
} from '../../utils/importBatchFileImport';
import { ImagePreviewModal } from '@/admin/components/ui/ImagePreview';
import {
    IMPORT_BATCH_FILE_ACCEPT,
    downloadImportBatchFileTemplate,
    type ImportBatchTemplateDay,
    type ImportBatchTemplateIssuer,
} from '../../utils/importBatchFileTemplate';
import { usePublicSystemConfigValues } from '@/client/hooks/usePublicSystemConfigValues';
import { useAuthStore } from '@/stores/useAuthStore';
import { useStationsByDrawDate } from '../../../../station/hooks/useStation';
import { useImportBatchTimePolicy } from '../../hooks/useImportBatch';
import { evaluateImportBatchIntake } from '../../hooks/useImportBatchIntakeGate';
import {
    DEFAULT_RETURN_BUFFER_MINUTES,
    buildImportIntakeClosedMessage,
} from '../../utils/importBatchDrawDate';
import { useImportBatchIntakeGate } from '../../hooks/useImportBatchIntakeGate';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import type { Station } from '../../../../station/types/station.type';

type ImportBatchFileImportDialogProps = {
    open: boolean;
    onClose: () => void;
    onImported?: () => void;
    prefillSupplierId?: number | null;
    prefillBatchId?: number | null;
};

const STEPS = ['Chọn tệp & Nhà cung cấp', 'Gán cột dữ liệu', 'Xem trước & Nạp vé'];

const STEP_SUBTITLES = [
    'Chọn tệp danh sách vé, nhà cung cấp và tải hóa đơn riêng',
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
    DECLARED_QUANTITY_MISMATCH: 'Số lượng khai báo không khớp sê-ri hợp lệ',
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

    return (
        <Stack spacing={1.5}>
            {visible.map((issue, index) => {
                const isError = issue.severity === 'ERROR';
                const isCutoff =
                    issue.code === 'SUPPLIER_RETURN_CUT_OFF_PASSED' ||
                    issue.code === 'SUPPLIER_IMPORT_NOT_ALLOWED';
                const action =
                    issue.code === 'STATION_PRICING_MISMATCH'
                        ? { label: 'Đối chiếu giá', onClick: onOpenPricing }
                        : issue.code === 'STATION_SCHEDULE_MISMATCH'
                          ? { label: 'Sửa lịch quay', onClick: onOpenSchedule }
                          : undefined;

                return (
                    <Paper
                        key={`${issue.code}-${index}`}
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: isError ? '#fef2f2' : '#fffbeb',
                            border: `1px solid ${isError ? '#fee2e2' : '#fef3c7'}`,
                            borderLeft: `4px solid ${isError ? '#ef4444' : '#f59e0b'}`,
                        }}
                    >
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            justifyContent="space-between"
                        >
                            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '8px',
                                        bgcolor: isError ? '#fee2e2' : '#fef3c7',
                                        color: isError ? '#dc2626' : '#d97706',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        mt: 0.25,
                                    }}
                                >
                                    {isCutoff ? (
                                        <AccessTimeIcon sx={{ fontSize: 20 }} />
                                    ) : isError ? (
                                        <ErrorOutlineOutlinedIcon sx={{ fontSize: 20 }} />
                                    ) : (
                                        <WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />
                                    )}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight={800}
                                            color={isError ? '#991b1b' : '#92400e'}
                                            sx={{ fontSize: '0.875rem' }}
                                        >
                                            {GROUP_ISSUE_TITLE[issue.code] ?? issue.message}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={isError ? 'Lỗi chặn nhập' : 'Cảnh báo'}
                                            sx={{
                                                height: 20,
                                                fontSize: '0.65rem',
                                                fontWeight: 800,
                                                bgcolor: isError ? '#fca5a5' : '#fde68a',
                                                color: isError ? '#991b1b' : '#78350f',
                                                borderRadius: '4px',
                                            }}
                                        />
                                    </Stack>
                                    <Typography
                                        variant="body2"
                                        color={isError ? '#7f1d1d' : '#78350f'}
                                        sx={{ mt: 0.5, fontSize: '0.8125rem', lineHeight: 1.45 }}
                                    >
                                        {issue.message}
                                    </Typography>
                                </Box>
                            </Stack>
                            {action?.onClick && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    color={isError ? 'error' : 'warning'}
                                    onClick={action.onClick}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        flexShrink: 0,
                                        boxShadow: 'none',
                                        '&:hover': { boxShadow: 'none' },
                                    }}
                                >
                                    {action.label}
                                </Button>
                            )}
                        </Stack>
                    </Paper>
                );
            })}
        </Stack>
    );
};

const ROW_STATUS_CHIP: Record<
    PreviewDisplayStatus,
    { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
    OK: { label: 'Hợp lệ', color: 'success' },
    WARNING: { label: 'Cần xem lại', color: 'warning' },
    ERROR: { label: 'Không hợp lệ', color: 'error' },
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
}: ImportBatchFileImportDialogProps) => {
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
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
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

    const validFileStations = useMemo(
        () => (preview?.groups ?? []).filter((group) => group.status !== 'OUT_OF_WINDOW' && group.drawDate)
            .flatMap((group) => group.stations),
        [preview]
    );
    const validTicketCount = validFileStations.reduce((sum, station) => sum + station.ticketCount, 0);
    const validSerialCount = validFileStations.reduce((sum, station) => sum + station.serialCount, 0);
    const uniqueStationCount = new Set(validFileStations.map((station) => station.lotteryStationId)).size;
    const hasQuantityMismatch = (preview?.groups ?? []).some((group) =>
        group.status !== 'OUT_OF_WINDOW'
        && group.groupIssues.some((issue) => issue.code === 'DECLARED_QUANTITY_MISMATCH')
    );
    const invoiceDuplicatesTicketFile = Boolean(invoiceFile && file
        && invoiceFile.name === file.name
        && invoiceFile.size === file.size
        && invoiceFile.lastModified === file.lastModified);
    const activeIntakeAlert = selectedSupplier && (todayIntake.blocked || todayIntake.notYetAllowed)
        ? todayIntake : null;
    const blockedSelectedDate = selectedDates.find(isDrawDateIntakeBlocked);
    const blockedSelectedDateIntake = blockedSelectedDate
        ? evaluateIntake(selectedSupplier, blockedSelectedDate)
        : null;
    const commitDisabledReason = busy
        ? null
        : !invoiceFile
            ? 'Vui lòng tải lên tệp hóa đơn riêng trước khi tiến hành nhập.'
            : invoiceDuplicatesTicketFile
                ? 'Tệp hóa đơn phải là tệp riêng, không được trùng với tệp danh sách vé.'
                : hasQuantityMismatch
                    ? 'Số sê-ri hợp lệ phải khớp với số lượng khai báo của từng nhà đài.'
                    : selectedDates.length === 0
                        ? 'Không có ngày quay hợp lệ để nhập.'
                        : blockedSelectedDateIntake?.blocked
                            ? blockedSelectedDateIntake.message
                                ?? 'Kỳ quay đã qua giờ cho phép nhập lô.'
                            : null;

    useEffect(() => {
        if (open && prefillSupplierId != null && prefillSupplierId > 0) {
            setSupplierId(prefillSupplierId);
        }
    }, [open, prefillSupplierId]);

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
                    ? 'Tệp không có dòng nào thuộc ngày quay có thể nhập'
                    : `${drawDateProblem.outOfWindowRows + drawDateProblem.unreadableRows} dòng ngoài phạm vi nhập`,
                detail: [
                    drawDateProblem.outOfWindowRows > 0
                        ? `${drawDateProblem.outOfWindowRows} dòng thuộc ngày ${drawDateProblem.dates}.`
                        : '',
                    drawDateProblem.unreadableRows > 0
                        ? `${drawDateProblem.unreadableRows} dòng không đọc được ngày quay.`
                        : '',
                    'Chỉ ngày quay hôm nay và ngày mai được phép nhập; các ngày khác sẽ được bỏ qua.',
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
    }, [drawDateProblem, pricingMismatches, scheduleMismatches, selectedSupplier, supplierIdentity]);

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
        setInvoiceFile(null);
        setInspectResult(null);
        setMapping(null);
        setPreview(null);
        setSelectedDates([]);
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
        setSelectedDates([]);
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
        if (!file || !effectiveMapping || !supplierId) {
            return;
        }

        setBusy(true);
        try {
            const response = await previewImportBatchFile(file, {
                supplierId,
                mapping: effectiveMapping,
                commitMode: 'AUTO',
            });
            const result = response.data;
            if (!result) {
                toast.error('Không xem trước được tệp.');
                return;
            }
            setPreview(result);
            setMapping(result.appliedMapping);
            const selectableDates = result.groups
                .filter((group) => isGroupSelectable(group))
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

    const handleCommit = async () => {
        if (!preview || !file || !invoiceFile || !supplierId || !mapping
            || invoiceDuplicatesTicketFile || hasQuantityMismatch) {
            toast.warning('Vui lòng chọn tệp vé và tải lên hóa đơn riêng.');
            return;
        }
        if (selectedDates.length === 0) {
            toast.warning('Không có ngày quay hợp lệ để nhập. Vui lòng kiểm tra lỗi trong tệp.');
            return;
        }
        const blockedDate = selectedDates.find(isDrawDateIntakeBlocked);
        if (blockedDate) {
            toast.error(
                evaluateIntake(selectedSupplier, blockedDate).message ??
                    'Đã qua giờ cho phép nhập lô cho kỳ quay hôm nay.'
            );
            return;
        }

        setBusy(true);
        try {
            const invoiceEvidenceUrl = await uploadImportBatchInvoiceEvidence(invoiceFile);
            const response = await commitImportBatchFile(file, {
                supplierId,
                fileHash: preview.fileHash,
                mapping,
                drawDates: selectedDates,
                commitMode: 'AUTO',
                invoiceEvidenceUrl,
            });
            const result = response.data;
            if (!result) {
                toast.error('Không tạo được phiếu nhập từ tệp.');
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

            if (result.failedCount > 0) {
                const failures = result.items
                    .filter((item) => !item.success)
                    .map((item) => `${formatDate(item.drawDate)}: ${item.message ?? item.errorCode}`)
                    .join('; ');
                toast.warning(`Đã tạo ${result.createdCount}/${result.requestedCount} phiếu nhập. ${failures}`);
                return;
            }
            toast.success(`Đã tạo và nhập ${result.createdCount} phiếu nhập lô từ tệp.`);
            onImported?.();
            reset();
            onClose();
        } catch (err: unknown) {
            toast.error(fileImportRequestErrorMessage(err, 'Không nhập được vé từ tệp.'));
        } finally {
            setBusy(false);
        }
    };

    const handleCommitClick = async () => {
        await handleCommit();
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
                                    • <b>Chế độ nhập vé:</b> Hệ thống tạo phiếu nhập và dòng nhà đài theo các vé hợp lệ trong tệp. Hóa đơn được tải lên riêng; tệp Excel là minh chứng danh sách vé nhập. Số lượng khai báo phải khớp số sê-ri hợp lệ.
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
                                    setInvoiceFile(null);
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
                                <Paper
                                    elevation={0}
                                    sx={{
                                        mt: 2,
                                        p: 1.75,
                                        borderRadius: '12px',
                                        bgcolor: activeIntakeAlert.blocked ? '#fef2f2' : '#fffbeb',
                                        border: `1px solid ${activeIntakeAlert.blocked ? '#fee2e2' : '#fef3c7'}`,
                                        borderLeft: `4px solid ${activeIntakeAlert.blocked ? '#ef4444' : '#f59e0b'}`,
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                bgcolor: activeIntakeAlert.blocked ? '#fee2e2' : '#fef3c7',
                                                color: activeIntakeAlert.blocked ? '#dc2626' : '#d97706',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                mt: 0.2,
                                            }}
                                        >
                                            <AccessTimeIcon sx={{ fontSize: 18 }} />
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography
                                                    variant="subtitle2"
                                                    fontWeight={800}
                                                    color={activeIntakeAlert.blocked ? '#991b1b' : '#92400e'}
                                                    sx={{ fontSize: '0.85rem' }}
                                                >
                                                    {activeIntakeAlert.blocked ? 'Đã quá giờ nhận vé' : 'Cảnh báo thời gian nhận vé'}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={activeIntakeAlert.blocked ? 'Chặn nhận vé' : 'Sắp hết giờ'}
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 800,
                                                        bgcolor: activeIntakeAlert.blocked ? '#fca5a5' : '#fde68a',
                                                        color: activeIntakeAlert.blocked ? '#991b1b' : '#78350f',
                                                        borderRadius: '4px',
                                                    }}
                                                />
                                            </Stack>
                                            <Typography
                                                variant="body2"
                                                color={activeIntakeAlert.blocked ? '#7f1d1d' : '#78350f'}
                                                sx={{ mt: 0.25, fontSize: '0.8125rem', lineHeight: 1.4 }}
                                            >
                                                {activeIntakeAlert.message}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                            )}

                            {supplierId > 0 && (
                                <Stack spacing={1} sx={{ mt: 2.5 }}>
                                    <Typography variant="body2" fontWeight={700} color="#334155">
                                        Hóa đơn nhập lô (tệp riêng) *
                                    </Typography>
                                    <Button component="label" variant="outlined" disabled={busy}
                                        startIcon={<UploadFileOutlinedIcon />}
                                        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                                        {invoiceFile ? invoiceFile.name : 'Chọn tệp hóa đơn'}
                                        <input hidden type="file" accept="image/*,.pdf,.xlsx,.xls,.csv"
                                            onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)} />
                                    </Button>
                                    <Typography variant="caption" color="text.secondary">
                                        Tệp Excel danh sách vé được lưu riêng làm minh chứng danh sách vé nhập.
                                    </Typography>
                                    {invoiceDuplicatesTicketFile && (
                                        <Alert severity="error">Hóa đơn phải là tệp riêng, khác tệp danh sách vé.</Alert>
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
                                    bgcolor: file ? '#f0fdf4' : '#f8fafc',
                                    cursor: !supplierId || busy ? 'not-allowed' : 'pointer',
                                    opacity: !supplierId ? 0.6 : 1,
                                    transition: 'all 0.2s',
                                    textAlign: 'center',
                                    '&:hover': !supplierId || busy ? {} : {
                                        borderColor: '#2563eb',
                                        bgcolor: 'rgba(37, 99, 235, 0.04)',
                                    },
                                }}
                            >
                                <input
                                    hidden
                                    type="file"
                                    accept={IMPORT_BATCH_FILE_ACCEPT}
                                    disabled={!supplierId || busy}
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
                                                    : 'Kéo thả tệp hoặc bấm vào đây để chọn'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                Hỗ trợ định dạng Microsoft Excel (.xlsx) hoặc CSV (.csv)
                                            </Typography>
                                        </Box>
                                    </Stack>
                                )}
                            </Box>

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

                        <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Nhà đài trong tệp ({uniqueStationCount})
                                </Typography>
                                <Button variant="outlined" size="small" startIcon={<DownloadOutlinedIcon />}
                                    onClick={() => void downloadImportBatchProgressCsv(preview, mapping, file?.name, {
                                        issuer: templateIssuer,
                                        operatorName,
                                        supplier: templateSupplier || undefined,
                                        stationPricing,
                                    })}>
                                    Xuất đối chiếu
                                </Button>
                            </Stack>
                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                                {preview.groups.filter((group) => group.status !== 'OUT_OF_WINDOW').flatMap((group) =>
                                    group.stations.map((station) => (
                                        <Typography key={`${group.drawDate}-${station.lotteryStationId}`} variant="body2">
                                            {station.stationName} · {formatDate(group.drawDate)} — {station.serialCount.toLocaleString('vi-VN')} vé
                                        </Typography>
                                    ))
                                )}
                            </Stack>
                            {hasQuantityMismatch && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    Số lượng khai báo không khớp số sê-ri hợp lệ. Hãy sửa tệp Excel và tải lại trước khi nhập.
                                </Alert>
                            )}
                        </Paper>

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

                        {/* Preview tickets: Unified Flattened Table with Search, Filters, and Pagination */}
                        <PreviewTicketFlatTable
                            preview={preview}
                            mapping={mapping}
                            selectedDates={selectedDates}
                            busy={busy}
                            importsTickets={preview.importsTickets}
                            onChooseStation={handleChooseStation}
                            onOpenPricing={() => setPricingOpen(true)}
                            onOpenSchedule={() => setScheduleOpen(true)}
                        />

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
                            disabled={busy || !mappingReady}
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
                    <Stack spacing={0.5} alignItems="flex-end">
                        {commitDisabledReason && (
                            <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                                {commitDisabledReason}
                            </Typography>
                        )}
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Button
                                onClick={() => setStep(1)}
                                disabled={busy}
                                startIcon={<ArrowBackIcon />}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Quay lại
                            </Button>
                            <Tooltip title={commitDisabledReason ?? ''} arrow>
                                <span>
                                    <Button
                                        variant="contained"
                                        onClick={() => void handleCommitClick()}
                                        disabled={busy || Boolean(commitDisabledReason)}
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
                                </span>
                            </Tooltip>
                        </Stack>
                    </Stack>
                )}
            </DialogActions>


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


type FlatPreviewSerialRow = {
    id: string;
    serial: string;
    ticketNumbers: string;
    drawDate: string;
    stationName: string;
    stationCode?: string;
    lotteryStationId?: number | null;
    rawStation?: string;
    importCost: string;
    fileImportCost?: string;
    showFileImportCost: boolean;
    salePrice: string;
    commission: string;
    displayStatus: PreviewDisplayStatus;
    shortNote: string;
    fullNote: string;
    image: string | null;
    sourceRow: ImportBatchFileRow;
    suggestions: Array<{ lotteryStationId: number; name: string }>;
    stationMatchesFile: boolean;
    dateIssue: boolean;
    offWindow: boolean;
    dateInvalid: boolean;
};

type PreviewTicketFlatTableProps = {
    preview: ImportBatchFilePreviewResult;
    mapping: ImportBatchFileMapping | null;
    selectedDates: string[];
    busy: boolean;
    importsTickets: boolean;
    onChooseStation: (row: ImportBatchFileRow, lotteryStationId: number) => void;
    onOpenPricing: () => void;
    onOpenSchedule: () => void;
};

const formatCommissionDisplay = (value: string) => {
    if (!value) {
        return '—';
    }
    return value.includes('%') ? value : `${value}%`;
};

const PreviewTicketFlatTable = ({
    preview,
    mapping,
    selectedDates,
    busy,
    importsTickets,
    onChooseStation,
    onOpenPricing,
    onOpenSchedule,
}: PreviewTicketFlatTableProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [stationFilter, setStationFilter] = useState('ALL');
    const [drawDateFilter, setDrawDateFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedErrorDetail, setSelectedErrorDetail] = useState<{ row: FlatPreviewSerialRow; index: number } | null>(null);

    const stationColumn = mapping?.stationColumn ?? '';

    // Collect all group issues across all groups
    const allGroupIssues = useMemo(() => {
        const issuesMap = new Map<string, ImportBatchFileIssue>();
        (preview.groups ?? []).forEach((group) => {
            (group.groupIssues ?? []).forEach((issue) => {
                const key = `${issue.code}-${issue.message}`;
                if (!issuesMap.has(key)) {
                    issuesMap.set(key, issue);
                }
            });
        });
        return Array.from(issuesMap.values());
    }, [preview.groups]);

    // Flatten all serials across all groups
    const flatSerialRows = useMemo(() => {
        if (!preview?.groups) return [];

        const rows: FlatPreviewSerialRow[] = [];

        preview.groups.forEach((group, groupIdx) => {
            const ticketLines = groupPreviewTicketRows(group.rows ?? [], mapping);

            ticketLines.forEach((line, lineIdx) => {
                const row = line.row;
                const rawStation = (row.rawValues[stationColumn] ?? '').trim();
                const matchedStation = (row.stationName ?? '').trim();
                const stationMatchesFile =
                    !rawStation || !matchedStation || rawStation.toLowerCase() === matchedStation.toLowerCase();
                const fileValues = readPreviewFileValues(row, mapping);
                const suggestions = row.issues.flatMap((issue) => issue.suggestions ?? []);
                const dateIssue = hasDrawDateIssue(row) || line.attachedRows.some(hasDrawDateIssue);
                const offWindow = isDrawDateOutsideWindow(row.drawDate, preview.windowFrom, preview.windowTo);
                const dateInvalid = !row.drawDate || row.issues.some((issue) => issue.code === 'DRAW_DATE_INVALID');
                const formattedImportCost = formatImportCost(row.importCost);
                const showFileImportCost =
                    Boolean(fileValues.importCost) &&
                    fileValues.importCost.replace(/\s/g, '') !== formattedImportCost.replace(/\s/g, '');

                const serialEntries = listPreviewSerials(line, group);

                if (serialEntries.length === 0) {
                    const lineStatus = previewTicketDisplayStatus(line, group);
                    const lineNotes = collectPreviewRowNotes(line, group);
                    rows.push({
                        id: `row-${group.drawDate ?? groupIdx}-${row.rowNumber}-${lineIdx}`,
                        serial: '—',
                        ticketNumbers: row.numbers || fileValues.numbers || '—',
                        drawDate: row.drawDate || group.drawDate || '',
                        stationName: matchedStation || rawStation || fileValues.stationName || fileValues.stationCode || '—',
                        stationCode: fileValues.stationCode,
                        lotteryStationId: row.lotteryStationId,
                        rawStation,
                        importCost: formattedImportCost,
                        fileImportCost: fileValues.importCost,
                        showFileImportCost,
                        salePrice: fileValues.salePrice || '—',
                        commission: formatCommissionDisplay(fileValues.commission),
                        displayStatus: lineStatus,
                        shortNote: lineNotes.short,
                        fullNote: lineNotes.full,
                        image: null,
                        sourceRow: row,
                        suggestions,
                        stationMatchesFile,
                        dateIssue,
                        offWindow,
                        dateInvalid,
                    });
                } else {
                    serialEntries.forEach((serialEntry, sIdx) => {
                        const serialNotes = collectPreviewSerialNotes(serialEntry, line, group);
                        const serialSuggestions = serialEntry.issues.flatMap((i) => i.suggestions ?? []);
                        rows.push({
                            id: `row-${group.drawDate ?? groupIdx}-${row.rowNumber}-${lineIdx}-${sIdx}-${serialEntry.serial}`,
                            serial: serialEntry.serial,
                            ticketNumbers: row.numbers || fileValues.numbers || '—',
                            drawDate: row.drawDate || group.drawDate || '',
                            stationName: matchedStation || rawStation || fileValues.stationName || fileValues.stationCode || '—',
                            stationCode: fileValues.stationCode,
                            lotteryStationId: row.lotteryStationId,
                            rawStation,
                            importCost: formattedImportCost,
                            fileImportCost: fileValues.importCost,
                            showFileImportCost,
                            salePrice: fileValues.salePrice || '—',
                            commission: formatCommissionDisplay(fileValues.commission),
                            displayStatus: serialEntry.status,
                            shortNote: serialNotes.short,
                            fullNote: serialNotes.full,
                            image: serialEntry.image,
                            sourceRow: serialEntry.sourceRow,
                            suggestions: serialSuggestions.length > 0 ? serialSuggestions : suggestions,
                            stationMatchesFile,
                            dateIssue,
                            offWindow,
                            dateInvalid,
                        });
                    });
                }
            });
        });

        return rows;
    }, [preview?.groups, mapping, stationColumn, preview?.windowFrom, preview?.windowTo]);

    // Check if any row has sale price or commission
    const showFilePricing = useMemo(
        () => flatSerialRows.some((r) => Boolean(r.salePrice && r.salePrice !== '—') || Boolean(r.commission && r.commission !== '—')),
        [flatSerialRows]
    );

    // Filter options
    const stationFilterOptions = useMemo(() => {
        const set = new Set<string>();
        flatSerialRows.forEach((r) => {
            if (r.stationName && r.stationName !== '—') set.add(r.stationName);
        });
        return Array.from(set).sort();
    }, [flatSerialRows]);

    const drawDateFilterOptions = useMemo(() => {
        const set = new Set<string>();
        flatSerialRows.forEach((r) => {
            if (r.drawDate) set.add(r.drawDate);
        });
        return Array.from(set).sort();
    }, [flatSerialRows]);

    const activeFilterCount =
        (stationFilter !== 'ALL' ? 1 : 0) +
        (drawDateFilter !== 'ALL' ? 1 : 0) +
        (statusFilter !== 'ALL' ? 1 : 0);

    // Filtered rows
    const filteredRows = useMemo(() => {
        return flatSerialRows.filter((row) => {
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const matchesTicket = row.ticketNumbers.toLowerCase().includes(q);
                const matchesSerial = row.serial.toLowerCase().includes(q);
                if (!matchesTicket && !matchesSerial) return false;
            }

            if (stationFilter !== 'ALL') {
                if (row.stationName !== stationFilter && row.rawStation !== stationFilter) {
                    return false;
                }
            }

            if (drawDateFilter !== 'ALL') {
                if (row.drawDate !== drawDateFilter) {
                    return false;
                }
            }

            if (statusFilter === 'VALID') {
                if (row.displayStatus !== 'OK' || row.dateIssue || row.offWindow || row.dateInvalid) {
                    return false;
                }
            } else if (statusFilter === 'INVALID') {
                if (row.displayStatus === 'OK' && !row.dateIssue && !row.offWindow && !row.dateInvalid) {
                    return false;
                }
            }

            return true;
        });
    }, [flatSerialRows, searchQuery, stationFilter, drawDateFilter, statusFilter]);

    // Paginated rows
    const paginatedRows = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredRows.slice(start, start + rowsPerPage);
    }, [filteredRows, page, rowsPerPage]);

    const handleClearAllFilters = () => {
        setSearchQuery('');
        setStationFilter('ALL');
        setDrawDateFilter('ALL');
        setStatusFilter('ALL');
        setPage(0);
    };

    return (
        <Stack spacing={2}>
            {selectedDates.length === 0 && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: '12px',
                        bgcolor: '#fef2f2',
                        border: '1px solid #fee2e2',
                        borderLeft: '4px solid #ef4444',
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '8px',
                                bgcolor: '#fee2e2',
                                color: '#dc2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                mt: 0.25,
                            }}
                        >
                            <ErrorOutlineOutlinedIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                                <Typography variant="subtitle2" fontWeight={800} color="#991b1b" sx={{ fontSize: '0.875rem' }}>
                                    Tệp không có vé hợp lệ cho ngày quay được phép nhập
                                </Typography>
                                <Chip
                                    size="small"
                                    label="Không thể nạp vé"
                                    sx={{
                                        height: 20,
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        bgcolor: '#fca5a5',
                                        color: '#991b1b',
                                        borderRadius: '4px',
                                    }}
                                />
                            </Stack>
                            <Typography variant="body2" color="#7f1d1d" sx={{ mt: 0.5, fontSize: '0.8125rem', lineHeight: 1.45 }}>
                                Tệp không có vé hợp lệ cho ngày quay được phép nhập. Vui lòng kiểm tra ngày quay, lịch nhà đài và số lượng trong tệp.
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            )}

            {allGroupIssues.length > 0 && (
                <GroupIssuesList
                    issues={allGroupIssues}
                    onOpenPricing={onOpenPricing}
                    onOpenSchedule={onOpenSchedule}
                />
            )}

            {/* Header Toolbar: Search + Filter */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                }}
            >
                <Stack spacing={1.5}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        justifyContent="space-between"
                    >
                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ flex: 1, maxWidth: { md: 580 } }}
                        >
                            <TextField
                                size="small"
                                fullWidth
                                placeholder="Tìm kiếm dãy số, số serial..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(0);
                                }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: searchQuery ? (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setPage(0);
                                                    }}
                                                >
                                                    <CloseIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    },
                                }}
                                sx={{
                                    bgcolor: '#ffffff',
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                        fontSize: '0.875rem',
                                    },
                                }}
                            />

                            <Button
                                variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
                                color={activeFilterCount > 0 ? 'primary' : 'inherit'}
                                size="medium"
                                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                                startIcon={
                                    <Badge badgeContent={activeFilterCount} color="error">
                                        <FilterListIcon fontSize="small" />
                                    </Badge>
                                }
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    borderColor: '#cbd5e1',
                                    color: activeFilterCount > 0 ? '#ffffff' : '#334155',
                                    minWidth: '105px',
                                    height: '40px',
                                    flexShrink: 0,
                                }}
                            >
                                Bộ lọc
                            </Button>
                        </Stack>

                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                            Hiển thị <span style={{ color: '#0f172a', fontWeight: 800 }}>{filteredRows.length.toLocaleString('vi-VN')}</span> / {flatSerialRows.length.toLocaleString('vi-VN')} vé
                        </Typography>
                    </Stack>

                    {/* Active Filter Chips */}
                    {(activeFilterCount > 0 || searchQuery) && (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                            {searchQuery && (
                                <Chip
                                    size="small"
                                    label={`Tìm kiếm: "${searchQuery}"`}
                                    onDelete={() => {
                                        setSearchQuery('');
                                        setPage(0);
                                    }}
                                    sx={{ borderRadius: '6px', bgcolor: '#f1f5f9', fontWeight: 600 }}
                                />
                            )}
                            {stationFilter !== 'ALL' && (
                                <Chip
                                    size="small"
                                    label={`Nhà đài: ${stationFilter}`}
                                    onDelete={() => {
                                        setStationFilter('ALL');
                                        setPage(0);
                                    }}
                                    sx={{ borderRadius: '6px', bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}
                                />
                            )}
                            {drawDateFilter !== 'ALL' && (
                                <Chip
                                    size="small"
                                    label={`Lịch quay: ${formatDate(drawDateFilter)}`}
                                    onDelete={() => {
                                        setDrawDateFilter('ALL');
                                        setPage(0);
                                    }}
                                    sx={{ borderRadius: '6px', bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}
                                />
                            )}
                            {statusFilter !== 'ALL' && (
                                <Chip
                                    size="small"
                                    label={`Trạng thái: ${statusFilter === 'VALID' ? 'Hợp lệ' : 'Không hợp lệ'}`}
                                    onDelete={() => {
                                        setStatusFilter('ALL');
                                        setPage(0);
                                    }}
                                    sx={{
                                        borderRadius: '6px',
                                        bgcolor: statusFilter === 'VALID' ? '#f0fdf4' : '#fef2f2',
                                        color: statusFilter === 'VALID' ? '#15803d' : '#b91c1c',
                                        fontWeight: 600,
                                    }}
                                />
                            )}
                            <Button
                                size="small"
                                variant="text"
                                onClick={handleClearAllFilters}
                                sx={{ textTransform: 'none', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}
                            >
                                Xóa tất cả
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Paper>

            {/* Filter Popover */}
            <Popover
                open={Boolean(filterAnchorEl)}
                anchorEl={filterAnchorEl}
                onClose={() => setFilterAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{
                    paper: {
                        sx: {
                            p: 2.5,
                            width: 320,
                            borderRadius: '14px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0',
                        },
                    },
                }}
            >
                <Stack spacing={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                            Bộ lọc danh sách vé
                        </Typography>
                        {activeFilterCount > 0 && (
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => {
                                    setStationFilter('ALL');
                                    setDrawDateFilter('ALL');
                                    setStatusFilter('ALL');
                                    setPage(0);
                                }}
                                sx={{ textTransform: 'none', fontSize: '0.75rem', p: 0 }}
                            >
                                Đặt lại
                            </Button>
                        )}
                    </Stack>

                    <Divider />

                    {/* 1. Nhà đài */}
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block' }}>
                            Nhà đài
                        </Typography>
                        <TextField
                            select
                            size="small"
                            fullWidth
                            value={stationFilter}
                            onChange={(e) => {
                                setStationFilter(e.target.value);
                                setPage(0);
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                        >
                            <MenuItem value="ALL">Tất cả nhà đài</MenuItem>
                            {stationFilterOptions.map((station) => (
                                <MenuItem key={station} value={station}>
                                    {station}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    {/* 2. Lịch quay */}
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block' }}>
                            Lịch quay
                        </Typography>
                        <TextField
                            select
                            size="small"
                            fullWidth
                            value={drawDateFilter}
                            onChange={(e) => {
                                setDrawDateFilter(e.target.value);
                                setPage(0);
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                        >
                            <MenuItem value="ALL">Tất cả lịch quay</MenuItem>
                            {drawDateFilterOptions.map((date) => (
                                <MenuItem key={date} value={date}>
                                    {formatDate(date)}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    {/* 3. Trạng thái */}
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ mb: 0.5, display: 'block' }}>
                            Trạng thái
                        </Typography>
                        <TextField
                            select
                            size="small"
                            fullWidth
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value as any);
                                setPage(0);
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                        >
                            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                            <MenuItem value="VALID">Hợp lệ</MenuItem>
                            <MenuItem value="INVALID">Không hợp lệ</MenuItem>
                        </TextField>
                    </Box>

                    <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        onClick={() => setFilterAnchorEl(null)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', mt: 1 }}
                    >
                        Đóng
                    </Button>
                </Stack>
            </Popover>

            {/* Table */}
            <Paper
                elevation={0}
                sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    bgcolor: '#ffffff',
                    overflow: 'hidden',
                }}
            >
                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table
                        size="small"
                        stickyHeader
                        sx={{
                            '& .MuiTableCell-root': {
                                py: 1,
                                px: 1.5,
                                fontSize: '0.8125rem',
                                borderColor: '#f1f5f9',
                            },
                            '& .MuiTableHead-root .MuiTableCell-root': {
                                py: 1,
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
                                <TableCell sx={{ width: 52, textAlign: 'center' }}>STT</TableCell>
                                <TableCell sx={{ minWidth: 105 }}>Dãy số</TableCell>
                                <TableCell sx={{ minWidth: 115 }}>Sê-ri</TableCell>
                                <TableCell sx={{ minWidth: 130 }}>Nhà đài</TableCell>
                                <TableCell sx={{ minWidth: 105 }}>Ngày quay</TableCell>
                                <TableCell align="right" sx={{ minWidth: 95 }}>Giá bán</TableCell>
                                <TableCell align="right" sx={{ minWidth: 85 }}>Hoa hồng</TableCell>
                                <TableCell align="right" sx={{ minWidth: 95 }}>Giá nhập</TableCell>
                                <TableCell sx={{ minWidth: 105, textAlign: 'center' }}>Trạng thái</TableCell>
                                <TableCell sx={{ minWidth: 100, textAlign: 'center' }}>Chi tiết</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedRows.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={10}
                                        sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}
                                    >
                                        Không tìm thấy vé nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRows.map((row, idx) => {
                                    const globalIndex = page * rowsPerPage + idx + 1;
                                    const isRowError =
                                        row.displayStatus === 'BLOCKED' ||
                                        row.displayStatus === 'ERROR' ||
                                        row.dateInvalid ||
                                        row.sourceRow.issues.some((i) => i.severity === 'ERROR');

                                    const hasIssue =
                                        isRowError ||
                                        row.displayStatus === 'WARNING' ||
                                        row.dateIssue ||
                                        row.offWindow ||
                                        Boolean(row.shortNote) ||
                                        Boolean(row.fullNote) ||
                                        row.sourceRow.issues.length > 0;

                                    return (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{
                                                bgcolor: isRowError ? 'rgba(254, 242, 242, 0.4)' : undefined,
                                            }}
                                        >
                                            {/* 1. STT */}
                                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                                                {globalIndex}
                                            </TableCell>

                                            {/* 2. Dãy số */}
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                <AdminLuckyDisplay
                                                    value={row.ticketNumbers}
                                                    ticket
                                                    sx={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}
                                                />
                                            </TableCell>

                                            {/* 3. Sê-ri */}
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                <Stack direction="row" spacing={0.75} alignItems="center">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}
                                                    >
                                                        {row.serial}
                                                    </Typography>
                                                    {row.image && (
                                                        <Chip
                                                            size="small"
                                                            icon={<ImageOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                                            label="Ảnh"
                                                            clickable
                                                            onClick={() => setPreviewImage(row.image)}
                                                            sx={{ height: 20, fontWeight: 700, fontSize: '0.675rem' }}
                                                        />
                                                    )}
                                                </Stack>
                                            </TableCell>

                                            {/* 4. Nhà đài */}
                                            <TableCell>
                                                {row.stationName && row.stationName !== '—' ? (
                                                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                                                        <Box
                                                            sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                px: 1,
                                                                py: 0.3,
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                bgcolor: 'rgba(37, 99, 235, 0.08)',
                                                                color: '#1d4ed8',
                                                                border: '1px solid rgba(37, 99, 235, 0.2)',
                                                            }}
                                                        >
                                                            {row.stationName}
                                                        </Box>
                                                        {(!row.stationMatchesFile && row.rawStation) && (
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                                Tệp: {row.rawStation}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                ) : row.suggestions.length > 0 ? (
                                                    <TextField
                                                        select
                                                        size="small"
                                                        label="Chọn đài"
                                                        value=""
                                                        disabled={busy}
                                                        onChange={(event) =>
                                                            onChooseStation(row.sourceRow, Number(event.target.value))
                                                        }
                                                        sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                                    >
                                                        {row.suggestions.map((suggestion) => (
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
                                                        {row.rawStation || '—'}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* 5. Ngày quay */}
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    color={row.dateIssue || row.offWindow || row.dateInvalid ? '#c2410c' : '#334155'}
                                                >
                                                    {row.drawDate ? formatDate(row.drawDate) : 'Không đọc được'}
                                                </Typography>
                                                {(row.dateIssue || row.offWindow || row.dateInvalid) && (
                                                    <Typography variant="caption" fontWeight={700} color="#c2410c" sx={{ display: 'block', lineHeight: 1.2, fontSize: '0.7rem' }}>
                                                        {row.dateInvalid ? 'Sai / thiếu ngày quay' : 'Ngoài hạn nhập'}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* 6. Giá bán */}
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                    {row.salePrice || '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* 7. Hoa hồng */}
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={800} color="#2563eb">
                                                    {row.commission || '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* 8. Giá nhập */}
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                    {row.importCost || '—'}
                                                </Typography>
                                                {row.showFileImportCost && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, fontSize: '0.7rem' }}>
                                                        Tệp: {row.fileImportCost}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* 9. Trạng thái */}
                                            <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {row.dateInvalid ? (
                                                    <Chip
                                                        size="small"
                                                        color="warning"
                                                        label="Sai ngày quay"
                                                        sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                                                    />
                                                ) : row.dateIssue || row.offWindow ? (
                                                    <Chip
                                                        size="small"
                                                        color="warning"
                                                        label="Ngoài hạn nhập"
                                                        sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                                                    />
                                                ) : (
                                                    <Chip
                                                        size="small"
                                                        color={ROW_STATUS_CHIP[row.displayStatus]?.color ?? 'default'}
                                                        label={ROW_STATUS_CHIP[row.displayStatus]?.label ?? 'Bỏ qua'}
                                                        sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                                                    />
                                                )}
                                            </TableCell>

                                            {/* 10. Chi tiết */}
                                            <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                {hasIssue ? (
                                                    <Tooltip title={isRowError ? 'Nhấp để xem chi tiết lỗi' : 'Nhấp để xem chi tiết lưu ý'} arrow>
                                                        <Box
                                                            component="button"
                                                            type="button"
                                                            onClick={() => setSelectedErrorDetail({ row, index: globalIndex - 1 })}
                                                            sx={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 0.5,
                                                                px: 1.25,
                                                                py: 0.35,
                                                                borderRadius: '20px',
                                                                border: '1px solid',
                                                                fontSize: '0.725rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                outline: 'none',
                                                                transition: 'all 0.15s ease-in-out',
                                                                bgcolor: isRowError ? '#fef2f2' : '#fffbeb',
                                                                borderColor: isRowError ? '#fca5a5' : '#fde68a',
                                                                color: isRowError ? '#dc2626' : '#b45309',
                                                                '&:hover': {
                                                                    bgcolor: isRowError ? '#fee2e2' : '#fef3c7',
                                                                    borderColor: isRowError ? '#f87171' : '#f59e0b',
                                                                    transform: 'translateY(-1px)',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                                                },
                                                            }}
                                                        >
                                                            {isRowError ? (
                                                                <ErrorOutlineOutlinedIcon sx={{ fontSize: 13 }} />
                                                            ) : (
                                                                <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} />
                                                            )}
                                                            <span>{isRowError ? 'Chi tiết lỗi' : 'Lưu ý'}</span>
                                                        </Box>
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="body2" color="text.disabled">—</Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination matching ticket warehouse style */}
                <TablePagination
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    component="div"
                    count={filteredRows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="Số dòng mỗi trang:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} trên ${count}`}
                    sx={{
                        borderTop: '1px solid #f1f5f9',
                        '& .MuiTablePagination-toolbar': { minHeight: 48, px: 2 },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.75rem',
                            fontWeight: 600,
                        },
                    }}
                />
            </Paper>

            {/* Modal Chi tiết lỗi & kiểm định vé */}
            {selectedErrorDetail && (() => {
                const { row, index } = selectedErrorDetail;
                const isError =
                    row.displayStatus === 'BLOCKED' ||
                    row.displayStatus === 'ERROR' ||
                    row.dateInvalid ||
                    row.sourceRow.issues.some((i) => i.severity === 'ERROR');

                const issues = row.sourceRow.issues;
                const notes = row.fullNote || row.shortNote;

                return (
                    <Dialog
                        open={Boolean(selectedErrorDetail)}
                        onClose={() => setSelectedErrorDetail(null)}
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{
                            sx: {
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            },
                        }}
                    >
                        <DialogTitle
                            sx={{
                                p: 2,
                                bgcolor: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Stack direction="row" spacing={1.25} alignItems="center">
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        bgcolor: isError ? '#dc2626' : '#d97706',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: 800,
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    #{index + 1}
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.2 }}>
                                        {isError ? 'Chi tiết lỗi vé' : 'Chi tiết lưu ý vé'} #{index + 1}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Thông tin kiểm định và lý do không hợp lệ từ tệp nhập
                                    </Typography>
                                </Box>
                            </Stack>
                            <IconButton
                                size="small"
                                onClick={() => setSelectedErrorDetail(null)}
                                sx={{ color: '#64748b' }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </DialogTitle>

                        <DialogContent sx={{ p: 2.5 }}>
                            <Stack spacing={2.5}>
                                {/* Top alert banner */}
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        bgcolor: isError ? '#fef2f2' : '#fffbeb',
                                        border: `1px solid ${isError ? '#fecaca' : '#fef3c7'}`,
                                        borderLeft: `4px solid ${isError ? '#ef4444' : '#f59e0b'}`,
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '6px',
                                                bgcolor: isError ? '#fee2e2' : '#fef3c7',
                                                color: isError ? '#dc2626' : '#d97706',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                mt: 0.2,
                                            }}
                                        >
                                            {isError ? (
                                                <ErrorOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                                            ) : (
                                                <WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />
                                            )}
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color={isError ? '#991b1b' : '#92400e'}>
                                                {isError ? 'Vé không đủ điều kiện nhập' : 'Vé có cảnh báo cần lưu ý'}
                                            </Typography>
                                            <Typography variant="body2" color={isError ? '#7f1d1d' : '#78350f'} sx={{ mt: 0.25, fontSize: '0.8125rem' }}>
                                                {notes || (isError ? 'Dữ liệu vé không hợp lệ hoặc bị chặn nhập.' : 'Dữ liệu vé có lưu ý đối chiếu.')}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Box>

                                {/* Ticket info grid */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        bgcolor: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={800} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 1.5 }}>
                                        Thông tin vé
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                            gap: 1.5,
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Dãy số</Typography>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ fontFamily: 'monospace' }}>
                                                {row.ticketNumbers}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Số sê-ri</Typography>
                                            <Typography variant="body2" fontWeight={700} color="#334155" sx={{ fontFamily: 'monospace' }}>
                                                {row.serial}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Nhà đài</Typography>
                                            <Box sx={{ mt: 0.25 }}>
                                                <Box
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        px: 1,
                                                        py: 0.25,
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        bgcolor: 'rgba(37, 99, 235, 0.08)',
                                                        color: '#1d4ed8',
                                                        border: '1px solid rgba(37, 99, 235, 0.2)',
                                                    }}
                                                >
                                                    {row.stationName}
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Ngày quay</Typography>
                                            <Typography variant="body2" fontWeight={700} color="#334155">
                                                {row.drawDate ? formatDate(row.drawDate) : 'Không xác định'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Giá bán</Typography>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                {row.salePrice || '—'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Hoa hồng</Typography>
                                            <Typography variant="body2" fontWeight={800} color="#2563eb">
                                                {row.commission || '—'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Giá nhập</Typography>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                {row.importCost || '—'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">Trạng thái dòng</Typography>
                                            <Typography variant="body2" fontWeight={700} color={isError ? '#dc2626' : '#16a34a'}>
                                                {ROW_STATUS_CHIP[row.displayStatus]?.label ?? row.displayStatus}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>

                                {/* Issue Breakdown Details */}
                                <Box>
                                    <Typography variant="caption" fontWeight={800} color="#64748b" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 1 }}>
                                        Chi tiết các vấn đề phát hiện
                                    </Typography>
                                    <Stack spacing={1}>
                                        {row.dateInvalid && (
                                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #fee2e2' }}>
                                                <Typography variant="body2" fontWeight={700} color="#dc2626">
                                                    Sai hoặc thiếu ngày quay
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Ngày quay trong dòng tệp không đọc được hoặc không hợp lệ.
                                                </Typography>
                                            </Paper>
                                        )}
                                        {(row.dateIssue || row.offWindow) && (
                                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #fef3c7' }}>
                                                <Typography variant="body2" fontWeight={700} color="#d97706">
                                                    Ngày quay ngoài hạn nhập
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Ngày quay không nằm trong phạm vi được phép nhập từ tệp.
                                                </Typography>
                                            </Paper>
                                        )}
                                        {issues.map((issue, iIdx) => (
                                            <Paper key={iIdx} elevation={0} sx={{ p: 1.5, borderRadius: '8px', bgcolor: '#fff', border: `1px solid ${issue.severity === 'ERROR' ? '#fee2e2' : '#fef3c7'}` }}>
                                                <Typography variant="body2" fontWeight={700} color={issue.severity === 'ERROR' ? '#dc2626' : '#d97706'}>
                                                    {GROUP_ISSUE_TITLE[issue.code] ?? issue.code}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {issue.message}
                                                </Typography>
                                            </Paper>
                                        ))}
                                        {!row.dateInvalid && !row.dateIssue && !row.offWindow && issues.length === 0 && (
                                            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #e2e8f0' }}>
                                                <Typography variant="body2" fontWeight={700} color="#334155">
                                                    {row.shortNote || 'Không có mã lỗi cụ thể'}
                                                </Typography>
                                                {row.fullNote && row.fullNote !== row.shortNote && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {row.fullNote}
                                                    </Typography>
                                                )}
                                            </Paper>
                                        )}
                                    </Stack>
                                </Box>
                            </Stack>
                        </DialogContent>

                        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <Button
                                variant="contained"
                                onClick={() => setSelectedErrorDetail(null)}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                            >
                                Đóng
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
            })()}

            {/* Image Preview Modal */}
            {previewImage && (
                <ImagePreviewModal
                    open={Boolean(previewImage)}
                    onClose={() => setPreviewImage(null)}
                    src={previewImage}
                    alt="Ảnh vé số"
                    dialogTitle="Chi tiết ảnh vé số"
                />
            )}
        </Stack>
    );
};
