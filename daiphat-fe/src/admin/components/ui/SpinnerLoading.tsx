"use client";

import { Box, CircularProgress, Typography } from '@mui/material';

type SpinnerLoadingProps = {
    message?: string;
    minHeight?: number | string;
    compact?: boolean;
};

/** Spinner + message while page content or data is loading. */
export function SpinnerLoading({
    message = 'Đang tải dữ liệu...',
    minHeight = 320,
    compact = false,
}: SpinnerLoadingProps) {
    return (
        <Box
            role="status"
            aria-live="polite"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                minHeight,
                py: compact ? 2 : 4,
            }}
        >
            <CircularProgress size={compact ? 24 : 32} />
            <Typography variant="body2" color="text.secondary">
                {message}
            </Typography>
        </Box>
    );
}
