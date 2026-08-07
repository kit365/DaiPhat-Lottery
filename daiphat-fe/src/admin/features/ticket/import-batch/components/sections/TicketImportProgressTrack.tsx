import { Box, Tooltip } from '@mui/material';
import { formatImportProgressPercent } from '../../utils/importBatchProgress';

type TicketImportProgressTrackProps = {
    imported: number;
    declared: number;
    color: string;
    trackColor: string;
    height?: number;
    ariaLabel?: string;
};

export const formatImportProgressCountTooltip = (imported: number, declared: number) =>
    `${imported.toLocaleString('vi-VN')} / ${declared.toLocaleString('vi-VN')} vé`;

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

    const track = (
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
                cursor: 'default',
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
        </Box>
    );

    return (
        <Tooltip arrow placement="top" title={formatImportProgressCountTooltip(imported, declared)}>
            {track}
        </Tooltip>
    );
};
