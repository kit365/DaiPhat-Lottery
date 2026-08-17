"use client";

import { useCallback, useMemo, useState } from 'react';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Step,
    StepConnector,
    stepConnectorClasses,
    StepLabel,
    Stepper,
    Tooltip,
    styled,
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
    commitImportBatchFile,
    inspectImportBatchFile,
    previewImportBatchFile,
    saveImportBatchFileMappingProfile,
    saveLotteryStationAlias,
    uploadImportBatchInvoiceEvidence,
    uploadImportBatchTicketListImage,
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
import { useImportBatchTimePolicy } from '../../hooks/useImportBatch';
import { evaluateImportBatchIntake } from '../../hooks/useImportBatchIntakeGate';
import { DEFAULT_RETURN_BUFFER_MINUTES } from '../../utils/importBatchDrawDate';
import { useImportBatchIntakeGate } from '../../hooks/useImportBatchIntakeGate';
import { AdminLuckyDisplay } from '@/shared/lucky-number';
import type { Station } from '../../../../station/types/station.type';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import type { Accept } from 'react-dropzone';

const IMPORT_EVIDENCE_ACCEPT: Accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    'application/pdf': ['.pdf'],
    'text/csv': ['.csv'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
};

type ImportBatchFileImportDialogProps = {
    open: boolean;
    onClose: () => void;
    onImported?: () => void;
};

const STEPS = ['Chọn tệp & Nhà cung cấp', 'Gán cột dữ liệu', 'Xem trước & Tạo phiếu'];

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
    NO_VALID_ROW: 'Không có dòng hợp lệ để tạo phiếu',
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

const CustomStepConnector = styled(StepConnector)(() => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
        top: 18,
    },
    [`& .${stepConnectorClasses.line}`]: {
        height: 2,
        border: 0,
        backgroundColor: '#e2e8f0',
        borderRadius: 1,
    },
    [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: {
        backgroundColor: '#FF3030',
    },
    [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
        backgroundColor: '#10b981',
    },
}));

