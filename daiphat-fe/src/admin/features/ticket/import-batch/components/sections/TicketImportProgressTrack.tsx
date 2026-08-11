import { LinearProgress, Tooltip } from '@mui/material';
import { formatImportProgressPercent } from '../../utils/importBatchProgress';

type TicketImportProgressTrackProps = {
    imported: number;
    declared: number;
    height?: number;
    ariaLabel?: string;
};

export const formatImportProgressCountTooltip = (imported: number, declared: number) =>
    `${imported.toLocaleString('vi-VN')} / ${declared.toLocaleString('vi-VN')} vé`;

export const TicketImportProgressTrack = ({
    imported,
    declared,
    height = 6,
    ariaLabel,
}: TicketImportProgressTrackProps) => {
    const percent = declared > 0 ? Math.min(100, (imported / declared) * 100) : 0;
    const percentLabel = formatImportProgressPercent(imported, declared);
    const isComplete = declared > 0 && imported >= declared;

    return (
        <Tooltip arrow placement="top" title={formatImportProgressCountTooltip(imported, declared)}>
            <LinearProgress
                variant="determinate"
                value={percent}
                color={isComplete ? 'success' : 'warning'}
                aria-label={ariaLabel ?? `Tiến độ nhập vé ${percentLabel}`}
                sx={{
                    width: '100%',
                    height,
                    borderRadius: 999,
                    bgcolor: isComplete
                        ? 'var(--palette-success-lighter)'
                        : 'var(--palette-warning-lighter)',
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                    },
                }}
            />
        </Tooltip>
    );
};
