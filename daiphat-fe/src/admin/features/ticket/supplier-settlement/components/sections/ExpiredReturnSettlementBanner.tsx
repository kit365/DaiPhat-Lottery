"use client";

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
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
    const navigate = useNavigate();
    const [openModal, setOpenModal] = useState(false);

    if (expiredCount <= 0) return null;

    const handleActionClick = () => {
        if (expiredCount === 1 && expiredItems.length === 1) {
            navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(expiredItems[0].id));
        } else {
            setOpenModal(true);
        }
    };

    const handleNavigateDetail = (id: number) => {
        setOpenModal(false);
        navigate(ROUTES.ADMIN.SUPPLIER_SETTLEMENT.DETAIL(id));
    };

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: '16px',
                    bgcolor: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    boxShadow: '0 4px 12px 0 rgba(239, 68, 68, 0.08)',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: '6px',
                        bgcolor: '#ef4444',
                    },
                }}
            >
                <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ minWidth: 0, pl: 1 }}>
                    <Box
                        sx={{
                            width: 42,
                            height: 42,
                            borderRadius: '12px',
                            bgcolor: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid #fca5a5',
                        }}
                    >
                        <ReportProblemOutlinedIcon sx={{ fontSize: '1.5rem' }} />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="subtitle1"
                            fontWeight={800}
                            color="#991b1b"
                            sx={{ fontSize: { xs: '0.95rem', sm: '1rem' }, display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                            <span>Cảnh báo: Có {expiredCount} kỳ đối soát quá hạn trả vé chưa xử lý</span>
                        </Typography>
                        <Typography variant="body2" color="#7f1d1d" sx={{ mt: 0.25, fontSize: '0.875rem' }}>
                            Các kỳ đối soát này đã vượt mốc thời gian hạn trả vé với tổng giá trị trả vé bị đọng là{' '}
                            <Box component="span" sx={{ fontWeight: 800, color: '#dc2626' }}>
                                {formatImportCost(totalExpiredValue)} VNĐ
                            </Box>
                            . Vui lòng kiểm tra và tiến hành xử lý ngay.
                        </Typography>
                    </Box>
                </Stack>

                <Button
                    variant="contained"
                    size="small"
                    onClick={handleActionClick}
                    endIcon={<ArrowForwardOutlinedIcon fontSize="small" />}
                    sx={{
                        bgcolor: '#dc2626',
                        color: '#ffffff',
                        fontWeight: 700,
                        px: 2.5,
                        py: 0.85,
                        borderRadius: '10px',
                        textTransform: 'none',
                        boxShadow: '0 2px 8px 0 rgba(220, 38, 38, 0.25)',
                        flexShrink: 0,
                        alignSelf: { xs: 'stretch', sm: 'center' },
                        '&:hover': {
                            bgcolor: '#b91c1c',
                            boxShadow: '0 4px 12px 0 rgba(220, 38, 38, 0.35)',
                        },
                    }}
                >
                    Xem chi tiết
                </Button>
            </Box>

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
