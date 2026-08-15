"use client";

import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import { ImagePreview } from '../../../../../components/ui/ImagePreview';
import { formatImportBatchHeaderCode } from '../../../import-batch/utils/importBatchCode';
import type { SettlementOverviewImportBatch } from '../../types/supplierSettlement.type';

interface ImportTicketListImagesDialogProps {
    open: boolean;
    importBatches?: SettlementOverviewImportBatch[];
    onClose: () => void;
}

export const ImportTicketListImagesDialog = ({
    open,
    importBatches = [],
    onClose,
}: ImportTicketListImagesDialogProps) => {
    const groups = importBatches
        .map((batch) => ({
            id: batch.id,
            batchCode: formatImportBatchHeaderCode(batch.batchCode ?? undefined, batch.id),
            urls: (batch.ticketListImageUrls ?? []).filter(Boolean),
        }))
        .filter((group) => group.urls.length > 0);

    const totalImages = groups.reduce((sum, group) => sum + group.urls.length, 0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <CollectionsOutlinedIcon sx={{ color: '#0369a1' }} />
                    <span>Ảnh danh sách lô vé nhập</span>
                </Stack>
                <IconButton
                    aria-label="Đóng"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {totalImages === 0 ? (
                    <Typography color="text.secondary">
                        Chưa có ảnh danh sách vé nhập cho các phiếu của ngày này.
                    </Typography>
                ) : (
                    <Stack spacing={2.5} divider={<Divider />}>
                        {groups.map((group) => (
                            <Box key={group.id}>
                                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25 }}>
                                    {group.batchCode}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                    {group.urls.map((url) => (
                                        <ImagePreview
                                            key={url}
                                            src={url}
                                            alt={`Ảnh danh sách vé ${group.batchCode}`}
                                            dialogTitle={`Ảnh danh sách vé — ${group.batchCode}`}
                                            thumbnailSx={{
                                                width: 120,
                                                height: 120,
                                                maxWidth: 120,
                                                maxHeight: 120,
                                                borderRadius: 1,
                                                objectFit: 'cover',
                                                border: '1px solid #e2e8f0',
                                                bgcolor: '#f8fafc',
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
};
