"use client";

import { Box, LinearProgress } from '@mui/material';
import { usePageNavigation } from '../../context/PageNavigationContext';

/** Thin top bar while Next.js loads the route JS bundle — does not block page content. */
export function NavigationProgressBar() {
    const { isNavigating } = usePageNavigation();

    if (!isNavigating) {
        return null;
    }

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1400,
                height: 3,
                pointerEvents: 'none',
            }}
        >
            <LinearProgress
                color="primary"
                sx={{
                    height: 3,
                    bgcolor: 'rgba(0, 167, 111, 0.12)',
                    '& .MuiLinearProgress-bar': {
                        bgcolor: 'var(--palette-primary-main, #00A76F)',
                    },
                }}
            />
        </Box>
    );
}
