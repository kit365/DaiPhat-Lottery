import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Alert,
    Box,
    Button,
    Divider,
    LinearProgress,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate } from '@/components/router-compat';
import type { ImportBatch } from '../../types/importBatch.type';
import { ROUTES } from '../../../../../constants/routes';
import { useStations } from '../../../../station/hooks/useStation';
import { useIncompleteImportBatches } from '../../hooks/useImportBatch';
import { formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import {
    getImportModeBadgeClass,
    getImportModeChipColor,
    getImportModeNotificationLabel,
} from '../../utils/batchTypeLabels';
import {
    findFirstIncompleteLine,
    getImportBatchProgress,
    getIncompleteLines,
    resolveImportBatchStationNames,
} from '../../utils/importBatchProgress';
import { ImportBatchNotificationDetailDialog } from './ImportBatchNotificationDetailDialog';

type IncompleteImportBatchNotificationProps = {
    variant: 'detailed' | 'compact';
};

type IncompleteBatchItemProps = {
    batch: ImportBatch;
    resolveStationName: (stationId: number) => string;
    onContinue: () => void;
};

// 6 cột đồng bộ với ImportBatchNotificationDetailDialog
const GRID_COLS = 'minmax(0,1.3fr) 100px 140px minmax(0,1.2fr) minmax(120px,1fr) auto';

const IncompleteBatchItem = ({
    batch,
    resolveStationName,
    onContinue,
}: IncompleteBatchItemProps) => {
    const incompleteLines = getIncompleteLines(batch);
    const progress = getImportBatchProgress(batch);
    const stationNames = resolveImportBatchStationNames(
        batch,
        resolveStationName,
        incompleteLines
    );
    const stationLabel =
        stationNames.length > 0 ? stationNames.join(', ') : '—';
    const drawDateLabel = batch.drawDate
        ? dayjs(batch.drawDate).format('DD/MM/YYYY')
        : '—';

    // Màu chip hình thức nhập
    const modeBgMap: Record<string, string> = {
        warning: 'rgba(237,108,2,0.12)',
        secondary: 'rgba(156,39,176,0.12)',
        info: 'rgba(2,136,209,0.12)',
        success: 'rgba(46,125,50,0.12)',
        primary: 'rgba(25,118,210,0.12)',
        error: 'rgba(211,47,47,0.12)',
    };
    const modeChipColor = getImportModeChipColor(batch.importMode);
    const modeBg = modeBgMap[modeChipColor] ?? 'rgba(0,0,0,0.06)';

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    md: GRID_COLS,
                },
                gap: { xs: 1, md: 1.5 },
                alignItems: 'center',
                py: 1.25,
            }}
        >
            {/* Cột 1: Mã phiếu + Nhà cung cấp */}
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                    {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {batch.supplierName || '—'}
                </Typography>
            </Stack>

            {/* Cột 2: Ngày quay */}
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {drawDateLabel}
            </Typography>

            {/* Cột 3: Hình thức nhập */}
            <Box>
                <Box
                    component="span"
                    sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: modeBg,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: `${modeChipColor}.main`,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {getImportModeNotificationLabel(batch.importMode)}
                </Box>
            </Box>

            {/* Cột 4: Đài còn thiếu */}
            <Tooltip title={stationLabel} disableHoverListener={stationNames.length <= 2}>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                    {stationLabel}
                </Typography>
            </Tooltip>

            {/* Cột 5: Tiến độ */}
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {progress.imported} / {progress.declared} vé
                    {progress.declared > 0 && (
                        <Box
                            component="span"
                            sx={{ ml: 0.5, color: 'warning.main', fontWeight: 600 }}
                        >
                            ({progress.percentLabel})
                        </Box>
                    )}
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={progress.percent}
                    color="warning"
                    sx={{ height: 5, borderRadius: 1 }}
                />
            </Stack>

            {/* Cột 6: Hành động */}
            <Button
                size="small"
                variant="contained"
                color="warning"
                onClick={onContinue}
                sx={{
                    flexShrink: 0,
                    justifySelf: { xs: 'flex-start', md: 'end' },
                    whiteSpace: 'nowrap',
                }}
            >
                Tiếp tục nhập
            </Button>
        </Box>
    );
};

