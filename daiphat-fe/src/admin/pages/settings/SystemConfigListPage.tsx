import { useMemo, useState } from 'react';
import {
    Box,
    Card,
    Chip,
    IconButton,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
    styled,
} from '@mui/material';
import { Edit2 } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Search } from '../../components/ui/Search';
import { Title } from '../../components/ui/Title';
import { PERMISSIONS } from '../../constants/permission.constants';
import { useAuthStore } from '../../../stores/useAuthStore';
import { UpdateSystemConfigFormValues } from '../../schemas/system-config.schema';
import { useSystemConfigs, useUpdateSystemConfig } from './hooks/useSystemConfig';
import { SystemConfigEditDialog } from './sections/SystemConfigEditDialog';
import {
    CONFIG_DATA_TYPE_LABELS,
    CONFIG_TYPE_LABELS,
    ConfigDataType,
    ConfigType,
    SystemConfigResponse,
} from './types/system-config';

const TabBadge = styled('span')(() => ({
    height: '24px',
    minWidth: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: 'var(--shape-borderRadius-sm)',
    fontSize: '0.75rem',
    fontWeight: 700,
}));

type TypeFilter = 'all' | ConfigType;

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: ConfigType.ORDER_SETTING, label: CONFIG_TYPE_LABELS[ConfigType.ORDER_SETTING] },
    { value: ConfigType.REFUND_SETTING, label: CONFIG_TYPE_LABELS[ConfigType.REFUND_SETTING] },
];

const truncateValue = (value: string, maxLen = 48) => {
    if (value.length <= maxLen) return value;
    return `${value.slice(0, maxLen)}…`;
};

const getTypeChipColor = (type: ConfigType): 'default' | 'primary' | 'secondary' | 'warning' => {
    switch (type) {
        case ConfigType.ORDER_SETTING:
            return 'primary';
        case ConfigType.REFUND_SETTING:
            return 'secondary';
        default:
            return 'default';
    }
};

