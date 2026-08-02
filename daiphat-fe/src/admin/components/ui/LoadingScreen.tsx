"use client";

import { Box, CircularProgress } from '@mui/material';

const LoadingScreen = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                minHeight: '400px',
            }}
        >
            <CircularProgress color="primary" />
        </Box>
    );
};

export default LoadingScreen;
