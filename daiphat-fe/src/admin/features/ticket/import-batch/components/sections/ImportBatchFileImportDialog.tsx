"use client";

import { useMemo, useState, useCallback } from 'react';
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
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Link,
    MenuItem,
    Paper,
    Stack,
    Step,
    StepConnector,
    stepConnectorClasses,
    StepLabel,
    Stepper,
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
import { ADMIN_DIALOG_ACTIONS_SX } from '../../../../../components/ui/AdminConfirmDialog';
import { Button as LoadingButton } from '../../../../../components/ui/Button';
import { useActiveSuppliers } from '../../../../supplier';
import {
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
    ImportBatchFilePricingMismatch,
} from '../../types/importBatch.type';
import { mappingImportsTickets } from '../../types/importBatch.type';
import { ImportBatchFileColumnTagger } from './ImportBatchFileColumnTagger';
import { ImportBatchFileConfigDialog } from './ImportBatchFileConfigDialog';
import { ImportBatchFilePricingDialog } from './ImportBatchFilePricingDialog';
import { ImportBatchFileMappingProfilePanel } from './ImportBatchFileMappingProfilePanel';
import { downloadImportBatchProgressCsv } from '../../utils/importBatchProgressExport';
import { formatImportCost } from '../../utils/importCostCalculator';
import {
    collectAnomalies,
    isGroupSelectable,
    type ImportBatchFileAnomaly,
} from '../../utils/importBatchFileImport';
import {
    IMPORT_BATCH_FILE_ACCEPT,
    downloadImportBatchFileTemplate,
} from '../../utils/importBatchFileTemplate';
import { useEligibleImportBatchStations } from '../../hooks/useImportBatch';
import { useImportBatchIntakeGate } from '../../hooks/useImportBatchIntakeGate';
import { AdminLuckyDisplay } from '@/shared/lucky-number';

type ImportBatchFileImportDialogProps = {
    open: boolean;
    onClose: () => void;
    onImported?: () => void;
};

const STEPS = ['Chọn tệp & Nhà cung cấp', 'Gán cột dữ liệu', 'Xem trước & Tạo phiếu'];

const formatDate = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY') : '—');

