"use client";

import { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
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
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import type { SettlementAdjustmentReasonCode, SettlementResolvableSerial } from '../../types/supplierSettlement.type';
import { formatSettlementMoney } from '../../utils/settlementCashflow';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';

interface MissingReturnTicketsPanelProps {
    serials: SettlementResolvableSerial[];
    difference?: number;
    loading?: boolean;
    submitting?: boolean;
    /** Block resolve actions when return-batches are not yet handed over. */
    disabled?: boolean;
    onResolve: (payload: {
        serialIds?: number[];
        resolution: 'EXPIRED' | 'LOST' | 'DAMAGED' | 'VOIDED';
        reasonCode: SettlementAdjustmentReasonCode;
        adjustmentAmount?: number;
        note?: string;
        markResolved: boolean;
    }) => void;
}

const formatNumberWithDots = (val?: number | string | null): string => {
    if (val === '' || val === null || val === undefined) return '';
    const digits = String(val).replace(/\D/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toLocaleString('vi-VN');
};

export const MissingReturnTicketsPanel = ({
    serials,
    difference,
    loading,
    submitting,
    disabled = false,
    onResolve,
}: MissingReturnTicketsPanelProps) => {
    const [selected, setSelected] = useState<number[]>([]);
    const [resolution, setResolution] = useState<'EXPIRED' | 'LOST' | 'DAMAGED' | 'VOIDED'>('LOST');
    const [reasonCode, setReasonCode] = useState<SettlementAdjustmentReasonCode>('LOST_DURING_RETURN');
    const [note, setNote] = useState('');
    const requiredQuantity = Math.abs(Number(difference ?? 0));
    const remainingSlots = Math.max(0, requiredQuantity - selected.length);
    const isAtSelectionLimit = remainingSlots === 0 && requiredQuantity > 0;
    const isSelectedQuantityExact = selected.length === requiredQuantity;

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStation, setSelectedStation] = useState<string>('ALL');

    // Extract unique station names with item counts
    const stationList = useMemo(() => {
        const map = new Map<string, number>();
        serials.forEach((s) => {
            const name = s.stationName || 'Chưa phân đài';
            map.set(name, (map.get(name) || 0) + 1);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    }, [serials]);

    // Filtered serials based on Station Tab & Search Query
    const filteredSerials = useMemo(() => {
        return serials.filter((s) => {
            const matchSearch =
                !searchQuery.trim() ||
                s.serialNumber.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                (s.stationName && s.stationName.toLowerCase().includes(searchQuery.trim().toLowerCase()));

            const matchStation =
                selectedStation === 'ALL' ||
                (s.stationName ? s.stationName === selectedStation : selectedStation === 'Chưa phân đài');

            return matchSearch && matchStation;
        });
    }, [serials, searchQuery, selectedStation]);

    const filteredIds = useMemo(() => filteredSerials.map((s) => s.serialId), [filteredSerials]);
    const selectedInFilteredIds = useMemo(
        () => filteredIds.filter((id) => selected.includes(id)),
        [filteredIds, selected]
    );
    const unselectedFilteredIds = useMemo(
        () => filteredIds.filter((id) => !selected.includes(id)),
        [filteredIds, selected]
    );

    const isAllFilteredSelected =
        filteredIds.length > 0
        && selectedInFilteredIds.length > 0
        && selectedInFilteredIds.length === Math.min(filteredIds.length, requiredQuantity)
        && (unselectedFilteredIds.length === 0 || isAtSelectionLimit);
    const isSomeFilteredSelected =
        selectedInFilteredIds.length > 0 && !isAllFilteredSelected;
    const headerSelectDisabled =
        filteredIds.length === 0 || (isAtSelectionLimit && selectedInFilteredIds.length === 0);

    const toggleSelectAllFiltered = () => {
        if (headerSelectDisabled) {
            return;
        }
        if (selectedInFilteredIds.length > 0 && (isAtSelectionLimit || isAllFilteredSelected)) {
            setSelected((prev) => prev.filter((id) => !filteredIds.includes(id)));
            return;
        }
        setSelected((prev) => {
            const remaining = Math.max(0, requiredQuantity - prev.length);
            if (remaining === 0) {
                return prev;
            }
            const toAdd = unselectedFilteredIds.filter((id) => !prev.includes(id)).slice(0, remaining);
            return Array.from(new Set([...prev, ...toAdd]));
        });
    };

    const toggle = (id: number) => {
        setSelected((prev) => {
            if (prev.includes(id)) {
                return prev.filter((x) => x !== id);
            }
            if (requiredQuantity <= 0 || prev.length >= requiredQuantity) {
                return prev;
            }
            return [...prev, id];
        });
    };

    const selectedCostSum = useMemo(() => {
        return serials
            .filter((s) => selected.includes(s.serialId))
            .reduce((sum, s) => sum + Number(s.importCost || 0), 0);
    }, [serials, selected]);
    const amountDisplay = selected.length > 0 ? formatNumberWithDots(selectedCostSum) : '';

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            }}
        >
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: '#fff7ed',
                            color: '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid #ffedd5',
                        }}
                    >
                        <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.5rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ fontSize: '1.15rem', lineHeight: 1.3 }}>
                            Xử lý thiếu trả
                        </Typography>
                        <Typography variant="body2" color="#64748b" sx={{ mt: 0.25 }}>
                            Thực tế trả ít hơn hệ thống. Chọn vé đang nằm trong phiếu trả nhưng không có trong kiểm đếm để ghi mất/hỏng/hủy — vé vẫn lưu vết trên phiếu, không còn tính là vé trả hợp lệ.
                        </Typography>
                    </Box>
                </Stack>
                <AdminStatusBadge
                    label={`Tổng ${serials.length} vé chuẩn bị trả`}
                    modifier="admin-status-badge--draft"
                />
            </Stack>

            <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />

            {/* Station Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
                <Tabs
                    value={selectedStation}
                    onChange={(_, val) => setSelectedStation(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        minHeight: 42,
                        '& .MuiTab-root': {
                            minHeight: 42,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: '#64748b',
                            py: 1,
                            px: 2,
                            '&.Mui-selected': {
                                color: '#ea580c',
                                fontWeight: 800,
                            },
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#ea580c',
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                        },
                    }}
                >
                    <Tab
                        value="ALL"
                        label={
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <span>Tất cả nhà đài</span>
                                <Chip
                                    size="small"
                                    label={serials.length}
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        bgcolor: selectedStation === 'ALL' ? '#ffedd5' : '#f1f5f9',
                                        color: selectedStation === 'ALL' ? '#c2410c' : '#64748b',
                                    }}
                                />
                            </Stack>
                        }
                    />
                    {stationList.map((station) => (
                        <Tab
                            key={station.name}
                            value={station.name}
                            label={
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <span>{station.name}</span>
                                    <Chip
                                        size="small"
                                        label={station.count}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            bgcolor: selectedStation === station.name ? '#ffedd5' : '#f1f5f9',
                                            color: selectedStation === station.name ? '#c2410c' : '#64748b',
                                        }}
                                    />
                                </Stack>
                            }
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Search, Filter Tools & Summary Bar */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
            >
                <TextField
                    size="small"
                    placeholder="Tìm kiếm theo mã sê-ri hoặc nhà đài..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#94a3b8', fontSize: '1.2rem' }} />
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchQuery('')}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                    sx={{
                        maxWidth: { xs: '100%', sm: 360 },
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: '#f8fafc',
                        },
                    }}
                />

                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Typography variant="caption" fontWeight={600} color="#64748b">
                        Hiển thị: <strong>{filteredSerials.length}</strong> / {serials.length} vé
                        {requiredQuantity > 0 && (
                            <>
                                {' · '}Còn chọn được <strong>{remainingSlots}</strong>/{requiredQuantity} vé thiếu trả
                            </>
                        )}
                    </Typography>
                    {selected.length > 0 && (
                        <Chip
                            size="small"
                            color="warning"
                            label={`Đã chọn ${selected.length}/${requiredQuantity} vé (${formatSettlementMoney(selectedCostSum)} VNĐ)`}
                            onDelete={() => setSelected([])}
                            sx={{ fontWeight: 700 }}
                        />
                    )}
                </Stack>
            </Stack>

            {/* Serials Table */}
            {loading ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="#64748b">
                        Đang tải danh sách vé trả...
                    </Typography>
                </Box>
            ) : (
                <Paper
                    variant="outlined"
                    sx={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        borderColor: '#e2e8f0',
                        mb: 2.5,
                    }}
                >
                    <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow sx={{ '& th': { bgcolor: '#f8fafc', fontWeight: 800, color: '#475569', fontSize: '0.8rem', py: 1.2 } }}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={isAllFilteredSelected}
                                            indeterminate={isSomeFilteredSelected}
                                            onChange={toggleSelectAllFiltered}
                                            disabled={headerSelectDisabled}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>MÃ SÊ-RI</TableCell>
                                    <TableCell>NHÀ ĐÀI</TableCell>
                                    <TableCell align="right">GIÁ VỐN</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredSerials.map((s) => {
                                    const isRowSelected = selected.includes(s.serialId);
                                    const rowDisabled = !isRowSelected && isAtSelectionLimit;
                                    return (
                                        <TableRow
                                            key={s.serialId}
                                            hover={!rowDisabled}
                                            selected={isRowSelected}
                                            onClick={() => {
                                                if (rowDisabled) return;
                                                toggle(s.serialId);
                                            }}
                                            sx={{
                                                cursor: rowDisabled ? 'not-allowed' : 'pointer',
                                                opacity: rowDisabled ? 0.55 : 1,
                                                '&.Mui-selected': { bgcolor: '#fff7ed !important' },
                                                '&:hover': { bgcolor: rowDisabled ? undefined : '#f8fafc' },
                                            }}
                                        >
                                            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isRowSelected}
                                                    disabled={rowDisabled}
                                                    onChange={() => toggle(s.serialId)}
                                                    size="small"
                                                    color="warning"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: '#0f172a' }}>
                                                    {s.serialNumber}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    icon={<LocationOnOutlinedIcon style={{ fontSize: '0.85rem' }} />}
                                                    label={s.stationName || 'Chưa rõ'}
                                                    sx={{
                                                        bgcolor: '#eff6ff',
                                                        color: '#1d4ed8',
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                        border: '1px solid #bfdbfe',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={700} color="#166534">
                                                    {formatSettlementMoney(Number(s.importCost || 0))} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>VNĐ</span>
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {filteredSerials.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} sx={{ py: 4, textAlign: 'center' }}>
                                            <Typography variant="body2" color="#64748b" fontWeight={600}>
                                                {searchQuery
                                                    ? 'Không tìm thấy vé sê-ri nào khớp với từ khóa tìm kiếm.'
                                                    : 'Không có vé chuẩn bị trả để xử lý.'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </Paper>
            )}

            {/* Adjustment Form Box */}
            <Paper
                variant="outlined"
                sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    borderColor: '#e2e8f0',
                    bgcolor: '#f8fafc',
                    mb: 2.5,
                }}
            >
                <Typography variant="caption" fontWeight={800} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 2 }}>
                    Tình trạng & lý do ghi nhận ({selected.length}/{requiredQuantity} vé đã chọn)
                </Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'none' }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Phương án xử lý</InputLabel>
                            <Select
                                label="Phương án xử lý"
                                value={resolution}
                                onChange={(e) => {
                                    const value = e.target.value as 'EXPIRED' | 'LOST' | 'DAMAGED' | 'VOIDED';
                                    setResolution(value);
                                    setReasonCode(
                                        value === 'EXPIRED'
                                            ? 'EXPIRED_UNRETURNED'
                                            : value === 'DAMAGED' || value === 'VOIDED'
                                              ? 'MISSING_RETURN'
                                              : 'LOST_DURING_RETURN'
                                    );
                                }}
                                sx={{ borderRadius: '10px', bgcolor: '#ffffff' }}
                            >
                                <MenuItem value="LOST">Mất khi trả hàng</MenuItem>
                                <MenuItem value="DAMAGED">Vé bị rách / hỏng</MenuItem>
                                <MenuItem value="VOIDED">Hủy do sai sót</MenuItem>
                                <MenuItem value="EXPIRED">Vé hết hạn không trả được</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Lý do</InputLabel>
                            <Select
                                label="Lý do"
                                value={reasonCode}
                                onChange={(e) => setReasonCode(e.target.value as SettlementAdjustmentReasonCode)}
                                sx={{ borderRadius: '10px', bgcolor: '#ffffff' }}
                            >
                                <MenuItem value="LOST_DURING_RETURN">Mất trong quá trình trả</MenuItem>
                                <MenuItem value="EXPIRED_UNRETURNED">Hết hạn không trả được</MenuItem>
                                <MenuItem value="MISSING_RETURN">Thiếu vé khi trả</MenuItem>
                                <MenuItem value="OTHER">Khác</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            size="small"
                            label="Số tiền thiệt hại / khấu trừ"
                            fullWidth
                            type="text"
                            value={amountDisplay}
                            helperText={
                                selected.length > 0
                                    ? `Tự tính theo ${selected.length} vé đã chọn (${formatSettlementMoney(selectedCostSum)} VNĐ)`
                                    : 'Chọn vé trên danh sách để tự tính số tiền'
                            }
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Typography variant="caption" fontWeight={700} color="#64748b">
                                            VNĐ
                                        </Typography>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    bgcolor: '#f8fafc',
                                },
                            }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            size="small"
                            label="Ghi chú"
                            fullWidth
                            placeholder="Diễn giải chi tiết lý do..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    bgcolor: '#ffffff',
                                },
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Audit Warning */}
            <Alert
                icon={<WarningAmberOutlinedIcon sx={{ color: '#ea580c' }} />}
                severity="warning"
                sx={{
                    mb: 2.5,
                    borderRadius: '12px',
                    bgcolor: '#fff7ed',
                    border: '1px solid #fed7aa',
                    color: '#9a3412',
                    fontSize: '0.875rem',
                }}
            >
                Chọn đúng {requiredQuantity} vé đang có trong phiếu trả (thiếu trả). Chỉ được tick tối đa {requiredQuantity} vé;
                muốn đổi vé thì bỏ tick vé cũ rồi chọn vé mới. Vé vẫn được giữ trong phiếu để lưu vết, nhưng sẽ không còn được tính là vé trả hợp lệ sau khi cập nhật tình trạng.
            </Alert>

            {/* Actions */}
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" alignItems="center">
                <Button
                    variant="outlined"
                    disabled={disabled || submitting || selected.length === 0 || !isSelectedQuantityExact}
                    startIcon={<SaveOutlinedIcon />}
                    onClick={() => {
                        if (disabled) return;
                        const parsedAmount = selected.length > 0 ? Math.round(selectedCostSum) : undefined;
                        onResolve({
                            serialIds: selected,
                            resolution,
                            reasonCode,
                            adjustmentAmount: parsedAmount,
                            note: note || undefined,
                            markResolved: false,
                        });
                    }}
                    sx={{
                        display: 'none',
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '10px',
                        px: 2.5,
                        py: 0.9,
                    }}
                >
                    Lưu xử lý
                </Button>
                <Button
                    variant="contained"
                    disabled={disabled || submitting || !isSelectedQuantityExact}
                    startIcon={<CheckCircleOutlinedIcon />}
                    className="btn-primary-admin"
                    onClick={() => {
                        if (disabled) return;
                        const parsedAmount = selected.length > 0 ? Math.round(selectedCostSum) : undefined;
                        onResolve({
                            serialIds: selected,
                            resolution,
                            reasonCode,
                            adjustmentAmount: parsedAmount,
                            note: note || undefined,
                            markResolved: true,
                        });
                    }}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 800,
                        borderRadius: '10px',
                        px: 3,
                        py: 0.9,
                    }}
                >
                    {disabled
                        ? 'Chưa thể xử lý — phiếu trả chưa sẵn sàng'
                        : submitting
                        ? 'Đang lưu...'
                        : `Xác nhận tình trạng vé (${selected.length}/${requiredQuantity})`}
                </Button>
            </Stack>
        </Paper>
    );
};
