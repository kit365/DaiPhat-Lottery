"use client";

import { useMemo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Link,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import { useImportFileCheck } from '../../hooks/useSupplierSettlement';
import type {
    SettlementImportFileCheckStatus,
    SettlementImportFileCheckTicket,
} from '../../types/supplierSettlement.type';

interface ImportFileTicketCheckDialogProps {
    open: boolean;
    settlementId?: string | number;
    onClose: () => void;
    onApplyStationQuantities: (qtyByStation: Record<number, number>) => void;
}

type TicketTab = 'FILE' | 'ONLY_SYSTEM' | 'ONLY_FILE';

const FILE_STATUS_LABEL: Record<SettlementImportFileCheckStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
    PARSED: { label: 'Đã đọc', color: 'success' },
    NO_FILE: { label: 'Không có tệp', color: 'warning' },
    DOWNLOAD_FAILED: { label: 'Không tải được', color: 'error' },
    PARSE_FAILED: { label: 'Không đọc được', color: 'error' },
};

const matchesQuery = (ticket: SettlementImportFileCheckTicket, query: string) => {
    if (!query) return true;
    const haystack = [
        ticket.serialNumber,
        ticket.numbers,
        ticket.stationName,
        ticket.importBatchCode,
        ticket.sourceFileName,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return haystack.includes(query);
};

export const ImportFileTicketCheckDialog = ({
    open,
    settlementId,
    onClose,
    onApplyStationQuantities,
}: ImportFileTicketCheckDialogProps) => {
    const { data, isLoading, isError, error } = useImportFileCheck(settlementId, open);
    const [tab, setTab] = useState<TicketTab>('FILE');
    const [query, setQuery] = useState('');

    const search = query.trim().toLowerCase();
    const fileTickets = useMemo(
        () => (data?.fileTickets || []).filter((row) => matchesQuery(row, search)),
        [data?.fileTickets, search]
    );
    const onlySystem = useMemo(
        () => (data?.onlyInSystem || []).filter((row) => matchesQuery(row, search)),
        [data?.onlyInSystem, search]
    );
    const onlyFile = useMemo(
        () => (data?.onlyInFile || []).filter((row) => matchesQuery(row, search)),
        [data?.onlyInFile, search]
    );

    const applyRows = (data?.stationSummaries || []).filter(
        (row) => row.lotteryStationId != null && row.onlyInSystemQty > 0
    );
    const canApply = applyRows.length > 0;

    const handleApply = () => {
        const qtyByStation: Record<number, number> = {};
        applyRows.forEach((row) => {
            if (row.lotteryStationId != null) {
                qtyByStation[row.lotteryStationId] = row.onlyInSystemQty;
            }
        });
        onApplyStationQuantities(qtyByStation);
    };

    const rowsForTab =
        tab === 'ONLY_SYSTEM' ? onlySystem : tab === 'ONLY_FILE' ? onlyFile : fileTickets;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2,
                    px: 3,
                    borderBottom: '1px solid #e2e8f0',
                }}
            >
                <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem' }}>
                        Kiểm tra vé bằng tệp
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Đối chiếu sê-ri trong tệp gốc với các lô vé đã nhập trên hệ thống.
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 3, py: 2.5 }}>
                {isLoading && (
                    <Stack alignItems="center" py={6}>
                        <CircularProgress size={28} />
                    </Stack>
                )}
                {isError && (
                    <Alert severity="error">
                        {(error as any)?.response?.data?.message || 'Không kiểm tra được tệp nhập.'}
                    </Alert>
                )}
                {!isLoading && !isError && data && (
                    <Stack spacing={2.5}>
                        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Phiếu nhập</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Tệp gốc</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(data.files || []).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Kỳ đối soát chưa gắn phiếu nhập nào.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {(data.files || []).map((file) => {
                                        const chip = FILE_STATUS_LABEL[file.status] || FILE_STATUS_LABEL.NO_FILE;
                                        return (
                                            <TableRow key={`${file.importBatchId}-${file.fileName || 'none'}`}>
                                                <TableCell>{file.importBatchCode || `PN #${file.importBatchId}`}</TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography variant="body2">
                                                            {file.fileName || '—'}
                                                        </Typography>
                                                        {file.originalFileUrl && (
                                                            <Link
                                                                href={file.originalFileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                underline="hover"
                                                                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                                            >
                                                                <DownloadOutlinedIcon sx={{ fontSize: 16 }} />
                                                                Tải
                                                            </Link>
                                                        )}
                                                    </Stack>
                                                    {file.errorMessage && file.status !== 'PARSED' && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {file.errorMessage}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip size="small" color={chip.color} label={chip.label} sx={{ fontWeight: 700 }} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Box>

                        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Nhà đài</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Trong tệp</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Trên hệ thống</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Chỉ trên hệ thống</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Chỉ trong tệp</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(data.stationSummaries || []).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Chưa có dữ liệu theo nhà đài.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {(data.stationSummaries || []).map((row) => (
                                        <TableRow key={String(row.lotteryStationId ?? row.stationName)}>
                                            <TableCell>{row.stationName || 'Chưa phân đài'}</TableCell>
                                            <TableCell align="right">{row.fileQty.toLocaleString('vi-VN')}</TableCell>
                                            <TableCell align="right">{row.systemQty.toLocaleString('vi-VN')}</TableCell>
                                            <TableCell align="right" sx={{ color: row.onlyInSystemQty > 0 ? '#c2410c' : undefined, fontWeight: row.onlyInSystemQty > 0 ? 700 : 400 }}>
                                                {row.onlyInSystemQty.toLocaleString('vi-VN')}
                                            </TableCell>
                                            <TableCell align="right">{row.onlyInFileQty.toLocaleString('vi-VN')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>

                        {!data.importsTickets && (
                            <Alert severity="info">
                                Tệp gốc chỉ khai báo số lượng theo nhà đài, không có danh sách sê-ri. Đối chiếu theo số lượng bên trên.
                            </Alert>
                        )}

                        {data.importsTickets && (
                            <>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
                                    <Tabs
                                        value={tab}
                                        onChange={(_, value: TicketTab) => setTab(value)}
                                        sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 700, textTransform: 'none' } }}
                                    >
                                        <Tab value="FILE" label={`Vé trong tệp (${data.fileTickets.length})`} />
                                        <Tab value="ONLY_SYSTEM" label={`Chỉ trên hệ thống (${data.onlyInSystem.length})`} />
                                        <Tab value="ONLY_FILE" label={`Chỉ trong tệp (${data.onlyInFile.length})`} />
                                    </Tabs>
                                    <TextField
                                        size="small"
                                        placeholder="Tìm sê-ri, dãy số, nhà đài"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ minWidth: { sm: 260 } }}
                                    />
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                    Khớp {data.matchedCount.toLocaleString('vi-VN')} vé giữa tệp và hệ thống.
                                </Typography>
                                <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'auto', maxHeight: 360 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Sê-ri</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Dãy số</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Nhà đài</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Phiếu nhập</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Tệp</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rowsForTab.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Không có vé trong nhóm này.
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {rowsForTab.map((row, index) => (
                                                <TableRow key={`${row.serialNumber}-${row.lotteryStationId}-${index}`}>
                                                    <TableCell sx={{ fontFamily: 'ui-monospace, monospace' }}>{row.serialNumber}</TableCell>
                                                    <TableCell>{row.numbers || '—'}</TableCell>
                                                    <TableCell>{row.stationName || 'Chưa phân đài'}</TableCell>
                                                    <TableCell>{row.importBatchCode || (row.importBatchId ? `#${row.importBatchId}` : '—')}</TableCell>
                                                    <TableCell>{row.sourceFileName || '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </>
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
                <Button onClick={onClose} color="inherit">
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    disabled={!canApply}
                    onClick={handleApply}
                    sx={{ fontWeight: 700 }}
                >
                    Điền số lượng theo đài
                </Button>
            </DialogActions>
        </Dialog>
    );
};
