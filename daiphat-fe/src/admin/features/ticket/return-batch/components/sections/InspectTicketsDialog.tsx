"use client";

import CloseIcon from '@mui/icons-material/Close';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import {
    Box,
    Button,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { ReportSerialFaultModal } from '../../../import-batch/components/sections/ReportSerialFaultModal';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import {
    useConfirmReturnInspection,
    useInspectableReturnSerials,
} from '../../hooks/useReturnBatch';
import type { InspectableReturnSerial, ReturnDeliveryMode } from '../../types/returnBatch.type';
import { isFaultyTicketCondition } from '../../../import-batch/utils/serialIncidentWorkflow';

interface Props {
    open: boolean;
    batchId: number;
    onClose: () => void;
    onCompleted: () => void;
}

const isReturnSelectableSerial = (serial: InspectableReturnSerial): boolean => {
    if (serial.status !== 'IN_STOCK') return false;
    // Physical faults are tracked on ticketCondition (status stays IN_STOCK).
    if (isFaultyTicketCondition(serial.ticketCondition)) return false;
    return true;
};

export const InspectTicketsDialog = ({ open, batchId, onClose, onCompleted }: Props) => {
    const { data: serials = [], isLoading, refetch } = useInspectableReturnSerials(batchId, open);
    const confirmInspection = useConfirmReturnInspection();

    const [deliveryMode, setDeliveryMode] = useState<ReturnDeliveryMode>('RETAILER_DELIVERS');
    const [faultSerial, setFaultSerial] = useState<InspectableReturnSerial | null>(null);

    useEffect(() => {
        if (!open) return;
        setDeliveryMode('RETAILER_DELIVERS');
    }, [open]);

    // Only count serials that are currently IN_STOCK + GOOD (exclude reported fault/voided serials)
    const inStockSerials = useMemo(
        () => serials.filter(isReturnSelectableSerial),
        [serials]
    );

    const inStockCount = inStockSerials.length;
    const inStockValue = useMemo(
        () => inStockSerials.reduce((sum, s) => sum + Number(s.importCost || 0), 0),
        [inStockSerials]
    );

    const handleConfirm = async () => {
        if (inStockCount === 0) {
            toast.error('Không có sê-ri IN_STOCK nào đủ điều kiện để trả.');
            return;
        }
        try {
            await confirmInspection.mutateAsync({
                id: batchId,
                payload: {
                    deliveryMode,
                    serialIds: inStockSerials.map((s) => s.serialId),
                    returnReceiptUrl: null,
                },
            });
            toast.success('Đã xác nhận kiểm tra — các sê-ri chuyển sang Chờ trả (PENDING-RETURN).');
            onCompleted();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể xác nhận kiểm tra vé.');
        }
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.18)',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        m: 0,
                        py: 2,
                        px: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #E5E7EB',
                        bgcolor: '#FAFBFC',
                    }}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={700} color="#111827">
                            Kiểm tra vé trả NCC
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Rà soát dải sê-ri vé kho và chọn hình thức giao trả cho nhà cung cấp
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small" sx={{ color: '#6B7280' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    {/* Delivery Mode Full-Width Card */}
                    <Box sx={{ mb: 2.5, width: '100%' }}>
                        <Card
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: '12px',
                                borderColor: '#E5E7EB',
                                width: '100%',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={700} color="#374151" mb={1.5}>
                                Hình thức giao trả <Typography component="span" color="error.main">*</Typography>
                            </Typography>
                            <RadioGroup
                                value={deliveryMode}
                                onChange={(e) => setDeliveryMode(e.target.value as ReturnDeliveryMode)}
                                sx={{ width: '100%' }}
                            >
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                        gap: 2,
                                        width: '100%',
                                    }}
                                >
                                    <Paper
                                        variant="outlined"
                                        onClick={() => setDeliveryMode('RETAILER_DELIVERS')}
                                        sx={{
                                            p: 2,
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            borderColor: deliveryMode === 'RETAILER_DELIVERS' ? '#00A76F' : '#E5E7EB',
                                            bgcolor: deliveryMode === 'RETAILER_DELIVERS' ? '#F4FBF7' : '#fff',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            boxShadow: deliveryMode === 'RETAILER_DELIVERS' ? '0 0 0 1px #00A76F' : 'none',
                                            transition: 'all 0.2s ease-in-out',
                                            boxSizing: 'border-box',
                                            '&:hover': { borderColor: '#00A76F' },
                                        }}
                                    >
                                        <Radio
                                            size="small"
                                            checked={deliveryMode === 'RETAILER_DELIVERS'}
                                            sx={{
                                                mt: -0.25,
                                                mr: 1.25,
                                                color: '#919EAB',
                                                '&.Mui-checked': { color: '#00A76F' },
                                            }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" fontWeight={600} color="#1F2937">
                                                Mang trả NCC (Chờ giao vé → Đã trả)
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5} sx={{ lineHeight: 1.4 }}>
                                                Đại lý tự vận chuyển vé đến giao trực tiếp cho đại lý/nhà cung cấp
                                            </Typography>
                                        </Box>
                                    </Paper>

                                    <Paper
                                        variant="outlined"
                                        onClick={() => setDeliveryMode('SUPPLIER_COLLECTS')}
                                        sx={{
                                            p: 2,
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            borderColor: deliveryMode === 'SUPPLIER_COLLECTS' ? '#00A76F' : '#E5E7EB',
                                            bgcolor: deliveryMode === 'SUPPLIER_COLLECTS' ? '#F4FBF7' : '#fff',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            boxShadow: deliveryMode === 'SUPPLIER_COLLECTS' ? '0 0 0 1px #00A76F' : 'none',
                                            transition: 'all 0.2s ease-in-out',
                                            boxSizing: 'border-box',
                                            '&:hover': { borderColor: '#00A76F' },
                                        }}
                                    >
                                        <Radio
                                            size="small"
                                            checked={deliveryMode === 'SUPPLIER_COLLECTS'}
                                            sx={{
                                                mt: -0.25,
                                                mr: 1.25,
                                                color: '#919EAB',
                                                '&.Mui-checked': { color: '#00A76F' },
                                            }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" fontWeight={600} color="#1F2937">
                                                NCC đến lấy (Chờ giao vé → Đã trả)
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5} sx={{ lineHeight: 1.4 }}>
                                                Đại diện nhà cung cấp đến nhận trực tiếp tại cửa hàng
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Box>
                            </RadioGroup>
                        </Card>
                    </Box>

                    {/* Selected Summary Bar */}
                    <Box
                        sx={{
                            p: 1.75,
                            px: 2.5,
                            mb: 2,
                            borderRadius: '10px',
                            bgcolor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                                label={`${inStockCount} vé`}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 700, borderRadius: '6px' }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                đủ điều kiện trả
                            </Typography>
                        </Stack>

                        <Typography variant="body2" color="text.primary">
                            Giá trị ước tính:{' '}
                            <Typography component="span" fontWeight={700} color="success.main" fontSize="1.05rem">
                                {formatImportCost(inStockValue)} VNĐ
                            </Typography>
                        </Typography>
                    </Box>

                    {/* Table of Serials */}
                    {isLoading ? (
                        <Box display="flex" justifyContent="center" py={6}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <TableContainer
                            sx={{
                                maxHeight: 380,
                                border: '1px solid #E5E7EB',
                                borderRadius: '10px',
                                overflow: 'auto',
                            }}
                        >
                            <Table size="small" stickyHeader sx={{ minWidth: 650 }}>
                                <TableHead>
                                    <TableRow sx={{ '& th': { bgcolor: '#FAFBFC', fontWeight: 600, color: '#4B5563' } }}>
                                        <TableCell>Nhà đài</TableCell>
                                        <TableCell>Số vé</TableCell>
                                        <TableCell>Sê-ri</TableCell>
                                        <TableCell>Trạng thái</TableCell>
                                        <TableCell align="right">Giá vốn</TableCell>
                                        <TableCell align="right">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {serials.map((row) => {
                                        const isSelectable = isReturnSelectableSerial(row);
                                        return (
                                            <TableRow key={row.serialId} hover sx={{ opacity: isSelectable ? 1 : 0.6 }}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {row.lotteryStationName || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {row.ticketNumbers || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                                        {row.serialNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={
                                                            isFaultyTicketCondition(row.ticketCondition)
                                                                ? (row.ticketConditionDisplayName || row.ticketCondition || 'Hỏng')
                                                                : isSelectable
                                                                  ? 'KHO (IN_STOCK)'
                                                                  : row.status
                                                        }
                                                        size="small"
                                                        color={isSelectable ? 'success' : 'warning'}
                                                        variant={isSelectable ? 'outlined' : 'filled'}
                                                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight={600} color="text.primary">
                                                        {formatImportCost(row.importCost)} VNĐ
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {isSelectable ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="warning"
                                                            startIcon={<ReportProblemIcon />}
                                                            onClick={() => setFaultSerial(row)}
                                                            sx={{
                                                                textTransform: 'none',
                                                                borderRadius: '6px',
                                                                fontWeight: 600,
                                                                fontSize: '0.75rem',
                                                                py: 0.25,
                                                                px: 1.25,
                                                            }}
                                                        >
                                                            Báo tình trạng
                                                        </Button>
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Đã báo hỏng
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {serials.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                                <Typography color="text.secondary">
                                                    Không còn sê-ri IN_STOCK đủ điều kiện trả.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, bgcolor: '#FAFBFC', borderTop: '1px solid #E5E7EB' }}>
                    <Button
                        variant="outlined"
                        onClick={onClose}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            color: '#374151',
                            borderColor: '#D1D5DB',
                        }}
                    >
                        Đóng
                    </Button>
                    <LoadingButton
                        label="Xác nhận kiểm tra"
                        className="btn-primary-admin"
                        loading={confirmInspection.isPending}
                        onClick={handleConfirm}
                        disabled={inStockCount === 0}
                    />
                </DialogActions>
            </Dialog>

            {faultSerial && (
                <ReportSerialFaultModal
                    open={!!faultSerial}
                    onClose={() => setFaultSerial(null)}
                    onSuccess={() => {
                        setFaultSerial(null);
                        refetch();
                        onCompleted();
                    }}
                    serials={[
                        {
                            id: faultSerial.serialId,
                            serialNumber: faultSerial.serialNumber,
                            status: faultSerial.status,
                            ticketCondition: faultSerial.ticketCondition,
                            returnBatchLineId: faultSerial.returnBatchLineId,
                        },
                    ]}
                    ticketNumbers={faultSerial.ticketNumbers || undefined}
                />
            )}
        </>
    );
};
