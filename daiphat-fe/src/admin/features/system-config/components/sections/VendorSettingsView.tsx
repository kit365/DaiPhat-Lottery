import React from 'react';
import { Box, Card, Stack, Typography, Button, IconButton, Divider, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Tooltip } from '@mui/material';
import { Edit2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { SystemConfigResponse } from '../../types/system-config';
import { VENDOR_LATE_RETURN_POLICY_LABELS } from '../../../street-agent/hooks/useVendorSettingsDefaults';
import {
    formatVendorConfigValue,
    getVendorConfidenceDisplay,
} from '../../utils/vendorConfidenceDisplay';

interface VendorSettingsViewProps {
    configs: SystemConfigResponse[];
    allConfigs: SystemConfigResponse[];
    canEdit: boolean;
    onEdit: (config: SystemConfigResponse) => void;
    onBulkConfidenceEdit: () => void;
}

export const VendorSettingsView: React.FC<VendorSettingsViewProps> = ({ configs, allConfigs, canEdit, onEdit, onBulkConfidenceEdit }) => {
    // Keep grouped policy cards complete while the page search filters the ordinary rows.
    // Otherwise searching one policy would make unrelated timing/config values appear blank.
    const findConfig = (key: string) =>
        configs.find(c => c.configKey === key) || allConfigs.find(c => c.configKey === key);

    const returnCutoff = findConfig('VENDOR_RETURN_CUTOFF');
    const draftTtl = findConfig('VENDOR_DRAFT_RESERVATION_TTL_MINUTES');
    const returnBuffer = allConfigs.find(c => c.configKey === 'RETURN_BUFFER_TIME');

    const others = configs.filter(
        c => c.configKey !== 'VENDOR_RETURN_CUTOFF' && c.configKey !== 'VENDOR_DRAFT_RESERVATION_TTL_MINUTES' && !c.configKey.startsWith('VENDOR_CONFIDENCE_')
    );

    const confidenceConfigs = allConfigs.filter(c => c.configKey.startsWith('VENDOR_CONFIDENCE_'));

    const formatMinutes = (value?: string | null) => {
        const minutes = Number(value);
        return Number.isFinite(minutes) ? `${minutes} phút` : '—';
    };

    const formatClock = (value?: string | null) => {
        if (!value) return '—';
        const normalized = value.trim();
        const match = normalized.match(/^(\d{1,2}):?(\d{2})/);
        return match ? `${match[1].padStart(2, '0')}:${match[2]}` : normalized;
    };

    const renderEditableRow = (
        label: string,
        helper: string,
        config?: SystemConfigResponse,
        formatValue?: (val: string) => string
    ) => (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} py={2}>
            <Box flex={1}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">{helper}</Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body1" fontWeight={500}>
                    {config ? (formatValue ? formatValue(config.configValue) : formatVendorConfigValue(config)) : '—'}
                </Typography>
                {canEdit && config && (
                    config.isEditable === false ? (
                        <Tooltip title="Cấu hình này chỉ được xem">
                            <span>
                                <IconButton size="small" disabled sx={{ bgcolor: 'action.hover' }}>
                                    <Edit2 size={16} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    ) : (
                        <IconButton size="small" onClick={() => onEdit(config)} color="primary" sx={{ bgcolor: 'primary.50' }}>
                            <Edit2 size={16} />
                        </IconButton>
                    )
                )}
            </Stack>
        </Stack>
    );

    const renderPolicyRow = (config: SystemConfigResponse) => {
        const display = getVendorConfidenceDisplay(config);

        return renderEditableRow(
            display.label,
            display.description,
            config,
            config.configKey === 'VENDOR_LATE_RETURN_POLICY'
                ? (value) => VENDOR_LATE_RETURN_POLICY_LABELS[value as keyof typeof VENDOR_LATE_RETURN_POLICY_LABELS] || value
                : undefined
        );
    };
    
    const getConfidenceVal = (key: string) => {
        const c = confidenceConfigs.find(config => config.configKey === key);
        return c ? formatVendorConfigValue(c) : '—';
    };

    return (
        <Stack spacing={4} sx={{ px: { xs: 2, sm: 3 }, pb: 4 }}>
            <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Thời gian vận hành</Typography>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <Stack divider={<Divider />}>
                        <Box px={3}>
                            {renderEditableRow(
                                'Giờ chốt trả vé trong ngày',
                                'Sau giờ này, vé trả được tính là trễ và phiếu giao mới trong ngày không còn được xác nhận.',
                                returnCutoff,
                                formatClock
                            )}
                        </Box>
                        <Box px={3}>
                            {renderEditableRow(
                                'Thời gian giữ phiếu nháp',
                                'Nếu chưa xác nhận trong thời gian này, hệ thống tự giải phóng vé và phiếu cần được tạo lại.',
                                draftTtl,
                                formatMinutes
                            )}
                        </Box>
                        <Box px={3}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} py={2}>
                                <Box flex={1}>
                                    <Typography variant="body2" fontWeight={600} mb={0.5}>Thời gian chuẩn bị trước khi Đại Phát nhận lại vé</Typography>
                                    <Typography variant="caption" color="text.secondary">Khoảng thời gian này được dùng để tính thời điểm cuối có thể giao vé; giá trị được quản lý ở cấu hình vận hành vé.</Typography>
                                </Box>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Typography variant="body1" fontWeight={500}>
                                        {returnBuffer ? formatMinutes(returnBuffer.configValue) : '—'}
                                    </Typography>
                                    <Button
                                        component={Link}
                                        href="/admin/settings/system-config/list?tab=TICKET_RETURN"
                                        size="small"
                                        endIcon={<ExternalLink size={16} />}
                                    >
                                        Mở cấu hình vận hành vé
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>
                </Card>
            </Box>

            <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Chính sách áp dụng</Typography>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <Stack divider={<Divider />}>
                        {others.map((config) => (
                            <Box px={3} key={config.id}>
                                {renderPolicyRow(config)}
                            </Box>
                        ))}
                    </Stack>
                </Card>
            </Box>
            
            <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="h6">Chính sách điểm tin cậy</Typography>
                    {canEdit && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onBulkConfidenceEdit}
                            startIcon={<Edit2 size={16} />}
                        >
                            Điều chỉnh điểm tin cậy
                        </Button>
                    )}
                </Stack>
                <Card variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                    <Stack spacing={3}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                                    <TableRow>
                                        <TableCell width="28%">Tiêu chí</TableCell>
                                        <TableCell width="18%" align="center">Mới</TableCell>
                                        <TableCell width="18%" align="center">Đang phát triển</TableCell>
                                        <TableCell width="18%" align="center">Ổn định</TableCell>
                                        <TableCell width="18%" align="center">Tin cậy</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 500 }}>Điểm uy tín tối thiểu</TableCell>
                                        <TableCell align="center">—</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_DEVELOPING_MIN_SCORE')}</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_ESTABLISHED_MIN_SCORE')}</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_TRUSTED_MIN_SCORE')}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 500 }}>Số phiếu đã quyết toán tối thiểu</TableCell>
                                        <TableCell align="center">—</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_DEVELOPING_MIN_BATCHES')}</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_ESTABLISHED_MIN_BATCHES')}</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_TRUSTED_MIN_BATCHES')}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 500 }}>Hạn mức được giao</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_NEW_CAP_PERCENT')}</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_DEVELOPING_CAP_PERCENT')}</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_ESTABLISHED_CAP_PERCENT')}</TableCell>
                                        <TableCell align="center">{getConfidenceVal('VENDOR_CONFIDENCE_TRUSTED_CAP_PERCENT')}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Divider />
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} px={1}>
                            <Box flex={1}>
                                <Typography variant="subtitle2" gutterBottom>Tiêu chí đánh giá</Typography>
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="body2" color="text.secondary">Trả vé đúng hạn:</Typography>
                                        <Typography variant="body2" fontWeight={500}>{getConfidenceVal('VENDOR_CONFIDENCE_ON_TIME_WEIGHT')}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="body2" color="text.secondary">Tỉ lệ bán vé:</Typography>
                                        <Typography variant="body2" fontWeight={500}>{getConfidenceVal('VENDOR_CONFIDENCE_SELL_THROUGH_WEIGHT')}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="body2" color="text.secondary">Kinh nghiệm:</Typography>
                                        <Typography variant="body2" fontWeight={500}>{getConfidenceVal('VENDOR_CONFIDENCE_EXPERIENCE_WEIGHT')}</Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                            <Box flex={1}>
                                <Typography variant="subtitle2" gutterBottom>Quy mô đánh giá</Typography>
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="body2" color="text.secondary">Số phiếu xét gần nhất:</Typography>
                                        <Typography variant="body2" fontWeight={500}>{getConfidenceVal('VENDOR_CONFIDENCE_EXPERIENCE_WINDOW')}</Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>
                    </Stack>
                </Card>
            </Box>
        </Stack>
    );
};
