"use client";

import React, { useMemo } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Typography, 
    Box, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableRow, 
    Alert,
    CircularProgress,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Button } from '../../../../components/ui/Button';
import { useLotteryResultDetails } from '../../hooks/useDrawResult';

interface Props {
    resultId: number | null;
    onClose: () => void;
}

const DIALOG_PAPER_SX = {
    borderRadius: '16px',
    boxShadow: 'var(--customShadows-dialog)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
};

const PRIZE_ORDER = [
    { code: 'DB', label: 'Đặc Biệt', color: 'error.main' },
    { code: 'G1', label: 'Giải Nhất' },
    { code: 'G2', label: 'Giải Nhì' },
    { code: 'G3', label: 'Giải Ba' },
    { code: 'G4', label: 'Giải Tư' },
    { code: 'G5', label: 'Giải Năm' },
    { code: 'G6', label: 'Giải Sáu' },
    { code: 'G7', label: 'Giải Bảy' },
    { code: 'G8', label: 'Giải Tám' },
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
        <Dialog
            open={!!resultId}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                className: 'admin-theme',
                sx: DIALOG_PAPER_SX,
            }}
        >
            <DialogTitle
                sx={{
                    pb: 1.5,
                    pt: 2.5,
                    px: 3,
                    pr: 6,
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    color: 'var(--palette-text-primary)',
                    borderBottom: '1px solid #e2e8f0',
                }}
            >
                Chi tiết Vé Dò
                <IconButton
                    aria-label="Đóng"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 12,
                        top: 12,
                        color: 'var(--palette-text-secondary)',
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent
                dividers
                sx={{
                    px: 3,
                    pb: 2.5,
                    pt: '24px !important',
                    borderColor: '#e2e8f0',
                }}
            >
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
                    <Box sx={{ maxWidth: 800, mx: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                        <TableContainer>
                            <Table sx={{ '& .MuiTableCell-root': { borderBottom: '1px dashed #e2e8f0', py: 2 } }}>
                                <TableBody>
                                    {PRIZE_ORDER.map(({ code, label, color }) => {
                                        const prizeValues = prizesByCode[code];
                                        if (!prizeValues && code !== 'DB') return null;

                                        return (
                                            <TableRow key={code} hover>
                                                <TableCell width="25%" align="center" sx={{ borderRight: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
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
            <DialogActions
                sx={{
                    px: 3,
                    pb: 2.5,
                    pt: 2,
                    gap: 1,
                    borderTop: '1px solid #e2e8f0',
                    bgcolor: '#f8fafc',
                }}
            >
                <Button
                    onClick={onClose}
                    variant="outlined"
                    className="btn-outlined-admin"
                    label="Đóng"
                    sx={{ minWidth: 96, borderRadius: '8px', fontWeight: 700 }}
                />
            </DialogActions>
        </Dialog>
    );
};
