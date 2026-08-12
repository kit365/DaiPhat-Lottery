"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
} from '@mui/material';
import dayjs from 'dayjs';
import { Button } from '../../../../components/ui/Button';
import { AdminDatePicker } from '../../../../components/ui/AdminDatePicker';
import { DrawResultDateMode } from '../../types/draw-result';

interface DrawResultSyncModalProps {
    open: boolean;
    initialRegion: string;
    initialDateMode: DrawResultDateMode;
    initialDrawDate: string;
    initialFromDate: string;
    initialToDate: string;
    initialSource: 'MINH_NGOC' | 'XOSO_VN';
    loading: boolean;
    onApply: (filter: {
        region: string;
        dateMode: DrawResultDateMode;
        drawDate: string;
        fromDate: string;
        toDate: string;
        source: 'MINH_NGOC' | 'XOSO_VN';
    }) => void | Promise<void>;
    onClose: () => void;
}

export const DrawResultSyncModal: React.FC<DrawResultSyncModalProps> = ({
    open,
    initialRegion,
    initialDateMode,
    initialDrawDate,
    initialFromDate,
    initialToDate,
    initialSource,
    loading,
    onApply,
    onClose
}) => {
    const [region, setRegion] = useState(initialRegion);
    const [dateMode, setDateMode] = useState<DrawResultDateMode>(initialDateMode);
    const [drawDate, setDrawDate] = useState(initialDrawDate);
    const [fromDate, setFromDate] = useState(initialFromDate);
    const [toDate, setToDate] = useState(initialToDate);
    const [source, setSource] = useState<'MINH_NGOC' | 'XOSO_VN'>(initialSource);

    React.useEffect(() => {
        if (open) {
            setRegion(initialRegion);
            setDateMode(initialDateMode);
            setDrawDate(initialDrawDate);
            setFromDate(initialFromDate);
            setToDate(initialToDate);
            setSource(initialSource);
        }
    }, [open, initialRegion, initialDateMode, initialDrawDate, initialFromDate, initialToDate, initialSource]);

    const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
    const minToDate = fromDate
        ? dayjs(fromDate).add(1, 'day').format('YYYY-MM-DD')
        : undefined;

    const handleSubmit = async () => {
        const hasValidSingle = dateMode === 'single' && !!drawDate;
        const hasValidRange = dateMode === 'range' && !!fromDate && !!toDate;
        if (!region || (!hasValidSingle && !hasValidRange)) {
            return;
        }
        await onApply({
            region,
            dateMode,
            drawDate: dateMode === 'single' ? drawDate : fromDate,
            fromDate: dateMode === 'range' ? fromDate : drawDate,
            toDate: dateMode === 'range' ? toDate : drawDate,
            source
        });
    };

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ className: 'admin-theme' }}
        >
            <DialogTitle sx={{ fontWeight: 'bold' }}>Tra cứu kết quả động</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Chế độ</InputLabel>
                        <Select
                            value={dateMode}
                            label="Chế độ"
                            onChange={(e) => setDateMode(e.target.value as DrawResultDateMode)}
                        >
                            <MenuItem value="single">Một ngày</MenuItem>
                            <MenuItem value="range">Khoảng ngày</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Khu vực</InputLabel>
                        <Select
                            value={region}
                            label="Khu vực"
                            onChange={(e) => setRegion(e.target.value)}
                        >
                            <MenuItem value="MIEN_NAM">Miền Nam</MenuItem>
                            <MenuItem value="MIEN_TRUNG">Miền Trung</MenuItem>
                            <MenuItem value="MIEN_BAC">Miền Bắc</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Nguồn</InputLabel>
                        <Select
                            value={source}
                            label="Nguồn"
                            onChange={(e) => setSource(e.target.value as 'MINH_NGOC' | 'XOSO_VN')}
                        >
                            <MenuItem value="MINH_NGOC">Minh Ngọc</MenuItem>
                            <MenuItem value="XOSO_VN">Xoso.vn</MenuItem>
                        </Select>
                    </FormControl>

                    {dateMode === 'single' ? (
                        <AdminDatePicker
                            label="Ngày quay"
                            value={drawDate}
                            onChange={setDrawDate}
                            max={tomorrowStr}
                            disabled={loading}
                        />
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <AdminDatePicker
                                label="Từ ngày"
                                value={fromDate}
                                onChange={setFromDate}
                                max={tomorrowStr}
                                disabled={loading}
                            />
                            <AdminDatePicker
                                label="Đến ngày"
                                value={toDate}
                                onChange={setToDate}
                                min={minToDate}
                                max={tomorrowStr}
                                disabled={loading}
                            />
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>
                    Hủy
                </Button>
                <Button
                    loading={loading}
                    onClick={handleSubmit}
                    label="Đồng bộ"
                    loadingLabel="Đang đồng bộ..."
                    variant="contained"
                />
            </DialogActions>
        </Dialog>
    );
};
