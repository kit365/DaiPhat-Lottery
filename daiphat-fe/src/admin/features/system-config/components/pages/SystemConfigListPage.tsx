"use client";

import { Fragment, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    Button,
    Card,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Search } from '../../../../components/ui/Search';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { UpdateSystemConfigFormValues } from '@/admin/features/system-config/schemas/system-config.schema';
import { useBulkUpdateVendorConfidencePolicy, useSystemConfigs, useUpdateSystemConfig } from '../../hooks/useSystemConfig';
import { SystemConfigEditDialog } from '../sections/SystemConfigEditDialog';
import { SystemConfigTableRow } from '../sections/SystemConfigTableRow';
import { VendorConfidencePolicyDialog } from '../sections/VendorConfidencePolicyDialog';
import { SettingsContentTabs, type SettingsContentTabItem } from '../../../settings/components/SettingsContentTabs';
import { EditIcon } from '../../../../assets/icons';
import { buildVendorConfigSections } from '../../utils/vendorConfigSections';
import {
    CONFIG_TYPE_LABELS,
    ConfigType,
    SystemConfigResponse,
} from '../../types/system-config';

type TypeFilter = ConfigType;

const HIDDEN_CONFIG_TYPES = new Set([ConfigType.STATIC_PAGE, ConfigType.GENERAL_SETTING]);

const TYPE_TABS: Array<{ value: TypeFilter; label: string } & SettingsContentTabItem> = [
    {
        value: ConfigType.ORDER_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.ORDER_SETTING],
        icon: ShoppingCartOutlinedIcon,
        color: '#2563eb',
    },
    {
        value: ConfigType.PAYMENT_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.PAYMENT_SETTING],
        icon: PaymentsOutlinedIcon,
        color: '#059669',
    },
    {
        value: ConfigType.TICKET_IMPORT,
        label: CONFIG_TYPE_LABELS[ConfigType.TICKET_IMPORT],
        icon: ConfirmationNumberOutlinedIcon,
        color: '#7c3aed',
    },
    {
        value: ConfigType.TICKET_RETURN,
        label: CONFIG_TYPE_LABELS[ConfigType.TICKET_RETURN],
        icon: AssignmentReturnOutlinedIcon,
        color: '#ea580c',
    },
    {
        value: ConfigType.SETTLEMENT_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.SETTLEMENT_SETTING],
        icon: BalanceOutlinedIcon,
        color: '#0d9488',
    },
    {
        value: ConfigType.VENDOR_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.VENDOR_SETTING],
        icon: StorefrontOutlinedIcon,
        color: '#db2777',
    },
    {
        value: ConfigType.REFUND_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.REFUND_SETTING],
        icon: ReplayOutlinedIcon,
        color: '#dc2626',
    },
    {
        value: ConfigType.COMPLAINT_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.COMPLAINT_SETTING],
        icon: ReportProblemOutlinedIcon,
        color: '#d97706',
    },
    {
        value: ConfigType.PAYOUT_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.PAYOUT_SETTING],
        icon: EmojiEventsOutlinedIcon,
        color: '#ca8a04',
    },
    {
        value: ConfigType.FORTUNE_SETTING,
        label: CONFIG_TYPE_LABELS[ConfigType.FORTUNE_SETTING],
        icon: AutoAwesomeOutlinedIcon,
        color: '#4f46e5',
    },
];

const DEFAULT_TAB = TYPE_TABS[0].value;

