"use client";

import { Fragment, useMemo, useState } from 'react';
import {
    Box,
    Card,
    CircularProgress,
    IconButton,
    Stack,
    Switch,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminStatusBadge } from '../../../../components/ui/AdminStatusBadge';
import { AdminRowActionsMenu } from '../../../../components/ui/AdminRowActionsMenu';
import { Search } from '../../../../components/ui/Search';
import { getTabBadgeStyles } from '../../../../utils/badge';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useGetAdminTicketCategories } from '../../hooks/useSupportTicket';
import { supportTicketAdminApi } from '../../services/supportTicketService';
import { toast } from 'react-toastify';
import {
    TicketCategoryResponse,
    TICKET_REF_TYPE_LABELS,
} from '../../../../../types/support.type';

const HEAD_CELL_SX = {
    borderBottom: 'none',
    color: 'var(--palette-text-secondary)',
    fontWeight: 600,
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
} as const;

const BODY_CELL_SX = {
    borderBottom: '1px dashed var(--palette-background-neutral)',
    fontSize: '0.875rem',
    color: 'var(--palette-text-primary)',
    verticalAlign: 'middle',
} as const;

const GROUP_CELL_SX = {
    py: 1.5,
    bgcolor: 'var(--palette-background-neutral, rgba(145, 158, 171, 0.08))',
    borderBottom: '1px dashed var(--palette-divider)',
} as const;

type DisplayGroup = {
    id: string;
    name: string;
    description?: string;
    parent?: TicketCategoryResponse;
    children: TicketCategoryResponse[];
};