export const ImportBatchFileImportDialog = ({
    open,
    onClose,
    onImported,
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
    const [supplierId, setSupplierId] = useState<number>(0);
    const [file, setFile] = useState<File | null>(null);
    const [inspectResult, setInspectResult] = useState<ImportBatchFileInspectResult | null>(null);
    const [mapping, setMapping] = useState<ImportBatchFileMapping | null>(null);
    const [preview, setPreview] = useState<ImportBatchFilePreviewResult | null>(null);
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [forceCreateDates, setForceCreateDates] = useState<string[]>([]);
    const [rememberMapping, setRememberMapping] = useState(true);
    const [configOpen, setConfigOpen] = useState(false);
    const [pricingOpen, setPricingOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [supplierEditOpen, setSupplierEditOpen] = useState(false);
    const [profileRefreshToken, setProfileRefreshToken] = useState(0);
    const [invoiceEvidenceUrl, setInvoiceEvidenceUrl] = useState('');
    const [ticketListEvidenceUrl, setTicketListEvidenceUrl] = useState('');
    const [useOriginalFileAsTicketListEvidence, setUseOriginalFileAsTicketListEvidence] = useState(true);
    const [isInvoiceUploading, setIsInvoiceUploading] = useState(false);
    const [isTicketListUploading, setIsTicketListUploading] = useState(false);

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
            today: formatDate(preview?.windowFrom),
            until: formatDate(preview?.windowTo),
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
                    ? `Tệp không có dòng nào trong phạm vi tạo phiếu (${drawDateProblem.today} – ${drawDateProblem.until})`
                    : `${drawDateProblem.outOfWindowRows + drawDateProblem.unreadableRows} dòng nằm ngoài phạm vi tạo phiếu`,
                detail: [
                    drawDateProblem.outOfWindowRows > 0
                        ? `${drawDateProblem.outOfWindowRows} dòng thuộc ngày ${drawDateProblem.dates}.`
                        : '',
                    drawDateProblem.unreadableRows > 0
                        ? `${drawDateProblem.unreadableRows} dòng không đọc được ngày quay.`
                        : '',
                    `Chỉ tạo được phiếu cho hôm nay (${drawDateProblem.today}) hoặc ngày mai (${drawDateProblem.until}).`,
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
                detail: 'Phiếu nhập được tính tiền theo cấu hình đài, nên phải thống nhất giá trước khi tạo phiếu.',
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
        (importsTickets || !!mapping?.quantityColumn) &&
        !!(mapping?.drawDateColumn || mapping?.fallbackDrawDate);

    const reset = () => {
        setStep(0);
        setBusy(false);
        setFile(null);
        setInspectResult(null);
        setMapping(null);
        setPreview(null);
        setSelectedDates([]);
        setForceCreateDates([]);
        setInvoiceEvidenceUrl('');
        setTicketListEvidenceUrl('');
        setUseOriginalFileAsTicketListEvidence(true);
        setIsInvoiceUploading(false);
        setIsTicketListUploading(false);
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
        if (!file || !effectiveMapping || !supplierId) {
            return;
        }

        setBusy(true);
        try {
            const response = await previewImportBatchFile(file, {
                supplierId,
                mapping: effectiveMapping,
            });
            const result = response.data;
            if (!result) {
                toast.error('Không xem trước được tệp.');
                return;
            }
            setPreview(result);
            setMapping(result.appliedMapping);
            setSelectedDates(
                result.groups.filter(isGroupSelectable).map((group) => group.drawDate as string)
            );
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
        if (!preview || !file || !supplierId || !mapping) {
            return;
        }
        if (selectedDates.length === 0) {
            toast.warning('Chưa chọn ngày quay nào để tạo phiếu.');
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
        if (!invoiceEvidenceUrl.trim()) {
            toast.warning('Vui lòng tải lên tệp / ảnh biên lai nhập trước khi tạo phiếu.');
            return;
        }
        if (isInvoiceUploading || isTicketListUploading) {
            toast.warning('Đang tải tệp chứng từ — vui lòng đợi hoàn tất.');
            return;
        }

        setBusy(true);
        try {
            const ticketListImageUrls = ticketListEvidenceUrl.trim()
                ? [ticketListEvidenceUrl.trim()]
                : [];
            const response = await commitImportBatchFile(file, {
                supplierId,
                fileHash: preview.fileHash,
                mapping,
                drawDates: selectedDates,
                forceCreateDrawDates: forceCreateDates,
                invoiceEvidenceUrl: invoiceEvidenceUrl.trim(),
                ticketListImageUrls,
                useOriginalFileAsTicketListEvidence,
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
                    `Đã tạo ${result.createdCount}/${result.requestedCount} phiếu. ${failures}`
                );
            } else if (shortfall.length > 0) {
                toast.warning(
                    `Đã tạo ${result.createdCount} phiếu. Có ${shortfall.length} phiếu nhập chưa đủ vé, hãy hoàn tất ở màn hình nhập vé.`
                );
            } else {
                toast.success(`Đã tạo ${result.createdCount} phiếu nhập lô vé từ tệp.`);
            }

            onImported?.();
            reset();
            onClose();
        } catch (err: unknown) {
            toast.error(fileImportRequestErrorMessage(err, 'Không tạo được phiếu nhập từ tệp.'));
        } finally {
            setBusy(false);
        }
    };

    const updateMapping = (patch: Partial<ImportBatchFileMapping>) => {
        setMapping((current) => (current ? { ...current, ...patch } : current));
    };

    const toggleDate = (drawDate: string) => {
        setSelectedDates((current) =>
            current.includes(drawDate)
                ? current.filter((value) => value !== drawDate)
                : [...current, drawDate]
        );
    };

    const toggleForceCreate = (drawDate: string) => {
        setForceCreateDates((current) =>
            current.includes(drawDate)
                ? current.filter((value) => value !== drawDate)
                : [...current, drawDate]
        );
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '20px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    px: 3,
                    py: 2.5,
                    borderBottom: '1px solid #f1f5f9',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Stack direction="row" spacing={1.75} alignItems="center">
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: '#fef2f2',
                            color: '#FF3030',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(255, 48, 48, 0.15)',
                        }}
                    >
                        <UploadFileOutlinedIcon fontSize="medium" />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                            Nhập lô vé từ tệp
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.85rem' }}>
                            Tải lên tệp Excel (.xlsx) hoặc CSV để tự động tạo phiếu và nhập kho vé
                        </Typography>
                    </Box>
                </Stack>

                <IconButton
                    size="small"
                    onClick={handleClose}
                    disabled={busy}
                    sx={{
                        color: '#94a3b8',
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        '&:hover': { bgcolor: '#f1f5f9', color: '#334155' },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#f8fafc' }}>
                {/* Stepper */}
                <Box
                    sx={{
                        mb: 3.5,
                        p: 2.5,
                        bgcolor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                >
                    <Stepper activeStep={step} connector={<CustomStepConnector />}>
                        {STEPS.map((label, idx) => {
                            const isCompleted = step > idx;
                            const isActive = step === idx;
                            return (
                                <Step key={label}>
                                    <StepLabel
                                        StepIconComponent={() => (
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: '0.875rem',
                                                    color: isCompleted || isActive ? '#ffffff' : '#64748b',
                                                    bgcolor: isCompleted
                                                        ? '#10b981'
                                                        : isActive
                                                          ? '#FF3030'
                                                          : '#f1f5f9',
                                                    border: isActive ? '2px solid #fee2e2' : 'none',
                                                    boxShadow: isActive ? '0 0 0 4px rgba(255, 48, 48, 0.15)' : 'none',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {isCompleted ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : idx + 1}
                                            </Box>
                                        )}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: isActive ? 800 : 600,
                                                color: isActive ? '#0f172a' : '#64748b',
                                            }}
                                        >
                                            {label}
                                        </Typography>
                                    </StepLabel>
                                </Step>
                            );
                        })}
                    </Stepper>
                </Box>

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
                                    • <b>Phạm vi ngày quay:</b> Nhập từ tệp chỉ tạo phiếu cho <b>ngày quay hôm nay</b>, và phải trước giờ kiểm vé chuẩn bị trả của nhà cung cấp. Ngày đã qua hoặc chưa tới sẽ bị bỏ qua — tệp cho ngày mai hãy tải lại vào đúng ngày đó.<br />
                                    • <b>Chế độ nhập vé:</b> Nếu tệp có cột <b>dãy số</b> và <b>danh sách sê-ri</b> (phân cách bằng dấu <b>;</b>), hệ thống sẽ tạo phiếu và nhập luôn vé vào kho. Nếu chỉ có cột <b>số lượng</b> thì hệ thống sẽ tạo phiếu khai báo trước.
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
                                onChange={(event) => setSupplierId(Number(event.target.value))}
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

                            {supplierId > 0 && (todayIntake.blocked || todayIntake.notYetAllowed) && (
                                <Alert severity={todayIntake.blocked ? 'error' : 'warning'} sx={{ mt: 2 }}>
                                    {todayIntake.message}
                                </Alert>
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
                                    bgcolor: file ? '#f0fdf4' : !supplierId ? '#f8fafc' : '#f8fafc',
                                    cursor: !supplierId || busy ? 'not-allowed' : 'pointer',
                                    opacity: !supplierId ? 0.6 : 1,
                                    transition: 'all 0.2s',
                                    textAlign: 'center',
                                    '&:hover': !supplierId || busy ? {} : {
                                        borderColor: '#FF3030',
                                        bgcolor: '#fef2f2',
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
                                        <CircularProgress size={36} sx={{ color: '#FF3030' }} />
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
                                                bgcolor: '#fee2e2',
                                                color: '#FF3030',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <CloudUploadOutlinedIcon fontSize="large" />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                                {!supplierId ? 'Vui lòng chọn nhà cung cấp trước' : 'Kéo thả tệp hoặc bấm vào đây để chọn'}
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
                                            : `Gộp 2 ngày quay: ${yesterdayTemplateDay.drawDate} (${yesterdayTemplateDay.stations.length} đài) và ${todayTemplateDay.drawDate} (${todayTemplateDay.stations.length} đài). Ngày hôm qua nằm ngoài phạm vi tạo phiếu nên sẽ bị bỏ qua khi nhập.`
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
                                p: 2.5,
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
                            <Chip
                                icon={importsTickets ? <CheckCircleIcon /> : <InfoOutlinedIcon />}
                                color={importsTickets ? 'success' : 'primary'}
                                label={
                                    importsTickets
                                        ? 'Chế độ nhập vé đầy đủ (có dãy số & sê-ri)'
                                        : 'Chế độ khai báo số lượng (nhập vé tay sau)'
                                }
                                sx={{ fontWeight: 700, borderRadius: '8px', py: 1.75 }}
                            />
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

                        {/* Additional Options */}
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
                                Cấu hình phụ trợ
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                                    gap: 2.5,
                                }}
                            >
                                {!mapping.drawDateColumn && (
                                    <TextField
                                        type="date"
                                        label="Ngày quay áp dụng cho cả tệp"
                                        InputLabelProps={{ shrink: true }}
                                        helperText="Dùng khi tệp không có cột ngày quay"
                                        value={mapping.fallbackDrawDate ?? ''}
                                        onChange={(event) =>
                                            updateMapping({
                                                fallbackDrawDate: event.target.value || null,
                                            })
                                        }
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                    />
                                )}

                                <TextField
                                    label="Dấu phân cách trong ô"
                                    helperText="Dùng để đọc nhiều giá trị trong 1 ô (VD: abc;1;abc2;abc3, ...)"
                                    value={mapping.serialSeparator ?? ';'}
                                    onChange={(event) =>
                                        updateMapping({ serialSeparator: event.target.value || ';' })
                                    }
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
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                >
                                    <MenuItem value="AUTO">Tự động nhận diện</MenuItem>
                                    <MenuItem value="VN">Kiểu Việt Nam (VD: 10.000 hoặc 1.000.000,5)</MenuItem>
                                    <MenuItem value="EN">Kiểu Quốc tế (VD: 10,000 hoặc 1,000,000.5)</MenuItem>
                                </TextField>
                            </Box>
                        </Paper>
                    </Stack>
                )}

                {/* ── STEP 2: Xem trước & Tạo phiếu ── */}
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
                                    Tổng số dòng
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                    {preview.totalRows}
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
                                    Hợp lệ
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#15803d" sx={{ mt: 0.5 }}>
                                    {preview.importableRows}
                                </Typography>
                            </Paper>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    border: '1px solid #fed7aa',
                                    bgcolor: '#fff7ed',
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} color="#ea580c">
                                    Bỏ qua (ngoài hạn)
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#c2410c" sx={{ mt: 0.5 }}>
                                    {preview.skippedRows}
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
                                    Dòng lỗi
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#b91c1c" sx={{ mt: 0.5 }}>
                                    {preview.errorRows}
                                </Typography>
                            </Paper>
                        </Box>

                        {/* Top Action & Notice */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
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
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                    Phạm vi tạo phiếu hợp lệ: {formatDate(preview.windowFrom)} → {formatDate(preview.windowTo)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                    {preview.importsTickets
                                        ? 'Tệp có dữ liệu sê-ri: Hệ thống sẽ tự động nhập vé vào kho sau khi tạo phiếu.'
                                        : 'Tệp chỉ khai báo: Hệ thống chỉ tạo phiếu với số lượng khai báo.'}
                                </Typography>
                            </Box>

                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<FactCheckOutlinedIcon />}
                                onClick={() =>
                                    void downloadImportBatchProgressCsv(preview, mapping, file?.name, {
                                        // The same two parties the uploaded delivery
                                        // note names, so the reconciliation copy can
                                        // be filed beside it.
                                        issuer: templateIssuer,
                                        // The person who ran the preview is the one
                                        // vouching for what this document says, so the
                                        // signature line names them rather than
                                        // leaving a blank to be filled in by hand.
                                        operatorName,
                                        supplier: templateSupplier || undefined,
                                        stationPricing,
                                    })
                                }
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderColor: '#cbd5e1',
                                    color: '#334155',
                                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                                }}
                            >
                                Xuất bảng đối chiếu
                            </Button>
                        </Paper>

                        {/* Anomalies Table */}
                        <AnomalyTable
                            anomalies={collectAnomalies(preview.groups)}
                            mapping={mapping}
                            busy={busy}
                            hideEmptySuccess={previewNotices.length > 0 || !!supplierMatchedLabel}
                            onChooseStation={handleChooseStation}
                        />

                        {/* Groups Accordion Cards */}
                        <Stack spacing={2}>
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                Danh sách phiếu nhập theo ngày quay ({preview.groups.length})
                            </Typography>
                            {preview.groups.map((group, index) => (
                                <PreviewGroup
                                    key={group.drawDate ?? `undated-${index}`}
                                    group={group}
                                    selected={!!group.drawDate && selectedDates.includes(group.drawDate)}
                                    forceCreate={!!group.drawDate && forceCreateDates.includes(group.drawDate)}
                                    busy={busy}
                                    importsTickets={preview.importsTickets}
                                    mapping={mapping}
                                    windowFrom={preview.windowFrom}
                                    windowTo={preview.windowTo}
                                    onToggle={() => group.drawDate && toggleDate(group.drawDate)}
                                    onToggleForceCreate={() =>
                                        group.drawDate && toggleForceCreate(group.drawDate)
                                    }
                                    onChooseStation={handleChooseStation}
                                    onOpenPricing={() => setPricingOpen(true)}
                                    onOpenSchedule={() => setScheduleOpen(true)}
                                />
                            ))}
                        </Stack>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 0.5 }}>
                                Chứng từ đính kèm phiếu nhập
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                Tải biên lai và danh sách vé (ảnh hoặc tệp PDF/Excel/CSV) — dùng chung cho mọi ngày
                                quay được chọn. Không cần chụp lại nếu đã có file từ NCC.
                            </Typography>
                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 1 }}>
                                        Biên lai nhập *
                                    </Typography>
                                    <UploadSingleFile
                                        label="Tải tệp / ảnh biên lai"
                                        value={invoiceEvidenceUrl}
                                        onChange={(url) =>
                                            setInvoiceEvidenceUrl(typeof url === 'string' ? url : '')
                                        }
                                        autoUpload
                                        required
                                        accept={IMPORT_EVIDENCE_ACCEPT}
                                        customUpload={uploadImportBatchInvoiceEvidence}
                                        onUploadingChange={setIsInvoiceUploading}
                                        disabled={busy}
                                        maxFileSizeMb={15}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 1 }}>
                                        Danh sách vé nhập
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={useOriginalFileAsTicketListEvidence}
                                                onChange={(event) =>
                                                    setUseOriginalFileAsTicketListEvidence(event.target.checked)
                                                }
                                                disabled={busy}
                                                sx={{ color: '#FF3030', '&.Mui-checked': { color: '#FF3030' } }}
                                            />
                                        }
                                        label={
                                            <Typography variant="body2" color="#475569">
                                                Dùng tệp đang nhập (CSV/Excel) làm danh sách vé đính kèm phiếu
                                            </Typography>
                                        }
                                        sx={{ mb: 1, ml: 0 }}
                                    />
                                    <UploadSingleFile
                                        label="Tải thêm tệp / ảnh danh sách vé (tuỳ chọn)"
                                        value={ticketListEvidenceUrl}
                                        onChange={(url) =>
                                            setTicketListEvidenceUrl(typeof url === 'string' ? url : '')
                                        }
                                        autoUpload
                                        accept={IMPORT_EVIDENCE_ACCEPT}
                                        customUpload={uploadImportBatchTicketListImage}
                                        onUploadingChange={setIsTicketListUploading}
                                        disabled={busy}
                                        maxFileSizeMb={15}
                                    />
                                </Box>
                            </Stack>
                        </Paper>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                bgcolor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={rememberMapping}
                                        onChange={(event) => setRememberMapping(event.target.checked)}
                                        sx={{ color: '#FF3030', '&.Mui-checked': { color: '#FF3030' } }}
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
            </DialogContent>

            {/* Footer Actions */}
            <DialogActions
                sx={{
                    px: 3,
                    py: 2.25,
                    borderTop: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                }}
            >
                <Button
                    onClick={handleClose}
                    disabled={busy}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#64748b',
                        borderRadius: '10px',
                        px: 2.5,
                        '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                >
                    Hủy bỏ
                </Button>

                <Stack direction="row" spacing={1.5}>
                    {step === 1 && (
                        <>
                            <Button
                                onClick={() => setStep(0)}
                                disabled={busy}
                                startIcon={<ArrowBackIcon />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    color: '#334155',
                                    borderRadius: '10px',
                                    px: 2.5,
                                    border: '1px solid #cbd5e1',
                                }}
                            >
                                Chọn lại tệp
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => runPreview()}
                                disabled={busy || !mappingReady}
                                endIcon={busy ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    borderRadius: '10px',
                                    px: 3,
                                    bgcolor: '#FF3030',
                                    color: '#ffffff',
                                    boxShadow: '0 4px 12px rgba(255, 48, 48, 0.25)',
                                    '&:hover': { bgcolor: '#e02828' },
                                }}
                            >
                                Xem trước
                            </Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Button
                                onClick={() => setStep(1)}
                                disabled={busy}
                                startIcon={<ArrowBackIcon />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    color: '#334155',
                                    borderRadius: '10px',
                                    px: 2.5,
                                    border: '1px solid #cbd5e1',
                                }}
                            >
                                Sửa gán cột
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleCommit}
                                disabled={
                                    busy
                                    || selectedDates.length === 0
                                    || selectedDates.some(isDrawDateIntakeBlocked)
                                    || !invoiceEvidenceUrl.trim()
                                    || isInvoiceUploading
                                    || isTicketListUploading
                                }
                                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    borderRadius: '10px',
                                    px: 3.5,
                                    bgcolor: '#FF3030',
                                    color: '#ffffff',
                                    boxShadow: '0 4px 12px rgba(255, 48, 48, 0.25)',
                                    '&:hover': { bgcolor: '#e02828' },
                                }}
                            >
                                Tạo {selectedDates.length} phiếu nhập
                            </Button>
                        </>
                    )}
                </Stack>
            </DialogActions>

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
                    ? `${errorCount} dòng bị lỗi sẽ không được tạo phiếu cho tới khi bạn chọn đúng nhà đài hoặc sửa tệp.`
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
                            <TableCell sx={{ fontWeight: 800 }}>Xử lý / Gán đài</TableCell>
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
    selected: boolean;
    forceCreate: boolean;
    busy: boolean;
    importsTickets: boolean;
    mapping: ImportBatchFileMapping | null;
    windowFrom?: string | null;
    windowTo?: string | null;
    onToggle: () => void;
    onToggleForceCreate: () => void;
    onChooseStation: (row: ImportBatchFileRow, lotteryStationId: number) => void;
    onOpenPricing: () => void;
    onOpenSchedule: () => void;
};