export const IncompleteImportBatchNotification = ({
    variant,
}: IncompleteImportBatchNotificationProps) => {
    const navigate = useNavigate();
    const [detailOpen, setDetailOpen] = useState(false);
    const { data: batches = [], isLoading } = useIncompleteImportBatches();
    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const resolveStationName = useMemo(
        () => (stationId: number) =>
            providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ??
            `Đài #${stationId}`,
        [providers]
    );

    const handleContinue = (batch: ImportBatch) => {
        const firstLine = findFirstIncompleteLine(batch);
        navigate(ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(batch.id, firstLine?.id));
    };

    if (isLoading || batches.length === 0) {
        return null;
    }

    if (variant === 'compact') {
        const isMulti = batches.length >= 2;
        const singleBatch = isMulti ? null : batches[0];
        const pendingStations = singleBatch
            ? resolveImportBatchStationNames(singleBatch, resolveStationName)
            : [];

        return (
            <>
                <Alert
                    severity="warning"
                    icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
                    sx={{ mb: 2 }}
                >
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                        useFlexGap
                    >
                        <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                            <Typography variant="body2">
                                <strong>{batches.length}</strong> phiếu nhập lô chưa hoàn tất
                                {!isMulti && pendingStations.length > 0 && (
                                    <>
                                        {' '}
                                        · {pendingStations.join(', ')}
                                    </>
                                )}
                            </Typography>
                            {!isMulti && singleBatch && (
                                <span
                                    className={`admin-status-badge ${getImportModeBadgeClass(singleBatch.importMode)}`}
                                >
                                    {getImportModeNotificationLabel(singleBatch.importMode)}
                                </span>
                            )}
                        </Stack>
                        {isMulti ? (
                            <Button
                                size="small"
                                color="warning"
                                variant="contained"
                                onClick={() => setDetailOpen(true)}
                                sx={{ flexShrink: 0 }}
                            >
                                Xem chi tiết
                            </Button>
                        ) : (
                            singleBatch && (
                                <Button
                                    size="small"
                                    color="warning"
                                    variant="contained"
                                    onClick={() => handleContinue(singleBatch)}
                                    sx={{ flexShrink: 0 }}
                                >
                                    Tiếp tục nhập
                                </Button>
                            )
                        )}
                    </Stack>
                </Alert>

                <ImportBatchNotificationDetailDialog
                    open={detailOpen}
                    title="Phiếu nhập lô chưa hoàn tất"
                    batches={batches}
                    actionType="continue-import"
                    resolveStationName={resolveStationName}
                    onClose={() => setDetailOpen(false)}
                    onAction={handleContinue}
                />
            </>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 'var(--shape-borderRadius-lg)',
                overflow: 'hidden',
                border: '1px solid rgba(var(--palette-warning-mainChannel) / 0.35)',
                boxShadow: 'var(--customShadows-card)',
                bgcolor: 'var(--palette-background-paper)',
            }}
        >
            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: 'rgba(var(--palette-warning-mainChannel) / 0.08)',
                    borderBottom: '1px solid var(--palette-background-neutral)',
                }}
            >
                <WarningAmberOutlinedIcon
                    fontSize="small"
                    sx={{ color: 'var(--palette-warning-main)' }}
                />
                <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}
                >
                    Phiếu nhập lô chưa hoàn tất ({batches.length})
                </Typography>
            </Stack>

            <Box sx={{ px: 2 }}>
                <Box
                    sx={{
                        display: { xs: 'none', md: 'grid' },
                        gridTemplateColumns: GRID_COLS,
                        gap: 1.5,
                        py: 0.75,
                        borderBottom: '1px dashed var(--palette-background-neutral)',
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}
                    >
                        Mã phiếu / Nhà cung cấp
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}
                    >
                        Ngày quay
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}
                    >
                        Hình thức
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}
                    >
                        Đài còn thiếu
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}
                    >
                        Tiến độ
                    </Typography>
                    <Box />
                </Box>

                <Stack divider={<Divider flexItem />}>
                    {batches.map((batch) => (
                        <IncompleteBatchItem
                            key={batch.id}
                            batch={batch}
                            resolveStationName={resolveStationName}
                            onContinue={() => handleContinue(batch)}
                        />
                    ))}
                </Stack>
            </Box>
        </Paper>
    );
};
