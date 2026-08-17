"use client";

import { Box, Skeleton, Stack } from "@mui/material";

type TiptapSkeletonProps = {
    minHeight?: number;
};

export function TiptapSkeleton({ minHeight = 420 }: TiptapSkeletonProps) {
    return (
        <Box
            sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
                minHeight,
            }}
        >
            <Stack
                direction="row"
                spacing={1}
                sx={{
                    px: 1.5,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.neutral",
                }}
            >
                {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} variant="rounded" width={28} height={28} />
                ))}
            </Stack>
            <Box sx={{ p: 2 }}>
                <Skeleton variant="text" width="92%" />
                <Skeleton variant="text" width="88%" />
                <Skeleton variant="text" width="76%" />
                <Skeleton variant="text" width="84%" />
                <Skeleton variant="text" width="60%" />
            </Box>
        </Box>
    );
}
