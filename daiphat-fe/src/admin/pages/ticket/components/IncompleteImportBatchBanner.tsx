import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Chip,
    Divider,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useProviders } from '../../provider/hooks/useProvider';
import { useIncompleteImportBatches } from '../../import-batch/hooks/useImportBatch';
import {
    displayImportBatchHeaderCodeRaw,
    formatImportBatchHeaderCode,
} from '../../import-batch/utils/importBatchCode';
import {
    findFirstIncompleteLine,
    getImportBatchProgress,
    getIncompleteImportBatchDisplayStatus,
    resolveImportBatchStationNames,
} from '../utils/importBatchProgress';

export const IncompleteImportBatchBanner = () => {
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

    if (isLoading || batches.length === 0) {
        return null;
    }

    return (
        <Alert
            severity="warning"
            icon={<InfoOutlinedIcon fontSize="inherit" />}
            sx={{ mb: 2.5, alignItems: 'flex-start' }}
        >
            <AlertTitle sx={{ fontWeight: 700 }}>
                Phiếu nhập lô chưa hoàn tất ({batches.length})
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
                Các phiếu nhập lô dưới đây chưa nhập đủ vé. Vui lòng tiếp tục nhập để tránh bỏ sót.
            </Typography>

            <Stack divider={<Divider flexItem />} spacing={1.5}>
                {batches.map((batch) => {
                    const progress = getImportBatchProgress(batch);
                    const displayStatus = getIncompleteImportBatchDisplayStatus(batch);
                    const stationNames = resolveImportBatchStationNames(batch, resolveStationName);
                    const firstLine = findFirstIncompleteLine(batch);

                    return (
                        <Box key={batch.id}>
                            <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={1.5}
                                alignItems={{ md: 'center' }}
                                justifyContent="space-between"
                            >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        flexWrap="wrap"
                                        useFlexGap
                                        sx={{ mb: 0.5 }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={displayStatus.label}
                                            color={displayStatus.key === 'RECEIVING' ? 'info' : 'warning'}
                                            variant="outlined"
                                        />
                                    </Stack>

                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Mã phiếu: {displayImportBatchHeaderCodeRaw(batch.batchCode, batch.id)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Nhà đài: {stationNames.length > 0 ? stationNames.join(', ') : '—'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Ngày quay:{' '}
                                        {batch.drawDate
                                            ? dayjs(batch.drawDate).format('DD/MM/YYYY')
                                            : '—'}
                                    </Typography>

                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                        <Typography variant="body2" fontWeight={600}>
                                            Tiến độ: {progress.imported} / {progress.declared} vé
                                        </Typography>
                                        <Box sx={{ flex: 1, maxWidth: 160 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={progress.percent}
                                                color="warning"
                                                sx={{ height: 6, borderRadius: 1 }}
                                            />
                                        </Box>
                                    </Stack>
                                </Box>

                                <Button
                                    size="small"
                                    variant="contained"
                                    color="warning"
                                    onClick={() =>
                                        navigate(
                                            ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(
                                                batch.id,
                                                firstLine?.id
                                            )
                                        )
                                    }
                                    sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', md: 'center' } }}
                                >
                                    Tiếp tục nhập
                                </Button>
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
        </Alert>
    );
};
