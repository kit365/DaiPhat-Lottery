"use client";

import type {
    GridColDef,
} from '@mui/x-data-grid';
import { LazyDataGrid } from '@/admin/shared/data-grid/LazyDataGrid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import { SortAscendingIcon, SortDescendingIcon, UnsortedIcon } from '../../../../assets/icons';
import {
    IGridSettings,
    useSettings,
    columnsPanelStyles,
    dataGridContainerStyles,
    dataGridStyles,
    filterPanelStyles,
} from '../../../../shared/data-grid';
import { TicketCategoryToolbar } from './TicketCategoryToolbar';
import { DATA_GRID_LOCALE_VN } from '../../../../../shared/components/DataTable/localeText.config';
import { TicketCategoryResponse, TICKET_REF_TYPE_LABELS } from '../../../../../types/support.type';
import { Typography, TextField, Switch, IconButton, ListItemText, Tooltip, alpha } from '@mui/material';
import {
    Check as CheckIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    SubdirectoryArrowRightRounded as SubdirectoryArrowRightIcon,
    KeyboardArrowUp,
    KeyboardArrowDown,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supportTicketAdminApi } from '../../services/supportTicketService';
import { toast } from 'react-toastify';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useMemo, useState } from 'react';

declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        settings: IGridSettings;
        onSettingsChange: import('react').Dispatch<import('react').SetStateAction<IGridSettings>>;
        searchTerm: string;
        onSearchChange: (search: string) => void;
    }
}

interface TicketCategoryListProps {
    categories: TicketCategoryResponse[];
    isLoading: boolean;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    selectedTab: string;
}

