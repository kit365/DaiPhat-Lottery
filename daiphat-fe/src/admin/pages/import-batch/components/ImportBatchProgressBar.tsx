import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { ImportBatch } from '../../../api/importBatch.api';
import {
    buildImportBatchProgressSegments,
    formatImportProgressPercent,
    getImportBatchProgress,
} from '../../ticket/utils/importBatchProgress';
import { formatImportBatchLineCancelReason } from '../utils/batchTypeLabels';

type ImportBatchProgressBarProps = {
    batch: ImportBatch;
    resolveStationName?: (stationId: number) => string;
};

const formatTicketCount = (value: number) => `${value.toLocaleString('vi-VN')} vé`;

export const ImportBatchProgressBar = ({
    batch,
    resolveStationName,
}: ImportBatchProgressBarProps) => {
    const overall = getImportBatchProgress(batch);
    const segments = buildImportBatchProgressSegments(batch, resolveStationName);
    const totalDeclared = segments.reduce((sum, segment) => sum + segment.declared, 0);

    if (segments.length === 0 || totalDeclared <= 0) {
        return null;
    }

    const showOverallPercent = overall.percent > 0;

    return (
        <Box sx={{ mt: 0.5 }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={0.5}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 1 }}
            >
                <Typography variant="subtitle2" fontWeight={600}>
                    Tiến độ nhập vé tổng thể
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    <Box component="span" fontWeight={600} color="text.primary">
                        {formatTicketCount(overall.imported)}
                    </Box>
                    {' / '}
                    {formatTicketCount(overall.declared)}
                </Typography>
            </Stack>

            <Box
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(overall.percent.toFixed(1))}
                aria-label={`Tiến độ nhập vé tổng thể ${overall.percentLabel}`}
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: 20,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    {segments.map((segment) => {
                        const segmentShare =
                            totalDeclared > 0 ? (segment.declared / totalDeclared) * 100 : 0;

                        return (
                            <Tooltip
                                key={segment.lineId}
                                arrow
                                placement="top"
                                title={
                                    <Stack spacing={0.25} sx={{ py: 0.25 }}>
                                        <Typography variant="caption" fontWeight={700}>
                                            {segment.stationName}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            Đã nhập: {segment.imported.toLocaleString('vi-VN')}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            Khai báo: {segment.declared.toLocaleString('vi-VN')}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            Hoàn thành:{' '}
                                            {formatImportProgressPercent(
                                                segment.imported,
                                                segment.declared
                                            )}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            Trạng thái: {segment.statusLabel}
                                        </Typography>
                                        {segment.cancelReason && (
                                            <Typography variant="caption" display="block">
                                                {formatImportBatchLineCancelReason(segment.cancelReason)}
                                            </Typography>
                                        )}
                                    </Stack>
                                }
                            >
                                <Box
                                    sx={{
                                        position: 'relative',
                                        flexGrow: segment.declared,
                                        flexBasis: 0,
                                        minWidth: segmentShare >= 3 ? 8 : 4,
                                        height: '100%',
                                        bgcolor: segment.trackColor,
                                        borderRight: '1px solid',
                                        borderColor: 'background.paper',
                                        '&:last-of-type': { borderRight: 'none' },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: `${segment.percent}%`,
                                            bgcolor: segment.color,
                                            transition: 'width 0.25s ease',
                                        }}
                                    />
                                </Box>
                            </Tooltip>
                        );
                    })}
                </Box>

                {showOverallPercent && (
                    <Typography
                        component="span"
                        variant="caption"
                        sx={{
                            position: 'absolute',
                            left: `${overall.percent}%`,
                            top: '50%',
                            transform: 'translate(-100%, -50%)',
                            px: 0.75,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            lineHeight: 1,
                            color: 'common.white',
                            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            zIndex: 1,
                        }}
                    >
                        {overall.percentLabel}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};
