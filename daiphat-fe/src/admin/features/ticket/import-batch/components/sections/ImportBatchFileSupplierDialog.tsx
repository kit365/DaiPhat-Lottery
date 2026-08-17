'use client';

import { useEffect, useMemo, useState } from 'react';
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
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { updateSupplierProfile } from '../../../../supplier/services/supplierService';
import type { LotterySupplier } from '../../../../supplier/types/supplier.type';
import type { ImportBatchFileSupplierIdentity } from '../../types/importBatch.type';

type ImportBatchFileSupplierDialogProps = {
    open: boolean;
    onClose: () => void;
    supplier: LotterySupplier;
    identity: ImportBatchFileSupplierIdentity;
    /** Called after a successful save so the caller can re-run the preview. */
    onSaved: () => void;
};

/** Editable identity fields, in the order the letterhead prints them. */
const FIELDS = [
    { key: 'name', label: 'Tên nhà cung cấp', required: true },
    { key: 'code', label: 'Mã nhà cung cấp', required: true },
    { key: 'taxCode', label: 'Mã số thuế', required: false },
    { key: 'contactName', label: 'Người liên hệ', required: false },
    { key: 'contactPhone', label: 'Số điện thoại', required: true },
    { key: 'contactEmail', label: 'Email', required: false },
    { key: 'address', label: 'Địa chỉ', required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

type Draft = Record<FieldKey, string>;

const buildDraft = (supplier: LotterySupplier): Draft => ({
    name: supplier.name ?? '',
    code: supplier.code ?? '',
    taxCode: supplier.taxCode ?? '',
    contactName: supplier.contactName ?? '',
    contactPhone: supplier.contactPhone ?? '',
    contactEmail: supplier.contactEmail ?? '',
    address: supplier.address ?? '',
});

/**
 * Corrects a supplier's details without leaving the import.
 *
 * <p>When an uploaded file's letterhead disagrees with the record, the usual
 * cause is that the supplier changed a phone number or moved and nobody updated
 * the system. Sending the operator to the supplier screen loses the upload, so
 * the correction happens here and the preview re-runs.
 *
 * <p>Only identifying details are editable. The intake hours and payment terms
 * are not shown because they are not what the file disputes, and a screen that
 * never loaded them must not be able to overwrite them.
 */
export const ImportBatchFileSupplierDialog = ({
    open,
    onClose,
    supplier,
    identity,
    onSaved,
}: ImportBatchFileSupplierDialogProps) => {
    const [draft, setDraft] = useState<Draft>(() => buildDraft(supplier));
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            // Seeded with the system's values: keeping today's record is the safer
            // default, and adopting the file's value is one click away.
            setDraft(buildDraft(supplier));
        }
    }, [open, supplier]);

    const inFileByField = useMemo(() => {
        const map = new Map<string, { value?: string; matched: boolean; blocking: boolean }>();
        identity.fields.forEach((field) => {
            map.set(field.field, {
                value: field.valueInFile,
                matched: field.matched,
                blocking: field.blocking,
            });
        });
        return map;
    }, [identity]);

    const patch = (key: FieldKey, value: string) =>
        setDraft((current) => ({ ...current, [key]: value }));

    const missing = FIELDS.filter((field) => field.required && !draft[field.key].trim());

    /** Blocking fields the file still disagrees with after the current edits. */
    const stillBlocking = FIELDS.filter((field) => {
        const inFile = inFileByField.get(field.key);
        if (!inFile?.blocking || inFile.value == null) {
            return false;
        }
        return inFile.value.trim().toLowerCase() !== draft[field.key].trim().toLowerCase();
    });

    const handleSave = async () => {
        if (missing.length > 0) {
            toast.error(
                `Vui lòng nhập ${missing.map((field) => field.label.toLowerCase()).join(', ')}.`
            );
            return;
        }

        setBusy(true);
        try {
            await updateSupplierProfile({
                supplierId: supplier.id,
                name: draft.name.trim(),
                code: draft.code.trim(),
                taxCode: draft.taxCode.trim() || undefined,
                contactName: draft.contactName.trim() || undefined,
                contactPhone: draft.contactPhone.trim(),
                contactEmail: draft.contactEmail.trim() || undefined,
                address: draft.address.trim() || undefined,
            });
            toast.success('Đã cập nhật thông tin nhà cung cấp.');
            onSaved();
            onClose();
        } catch {
            toast.error('Không cập nhật được thông tin nhà cung cấp. Vui lòng thử lại.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Sửa nhanh thông tin nhà cung cấp</DialogTitle>
            <DialogContent dividers>
                <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                    Chỉ sửa được thông tin định danh. Giờ cho phép nhập, hạn trả vé và điều khoản
                    thanh toán không nằm ở đây — những mục đó phải sửa trong màn hình nhà cung cấp.
                    Thay đổi được lưu vĩnh viễn.
                </Alert>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, width: 180 }}>Thông tin</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trong tệp</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Giá trị áp dụng</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 110 }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {FIELDS.map((field) => {
                            const inFile = inFileByField.get(field.key);
                            const invalid = field.required && !draft[field.key].trim();

                            return (
                                <TableRow key={field.key} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <span>{field.label}</span>
                                            {inFile && !inFile.matched && (
                                                <Chip
                                                    size="small"
                                                    color={inFile.blocking ? 'error' : 'warning'}
                                                    label="lệch"
                                                    sx={{ height: 18, fontSize: '0.6875rem' }}
                                                />
                                            )}
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            color={inFile?.value ? 'text.primary' : 'text.disabled'}
                                        >
                                            {inFile?.value || 'tệp không ghi'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            value={draft[field.key]}
                                            error={invalid}
                                            onChange={(event) => patch(field.key, event.target.value)}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <Tooltip
                                            title={
                                                inFile?.value
                                                    ? 'Lấy giá trị ghi trong tệp'
                                                    : 'Tệp không ghi thông tin này'
                                            }
                                        >
                                            <span>
                                                <Button
                                                    size="small"
                                                    disabled={!inFile?.value}
                                                    onClick={() => patch(field.key, inFile?.value ?? '')}
                                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                                >
                                                    Theo tệp
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {stillBlocking.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
                        {stillBlocking.map((field) => field.label.toLowerCase()).join(', ')} vẫn khác
                        với tệp. Nếu bạn cố ý giữ giá trị của hệ thống thì tệp này vẫn sẽ bị chặn —
                        khi đó nhiều khả năng đây là tệp của một nhà cung cấp khác.
                    </Alert>
                )}

                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        Chỉ sửa khi bạn chắc chắn thông tin trong tệp là đúng và hệ thống đang lưu dữ
                        liệu cũ. Nếu tệp thuộc về nhà cung cấp khác, hãy quay lại bước 1 chọn đúng
                        nhà cung cấp thay vì sửa ở đây.
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none' }}>
                    Huỷ bỏ
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={busy || missing.length > 0}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    Lưu và xem lại
                </Button>
            </DialogActions>
        </Dialog>
    );
};