export const TicketCategoryList = ({
    categories,
    isLoading,
    searchTerm,
    onSearchChange,
    selectedTab,
}: TicketCategoryListProps) => {
    const { settings, setSettings } = useSettings();
    const queryClient = useQueryClient();

    const [editingRowId, setEditingRowId] = useState<number | string | null>(null);
    const [editData, setEditData] = useState<{ priority: number; isActive: boolean; name: string; description: string }>({ priority: 0, isActive: true, name: '', description: '' });
    const [errorMsg, setErrorMsg] = useState<string>('');

    const updateMutation = useMutation({
        mutationFn: (args: { id: number; data: { priority: number; isActive: boolean; name: string; description: string } }) => 
            supportTicketAdminApi.updateCategory(args.id, args.data),
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
        }
    });

    const displayCategories = useMemo(() => {
        const filtered = categories.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.code.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (selectedTab === 'ALL') {
            const roots = filtered.filter(c => !c.parentId);
            roots.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.id - b.id;
            });

            const result: (TicketCategoryResponse & { isGroupRow?: boolean; isParentGroupRow?: boolean; groupName?: string; groupDescription?: string })[] = [];
            roots.forEach(root => {
                result.push({
                    ...root,
                    isParentGroupRow: true,
                    groupName: root.name,
                    groupDescription: root.description,
                });

                const children = filtered.filter(c => c.parentId === root.id);
                children.sort((a, b) => {
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    return a.id - b.id;
                });
                result.push(...children);
            });

            const processedParentIds = new Set(roots.map(r => r.id));
            const orphans = filtered.filter(c => c.parentId && !processedParentIds.has(c.parentId));
            if (orphans.length > 0) {
                orphans.sort((a, b) => {
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    return a.id - b.id;
                });
                result.push({
                    id: 'group-parent-orphans' as any,
                    isGroupRow: true,
                    groupName: 'Khác',
                    groupDescription: 'Các danh mục không thuộc nhóm nào',
                    code: '',
                    name: '',
                    priority: 0,
                    isActive: true,
                } as any);
                result.push(...orphans);
            }

            return result;
        } else {
            const parentId = parseInt(selectedTab, 10);
            const children = filtered.filter(c => c.parentId === parentId);
            
            // Sort children by priority and then by id
            children.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.id - b.id;
            });
            
            return children;
        }
    }, [categories, searchTerm, selectedTab]);

    const handleEditClick = (category: TicketCategoryResponse) => {
        setEditingRowId(category.id);
        setEditData({ priority: category.priority, isActive: category.isActive ?? true, name: category.name || '', description: category.description || '' });
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
        setEditData(prev => ({ ...prev, priority }));
        
        const isDuplicate = categories.some(c => 
            c.id !== currentId && 
            c.parentId === parentId && 
            c.priority === priority
        );
        
        if (isDuplicate) {
            setErrorMsg('Độ ưu tiên bị trùng lặp trong cùng cấp danh mục');
        } else {
            setErrorMsg('');
        }
    };

    const getCategoryColor = (code: string) => {
        switch (code) {
            case 'GROUP_ORDER':
            case 'ORDER_ISSUE':
                return 'info.main';
            case 'GROUP_PAYMENT':
            case 'PAYMENT_ISSUE':
                return 'success.main';
            case 'GENERAL':
                return 'warning.main';
            default:
                return 'primary.main';
        }
    };

    const getRefTypeColor = (type: string) => {
        switch (type) {
            case 'ORDER':
                return { bg: 'info.50', color: 'info.main' };
            case 'PAYMENT_TRANSACTION':
                return { bg: 'success.50', color: 'success.main' };
            case 'REFUND_REQUEST':
                return { bg: 'warning.50', color: 'warning.main' };
            case 'PRIZE_CLAIM':
                return { bg: 'secondary.50', color: 'secondary.main' };
            default:
                return { bg: 'grey.100', color: 'text.secondary' };
        }
    };

    const columns: GridColDef<TicketCategoryResponse & { isGroupRow?: boolean; isParentGroupRow?: boolean; groupName?: string; groupDescription?: string }>[] = [
        { 
            field: 'code', 
            headerName: 'Mã danh mục', 
            width: 220,
            renderCell: (params) => {
                if (params.row.isGroupRow) return '';
                const isParent = !params.row.parentId && selectedTab === 'ALL';
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Typography 
                            variant="body2" 
                            fontWeight={isParent ? 700 : 600} 
                            color={isParent ? getCategoryColor(params.value) : 'text.primary'}
                            sx={isParent ? { textTransform: 'uppercase', letterSpacing: 0.5 } : {}}
                        >
                            {params.value}
                        </Typography>
                    </Box>
                );
            }
        },
        { 
            field: 'name', 
            headerName: 'Tên danh mục', 
            flex: 1,
            renderCell: (params) => {
                const isEditing = editingRowId === params.row.id;
                if (isEditing) {
                    return (
                        <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', gap: 1, pr: 2, width: '100%' }}>
                            <TextField
                                size="small"
                                value={editData.name}
                                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Tên danh mục"
                                fullWidth
                                multiline
                                maxRows={3}
                                error={!!errorMsg && errorMsg.toLowerCase().includes('tên')}
                            />
                            <TextField
                                size="small"
                                value={editData.description}
                                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                onKeyDown={(e) => e.stopPropagation()}
                                placeholder="Mô tả danh mục"
                                fullWidth
                                multiline
                                maxRows={4}
                            />
                        </Box>
                    );
                }
                
                if (params.row.isGroupRow) {
                    return (
                        <Box sx={{ py: 1 }}>
                            <Typography variant="body1" fontWeight={600} color="primary.main">
                                {params.row.groupName}
                            </Typography>
                            {params.row.groupDescription && (
                                <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {params.row.groupDescription}
                                </Typography>
                            )}
                        </Box>
                    );
                }
                const isParent = !params.row.parentId && selectedTab === 'ALL';
                return (
                    <Box sx={{ pl: (isParent || selectedTab !== 'ALL') ? 0 : 3, py: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="body1" fontWeight={isParent ? 700 : 500} color={isParent ? getCategoryColor(params.row.code) : 'text.primary'} sx={isParent ? { fontSize: '1.05rem' } : { fontSize: '0.95rem' }}>
                            {params.value}
                        </Typography>
                        {params.row.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.25, opacity: isParent ? 0.9 : 0.7, fontSize: '0.85rem' }}>
                                {params.row.description}
                            </Typography>
                        )}
                    </Box>
                );
            }
        },
        { 
            field: 'requiredRefType', 
            headerName: 'Tham chiếu đến đối tượng', 
            width: 230,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                if (params.row.isGroupRow) return '';
                const isParent = !params.row.parentId && selectedTab === 'ALL';
                const isEditing = editingRowId === params.row.id;
                if (isParent && !isEditing) return '';
                if (!params.value) return '—';
                const typeStr = params.value as string;
                const colors = getRefTypeColor(typeStr);
                return (
                    <Box sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 4,
                        bgcolor: colors.bg,
                        color: colors.color,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                    }}>
                        {TICKET_REF_TYPE_LABELS[typeStr as keyof typeof TICKET_REF_TYPE_LABELS]}
                    </Box>
                );
            }
        },
        { 
            field: 'priority', 
            headerName: 'Độ ưu tiên', 
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                if (params.row.isGroupRow) return '';
                const isParent = !params.row.parentId && selectedTab === 'ALL';
                const isEditing = editingRowId === params.row.id;
                if (isEditing) {
                    return (
                        <TextField 
                            size="small" 
                            type="text"
                            value={editData.priority}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                handlePriorityChange(val, Number(params.row.id), params.row.parentId)
                            }}
                            error={!!errorMsg}
                            helperText={errorMsg}
                            inputProps={{ style: { textAlign: 'center' } }}
                            InputProps={{
                                endAdornment: (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', mr: -1, '& .MuiIconButton-root': { p: 0, height: 16 } }}>
                                        <IconButton onClick={() => handlePriorityChange(String((Number(editData.priority) || 0) + 1), Number(params.row.id), params.row.parentId)}>
                                            <KeyboardArrowUp fontSize="small" />
                                        </IconButton>
                                        <IconButton onClick={() => handlePriorityChange(String(Math.max(1, (Number(editData.priority) || 0) - 1)), Number(params.row.id), params.row.parentId)}>
                                            <KeyboardArrowDown fontSize="small" />
                                        </IconButton>
                                    </Box>
                                )
                            }}
                            sx={{ width: 100, my: 1 }}
                        />
                    );
                }
                if (isParent) return '';
                return <Typography variant="body1" fontWeight={500}>{params.value}</Typography>;
            }
        },
        { 
            field: 'isActive', 
            headerName: 'Trạng thái', 
            width: 150,
            renderCell: (params) => {
                if (params.row.isGroupRow) return '';
                const isParent = !params.row.parentId && selectedTab === 'ALL';
                const isEditing = editingRowId === params.row.id;
                if (isEditing) {
                    return (
                        <Switch 
                            checked={editData.isActive} 
                            onChange={(e) => setEditData(prev => ({ ...prev, isActive: e.target.checked }))}
                            color="primary"
                        />
                    );
                }
                if (isParent) return '';
                
                let isActive = params.value ?? true;
                if (params.row.parentId && editingRowId === params.row.parentId) {
                    isActive = editData.isActive;
                }
                
                return (
                    <Box sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: isActive ? 'success.50' : 'error.50',
                        color: isActive ? 'success.main' : 'error.main',
                        fontSize: '0.85rem',
                        fontWeight: 600
                    }}>
                        {isActive ? 'Hoạt động' : 'Không hoạt động'}
                    </Box>
                );
            }
        },
        { 
            field: 'actions', 
            headerName: 'Thao tác', 
            width: 120,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => {
                if (params.row.isGroupRow) return '';
                const isEditing = editingRowId === params.row.id;
                if (isEditing) {
                    return (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                                size="small" 
                                color="success" 
                                onClick={() => handleSaveEdit(Number(params.row.id))}
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
                        </Box>
                    );
                }
                return (
                    <IconButton size="small" onClick={() => handleEditClick(params.row as TicketCategoryResponse)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                );
            }
        }
    ];

    return (
        <Card elevation={0} className="admin-datagrid-card">
            <Box sx={{
                ...dataGridContainerStyles,
                // Add styling for parent rows
                '& .parent-row': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    }
                }
            }}>
                <LazyDataGrid
                    rows={displayCategories}
                    getRowId={(row) => row.id}
                    columns={columns}
                    density={settings.density || 'comfortable'}
                    showCellVerticalBorder={settings.showCellBorders}
                    showColumnVerticalBorder={settings.showColumnBorders}
                    showToolbar
                    disableColumnMenu
                    disableColumnSorting
                    slots={{
                        toolbar: TicketCategoryToolbar as any,
                        noRowsOverlay: () => (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                }}
                            >
                                {isLoading ? (
                                    <CircularProgress size={32} />
                                ) : (
                                    <span className="admin-datagrid-empty">Không có danh mục nào</span>
                                )}
                            </Box>
                        ),
                    }}
                    slotProps={{
                        columnsManagement: {
                            getTogglableColumns: (columns: GridColDef[]) =>
                                columns
                                    .filter((col) => col.field !== 'actions')
                                    .map((col) => col.field),
                        },
                        columnsPanel: {
                            sx: columnsPanelStyles,
                        },
                        filterPanel: {
                            sx: filterPanelStyles,
                        },
                        toolbar: {
                            settings,
                            onSettingsChange: setSettings,
                            searchTerm,
                            onSearchChange,
                        } as any,
                    }}
                    localeText={DATA_GRID_LOCALE_VN}
                    loading={isLoading}
                    getRowHeight={() => 'auto'}
                    disableRowSelectionOnClick
                    hideFooterPagination
                    getRowClassName={(params) => !params.row.parentId ? 'parent-row' : ''}
                    className="admin-datagrid"
                    sx={dataGridStyles}
                />
            </Box>
        </Card>
    );
};
