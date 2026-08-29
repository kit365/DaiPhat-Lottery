"use client";

import { Alert, Box, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { Button } from '@/admin/components/ui/Button';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';
import { ROUTES, prefixAdmin } from '@/admin/constants/routes';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { useStations } from '@/admin/features/station/hooks/useStation';
import { useCreatePrizeClaimDraft } from '../../hooks/usePrizeClaimSubmission';

export const PrizeClaimSubmissionCreatePage = () => {
    const router = useAdminRouter();
    const [supplierId, setSupplierId] = useState<number | ''>('');
    const { data: stationsRes, isLoading: stationsLoading } = useStations({ limit: 200, status: 'active' });
    const createDraft = useCreatePrizeClaimDraft();

    const stations = useMemo(() => stationsRes?.data?.recordList ?? [], [stationsRes]);

    const handleCreate = async () => {
        if (!supplierId) return;
        try {
            const res = await createDraft.mutateAsync({ supplierId });
            const id = res?.data?.id;
            if (id) {
                router.push(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.DETAIL(id));
            }
        } catch {
            // toast handled in hook
        }
    };

    return (
        <Box>
            <PageHeader
                title="Tạo phiếu nộp vé trúng"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                    { label: 'Phiếu nộp', to: ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.LIST },
                    { label: 'Tạo mới' },
                ]}
            />

            <Card sx={{ maxWidth: 560 }}>
                <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                        Chọn nhà đài
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Tạo phiếu nộp cho nhà đài tương ứng, sau đó thêm các vé trúng thưởng cần nộp.
                    </Alert>

                    {stationsLoading ? (
                        <SpinnerLoading />
                    ) : (
                        <Stack spacing={3}>
                            <FormControl fullWidth required>
                                <InputLabel id="pcs-supplier-label">Nhà đài</InputLabel>
                                <Select
                                    labelId="pcs-supplier-label"
                                    label="Nhà đài"
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(Number(e.target.value))}
                                >
                                    {stations.map((station) => {
                                        const id = station.id ?? station._id;
                                        return (
                                            <MenuItem key={String(id)} value={Number(id)}>
                                                {station.name}
                                                {station.code ? ` (${station.code})` : ''}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>

                            <Stack direction="row" spacing={2}>
                                <Button
                                    variant="outlined"
                                    label="Hủy"
                                    onClick={() => router.push(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.LIST)}
                                />
                                <Button
                                    variant="contained"
                                    className="btn-primary-admin"
                                    label="Tạo phiếu nộp"
                                    onClick={handleCreate}
                                    disabled={!supplierId || createDraft.isPending}
                                />
                            </Stack>
                        </Stack>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};
