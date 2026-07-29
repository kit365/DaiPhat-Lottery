import { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { Title } from '../../components/ui/Title';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { CanAccess } from '../../components/auth/CanAccess';
import { PERMISSIONS } from '../../constants/permission.constants';
import { prefixAdmin } from '../../constants/routes';
import { PrizePayoutStatusBadge } from '../../../client/components/prize-payout/PrizePayoutStatusBadge';
import { TransferEvidencePreview } from '../refund/components/TransferEvidencePreview';
import {
    formatPrizePayoutCurrency,
    PrizePayoutRequestStatus,
} from '../../../types/prize-payout.type';
import { prizePayoutAdminApi } from '../../api/prizePayout.api';
import {
    useCompletePrizePayout,
    useGetStaffPrizePayoutDetail,
    useRejectPrizePayout,
} from './hooks/usePrizePayoutManagement';
import { UploadSingleFile } from '../../components/upload/UploadSingleFile';

export const PrizePayoutDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const requestId = Number(id);
    const { data, isLoading } = useGetStaffPrizePayoutDetail(requestId);
    const completeMutation = useCompletePrizePayout();
    const rejectMutation = useRejectPrizePayout();

    const [completeOpen, setCompleteOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [uploading, setUploading] = useState(false);

    const detail = data?.data;

    if (isLoading) {
        return (
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!detail) {
        return (
            <Box sx={{ py: 4 }}>
                <Typography>Không tìm thấy yêu cầu</Typography>
                <Button sx={{ mt: 2 }} onClick={() => navigate(`/${prefixAdmin}/prize-payouts/list`)}>
                    Quay lại
                </Button>
            </Box>
        );
    }

    const isPending = detail.status === PrizePayoutRequestStatus.PENDING;

    return (
        <>
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <Title title={`Trả thưởng ${detail.requestCode}`} />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Trả thưởng', to: `/${prefixAdmin}/prize-payouts/list` },
                            { label: detail.requestCode },
                        ]}
                    />
                </div>
                <PrizePayoutStatusBadge status={detail.status} />
            </div>

            <Stack spacing={2}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Thông tin vé & tiền thưởng</Typography>
                        <Typography>Khách: {detail.customerName}</Typography>
                        <Typography>Đài: {detail.stationName} · {detail.drawDate ? dayjs(detail.drawDate).format('DD/MM/YYYY') : '—'}</Typography>
                        <Typography>Dãy số: {detail.numbers} · Giải: {detail.prizeDisplayName || detail.prizeCode}</Typography>
                        <Typography sx={{ mt: 1, fontWeight: 700, color: 'error.main' }}>
                            {formatPrizePayoutCurrency(detail.grossAmount)}
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Tài khoản nhận</Typography>
                        <Typography>{detail.bankName} · {detail.bankAccountNumber}</Typography>
                        <Typography>{detail.accountHolderName}</Typography>
                    </CardContent>
                </Card>

                {detail.transferEvidenceUrl && (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Biên lai</Typography>
                            <TransferEvidencePreview imageUrl={detail.transferEvidenceUrl} />
                        </CardContent>
                    </Card>
                )}

                {detail.rejectReason && (
                    <Card sx={{ borderColor: 'error.light' }}>
                        <CardContent>
                            <Typography color="error" fontWeight={700}>Lý do từ chối</Typography>
                            <Typography>{detail.rejectReason}</Typography>
                        </CardContent>
                    </Card>
                )}

                {isPending && (
                    <Stack direction="row" spacing={2}>
                        <CanAccess permission={PERMISSIONS.PRIZE_PAYOUT.PROCESS}>
                            <Button variant="contained" color="success" onClick={() => setCompleteOpen(true)}>
                                Xác nhận chuyển khoản
                            </Button>
                            <Button variant="outlined" color="error" onClick={() => setRejectOpen(true)}>
                                Từ chối
                            </Button>
                        </CanAccess>
                    </Stack>
                )}
            </Stack>

            <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Xác nhận chuyển khoản trả thưởng</DialogTitle>
                <DialogContent>
                    <UploadSingleFile
                        value={evidenceUrl}
                        onChange={setEvidenceUrl}
                        customUpload={prizePayoutAdminApi.uploadTransferEvidence}
                        autoUpload
                        onUploadingChange={setUploading}
                        disabled={uploading || completeMutation.isPending}
                        label="Ảnh biên lai chuyển khoản"
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompleteOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        disabled={!evidenceUrl || completeMutation.isPending}
                        onClick={() => {
                            completeMutation.mutate(
                                { id: requestId, data: { transferEvidenceUrl: evidenceUrl } },
                                { onSuccess: () => setCompleteOpen(false) }
                            );
                        }}
                    >
                        Hoàn tất
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Từ chối yêu cầu trả thưởng</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Lý do từ chối *"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectOpen(false)}>Hủy</Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={!rejectReason.trim() || rejectMutation.isPending}
                        onClick={() => {
                            rejectMutation.mutate(
                                { id: requestId, data: { reason: rejectReason.trim() } },
                                { onSuccess: () => setRejectOpen(false) }
                            );
                        }}
                    >
                        Từ chối
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
