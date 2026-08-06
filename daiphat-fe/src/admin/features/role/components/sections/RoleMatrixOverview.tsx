"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Search } from "../../../../components/ui/Search";
import { JiraFilter } from "../../../../shared/data-grid";
import { Badge, SvgIcon } from "@mui/material";
import {
    Box,
    Typography,
    Card,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    styled,
    CircularProgress,
    IconButton,
    Checkbox,
    CheckboxProps,
    Button
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SaveIcon from '@mui/icons-material/Save';
import LoadingScreen from '../../../../components/ui/LoadingScreen';
import { useRoles, useUpdateRole, usePermissions, useReorderPermissions } from '../../hooks/useRole';
import { AppToast as toast } from '../../../../../utils/toast.util';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SortIcon from '@mui/icons-material/Sort';
import CheckIcon from '@mui/icons-material/Check';

// --- Styled Components --- //
const MatrixCard = styled(Card)(({ theme }) => ({
    borderRadius: '12px',
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: '#fff',
    width: '100%',
    position: 'relative'
}));

const StickyHeaderCell = styled(TableCell)(({ theme }) => ({
    backgroundColor: 'var(--palette-background-paper)',
    fontWeight: 600,
    color: theme.palette.text.primary,
    borderBottom: `2px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    padding: theme.spacing(2),
}));

const ModuleRow = styled(TableRow)(({ theme }) => ({
    cursor: 'pointer',
    backgroundColor: 'var(--palette-background-neutral)',
    transition: 'background-color 0.2s',
    '&:hover': {
        backgroundColor: 'var(--palette-action-hover)',
    },
    '& > td': {
        borderBottom: `1px solid ${theme.palette.divider}`,
    }
}));

const PermissionRow = styled(TableRow)(
    ({ theme }) => ({
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: 'rgba(145, 158, 171, 0.04)',
        },
        '& > td': {
            borderBottom: `1px solid ${theme.palette.divider}`,
            paddingTop: theme.spacing(1.5),
            paddingBottom: theme.spacing(1.5),
        },
        '&:last-child td': {
            borderBottom: 0,
        }
    }));

const StyledCheckbox = styled((props: CheckboxProps) => (
    <Checkbox disableRipple size="small" {...props} />
))(({ theme }) => ({
    padding: '4px',
    color: theme.palette.text.disabled,
    '&.Mui-checked': {
        color: 'var(--palette-primary-main)',
    },
    '&.MuiCheckbox-indeterminate': {
        color: 'var(--palette-primary-main)',
    }
}));


export const RoleMatrixOverview = () => {
    const { data: roles = [], isLoading, refetch } = useRoles();
    const { data: allPermissions = [] } = usePermissions();
    const { mutateAsync: updateRole } = useUpdateRole();
    const { mutateAsync: reorderPerms } = useReorderPermissions();

    // Mapping state
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [localPerms, setLocalPerms] = useState<Record<string, string[]>>({});
    const [isSaving, setIsSaving] = useState(false);


    // Reorder State
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [orderedModules, setOrderedModules] = useState<any[]>([]);

    const moduleOptions = useMemo(() => {
        const modules = new Set<string>();
        allPermissions.forEach((p: any) => {
            modules.add(p.module || 'Khác');
        });
        return Array.from(modules).map(m => ({ value: m, label: m }));
    }, [allPermissions]);


    // Group permissions by module dynamically
    const flatPermissions = useMemo(() => {
        if (!allPermissions || allPermissions.length === 0) return [];
        
        let filteredPermissions = allPermissions;
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filteredPermissions = filteredPermissions.filter((p: any) => 
                (p.name && p.name.toLowerCase().includes(query)) || 
                (p.module && p.module.toLowerCase().includes(query))
            );
        }
        if (selectedModules.length > 0) {
            filteredPermissions = filteredPermissions.filter((p: any) => selectedModules.includes(p.module || 'Khác'));
        }

        const groups: Record<string, any[]> = {};
        filteredPermissions.forEach((p: any) => {
            const moduleName = p.module || 'Khác';
            if (!groups[moduleName]) groups[moduleName] = [];
            groups[moduleName].push({
                id: p.code,
                name: p.name,
                description: p.description,
                position: p.position || 0
            });
        });

        return Object.keys(groups)
            .map(moduleName => {
                const perms = groups[moduleName];
                const modulePosition = Math.max(...perms.map(p => p.position));
                return {
                    moduleName,
                    position: modulePosition,
                    permissions: perms.sort((a, b) => b.position - a.position),
                    permIds: perms.map(p => p.id)
                };
            })
            .sort((a, b) => b.position - a.position);
    }, [allPermissions, searchQuery, selectedModules]);

    // Sync state
    useEffect(() => {
        if (!isReorderMode && flatPermissions.length > 0) {
            setOrderedModules(prev => {
                // Prevent infinite loop by checking if content actually changed
                if (JSON.stringify(prev) === JSON.stringify(flatPermissions)) return prev;
                return flatPermissions;
            });
        }
    }, [flatPermissions, isReorderMode]);

    // Expand all modules by default on load
    useEffect(() => {
        if (flatPermissions.length > 0) {
            setExpandedModules(prev => {
                if (Object.keys(prev).length > 0) return prev;
                const next: Record<string, boolean> = {};
                flatPermissions.forEach(p => {
                    next[p.moduleName] = true;
                });
                return next;
            });
        }
    }, [flatPermissions]);

    useEffect(() => {
        if (roles.length > 0) {
            const initial: Record<string, string[]> = {};
            roles.forEach((r: any) => { initial[r.id || r._id] = r.permissions || []; });
            setLocalPerms(initial);
        }
    }, [roles]);

    // Check if there are any unsaved changes
    const hasChanges = useMemo(() => {
        if (roles.length === 0 || Object.keys(localPerms).length === 0) return false;
        return roles.some((role: any) => {
            const original = [...(role.permissions || [])].sort();
            const current = [...(localPerms[role.id || role._id] || [])].sort();
            return original.join(',') !== current.join(',');
        });
    }, [roles, localPerms]);

    const toggleModule = (moduleName: string) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleName]: !prev[moduleName]
        }));
    };

    const handleSingleToggle = (roleId: string, permId: string, checked: boolean) => {
        setLocalPerms(prev => {
            const curr = prev[roleId] || [];
            if (checked) {
                return { ...prev, [roleId]: [...curr, permId] };
            } else {
                return { ...prev, [roleId]: curr.filter(id => id !== permId) };
            }
        });
    };

    const handleBulkToggle = (roleId: string, permIds: string[], checked: boolean) => {
        setLocalPerms(prev => {
            const curr = prev[roleId] || [];
            if (checked) {
                const newPerms = [...curr];
                permIds.forEach(id => {
                    if (!newPerms.includes(id)) newPerms.push(id);
                });
                return { ...prev, [roleId]: newPerms };
            } else {
                return { ...prev, [roleId]: curr.filter(id => !permIds.includes(id)) };
            }
        });
    };

    const handleCancel = () => {
        const initialPerms: Record<string, string[]> = {};
        roles.forEach((r: any) => {
            initialPerms[r.id || r._id] = r.permissions || [];
        });
        setLocalPerms(initialPerms);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const changedRoles = roles.filter((role: any) => {
                const original = [...(role.permissions || [])].sort().join(',');
                const current = [...(localPerms[role.id || role._id] || [])].sort().join(',');
                return original !== current;
            });

            await Promise.all(changedRoles.map((role: any) => {
                const roleId = role.id || role._id;
                return updateRole({ id: roleId, permissions: localPerms[roleId] || [] });
            }));

            toast.success('Đã lưu thay đổi phân quyền thành công!');
            refetch();
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Lỗi khi lưu phân quyền!');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveOrder = async () => {
        setIsSaving(true);
        try {
            const positionMap: Record<string, number> = {};
            orderedModules.forEach((module, index) => {
                const moduleBasePos = (orderedModules.length - index) * 100;
                module.permissions.forEach((perm: any, pIndex: number) => {
                    positionMap[perm.id] = moduleBasePos - pIndex;
                });
            });

            await reorderPerms(positionMap);
            toast.success('Đã cập nhật thứ tự thành công!');
            setIsReorderMode(false);
            refetch();
        } catch (error) {
            console.error('Reorder error:', error);
            toast.error('Lỗi khi lưu thứ tự!');
        } finally {
            setIsSaving(false);
        }
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderedModules((items) => {
                const oldIndex = items.findIndex(i => i.moduleName === active.id);
                const newIndex = items.findIndex(i => i.moduleName === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (roles.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                <Typography>Chưa có dữ liệu nhóm quyền.</Typography>
            </Box>
        );
    }

    const isFiltering = searchQuery.trim() !== '' || selectedModules.length > 0;

    return (
        <>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Search
                        placeholder="Tìm kiếm quyền..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        maxWidth="100%"
                    />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <JiraFilter
                        fields={[{ id: 'module', label: 'Nhóm quyền', options: moduleOptions }]}
                        selectedFilters={{ module: selectedModules }}
                        onFilterChange={(_id, vals) => setSelectedModules(vals)}
                        onClearAll={() => setSelectedModules([])}
                        trigger={({ onClick, totalFilterCount }) => (
                            <Button
                                variant="text"
                                size="small"
                                disableElevation
                                onClick={onClick}
                                startIcon={
                                    <Badge
                                        badgeContent={totalFilterCount}
                                        color="primary"
                                        variant="dot"
                                        sx={{ '& .MuiBadge-badge': { backgroundColor: "#FF5630" } }}
                                    >
                                        <SvgIcon sx={{ fontSize: '1.125rem !important' }} viewBox="0 0 24 24">
                                            <g fill="none" fillRule="evenodd">
                                                <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                                <path
                                                    fill="#1C252E"
                                                    d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z"
                                                />
                                            </g>
                                        </SvgIcon>
                                    </Badge>
                                }
                                sx={{
                                    textTransform: 'none',
                                    minWidth: '64px',
                                    minHeight: "30px",
                                    fontSize: "0.8125rem",
                                    padding: '4px',
                                    fontWeight: "700",
                                    borderRadius: "8px",
                                    gap: "6px",
                                    color: '#1C252E',
                                    '& .MuiButton-startIcon': { margin: 0 },
                                    '&:hover': { backgroundColor: '#919eab14' },
                                    '& .MuiButton-icon': { mt: "-2px !important" }
                                }}
                            >
                                Bộ lọc
                            </Button>
                        )}
                    />
                
                    {!isReorderMode ? (
                        !isFiltering && (
                            <Button
                                variant="outlined"
                                startIcon={<SortIcon />}
                                onClick={() => setIsReorderMode(true)}
                                sx={{
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    color: 'var(--palette-text-primary)',
                                    borderColor: 'var(--palette-text-primary)',
                                    '&:hover': {
                                        backgroundColor: 'var(--palette-action-hover)',
                                        borderColor: 'var(--palette-text-primary)'
                                    }
                                }}
                            >
                                Sắp xếp nhóm
                            </Button>
                        )
                    ) : (
                        <>
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={() => setIsReorderMode(false)}
                                disabled={isSaving}
                                sx={{ borderRadius: '10px', fontWeight: 600 }}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<CheckIcon />}
                                onClick={handleSaveOrder}
                                disabled={isSaving}
                                sx={{
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    background: 'var(--palette-text-primary)',
                                    color: 'var(--palette-background-paper)',
                                    '&:hover': {
                                        background: 'var(--palette-grey-800)',
                                    }
                                }}
                            >
                                {isSaving ? 'Đang lưu...' : 'Lưu thứ tự'}
                            </Button>
                        </>
                    )}
                </Box>
            </Box>

            {hasChanges && (
                <Box sx={{
                    position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1200,
                    bgcolor: 'var(--palette-background-paper)', borderRadius: '16px', boxShadow: '0 8px 16px 0 rgba(0, 0, 0, 0.16)',
                    border: '1px solid var(--palette-divider)', display: 'flex', alignItems: 'center', gap: 2, p: 2, animation: 'fadeInUp 0.3s'
                }}>
                    <Typography sx={{ fontWeight: 600, color: 'var(--palette-text-primary)' }}>Bạn có thay đổi chưa lưu</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" color="inherit" onClick={handleCancel} disabled={isSaving}>Hủy bỏ</Button>
                        <Button 
                            variant="contained" 
                            startIcon={<SaveIcon />} 
                            onClick={handleSave} 
                            disabled={isSaving}
                            sx={{
                                background: 'var(--palette-text-primary)',
                                color: 'var(--palette-background-paper)',
                                '&:hover': {
                                    background: 'var(--palette-grey-800)',
                                }
                            }}
                        >
                            Lưu quyền này
                        </Button>
                    </Box>
                </Box>
            )}

            <MatrixCard>
                <Box sx={{ width: '100%' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
                        <Table stickyHeader sx={{ width: '100%', borderCollapse: 'separate' }}>
                            <TableHead>
                                <TableRow>
                                    <StickyHeaderCell sx={{ width: '30%', minWidth: 250, zIndex: 11, left: 0 }}>
                                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, pl: 2 }}>Nhóm chức năng</Typography>
                                    </StickyHeaderCell>
                                    {roles.map((role: any) => (
                                        <StickyHeaderCell key={role.id || role._id} align="center" sx={{ minWidth: 140 }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--palette-primary-main)' }}>{role.name}</Typography>
                                        </StickyHeaderCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <SortableContext items={orderedModules.map(m => m.moduleName)} strategy={verticalListSortingStrategy} disabled={!isReorderMode}>
                                    {orderedModules.map((group) => (
                                        <SortableModuleSection
                                            key={group.moduleName}
                                            group={group}
                                            isReorderMode={isReorderMode}
                                            isExpanded={!!expandedModules[group.moduleName]}
                                            toggleModule={toggleModule}
                                            roles={roles}
                                            localPerms={localPerms}
                                            handleBulkToggle={handleBulkToggle}
                                            handleSingleToggle={handleSingleToggle}
                                        />
                                    ))}
                                </SortableContext>
                            </TableBody>
                        </Table>
                    </DndContext>
                </Box>
            </MatrixCard>
        </>
    );
};

const SortableModuleSection = ({ group, isReorderMode, isExpanded, toggleModule, roles, localPerms, handleBulkToggle, handleSingleToggle }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: group.moduleName,
        disabled: !isReorderMode
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 9999 : 1,
        position: 'relative' as const
    };

    // Khi ở chế độ sort, Row sẽ nhận listeners. Khi ko sort, Row nhận onClick để toggle
    const rowProps = isReorderMode
        ? { ...attributes, ...listeners }
        : { onClick: () => toggleModule(group.moduleName) };

    return (
        <React.Fragment>
            <ModuleRow
                ref={setNodeRef}
                style={style}
                {...rowProps}
                sx={{
                    ...(isReorderMode && {
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' }
                    }),
                    ...(isDragging && {
                        bgcolor: 'var(--palette-action-selected)',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                    })
                }}
            >
                <TableCell sx={{ pl: 2, position: 'sticky', left: 0, bgcolor: 'inherit', zIndex: 5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isReorderMode ? (
                            <Box sx={{ display: 'flex', color: 'text.disabled', mr: 1 }}><DragIndicatorIcon /></Box>
                        ) : (
                            <IconButton size="small" sx={{ p: 0.5 }}>{isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}</IconButton>
                        )}
                        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--palette-primary-dark)' }}>{group.moduleName}</Typography>
                    </Box>
                </TableCell>
                {roles.map((role: any) => {
                    const roleId = role.id || role._id;
                    const count = group.permIds.filter((id: string) => (localPerms[roleId] || []).includes(id)).length;
                    const isFull = count === group.permIds.length;
                    const isEmpty = count === 0;
                    return (
                        <TableCell key={`mod-${roleId}`} align="center" onClick={(e) => e.stopPropagation()}>
                            {!isReorderMode && (
                                <Box onClick={() => handleBulkToggle(roleId, group.permIds, !isFull)} sx={{ display: 'inline-flex', px: 1.5, py: 0.5, borderRadius: '12px', cursor: 'pointer', bgcolor: isFull ? 'rgba(255, 48, 48, 0.16)' : isEmpty ? 'rgba(145, 158, 171, 0.12)' : 'rgba(255, 171, 0, 0.16)', color: isFull ? 'var(--palette-primary-dark)' : isEmpty ? 'var(--palette-text-secondary)' : 'var(--palette-warning-dark)', fontWeight: 700, fontSize: '0.75rem' }}>
                                    {isFull ? 'Full' : `${count}/${group.permIds.length}`}
                                </Box>
                            )}
                        </TableCell>
                    );
                })}
            </ModuleRow>
            {!isReorderMode && isExpanded && group.permissions.map((perm: any) => (
                <PermissionRow key={perm.id}>
                    <TableCell sx={{ pl: 6, position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 5 }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{perm.name}</Typography>
                    </TableCell>
                    {roles.map((role: any) => (
                        <TableCell key={`${role.id || role._id}-${perm.id}`} align="center">
                            <StyledCheckbox checked={(localPerms[role.id || role._id] || []).includes(perm.id)} onChange={(e) => handleSingleToggle(role.id || role._id, perm.id, e.target.checked)} />
                        </TableCell>
                    ))}
                </PermissionRow>
            ))}
        </React.Fragment>
    );
};
