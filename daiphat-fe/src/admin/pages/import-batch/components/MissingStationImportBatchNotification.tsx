import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ImportBatch } from '../../../api/importBatch.api';
import { ROUTES } from '../../../constants/routes';
import { importBatchMissingStations } from '../../ticket/utils/importBatchProgress';
import { useImportBatchesWithoutLines } from '../hooks/useImportBatch';
import { formatImportBatchHeaderCode } from '../utils/importBatchCode';
import {
    getImportModeChipColor,
    getImportModeNotificationLabel,
    importBatchStatusChipSx,
} from '../utils/batchTypeLabels';
import { ImportBatchNotificationDetailDialog } from './ImportBatchNotificationDetailDialog';

type MissingStationImportBatchNotificationProps = {
    pageBatches?: ImportBatch[];
};

const mergeMissingStationBatches = (
    apiBatches: ImportBatch[],
    pageBatches: ImportBatch[]
): ImportBatch[] => {
    const byId = new Map<number, ImportBatch>();
    apiBatches.forEach((batch) => byId.set(batch.id, batch));
    pageBatches.filter(importBatchMissingStations).forEach((batch) => byId.set(batch.id, batch));
    return Array.from(byId.values());
};

export const MissingStationImportBatchNotification = ({
    pageBatches = [],
}: MissingStationImportBatchNotificationProps) => {
    const navigate = useNavigate();
    const [detailOpen, setDetailOpen] = useState(false);
    const { data: apiBatches = [], isLoading, isError } = useImportBatchesWithoutLines();

    const batches = useMemo(
        () => mergeMissingStationBatches(apiBatches, pageBatches),
        [apiBatches, pageBatches]
    );

    if (batches.length === 0) {
        if (isLoading && !isError) {
            return null;
        }
        return null;
    }

    const isMulti = batches.length >= 2;
    const singleBatch = isMulti ? null : batches[0];

    const handleAddStations = (batch: ImportBatch) => {
        navigate(ROUTES.ADMIN.IMPORT_BATCH.EDIT(batch.id));
    };

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
                            <strong>{batches.length}</strong> Phiếu nhập lô chưa được bổ sung nhà đài
                            {!isMulti && singleBatch && (
                                <>
                                    {' '}
                                    · {formatImportBatchHeaderCode(singleBatch.batchCode, singleBatch.id)}
                                </>
                            )}
                        </Typography>
                        {!isMulti && singleBatch && (
                            <Chip
                                size="small"
                                label={getImportModeNotificationLabel(singleBatch.importMode)}
                                color={getImportModeChipColor(singleBatch.importMode)}
                                sx={importBatchStatusChipSx}
                            />
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
                                onClick={() => handleAddStations(singleBatch)}
                                sx={{ flexShrink: 0 }}
                            >
                                Bổ sung nhà đài
                            </Button>
                        )
                    )}
                </Stack>
            </Alert>

            <ImportBatchNotificationDetailDialog
                open={detailOpen}
                title="Phiếu nhập lô chưa được bổ sung nhà đài"
                batches={batches}
                actionType="add-stations"
                resolveStationName={() => ''}
                onClose={() => setDetailOpen(false)}
                onAction={handleAddStations}
            />
        </>
    );
};
