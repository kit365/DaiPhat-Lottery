"use client";

import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Button } from '@/admin/components/ui/Button';

import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';

import { PageHeader } from "../../../../components/ui/PageHeader";
import { prefixAdmin } from "../../../../constants/routes";
import { StationList } from "../sections/StationList";
import { SyncStationModal } from "../sections/SyncStationModal";
import { SyncStationPreviewModal, SyncPreviewParams } from "../sections/SyncStationPreviewModal";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { useOcrTemplateDefaultReady } from '../../hooks/useStation';

export const StationListPage = () => {
    const router = useAdminRouter();
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [previewState, setPreviewState] = useState<{
        preview: any;
        params: SyncPreviewParams;
    } | null>(null);

    const { data: ocrTemplateReady, isLoading: isOcrTemplateReadyLoading } =
        useOcrTemplateDefaultReady();

    return (
        <>
            <PageHeader
                title="Danh sách Nhà đài"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhà đài", to: `/${prefixAdmin}/provider/list` },
                            { label: "Danh sách" }
                        ]}
                action={
                    <div className="flex gap-4">
                    <CanAccess permission={PERMISSIONS.PROVIDER.SYNC}>
                        <Button
                            onClick={() => setIsSyncModalOpen(true)}
                            className="btn-primary-admin"
                            variant="contained"
                            startIcon={<SyncIcon />}
                        >
                            Đồng bộ đài
                        </Button>
                    </CanAccess>
                    <CanAccess permission={PERMISSIONS.PROVIDER.CREATE}>
                        <Button
                            onClick={() => router.push(`/${prefixAdmin}/provider/create`)}
                            className="btn-primary-admin"
                            variant="contained"
                            startIcon={<AddIcon />}
                        >
                            Thêm nhà đài
                        </Button>
                    </CanAccess>
                </div>
                }
            />

            {!isOcrTemplateReadyLoading && ocrTemplateReady?.ready === false && (
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, sm: 2.25 },
                        mb: 3,
                        borderRadius: '14px',
                        border: '1px solid #fef08a',
                        bgcolor: '#fffbeb',
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)',
                        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.05)',
                        display: 'flex',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        flexWrap: { xs: 'wrap', md: 'nowrap' },
                        gap: 2,
                    }}
                >
                    <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ flex: 1 }}>
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '10px',
                                bgcolor: '#fef3c7',
                                color: '#d97706',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 1px 3px rgba(217, 119, 6, 0.12)',
                            }}
                        >
                            <WarningAmberOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                                    Chưa có mẫu vé OCR mặc định
                                </Typography>
                                <Chip
                                    size="small"
                                    label="Cần cấu hình"
                                    sx={{
                                        bgcolor: '#fef3c7',
                                        color: '#92400e',
                                        fontWeight: 700,
                                        fontSize: '0.725rem',
                                        border: '1px solid #fde68a',
                                        height: 24,
                                    }}
                                />
                            </Stack>
                            <Typography variant="body2" color="#475569" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                                Hiện tại chưa có nhà đài nào được thiết lập mẫu vé (template) mặc định cho tính năng quét vé OCR. Vui lòng chọn thao tác &quot;Chỉnh sửa&quot; trên nhà đài để thêm và gán mẫu vé mặc định.
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            )}

            <StationList />

            <SyncStationModal
                open={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                onPreviewSuccess={(preview, params) => {
                    setIsSyncModalOpen(false);
                    setPreviewState({ preview, params });
                }}
            />
            <SyncStationPreviewModal
                open={!!previewState}
                onClose={() => setPreviewState(null)}
                previewData={previewState?.preview}
                syncParams={previewState?.params ?? null}
            />
        </>
    );
};
