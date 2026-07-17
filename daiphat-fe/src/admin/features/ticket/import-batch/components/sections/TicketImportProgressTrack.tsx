import { Box, Typography } from '@mui/material';
import { formatImportProgressPercent } from '../../utils/importBatchProgress';

type TicketImportProgressTrackProps = {
    imported: number;
    declared: number;
    color: string;
    trackColor: string;
    height?: number;
    ariaLabel?: string;
};

export const TicketImportProgressTrack = ({
    imported,
    declared,
    color,
    trackColor,
    height = 20,
    ariaLabel,
}: TicketImportProgressTrackProps) => {
    const percent = declared > 0 ? Math.min(100, (imported / declared) * 100) : 0;
    const percentLabel = formatImportProgressPercent(imported, declared);
    const showPercentLabel = percent > 0;

    return (
        <Box
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(percent.toFixed(1))}
            aria-label={ariaLabel ?? `Tiến độ nhập vé ${percentLabel}`}
            sx={{
                position: 'relative',
                width: '100%',
                height,
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: trackColor,
                border: 1,
                borderColor: 'divider',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${percent}%`,
                    bgcolor: color,
                    transition: 'width 0.25s ease',
                }}
            />
            {showPercentLabel && (
                <Typography
                    component="span"
                    variant="caption"
                    sx={{
                        position: 'absolute',
                        left: `${percent}%`,
                        top: '50%',
                        transform: 'translate(-100%, -50%)',
                        px: 0.75,
                        fontSize: height <= 16 ? '0.625rem' : '0.6875rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        color: 'common.white',
                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {percentLabel}
                </Typography>
            )}
        </Box>
    );
};