export const TicketCategoryList = () => {
    const queryClient = useQueryClient();
    const { data, isLoading } = useGetAdminTicketCategories();
    const categories = data?.data || [];

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTab, setSelectedTab] = useState('ALL');
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editData, setEditData] = useState({
        priority: 0,
        isActive: true,
        name: '',
        description: '',
    });
    const [errorMsg, setErrorMsg] = useState('');

    const parentCategories = useMemo(() => {
        const roots = categories.filter((c) => !c.parentId);
        roots.sort((a, b) => a.priority - b.priority || a.id - b.id);
        return roots;
    }, [categories]);

    const filtered = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return categories;
        return categories.filter(
            (c) =>
                c.name.toLowerCase().includes(term) ||
                c.code.toLowerCase().includes(term) ||
                (c.description || '').toLowerCase().includes(term)
        );
    }, [categories, searchTerm]);

    const displayGroups = useMemo((): DisplayGroup[] => {
        const sortChildren = (items: TicketCategoryResponse[]) =>
            [...items].sort((a, b) => a.priority - b.priority || a.id - b.id);

        if (selectedTab !== 'ALL') {
            const parentId = parseInt(selectedTab, 10);
            const parent = parentCategories.find((p) => p.id === parentId);
            return [
                {
                    id: `tab-${parentId}`,
                    name: parent?.name || '',
                    children: sortChildren(filtered.filter((c) => c.parentId === parentId)),
                },
            ];
        }

        const groups: DisplayGroup[] = parentCategories.map((root) => {
            const term = searchTerm.trim().toLowerCase();
            const parentMatches =
                !term ||
                root.name.toLowerCase().includes(term) ||
                root.code.toLowerCase().includes(term) ||
                (root.description || '').toLowerCase().includes(term);
            const children = sortChildren(
                (parentMatches ? categories : filtered).filter((c) => c.parentId === root.id)
            );
            return {
                id: `group-${root.id}`,
                name: root.name,
                description: root.description,
                parent: root,
                children,
            };
        });

        const processedParentIds = new Set(parentCategories.map((r) => r.id));
        const orphans = sortChildren(
            filtered.filter((c) => c.parentId && !processedParentIds.has(c.parentId))
        );
        if (orphans.length > 0) {
            groups.push({
                id: 'group-orphans',
                name: 'Khác',
                description: 'Các danh mục không thuộc nhóm nào',
                children: orphans,
            });
        }

        return groups.filter((group) => group.children.length > 0);
    }, [categories, filtered, parentCategories, selectedTab, searchTerm]);

    const updateMutation = useMutation({
        mutationFn: (args: {
            id: number;
            data: { priority: number; isActive: boolean; name: string; description: string };
        }) => supportTicketAdminApi.updateCategory(args.id, args.data),
        onSuccess: (res) => {
            if (res.success) {
                toast.success('Cập nhật thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_TICKET_CATEGORIES] });
                setEditingRowId(null);
            } else {
                toast.error(res.message || 'Cập nhật thất bại');
            }
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'Lỗi hệ thống';
            setErrorMsg(msg);
            toast.error(msg);
        },
    });

    const handleEditClick = (category: TicketCategoryResponse) => {
        setEditingRowId(category.id);
        setEditData({
            priority: category.priority,
            isActive: category.isActive ?? true,
            name: category.name || '',
            description: category.description || '',
        });
        setErrorMsg('');
    };

    const handleCancelEdit = () => {
        setEditingRowId(null);
        setErrorMsg('');
    };

    const handleSaveEdit = (id: number) => {
        updateMutation.mutate({ id, data: editData });
    };

    const handlePriorityChange = (val: string, currentId: number, parentId?: number | null) => {
        const priority = parseInt(val, 10) || 0;
        setEditData((prev) => ({ ...prev, priority }));

        const isDuplicate = categories.some(
            (c) => c.id !== currentId && c.parentId === parentId && c.priority === priority
        );
        setErrorMsg(isDuplicate ? 'Độ ưu tiên bị trùng lặp trong cùng cấp danh mục' : '');
    };

    const renderCategoryRow = (category: TicketCategoryResponse, isChild: boolean) => {
        const isEditing = editingRowId === category.id;

        return (
            <TableRow
                key={category.id}
                hover={!isEditing}
                sx={{ '&:hover': { bgcolor: 'var(--palette-action-hover)' } }}
            >
                <TableCell sx={BODY_CELL_SX}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                        {category.code}
                    </Typography>
                </TableCell>
                <TableCell sx={{ ...BODY_CELL_SX, pl: isChild ? 3 : 2 }}>
                    {isEditing ? (
                        <Stack spacing={1} sx={{ py: 1, minWidth: 240 }}>
                            <TextField
                                size="small"
                                value={editData.name}
                                onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Tên danh mục"
                                fullWidth
                                error={!!errorMsg && errorMsg.toLowerCase().includes('tên')}
                            />
                            <TextField
                                size="small"
                                value={editData.description}
                                onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Mô tả danh mục"
                                fullWidth
                            />
                        </Stack>
                    ) : (
                        <Stack spacing={0.25}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                                {category.name}
                            </Typography>
                            {category.description ? (
                                <Typography sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                    {category.description}
                                </Typography>
                            ) : null}
                        </Stack>
                    )}
                </TableCell>
                <TableCell sx={BODY_CELL_SX}>
                    <Typography sx={{ fontSize: '0.875rem', color: 'var(--palette-text-primary)' }}>
                        {category.requiredRefType
                            ? TICKET_REF_TYPE_LABELS[category.requiredRefType]
                            : '—'}
                    </Typography>
                </TableCell>
                <TableCell align="center" sx={BODY_CELL_SX}>
                    {isEditing ? (
                        <TextField
                            size="small"
                            value={editData.priority}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                handlePriorityChange(val, category.id, category.parentId);
                            }}
                            error={!!errorMsg}
                            helperText={errorMsg || undefined}
                            inputProps={{ style: { textAlign: 'center' } }}
                            InputProps={{
                                endAdornment: (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            mr: -1,
                                            '& .MuiIconButton-root': { p: 0, height: 16 },
                                        }}
                                    >
                                        <IconButton
                                            onClick={() =>
                                                handlePriorityChange(
                                                    String((Number(editData.priority) || 0) + 1),
                                                    category.id,
                                                    category.parentId
                                                )
                                            }
                                        >
                                            <KeyboardArrowUp fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            onClick={() =>
                                                handlePriorityChange(
                                                    String(Math.max(1, (Number(editData.priority) || 0) - 1)),
                                                    category.id,
                                                    category.parentId
                                                )
                                            }
                                        >
                                            <KeyboardArrowDown fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ),
                            }}
                            sx={{ width: 100 }}
                        />
                    ) : (
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {category.priority}
                        </Typography>
                    )}
                </TableCell>
                <TableCell align="center" sx={BODY_CELL_SX}>
                    {isEditing ? (
                        <Switch
                            checked={editData.isActive}
                            onChange={(e) => setEditData((prev) => ({ ...prev, isActive: e.target.checked }))}
                            color="primary"
                        />
                    ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <AdminStatusBadge
                                label={category.isActive ? 'Hoạt động' : 'Không hoạt động'}
                                modifier={
                                    category.isActive
                                        ? 'admin-status-badge--success'
                                        : 'admin-status-badge--inactive'
                                }
                            />
                        </Box>
                    )}
                </TableCell>
                <TableCell align="right" sx={{ ...BODY_CELL_SX, width: 80 }}>
                    {isEditing ? (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleSaveEdit(category.id)}
                                disabled={!!errorMsg || updateMutation.isPending}
                            >
                                <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={handleCancelEdit}
                                disabled={updateMutation.isPending}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ) : (
                        <AdminRowActionsMenu
                            items={[
                                {
                                    id: 'edit',
                                    label: 'Sửa',
                                    icon: 'edit',
                                    onClick: () => handleEditClick(category),
                                },
                            ]}
                        />
                    )}
                </TableCell>
            </TableRow>
        );
    };

    const hasRows = displayGroups.some((group) => group.children.length > 0);
    const showGroupHeaders = selectedTab === 'ALL';

    const tabCounts = useMemo(() => {
        const children = categories.filter((c) => c.parentId);
        const byParent: Record<string, number> = {};
        parentCategories.forEach((parent) => {
            byParent[parent.id] = children.filter((c) => c.parentId === parent.id).length;
        });
        return {
            ALL: children.length,
            byParent,
        };
    }, [categories, parentCategories]);

    const renderTabLabel = (label: string, count: number, selected: boolean, badgeKey: string) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
                sx={{
                    fontSize: '0.875rem',
                    fontWeight: selected ? 700 : 500,
                    color: selected ? 'var(--palette-text-primary)' : 'inherit',
                }}
            >
                {label}
            </Typography>
            <span className="admin-tab-badge" style={getTabBadgeStyles(badgeKey, selected)}>
                {count}
            </span>
        </Box>
    );

    return (
        <Card elevation={0} className="admin-datagrid-card" sx={{ height: 'auto' }}>
            <Tabs
                value={selectedTab}
                onChange={(_, value) => setSelectedTab(value)}
                variant="scrollable"
                scrollButtons={false}
                sx={{
                    px: '20px',
                    minHeight: '48px',
                    borderBottom: '1px solid var(--palette-background-neutral)',
                    '& .MuiTabs-flexContainer': { gap: 'calc(5 * var(--spacing))' },
                    '& .MuiTabs-indicator': { backgroundColor: 'var(--palette-text-primary)', height: 2 },
                }}
            >
                <Tab
                    value="ALL"
                    disableRipple
                    label={renderTabLabel('Tất cả', tabCounts.ALL, selectedTab === 'ALL', 'all')}
                    sx={{
                        minWidth: 0,
                        padding: 0,
                        minHeight: '48px',
                        textTransform: 'none',
                        color: 'var(--palette-text-secondary)',
                        '&.Mui-selected': { color: 'var(--palette-text-primary)' },
                    }}
                />
                {parentCategories.map((parent) => (
                    <Tab
                        key={parent.id}
                        value={parent.id.toString()}
                        disableRipple
                        label={renderTabLabel(
                            parent.name,
                            tabCounts.byParent[parent.id] || 0,
                            selectedTab === parent.id.toString(),
                            'all'
                        )}
                        sx={{
                            minWidth: 0,
                            padding: 0,
                            minHeight: '48px',
                            textTransform: 'none',
                            color: 'var(--palette-text-secondary)',
                            '&.Mui-selected': { color: 'var(--palette-text-primary)' },
                        }}
                    />
                ))}
            </Tabs>

            <Box sx={{ borderBottom: '1px dashed var(--palette-background-neutral)' }}>
                <Box sx={{ p: '20px' }}>
                    <Search
                        placeholder="Tìm kiếm mã hoặc tên danh mục..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                        maxWidth="100%"
                    />
                </Box>
            </Box>

            <TableContainer sx={{ position: 'relative', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Table sx={{ minWidth: 960 }} size="medium">
                    <TableHead sx={{ bgcolor: 'var(--palette-background-neutral)' }}>
                        <TableRow>
                            <TableCell sx={HEAD_CELL_SX}>Mã danh mục</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Tên danh mục</TableCell>
                            <TableCell sx={HEAD_CELL_SX}>Liên quan đến</TableCell>
                            <TableCell sx={HEAD_CELL_SX} align="center">Độ ưu tiên</TableCell>
                            <TableCell sx={HEAD_CELL_SX} align="center">Trạng thái</TableCell>
                            <TableCell sx={{ ...HEAD_CELL_SX, width: 80 }} align="right" />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                        <CircularProgress size={32} />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : !hasRows ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ borderBottom: 'none', py: 10 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                                        <span className="admin-datagrid-empty">Không có dữ liệu</span>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayGroups.map((group) => (
                                <Fragment key={group.id}>
                                    {showGroupHeaders ? (
                                        <TableRow>
                                            <TableCell colSpan={6} sx={GROUP_CELL_SX}>
                                                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1C252E' }}>
                                                    {group.name}
                                                </Typography>
                                                {group.description ? (
                                                    <Typography sx={{ mt: 0.25, color: 'var(--palette-text-secondary)', fontSize: '0.75rem' }}>
                                                        {group.description}
                                                    </Typography>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                    {group.children.map((category) => renderCategoryRow(category, showGroupHeaders))}
                                </Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Card>
    );
};
