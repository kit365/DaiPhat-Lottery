import { Box, Link, Typography } from '@mui/material';

interface TransferEvidencePreviewProps {
    imageUrl: string;
    title?: string;
}

export const TransferEvidencePreview = ({
    imageUrl,
    title = 'Minh chứng chuyển khoản',
}: TransferEvidencePreviewProps) => (
    <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
        </Typography>
        <Box
            component="img"
            src={imageUrl}
            alt={title}
            sx={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 420,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                objectFit: 'contain',
                bgcolor: 'background.paper',
            }}
            onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}
        />
        <Link
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{ display: 'inline-block', mt: 1 }}
        >
            Mở ảnh gốc
        </Link>
    </Box>
);
