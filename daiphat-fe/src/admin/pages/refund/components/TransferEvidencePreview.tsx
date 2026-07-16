import { Box, Typography } from '@mui/material';
import { ImagePreview, ImagePreviewInfoItem } from '../../../components/ui/ImagePreview';

interface TransferEvidencePreviewProps {
    imageUrl: string;
    title?: string;
    infoItems?: ImagePreviewInfoItem[];
}

export const TransferEvidencePreview = ({
    imageUrl,
    title = 'Minh chứng chuyển khoản',
    infoItems,
}: TransferEvidencePreviewProps) => (
    <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Nhấn ảnh để phóng to / thu nhỏ
        </Typography>
        <ImagePreview
            src={imageUrl}
            alt={title}
            dialogTitle={title}
            infoItems={infoItems}
            thumbnailSx={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 420,
                width: 'auto',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                objectFit: 'contain',
                bgcolor: 'background.paper',
            }}
        />
    </Box>
);
