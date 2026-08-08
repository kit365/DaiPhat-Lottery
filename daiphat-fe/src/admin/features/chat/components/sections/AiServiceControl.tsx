"use client";

import { useState } from 'react';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { hasPermission } from '../../../../utils/permission.util';
import { SpinnerLoading } from '../../../../components/ui/SpinnerLoading';
import { useAiServiceConfig, useUpdateAiServiceStatus } from '../../hooks/useChat';

export const AiServiceControl = () => {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const user = useAuthStore((state) => state.user);
    const canManage = hasPermission(user, PERMISSIONS.CHAT.MANAGE);
    const { data: config, isLoading, isError, refetch } = useAiServiceConfig();
    const updateStatus = useUpdateAiServiceStatus();

    const handleStatusChange = (enabled: boolean) => {
        if (!canManage || updateStatus.isPending) return;
        if (!enabled) {
            setConfirmOpen(true);
            return;
        }
        updateStatus.mutate(true);
    };

    const confirmDisable = () => {
        setConfirmOpen(false);
        updateStatus.mutate(false);
    };

    if (isLoading) {
        return <SpinnerLoading compact />;
    }

    if (isError || !config) {
        return (
            <Alert
                severity="error"
                sx={{ mb: 2.5 }}
                action={<Button color="inherit" size="small" onClick={() => refetch()}>Thử lại</Button>}
            >
                Không thể tải trạng thái trợ lý AI.
            </Alert>
        );
    }

    const statusLabel = config.operational ? 'Đang hoạt động' : 'Đã tắt';

    return (
        <>
            <Card
                className="admin-list-card"
                sx={{
                    p: { xs: 2, md: 2.5 },
                    mb: 2.5,
                    border: '1px solid var(--palette-divider)',
                }}
            >
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                >
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 1.5,
                            display: 'grid',
                            placeItems: 'center',
                            color: config.operational
                                ? 'var(--palette-success-main)'
                                : 'var(--palette-text-disabled)',
                            bgcolor: config.operational
                                ? 'var(--palette-success-lighter)'
                                : 'var(--palette-background-neutral)',
                            flexShrink: 0,
                        }}
                    >
                        <SmartToyOutlinedIcon />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="subtitle1" fontWeight={700}>
                                Trợ lý AI
                            </Typography>
                            <Chip
                                size="small"
                                label={statusLabel}
                                color={config.operational ? 'success' : 'default'}
                                variant={config.operational ? 'filled' : 'outlined'}
                            />
                        </Stack>
                    </Box>

                    <Tooltip
                        title={canManage ? '' : 'Bạn cần quyền quản lý chat để thay đổi trạng thái AI'}
                    >
                        <span>
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Switch
                                        checked={config.enabled}
                                        disabled={!canManage || updateStatus.isPending}
                                        onChange={(_, checked) => handleStatusChange(checked)}
                                        inputProps={{ 'aria-label': 'Bật hoặc tắt trợ lý AI' }}
                                    />
                                }
                                label={
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body2" fontWeight={600}>
                                            {config.enabled ? 'Bật' : 'Tắt'}
                                        </Typography>
                                        {updateStatus.isPending && <CircularProgress size={16} />}
                                    </Stack>
                                }
                            />
                        </span>
                    </Tooltip>
                </Stack>
            </Card>

            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Tắt trợ lý AI?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Các câu hỏi không nhận diện được bằng quy tắc sẽ không được gửi sang dịch vụ AI.
                        Chatbot và hàng chờ hỗ trợ của nhân viên vẫn tiếp tục hoạt động.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
                    <Button color="error" variant="contained" onClick={confirmDisable}>
                        Tắt AI
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
