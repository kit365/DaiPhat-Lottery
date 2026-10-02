'use client';

import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import { ROUTES } from '@/admin/constants/routes';

type Props = {
    open: boolean;
    importBatchId: number | null;
    onAcknowledge: () => void | Promise<void>;
};

export const ImportBatchStateChangedDialog = ({
    open,
    importBatchId,
    onAcknowledge,
}: Props) => {
    const openBatch = () => {
        if (importBatchId == null) return;
        window.open(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(importBatchId), '_blank', 'noopener,noreferrer');
    };

    return (
        <Dialog open={open} onClose={onAcknowledge} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <WarningAmberRoundedIcon color="warning" />
                    <Typography component="span" variant="h6" fontWeight={800}>
                        Phiếu nhập đã thay đổi
                    </Typography>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Hệ thống đã dừng nhập vé để tránh ghi dữ liệu theo thông tin cũ.
                </Alert>
                <Typography color="text.secondary">
                    Phiếu nhập hoặc các dòng phân bổ đã được thay đổi, xóa, hủy hoặc chuyển
                    trạng thái sau khi bạn chọn. Vui lòng xem lại trạng thái mới nhất rồi thực
                    hiện nhập lại.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button
                    variant="outlined"
                    startIcon={<OpenInNewRoundedIcon />}
                    disabled={importBatchId == null}
                    onClick={openBatch}
                >
                    Mở chi tiết phiếu nhập
                </Button>
                <Button variant="contained" onClick={onAcknowledge}>
                    Đã hiểu, tải lại dữ liệu
                </Button>
            </DialogActions>
        </Dialog>
    );
};
