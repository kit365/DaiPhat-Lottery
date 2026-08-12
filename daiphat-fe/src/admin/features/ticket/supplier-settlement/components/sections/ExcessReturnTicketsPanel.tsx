"use client";

import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import type { SettlementAdjustmentReasonCode } from '../../types/supplierSettlement.type';

interface Props {
    submitting?: boolean;
    onResolve: (payload: {
        excessSerialNumbers: string[];
        reasonCode: SettlementAdjustmentReasonCode;
        note?: string;
        markResolved: boolean;
    }) => void;
}

export const ExcessReturnTicketsPanel = ({ submitting, onResolve }: Props) => {
    const [rawSerials, setRawSerials] = useState('');
    const [note, setNote] = useState('');

    const serials = rawSerials
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

    return (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <QrCodeScannerIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={800}>
                    Xử lý thừa trả (dương)
                </Typography>
            </Stack>
            <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
                Quét hoặc nhập thủ công các sê-ri thừa. Hệ thống sẽ kiểm tra đài/ngày quay, tạo phiếu
                &quot;Nhập trả hàng thừa&quot; và giảm phải trả NCC.
            </Alert>
            <TextField
                label="Danh sách sê-ri (mỗi dòng hoặc cách bằng dấu phẩy)"
                value={rawSerials}
                onChange={(e) => setRawSerials(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                size="small"
                sx={{ mb: 1.5 }}
            />
            <TextField
                label="Ghi chú"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
            />
            <Box>
                <Button
                    variant="contained"
                    disabled={serials.length === 0 || !!submitting}
                    onClick={() =>
                        onResolve({
                            excessSerialNumbers: serials,
                            reasonCode: 'EXCESS_RETURN',
                            note: note.trim() || undefined,
                            markResolved: true,
                        })
                    }
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                >
                    Xác nhận nhập trả thừa ({serials.length})
                </Button>
            </Box>
        </Paper>
    );
};
