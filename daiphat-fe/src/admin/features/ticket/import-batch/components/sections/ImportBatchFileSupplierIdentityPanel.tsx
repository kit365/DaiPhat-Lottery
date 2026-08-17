'use client';

import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Chip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ImportBatchFileSupplierIdentity } from '../../types/importBatch.type';

type ImportBatchFileSupplierIdentityPanelProps = {
    identity: ImportBatchFileSupplierIdentity;
    supplierName: string;
    /** Opens the quick correction dialog for the supplier record. */
    onEditSupplier: () => void;
};

const EMPTY = '—';

/**
 * Shows whether the party printed at the top of the uploaded file is the
 * supplier chosen in step 1.
 *
 * <p>The verdict matters more than the detail when things are fine, so a clean
 * check collapses to a single green line; only a disagreement opens the table
 * that names which field is wrong on which side.
 */
export const ImportBatchFileSupplierIdentityPanel = ({
    identity,
    supplierName,
    onEditSupplier,
}: ImportBatchFileSupplierIdentityPanelProps) => {
    if (!identity.declared) {
        return (
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
                <Typography variant="body2">
                    Tệp không ghi thông tin nhà cung cấp nên hệ thống không đối chiếu được. Vui lòng
                    tự kiểm tra tệp này đúng là của <b>{supplierName}</b>.
                </Typography>
            </Alert>
        );
    }

    if (!identity.mismatched) {
        const softMismatches = identity.fields.filter((field) => !field.matched);
        return (
            <Alert
                severity={softMismatches.length > 0 ? 'warning' : 'success'}
                icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                sx={{ borderRadius: '12px' }}
                action={
                    softMismatches.length > 0 ? (
                        <Button
                            size="small"
                            color="warning"
                            onClick={onEditSupplier}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Sửa thông tin NCC
                        </Button>
                    ) : undefined
                }
            >
                <Typography variant="body2">
                    Thông tin nhà cung cấp trong tệp khớp với <b>{supplierName}</b>
                    {softMismatches.length > 0
                        ? `, riêng ${softMismatches
                              .map((field) => field.label.toLowerCase())
                              .join(', ')} có khác nhưng không chặn việc nhập.`
                        : '.'}
                </Typography>
            </Alert>
        );
    }

    return (
        <Alert
            severity="error"
            icon={<ErrorOutlineIcon fontSize="inherit" />}
            sx={{ borderRadius: '12px' }}
        >
            <AlertTitle sx={{ fontWeight: 800 }}>
                Tệp này không phải của {supplierName}
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
                Thông tin nhà cung cấp ghi trong tệp không khớp với nhà cung cấp bạn đã chọn. Hãy
                quay lại bước 1 chọn đúng nhà cung cấp, hoặc dùng tệp do {supplierName} phát hành.
                Nếu đúng là {supplierName} nhưng hệ thống đang lưu thông tin cũ, hãy sửa lại thông
                tin nhà cung cấp.
            </Typography>

            <Button
                size="small"
                variant="contained"
                color="error"
                onClick={onEditSupplier}
                sx={{ textTransform: 'none', fontWeight: 700, mb: 1.5 }}
            >
                Sửa thông tin NCC
            </Button>

            <Box sx={{ bgcolor: '#ffffff', borderRadius: '10px', overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Thông tin</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trong tệp</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trên hệ thống</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Kết quả</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {identity.fields.map((field) => (
                            <TableRow key={field.field}>
                                <TableCell sx={{ fontWeight: 600 }}>
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>{field.label}</span>
                                        {!field.blocking && (
                                            <Chip
                                                size="small"
                                                label="không chặn"
                                                sx={{ height: 18, fontSize: '0.6875rem' }}
                                            />
                                        )}
                                    </Stack>
                                </TableCell>
                                <TableCell>{field.valueInFile || EMPTY}</TableCell>
                                <TableCell>{field.valueInSystem || EMPTY}</TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        color={field.matched ? 'success' : 'error'}
                                        variant={field.matched ? 'outlined' : 'filled'}
                                        label={field.matched ? 'Khớp' : 'Lệch'}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        </Alert>
    );
};
