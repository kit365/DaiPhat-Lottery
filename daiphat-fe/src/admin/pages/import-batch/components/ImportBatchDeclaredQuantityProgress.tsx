import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { getImportBatchDeclaredQuantityProgress } from '../utils/importBatchDeclaredQuantity';

interface ImportBatchDeclaredQuantityProgressProps {
    totalDeclareQuantity: number;
    linesSum: number;
    showError?: boolean;
}

const formatQuantity = (value: number) => `${value.toLocaleString('vi-VN')} vé`;

export const ImportBatchDeclaredQuantityProgress = ({
    totalDeclareQuantity,
    linesSum,
    showError = false,
}: ImportBatchDeclaredQuantityProgressProps) => {
    const progress = getImportBatchDeclaredQuantityProgress(totalDeclareQuantity, linesSum);
    const hasTarget = progress.target > 0;
    const isError = showError && (progress.isOverTarget || (hasTarget && !progress.isExactMatch));

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'var(--palette-background-neutral)',
                border: 1,
                borderColor: isError ? 'error.main' : 'divider',
            }}
        >
            <Stack spacing={1.5}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.5, sm: 3 }}
                    justifyContent="space-between"
                >
                    <Typography variant="body2">
                        <strong>Tổng số lượng khai báo phiếu nhập lô:</strong>{' '}
                        {hasTarget ? formatQuantity(progress.target) : '—'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Tổng số lượng khai báo các nhà đài:</strong>{' '}
                        {formatQuantity(progress.current)}
                    </Typography>
                </Stack>

                <Box>
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 0.75 }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Tiến độ phân bổ
                        </Typography>
                        <Typography
                            variant="body2"
                            color={isError ? 'error.main' : 'text.secondary'}
                            fontWeight={600}
                        >
                            {hasTarget
                                ? `${progress.current.toLocaleString('vi-VN')} / ${progress.target.toLocaleString('vi-VN')} (${progress.percent}%)`
                                : `${progress.current.toLocaleString('vi-VN')} / —`}
                        </Typography>
                    </Stack>
                    <LinearProgress
                        variant="determinate"
                        value={hasTarget ? Math.min(100, (progress.current / progress.target) * 100) : 0}
                        color={progress.isOverTarget ? 'error' : progress.isExactMatch ? 'success' : 'primary'}
                        sx={{
                            height: 10,
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                        }}
                    />
                </Box>
            </Stack>
        </Box>
    );
};
