import { useMemo, useState, type ReactElement } from 'react';
import {
    Box,
    Button,
    Card,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Typography,
    styled,
} from '@mui/material';
import { Banknote, CreditCard, FileText, Gift, Globe2, LayoutList, MessageSquare, PackageMinus, ShoppingCart, Sparkles, Store, Ticket } from 'lucide-react';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Search } from '../../../../components/ui/Search';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { UpdateSystemConfigFormValues } from '../../../../schemas/system-config.schema';
import { useBulkUpdateVendorConfidencePolicy, useSystemConfigs, useUpdateSystemConfig } from '../../hooks/useSystemConfig';
import { SystemConfigEditDialog } from '../sections/SystemConfigEditDialog';
import { SystemConfigTableRow } from '../sections/SystemConfigTableRow';
import { VendorConfidencePolicyDialog } from '../sections/VendorConfidencePolicyDialog';
import {
    CONFIG_TYPE_LABELS,
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

const TYPE_TABS: { value: TypeFilter; label: string; icon: ReactElement; color: string }[] = [
    { value: 'all', label: 'Tất cả', icon: <LayoutList size={18} />, color: 'primary.main' },
    {
        value: ConfigType.GENERAL_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.GENERAL_SETTING],
        icon: <Globe2 size={18} />,
        color: 'primary.dark',
    },
    {
        value: ConfigType.STATIC_PAGE,
        label: CONFIG_TYPE_LABELS[ConfigType.STATIC_PAGE],
        icon: <FileText size={18} />,
        color: 'primary.main',
    },
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
        value: ConfigType.TICKET_RETURN,
        label: CONFIG_TYPE_LABELS[ConfigType.TICKET_RETURN],
        icon: <PackageMinus size={18} />,
        color: 'warning.dark',
    },
    {
        value: ConfigType.VENDOR_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.VENDOR_SETTING],
        icon: <Store size={18} />,
        color: 'info.dark',
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
    {
        value: ConfigType.PAYOUT_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.PAYOUT_SETTING],
        icon: <Gift size={18} />,
        color: 'success.dark',
    },
    {
        value: ConfigType.FORTUNE_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.FORTUNE_SETTING],
        icon: <Sparkles size={18} />,
        color: 'error.dark',
    },
];

const renderTypeFilterTab = (
    tab: (typeof TYPE_TABS)[number],
    selected: boolean,
    count: number
) => (
    <Tab
        value={tab.value}
        icon={tab.icon}
        iconPosition="start"
        label={
            <Box
                component="span"
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    color: selected ? tab.color : 'text.secondary',
                }}
            >
                <Box component="span">{tab.label}</Box>
                <TabBadge
                    sx={{
                        ml: 0,
                        bgcolor: selected ? tab.color : 'action.hover',
                        color: selected ? '#fff' : 'text.secondary',
                    }}
                >
                    {count}
                </TabBadge>
            </Box>
        }
    />
);

