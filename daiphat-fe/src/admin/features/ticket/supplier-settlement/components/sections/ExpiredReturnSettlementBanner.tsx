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
    Card,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
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
    currentSettlementId?: number;
    customTitle?: string;
    customDescription?: string;
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
    currentSettlementId,
    customTitle,
    customDescription,
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

            {/* Modal danh sách các kỳ quá hạn trả vé */}
            <Dialog
                open={openModal}
                onClose={() => setOpenModal(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        p: 2.5,
                        bgcolor: '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: '#fef2f2',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #fecaca',
                                flexShrink: 0,
                            }}
                        >
                            <ReportProblemOutlinedIcon sx={{ fontSize: '1.6rem' }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={800} color="#0f172a" lineHeight={1.2}>
                                Danh sách kỳ đối soát quá hạn trả vé
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                Phát hiện {expiredCount} kỳ đối soát đã vượt mốc hạn trả vé quy định, cần ưu tiên kiểm tra.
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton
                        onClick={() => setOpenModal(false)}
                        sx={{
                            color: '#64748b',
                            bgcolor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3, bgcolor: '#fafafa' }}>
                    {/* Thống kê nhanh trong Modal - 2 sub-cards cân đối */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    bgcolor: '#ffffff',
                                    border: '1px solid #fee2e2',
                                    borderLeft: '5px solid #ef4444',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                                }}
                            >
                                <Typography variant="caption" color="#991b1b" fontWeight={700} sx={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    TỔNG SỐ KỲ QUÁ HẠN
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#991b1b" sx={{ mt: 0.5 }}>
                                    {expiredCount} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#b91c1c' }}>kỳ đối soát</span>
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '14px',
                                    bgcolor: '#ffffff',
                                    border: '1px solid #fee2e2',
                                    borderLeft: '5px solid #dc2626',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                                }}
                            >
                                <Typography variant="caption" color="#991b1b" fontWeight={700} sx={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    TỔNG GIÁ TRỊ TRẢ VÉ BỊ ĐỌNG
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="#dc2626" sx={{ mt: 0.5 }}>
                                    {formatImportCost(totalExpiredValue)} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#dc2626' }}>VNĐ</span>
                                </Typography>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Bảng danh sách các supplier-settlement quá hạn */}
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            bgcolor: '#ffffff',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                        }}
                    >
                        <Table size="medium">
                            <TableHead sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', minWidth: 180 }}>Nhà cung cấp</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', minWidth: 190 }}>Kỳ đối soát</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', minWidth: 160 }}>Tổng giá trị nhập</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', minWidth: 160 }}>Giá trị quá hạn</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', minWidth: 120 }}>Trạng thái</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', minWidth: 120 }}>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {expiredItems.map((item) => {
                                    const periodStr = `${formatDate(item.periodFrom)} → ${formatDate(item.periodTo)}`;
                                    const expiredVal = item.expiredReturnValue ?? item.totalReturnValue ?? 0;
                                    const isCurrent = currentSettlementId !== undefined && Number(item.id) === Number(currentSettlementId);

                                    return (
                                        <TableRow
                                            key={item.id}
                                            sx={{
                                                bgcolor: isCurrent ? '#fff1f2' : '#ffffff',
                                                transition: 'all 0.15s ease',
                                                borderLeft: isCurrent ? '6px solid #dc2626' : '4px solid #ef4444',
                                                boxShadow: isCurrent ? 'inset 0 0 0 1px #fca5a5' : 'none',
                                                '&:hover': {
                                                    bgcolor: '#fee2e2 !important',
                                                },
                                                '& td': {
                                                    borderColor: isCurrent ? '#fca5a5' : '#f1f5f9',
                                                    py: 2,
                                                },
                                            }}
                                        >
                                            <TableCell sx={{ minWidth: 180 }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                        {item.supplierName || 'Nhà cung cấp'}
                                                    </Typography>
                                                    {isCurrent && (
                                                        <Chip
                                                            label="📍 Đang xem"
                                                            size="small"
                                                            sx={{
                                                                bgcolor: '#dc2626',
                                                                color: '#ffffff',
                                                                fontWeight: 800,
                                                                fontSize: '0.675rem',
                                                                height: 20,
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                                {item.supplierCode && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontFamily: 'monospace',
                                                            color: '#64748b',
                                                            bgcolor: isCurrent ? '#ffe4e6' : '#f1f5f9',
                                                            px: 0.75,
                                                            py: 0.2,
                                                            borderRadius: '4px',
                                                            fontWeight: 600,
                                                            display: 'inline-block',
                                                            mt: 0.25,
                                                        }}
                                                    >
                                                        {item.supplierCode}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                <Chip
                                                    label={periodStr}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        bgcolor: isCurrent ? '#ffffff' : '#f8fafc',
                                                        borderColor: isCurrent ? '#fca5a5' : '#cbd5e1',
                                                        color: isCurrent ? '#991b1b' : '#334155',
                                                        fontWeight: 700,
                                                        fontSize: '0.775rem',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={700} color="#0f172a" sx={{ whiteSpace: 'nowrap' }}>
                                                    {formatImportCost(item.totalImportValue)} VNĐ
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                <Typography variant="body2" fontWeight={800} color="#dc2626" sx={{ whiteSpace: 'nowrap' }}>
                                                    {formatImportCost(expiredVal)} VNĐ
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                <Chip
                                                    label="🔴 Quá hạn"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: '#fee2e2',
                                                        color: '#991b1b',
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        border: '1px solid #fca5a5',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                {isCurrent ? (
                                                    <Chip
                                                        label="Đang xem"
                                                        sx={{
                                                            bgcolor: '#991b1b',
                                                            color: '#ffffff',
                                                            fontWeight: 800,
                                                            fontSize: '0.775rem',
                                                            px: 1,
                                                            py: 0.4,
                                                            borderRadius: '8px',
                                                        }}
                                                    />
                                                ) : (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                                                        onClick={() => handleNavigateDetail(item.id)}
                                                        sx={{
                                                            bgcolor: '#dc2626',
                                                            color: '#ffffff',
                                                            fontWeight: 700,
                                                            px: 2,
                                                            py: 0.6,
                                                            borderRadius: '8px',
                                                            textTransform: 'none',
                                                            fontSize: '0.8125rem',
                                                            whiteSpace: 'nowrap',
                                                            boxShadow: '0 2px 6px 0 rgba(220, 38, 38, 0.2)',
                                                            '&:hover': {
                                                                bgcolor: '#b91c1c',
                                                                boxShadow: '0 4px 10px 0 rgba(220, 38, 38, 0.3)',
                                                            },
                                                        }}
                                                    >
                                                        Chi tiết
                                                    </Button>
                                                )}
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
