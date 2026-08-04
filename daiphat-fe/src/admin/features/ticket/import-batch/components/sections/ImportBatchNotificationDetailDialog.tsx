import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import type { ImportBatch } from '../../types/importBatch.type';
import { formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import {
    getImportModeChipColor,
    getImportModeNotificationLabel,
} from '../../utils/batchTypeLabels';
import {
    getImportBatchProgress,
    getIncompleteLines,
    resolveImportBatchStationNames,
} from '../../utils/importBatchProgress';
import {
    getImportBatchEditDraftStationNames,
    hasStartedImportBatchLineEntry,
} from '../../utils/importBatchEditDraft';

export type ImportBatchNotificationActionType = 'continue-import' | 'add-stations';

interface ImportBatchNotificationDetailDialogProps {
    open: boolean;
    title: string;
    batches: ImportBatch[];
    actionType: ImportBatchNotificationActionType;
    resolveStationName: (stationId: number) => string;
    onClose: () => void;
    onAction: (batch: ImportBatch) => void;
}

const actionLabel: Record<ImportBatchNotificationActionType, string> = {
    'continue-import': 'Tiếp tục nhập',
    'add-stations': 'Bổ sung nhà đài',
};

// 6 cột: Mã phiếu | Ngày quay | Hình thức | Đài còn thiếu | Tiến độ | Hành động
const GRID_COLS = 'minmax(0,1.3fr) 100px 140px minmax(0,1.2fr) minmax(120px,1fr) auto';

const ColHeader = ({ children }: { children: React.ReactNode }) => (
    <Typography
        variant="caption"
        sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}
    >
        {children}
    </Typography>
);

export const ImportBatchNotificationDetailDialog = ({
    open,
    title,
    batches,
    actionType,
    resolveStationName,
    onClose,
    onAction,
}: ImportBatchNotificationDetailDialogProps) => {
    const handleAction = (batch: ImportBatch) => {
        onAction(batch);
        onClose();
    };

    // Sắp xếp: ngày quay gần hiện tại nhất lên đầu
    const sortedBatches = [...batches].sort((a, b) => {
        const da = a.drawDate ? dayjs(a.drawDate).valueOf() : 0;
        const db = b.drawDate ? dayjs(b.drawDate).valueOf() : 0;
        return db - da;
    });

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{ sx: { maxWidth: 960 } }}
        >
            <DialogTitle sx={{ pb: 1, pr: 6, fontWeight: 700 }}>
                {title}
                <IconButton
                    aria-label="Đóng"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 0, px: 3 }}>
                {/* Header row */}
                <Box
                    sx={{
                        display: { xs: 'none', sm: 'grid' },
                        gridTemplateColumns: GRID_COLS,
                        gap: 1.5,
                        py: 1,
                        borderBottom: '1px dashed var(--palette-divider)',
                        mb: 0.5,
                    }}
                >
                    <ColHeader>Mã phiếu</ColHeader>
                    <ColHeader>Ngày quay</ColHeader>
                    <ColHeader>Hình thức</ColHeader>
                    <ColHeader>Đài còn thiếu</ColHeader>
                    <ColHeader>Tiến độ</ColHeader>
                    <Box />
                </Box>

                <Stack spacing={0} divider={<Divider flexItem />}>
                    {sortedBatches.map((batch) => {
                        const rowActionType: ImportBatchNotificationActionType =
                            actionType === 'add-stations' &&
                            hasStartedImportBatchLineEntry(batch.id)
                                ? 'continue-import'
                                : actionType;

                        const draftStationNames = getImportBatchEditDraftStationNames(batch.id);
                        const stationNames =
                            rowActionType === 'continue-import'
                                ? draftStationNames.length > 0
                                    ? draftStationNames
                                    : resolveImportBatchStationNames(
                                          batch,
                                          resolveStationName,
                                          getIncompleteLines(batch)
                                      )
                                : [];

                        const stationLabel =
                            rowActionType === 'add-stations'
                                ? 'Chưa bổ sung nhà đài'
                                : stationNames.length > 0
                                  ? stationNames.join(', ')
                                  : '—';

                        const drawDateLabel = batch.drawDate
                            ? dayjs(batch.drawDate).format('DD/MM/YYYY')
                            : '—';

                        const progress = getImportBatchProgress(batch);

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
                                key={batch.id}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: GRID_COLS,
                                    },
                                    gap: { xs: 1, sm: 1.5 },
                                    alignItems: 'center',
                                    py: 1.5,
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
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
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
                                <Tooltip
                                    title={stationLabel}
                                    disableHoverListener={stationLabel.length <= 40}
                                >
                                    <Typography
                                        variant="body2"
                                        color={
                                            rowActionType === 'add-stations'
                                                ? 'error.main'
                                                : 'text.secondary'
                                        }
                                        noWrap
                                        sx={{ minWidth: 0 }}
                                    >
                                        {stationLabel}
                                    </Typography>
                                </Tooltip>

                                {/* Cột 5: Tiến độ */}
                                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
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
                                    onClick={() => handleAction(batch)}
                                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                                >
                                    {actionLabel[rowActionType]}
                                </Button>
                            </Box>
                        );
                    })}
                </Stack>
            </DialogContent>
        </Dialog>
    );
};
