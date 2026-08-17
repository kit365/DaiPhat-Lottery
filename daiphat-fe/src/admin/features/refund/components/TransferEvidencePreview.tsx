import { Box, Typography } from '@mui/material';
import { ImagePreview, ImagePreviewInfoItem } from '@/admin/components/ui/ImagePreview';

interface TransferEvidencePreviewProps {
    imageUrl: string;
    title?: string;
    infoItems?: ImagePreviewInfoItem[];
    showCaption?: boolean;
    compact?: boolean;
    mini?: boolean;
}

const THUMBNAIL_SIZES = {
    default: {
        display: 'block',
        width: '100%',
        maxWidth: 360,
        maxHeight: 420,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        objectFit: 'contain',
        bgcolor: 'background.paper',
    },
    compact: {
        display: 'block',
        width: 88,
        height: 110,
        maxWidth: 88,
        maxHeight: 110,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        objectFit: 'cover',
        bgcolor: 'background.paper',
        cursor: 'pointer',
    },
    mini: {
        display: 'block',
        width: 50,
        height: 50,
        maxWidth: 50,
        maxHeight: 50,
        borderRadius: '6px',
        border: '1px solid',
        borderColor: 'divider',
        objectFit: 'cover',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    },
} as const;

export const TransferEvidencePreview = ({
    imageUrl,
    title = 'Minh chứng chuyển khoản',
    infoItems,
    showCaption = true,
    compact = false,
    mini = false,
}: TransferEvidencePreviewProps) => {
    const isSmall = compact || mini;
    const thumbnailSx = mini ? THUMBNAIL_SIZES.mini : compact ? THUMBNAIL_SIZES.compact : THUMBNAIL_SIZES.default;

    return (
    <Box sx={isSmall ? { display: 'inline-block', lineHeight: 0, flexShrink: 0 } : undefined}>
        {!isSmall && title ? (
            <Typography variant="body2" color="text.secondary" gutterBottom>
                {title}
            </Typography>
        ) : null}
        {!isSmall && showCaption ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Nhấn ảnh để phóng to / thu nhỏ
            </Typography>
        ) : null}
        <ImagePreview
            src={imageUrl}
            alt={title || 'Biên lai chuyển khoản'}
            dialogTitle={title || 'Biên lai chuyển khoản'}
            infoItems={infoItems}
            thumbnailSx={thumbnailSx}
        />
    </Box>
    );
};
