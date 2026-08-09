"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useState } from 'react';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import { SupplierSettlement } from '../../types/supplierSettlement.type';

interface ExpiredReturnSettlementBannerProps {
    expiredCount: number;
    totalExpiredValue: number;
    expiredItems?: SupplierSettlement[];
}

const formatDate = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
};

export const ExpiredReturnSettlementBanner = ({
    expiredCount,
    totalExpiredValue,
    expiredItems = [],
}: ExpiredReturnSettlementBannerProps) => {
    const router = useAdminRouter();
    const [openModal, setOpenModal] = useState(false);

    if (expiredCount <= 0) return null;

    const handleActionClick = () => {
        if (expiredCount === 1 && expiredItems.length === 1) {
            router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(expiredItems[0].id));
        } else {
            setOpenModal(true);
        }
    };

    const handleNavigateDetail = (id: number) => {
        setOpenModal(false);
        router.push(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id));
    };

    return (
        <>
            <Alert
                severity="error"
                icon={<ReportProblemOutlinedIcon fontSize="inherit" />}
                sx={{ py: 0.75, alignItems: 'center' }}
                action={
                    <Button
                        color="inherit"
                        size="small"
                        onClick={handleActionClick}
                        sx={{ fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        Xem chi tiết
                    </Button>
                }
            >
                <Typography variant="body2" component="span">
                    Có <strong>{expiredCount}</strong> kỳ đối soát <strong>quá hạn trả vé</strong>
                    {totalExpiredValue > 0 ? (
                        <>
                            {' '}
                            — giá trị đọng{' '}
                            <strong>{formatImportCost(totalExpiredValue)} VNĐ</strong>
                        </>
                    ) : null}
                    . Vui lòng kiểm tra và xử lý sớm.
                </Typography>
            </Alert>

            {/* Modal danh sách các kỳ quá hạn trả vé (khi có > 1 bản ghi) */}
            <Dialog
                open={openModal}
                onClose={() => setOpenModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2.5,
                        bgcolor: '#fef2f2',
                        borderBottom: '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <ReportProblemOutlinedIcon sx={{ color: '#dc2626', fontSize: '1.75rem' }} />
                        <Box>
                            <Typography variant="h6" fontWeight={800} color="#991b1b" lineHeight={1.2}>
                                Danh sách kỳ đối soát quá hạn trả vé
                            </Typography>
                            <Typography variant="caption" color="#7f1d1d">
                                Phát hiện {expiredCount} kỳ đối soát cần ưu tiên xử lý lập phiếu trả vé
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton
                        onClick={() => setOpenModal(false)}
                        sx={{ color: '#991b1b', '&:hover': { bgcolor: '#fee2e2' } }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    {/* Thống kê nhanh trong Modal */}
                    <Box
                        sx={{
                            mb: 2.5,
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: '#fff1f2',
                            border: '1px solid #ffe4e6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1.5,
                        }}
                    >
                        <Box>
                            <Typography variant="caption" color="#9f1239" fontWeight={600} display="block">
                                TỔNG SỐ KỲ QUÁ HẠN
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#be123c">
                                {expiredCount} kỳ đối soát
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                            <Typography variant="caption" color="#9f1239" fontWeight={600} display="block">
                                TỔNG GIÁ TRỊ TRẢ VÉ BỊ ĐỌNG
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="#dc2626">
                                {formatImportCost(totalExpiredValue)} VNĐ
                            </Typography>
                        </Box>
                    </Box>

                    {/* Bảng danh sách các supplier-settlement quá hạn */}
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <Table size="medium">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Nhà cung cấp</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>Kỳ đối soát</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Tổng giá trị nhập</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>Giá trị quá hạn</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#334155' }}>Trạng thái</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#334155' }}>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {expiredItems.map((item) => {
                                    const periodStr = `${formatDate(item.periodFrom)} → ${formatDate(item.periodTo)}`;
                                    const expiredVal = item.expiredReturnValue ?? item.totalReturnValue ?? 0;

                                    return (
                                        <TableRow
                                            key={item.id}
                                            hover
                                            sx={{
                                                bgcolor: '#fef2f2',
                                                '&:last-child td, &:last-child th': { border: 0 },
                                            }}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                    {item.supplierName || 'Nhà cung cấp'}
                                                </Typography>
                                                {item.supplierCode && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {item.supplierCode}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={600} color="#334155">
                                                    {periodStr}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600} color="#0f172a">
                                                    {formatImportCost(item.totalImportValue)} VNĐ
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={800} color="#dc2626">
                                                    {formatImportCost(expiredVal)} VNĐ
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label="🔴 Quá hạn"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: '#fee2e2',
                                                        color: '#991b1b',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        border: '1px solid #fca5a5',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<VisibilityOutlinedIcon />}
                                                    onClick={() => handleNavigateDetail(item.id)}
                                                    sx={{
                                                        bgcolor: '#dc2626',
                                                        color: '#ffffff',
                                                        fontWeight: 700,
                                                        borderRadius: '8px',
                                                        textTransform: 'none',
                                                        fontSize: '0.8125rem',
                                                        '&:hover': {
                                                            bgcolor: '#b91c1c',
                                                        },
                                                    }}
                                                >
                                                    Chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>
        </>
    );
};