export const SystemConfigListPage = () => {
    const { user } = useAuthStore();
    const canEdit =
        user?.permissions?.includes(PERMISSIONS.SETTINGS.EDIT) ||
        user?.rolesName?.includes('ROLE_ADMIN');

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [selectedConfig, setSelectedConfig] = useState<SystemConfigResponse | null>(null);
    const [confidencePolicyOpen, setConfidencePolicyOpen] = useState(false);

    const { data: configsRes, isLoading } = useSystemConfigs('all');
    const { mutate: updateConfig, isPending } = useUpdateSystemConfig();
    const { mutate: bulkUpdateConfidence, isPending: isBulkConfidencePending } =
        useBulkUpdateVendorConfidencePolicy();

    const allConfigs = configsRes?.data || [];
    const hasConfidenceConfigs = allConfigs.some((c) => c.configKey.startsWith('VENDOR_CONFIDENCE_'));

    const typeCounts = useMemo(() => {
        const counts: Record<TypeFilter, number> = {
            all: allConfigs.length,
            [ConfigType.GENERAL_SETTING]: 0,
            [ConfigType.STATIC_PAGE]: 0,
            [ConfigType.ORDER_SETTING]: 0,
            [ConfigType.PAYMENT_SETTING]: 0,
            [ConfigType.TICKET_IMPORT]: 0,
            [ConfigType.TICKET_RETURN]: 0,
            [ConfigType.VENDOR_SETTING]: 0,
            [ConfigType.REFUND_SETTING]: 0,
            [ConfigType.COMPLAINT_SETTING]: 0,
            [ConfigType.PAYOUT_SETTING]: 0,
            [ConfigType.FORTUNE_SETTING]: 0,
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

    const [
        allTab,
        orderTab,
        paymentTab,
        ticketImportTab,
        ticketReturnTab,
        refundTab,
        complaintTab,
        payoutTab,
        fortuneTab,
    ] = TYPE_TABS;

    const handleEdit = (config: SystemConfigResponse) => {
        if (config.configKey.startsWith('VENDOR_CONFIDENCE_')) {
            setConfidencePolicyOpen(true);
            return;
        }
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

    const handleBulkConfidenceSubmit = (values: Record<string, string>) => {
        bulkUpdateConfidence(values, {
            onSuccess: (res) => {
                if (res.success) {
                    toast.success(res.message || 'Cập nhật bộ cấu hình confidence thành công!');
                    setConfidencePolicyOpen(false);
                } else {
                    toast.error(res.message || 'Cập nhật bộ cấu hình confidence thất bại!');
                }
            },
            onError: (err: any) => {
                toast.error(
                    err?.response?.data?.message ||
                        err.message ||
                        'Cập nhật bộ cấu hình confidence thất bại!'
                );
            },
        });
    };

    return (
        <>
            <PageHeader
                title="Cấu hình hệ thống"
                breadcrumbItems={[
                            { label: 'Dashboard', to: '/admin' },
                            { label: 'Cài đặt', to: '/admin/dashboard/settings' },
                            { label: 'Cấu hình hệ thống' },
                        ]}
            />

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
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            {canEdit && hasConfidenceConfigs && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setConfidencePolicyOpen(true)}
                                >
                                    Chỉnh policy confidence
                                </Button>
                            )}
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                {filteredConfigs.length} cấu hình
                            </Typography>
                        </Stack>
                    </Stack>

                    <Tabs
                        value={typeFilter}
                        onChange={(_, value: TypeFilter) => setTypeFilter(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{
                            minHeight: 44,
                            '& .MuiTab-root': {
                                minHeight: 44,
                                textTransform: 'none',
                                fontWeight: 600,
                                flexShrink: 0,
                            },
                            '& .MuiTabs-scrollButtons.Mui-disabled': {
                                opacity: 0.3,
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: TYPE_TABS.find((t) => t.value === typeFilter)?.color || 'primary.main',
                            },
                        }}
                    >
                        {renderTypeFilterTab(allTab, typeFilter === allTab.value, typeCounts[allTab.value])}
                        {renderTypeFilterTab(orderTab, typeFilter === orderTab.value, typeCounts[orderTab.value])}
                        {renderTypeFilterTab(paymentTab, typeFilter === paymentTab.value, typeCounts[paymentTab.value])}
                        {renderTypeFilterTab(
                            ticketImportTab,
                            typeFilter === ticketImportTab.value,
                            typeCounts[ticketImportTab.value]
                        )}
                        {renderTypeFilterTab(
                            ticketReturnTab,
                            typeFilter === ticketReturnTab.value,
                            typeCounts[ticketReturnTab.value]
                        )}
                        {renderTypeFilterTab(refundTab, typeFilter === refundTab.value, typeCounts[refundTab.value])}
                        {renderTypeFilterTab(
                            complaintTab,
                            typeFilter === complaintTab.value,
                            typeCounts[complaintTab.value]
                        )}
                        {renderTypeFilterTab(payoutTab, typeFilter === payoutTab.value, typeCounts[payoutTab.value])}
                        {renderTypeFilterTab(fortuneTab, typeFilter === fortuneTab.value, typeCounts[fortuneTab.value])}
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
                                    <SystemConfigTableRow
                                        key={config.id}
                                        config={config}
                                        canEdit={Boolean(canEdit)}
                                        onEdit={handleEdit}
                                    />
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

            <VendorConfidencePolicyDialog
                open={confidencePolicyOpen}
                configs={allConfigs}
                loading={isBulkConfidencePending}
                onClose={() => setConfidencePolicyOpen(false)}
                onSubmit={handleBulkConfidenceSubmit}
            />
        </>
    );
};
