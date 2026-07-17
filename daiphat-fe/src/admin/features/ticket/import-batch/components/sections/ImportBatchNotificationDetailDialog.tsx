import CloseIcon from '@mui/icons-material/Close';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import type { ImportBatch } from '../../types/importBatch.type';
import { formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import {
    getImportBatchStatusChipColor,
    getImportBatchStatusLabel,
    getImportModeChipColor,
    getImportModeNotificationLabel,
    importBatchStatusChipSx,
} from '../../utils/batchTypeLabels';
import {
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
                {title}
                <IconButton
                    aria-label="Đóng"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={0} divider={<Divider flexItem />}>
                    {batches.map((batch) => {
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

                        return (
                            <Box
                                key={batch.id}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'minmax(0, 1.2fr) minmax(88px, 0.7fr) minmax(0, 1fr) auto auto',
                                    },
                                    gap: { xs: 1, sm: 1.5 },
                                    alignItems: { xs: 'flex-start', sm: 'center' },
                                    py: 1.5,
                                }}
                            >
                                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {batch.supplierName || '—'}
                                    </Typography>
                                </Stack>

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    {drawDateLabel}
                                </Typography>

                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    alignItems="center"
                                    useFlexGap
                                    flexWrap="wrap"
                                >
                                    <Chip
                                        size="small"
                                        label={getImportBatchStatusLabel(batch.status)}
                                        color={getImportBatchStatusChipColor(batch.status)}
                                        sx={importBatchStatusChipSx}
                                    />
                                    <Chip
                                        size="small"
                                        label={getImportModeNotificationLabel(batch.importMode)}
                                        color={getImportModeChipColor(batch.importMode)}
                                        sx={importBatchStatusChipSx}
                                    />
                                </Stack>

                                <Tooltip
                                    title={stationLabel}
                                    disableHoverListener={stationLabel.length <= 40}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        noWrap
                                        sx={{ minWidth: 0, maxWidth: { sm: 180 } }}
                                    >
                                        {stationLabel}
                                    </Typography>
                                </Tooltip>

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