const ROW_STATUS_CHIP: Record<
    ImportBatchFileRow['status'],
    { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
    OK: { label: 'Hợp lệ', color: 'success' },
    WARNING: { label: 'Cần xem lại', color: 'warning' },
    ERROR: { label: 'Lỗi', color: 'error' },
    SKIPPED: { label: 'Bỏ qua', color: 'default' },
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
    // Pre-fills the downloadable template with the stations actually drawing today,
    // so the operator can type straight into it instead of looking codes up.
    const { data: eligibleStations } = useEligibleImportBatchStations(
        dayjs().format('YYYY-MM-DD'),
        'IN_DAY'
    );

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
    const [profileRefreshToken, setProfileRefreshToken] = useState(0);

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
        (drawDate?: string | null) => {
            if (!drawDate || !selectedSupplier) {
                return false;
            }
            return evaluateIntake(selectedSupplier, drawDate).blocked;
        },
        [evaluateIntake, selectedSupplier]
    );

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
        } catch {
            toast.error('Không đọc được tệp. Vui lòng kiểm tra định dạng .csv hoặc .xlsx.');
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
                result.groups
                    .filter(isGroupSelectable)
                    .map((group) => group.drawDate as string)
                    .filter((drawDate) => !isDrawDateIntakeBlocked(drawDate))
            );
            setStep(2);
        } catch {
            toast.error('Không xem trước được tệp. Vui lòng kiểm tra lại cấu hình cột.');
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

        setBusy(true);
        try {
            const response = await commitImportBatchFile(file, {
                supplierId,
                fileHash: preview.fileHash,
                mapping,
                drawDates: selectedDates,
                forceCreateDrawDates: forceCreateDates,
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
        } catch {
            toast.error('Không tạo được phiếu nhập từ tệp.');
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
            onClose={busy ? undefined : handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                className: 'admin-theme',
                sx: {
                    borderRadius: '16px',
                    boxShadow: 'var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header */}
            <DialogTitle
                component="div"
                sx={{
                    m: 0,
                    px: 2.5,
                    py: 2,
                    borderBottom: '1px solid #f1f5f9',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                }}
            >
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: '#fef2f2',
                            color: '#FF3030',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <UploadFileOutlinedIcon fontSize="small" />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                            Nhập lô vé từ tệp
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Excel (.xlsx) hoặc CSV
                        </Typography>
                    </Box>
                </Stack>

                <IconButton
                    onClick={handleClose}
                    disabled={busy}
                    aria-label="Đóng"
                    size="small"
                    sx={{ color: 'text.secondary', flexShrink: 0 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    px: { xs: 2, md: 2.5 },
                    pb: { xs: 2, md: 2.5 },
                    pt: '20px !important',
                    bgcolor: '#f8fafc',
                }}
            >
                {/* Stepper */}
                <Box
                    sx={{
                        mb: 2,
                        px: { xs: 1, sm: 2 },
                        py: 1.5,
                        bgcolor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
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
                                                fontWeight: isActive ? 700 : 500,
                                                color: isActive ? '#0f172a' : '#64748b',
                                                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
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
                    <Stack spacing={2}>
                        <Alert
                            severity="info"
                            icon={<InfoOutlinedIcon fontSize="small" />}
                            sx={{
                                borderRadius: '10px',
                                py: 0.75,
                                '& .MuiAlert-message': { fontSize: '0.8125rem', lineHeight: 1.5 },
                            }}
                        >
                            Chỉ nhập kỳ quay <strong>hôm nay</strong> và <strong>ngày mai</strong>.
                            Tệp có dãy số + sê-ri sẽ nhập vé luôn; chỉ có số lượng thì tạo phiếu khai báo trước.
                        </Alert>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Stack spacing={2}>
                                <TextField
                                    select
                                    required
                                    size="small"
                                    label="Nhà cung cấp"
                                    value={supplierId || ''}
                                    onChange={(event) => setSupplierId(Number(event.target.value))}
                                    fullWidth
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            bgcolor: '#ffffff',
                                        },
                                    }}
                                >
                                    {activeSuppliers.map((supplier) => (
                                        <MenuItem key={supplier.id} value={supplier.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography fontWeight={600} fontSize="0.875rem">
                                                    {supplier.name}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={supplier.code}
                                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                                />
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {(todayIntake.blocked || todayIntake.notYetAllowed) && (
                                    <Alert severity={todayIntake.blocked ? 'error' : 'warning'} sx={{ py: 0 }}>
                                        {todayIntake.message}
                                    </Alert>
                                )}

                                <Box
                                    component="label"
                                    sx={{
                                        border: '1.5px dashed #cbd5e1',
                                        borderRadius: '10px',
                                        px: 2,
                                        py: 1.75,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        bgcolor: file ? '#f0fdf4' : '#f8fafc',
                                        cursor: !supplierId || busy ? 'not-allowed' : 'pointer',
                                        opacity: !supplierId ? 0.55 : 1,
                                        transition: 'border-color 0.2s, background-color 0.2s',
                                        '&:hover': !supplierId || busy
                                            ? {}
                                            : { borderColor: '#FF3030', bgcolor: '#fef2f2' },
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
                                        <>
                                            <CircularProgress size={22} sx={{ color: '#FF3030', flexShrink: 0 }} />
                                            <Typography variant="body2" fontWeight={600} color="#475569">
                                                Đang phân tích tệp...
                                            </Typography>
                                        </>
                                    ) : file ? (
                                        <>
                                            <Box
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '8px',
                                                    bgcolor: '#dcfce7',
                                                    color: '#16a34a',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <InsertDriveFileOutlinedIcon fontSize="small" />
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    color="#0f172a"
                                                    noWrap
                                                >
                                                    {file.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {(file.size / 1024).toFixed(1)} KB · Bấm để đổi tệp
                                                </Typography>
                                            </Box>
                                        </>
                                    ) : (
                                        <>
                                            <Box
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '8px',
                                                    bgcolor: '#fee2e2',
                                                    color: '#FF3030',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <CloudUploadOutlinedIcon fontSize="small" />
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                    {!supplierId
                                                        ? 'Chọn nhà cung cấp trước khi tải tệp'
                                                        : 'Chọn tệp Excel (.xlsx) hoặc CSV'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Kéo thả hoặc bấm để chọn từ máy
                                                </Typography>
                                            </Box>
                                        </>
                                    )}
                                </Box>

                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<DownloadOutlinedIcon />}
                                        onClick={() =>
                                            void downloadImportBatchFileTemplate(
                                                (eligibleStations?.eligible ?? []).map((station) => ({
                                                    name: station.name,
                                                    price: station.price,
                                                    commissionRate: station.commissionRate,
                                                }))
                                            )
                                        }
                                        sx={{
                                            borderRadius: '8px',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.8125rem',
                                        }}
                                    >
                                        Tải mẫu tệp
                                    </Button>
                                    <Button
                                        variant="text"
                                        size="small"
                                        startIcon={<SettingsOutlinedIcon />}
                                        onClick={() => setConfigOpen(true)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            fontSize: '0.8125rem',
                                            color: '#64748b',
                                        }}
                                    >
                                        Quy tắc đọc tệp
                                    </Button>
                                </Stack>

                                {supplierId > 0 && (
                                    <ImportBatchFileMappingProfilePanel
                                        supplierId={supplierId}
                                        refreshToken={profileRefreshToken}
                                    />
                                )}
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
                        {pricingMismatches.length > 0 && (
                            <Alert
                                severity="error"
                                sx={{ borderRadius: '12px' }}
                                action={
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="error"
                                        onClick={() => setPricingOpen(true)}
                                        sx={{ textTransform: 'none', fontWeight: 700 }}
                                    >
                                        Đối chiếu giá
                                    </Button>
                                }
                            >
                                <Typography variant="body2" fontWeight={700}>
                                    {pricingMismatches.length} nhà đài có giá lệch giữa tệp và hệ thống
                                </Typography>
                                <Typography variant="caption">
                                    Phiếu nhập được tính tiền theo cấu hình đài, nên phải thống nhất giá
                                    trước khi tạo phiếu. Chi tiết từng đài xem ở cảnh báo của mỗi ngày quay
                                    bên dưới.
                                </Typography>
                            </Alert>
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
                                onClick={() => downloadImportBatchProgressCsv(preview, mapping, file?.name)}
                                sx={{
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderColor: '#cbd5e1',
                                    color: '#334155',
                                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                                }}
                            >
                                Xuất bảng đối chiếu CSV
                            </Button>
                        </Paper>

                        {/* Anomalies Table */}
                        <AnomalyTable
                            anomalies={collectAnomalies(preview.groups)}
                            mapping={mapping}
                            busy={busy}
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
                                    stationColumn={mapping?.stationColumn ?? ''}
                                    onToggle={() => group.drawDate && toggleDate(group.drawDate)}
                                    onToggleForceCreate={() =>
                                        group.drawDate && toggleForceCreate(group.drawDate)
                                    }
                                    onChooseStation={handleChooseStation}
                                />
                            ))}
                        </Stack>

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
            <DialogActions sx={ADMIN_DIALOG_ACTIONS_SX}>
                {step === 1 && (
                    <>
                        <LoadingButton
                            variant="outlined"
                            color="inherit"
                            onClick={() => setStep(0)}
                            disabled={busy}
                            startIcon={<ArrowBackIcon />}
                            label="Chọn lại tệp"
                        />
                        <LoadingButton
                            variant="contained"
                            className="btn-primary-admin"
                            onClick={() => runPreview()}
                            disabled={!mappingReady}
                            loading={busy}
                            endIcon={!busy ? <ArrowForwardIcon /> : undefined}
                            label="Xem trước"
                        />
                    </>
                )}

                {step === 2 && (
                    <>
                        <LoadingButton
                            variant="outlined"
                            color="inherit"
                            onClick={() => setStep(1)}
                            disabled={busy}
                            startIcon={<ArrowBackIcon />}
                            label="Sửa gán cột"
                        />
                        <LoadingButton
                            variant="contained"
                            className="btn-primary-admin"
                            onClick={handleCommit}
                            disabled={selectedDates.length === 0 || selectedDates.some(isDrawDateIntakeBlocked)}
                            loading={busy}
                            startIcon={!busy ? <CheckCircleIcon /> : undefined}
                            label={`Tạo ${selectedDates.length} phiếu nhập`}
                        />
                    </>
                )}
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
        </Dialog>
    );
};

type AnomalyTableProps = {
    anomalies: ImportBatchFileAnomaly[];
    mapping: ImportBatchFileMapping | null;
    busy: boolean;
    onChooseStation: (row: ImportBatchFileRow, lotteryStationId: number) => void;
};

const AnomalyTable = ({ anomalies, mapping, busy, onChooseStation }: AnomalyTableProps) => {
    if (anomalies.length === 0) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    borderRadius: '14px',
                    border: '1px solid #bbf7d0',
                    bgcolor: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                <CheckCircleIcon sx={{ color: '#16a34a' }} />
                <Typography variant="body2" fontWeight={700} color="#15803d">
                    Dữ liệu hoàn hảo! Tất cả nhà đài, ngày quay và số lượng vé đều hợp lệ và khớp chuẩn với hệ thống.
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
                                                    <Typography
                                                        key={`${issue.code}-${index}`}
                                                        variant="caption"
                                                        fontWeight={600}
                                                        color={issue.severity === 'ERROR' ? 'error.main' : 'warning.main'}
                                                    >
                                                        • {issue.message}
                                                    </Typography>
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
    stationColumn: string;
    onToggle: () => void;
    onToggleForceCreate: () => void;
    onChooseStation: (row: ImportBatchFileRow, lotteryStationId: number) => void;
};

const PreviewGroup = ({
    group,
    selected,
    forceCreate,
    busy,
    importsTickets,
    stationColumn,
    onToggle,
    onToggleForceCreate,
    onChooseStation,
}: PreviewGroupProps) => {
    const [openRows, setOpenRows] = useState(false);
    const selectable = isGroupSelectable(group);

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
                        {openRows ? 'Thu gọn' : 'Chi tiết dòng'}
                    </Button>
                </Stack>
            </Stack>

            {group.groupIssues.map((issue, index) => (
                <Alert
                    key={`${issue.code}-${index}`}
                    severity={
                        issue.severity === 'ERROR'
                            ? 'error'
                            : issue.severity === 'WARNING'
                              ? 'warning'
                              : 'info'
                    }
                    sx={{ mt: 1.5, borderRadius: '10px' }}
                >
                    {issue.message}
                </Alert>
            ))}

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
                {group.status !== 'OUT_OF_WINDOW' && (
                    <Box sx={{ overflowX: 'auto', mt: 2, border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    {importsTickets && <TableCell sx={{ width: 44 }} />}
                                    <TableCell sx={{ fontWeight: 800 }}>Dòng</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Tên đài tệp</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Khớp hệ thống</TableCell>
                                    {importsTickets && <TableCell sx={{ fontWeight: 800 }}>Dãy số</TableCell>}
                                    <TableCell align="right" sx={{ fontWeight: 800 }}>Khai báo</TableCell>
                                    {importsTickets && <TableCell align="right" sx={{ fontWeight: 800 }}>Sê-ri</TableCell>}
                                    <TableCell sx={{ fontWeight: 800 }}>Trạng thái</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Ghi chú</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {group.rows.map((row) => (
                                    <PreviewRow
                                        key={row.rowNumber}
                                        row={row}
                                        busy={busy}
                                        importsTickets={importsTickets}
                                        stationColumn={stationColumn}
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
    row: ImportBatchFileRow;
    busy: boolean;
    importsTickets: boolean;
    stationColumn: string;
    onChooseStation: (row: ImportBatchFileRow, lotteryStationId: number) => void;
};

const PreviewRow = ({
    row,
    busy,
    importsTickets,
    stationColumn,
    onChooseStation,
}: PreviewRowProps) => {
    const [expanded, setExpanded] = useState(false);
    const chip = ROW_STATUS_CHIP[row.status];
    const suggestions = row.issues.flatMap((issue) => issue.suggestions ?? []);
    const rawStation = row.rawValues[stationColumn] ?? '';
    const serials = row.serialNumbers ?? [];
    const columnCount = importsTickets ? 9 : 6;

    return (
        <>
            <TableRow hover sx={{ '& > *': { borderBottom: expanded ? 'unset' : undefined } }}>
                {importsTickets && (
                    <TableCell sx={{ width: 44 }}>
                        {serials.length > 0 && (
                            <IconButton
                                size="small"
                                aria-label={expanded ? 'Thu gọn sê-ri' : 'Xem sê-ri'}
                                onClick={() => setExpanded((current) => !current)}
                                sx={{ color: '#64748b' }}
                            >
                                {expanded ? (
                                    <KeyboardArrowUpIcon fontSize="small" />
                                ) : (
                                    <KeyboardArrowDownIcon fontSize="small" />
                                )}
                            </IconButton>
                        )}
                    </TableCell>
                )}
                <TableCell sx={{ fontWeight: 700 }}>#{row.rowNumber}</TableCell>
                <TableCell>{rawStation || '—'}</TableCell>
                <TableCell>
                    {row.stationName ??
                        (suggestions.length > 0 ? (
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
                            '—'
                        ))}
                </TableCell>
                {importsTickets && (
                    <TableCell>
                        <AdminLuckyDisplay value={row.numbers} ticket sx={{ fontWeight: 800, color: '#0f172a' }} />
                    </TableCell>
                )}
                <TableCell align="right" sx={{ fontWeight: 700 }}>{row.declareQuantity ?? '—'}</TableCell>
                {importsTickets && (
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>
                        {row.serialCount ?? serials.length}
                    </TableCell>
                )}
                <TableCell>
                    <Chip size="small" color={chip.color} label={chip.label} sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }} />
                </TableCell>
                <TableCell>
                    <Stack spacing={0.5}>
                        {row.issues.map((issue, index) => (
                            <Typography
                                key={`${issue.code}-${index}`}
                                variant="caption"
                                color={issue.severity === 'ERROR' ? 'error.main' : 'text.secondary'}
                            >
                                {issue.message}
                            </Typography>
                        ))}
                    </Stack>
                </TableCell>
            </TableRow>

            {importsTickets && serials.length > 0 && (
                <TableRow>
                    <TableCell sx={{ py: 0, borderBottom: 0 }} colSpan={columnCount}>
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box sx={{ my: 1.5, ml: 4, mr: 1, p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <Typography variant="caption" fontWeight={800} color="#0f172a" sx={{ mb: 1, display: 'block' }}>
                                    Danh sách {serials.length} vé sê-ri của dãy số{' '}
                                    <AdminLuckyDisplay value={row.numbers} ticket component="span" />:
                                </Typography>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#ffffff' }}>
                                        <TableRow>
                                            <TableCell sx={{ width: 56, fontWeight: 800 }}>STT</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Mã Sê-ri</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Ảnh đính kèm</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {serials.map((serial, index) => {
                                            const image = row.ticketImages?.[index] ?? null;
                                            return (
                                                <TableRow key={`${serial}-${index}`}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{serial}</TableCell>
                                                    <TableCell>
                                                        {image ? (
                                                            <Link
                                                                href={image}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                variant="caption"
                                                                sx={{ wordBreak: 'break-all', fontWeight: 600 }}
                                                            >
                                                                {image}
                                                            </Link>
                                                        ) : (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                Chưa có ảnh
                                                            </Typography>
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