export const SystemConfigListPage = () => {
    const { user } = useAuthStore();
    const canEdit =
        user?.permissions?.includes(PERMISSIONS.SETTINGS.EDIT) ||
        user?.rolesName?.includes('ROLE_ADMIN');

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [selectedConfig, setSelectedConfig] = useState<SystemConfigResponse | null>(null);

    const { data: configsRes, isLoading } = useSystemConfigs('all');
    const { mutate: updateConfig, isPending } = useUpdateSystemConfig();

    const allConfigs = configsRes?.data || [];

    const typeCounts = useMemo(() => {
        const counts: Record<TypeFilter, number> = {
            all: allConfigs.length,
            [ConfigType.ORDER_SETTING]: 0,
            [ConfigType.REFUND_SETTING]: 0,
        };
        allConfigs.forEach((c) => {
            if (counts[c.configType] !== undefined) {
                counts[c.configType] += 1;
            }
        });
        return counts;
    }, [allConfigs]);

    const filteredConfigs = useMemo(() => {
        let items = allConfigs;

        if (typeFilter !== 'all') {
            items = items.filter((c) => c.configType === typeFilter);
        }

        const q = search.trim().toLowerCase();
        if (!q) return items;

        return items.filter(
            (c) =>
                c.configKey.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                c.configValue.toLowerCase().includes(q)
        );
    }, [allConfigs, search, typeFilter]);

    const handleEdit = (config: SystemConfigResponse) => {
        setSelectedConfig(config);
    };

    const handleCloseDialog = () => {
        setSelectedConfig(null);
    };

    const handleSubmit = (data: UpdateSystemConfigFormValues) => {
        if (!selectedConfig) return;

        const payload = {
            configValue: data.configValue.trim(),
            description: data.description.trim(),
        };

        updateConfig(
            { id: selectedConfig.id, data: payload },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success(res.message || 'Cập nhật cấu hình thành công!');
                        handleCloseDialog();
                    } else {
                        toast.error(res.message || 'Cập nhật cấu hình thất bại!');
                    }
                },
                onError: (err: any) => {
                    toast.error(err?.response?.data?.message || err.message || 'Cập nhật thất bại!');
                },
            }
        );
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Cấu hình hệ thống" />
                    <Breadcrumb
                        items={[
                            { label: 'Dashboard', to: '/admin' },
                            { label: 'Cài đặt', to: '/admin/dashboard/settings' },
                            { label: 'Cấu hình hệ thống' },
                        ]}
                    />
                </div>
            </div>

            <Card
                sx={{
                    borderRadius: '16px',
                    boxShadow: 'var(--customShadows-card)',
                    backgroundColor: 'var(--palette-background-paper)',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ px: 3, pt: 2.5, pb: 0 }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                    >
                        <Search
                            placeholder="Tìm theo khóa, mô tả hoặc giá trị..."
                            value={search}
                            onChange={setSearch}
                            maxWidth="100%"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {filteredConfigs.length} cấu hình
                        </Typography>
                    </Stack>

                    <Tabs
                        value={typeFilter}
                        onChange={(_, value: TypeFilter) => setTypeFilter(value)}
                        sx={{
                            minHeight: 44,
                            '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 600 },
                        }}
                    >
                        {TYPE_TABS.map((tab) => (
                            <Tab
                                key={tab.value}
                                value={tab.value}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {tab.label}
                                        <TabBadge
                                            sx={{
                                                bgcolor:
                                                    typeFilter === tab.value
                                                        ? 'primary.main'
                                                        : 'action.hover',
                                                color:
                                                    typeFilter === tab.value
                                                        ? 'primary.contrastText'
                                                        : 'text.secondary',
                                            }}
                                        >
                                            {typeCounts[tab.value]}
                                        </TabBadge>
                                    </Box>
                                }
                            />
                        ))}
                    </Tabs>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow
                                sx={{
                                    '& th': {
                                        color: 'var(--palette-text-secondary)',
                                        fontWeight: 600,
                                        borderBottom: '1px dashed var(--palette-divider)',
                                        whiteSpace: 'nowrap',
                                    },
                                }}
                            >
                                <TableCell>Khóa</TableCell>
                                <TableCell>Mô tả</TableCell>
                                <TableCell>Giá trị</TableCell>
                                <TableCell>Loại</TableCell>
                                <TableCell>Kiểu dữ liệu</TableCell>
                                <TableCell>Cập nhật</TableCell>
                                {canEdit && <TableCell align="right">Hành động</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={canEdit ? 7 : 6} align="center" sx={{ py: 4 }}>
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : filteredConfigs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canEdit ? 7 : 6} align="center" sx={{ py: 4 }}>
                                        {search ? 'Không tìm thấy cấu hình phù hợp' : 'Không có dữ liệu'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredConfigs.map((config) => (
                                    <TableRow
                                        key={config.id}
                                        hover
                                        sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)' } }}
                                    >
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                                            >
                                                {config.configKey}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 220 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {config.description}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 200 }}>
                                            <Tooltip title={config.configValue} placement="top-start">
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontFamily:
                                                            config.dataType === ConfigDataType.TIME
                                                                ? 'monospace'
                                                                : 'inherit',
                                                    }}
                                                >
                                                    {truncateValue(config.configValue)}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={CONFIG_TYPE_LABELS[config.configType] || config.configType}
                                                color={getTypeChipColor(config.configType)}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={CONFIG_DATA_TYPE_LABELS[config.dataType] || config.dataType}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {config.updatedAt
                                                    ? dayjs(config.updatedAt).format('DD/MM/YYYY HH:mm')
                                                    : '—'}
                                            </Typography>
                                            {config.updatedBy && (
                                                <Typography variant="caption" color="text.disabled">
                                                    {config.updatedBy}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        {canEdit && (
                                            <TableCell align="right">
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton
                                                        onClick={() => handleEdit(config)}
                                                        size="small"
                                                        color="primary"
                                                    >
                                                        <Edit2 size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <SystemConfigEditDialog
                config={selectedConfig}
                open={!!selectedConfig}
                onClose={handleCloseDialog}
                onSubmit={handleSubmit}
                isPending={isPending}
            />
        </>
    );
};
