import { Box, Typography } from '@mui/material';
import { ImagePreview, ImagePreviewInfoItem } from '../../../components/ui/ImagePreview';

interface TransferEvidencePreviewProps {
    imageUrl: string;
    title?: string;
    infoItems?: ImagePreviewInfoItem[];
    showCaption?: boolean;
}

export const TransferEvidencePreview = ({
    imageUrl,
    title = 'Minh chứng chuyển khoản',
    infoItems,
    showCaption = true,
}: TransferEvidencePreviewProps) => (
    <Box>
        {title ? (
            <Typography variant="body2" color="text.secondary" gutterBottom>
                {title}
            </Typography>
        ) : null}
        {showCaption ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Nhấn ảnh để phóng to / thu nhỏ
            </Typography>
        ) : null}
        <ImagePreview
            src={imageUrl}
            alt={title || 'Biên lai chuyển khoản'}
            dialogTitle={title || 'Biên lai chuyển khoản'}
            infoItems={infoItems}
            thumbnailSx={{
                display: 'block',
                width: '100%',
                maxWidth: 360,
                maxHeight: 420,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                objectFit: 'contain',
                bgcolor: 'background.paper',
            }}
        />
    </Box>
);
