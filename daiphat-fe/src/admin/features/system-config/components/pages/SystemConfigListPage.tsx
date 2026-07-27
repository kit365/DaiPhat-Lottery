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
import { Banknote, CreditCard, Edit2, LayoutList, MessageSquare, ShoppingCart, Ticket } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Search } from '../../../../components/ui/Search';
import { Title } from '../../../../components/ui/Title';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { UpdateSystemConfigFormValues } from '../../../../schemas/system-config.schema';
import { useSystemConfigs, useUpdateSystemConfig } from '../../hooks/useSystemConfig';
import { SystemConfigEditDialog } from '../sections/SystemConfigEditDialog';
import {
    CONFIG_DATA_TYPE_LABELS,
    CONFIG_TYPE_LABELS,
    ConfigDataType,
    ConfigType,
    SystemConfigResponse,
} from '../../types/system-config';

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

const TYPE_TABS: { value: TypeFilter; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'all', label: 'Tất cả', icon: <LayoutList size={18} />, color: 'primary.main' },
    {
        value: ConfigType.ORDER_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.ORDER_SETTING],
        icon: <ShoppingCart size={18} />,
        color: 'info.main',
    },
    {
        value: ConfigType.PAYMENT_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.PAYMENT_SETTING],
        icon: <CreditCard size={18} />,
        color: 'success.main',
    },
    {
        value: ConfigType.TICKET_IMPORT,
        label: CONFIG_TYPE_LABELS[ConfigType.TICKET_IMPORT],
        icon: <Ticket size={18} />,
        color: 'warning.main',
    },
    {
        value: ConfigType.REFUND_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.REFUND_SETTING],
        icon: <Banknote size={18} />,
        color: 'secondary.main',
    },
    {
        value: ConfigType.COMPLAINT_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.COMPLAINT_SETTING],
        icon: <MessageSquare size={18} />,
        color: 'error.main',
    },
];

const truncateValue = (value: string, maxLen = 48) => {
    if (value.length <= maxLen) return value;
    return `${value.slice(0, maxLen)}…`;
};

const getTypeChipColor = (type: ConfigType): 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' => {
    switch (type) {
        case ConfigType.ORDER_SETTING:
            return 'primary';
        case ConfigType.PAYMENT_SETTING:
            return 'info';
        case ConfigType.TICKET_IMPORT:
            return 'warning';
        case ConfigType.REFUND_SETTING:
            return 'secondary';
        case ConfigType.COMPLAINT_SETTING:
            return 'error';
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
            [ConfigType.PAYMENT_SETTING]: 0,
            [ConfigType.TICKET_IMPORT]: 0,
            [ConfigType.REFUND_SETTING]: 0,
            [ConfigType.COMPLAINT_SETTING]: 0,
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
                (c.configName || '').toLowerCase().includes(q) ||
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
            configName: data.configName.trim(),
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
                            placeholder="Tìm theo tên, khóa, mô tả hoặc giá trị..."
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
                            '& .MuiTabs-indicator': {
                                backgroundColor: TYPE_TABS.find((t) => t.value === typeFilter)?.color || 'primary.main',
                            },
                        }}
                    >
                        {TYPE_TABS.map((tab) => {
                            const isSelected = typeFilter === tab.value;
                            return (
                                <Tab
                                    key={tab.value}
                                    value={tab.value}
                                    label={
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                color: isSelected ? tab.color : 'text.secondary',
                                            }}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                            <TabBadge
                                                sx={{
                                                    ml: 0,
                                                    bgcolor: isSelected ? tab.color : 'action.hover',
                                                    color: isSelected ? '#fff' : 'text.secondary',
                                                }}
                                            >
                                                {typeCounts[tab.value]}
                                            </TabBadge>
                                        </Box>
                                    }
                                />
                            );
                        })}
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
                                <TableCell>Tên cấu hình</TableCell>
                                <TableCell>Mô tả</TableCell>
                                <TableCell>Giá trị</TableCell>
                                <TableCell>Đơn vị</TableCell>
                                <TableCell align="center">Loại</TableCell>
                                <TableCell>Kiểu dữ liệu</TableCell>
                                {canEdit && <TableCell align="center">Hành động</TableCell>}
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
                                        <TableCell sx={{ maxWidth: 240 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {config.configName || config.configKey}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.disabled"
                                                sx={{ fontFamily: 'monospace' }}
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
                                            <Typography variant="body2" color="text.secondary">
                                                {config.unit || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
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
                                        {canEdit && (
                                            <TableCell align="center">
                                                {config.isEditable === false ? (
                                                    <Tooltip title="Cấu hình hệ thống — không chỉnh sửa được">
                                                        <span>
                                                            <IconButton size="small" disabled>
                                                                <Edit2 size={18} />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="Chỉnh sửa">
                                                        <IconButton
                                                            onClick={() => handleEdit(config)}
                                                            size="small"
                                                            color="primary"
                                                        >
                                                            <Edit2 size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
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