const PreviewGroup = ({
    group,
    selected,
    forceCreate,
    busy,
    importsTickets,
    mapping,
    windowFrom,
    windowTo,
    onToggle,
    onToggleForceCreate,
    onChooseStation,
    onOpenPricing,
    onOpenSchedule,
}: PreviewGroupProps) => {
    const offWindow = group.status === 'OUT_OF_WINDOW' || !group.drawDate;
    const [openRows, setOpenRows] = useState(offWindow);
    const selectable = isGroupSelectable(group);
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
                    <Checkbox
                        checked={selected}
                        disabled={!selectable || busy}
                        onChange={onToggle}
                        sx={{ color: '#FF3030', '&.Mui-checked': { color: '#FF3030' } }}
                    />
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                {group.drawDate ? formatDate(group.drawDate) : 'Không xác định ngày quay'}
                            </Typography>
                            {group.status === 'OUT_OF_WINDOW' && (
                                <Chip size="small" label="Ngoài phạm vi hôm nay/ngày mai" sx={{ height: 22, fontSize: '0.75rem' }} />
                            )}
                            {group.status === 'BLOCKED' && (
                                <Chip size="small" color="error" label="Không thể tạo" sx={{ height: 22, fontSize: '0.75rem' }} />
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

            {group.existingEditableBatchId && (
                <FormControlLabel
                    sx={{ mt: 1 }}
                    control={
                        <Checkbox
                            checked={forceCreate}
                            disabled={busy}
                            onChange={onToggleForceCreate}
                            sx={{ color: '#FF3030', '&.Mui-checked': { color: '#FF3030' } }}
                        />
                    }
                    label={
                        <Typography variant="caption" fontWeight={700} color="warning.main">
                            Đã có phiếu nhập cho ngày này. Đánh dấu để tiếp tục tạo thêm phiếu mới.
                        </Typography>
                    }
                />
            )}

            {/* Stations batch summary table */}
            {group.status !== 'OUT_OF_WINDOW' && (group.stations?.length ?? 0) > 0 && (
                <Box sx={{ overflowX: 'auto', mt: 2, border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800 }}>Nhà đài dự kiến tạo</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>Dãy số</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>Vé khai báo</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>Vé nhập được</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>Giá vốn/vé</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800 }}>Tổng tiền dự kiến</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {group.stations.map((station) => (
                                <TableRow key={station.lotteryStationId} hover>
                                    <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{station.stationName ?? '—'}</TableCell>
                                    <TableCell align="right">{station.ticketCount}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>{station.declaredQuantity}</TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            color: station.serialCount < station.declaredQuantity ? 'warning.main' : 'success.main',
                                            fontWeight: 800,
                                        }}
                                    >
                                        {station.serialCount}
                                    </TableCell>
                                    <TableCell align="right">{formatImportCost(station.importCost)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                        {formatImportCost(station.declaredCostValue)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}

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
