import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    LinearProgress,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ImportBatch } from '../../../api/importBatch.api';
import { ROUTES } from '../../../constants/routes';
import { useProviders } from '../../provider/hooks/useProvider';
import { useIncompleteImportBatches } from '../../import-batch/hooks/useImportBatch';
import { formatImportBatchHeaderCode } from '../../import-batch/utils/importBatchCode';
import {
    getImportModeChipColor,
    getImportModeNotificationLabel,
    importBatchStatusChipSx,
} from '../../import-batch/utils/batchTypeLabels';
import {
    findFirstIncompleteLine,
    getImportBatchProgress,
    getIncompleteLines,
    resolveImportBatchStationNames,
} from '../../ticket/utils/importBatchProgress';

type IncompleteImportBatchNotificationProps = {
    variant: 'detailed' | 'compact';
};

type IncompleteBatchItemProps = {
    batch: ImportBatch;
    resolveStationName: (stationId: number) => string;
    onContinue: (batchId: number, lineId?: number) => void;
};

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
    const firstLine = findFirstIncompleteLine(batch);
    const stationLabel =
        stationNames.length > 0 ? stationNames.join(', ') : '—';
    const drawDateLabel = batch.drawDate
        ? dayjs(batch.drawDate).format('DD/MM/YYYY')
        : '—';

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    md: 'minmax(0, 1.4fr) minmax(88px, 0.7fr) minmax(0, 1.6fr) minmax(120px, 1fr) auto',
                },
                gap: { xs: 1, md: 2 },
                alignItems: 'center',
                py: 1.25,
            }}
        >
            <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                useFlexGap
                flexWrap="wrap"
                sx={{ minWidth: 0 }}
            >
                <Typography variant="body2" fontWeight={700} noWrap>
                    {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                </Typography>
                <Chip
                    size="small"
                    label={getImportModeNotificationLabel(batch.importMode)}
                    color={getImportModeChipColor(batch.importMode)}
                    sx={importBatchStatusChipSx}
                />
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {drawDateLabel}
            </Typography>

            <Tooltip title={stationLabel} disableHoverListener={stationNames.length <= 2}>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                    {stationLabel}
                </Typography>
            </Tooltip>

            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {progress.imported} / {progress.declared} vé
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={progress.percent}
                    color="warning"
                    sx={{ height: 4, borderRadius: 1 }}
                />
            </Stack>

            <Button
                size="small"
                variant="contained"
                color="warning"
                onClick={() => onContinue(batch.id, firstLine?.id)}
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
    const { data: batches = [], isLoading } = useIncompleteImportBatches();
    const { data: providersRes } = useProviders({ size: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const resolveStationName = useMemo(
        () => (stationId: number) =>
            providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name ??
            `Đài #${stationId}`,
        [providers]
    );

    const handleContinue = (batchId: number, lineId?: number) => {
        navigate(ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(batchId, lineId));
    };

    if (isLoading || batches.length === 0) {
        return null;
    }

    if (variant === 'compact') {
        const firstBatch = batches[0];
        const firstLine = firstBatch ? findFirstIncompleteLine(firstBatch) : undefined;
        const pendingStations = firstBatch
            ? resolveImportBatchStationNames(firstBatch, resolveStationName)
            : [];

        return (
            <Alert severity="warning" icon={<WarningAmberOutlinedIcon fontSize="inherit" />} sx={{ mb: 2 }}>
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
                            {pendingStations.length > 0 && (
                                <>
                                    {' '}
                                    · {pendingStations.join(', ')}
                                </>
                            )}
                        </Typography>
                        {firstBatch && (
                            <Chip
                                size="small"
                                label={getImportModeNotificationLabel(firstBatch.importMode)}
                                color={getImportModeChipColor(firstBatch.importMode)}
                                sx={importBatchStatusChipSx}
                            />
                        )}
                    </Stack>
                    {firstBatch && (
                        <Button
                            size="small"
                            color="warning"
                            variant="contained"
                            onClick={() => handleContinue(firstBatch.id, firstLine?.id)}
                            sx={{ flexShrink: 0 }}
                        >
                            Tiếp tục nhập
                        </Button>
                    )}
                </Stack>
            </Alert>
        );
    }

    return (
        <Paper
            variant="outlined"
            sx={{
                mb: 2.5,
                borderRadius: 2,
                overflow: 'hidden',
                borderColor: (theme) => alpha(theme.palette.warning.main, 0.35),
            }}
        >
            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <WarningAmberOutlinedIcon fontSize="small" color="warning" />
                <Typography variant="subtitle2" fontWeight={700}>
                    Phiếu nhập lô chưa hoàn tất ({batches.length})
                </Typography>
            </Stack>

            <Box sx={{ px: 2 }}>
                <Box
                    sx={{
                        display: { xs: 'none', md: 'grid' },
                        gridTemplateColumns:
                            'minmax(0, 1.4fr) minmax(88px, 0.7fr) minmax(0, 1.6fr) minmax(120px, 1fr) auto',
                        gap: 2,
                        py: 0.75,
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Mã phiếu
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Ngày quay
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Đài còn thiếu
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
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
                            onContinue={handleContinue}
                        />
                    ))}
                </Stack>
            </Box>
        </Paper>
    );
};
