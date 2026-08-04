"use client";

import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from '@/components/router-compat';
import type { ImportBatch } from '../../types/importBatch.type';
import { ROUTES } from '../../../../../constants/routes';
import { importBatchMissingStations } from '../../utils/importBatchProgress';
import { useImportBatchesWithoutLines } from '../../hooks/useImportBatch';
import { formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import {
    getImportModeBadgeClass,
    getImportModeNotificationLabel,
} from '../../utils/batchTypeLabels';
import { hasStartedImportBatchLineEntry } from '../../utils/importBatchEditDraft';
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
    const singleHasStartedEntry = singleBatch
        ? hasStartedImportBatchLineEntry(singleBatch.id)
        : false;
    const startedEntryCount = batches.filter((batch) =>
        hasStartedImportBatchLineEntry(batch.id)
    ).length;
    const allHaveStartedEntry = startedEntryCount === batches.length;
    const anyHaveStartedEntry = startedEntryCount > 0;

    const handleContinue = (batch: ImportBatch) => {
        navigate(ROUTES.ADMIN.IMPORT_BATCH.EDIT(batch.id));
    };

    const bannerText = !isMulti
        ? singleHasStartedEntry
            ? 'Tiếp tục nhập phiếu'
            : 'Phiếu nhập lô chưa được bổ sung nhà đài'
        : allHaveStartedEntry
          ? 'Phiếu nhập lô cần tiếp tục nhập'
          : anyHaveStartedEntry
            ? 'Phiếu nhập lô cần được hoàn thiện'
            : 'Phiếu nhập lô chưa được bổ sung nhà đài';

    const dialogTitle = allHaveStartedEntry
        ? 'Tiếp tục nhập phiếu'
        : 'Phiếu nhập lô chưa được bổ sung nhà đài';

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
                            {isMulti ? (
                                <>
                                    <strong>{batches.length}</strong> {bannerText}
                                </>
                            ) : (
                                <strong>{bannerText}</strong>
                            )}
                            {!isMulti && singleBatch && (
                                <>
                                    {' '}
                                    · {formatImportBatchHeaderCode(singleBatch.batchCode, singleBatch.id)}
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
                                {singleHasStartedEntry ? 'Tiếp tục nhập phiếu' : 'Bổ sung nhà đài'}
                            </Button>
                        )
                    )}
                </Stack>
            </Alert>

            <ImportBatchNotificationDetailDialog
                open={detailOpen}
                title={dialogTitle}
                batches={batches}
                actionType="add-stations"
                resolveStationName={() => ''}
                onClose={() => setDetailOpen(false)}
                onAction={handleContinue}
            />
        </>
    );
};
