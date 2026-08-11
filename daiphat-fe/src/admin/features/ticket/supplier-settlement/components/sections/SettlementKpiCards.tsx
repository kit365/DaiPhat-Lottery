import BrokenImageOutlinedIcon from '@mui/icons-material/BrokenImageOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import StoreOutlinedIcon from '@mui/icons-material/StoreOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Box, Card, Stack, Typography } from '@mui/material';
import type { SupplierSettlementKpis } from '../../types/supplierSettlement.type';

interface Props {
    kpis: SupplierSettlementKpis;
    hasHandedOver?: boolean;
    isExpired?: boolean;
}

export const SettlementKpiCards = ({ kpis, hasHandedOver, isExpired }: Props) => {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                width: '100%',
            }}
        >
            {/* 1. Tổng vé nhập */}
            <Card
                elevation={0}
                sx={{
                    p: 2.25,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#fff',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Inventory2OutlinedIcon />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Tổng vé nhập
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#0f172a">
                            {kpis.totalImportedTickets.toLocaleString('vi-VN')}
                        </Typography>
                    </Box>
                </Stack>
            </Card>

            {/* 2. Đã bán */}
            <Card
                elevation={0}
                sx={{
                    p: 2.25,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#fff',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <ShoppingCartOutlinedIcon />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Đã bán
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#0f172a">
                            {kpis.totalSoldTickets.toLocaleString('vi-VN')}
                        </Typography>
                    </Box>
                </Stack>
            </Card>

            {/* 3. Còn lại trong kho */}
            <Card
                elevation={0}
                sx={{
                    p: 2.25,
                    borderRadius: '16px',
                    border: '1px solid #dcfce7',
                    bgcolor: '#f0fdf4',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: '#dcfce7',
                            color: '#166534',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <StoreOutlinedIcon />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={700} color="#166534">
                            {isExpired ? 'Quá hạn trả' : (hasHandedOver ? 'Đã trả NCC' : 'Còn lại trong kho')}
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#15803d">
                            {(isExpired
                                ? (kpis.totalExpiredReturnTickets ?? 0)
                                : kpis.totalRemainingTickets
                            ).toLocaleString('vi-VN')}
                        </Typography>
                    </Box>
                </Stack>
            </Card>

            {/* 4. Tổng vé sự cố (Hỏng, Lạc, Hủy số) */}
            <Card
                elevation={0}
                sx={{
                    p: 2.25,
                    borderRadius: '16px',
                    border: '1px solid #fee2e2',
                    bgcolor: '#fff5f5',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.75}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: '#fef2f2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <WarningAmberOutlinedIcon />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={700} color="#991b1b">
                            Tổng vé sự cố
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#b91c1c">
                            {(
                                kpis.totalDamagedTickets +
                                kpis.totalLostTickets +
                                kpis.totalVoidedTickets
                            ).toLocaleString('vi-VN')}
                        </Typography>
                        <Typography variant="caption" color="#7f1d1d" sx={{ fontSize: '0.68rem', display: 'block' }}>
                            {kpis.totalDamagedTickets} Hỏng · {kpis.totalLostTickets} Lạc · {kpis.totalVoidedTickets} Hủy
                        </Typography>
                    </Box>
                </Stack>
            </Card>
        </Box>
    );
};
