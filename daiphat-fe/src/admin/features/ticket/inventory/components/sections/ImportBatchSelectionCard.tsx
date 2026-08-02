import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
    Box,
    Button,
    Chip,
    Divider,
    Skeleton,
    Stack,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useNavigate } from '@/components/router-compat';
import type { ImportBatch } from '../../../import-batch/types/importBatch.type';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import {
    displayImportBatchHeaderCodeRaw,
    formatImportBatchHeaderCode,
    importBatchCodeMonospaceSx,
} from '../../../import-batch/utils/importBatchCode';
import {
    getImportBatchStatusChipColor,
    getImportBatchStatusLabel,
    getImportModeLabel,
    importBatchStatusChipSx,
} from '../../../import-batch/utils/batchTypeLabels';
import { ROUTES } from '../../../../../constants/routes';
import { ImportBatchProgressBar } from '../../../import-batch/components/sections/ImportBatchProgressBar';

const IMPORT_BATCH_DETAIL_PERMISSIONS = [
    PERMISSIONS.IMPORT_BATCH.VIEW,
    PERMISSIONS.IMPORT_BATCH.CREATE,
    PERMISSIONS.TICKET.CREATE,
];

type ImportBatchSelectionCardProps = {
    batch?: ImportBatch | null;
    isLoading?: boolean;
    selectedBatchId?: string;
    resolveStationName?: (stationId: number) => string;
};

const resolveLineCount = (batch: ImportBatch) =>
    batch.lineCount ?? batch.lines?.length ?? 0;

export const ImportBatchSelectionCard = ({
    batch,
    isLoading,
    selectedBatchId,
    resolveStationName,
}: ImportBatchSelectionCardProps) => {
    const navigate = useNavigate();
    if (isLoading || (selectedBatchId && !batch)) {
        return (
            <Box
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 2,
                    bgcolor: 'action.hover',
                }}
            >
                <Skeleton width="45%" height={28} />
                <Skeleton width="70%" sx={{ mt: 1 }} />
                <Skeleton width="55%" sx={{ mt: 1 }} />
                <Skeleton width="100%" height={40} sx={{ mt: 2, borderRadius: 1 }} />
            </Box>
        );
    }

    if (!batch) {
        return null;
    }

    const lineCount = resolveLineCount(batch);
    const declaredQty = batch.totalDeclareQuantity ?? 0;
    const importedQty = batch.totalImportedQuantity ?? 0;

    return (
        <Box
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
                bgcolor: 'background.default',
            }}
        >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'flex-start' }}
                justifyContent="space-between"
            >
                <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            sx={importBatchCodeMonospaceSx}
                            title={displayImportBatchHeaderCodeRaw(batch.batchCode, batch.id)}
                        >
                            {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                        </Typography>
                        <Chip
                            size="small"
                            label={getImportBatchStatusLabel(batch.status)}
                            color={getImportBatchStatusChipColor(batch.status)}
                            sx={importBatchStatusChipSx}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Mã hệ thống:{' '}
                        <Box component="span" sx={importBatchCodeMonospaceSx}>
                            {displayImportBatchHeaderCodeRaw(batch.batchCode, batch.id)}
                        </Box>
                    </Typography>
                </Box>
                <CanAccess anyOf={IMPORT_BATCH_DETAIL_PERMISSIONS}>
                    <Button
                        size="small"
                        variant="outlined"
                        endIcon={<OpenInNewIcon fontSize="small" />}
                        onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                        sx={{ flexShrink: 0 }}
                    >
                        Xem phiếu
                    </Button>
                </CanAccess>
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.5,
                }}
            >
                <InfoItem label="Ngày quay" value={batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'} />
                <InfoItem label="Nhà cung cấp" value={batch.supplierName || '—'} />
                <InfoItem label="Hình thức nhập" value={batch.importMode ? getImportModeLabel(batch.importMode) : '—'} />
                <InfoItem label="Số đài" value={String(lineCount)} />
                <InfoItem label="SL khai báo" value={String(declaredQty)} />
                <InfoItem label="SL đã nhập" value={String(importedQty)} />
            </Box>

            <ImportBatchProgressBar batch={batch} resolveStationName={resolveStationName} />
        </Box>
    );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <Box>
        <Typography variant="caption" color="text.secondary" display="block">
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
            {value}
        </Typography>
    </Box>
);
