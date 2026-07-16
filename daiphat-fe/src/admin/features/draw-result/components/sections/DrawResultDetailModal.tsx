import React, { useMemo } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    Typography, 
    Box, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableRow, 
    Alert,
    CircularProgress
} from '@mui/material';
import { useLotteryResultDetails } from '../../hooks/useDrawResult';

interface Props {
    resultId: number | null;
    onClose: () => void;
}

const PRIZE_ORDER = [
    { code: 'G8', label: 'Giải Tám' },
    { code: 'G7', label: 'Giải Bảy' },
    { code: 'G6', label: 'Giải Sáu' },
    { code: 'G5', label: 'Giải Năm' },
    { code: 'G4', label: 'Giải Tư' },
    { code: 'G3', label: 'Giải Ba' },
    { code: 'G2', label: 'Giải Nhì' },
    { code: 'G1', label: 'Giải Nhất' },
    { code: 'DB', label: 'Đặc Biệt', color: 'error.main' },
];

export const DrawResultDetailModal: React.FC<Props> = ({ resultId, onClose }) => {
    const { data: response, isLoading, isError } = useLotteryResultDetails(resultId);

    const prizesByCode = useMemo(() => {
        if (!response?.data) return {};
        const group: Record<string, string[]> = {};
        response.data.forEach((detail) => {
            const code = detail.prizeCode;
            if (!group[code]) group[code] = [];
            group[code].push(detail.winningNumber);
        });
        return group;
    }, [response?.data]);

    const renderNumbers = (numbers: string[], color?: string) => {
        if (!numbers || numbers.length === 0) return '-';
        return (
            <Box display="flex" flexWrap="wrap" gap={2} justifyContent="center">
                {numbers.map((num, idx) => (
                    <Typography key={idx} variant="h6" fontWeight={700} color={color || 'text.primary'} letterSpacing={2}>
                        {num}
                    </Typography>
                ))}
            </Box>
        );
    };

    return (
        <Dialog open={!!resultId} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>
                Chi tiết Vé Dò
            </DialogTitle>
            <DialogContent dividers>
                {isLoading && (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                )}
                
                {isError && (
                    <Alert severity="error">Có lỗi xảy ra khi tải chi tiết vé dò.</Alert>
                )}

                {!isLoading && !isError && (!response?.data || response.data.length === 0) && (
                    <Alert severity="warning">
                        Chưa có dữ liệu chi tiết các giải.
                    </Alert>
                )}

                {!isLoading && !isError && response?.data && response.data.length > 0 && (
                    <Box sx={{ maxWidth: 800, mx: 'auto', border: '1px solid var(--palette-divider)', borderRadius: 2, overflow: 'hidden' }}>
                        <TableContainer>
                            <Table sx={{ '& .MuiTableCell-root': { borderBottom: '1px dashed rgba(224, 224, 224, 1)', py: 2 } }}>
                                <TableBody>
                                    {PRIZE_ORDER.map(({ code, label, color }) => {
                                        const prizeValues = prizesByCode[code];
                                        if (!prizeValues && code !== 'DB') return null;

                                        return (
                                            <TableRow key={code} hover>
                                                <TableCell width="25%" align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', bgcolor: 'background.neutral' }}>
                                                    <Typography variant="subtitle1" fontWeight={600} color={color || 'text.secondary'}>
                                                        {label}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    {renderNumbers(prizeValues, color)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};