export const SystemConfigListPage = () => {
    const { user } = useAuthStore();
    const canEdit =
        user?.permissions?.includes(PERMISSIONS.SETTINGS.EDIT) ||
        user?.rolesName?.includes('ROLE_ADMIN');

    const router = useRouter();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>(DEFAULT_TAB);

    useEffect(() => {
        const tab = searchParams.get('tab') as TypeFilter;
        if (tab && TYPE_TABS.some((t) => t.value === tab)) {
            setTypeFilter(tab);
        } else {
            setTypeFilter(DEFAULT_TAB);
        }
    }, [searchParams]);

    const handleTabChange = (value: TypeFilter) => {
        setTypeFilter(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.replace(`?${params.toString()}`, { scroll: false });
    };
    const [selectedConfig, setSelectedConfig] = useState<SystemConfigResponse | null>(null);
    const [confidencePolicyOpen, setConfidencePolicyOpen] = useState(false);

    const { data: configsRes, isLoading } = useSystemConfigs('all');
    const { mutate: updateConfig, isPending } = useUpdateSystemConfig();
    const { mutate: bulkUpdateConfidence, isPending: isBulkConfidencePending } =
        useBulkUpdateVendorConfidencePolicy();

    const allConfigs = configsRes?.data || [];
    const listConfigs = useMemo(
        () => allConfigs.filter((c) => !HIDDEN_CONFIG_TYPES.has(c.configType)),
        [allConfigs]
    );

    const filteredConfigs = useMemo(() => {
        const items = listConfigs.filter((c) => c.configType === typeFilter);

        const q = search.trim().toLowerCase();
        if (!q) return items;

        return items.filter(
            (c) =>
                c.configKey.toLowerCase().includes(q) ||
                (c.configName || '').toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                c.configValue.toLowerCase().includes(q)
        );
    }, [listConfigs, search, typeFilter]);

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
                    toast.success(res.message || 'Cập nhật chính sách điểm tin cậy thành công!');
                    setConfidencePolicyOpen(false);
                } else {
                    toast.error(res.message || 'Cập nhật chính sách điểm tin cậy thất bại!');
                }
            },
            onError: (err: any) => {
                toast.error(
                    err?.response?.data?.message ||
                        err.message ||
                        'Cập nhật chính sách điểm tin cậy thất bại!'
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
                            placeholder={
                                typeFilter === ConfigType.VENDOR_SETTING
                                    ? 'Tìm chính sách người bán vé số...'
                                    : 'Tìm theo tên, mô tả hoặc giá trị...'
                            }
                            value={search}
                            onChange={setSearch}
                            maxWidth="100%"
                        />
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                {filteredConfigs.length} cấu hình
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>

                <SettingsContentTabs
                    value={Math.max(
                        0,
                        TYPE_TABS.findIndex((tab) => tab.value === typeFilter)
                    )}
                    items={TYPE_TABS.map(({ label, icon, color }) => ({ label, icon, color }))}
                    onChange={(index) => {
                        const next = TYPE_TABS[index];
                        if (next) handleTabChange(next.value);
                    }}
                />

                <TableContainer>
                    <Table sx={{ tableLayout: 'fixed', minWidth: 960 }}>
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
                                <TableCell sx={{ width: '32%' }}>Tên cấu hình</TableCell>
                                <TableCell sx={{ width: '36%' }}>Mô tả</TableCell>
                                <TableCell align="center" sx={{ width: 120 }}>Giá trị</TableCell>
                                <TableCell align="center" sx={{ width: 120 }}>Kiểu dữ liệu</TableCell>
                                {canEdit && <TableCell align="center" sx={{ width: 88 }}>Hành động</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={canEdit ? 5 : 4} align="center" sx={{ py: 4 }}>
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : filteredConfigs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canEdit ? 5 : 4} align="center" sx={{ py: 4 }}>
                                        {search ? 'Không tìm thấy cấu hình phù hợp' : 'Không có dữ liệu'}
                                    </TableCell>
                                </TableRow>
                            ) : typeFilter === ConfigType.VENDOR_SETTING ? (
                                buildVendorConfigSections(filteredConfigs).map((section) => (
                                    <Fragment key={section.title}>
                                        <TableRow>
                                            <TableCell
                                                colSpan={canEdit ? 5 : 4}
                                                sx={{
                                                    py: 1.5,
                                                    bgcolor: 'var(--palette-background-neutral, rgba(145, 158, 171, 0.08))',
                                                    borderBottom: '1px dashed var(--palette-divider)',
                                                }}
                                            >
                                                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1C252E' }}>
                                                        {section.title}
                                                    </Typography>
                                                    {section.showBulkConfidence && canEdit ? (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() => setConfidencePolicyOpen(true)}
                                                            startIcon={<EditIcon sx={{ fontSize: 18 }} />}
                                                            sx={{ textTransform: 'none', fontWeight: 700 }}
                                                        >
                                                            Điều chỉnh điểm tin cậy
                                                        </Button>
                                                    ) : null}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                        {section.items.map((config) => (
                                            <SystemConfigTableRow
                                                key={config.id}
                                                config={config}
                                                canEdit={Boolean(canEdit)}
                                                onEdit={handleEdit}
                                            />
                                        ))}
                                    </Fragment>
                                ))
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
