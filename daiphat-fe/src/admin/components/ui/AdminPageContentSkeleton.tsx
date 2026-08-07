"use client";

import { Box, Skeleton } from '@mui/material';

/** Lightweight placeholder while an admin feature chunk loads. */
export function AdminPageContentSkeleton() {
    return (
        <Box sx={{ py: 1 }}>
            <Skeleton variant="text" width={280} height={36} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={280} />
        </Box>
    );
}
