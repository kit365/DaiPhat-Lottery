import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { ImportBatch } from '../../types/importBatch.type';
import { formatImportBatchHeaderCode, displayImportBatchHeaderCodeRaw } from '../../utils/importBatchCode';

type ImportBatchDuplicateWarningDialogProps = {
    open: boolean;
    existingBatch: ImportBatch | null;
    onClose: () => void;
    onContinue: () => void;
};

export const ImportBatchDuplicateWarningDialog = ({
    open,
    existingBatch,
    onClose,
    onContinue,
}: ImportBatchDuplicateWarningDialogProps) => {
    const drawDateLabel = existingBatch?.drawDate
        ? dayjs(existingBatch.drawDate).format('DD/MM/YYYY')
        : '—';

    const supplierName = existingBatch?.supplierName || '—';
    const codeLabel = existingBatch
        ? formatImportBatchHeaderCode(existingBatch.batchCode, existingBatch.id)
        : '—';
    const rawCode = displayImportBatchHeaderCodeRaw(existingBatch?.batchCode, existingBatch?.id);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1, pr: 6 }}>Phiếu nhập lô chưa hoàn thành</DialogTitle>

            <DialogContent>
                <Stack spacing={1.25}>
                    <Typography variant="body2" color="text.secondary">
                        Bạn đã có phiếu nhập lô chưa hoàn thành cho nhà cung cấp <b>{supplierName}</b> và ngày quay{' '}
                        <b>{drawDateLabel}</b>.
                    </Typography>

                    <Box>
                        <Typography variant="body2">
                            Mã: <b>{rawCode}</b>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {existingBatch ? codeLabel : ''}
                        </Typography>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="outlined">
                    Hủy
                </Button>
                <Button
                    onClick={onContinue}
                    variant="contained"
                    color="warning"
                    sx={{ whiteSpace: 'nowrap' }}
                >
                    Tiếp tục phiếu hiện tại
                </Button>
            </DialogActions>
        </Dialog>
    );
};

