"use client";

import { useCallback, useEffect, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { ROUTES } from '../../../../../constants/routes';
import {
    deleteImportBatchFileMappingProfile,
    getImportBatchFileMappingProfiles,
} from '../../services/importBatchService';
import type {
    ImportBatchFileMapping,
    ImportBatchFileMappingProfile,
} from '../../types/importBatch.type';

type ImportBatchFileMappingProfilePanelProps = {
    supplierId: number;
    /** Bumped by the parent after a save, so the list reflects it without a reopen. */
    refreshToken?: number;
};

/** Mapping key to the label shown on its chip, in the order an operator reads them. */
const FIELD_LABELS: { field: keyof ImportBatchFileMapping; label: string }[] = [
    { field: 'drawDateColumn', label: 'Ngày quay' },
    { field: 'stationCodeColumn', label: 'Mã đài' },
    { field: 'stationColumn', label: 'Nhà đài' },
    { field: 'numbersColumn', label: 'Dãy số' },
    { field: 'serialsColumn', label: 'Sê-ri' },
    { field: 'ticketImageColumn', label: 'Ảnh vé' },
    { field: 'quantityColumn', label: 'Số lượng' },
    { field: 'importCostColumn', label: 'Giá nhập' },
    { field: 'salePriceColumn', label: 'Giá bán' },
    { field: 'commissionRateColumn', label: 'Hoa hồng' },
];

const formatUsed = (value?: string | null) =>
    value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'chưa dùng lại';

/**
 * Column mappings already remembered for this supplier.
 *
 * <p>Shown before the file is picked because that is when it matters: the operator
 * can see a familiar layout will be recognised automatically, or delete a mapping
 * that was saved wrong and would otherwise keep being applied silently.
 */
export const ImportBatchFileMappingProfilePanel = ({
    supplierId,
    refreshToken = 0,
}: ImportBatchFileMappingProfilePanelProps) => {
    const router = useAdminRouter();
    const [profiles, setProfiles] = useState<ImportBatchFileMappingProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const load = useCallback(() => {
        if (!supplierId) {
            setProfiles([]);
            return;
        }
        setLoading(true);
        getImportBatchFileMappingProfiles(supplierId)
            .then(setProfiles)
            .catch(() => setProfiles([]))
            .finally(() => setLoading(false));
    }, [supplierId]);

    useEffect(load, [load, refreshToken]);

    const handleDelete = async (profile: ImportBatchFileMappingProfile) => {
        setDeletingId(profile.id);
        try {
            await deleteImportBatchFileMappingProfile(profile.id);
            setProfiles((current) => current.filter((item) => item.id !== profile.id));
            toast.success('Đã xóa cấu hình cột đã lưu.');
        } catch {
            toast.error('Không xóa được cấu hình cột.');
        } finally {
            setDeletingId(null);
        }
    };

    const goEditSupplierFields = () => {
        router.push(`${ROUTES.ADMIN.SUPPLIER.EDIT(supplierId)}?focus=import-file-fields`);
    };

    if (!supplierId) {
        return null;
    }

    if (loading && profiles.length === 0) {
        return (
            <Stack alignItems="center" py={2}>
                <CircularProgress size={22} />
            </Stack>
        );
    }

    if (profiles.length === 0) {
        return (
            <Alert
                severity="info"
                icon={<BookmarkBorderOutlinedIcon />}
                action={
                    <Button
                        color="inherit"
                        size="small"
                        endIcon={<OpenInNewOutlinedIcon fontSize="small" />}
                        onClick={goEditSupplierFields}
                        sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                        Chỉnh sửa NCC
                    </Button>
                }
                sx={{
                    alignItems: 'center',
                    '& .MuiAlert-message': { flex: 1 },
                    '& .MuiAlert-action': { pt: 0, alignItems: 'center' },
                }}
            >
                Chưa có cấu hình cột nào được lưu cho nhà cung cấp này. Sau lần nhập đầu tiên, hệ
                thống sẽ ghi nhớ để lần sau khỏi gán lại. Bạn cũng có thể mở màn sửa nhà cung cấp để
                bổ sung tên cột hệ thống tự nhận diện.
            </Alert>
        );
    }

    return (
        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <BookmarkBorderOutlinedIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={700}>
                    Cấu hình cột đã lưu ({profiles.length})
                </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
                Tệp có bố cục cột trùng một trong các cấu hình dưới đây sẽ được gán cột tự động.
            </Typography>

            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {profiles.map((profile) => {
                    const mapped = profile.mapping
                        ? FIELD_LABELS.filter(({ field }) => profile.mapping?.[field]).map(
                              ({ field, label }) => ({
                                  label,
                                  column: String(profile.mapping?.[field]),
                              })
                          )
                        : [];

                    return (
                        <Box
                            key={profile.id}
                            sx={{
                                border: '1px solid #f1f5f9',
                                borderRadius: '10px',
                                p: 1.5,
                                bgcolor: '#f8fafc',
                            }}
                        >
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={1}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Đã dùng {profile.useCount} lần · gần nhất{' '}
                                        {formatUsed(profile.lastUsedAt)}
                                    </Typography>

                                    {profile.mapping ? (
                                        <Stack
                                            direction="row"
                                            spacing={0.75}
                                            flexWrap="wrap"
                                            useFlexGap
                                            sx={{ mt: 1 }}
                                        >
                                            {mapped.map((item) => (
                                                <Chip
                                                    key={item.label}
                                                    size="small"
                                                    variant="outlined"
                                                    label={`${item.label} → ${item.column}`}
                                                />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Alert severity="warning" sx={{ mt: 1 }}>
                                            Cấu hình này không đọc được, nên sẽ bị bỏ qua. Xóa đi để
                                            hệ thống ghi nhớ lại từ đầu.
                                        </Alert>
                                    )}
                                </Box>

                                <Tooltip title="Xóa cấu hình này">
                                    <span>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            disabled={deletingId === profile.id}
                                            onClick={() => handleDelete(profile)}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
};
